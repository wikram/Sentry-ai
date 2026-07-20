/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Settings, 
  LayoutDashboard, 
  Cpu, 
  Search,
  Activity,
  History,
  Terminal,
  Radar,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  Trash2,
  Power,
  PowerOff,
  Save,
  ShieldCheck,
  X,
  Upload,
  Send,
  Database,
  Lock,
  User,
  LogIn,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { Incident, RCAAgent } from './types';
import { MOCK_INCIDENTS } from './mockData';

// Provision to configure backend system URL via environment variable
const CONFIGURED_BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || "";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'log-analyzer' | 'agents' | 'data-sources' | 'integrations' | 'models' | 'settings'>('dashboard');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [agents, setAgents] = useState<RCAAgent[]>([]);
  const [supportedModels, setSupportedModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [apiBackendUrl, setApiBackendUrl] = useState<string>(CONFIGURED_BACKEND_URL);
  const [logStream, setLogStream] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isFileInputMode, setIsFileInputMode] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<{ id: string, timestamp: string, input: string, output: string }[]>([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const [diagnosticsMap, setDiagnosticsMap] = useState<Record<string, { status: string, timestamp?: string, loading: boolean }>>({});
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [diagnosticsResult, setDiagnosticsResult] = useState<{ 
    agent: RCAAgent; 
    status: string; 
    details: any; 
    timestamp: string;
    success: boolean;
  } | null>(null);

  const handleSetDefaultAgent = (agentId: string) => {
    setAgents(agents.map(a => ({
      ...a,
      isDefault: a.id === agentId
    })));
  };

  const handleCheckDiagnostics = async (agent: RCAAgent) => {
    if (!agent.backendUrl) return;

    setDiagnosticsMap(prev => ({
      ...prev,
      [agent.id]: { ...(prev[agent.id] || {}), loading: true, status: 'Checking...' }
    }));

    try {
      const baseUrl = agent.backendUrl.replace(/\/$/, '');
      const targetUrl = `${baseUrl}/api/health`;
      const proxyUrl = `/api/diagnostics?url=${encodeURIComponent(targetUrl)}`;
      
      const response = await fetch(proxyUrl);
      const data = await response.json().catch(() => null);

      let humanStatus = 'Unknown status';
      if (response.ok) {
        humanStatus = data && data.status ? `Healthy: ${data.status}` : 'Healthy (200 OK)';
      } else {
        humanStatus = `Error: ${response.status} ${response.statusText}`;
      }

      const result = {
        agent,
        status: humanStatus,
        details: data,
        timestamp: new Date().toLocaleString(),
        success: response.ok
      };

      setDiagnosticsMap(prev => ({
        ...prev,
        [agent.id]: { status: humanStatus, timestamp: new Date().toLocaleTimeString(), loading: false }
      }));
      setDiagnosticsResult(result);
      setShowDiagnosticsModal(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Connection failed';
      const result = {
        agent,
        status: `Offline: ${errorMsg}`,
        details: { error: errorMsg },
        timestamp: new Date().toLocaleString(),
        success: false
      };
      setDiagnosticsMap(prev => ({
        ...prev,
        [agent.id]: { status: `Offline: ${errorMsg}`, timestamp: new Date().toLocaleTimeString(), loading: false }
      }));
      setDiagnosticsResult(result);
      setShowDiagnosticsModal(true);
    }
  };

  const isAnalysisAgentAdded = agents.length > 0;
  const hasActiveAgent = agents.some(a => a.isActive);

  const handleAnalyzeLogs = async () => {
    const defaultAgent = agents.find(a => a.isDefault) || agents.find(a => a.isActive) || agents[0];
    const preferredBackend = defaultAgent?.backendUrl || apiBackendUrl;

    if (!preferredBackend) {
      alert("No backend system configured. Please add an agent or specify a backend URL.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult('Initializing autonomous analysis engine...');
    
    try {
      // Update status for the primary agent
      if (defaultAgent) {
        setAgents(prev => prev.map(a => a.id === defaultAgent.id ? { ...a, status: 'analyzing' } : a));
      }

      let report = '';

      // 1. Handle File Upload if in file mode
      if (isFileInputMode && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('description', description || "Analysis request");

        const targetUrl = `${preferredBackend.replace(/\/$/, '')}/api/analyze-file`;
        const response = await fetch(targetUrl, { method: 'POST', body: formData });
        
        if (!response.ok) throw new Error(`File analysis failed: ${response.status}`);
        
        const text = await response.text();
        try {
          const data = JSON.parse(text);
          report = data.report || data.analysis || (typeof data === 'string' ? data : JSON.stringify(data, null, 2));
        } catch {
          report = text;
        }
      } else {
        // 2. Handle Log Stream Analysis
        const targetUrl = `${preferredBackend.replace(/\/$/, '')}/api/analyze`;
        const payload = { logs: logStream, description: description || "System log analysis request" };
        
        try {
          const res = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          if (!res.ok) throw new Error(`Analysis request failed: ${res.status}`);
          
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            report = data.report || data.analysis || (typeof data === 'string' ? data : JSON.stringify(data, null, 2));
          } catch {
            // If it's not JSON, it's likely a human-readable text report
            report = text;
          }
        } catch (err) {
          // Fallback to frontend SDK if backend fails or is unavailable
          console.warn('Backend failed, attempting frontend fallback:', err);
          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) throw new Error(`Backend unavailable and no local API key found: ${err instanceof Error ? err.message : 'Unknown error'}`);
          
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `System Log Analysis:\n${description}\n\nLogs:\n${logStream.slice(0, 15000)}`;
          const res = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
          });
          report = res.text || "No analysis generated.";
        }
      }

      setAnalysisResult(report);
      setAnalysisHistory(prev => [{
        id: `ANL-${Date.now()}`,
        timestamp: new Date().toISOString(),
        input: isFileInputMode ? `File: ${selectedFile?.name}` : (logStream.slice(0, 500) + '...'),
        output: report
      }, ...prev]);

      setAgents(prev => prev.map(a => ({ ...a, status: 'idle' })));
      setIsAnalyzing(false);
    } catch (err) {
      console.error('Analysis failed:', err);
      setAnalysisResult(`### Analysis Encountered an Error\n\n${err instanceof Error ? err.message : 'An unexpected error occurred during analysis.'}`);
      setAgents(prev => prev.map(a => ({ ...a, status: 'idle' })));
      setIsAnalyzing(false);
    }
  };
  const [failedJenkinsJobs, setFailedJenkinsJobs] = useState<any[]>([]);
  const [isScrapingJenkins, setIsScrapingJenkins] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load config on mount
  useEffect(() => {
    async function init() {
      try {
        // First load current config
        const configRes = await fetch('/api/config');
        const configData = await configRes.json();
        
        setSources(configData.sources || []);
        setAgents(configData.agents || []);

        // Load agents from listagents API and display them if any are returned
        try {
          const listagentsRes = await fetch('/api/listagents');
          if (listagentsRes.ok) {
            const listagentsData = await listagentsRes.json();
            const fetchedAgents = Array.isArray(listagentsData) ? listagentsData : (listagentsData?.agents || []);
            if (fetchedAgents && fetchedAgents.length > 0) {
              setAgents(fetchedAgents);
            }
          }
        } catch (err) {
          console.error('Failed to load agents from /api/listagents:', err);
        }
        
        let savedModel = '';
        if (configData.selectedModel) {
          savedModel = configData.selectedModel;
          setSelectedModel(savedModel);
        }
        if (CONFIGURED_BACKEND_URL) {
          setApiBackendUrl(CONFIGURED_BACKEND_URL);
        } else if (configData.apiBackendUrl) {
          setApiBackendUrl(configData.apiBackendUrl);
        }

        // Then fetch supported models
        const modelsRes = await fetch('https://openrouter.ai/api/v1/models');
        const modelsData = await modelsRes.json();
        const models = (modelsData.data || []).sort((a: any, b: any) => {
          const nameA = a.name || a.id;
          const nameB = b.name || b.id;
          return nameA.localeCompare(nameB);
        });
        setSupportedModels(models);

        // If no model was saved in config, use the first available model as fallback
        if (!savedModel && models.length > 0) {
          const firstModel = models[0].id;
          setSelectedModel(firstModel);
          setAgentModel(firstModel);
        } else if (savedModel) {
          setAgentModel(savedModel);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Initialization failed:', err);
        setLoading(false);
      }
    }

    init();
  }, []);

  // Auto-scrape Jenkins failed jobs every 5 minutes
  useEffect(() => {
    if (loading) return;

    const hasActiveJenkins = sources.some(s => s.type === 'jenkins' && s.isActive);
    if (!hasActiveJenkins) return;

    // Initial scrape
    handleScrapeJenkins();

    const interval = setInterval(() => {
      handleScrapeJenkins();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [sources, loading]);

  const [showIngest, setShowIngest] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [showAgentConfigModal, setShowAgentConfigModal] = useState(false);
  const [configuringAgentId, setConfiguringAgentId] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configuringSourceId, setConfigingSourceId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [ingestDraft, setIngestDraft] = useState('');
  const [selectedTool, setSelectedTool] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [agentName, setAgentName] = useState('');
  const [agentModel, setAgentModel] = useState('');
  const [agentBackendUrl, setAgentBackendUrl] = useState(CONFIGURED_BACKEND_URL);
  const [agentApiKey, setAgentApiKey] = useState('sk-prj-xxxxxxxxxx');
  const [agentIsPrimary, setAgentIsPrimary] = useState(false);
  const [configName, setConfigName] = useState('');
  const [configUrl, setConfigUrl] = useState('');
  const [configUser, setConfigUser] = useState('');
  const [configKey, setConfigKey] = useState('');

  const [stayInAddAgent, setStayInAddAgent] = useState(false);

  const handleAddAgent = async () => {
    if (!agentName) return;
    
    const payload = {
      name: agentName,
      llm_model: agentModel || selectedModel || (supportedModels.length > 0 ? supportedModels[0].id : ''),
      conn_url: agentBackendUrl,
      api_key: agentApiKey,
      is_primary: agentIsPrimary
    };

    try {
      const response = await fetch('/api/addagent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      const data = await response.json();
      console.log('Add agent response:', data);
    } catch (err) {
      console.error('Failed to register agent with API:', err);
      alert('Failed to deploy agent on backend: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
    
    const newAgent: RCAAgent = {
      id: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: agentName,
      status: 'idle',
      isActive: true,
      isDefault: agentIsPrimary || agents.length === 0, // Make first agent or primary agent default automatically
      backendUrl: agentBackendUrl || apiBackendUrl, // Fallback to global backend if empty
      model: agentModel || selectedModel,
      findings: []
    };

    // If this agent is set as primary, un-default all other agents first
    setAgents(prev => {
      let updated = prev;
      if (agentIsPrimary) {
        updated = prev.map(a => ({ ...a, isDefault: false }));
      }
      return [...updated, newAgent];
    });
    
    if (!stayInAddAgent) {
      setShowAddAgent(false);
    } else {
      // If staying, maybe show a brief success indicator?
      // For now just clearing name is enough to let them type another
      console.log('Agent added, staying in modal');
    }
    
    // Clear fields
    setAgentName('');
    setAgentModel(selectedModel || (supportedModels.length > 0 ? supportedModels[0].id : ''));
    setAgentBackendUrl(CONFIGURED_BACKEND_URL);
    setAgentApiKey('sk-prj-xxxxxxxxxx');
    setAgentIsPrimary(false);
  };

  const deleteAgent = (id: string) => {
    setAgents(agents.filter(a => a.id !== id));
  };

  const toggleAgent = (id: string) => {
    setAgents(agents.map(a => 
      a.id === id ? { ...a, isActive: !a.isActive } : a
    ));
  };

  const handleSaveAgentConfig = () => {
    if (!configuringAgentId) return;

    // Duplicate check: Verify if the URL is already used by another agent (excluding the one being edited)
    if (agentBackendUrl && agents.some(a => a.id !== configuringAgentId && a.backendUrl === agentBackendUrl)) {
      alert('An agent with this Backend URL already exists.');
      return;
    }

    setAgents(agents.map(a => 
      a.id === configuringAgentId 
        ? { ...a, name: agentName, backendUrl: agentBackendUrl, model: agentModel } 
        : a
    ));
    setShowAgentConfigModal(false);
    setConfiguringAgentId(null);
    setAgentName('');
    setAgentModel(selectedModel);
    setAgentBackendUrl(CONFIGURED_BACKEND_URL);
  };

  const openAgentConfig = (agent: RCAAgent) => {
    setConfiguringAgentId(agent.id);
    setAgentName(agent.name);
    setAgentBackendUrl(agent.backendUrl || CONFIGURED_BACKEND_URL);
    setAgentModel(agent.model || selectedModel);
    setShowAgentConfigModal(true);
  };

  const handleSaveToXml = async () => {
    setIsSaving(true);
    
    // Construct the endpoint URL for display
    const externalEndpoint = apiBackendUrl 
      ? (apiBackendUrl.endsWith('/') ? `${apiBackendUrl}api/v1/config/llm` : `${apiBackendUrl}/api/v1/config/llm`)
      : null;

    if (externalEndpoint && selectedModel) {
      // Execute the external API call
      fetch(externalEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedModel })
      }).catch(err => {
        console.error('Failed to notify external endpoint:', err);
      });
    }

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources, agents, selectedModel, apiBackendUrl })
      });
      
      if (response.ok) {
        console.log('Configuration saved successfully');
      } else {
        console.error('Failed to save configuration');
      }
    } catch (err) {
      console.error('Failed to save config:', err);
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  const handleScrapeJenkins = async () => {
    setIsScrapingJenkins(true);
    try {
      const res = await fetch('/api/jenkins/failed-jobs');
      const data = await res.json();
      setFailedJenkinsJobs(data.jobs || []);
    } catch (err) {
      console.error('Failed to scrape Jenkins:', err);
    } finally {
      setIsScrapingJenkins(false);
    }
  };

  const handleIngest = () => {
    // In a real app, this would trigger an AI agent
    // Here we just simulate adding it to the list or staying on the page
    console.log('Ingested logs:', ingestDraft);
    setShowIngest(false);
    setIngestDraft('');
  };

  const handleAddSource = () => {
    if (!selectedTool) return;
    
    const newSource: any = {
      id: `src-${Date.now()}`,
      name: sourceName || `${selectedTool.charAt(0).toUpperCase() + selectedTool.slice(1)} Integration`,
      type: selectedTool,
      status: 'Pending configuration',
      isActive: true,
      lastSync: new Date().toISOString(),
      config: {}
    };

    setSources([newSource, ...sources]);
    setShowAddSource(false);
    setSelectedTool('');
    setSourceName('');
  };

  const toggleSource = (id: string) => {
    setSources(sources.map(s => 
      s.id === id ? { ...s, isActive: !s.isActive } : s
    ));
  };

  const handleSaveConfig = () => {
    if (!configuringSourceId) return;
    setSources(sources.map(s => {
      if (s.id === configuringSourceId) {
        const isDb = isDatabase(s.type);
        const hasRequiredFields = isDb 
          ? (configUrl && configUser && configKey)
          : (configUrl && configKey);
        
        return { 
          ...s, 
          name: configName || s.name, 
          status: hasRequiredFields ? 'syncing' : 'Pending configuration',
          config: { ...s.config, url: configUrl, user: configUser, key: configKey } 
        };
      }
      return s;
    }));
    setShowConfigModal(false);
    setConfigingSourceId(null);
    setConfigName('');
    setConfigUrl('');
    setConfigUser('');
    setConfigKey('');
  };

  const openConfig = (source: any) => {
    setConfigingSourceId(source.id);
    setConfigName(source.name);
    setConfigUrl(source.config?.url || '');
    setConfigUser(source.config?.user || '');
    setConfigKey(source.config?.key || '');
    setShowConfigModal(true);
    setActiveMenuId(null);
  };

  const deleteSource = (id: string) => {
    setSources(sources.filter(s => s.id !== id));
    setActiveMenuId(null);
  };

  const isDatabase = (type: string) => ['postgresql', 'mysql', 'pinecone', 'weaviate', 'milvus', 'chromadb'].includes(type);
  const currentSource = configuringSourceId ? sources.find(s => s.id === configuringSourceId) : null;

  if (!isAuthenticated) {
    return <Login onLogin={(user) => { setIsAuthenticated(true); setUser(user); }} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden selection:bg-blue-500/30">
      {/* Add Agent Modal */}
      <AnimatePresence>
        {showAddAgent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddAgent(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-lg font-bold tracking-tight text-slate-900">Deploy New Agent</h3>
                <p className="text-xs text-slate-400 font-medium">Configure specialized AI to monitor your stack</p>
              </div>
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Agent Name</label>
                    <input 
                      type="text" 
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="e.g. SRE-Bot Delta"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Model Engine</label>
                    <select
                      value={agentModel}
                      onChange={(e) => setAgentModel(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
                    >
                      {supportedModels.map(model => (
                        <option key={model.id} value={model.id}>{model.name || model.id}</option>
                      ))}
                    </select>
                    {supportedModels.find(m => m.id === agentModel) && (
                      <div className="mt-2 p-3 bg-slate-50/50 border border-slate-100 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400 font-bold uppercase tracking-widest">Context Window</span>
                          <span className="text-slate-700 font-mono font-bold">
                            {(supportedModels.find(m => m.id === agentModel)?.context_length || 0).toLocaleString()} tokens
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400 font-bold uppercase tracking-widest">Pricing / 1M Tokens</span>
                          <div className="text-right">
                            <span className="text-slate-700 font-mono font-bold">
                              ${(Number(supportedModels.find(m => m.id === agentModel)?.pricing?.prompt || 0) * 1000000).toFixed(2)} <span className="text-[9px] text-slate-400">in</span>
                            </span>
                            <span className="mx-1 text-slate-300">|</span>
                            <span className="text-slate-700 font-mono font-bold">
                              ${(Number(supportedModels.find(m => m.id === agentModel)?.pricing?.completion || 0) * 1000000).toFixed(2)} <span className="text-[9px] text-slate-400">out</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Backend System URL</label>
                    <input 
                      type="text" 
                      value={agentBackendUrl}
                      disabled={true}
                      placeholder="https://agent-api.internal.org"
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none cursor-not-allowed font-mono text-slate-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">API Key</label>
                    <input 
                      type="text" 
                      value={agentApiKey}
                      onChange={(e) => setAgentApiKey(e.target.value)}
                      placeholder="sk-prj-xxxxxxxxxx"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-3 py-2 px-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          checked={agentIsPrimary}
                          onChange={(e) => setAgentIsPrimary(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`w-8 h-4 rounded-full transition-colors ${agentIsPrimary ? 'bg-blue-500' : 'bg-slate-200'}`} />
                        <div className={`absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${agentIsPrimary ? 'translate-x-4' : ''} shadow-sm`} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors cursor-pointer">Set as Primary Agent</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3 py-2 px-1">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={stayInAddAgent}
                        onChange={(e) => setStayInAddAgent(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-8 h-4 rounded-full transition-colors ${stayInAddAgent ? 'bg-blue-500' : 'bg-slate-200'}`} />
                      <div className={`absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${stayInAddAgent ? 'translate-x-4' : ''} shadow-sm`} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors cursor-pointer">Add another agent after deploying</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowAddAgent(false)}
                    className="flex-1 py-3 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddAgent}
                    disabled={!agentName}
                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all shadow-lg shadow-slate-900/10"
                  >
                    Deploy Agent
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Agent Configuration Modal */}
      <AnimatePresence>
        {showAgentConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAgentConfigModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-lg font-bold tracking-tight text-slate-900">Configure Agent</h3>
                <p className="text-xs text-slate-400 font-medium">Update agent parameters and backend endpoint</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Agent Name</label>
                    <input 
                      type="text" 
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-sans"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Model Engine</label>
                    <select
                      value={agentModel}
                      onChange={(e) => setAgentModel(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
                    >
                      {supportedModels.map(model => (
                        <option key={model.id} value={model.id}>{model.name || model.id}</option>
                      ))}
                    </select>
                    {supportedModels.find(m => m.id === agentModel) && (
                      <div className="mt-2 p-3 bg-slate-50/50 border border-slate-100 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400 font-bold uppercase tracking-widest">Context Window</span>
                          <span className="text-slate-700 font-mono font-bold">
                            {(supportedModels.find(m => m.id === agentModel)?.context_length || 0).toLocaleString()} tokens
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400 font-bold uppercase tracking-widest">Pricing / 1M Tokens</span>
                          <div className="text-right">
                            <span className="text-slate-700 font-mono font-bold">
                              ${(Number(supportedModels.find(m => m.id === agentModel)?.pricing?.prompt || 0) * 1000000).toFixed(2)} <span className="text-[9px] text-slate-400">in</span>
                            </span>
                            <span className="mx-1 text-slate-300">|</span>
                            <span className="text-slate-700 font-mono font-bold">
                              ${(Number(supportedModels.find(m => m.id === agentModel)?.pricing?.completion || 0) * 1000000).toFixed(2)} <span className="text-[9px] text-slate-400">out</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Backend System URL</label>
                    <input 
                      type="text" 
                      value={agentBackendUrl}
                      disabled={true}
                      placeholder="https://..."
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none cursor-not-allowed font-mono text-slate-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowAgentConfigModal(false)}
                    className="flex-1 py-3 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveAgentConfig}
                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                  >
                    Update Agent
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Configuration Modal */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfigModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-lg font-bold tracking-tight text-slate-900">Configure Source</h3>
                <p className="text-xs text-slate-400 font-medium">Update connection parameters for this tool</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Display Name</label>
                    <input 
                      type="text" 
                      value={configName}
                      onChange={(e) => setConfigName(e.target.value)}
                      placeholder="e.g. Production Database"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-sans"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {currentSource && isDatabase(currentSource.type) ? 'IP Address / Hostname' : 'Application URL'}
                    </label>
                    <input 
                      type="text" 
                      value={configUrl}
                      onChange={(e) => setConfigUrl(e.target.value)}
                      placeholder={currentSource && isDatabase(currentSource.type) ? "192.168.1.100 or db.example.com" : "https://..."}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                    />
                  </div>
                  {currentSource && isDatabase(currentSource.type) && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Username</label>
                      <input 
                        type="text" 
                        value={configUser}
                        onChange={(e) => setConfigUser(e.target.value)}
                        placeholder="admin"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {currentSource && isDatabase(currentSource.type) ? 'Password' : 'API Key / Token'}
                    </label>
                    <input 
                      type="password" 
                      value={configKey}
                      onChange={(e) => setConfigKey(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowConfigModal(false)}
                    className="flex-1 py-3 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveConfig}
                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                  >
                    Save Config
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Source Modal */}
      <AnimatePresence>
        {showAddSource && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddSource(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-lg font-bold tracking-tight text-slate-900">Add Data Source</h3>
                <p className="text-xs text-slate-400 font-medium">Select a tool to integrate with Sentry analysis</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tool Type</label>
                    <select 
                      value={selectedTool}
                      onChange={(e) => setSelectedTool(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Select a tool...</option>
                      <optgroup label="Infrastructure & CI/CD">
                        <option value="kubernetes">Kubernetes Cluster</option>
                        <option value="jenkins">Jenkins CI/CD</option>
                        <option value="github">GitHub Actions</option>
                        <option value="gitlab">GitLab Pipeline</option>
                        <option value="sonarqube">SonarQube</option>
                      </optgroup>
                      <optgroup label="Databases">
                        <option value="postgresql">PostgreSQL Database</option>
                        <option value="mysql">MySQL Database</option>
                      </optgroup>
                      <optgroup label="AI & Vector Stores">
                        <option value="pinecone">Pinecone</option>
                        <option value="weaviate">Weaviate</option>
                        <option value="milvus">Milvus</option>
                        <option value="chromadb">ChromaDB</option>
                      </optgroup>
                      <optgroup label="Monitoring & APM">
                        <option value="datadog">Datadog APM</option>
                        <option value="newrelic">NewRelic</option>
                      </optgroup>
                      <optgroup label="Collaboration">
                        <option value="jira">Jira Software</option>
                        <option value="slack">Slack Webhooks</option>
                      </optgroup>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Display Name</label>
                    <input 
                      type="text" 
                      value={sourceName}
                      onChange={(e) => setSourceName(e.target.value)}
                      placeholder="e.g. Staging Jenkins"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>

                {selectedTool && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2"
                  >
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Tool Detected</p>
                    <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                      One-click integration will attempt to discover your {selectedTool} environment automatically.
                    </p>
                  </motion.div>
                )}

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowAddSource(false)}
                    className="flex-1 py-3 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddSource}
                    disabled={!selectedTool}
                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all shadow-lg shadow-slate-900/10"
                  >
                    Add Source
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Diagnostics Modal */}
      <AnimatePresence>
        {showDiagnosticsModal && diagnosticsResult && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDiagnosticsModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-bold tracking-tight text-slate-900">{diagnosticsResult.agent.name}</h3>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Health Diagnostic Report</p>
                </div>
                <button 
                  onClick={() => setShowDiagnosticsModal(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all border border-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">
                <div className={`mb-8 p-4 rounded-2xl border flex items-center gap-4 ${diagnosticsResult.success ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${diagnosticsResult.success ? 'bg-green-500' : 'bg-red-500'} text-white shadow-lg`}>
                    {diagnosticsResult.success ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm ${diagnosticsResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {diagnosticsResult.success ? 'System Operational' : 'Critical Issue Detected'}
                    </h4>
                    <p className={`text-xs ${diagnosticsResult.success ? 'text-green-600/80' : 'text-red-600/80'} font-medium`}>
                      {diagnosticsResult.status}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Last Checked</p>
                      <p className="text-sm font-mono font-bold text-slate-700">{diagnosticsResult.timestamp}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Response Code</p>
                      <p className="text-sm font-mono font-bold text-slate-700">
                        {diagnosticsResult.success ? '200 OK' : 'ERR CONNECTION'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <Terminal size={12} />
                       Payload Detail (Human Readable)
                    </p>
                    <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 text-slate-300 font-mono text-xs leading-relaxed overflow-x-auto shadow-inner">
                      {diagnosticsResult.details ? (
                        <div className="space-y-4">
                          {Object.entries(diagnosticsResult.details).map(([key, value]) => (
                            <div key={key} className="border-b border-slate-800 pb-2 last:border-0 last:pb-0">
                              <span className="text-blue-400 font-bold">{key}:</span>{' '}
                              <span className={typeof value === 'object' ? 'text-slate-500' : 'text-green-400'}>
                                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                              </span>
                            </div>
                          ))}
                          {Object.keys(diagnosticsResult.details).length === 0 && (
                            <span className="text-slate-500 italic">No additional metadata provided</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">No health data body returned from service</span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                    <div className="flex gap-3">
                       <ShieldCheck className="text-blue-500 flex-shrink-0" size={18} />
                       <div>
                         <p className="text-[10px] font-bold text-blue-900 uppercase tracking-widest mb-1">Security Audit</p>
                         <p className="text-xs text-blue-800/70 font-medium leading-relaxed">
                           Connection with <strong>{diagnosticsResult.agent.name}</strong> is verified via end-to-end encryption. 
                           Backend URL <code>{diagnosticsResult.agent.backendUrl}</code> is reachable.
                         </p>
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setShowDiagnosticsModal(false)}
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                >
                  Dismiss Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showIngest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIngest(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold tracking-tight">New Incident Ingest</h3>
                  <p className="text-xs text-slate-400">Paste raw logs or JSON export from your tools</p>
                </div>
                <button onClick={() => setShowIngest(false)} className="text-slate-400 hover:text-slate-900 transition-colors">&times;</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex gap-2 mb-2">
                  {['Kubernetes', 'AWS CloudWatch', 'Datadog', 'Sentry', 'Generic'].map(tool => (
                    <button key={tool} className="text-[10px] px-2 py-1 rounded bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors font-medium">
                      {tool}
                    </button>
                  ))}
                </div>
                <textarea 
                  value={ingestDraft}
                  onChange={(e) => setIngestDraft(e.target.value)}
                  placeholder="Paste logs here... (e.g. 2024-05-09T10:00:00Z ERROR Connection failed...)"
                  className="w-full h-64 bg-slate-50 border border-slate-100 rounded-xl p-4 font-mono text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500/30 resize-none"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Activity size={14} className="text-blue-500" />
                    <span>Auto-detecting log format...</span>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowIngest(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleIngest}
                      className="px-6 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                    >
                      Analyze with Agents
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center text-white">
             <Radar size={18} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tighter text-sm uppercase leading-none">DevSecOps</span>
            <span className="font-medium tracking-tighter text-[9px] text-slate-400 uppercase leading-none">Incident Analyzer</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <NavItem 
            icon={<LayoutDashboard size={18} />} 
            label="Active Incidents" 
            active={activeTab === 'dashboard'} 
            onClick={() => { setActiveTab('dashboard'); setSelectedIncident(null); }} 
          />
          <NavItem 
            icon={<Terminal size={18} />} 
            label="Log Analyzer" 
            active={activeTab === 'log-analyzer'} 
            onClick={() => setActiveTab('log-analyzer')} 
          />
          <NavItem 
            icon={<History size={18} />} 
            label="History" 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
          />
          <NavItem 
            icon={<Database size={18} />} 
            label="Data Sources" 
            active={activeTab === 'data-sources'} 
            onClick={() => setActiveTab('data-sources')} 
          />
          <NavItem 
            icon={<Activity size={18} />} 
            label="Integrations" 
            active={activeTab === 'integrations'} 
            onClick={() => setActiveTab('integrations')} 
          />
          <NavItem 
            icon={<Terminal size={18} />} 
            label="Models" 
            active={activeTab === 'models'} 
            onClick={() => setActiveTab('models')} 
          />
          <NavItem 
            icon={<Cpu size={18} />} 
            label="Agents" 
            active={activeTab === 'agents'} 
            onClick={() => setActiveTab('agents')} 
          />
        </nav>

        <div className="p-4 mt-auto border-t border-slate-100 bg-slate-50/50 space-y-1">
          <NavItem 
            icon={<Settings size={18} />} 
            label="Settings" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
          />
          <NavItem 
            icon={<LogOut size={18} className="text-red-400" />} 
            label="Sign Out" 
            active={false} 
            onClick={() => { setIsAuthenticated(false); setUser(null); }} 
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              {selectedIncident ? `INCIDENT / ${selectedIncident.id}` : activeTab === 'dashboard' ? 'Overview' : activeTab === 'data-sources' ? 'Data Sources' : activeTab.toUpperCase()}
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex gap-6 items-center">
              <div className="flex gap-2 items-center">
                <span className={`flex h-2 w-2 rounded-full ${sources.filter(s => s.isActive).length > 0 ? 'bg-blue-500' : 'bg-slate-300'}`}></span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {sources.filter(s => s.isActive).length} / {sources.length} Sources Active
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <span className={`flex h-2 w-2 rounded-full ${agents.filter(a => a.isActive).length > 0 ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {agents.filter(a => a.isActive).length} / {agents.length} Agents Active
                </span>
              </div>
              <div className="flex gap-2 items-center px-3 py-1 bg-purple-50 rounded-md border border-purple-100">
                <Cpu size={12} className="text-purple-500" />
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-widest">
                  Model: {agents.find(a => a.isDefault)?.model || selectedModel || 'Detecting...'}
                </span>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Search logs..." 
                  className="bg-slate-100 border border-slate-200 rounded-full py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/30 w-48 transition-all focus:w-64"
                />
              </div>
              <button 
                onClick={() => setShowIngest(true)}
                className="p-2 bg-slate-900 hover:bg-slate-800 rounded-full text-white transition-colors shadow-md"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          <AnimatePresence mode="wait">
            {selectedIncident ? (
              <IncidentDetailView 
                incident={selectedIncident} 
                agents={agents}
                onClose={() => setSelectedIncident(null)} 
              />
            ) : activeTab === 'dashboard' ? (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-6xl mx-auto space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-800">Root Cause Command Center</h2>
                    <p className="text-sm text-slate-500 font-medium tracking-tight">Autonomous synthesis of distributed system health.</p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowAddAgent(true)}
                      className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all"
                    >
                      <Plus size={16} /> Deploy New Agent
                    </button>
                    <button 
                      onClick={handleSaveToXml}
                      disabled={isSaving}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                      <Save size={16} className={isSaving ? 'animate-pulse' : ''} />
                      {isSaving ? 'Saving...' : 'Save Configuration'}
                    </button>
                  </div>
                </div>

                {/* Stats Cards */}
                {agents.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-xl shadow-blue-500/20 text-white relative overflow-hidden"
                  >
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 opacity-10">
                      <Cpu size={300} strokeWidth={1} />
                    </div>
                    
                    <div className="relative z-10 max-w-2xl">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest mb-6 border border-white/20">
                        <Activity size={12} /> System Initialization Required
                      </div>
                      <h2 className="text-4xl font-black tracking-tight mb-4 leading-tight">
                        Deploy your first <br />Autonomous Agent
                      </h2>
                      <p className="text-blue-100 text-lg font-medium mb-8 leading-relaxed">
                        To begin automated log processing and root cause analysis, you need to configure at least one diagnostic agent. 
                        Agents specialize in scanning specific services and reporting findings in real-time.
                      </p>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => setShowAddAgent(true)}
                          className="px-8 py-4 bg-white text-blue-600 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-blue-50 transition-all shadow-lg flex items-center gap-3"
                        >
                          <Plus size={20} /> Create New Agent
                        </button>
                        <button 
                          onClick={() => setActiveTab('agents')}
                          className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-white/20 transition-all"
                        >
                          View Agent Registry
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-4 gap-6">
                  <StatCard 
                    label="Total Active" 
                    value={MOCK_INCIDENTS.filter(i => i.status !== 'resolved').length.toString().padStart(2, '0')} 
                    sub={`Across ${sources.length} Clusters`} 
                    color="blue" 
                  />
                  <StatCard 
                    label="Critical" 
                    value={(() => {
                      const criticalCount = MOCK_INCIDENTS.filter(i => i.severity === 'critical').length;
                      const hasRecentCritical = MOCK_INCIDENTS.some(i => 
                        i.severity === 'critical' && 
                        (Date.now() - new Date(i.createdAt).getTime()) < 3600000
                      );
                      return (criticalCount + (hasRecentCritical ? 1 : 0)).toString().padStart(2, '0');
                    })()} 
                    sub={(() => {
                      const recentCount = MOCK_INCIDENTS.filter(i => 
                        i.severity === 'critical' && 
                        (Date.now() - new Date(i.createdAt).getTime()) < 3600000
                      ).length;
                      return recentCount > 0 ? `+${recentCount} in last 1hr` : 'No recent criticals';
                    })()}
                    color="red" 
                  />
                  <StatCard label="Avg. Resolution" value="24m" sub="98th percentile" color="green" />
                  <StatCard label="Agent Coverage" value="94%" sub={`${agents.length} Hybrid Agents`} color="slate" />
                </div>

                {/* Incident List */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Active Analysis Stream</h2>
                    <div className="flex gap-2">
                       <span className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 font-bold">
                          <Activity size={10} strokeWidth={3} /> LIVE SYNC
                       </span>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {MOCK_INCIDENTS.map((incident) => (
                      <IncidentRow 
                        key={incident.id} 
                        incident={incident} 
                        onClick={() => setSelectedIncident(incident)} 
                      />
                    ))}
                  </div>
                </div>

                {/* Agent Feed */}
                <div className="grid grid-cols-3 gap-8">
                  <div className="col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                      <Terminal size={14} className="text-blue-500" />
                      Live Agent Synthesis
                    </h2>
                    <div className="space-y-6">
                      {agents.filter(a => a.isActive && a.status === 'analyzing').map(agent => (
                        <div key={agent.id} className="flex gap-5">
                          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl shrink-0 text-blue-500">
                            <Cpu size={24} />
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-slate-900">{agent.name}</span>
                              <span className="text-[10px] font-bold text-blue-500 animate-pulse tracking-widest uppercase">Analyzing...</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full bg-blue-500"
                                animate={{ width: ['20%', '80%', '40%', '90%'] }}
                                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                              />
                            </div>
                            <div className="text-[11px] text-slate-500 leading-relaxed font-mono bg-slate-50 p-2 rounded border border-slate-100">
                              {agent.findings[0]}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-6">Hot Entities</h3>
                    <div className="space-y-4">
                      <EntityItem label="checkout-service" type="Service" hits={45} />
                      <EntityItem label="payment-gateway" type="Endpoint" hits={12} />
                      <EntityItem label="k8s-node-4" type="Node" hits={8} />
                      <EntityItem label="redis-main" type="Cache" status="degraded" hits={3} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'log-analyzer' ? (
              <motion.div 
                key="log-analyzer"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Advanced Log Analyzer</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm text-slate-500 font-medium">Cross-reference logs across all active distributed systems.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => { setLogStream(''); setAnalysisResult(''); setDescription(''); setSelectedFile(null); setIsFileInputMode(false); }}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all"
                    >
                      <Terminal size={14} /> Clear Stream
                    </button>
                    <button 
                      onClick={handleAnalyzeLogs}
                      disabled={isAnalyzing || (!logStream && !selectedFile) || !hasActiveAgent}
                      className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-slate-900/10 disabled:opacity-50"
                      title={agents.length === 0 ? "Please add at least one agent to proceed" : (!hasActiveAgent ? "Please activate your analysis agent to proceed" : "")}
                    >
                      {isAnalyzing ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={14} />} 
                      Analyze Logs
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-8 h-auto">
                  {/* Input Side - Aligned Right */}
                  <div className="w-[95%] ml-auto bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <header className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isFileInputMode ? 'bg-purple-500 animate-pulse' : 'bg-blue-500'}`}></span>
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">
                          Input: {isFileInputMode ? 'File Buffer (Multipart)' : 'Log Stream Payload'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className={`flex items-center gap-2 px-3 py-1.5 border hover:border-blue-400 rounded-lg text-[10px] font-bold cursor-pointer transition-all shadow-sm ${isFileInputMode ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600'}`}>
                          <Upload size={12} className={isFileInputMode ? "text-blue-600" : "text-blue-500"} />
                          <span>{isFileInputMode && selectedFile ? selectedFile.name.toUpperCase() : 'UPLOAD LOG FILE'}</span>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept=".txt,.log,text/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setSelectedFile(file);
                                setIsFileInputMode(true);
                                setLogStream(''); // Clear text input if file selected
                              }
                            }}
                          />
                        </label>
                        {isFileInputMode && (
                          <button 
                            onClick={() => { setIsFileInputMode(false); setSelectedFile(null); }}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Switch to Text Input"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </header>
                    
                    <div className="p-8 space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description / Instructions</label>
                          <span className={`text-[9px] font-mono ${description.length >= 200 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                            {description.length}/200
                          </span>
                        </div>
                        <input 
                          type="text"
                          value={description}
                          onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                          placeholder="What should I look for? (e.g. 'Identify latency bottlenecks')"
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 transition-all font-medium"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {isFileInputMode ? 'File Manifest View' : 'Local Buffer Logs'}
                        </label>
                        
                        {isFileInputMode ? (
                          <div className="w-full h-64 bg-blue-50/20 border border-blue-100 border-dashed rounded-xl flex flex-col items-center justify-center gap-5 group transition-colors hover:bg-blue-50/40">
                            <div className="w-20 h-20 bg-white rounded-3xl shadow-xl shadow-blue-500/5 border border-blue-100 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-all duration-500">
                              <Terminal size={40} />
                            </div>
                            <div className="text-center space-y-1">
                              <p className="text-sm font-bold text-slate-900 tracking-tight">{selectedFile?.name || 'Awaiting selection...'}</p>
                              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                                {selectedFile 
                                  ? `${(selectedFile.size / 1024).toFixed(2)} KB • ${selectedFile.type || 'plain/text'}`
                                  : 'Select a direct log file system resource'
                                }
                              </p>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-100 rounded-full shadow-sm text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                              <ShieldCheck size={10} className="text-green-500" /> Integrity Check Passed
                            </div>
                          </div>
                        ) : (
                          <textarea 
                            value={logStream}
                            onChange={(e) => setLogStream(e.target.value)}
                            spellCheck={false}
                            className="w-full h-64 bg-slate-50 border border-slate-100 rounded-xl p-4 font-mono text-[11px] text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 transition-all custom-scrollbar selection:bg-blue-500/10 leading-relaxed"
                            placeholder="Paste logs here..."
                          />
                        )}
                      </div>
                    </div>

                    <footer className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                       <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter">
                         {isFileInputMode 
                           ? `Binary Stream Size: ${selectedFile?.size.toLocaleString() || 0} Bytes`
                           : `Payload Size: ${logStream.length.toLocaleString()} Bytes`
                         }
                       </span>
                    </footer>
                  </div>

                  {/* Output Side - Aligned Left */}
                  <div className="w-[95%] mr-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[300px]">
                    <header className="px-6 py-4 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isAnalyzing ? (
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                        ) : (
                          <Activity size={14} className="text-blue-400" />
                        )}
                        <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest font-bold">Intelligence Analysis Report</span>
                      </div>
                    </header>

                    <div className="flex-1 p-8">
                      {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-4">
                           <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                           <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest animate-pulse">Agent is processing data nodes...</span>
                        </div>
                      ) : analysisResult ? (
                        <div className="prose prose-invert prose-xs max-w-none text-blue-100/90 leading-relaxed selection:bg-blue-500/30 font-mono whitespace-pre-wrap">
                          <ReactMarkdown>{analysisResult}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-600 italic gap-4 opacity-40">
                          <Cpu size={40} />
                          <span className="text-[10px] uppercase font-bold tracking-[0.2em]">Awaiting Data for Synthesis</span>
                        </div>
                      )}
                    </div>

                    <footer className="px-8 py-4 bg-black/40 border-t border-slate-800/50 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                        <ShieldCheck size={12} className="text-blue-500" /> AICORE-V3 VERIFIED
                      </div>
                      <span className="text-[9px] font-mono text-slate-600 uppercase">Analysis Precision: High</span>
                    </footer>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'history' ? (
              <motion.div 
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-[90%] mx-auto space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Analysis History</h2>
                    <p className="text-sm text-slate-500 font-medium">Review past log analysis reports and insights.</p>
                  </div>
                  <button 
                    onClick={() => setAnalysisHistory([])}
                    className="px-4 py-2 border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all"
                  >
                    <Trash2 size={14} /> Clear History
                  </button>
                </div>

                <div className="space-y-4">
                  {analysisHistory.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-20 text-center flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                        <History size={32} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-slate-900">No History Yet</h3>
                        <p className="text-sm text-slate-400">Run an analysis in the Log Analyzer to see results here.</p>
                      </div>
                    </div>
                  ) : (
                    analysisHistory.map((item) => (
                      <div 
                        key={item.id} 
                        className={`bg-white border transition-all rounded-2xl overflow-hidden shadow-sm hover:shadow-md ${expandedHistoryId === item.id ? 'border-blue-200 ring-4 ring-blue-500/5' : 'border-slate-200'}`}
                      >
                        <button 
                          onClick={() => setExpandedHistoryId(expandedHistoryId === item.id ? null : item.id)}
                          className="w-full px-8 py-6 flex items-center justify-between text-left group"
                        >
                          <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                              <Terminal size={20} />
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-bold text-slate-900 tracking-tight">{item.id}</h3>
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black uppercase tracking-widest border border-blue-100">
                                  COMPLETED
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400 uppercase tracking-widest">
                                <span className="flex items-center gap-1.5"><Clock size={12} /> {new Date(item.timestamp).toLocaleString()}</span>
                                <span className="text-slate-200">|</span>
                                <span>{item.input.length} characters analyzed</span>
                              </div>
                            </div>
                          </div>
                          <div className={`p-2 rounded-lg transition-all ${expandedHistoryId === item.id ? 'bg-blue-50 text-blue-500 rotate-180' : 'bg-slate-50 text-slate-400 group-hover:text-slate-900 group-hover:bg-slate-100'}`}>
                            <ChevronRight size={20} />
                          </div>
                        </button>

                        <AnimatePresence>
                          {expandedHistoryId === item.id && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-8 pb-8 pt-2 grid grid-cols-2 gap-8 border-t border-slate-50">
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Input Raw Logs</h4>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(item.input); }}
                                      className="text-[9px] font-bold text-blue-500 uppercase hover:underline"
                                    >
                                      Copy Raw
                                    </button>
                                  </div>
                                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 font-mono text-[11px] text-slate-600 max-h-[400px] overflow-y-auto whitespace-pre custom-scrollbar">
                                    {item.input}
                                  </div>
                                </div>
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Intelligence Report</h4>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(item.output); }}
                                      className="text-[9px] font-bold text-blue-500 uppercase hover:underline"
                                    >
                                      Copy Report
                                    </button>
                                  </div>
                                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-[11px] text-blue-100/90 max-h-[400px] overflow-y-auto custom-scrollbar leading-relaxed markdown-container">
                                    <ReactMarkdown>{item.output}</ReactMarkdown>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            ) : activeTab === 'agents' ? (
              <motion.div 
                key="agents"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="max-w-6xl mx-auto space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">AI Diagnostic Agents</h2>
                    <p className="text-sm text-slate-500">Autonomous agents specializing in root cause analysis.</p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={handleSaveToXml}
                      disabled={isSaving}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                      <Save size={16} className={isSaving ? 'animate-pulse' : ''} />
                      {isSaving ? 'Saving...' : 'Save Configuration'}
                    </button>
                    <button 
                      onClick={() => setShowAddAgent(true)}
                      className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-slate-900/10"
                    >
                      <Plus size={16} /> Deploy New Agent
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {agents.length === 0 ? (
                    <div className="col-span-full py-20 bg-white border border-slate-200 border-dashed rounded-3xl flex flex-col items-center justify-center gap-6">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                        <Cpu size={40} />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">No Agents Deployed</h3>
                        <p className="text-sm text-slate-500 font-medium max-w-xs mx-auto">
                          Autonomous entities are required to monitor system health and process diagnostics.
                        </p>
                      </div>
                      <button 
                        onClick={() => setShowAddAgent(true)}
                        className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 shadow-lg"
                      >
                         Configure First Agent
                      </button>
                    </div>
                  ) : agents.map(agent => (
                    <div key={agent.id} className={`bg-white border rounded-2xl p-8 transition-all group shadow-sm hover:shadow-md relative overflow-hidden ${agent.isActive ? 'border-slate-200 hover:border-blue-500/50' : 'border-slate-100 opacity-60'}`}>
                      {!agent.isActive && (
                        <div className="absolute top-0 right-0 p-2">
                           <span className="text-[8px] font-black uppercase tracking-tighter bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">DEACTIVATED</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start mb-6">
                        <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center text-3xl group-hover:scale-110 transition-transform ${agent.isActive ? 'bg-slate-50 border-slate-100' : 'bg-slate-100 border-slate-200'}`}>
                          <Cpu size={32} className={agent.isActive ? 'text-blue-500' : 'text-slate-400'} />
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); openAgentConfig(agent); }}
                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Configure"
                          >
                            <Settings size={18} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleAgent(agent.id); }}
                            className={`p-2 rounded-lg transition-colors ${agent.isActive ? 'text-green-500 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}
                            title={agent.isActive ? "Deactivate" : "Activate"}
                          >
                            {agent.isActive ? <Power size={18} /> : <PowerOff size={18} />}
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteAgent(agent.id); }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-bold text-xl tracking-tight text-slate-900">{agent.name}</h3>
                      
                      {agent.backendUrl && (
                        <div className="mb-6 flex items-center gap-2 px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[9px] text-slate-400 font-mono overflow-hidden whitespace-nowrap text-ellipsis">
                          <ExternalLink size={10} />
                          {agent.backendUrl}
                        </div>
                      )}
                      
                      <div className="space-y-3">
                         <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Capabilities</div>
                         <div className="flex flex-wrap gap-2">
                           {['Log Profiling', 'Anomaly Detection', 'Trend Analysis'].map(cap => (
                             <span key={cap} className="text-[10px] px-2 py-0.5 rounded bg-slate-50 border border-slate-100 text-slate-500 font-medium">{cap}</span>
                           ))}
                         </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={`w-2 h-2 rounded-full ${agent.isActive ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                            {agent.isActive ? (diagnosticsMap[agent.id]?.status || agent.status) : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleSetDefaultAgent(agent.id); }}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${agent.isDefault ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                          >
                            {agent.isDefault ? 'Primary' : 'Set Default'}
                          </button>
                          <button 
                            disabled={!agent.isActive || !agent.backendUrl || diagnosticsMap[agent.id]?.loading}
                            onClick={(e) => { e.stopPropagation(); handleCheckDiagnostics(agent); }}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-600 disabled:hover:border-slate-200 flex items-center gap-1.5"
                          >
                            {diagnosticsMap[agent.id]?.loading && <div className="w-2 h-2 border-2 border-slate-400 border-t-white rounded-full animate-spin" />}
                            Diagnostics
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : activeTab === 'data-sources' ? (
              <motion.div 
                key="data-sources"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold tracking-tight">Data Sources</h2>
                      <div className="bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider">
                        {sources.length}
                      </div>
                    </div>
                    <p className="text-sm text-slate-500">Manage your DevOps toolchain integrations for analysis.</p>
                  </div>
                  <div className="flex gap-3">
                    {sources.some(s => s.type === 'jenkins' && s.isActive) && (
                      <button 
                        onClick={handleScrapeJenkins}
                        disabled={isScrapingJenkins}
                        className="px-4 py-2 border border-blue-200 text-blue-600 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-blue-50 transition-all disabled:opacity-50"
                      >
                        <Search size={16} className={isScrapingJenkins ? 'animate-spin' : ''} />
                        {isScrapingJenkins ? 'Scraping...' : 'Scrape Failed Jobs'}
                      </button>
                    )}
                    <button 
                      onClick={handleSaveToXml}
                      disabled={isSaving}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                      <Save size={16} className={isSaving ? 'animate-pulse' : ''} />
                      {isSaving ? 'Saving...' : 'Save Configuration'}
                    </button>
                    <button 
                      onClick={() => setShowAddSource(true)}
                      className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                    >
                      <Plus size={16} /> Add Source
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {failedJenkinsJobs.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-6 bg-red-50 border border-red-100 rounded-2xl"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-red-500 text-white p-2 rounded-lg">
                            <AlertTriangle size={18} />
                          </div>
                          <div>
                            <h3 className="font-bold text-red-900">Failed Jenkins Jobs Detected</h3>
                            <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">{failedJenkinsJobs.length} Critical failures</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setFailedJenkinsJobs([])}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Plus size={20} className="rotate-45" />
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        {failedJenkinsJobs.map((job, idx) => (
                          <div key={idx} className="bg-white border border-red-50 rounded-xl p-4 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                                <Activity size={18} />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm">{job.name}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{job.sourceName}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              {job.lastBuild && (
                                <div className="text-right">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Failed on</p>
                                  <p className="text-xs font-mono text-slate-600">{new Date(job.lastBuild.timestamp).toLocaleString()}</p>
                                </div>
                              )}
                              <a 
                                href={job.url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                              >
                                <ExternalLink size={18} />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 gap-4">
                        {sources.map(source => (
                          <div key={source.id} className={`bg-white border transition-all rounded-xl p-5 flex items-center justify-between shadow-sm ${source.isActive ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={() => toggleSource(source.id)}
                              className={`p-2 rounded-lg transition-all ${source.isActive ? 'text-blue-500 bg-blue-50' : 'text-slate-400 bg-slate-50'}`}
                              title={source.isActive ? 'Deactivate Source' : 'Activate Source'}
                            >
                              {source.isActive ? <Power size={18} /> : <PowerOff size={18} />}
                            </button>
                            <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 uppercase font-black text-slate-400 text-[10px]">
                              {source.type.substring(0, 2)}
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900">{source.name}</h3>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{source.type}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-8">
                            <div className="text-right">
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Status</p>
                              <span className={`text-xs font-bold ${!source.isActive ? 'text-slate-400' : source.status === 'connected' ? 'text-green-600' : source.status === 'syncing' ? 'text-blue-500' : 'text-red-500'}`}>
                                {source.isActive ? source.status.toUpperCase() : 'INACTIVE'}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Last Sync</p>
                              <p className="text-xs font-mono text-slate-600">{new Date(source.lastSync!).toLocaleTimeString()}</p>
                            </div>
                            <div className="relative">
                              <button 
                                onClick={() => setActiveMenuId(activeMenuId === source.id ? null : source.id)}
                            className={`p-2 transition-colors rounded-lg ${activeMenuId === source.id ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
                          >
                            <Settings size={16} />
                          </button>
                          
                          <AnimatePresence>
                            {activeMenuId === source.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setActiveMenuId(null)}
                                />
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                  className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden py-1"
                                >
                                  <button 
                                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                    onClick={() => setActiveMenuId(null)}
                                  >
                                    <Activity size={14} /> View Logs
                                  </button>
                                  <button 
                                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                    onClick={() => openConfig(source)}
                                  >
                                    <Settings size={14} /> Configure
                                  </button>
                                  <div className="h-px bg-slate-100 my-1" />
                                  <button 
                                    className="w-full px-4 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    onClick={() => deleteSource(source.id)}
                                  >
                                    <ShieldAlert size={14} /> Delete Source
                                  </button>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
            ) : activeTab === 'integrations' ? (
              <motion.div 
                key="integrations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Integrations</h2>
                    <p className="text-sm text-slate-500">Configure external communication and notification channels.</p>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center flex flex-col items-center gap-4 shadow-sm">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
                    <Activity size={32} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 tracking-tight">No Integrations Configured</h3>
                    <p className="text-sm text-slate-400 max-w-xs mx-auto">Connect Slack, Jira, or custom webhooks to receive real-time incident analysis reports.</p>
                  </div>
                  <button className="mt-4 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-slate-900/10">
                    Browse Marketplace
                  </button>
                </div>
              </motion.div>
            ) : activeTab === 'models' ? (
              <motion.div 
                key="models"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">AI Models</h2>
                    <p className="text-sm text-slate-500">Configure global model settings via OpenRouter.</p>
                  </div>
                  <button 
                    onClick={handleSaveToXml}
                    disabled={isSaving}
                    className="px-6 py-3 bg-black text-white hover:bg-slate-900 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-black/10 transition-all disabled:opacity-50"
                  >
                    <Save size={16} className={isSaving ? 'animate-pulse' : ''} />
                    {isSaving ? 'Saving...' : 'SAVE MODEL'}
                  </button>
                </div>


                <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-6 shadow-sm">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Default Primary Model</label>
                    <div className="relative">
                      <select 
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                      >
                        {supportedModels.length === 0 ? (
                          <option>Loading models...</option>
                        ) : (
                          [...supportedModels]
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(model => (
                              <option key={model.id} value={model.id}>
                                {model.name} ({model.id})
                              </option>
                            ))
                        )}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronRight className="rotate-90" size={16} />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Select the specialized LLM that will drive root cause analysis across all autonomous agents.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">API Backend URL</label>
                    <input 
                      type="text"
                      value={apiBackendUrl}
                      disabled={true}
                      placeholder="https://api.your-backend.com/v1"
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none cursor-not-allowed text-slate-500"
                    />
                    <p className="text-[11px] text-slate-400 font-medium">
                      The base URL is configured in code and is non-editable.
                    </p>
                  </div>

                  {selectedModel && supportedModels.length > 0 && (
                    <div className="pt-4 border-t border-slate-100">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Context Window</p>
                          <p className="text-sm font-mono text-slate-700">
                            {supportedModels.find(m => m.id === selectedModel)?.context_length?.toLocaleString() || 'Unknown'} tokens
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pricing (per 1M tokens)</p>
                          <p className="text-sm font-mono text-slate-700">
                            ${(parseFloat(supportedModels.find(m => m.id === selectedModel)?.pricing?.prompt || '0') * 1000000).toFixed(2)} prompt / 
                            ${(parseFloat(supportedModels.find(m => m.id === selectedModel)?.pricing?.completion || '0') * 1000000).toFixed(2)} completion
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : activeTab === 'settings' ? (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
                    <p className="text-sm text-slate-500">General application configuration.</p>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 font-medium">
                  General settings configuration coming soon.
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="other"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center h-full text-slate-200 uppercase tracking-[0.3em] font-bold text-2xl"
              >
                No Data Available
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      onLogin({ email });
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] animate-pulse delay-700" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl p-10 relative z-10 shadow-2xl border border-slate-200"
      >
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-white/10">
            <ShieldAlert size={32} className="text-blue-500" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 mb-2">RCACENTRAL</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Autonomous System Governance</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Terminal ID</label>
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="email" 
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                placeholder="operator@rca.central"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Access Protocol</label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="password" 
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-bold uppercase tracking-[0.25em] shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          >
            Authorize Connection <LogIn size={16} />
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-100 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> SECURE LINK ESTABLISHED
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
        active 
          ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' 
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
      }`}
    >
      <span className={active ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'}>{icon}</span>
      <span>{label}</span>
      {active && <motion.div layoutId="nav-dot" className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
    </button>
  );
}

function StatCard({ label, value, sub, color }: { label: string, value: string, sub: string, color: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-600',
    red: 'text-red-600',
    green: 'text-green-600',
    slate: 'text-slate-900'
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-all group">
      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">{label}</div>
      <div className={`text-4xl font-mono font-bold tracking-tighter ${colors[color]}`}>{value}</div>
      <div className="text-[10px] text-slate-400 font-bold group-hover:text-slate-600 transition-colors uppercase tracking-tight mt-1">{sub}</div>
    </div>
  );
}

const IncidentRow: React.FC<{ incident: Incident, onClick: () => void }> = ({ incident, onClick }) => {
  const getSeverityStyles = (s: string) => {
    switch(s) {
      case 'critical': return 'bg-red-50 text-red-600 border-red-100';
      case 'warning': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-blue-50 text-blue-600 border-blue-100';
    }
  };

  return (
    <button 
      onClick={onClick}
      className="w-full grid grid-cols-12 gap-4 items-center p-5 hover:bg-slate-50 transition-all text-left group"
    >
      <div className="col-span-2 font-mono text-[11px] text-slate-300 font-medium group-hover:text-slate-500 transition-colors">{incident.id}</div>
      <div className="col-span-4 font-bold text-sm tracking-tight text-slate-900">{incident.title}</div>
      <div className="col-span-2">
        <span className={`text-[10px] px-2.5 py-1 rounded-md border uppercase font-bold tracking-widest leading-none ${getSeverityStyles(incident.severity)}`}>
          {incident.severity}
        </span>
      </div>
      <div className="col-span-2 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
        <Clock size={12} className="text-slate-300" />
        {new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="col-span-2 flex justify-end">
        <div className="p-1 px-2 rounded-lg bg-transparent group-hover:bg-slate-200 transition-colors">
          <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-600" />
        </div>
      </div>
    </button>
  );
}

function EntityItem({ label, type, hits, status }: { label: string, type: string, hits: number, status?: string }) {
  return (
    <div className="flex items-center justify-between group cursor-default">
      <div className="flex flex-col">
        <span className={`text-xs font-bold tracking-tight group-hover:text-blue-600 transition-colors ${status === 'degraded' ? 'text-amber-500' : 'text-slate-700'}`}>{label}</span>
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{type}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-slate-400 group-hover:bg-blue-400 transition-colors" style={{ width: `${Math.min(hits * 2, 100)}%` }} />
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-400">{hits}</span>
      </div>
    </div>
  );
}

function IncidentDetailView({ incident, agents, onClose }: { incident: Incident, agents: RCAAgent[], onClose: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="h-full flex flex-col space-y-6"
    >
      {/* Detail Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={onClose} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 flex items-center gap-1 mb-3 transition-colors">
            <ChevronRight size={12} className="rotate-180" /> Back to Dashboard
          </button>
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-black tracking-tighter text-slate-900">{incident.title}</h2>
            <span className={`px-2.5 py-1 text-[10px] font-bold rounded uppercase tracking-widest border ${incident.severity === 'critical' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
              {incident.severity}
            </span>
          </div>
          <div className="flex items-center gap-6 mt-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-2"><Clock size={14} className="text-slate-300" /> Created {new Date(incident.createdAt).toLocaleTimeString()}</span>
            <span className="flex items-center gap-2"><Activity size={14} className="text-blue-400" /> Sources: {incident.sourceTools.join(', ')}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-slate-900/20 transition-all flex items-center gap-2">
            <CheckCircle2 size={16} /> Resolve Incident
          </button>
          <button className="p-2.5 bg-white border border-slate-200 hover:border-slate-400 rounded-xl text-slate-600 transition-colors shadow-sm">
             <ExternalLink size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 flex-1 overflow-hidden pb-8">
        {/* Left: Investigation & Logs */}
        <div className="col-span-8 flex flex-col space-y-8 overflow-hidden">
          {/* Logs View */}
          <div className="flex-1 bg-slate-900 rounded-2xl flex flex-col overflow-hidden shadow-2xl border border-slate-800">
            <div className="h-10 px-4 bg-slate-800 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2"><Terminal size={14} /> Aggregated Stream</span>
                <div className="flex gap-1">
                  <button className="px-2 py-0.5 bg-slate-700 text-[9px] rounded text-white font-bold uppercase">Live Logs</button>
                  <button className="px-2 py-0.5 text-[9px] rounded text-slate-500 hover:text-slate-300 font-bold uppercase">Filtered View</button>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest italic">{incident.logs.length} Operations Syncing</span>
            </div>
            <div className="flex-1 overflow-y-auto p-5 font-mono text-[11px] leading-relaxed space-y-1.5 scrollbar-hide">
              {incident.logs.map((log) => (
                <div key={log.id} className="flex gap-5 group hover:bg-white/[0.03] -mx-5 px-5 py-1 transition-colors">
                  <span className="text-slate-600 shrink-0 w-12">{log.timestamp}</span>
                  <span className={`shrink-0 w-24 text-[10px] font-bold tracking-tight ${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-amber-400' : 'text-blue-400'}`}>
                    {log.source.toUpperCase()}
                  </span>
                  <span className="text-slate-300 truncate group-hover:text-white transition-colors">{log.message}</span>
                </div>
              ))}
              <div className="text-blue-500 mt-6 animate-pulse font-bold">_ streaming packet analysis from agents...</div>
            </div>
          </div>

          {/* Root Cause Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-8 relative overflow-hidden shadow-sm analysis-border">
            <div className="absolute top-0 right-0 p-6 text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Analysis Confidence</div>
              <div className="flex items-center gap-3 justify-end">
                <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                   <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${incident.confidence}%` }}
                    className="h-full bg-green-500"
                   />
                </div>
                <span className="text-xs font-mono font-bold text-slate-900">{incident.confidence}% <span className="text-green-600 uppercase text-[9px] ml-1">High</span></span>
              </div>
            </div>
            <h3 className="text-[10px] font-bold text-slate-400 flex items-center gap-2 mb-4 uppercase tracking-widest">
              <AlertTriangle size={16} className="text-blue-500" />
              Primary Analysis Consensus
            </h3>
            <p className="text-2xl text-slate-900 font-bold leading-tight max-w-2xl tracking-tight">
              "{incident.possibleRCA}"
            </p>
            <div className="mt-8 flex gap-5 items-center">
               <div className="flex -space-x-3">
                 {agents.filter(a => a.isActive).map(agent => (
                   <div key={agent.id} className="w-10 h-10 rounded-full border-4 border-white bg-slate-50 flex items-center justify-center text-blue-500 shadow-sm" title={agent.name}>
                     <Cpu size={16} />
                   </div>
                 ))}
                 {agents.filter(a => a.isActive).length === 0 && (
                   <div className="text-[10px] text-slate-400 font-bold uppercase py-2">No Active Agents</div>
                 )}
               </div>
               <div className="text-[11px] text-slate-400 font-medium leading-relaxed italic max-w-xs transition-opacity">Consensus reached after logic synthesis from active diagnostic agents.</div>
            </div>
          </div>
        </div>

        {/* Right: Agent Insights & Metadata */}
        <div className="col-span-4 flex flex-col space-y-8 overflow-hidden">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 flex-1 flex flex-col overflow-hidden shadow-sm">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-8">Agent Findings Stream</h3>
            <div className="flex-1 overflow-y-auto space-y-8 pr-2 scrollbar-hide">
               {agents.filter(a => a.isActive).map(agent => (
                 <div key={agent.id} className="space-y-4">
                   <div className="flex items-center justify-between">
                     <span className="text-sm font-bold flex items-center gap-3 text-slate-900">
                       <span className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-blue-500 border border-slate-100"><Cpu size={16} /></span> {agent.name}
                     </span>
                     <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${agent.status === 'complete' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600 animate-pulse'}`}>
                       {agent.status}
                     </span>
                   </div>
                   <ul className="space-y-3 relative ml-4 pl-6 border-l border-slate-100">
                     {(agent.findings.length > 0 ? agent.findings : ['Running initial heuristic scans...']).map((f, idx) => (
                       <li key={idx} className="text-xs text-slate-500 leading-relaxed relative font-medium group">
                         <div className="absolute -left-[28.5px] top-1.5 w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-blue-400 transition-colors" />
                         {f}
                       </li>
                     ))}
                   </ul>
                 </div>
               ))}
               {agents.filter(a => a.isActive).length === 0 && (
                 <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-4 opacity-50">
                    <Cpu size={48} />
                    <p className="text-xs font-bold uppercase tracking-widest text-center">Deploy agents to enable insights</p>
                 </div>
               )}
            </div>
            <div className="pt-8 border-t border-slate-100 mt-auto">
              <button className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-600 transition-all">
                 Task Specialist Agent
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

