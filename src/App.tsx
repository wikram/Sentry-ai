/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
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
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Incident } from './types';
import { MOCK_INCIDENTS, MOCK_AGENTS, MOCK_SOURCES } from './mockData';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'agents' | 'settings'>('dashboard');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [showIngest, setShowIngest] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configuringSourceId, setConfigingSourceId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [ingestDraft, setIngestDraft] = useState('');
  const [selectedTool, setSelectedTool] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [configName, setConfigName] = useState('');
  const [configUrl, setConfigUrl] = useState('');
  const [configUser, setConfigUser] = useState('');
  const [configKey, setConfigKey] = useState('');

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
      status: 'syncing',
      lastSync: new Date().toISOString(),
      config: {}
    };

    setSources([newSource, ...sources]);
    setShowAddSource(false);
    setSelectedTool('');
    setSourceName('');
  };

  const handleSaveConfig = () => {
    if (!configuringSourceId) return;
    setSources(sources.map(s => 
      s.id === configuringSourceId 
        ? { ...s, name: configName || s.name, config: { ...s.config, url: configUrl, user: configUser, key: configKey } } 
        : s
    ));
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
            <div className="flex gap-2 items-center">
              <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">4 Agents Active</span>
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
                      {MOCK_AGENTS.filter(a => a.status === 'analyzing').map(agent => (
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
            ) : activeTab === 'agents' ? (
              <motion.div 
                key="agents"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="max-w-6xl mx-auto grid grid-cols-3 gap-8"
              >
                {MOCK_AGENTS.map(agent => (
                  <div key={agent.id} className="bg-white border border-slate-200 rounded-2xl p-8 hover:border-blue-500/50 transition-all group shadow-sm hover:shadow-md">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                      {agent.avatar}
                    </div>
                    <h3 className="font-bold text-xl tracking-tight text-slate-900">{agent.name}</h3>
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mt-1 mb-6">{agent.role}</p>
                    <div className="space-y-3">
                       <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Capabilities</div>
                       <div className="flex flex-wrap gap-2">
                         {['Log Profiling', 'Anomaly Detection', 'Trend Analysis'].map(cap => (
                           <span key={cap} className="text-[10px] px-2 py-0.5 rounded bg-slate-50 border border-slate-100 text-slate-500 font-medium">{cap}</span>
                         ))}
                       </div>
                    </div>
                    <button className="w-full mt-8 py-3 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all">
                      View Diagnostics
                    </button>
                  </div>
                ))}
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
                    <h2 className="text-2xl font-bold tracking-tight">Data Sources</h2>
                    <p className="text-sm text-slate-500">Manage your DevOps toolchain integrations for analysis.</p>
                  </div>
                  <button 
                    onClick={() => setShowAddSource(true)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                  >
                    <Plus size={16} /> Add Source
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {sources.map(source => (
                    <div key={source.id} className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-4">
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
                          <span className={`text-xs font-bold ${source.status === 'connected' ? 'text-green-600' : source.status === 'syncing' ? 'text-blue-500' : 'text-red-500'}`}>
                            {source.status.toUpperCase()}
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

                <div className="pt-8">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Available Connectors</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {['Jenkins', 'SonarQube', 'GitLab', 'NewRelic', 'PostgreSQL', 'MySQL', 'Kubernetes', 'Pinecone', 'Weaviate', 'Milvus', 'ChromaDB', 'Jira', 'Slack'].map(item => (
                      <button key={item} className="p-4 bg-slate-100/50 border border-slate-200 rounded-xl text-center hover:bg-white hover:shadow-md transition-all group">
                         <p className="text-xs font-bold text-slate-600 group-hover:text-slate-900">{item}</p>
                      </button>
                    ))}
                  </div>
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

function IncidentRow({ incident, onClick }: { incident: Incident, onClick: () => void }) {
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

function IncidentDetailView({ incident, onClose }: { incident: Incident, onClose: () => void }) {
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
              {incident.logs.map((log, i) => (
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
                 {MOCK_AGENTS.map(agent => (
                   <div key={agent.id} className="w-10 h-10 rounded-full border-4 border-white bg-slate-50 flex items-center justify-center text-lg shadow-sm" title={agent.name}>
                     {agent.avatar}
                   </div>
                 ))}
               </div>
               <div className="text-[11px] text-slate-400 font-medium leading-relaxed italic max-w-xs transition-opacity">Hybrid multi-agent consensus reached after log synthesis from 4 upstream sources.</div>
            </div>
          </div>
        </div>

        {/* Right: Agent Insights & Metadata */}
        <div className="col-span-4 flex flex-col space-y-8 overflow-hidden">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 flex-1 flex flex-col overflow-hidden shadow-sm">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-8">Agent Findings Stream</h3>
            <div className="flex-1 overflow-y-auto space-y-8 pr-2 scrollbar-hide">
               {MOCK_AGENTS.map(agent => (
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
                     {agent.findings.map((f, i) => (
                       <li key={i} className="text-xs text-slate-500 leading-relaxed relative font-medium group">
                         <div className="absolute -left-[28.5px] top-1.5 w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-blue-400 transition-colors" />
                         {f}
                       </li>
                     ))}
                   </ul>
                 </div>
               ))}
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

