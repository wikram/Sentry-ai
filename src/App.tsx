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
  LogOut,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Incident, RCAAgent } from './types';
import { MOCK_INCIDENTS } from './mockData';
import { formatDateTime, formatShortDateTime } from './lib/dateUtils';

import Login from './components/Login';
import IncidentDetailView from './components/IncidentDetailView';
import DashboardTab from './components/DashboardTab';
import UserDropdownMenu from './components/UserDropdownMenu';
import LogAnalyzerTab from './components/LogAnalyzerTab';
import HistoryTab from './components/HistoryTab';
import AgentsTab from './components/AgentsTab';
import DataSourcesTab from './components/DataSourcesTab';
import IntegrationsTab from './components/IntegrationsTab';
import ModelsTab from './components/ModelsTab';
import SettingsTab from './components/SettingsTab';
import { NavItem } from './components/Common';

// Provision to configure backend system URL via environment variable
const CONFIGURED_BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || "";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('sentry_is_authenticated') === 'true';
  });
  const [user, setUser] = useState<{ email: string } | null>(() => {
    const saved = localStorage.getItem('sentry_authenticated_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return null;
  });

  const handleSignOut = () => {
    localStorage.removeItem('sentry_is_authenticated');
    localStorage.removeItem('sentry_authenticated_user');
    setIsAuthenticated(false);
    setUser(null);
  };
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

  const handleSetDefaultAgent = async (agentId: string) => {
    const targetAgent = agents.find(a => String(a.id).trim() === String(agentId).trim());
    if (!targetAgent) {
      console.error('[handleSetDefaultAgent] Target agent not found with ID:', agentId);
      return;
    }

    const payload = {
      agent_id: targetAgent.id,
      name: targetAgent.name,
      llm_model: targetAgent.model || selectedModel || 'gemini-1.5-flash',
      temperature: targetAgent.temperature || 0.2,
      conn_url: targetAgent.backendUrl || CONFIGURED_BACKEND_URL,
      api_key: targetAgent.apiKey || 'skprj-xxxxxxxx',
      is_primary: true,
      is_active: targetAgent.isActive !== false
    };

    console.log('[handleSetDefaultAgent] Calling /api/updateagent with payload:', payload);

    try {
      const response = await fetch('/api/updateagent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        console.error('Failed to update agent to primary on backend:', errJson.error || `Status ${response.status}`);
        alert('Failed to set primary agent on backend: ' + (errJson.error || `Status ${response.status}`));
        return;
      }

      console.log('[handleSetDefaultAgent] Successfully updated agent to primary. Executing GET /api/llm-model...');
      
      const modelResponse = await fetch('/api/llm-model');
      if (modelResponse.ok) {
        const modelData = await modelResponse.json();
        console.log('[handleSetDefaultAgent] GET /api/llm-model response:', modelData);
        processLlmModelResponse(modelData);
      } else {
        console.error('[handleSetDefaultAgent] GET /api/llm-model call failed with status:', modelResponse.status);
      }

      // Update local state if successful
      setAgents(agents.map(a => ({
        ...a,
        isDefault: a.id === agentId
      })));

    } catch (err) {
      console.error('[handleSetDefaultAgent] Network error:', err);
      alert('Network error setting primary agent: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleCheckDiagnostics = async (agent: RCAAgent) => {
    setDiagnosticsMap(prev => ({
      ...prev,
      [agent.id]: { ...(prev[agent.id] || {}), loading: true, status: 'Checking...' }
    }));

    try {
      const isValidExternal = agent.backendUrl && (agent.backendUrl.startsWith('http://') || agent.backendUrl.startsWith('https://'));
      const targetUrl = isValidExternal ? `${agent.backendUrl.replace(/\/$/, '')}/api/health` : '/api/health';
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
        timestamp: formatDateTime(new Date()),
        success: response.ok
      };

      setDiagnosticsMap(prev => ({
        ...prev,
        [agent.id]: { status: humanStatus, timestamp: formatDateTime(new Date()), loading: false }
      }));
      setDiagnosticsResult(result);
      setShowDiagnosticsModal(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Connection failed';
      const result = {
        agent,
        status: `Offline: ${errorMsg}`,
        details: { error: errorMsg },
        timestamp: formatDateTime(new Date()),
        success: false
      };
      setDiagnosticsMap(prev => ({
        ...prev,
        [agent.id]: { status: `Offline: ${errorMsg}`, timestamp: formatDateTime(new Date()), loading: false }
      }));
      setDiagnosticsResult(result);
      setShowDiagnosticsModal(true);
    }
  };

  const isAnalysisAgentAdded = agents.length > 0;
  const hasActiveAgent = agents.some(a => a.isActive);

  const handleAnalyzeLogs = async () => {
    const defaultAgent = agents.find(a => a.isDefault) || agents.find(a => a.isActive) || agents[0];
    const rawBackend = defaultAgent?.backendUrl || apiBackendUrl || '';
    
    // Check if the configured backend URL is a valid http/https endpoint
    const isValidExternalBackend = rawBackend && (rawBackend.startsWith('http://') || rawBackend.startsWith('https://'));
    const preferredBackend = isValidExternalBackend ? rawBackend.replace(/\/$/, '') : '';

    setIsAnalyzing(true);
    setAnalysisResult('Initializing autonomous analysis engine...');
    
    try {
      // Update status for the primary agent
      if (defaultAgent) {
        setAgents(prev => prev.map(a => a.id === defaultAgent.id ? { ...a, status: 'analyzing' } : a));
      }

      let report = '';

      const activeModel = defaultAgent?.model || selectedModel || 'google/gemini-2.5-flash';
      const activeApiKey = defaultAgent?.apiKey || '';
      const analysisId = `ANL-${Date.now()}`;
      const analysisTimestamp = new Date().toISOString();

      // 1. Handle File Upload if in file mode
      if (isFileInputMode && selectedFile) {
        const formData = new FormData();
        formData.append('id', analysisId);
        formData.append('timestamp', analysisTimestamp);
        formData.append('file', selectedFile);
        formData.append('description', description || "Analysis request");
        if (activeModel) formData.append('model', activeModel);
        if (activeApiKey) formData.append('apiKey', activeApiKey);

        const targetUrl = preferredBackend ? `${preferredBackend}/api/analyze-file` : '/api/analyze-file';
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
        const targetUrl = preferredBackend ? `${preferredBackend}/api/analyze` : '/api/analyze';
        const payload = { 
          id: analysisId,
          timestamp: analysisTimestamp,
          logs: logStream, 
          description: description || "System log analysis request",
          model: activeModel,
          apiKey: activeApiKey
        };
        
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
          // Fallback to local server endpoint if external failed
          console.warn('Primary backend endpoint failed, trying local /api/analyze fallback:', err);
          
          let fallbackSuccess = false;
          if (targetUrl !== '/api/analyze') {
            try {
              const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              if (res.ok) {
                const text = await res.text();
                try {
                  const data = JSON.parse(text);
                  report = data.report || data.analysis || (typeof data === 'string' ? data : JSON.stringify(data, null, 2));
                } catch {
                  report = text;
                }
                fallbackSuccess = true;
              }
            } catch (fallbackErr) {
              console.warn('Local /api/analyze fallback failed:', fallbackErr);
            }
          }

          if (!fallbackSuccess) {
            throw new Error(`Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }
      }

      setAnalysisResult(report);
      setAnalysisHistory(prev => [{
        id: analysisId,
        timestamp: analysisTimestamp,
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
  const [isFetchingAgents, setIsFetchingAgents] = useState(false);

  // System Logs States
  const [logs, setLogs] = useState<string>('');
  const [logPath, setLogPath] = useState<string>('');
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [autoRefreshLogs, setAutoRefreshLogs] = useState<boolean>(true);
  const [logFilter, setLogFilter] = useState<string>('');

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || 'No log entries found.');
        setLogPath(data.path || '');
      }
    } catch (err) {
      console.error('Failed to fetch system logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Automated logs refresh effect
  useEffect(() => {
    if (activeTab !== 'settings') return;
    
    fetchLogs();
    
    let interval: NodeJS.Timeout | null = null;
    if (autoRefreshLogs) {
      interval = setInterval(() => {
        fetchLogs();
      }, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, autoRefreshLogs]);

  const fetchLlmModel = async () => {
    try {
      console.log('Executing GET /api/llm-model...');
      const llmModelRes = await fetch('/api/llm-model');
      if (llmModelRes.ok) {
        const llmModelData = await llmModelRes.json();
        console.log('GET /api/llm-model response:', llmModelData);
        processLlmModelResponse(llmModelData);
      } else {
        console.error('GET /api/llm-model failed with status:', llmModelRes.status);
      }
    } catch (llmErr) {
      console.error('Failed to fetch /api/llm-model:', llmErr);
    }
  };

  const fetchAndSetAgents = async () => {
    setIsFetchingAgents(true);

    try {
      const listagentsRes = await fetch('/api/listagents');
      if (listagentsRes.ok) {
        const listagentsData = await listagentsRes.json();
        const fetchedAgents = Array.isArray(listagentsData) ? listagentsData : (listagentsData?.agents || []);
        if (fetchedAgents && fetchedAgents.length > 0) {
          const normalized = fetchedAgents.map((a: any) => {
            const isPrim = a.isDefault === true || a.is_primary === true || String(a.isDefault) === 'true' || String(a.is_primary) === 'true';
            return {
              ...a,
              isDefault: isPrim,
              is_primary: isPrim
            };
          });
          if (!normalized.some((a: any) => a.isDefault)) {
            normalized[0].isDefault = true;
            normalized[0].is_primary = true;
          }
          setAgents(normalized);
        }
      }
    } catch (err) {
      console.error('Failed to load agents from /api/listagents:', err);
    } finally {
      setIsFetchingAgents(false);
    }

    // Execute the /api/llm-model GET call
    await fetchLlmModel();
  };

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
          await fetchAndSetAgents();
        } catch (err) {
          console.error('Failed to load agents on mount:', err);
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

        // Then fetch supported models via backend
        const modelsRes = await fetch('/api/models');
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

  // Fetch agents and active model info when authenticated after login
  useEffect(() => {
    if (isAuthenticated) {
      fetchAndSetAgents();
      fetchLlmModel();
    }
  }, [isAuthenticated]);

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
  const [agentIsActive, setAgentIsActive] = useState(true);
  const [primaryAgentStatusText, setPrimaryAgentStatusText] = useState<string>('');
  const [configName, setConfigName] = useState('');
  const [configUrl, setConfigUrl] = useState('');
  const [configUser, setConfigUser] = useState('');
  const [configKey, setConfigKey] = useState('');

  const processLlmModelResponse = (data: any) => {
    if (!data) return;
    let modelVal = '';
    if (typeof data === 'string') {
      modelVal = data.trim();
    } else if (typeof data === 'object') {
      modelVal = String(data.model || data.llm_model || data.selectedModel || data.primary_model || data.primary_agent || data.name || data.agent || '').trim();
    }

    const noPrimaryMsg = "No Primary AI Agent is configured";
    if (data?.message === noPrimaryMsg || modelVal === noPrimaryMsg || !modelVal) {
      setPrimaryAgentStatusText("NO PRIMARY MODEL SET");
    } else {
      setPrimaryAgentStatusText(modelVal);
      setSelectedModel(modelVal);
    }
  };

  const [stayInAddAgent, setStayInAddAgent] = useState(false);

  const handleAddAgent = async () => {
    if (!agentName) return;
    
    const payload = {
      name: agentName,
      llm_model: agentModel || selectedModel || (supportedModels.length > 0 ? supportedModels[0].id : ''),
      temperature: 0.2,
      conn_url: agentBackendUrl,
      api_key: agentApiKey,
      is_primary: agentIsPrimary,
      is_active: false
    };

    let assignedId = '';
    try {
      const response = await fetch('/api/addagent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned status ${response.status}`);
      }
      const data = await response.json();
      console.log('Agent deployment succeeded:', data);
      assignedId = String(data.agent?.id || data.id || '');
      alert(`Agent "${agentName}" successfully deployed to the backend system!`);
    } catch (err) {
      console.error('Failed to register agent with API:', err);
      alert('Failed to deploy agent on backend: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
    
    if (!assignedId) {
      let maxIdNum = 0;
      agents.forEach(a => {
        const idStr = String(a.id || '').replace(/^agent-/, '').trim();
        const num = parseInt(idStr, 10);
        if (!isNaN(num) && num > maxIdNum) {
          maxIdNum = num;
        }
      });
      assignedId = String(maxIdNum + 1);
    }
    
    const newAgent: RCAAgent = {
      id: assignedId,
      name: agentName,
      status: 'idle',
      isActive: false,
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
    
    if (agentIsPrimary) {
      try {
        const llmModelRes = await fetch('/api/llm-model');
        if (llmModelRes.ok) {
          const llmModelData = await llmModelRes.json();
          processLlmModelResponse(llmModelData);
        }
      } catch (llmErr) {
        console.error('Failed to fetch /api/llm-model after adding primary agent:', llmErr);
      }
    }

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

  const deleteAgent = async (id: string | number) => {
    const idStr = String(id).trim();
    console.log('[deleteAgent] Request to delete agent with ID:', idStr);
    
    const targetAgent = agents.find(a => String(a.id).trim() === idStr);
    const agentName = targetAgent ? targetAgent.name : `Agent ${idStr}`;
    
    console.log('[deleteAgent] Found target agent:', targetAgent, 'using name:', agentName);

    try {
      console.log('[deleteAgent] Calling POST /api/deleteagent with:', { agent_id: idStr, name: agentName });
      const response = await fetch('/api/deleteagent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agent_id: idStr,
          name: agentName
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        console.error('Failed to delete agent from backend:', errJson.error || `Status ${response.status}`);
      } else {
        console.log('Successfully deleted agent on backend for ID:', idStr);
      }
    } catch (err) {
      console.error('Network error deleting agent:', err);
    }

    setAgents(agents.filter(a => String(a.id).trim() !== idStr));
  };

  const toggleAgent = async (id: string) => {
    const targetAgent = agents.find(a => a.id === id);
    if (!targetAgent) return;

    const nextActiveState = !targetAgent.isActive;

    try {
      const response = await fetch('/api/updateagent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agent_id: targetAgent.id,
          name: targetAgent.name,
          llm_model: targetAgent.model || '',
          temperature: targetAgent.temperature || 0.2,
          conn_url: targetAgent.backendUrl || '',
          api_key: targetAgent.apiKey || '',
          is_primary: targetAgent.isDefault || false,
          is_active: nextActiveState
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned status ${response.status}`);
      }

      setAgents(agents.map(a => 
        a.id === id ? { ...a, isActive: nextActiveState } : a
      ));
    } catch (err) {
      console.error('Failed to update agent status:', err);
      alert('Failed to update agent status on backend: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleSaveAgentConfig = async () => {
    if (!configuringAgentId) return;

    // Duplicate check: Verify if the URL is already used by another agent (excluding the one being edited)
    if (agentBackendUrl && agents.some(a => a.id !== configuringAgentId && a.backendUrl === agentBackendUrl)) {
      alert('An agent with this Backend URL already exists.');
      return;
    }

    try {
      console.log('[handleSaveAgentConfig] Calling POST /api/updateagent with parameters:', {
        agent_id: configuringAgentId,
        name: agentName,
        llm_model: agentModel,
        temperature: 0.2,
        conn_url: agentBackendUrl,
        api_key: agentApiKey,
        is_primary: agentIsPrimary,
        is_active: agentIsActive
      });

      const response = await fetch('/api/updateagent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agent_id: configuringAgentId,
          name: agentName,
          llm_model: agentModel,
          temperature: 0.2,
          conn_url: agentBackendUrl,
          api_key: agentApiKey,
          is_primary: agentIsPrimary,
          is_active: agentIsActive
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        console.error('Failed to update agent from backend:', errJson.error || `Status ${response.status}`);
        alert('Failed to update agent configuration: ' + (errJson.error || `Server status ${response.status}`));
        return;
      }

      console.log('Successfully updated agent configuration on backend. Fetching /api/llm-model...');

      try {
        const llmModelRes = await fetch('/api/llm-model');
        if (llmModelRes.ok) {
          const llmModelData = await llmModelRes.json();
          processLlmModelResponse(llmModelData);
        }
      } catch (llmErr) {
        console.error('Failed to fetch /api/llm-model after updating agent:', llmErr);
      }

      // Update local state
      setAgents(prevAgents => {
        let updated = prevAgents.map(a => 
          a.id === configuringAgentId 
            ? { 
                ...a, 
                name: agentName, 
                backendUrl: agentBackendUrl, 
                model: agentModel, 
                apiKey: agentApiKey, 
                isDefault: agentIsPrimary,
                isActive: agentIsActive
              } 
            : a
        );

        if (agentIsPrimary) {
          // ensure only this agent is default
          updated = updated.map(a => a.id === configuringAgentId ? a : { ...a, isDefault: false });
        }

        return updated;
      });

      setShowAgentConfigModal(false);
      setConfiguringAgentId(null);
      setAgentName('');
      setAgentModel(selectedModel);
      setAgentBackendUrl(CONFIGURED_BACKEND_URL);
      setAgentApiKey('skprj-xxxxxxxx');
      setAgentIsPrimary(false);
      setAgentIsActive(true);

    } catch (err) {
      console.error('Network error updating agent config:', err);
      alert('Network error updating agent configuration: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const openAgentConfig = (agent: RCAAgent) => {
    setConfiguringAgentId(agent.id);
    setAgentName(agent.name);
    setAgentBackendUrl(agent.backendUrl || CONFIGURED_BACKEND_URL);
    setAgentModel(agent.model || selectedModel);
    setAgentApiKey(agent.apiKey || 'skprj-xxxxxxxx');
    setAgentIsPrimary(!!agent.isDefault);
    setAgentIsActive(agent.isActive !== false);
    setShowAgentConfigModal(true);
  };

  const handleSaveToXml = async () => {
    setIsSaving(true);
    
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
    return (
      <Login 
        onLogin={(loggedInUser) => { 
          localStorage.setItem('sentry_is_authenticated', 'true');
          localStorage.setItem('sentry_authenticated_user', JSON.stringify(loggedInUser));
          setIsAuthenticated(true); 
          setUser(loggedInUser); 
          fetchAndSetAgents();
          fetchLlmModel();
        }} 
      />
    );
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
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Temperature</label>
                    <input 
                      type="text" 
                      value="0.2"
                      disabled={true}
                      readOnly={true}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none cursor-not-allowed font-mono text-slate-500"
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
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">API Key</label>
                    <input 
                      type="text" 
                      value={agentApiKey}
                      onChange={(e) => setAgentApiKey(e.target.value)}
                      placeholder="skprj-xxxxxxxx"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Temperature</label>
                    <input 
                      type="text" 
                      value="0.2"
                      disabled={true}
                      readOnly={true}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none cursor-not-allowed font-mono text-slate-500"
                    />
                  </div>
                  <div className="flex items-center gap-6 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={agentIsPrimary}
                        onChange={(e) => setAgentIsPrimary(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 h-4 w-4"
                      />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Primary Agent</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={agentIsActive}
                        onChange={(e) => setAgentIsActive(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 h-4 w-4"
                      />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active</span>
                    </label>
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
                        <option value="jenkins">Sentry CI/CD / Error Tracking</option>
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
                      placeholder="e.g. Staging Sentry"
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
            label="Models info" 
            active={activeTab === 'models'} 
            onClick={() => setActiveTab('models')} 
          />
          <NavItem 
            icon={<Cpu size={18} />} 
            label="Agents" 
            active={activeTab === 'agents'} 
            onClick={() => {
              setActiveTab('agents');
              fetchAndSetAgents();
            }} 
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
            onClick={handleSignOut} 
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
                  {primaryAgentStatusText === "NO PRIMARY MODEL SET" || primaryAgentStatusText === "NO PRIMARY AGENT SET" || !primaryAgentStatusText ? "NO PRIMARY MODEL SET" : `Primary Model: ${primaryAgentStatusText}`}
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
                title="Ingest Logs / New Incident"
              >
                <Plus size={20} />
              </button>
              <div className="h-6 w-px bg-slate-200"></div>
              {/* User Circular Initials Icon & Jenkins Style Dropdown */}
              <UserDropdownMenu 
                user={user} 
                onSignOut={handleSignOut} 
              />
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
              <DashboardTab
                agents={agents}
                sources={sources}
                isSaving={isSaving}
                setShowAddAgent={setShowAddAgent}
                handleSaveToXml={handleSaveToXml}
                setActiveTab={setActiveTab}
                setSelectedIncident={setSelectedIncident}
              />
            ) : activeTab === 'log-analyzer' ? (
              <LogAnalyzerTab
                logStream={logStream}
                setLogStream={setLogStream}
                description={description}
                setDescription={setDescription}
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
                isFileInputMode={isFileInputMode}
                setIsFileInputMode={setIsFileInputMode}
                isAnalyzing={isAnalyzing}
                analysisResult={analysisResult}
                setAnalysisResult={setAnalysisResult}
                hasActiveAgent={hasActiveAgent}
                agents={agents}
                handleAnalyzeLogs={handleAnalyzeLogs}
              />
            ) : activeTab === 'history' ? (
              <HistoryTab
                analysisHistory={analysisHistory}
                setAnalysisHistory={setAnalysisHistory}
                expandedHistoryId={expandedHistoryId}
                setExpandedHistoryId={setExpandedHistoryId}
              />
            ) : activeTab === 'agents' ? (
              <AgentsTab
                agents={agents}
                isFetchingAgents={isFetchingAgents}
                setShowAddAgent={setShowAddAgent}
                openAgentConfig={openAgentConfig}
                toggleAgent={toggleAgent}
                deleteAgent={deleteAgent}
                handleSetDefaultAgent={handleSetDefaultAgent}
                handleCheckDiagnostics={handleCheckDiagnostics}
                diagnosticsMap={diagnosticsMap}
              />
            ) : activeTab === 'data-sources' ? (
              <DataSourcesTab
                sources={sources}
                failedJenkinsJobs={failedJenkinsJobs}
                isScrapingJenkins={isScrapingJenkins}
                isSaving={isSaving}
                activeMenuId={activeMenuId}
                setActiveMenuId={setActiveMenuId}
                handleScrapeJenkins={handleScrapeJenkins}
                handleSaveToXml={handleSaveToXml}
                setShowAddSource={setShowAddSource}
                setFailedJenkinsJobs={setFailedJenkinsJobs}
                toggleSource={toggleSource}
                openConfig={openConfig}
                deleteSource={deleteSource}
              />
            ) : activeTab === 'integrations' ? (
              <IntegrationsTab />
            ) : activeTab === 'models' ? (
              <ModelsTab
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                supportedModels={supportedModels}
              />
            ) : activeTab === 'settings' ? (
              <SettingsTab
                logPath={logPath}
                logs={logs}
                isLoadingLogs={isLoadingLogs}
                logFilter={logFilter}
                setLogFilter={setLogFilter}
                autoRefreshLogs={autoRefreshLogs}
                setAutoRefreshLogs={setAutoRefreshLogs}
                fetchLogs={fetchLogs}
              />
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
        {formatShortDateTime(incident.createdAt)}
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



