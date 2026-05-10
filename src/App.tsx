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
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Incident, RCAAgent } from './types';
import { MOCK_INCIDENTS } from './mockData';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'log-analyzer' | 'agents' | 'integrations' | 'models' | 'settings'>('dashboard');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [agents, setAgents] = useState<RCAAgent[]>([]);
  const [supportedModels, setSupportedModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [apiBackendUrl, setApiBackendUrl] = useState<string>('');
  const [lastTriggeredApi, setLastTriggeredApi] = useState<{ url: string, payload: any, response?: any, status?: number } | null>(null);
  const [showApiNotification, setShowApiNotification] = useState(false);
  const [logStream, setLogStream] = useState<string>(`_ SESSION START: ${new Date().toISOString()}
05:01:12 [SYSTEM] Initializing distributed trace collection...
05:01:13 [SYSTEM] Connected to 12 active sources. Listening for events.

05:02:01 [HTTP] GET /api/v1/health - 200 OK (checkout-service)
05:02:03 [HTTP] POST /api/v1/orders - 201 Created (checkout-service)
05:02:05 [ERROR] Uncaught Exception: ETIMEDOUT - connection lost to redis-main
05:02:06 [WARN] Retry attempt 1/3 for redis-main...
05:02:08 [K8S] Pod checkout-v2-5b6d7f9c-xh2j1 restart signal received
05:02:10 [FATAL] Circuit Breaker OPEN: payment-gateway has failed 5 consecutive health checks

_ LISTEN_STDOUT >> sync: [###############] 100%`);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const isAnalysisAgentAdded = agents.some(a => a.isActive && (a.backendUrl?.includes('/api/v1/analyze') || a.backendUrl?.includes('/api/vx/analyze')));

  const handleAnalyzeLogs = () => {
    setIsAnalyzing(true);
    setAnalysisResult('Initializing engine...\nScanning for anomalies...');
    
    setTimeout(() => {
      const errorCount = (logStream.match(/\[ERROR\]|\[FATAL\]/g) || []).length;
      const warnCount = (logStream.match(/\[WARN\]/g) || []).length;
      
      let report = `### INTELLIGENT ANALYSIS REPORT\n\n`;
      report += `DETECTED ANOMALIES:\n`;
      report += `---------------------\n`;
      report += `• Critical Failures: ${errorCount}\n`;
      report += `• System Warnings:   ${warnCount}\n\n`;
      
      if (logStream.toLowerCase().includes('redis')) {
        report += `[IDENTIFIED ISSUE]: Persistence Layer Instability\n`;
        report += `Connection timeouts to redis-main suggest a potential master-node flip or networking partition.\n\n`;
      }
      
      if (logStream.toLowerCase().includes('circuit breaker')) {
        report += `[IDENTIFIED ISSUE]: Service Interruption\n`;
        report += `Circuit breaker for 'payment-gateway' is OPEN. All traffic to this service is being rejected to preserve stability.\n\n`;
      }

      report += `PROPOSED REMEDIATION:\n`;
      report += `1. Verify health of redis-main-0 pod logs.\n`;
      report += `2. Trigger manual circuit reset if dependency is stable.\n`;
      report += `3. Investigate pod checkout-v2 restart triggers.`;
      
      setAnalysisResult(report);
      setIsAnalyzing(false);
    }, 1200);
  };

  const [failedJenkinsJobs, setFailedJenkinsJobs] = useState<any[]>([]);
  const [isScrapingJenkins, setIsScrapingJenkins] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load config on mount
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setSources(data.sources || []);
        setAgents(data.agents || []);
        if (data.selectedModel) setSelectedModel(data.selectedModel);
        if (data.apiBackendUrl) setApiBackendUrl(data.apiBackendUrl);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load config:', err);
        setLoading(false);
      });

    // Fetch OpenRouter Models
    fetch('https://openrouter.ai/api/v1/models')
      .then(res => res.json())
      .then(data => {
        setSupportedModels(data.data || []);
        if (data.data && data.data.length > 0) {
          setSelectedModel(data.data[0].id);
        }
      })
      .catch(err => console.error('Failed to fetch OpenRouter models:', err));
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
  const [agentRole, setAgentRole] = useState('');
  const [agentBackendUrl, setAgentBackendUrl] = useState('');
  const [agentAvatar, setAgentAvatar] = useState('🤖');
  const [configName, setConfigName] = useState('');
  const [configUrl, setConfigUrl] = useState('');
  const [configUser, setConfigUser] = useState('');
  const [configKey, setConfigKey] = useState('');

  const handleAddAgent = () => {
    if (!agentName || !agentRole) return;
    
    // Duplicate check: Verify if the URL is already used by another agent
    if (agentBackendUrl && agents.some(a => a.backendUrl === agentBackendUrl)) {
      alert('An agent with this Backend URL already exists.');
      return;
    }
    
    const newAgent: RCAAgent = {
      id: `agent-${Date.now()}`,
      name: agentName,
      role: agentRole,
      avatar: agentAvatar,
      status: 'idle',
      isActive: true,
      backendUrl: agentBackendUrl,
      findings: []
    };

    setAgents([...agents, newAgent]);
    setShowAddAgent(false);
    setAgentName('');
    setAgentRole('');
    setAgentBackendUrl('');
    setAgentAvatar('🤖');
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
        ? { ...a, name: agentName, role: agentRole, backendUrl: agentBackendUrl } 
        : a
    ));
    setShowAgentConfigModal(false);
    setConfiguringAgentId(null);
    setAgentName('');
    setAgentRole('');
    setAgentBackendUrl('');
  };

  const openAgentConfig = (agent: RCAAgent) => {
    setConfiguringAgentId(agent.id);
    setAgentName(agent.name);
    setAgentRole(agent.role);
    setAgentBackendUrl(agent.backendUrl || '');
    setShowAgentConfigModal(true);
  };

  const handleSaveToXml = async () => {
    setIsSaving(true);
    
    // Construct the endpoint URL for display
    const externalEndpoint = apiBackendUrl 
      ? (apiBackendUrl.endsWith('/') ? `${apiBackendUrl}api/v1/config/llm` : `${apiBackendUrl}/api/v1/config/llm`)
      : null;

    if (externalEndpoint && selectedModel) {
      setLastTriggeredApi({
        url: externalEndpoint,
        payload: { model: selectedModel }
      });
      setShowApiNotification(true);

      // Execute the external API call
      fetch(externalEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedModel })
      }).then(async (res) => {
        const data = await res.json().catch(() => ({}));
        setLastTriggeredApi(prev => prev ? { 
          ...prev, 
          status: res.status,
          response: data 
        } : null);
        // Auto-hide after 10 seconds to allow reading the response
        setTimeout(() => setShowApiNotification(false), 10000);
      }).catch(err => {
        setLastTriggeredApi(prev => prev ? { 
          ...prev, 
          status: 500,
          response: { error: 'Failed to connect to external endpoint', message: err.message } 
        } : null);
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
              <div className="p-6 space-y-6">
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
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Specialized Role</label>
                    <input 
                      type="text" 
                      value={agentRole}
                      onChange={(e) => setAgentRole(e.target.value)}
                      placeholder="e.g. Memory Leak Detector"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Backend System URL (Python)</label>
                    <input 
                      type="text" 
                      value={agentBackendUrl}
                      onChange={(e) => setAgentBackendUrl(e.target.value)}
                      placeholder="https://agent-api.internal.org/analyze"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Avatar / Persona</label>
                    <div className="flex gap-3 pt-1">
                      {['🤖', '🛰️', '💾', '🛡️', '🧠', '🔬'].map(emoji => (
                        <button 
                          key={emoji}
                          onClick={() => setAgentAvatar(emoji)}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl border transition-all ${agentAvatar === emoji ? 'bg-blue-50 border-blue-200 shadow-inner' : 'bg-slate-50 border-slate-100 hover:bg-white hover:border-slate-300'}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
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
                    disabled={!agentName || !agentRole}
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
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Specialized Role</label>
                    <input 
                      type="text" 
                      value={agentRole}
                      onChange={(e) => setAgentRole(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Backend System URL (Python)</label>
                    <input 
                      type="text" 
                      value={agentBackendUrl}
                      onChange={(e) => setAgentBackendUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
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

      {/* Ingest Modal */}
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
          <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center">
             <div className="w-4 h-4 border-2 border-white rotate-45"></div>
          </div>
          <span className="font-bold tracking-tight text-lg uppercase">Sentry.ai</span>
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
            icon={<Cpu size={18} />} 
            label="Agents" 
            active={activeTab === 'agents'} 
            onClick={() => setActiveTab('agents')} 
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
        </nav>

        <div className="p-4 mt-auto border-t border-slate-100 bg-slate-50/50">
          <NavItem 
            icon={<Settings size={18} />} 
            label="Settings" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              {selectedIncident ? `INCIDENT / ${selectedIncident.id}` : activeTab === 'dashboard' ? 'Overview' : activeTab.toUpperCase()}
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
                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-6">
                  <StatCard label="Total Active" value="12" sub="Across 3 Clusters" color="blue" />
                  <StatCard label="Critical" value="03" sub="+1 in last 1hr" color="red" />
                  <StatCard label="Avg. Resolution" value="24m" sub="98th percentile" color="green" />
                  <StatCard label="Agent Coverage" value="94%" sub="12 Hybrid Agents" color="slate" />
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
                          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl shrink-0">
                            {agent.avatar}
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-slate-900">{agent.name} <span className="text-slate-400 font-medium ml-2 text-xs">({agent.role})</span></span>
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
                className="max-w-6xl mx-auto space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Advanced Log Analyzer</h2>
                    <p className="text-sm text-slate-500 font-medium">Cross-reference logs across all active distributed systems.</p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => { setLogStream(''); setAnalysisResult(''); }}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all"
                    >
                      <Terminal size={14} /> Clear Stream
                    </button>
                    <button 
                      onClick={handleAnalyzeLogs}
                      disabled={isAnalyzing || !logStream || !isAnalysisAgentAdded}
                      className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-slate-900/10 disabled:opacity-50"
                      title={!isAnalysisAgentAdded ? "Requires an active agent with /api/v1/analyze endpoint" : ""}
                    >
                      {isAnalyzing ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={14} />} 
                      Analyze Logs
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[700px]">
                  <header className="px-6 py-4 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Aggregated Stream</span>
                      </div>
                      <div className="h-4 w-px bg-slate-700 mx-2"></div>
                      <div className="flex gap-3">
                        {['k8s-prod-1', 'payment-gateway', 'auth-service'].map(s => (
                          <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono flex items-center gap-1.5">
                            <Activity size={10} className="text-blue-400" /> {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                        <input 
                          type="text" 
                          placeholder="grep pattern..." 
                          className="bg-slate-900 border border-slate-700 rounded-lg py-1.5 pl-9 pr-4 text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/30 w-48 text-slate-300"
                        />
                      </div>
                    </div>
                  </header>
                  
                  <div className="flex-1 flex flex-col gap-4 p-4 relative overflow-hidden">
                    <div className="flex-1 relative border border-slate-800 rounded-xl overflow-hidden">
                      <div className="absolute top-3 left-6 text-[9px] font-bold text-slate-600 uppercase tracking-widest z-10">Input: Raw Stream</div>
                      <textarea 
                        value={logStream}
                        onChange={(e) => setLogStream(e.target.value)}
                        spellCheck={false}
                        className="w-full h-full bg-slate-950 overflow-y-auto p-10 pr-6 font-mono text-xs text-slate-300 resize-none focus:outline-none custom-scrollbar selection:bg-blue-500/30 whitespace-pre"
                        placeholder="Paste your logs here for cross-system analysis..."
                      />
                    </div>
                    <div className="flex-1 relative bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                      <div className="absolute top-3 left-6 text-[9px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-2 z-10">
                        {isAnalyzing && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />}
                        Output: Intelligence Report
                      </div>
                      <div className="w-full h-full overflow-y-auto p-10 pr-6 font-mono text-xs text-blue-400/90 whitespace-pre-wrap selection:bg-blue-500/30">
                        {analysisResult || (
                          <div className="text-slate-700 italic">
                            Report will appear here after analysis...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <footer className="px-6 py-3 bg-slate-800 border-t border-slate-700 flex items-center justify-between">
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        <Cpu size={12} className="text-green-500" /> 3 Agents Listening
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        <Activity size={12} className="text-blue-500" /> 1.2k events/min
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">UPTIME: 14:22:04</div>
                  </footer>
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

                <div className="grid grid-cols-3 gap-8">
                  {agents.map(agent => (
                    <div key={agent.id} className={`bg-white border rounded-2xl p-8 transition-all group shadow-sm hover:shadow-md relative overflow-hidden ${agent.isActive ? 'border-slate-200 hover:border-blue-500/50' : 'border-slate-100 opacity-60'}`}>
                      {!agent.isActive && (
                        <div className="absolute top-0 right-0 p-2">
                           <span className="text-[8px] font-black uppercase tracking-tighter bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">DEACTIVATED</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start mb-6">
                        <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center text-3xl group-hover:scale-110 transition-transform ${agent.isActive ? 'bg-slate-50 border-slate-100' : 'bg-slate-100 border-slate-200'}`}>
                          {agent.avatar}
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
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mt-1 mb-2">{agent.role}</p>
                      
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

                      <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${agent.isActive ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {agent.isActive ? agent.status : 'Inactive'}
                          </span>
                        </div>
                        <button 
                          disabled={!agent.isActive}
                          className="px-4 py-2 border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-600 disabled:hover:border-slate-200"
                        >
                          Diagnostics
                        </button>
                      </div>
                    </div>
                  ))}
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
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all disabled:opacity-50"
                  >
                    <Save size={16} className={isSaving ? 'animate-pulse' : ''} />
                    {isSaving ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>

                <AnimatePresence>
                  {showApiNotification && lastTriggeredApi && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-slate-900 text-white rounded-xl shadow-xl border border-slate-700">
                        <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Activity size={14} className="text-blue-400" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">External API Triggered</span>
                          </div>
                          <button onClick={() => setShowApiNotification(false)} className="text-slate-400 hover:text-white">
                            <X size={14} />
                          </button>
                        </div>
                        <div className="p-4 font-mono text-[10px] space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[9px]">
                            <div>
                              <div className="text-slate-500 mb-1 font-bold uppercase tracking-tight text-[8px]">Method & Endpoint</div>
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 bg-blue-500 text-white rounded text-[8px] font-bold">POST</span>
                                <span className="text-blue-300 break-all">{lastTriggeredApi.url}</span>
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-500 mb-1 font-bold uppercase tracking-tight text-[8px]">JSON Payload</div>
                              <div className="bg-black/30 p-2 rounded border border-slate-800 text-green-400 overflow-x-auto font-mono">
                                {JSON.stringify(lastTriggeredApi.payload, null, 2)}
                              </div>
                            </div>
                          </div>

                          {lastTriggeredApi.response && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="border-t border-slate-800/50 pt-3"
                            >
                              <div className="text-slate-500 mb-1 font-bold uppercase tracking-tight text-[8px] flex items-center justify-between">
                                <span>Response Body</span>
                                {lastTriggeredApi.status && (
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${lastTriggeredApi.status >= 200 && lastTriggeredApi.status < 300 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    STATUS: {lastTriggeredApi.status}
                                  </span>
                                )}
                              </div>
                              <div className="bg-black/40 p-3 rounded border border-slate-800 text-cyan-400 overflow-x-auto font-mono max-h-48 overflow-y-auto custom-scrollbar leading-relaxed">
                                {JSON.stringify(lastTriggeredApi.response, null, 2)}
                              </div>
                            </motion.div>
                          )}

                          <div>
                            <div className="text-slate-500 mb-1 font-bold uppercase tracking-tight text-[8px] flex justify-between items-center">
                              <span>CURL Command</span>
                              <button 
                                onClick={() => {
                                  const curl = `curl -X POST "${lastTriggeredApi.url}" -H "Content-Type: application/json" -d '${JSON.stringify(lastTriggeredApi.payload)}'`;
                                  navigator.clipboard.writeText(curl);
                                }}
                                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                              >
                                <Save size={10} /> Copy
                              </button>
                            </div>
                            <div className="bg-black/30 p-3 rounded border border-slate-800 text-amber-400 overflow-x-auto font-mono leading-relaxed group relative">
                              <code className="whitespace-pre">{`curl -X POST "${lastTriggeredApi.url}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(lastTriggeredApi.payload)}'`}</code>
                            </div>
                            {(lastTriggeredApi.url.includes('localhost') || lastTriggeredApi.url.includes('127.0.0.1')) && (
                              <div className="mt-2 text-[8px] text-amber-500/80 italic flex items-center gap-1">
                                <Activity size={10} /> Note: Browser may block requests to localhost due to CORS/Mixed Content.
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="px-4 py-1.5 bg-blue-600/10 text-blue-400 text-[9px] font-medium text-center border-t border-blue-500/20">
                          This call was initiated by the backend server after configuration persistence.
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

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
                      onChange={(e) => setApiBackendUrl(e.target.value)}
                      placeholder="https://api.your-backend.com/v1"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                    <p className="text-[11px] text-slate-400 font-medium">
                      The base URL for the LLM inference server or proxy (e.g., OpenRouter base or your custom agent gateway).
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
                   <div key={agent.id} className="w-10 h-10 rounded-full border-4 border-white bg-slate-50 flex items-center justify-center text-lg shadow-sm" title={agent.name}>
                     {agent.avatar}
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
                       <span className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-base border border-slate-100">{agent.avatar}</span> {agent.name}
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

