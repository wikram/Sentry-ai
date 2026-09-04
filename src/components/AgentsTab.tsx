/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Cpu, 
  Settings, 
  Power, 
  PowerOff, 
  Trash2, 
  ExternalLink, 
  CheckCircle2, 
  Activity, 
  ShieldCheck, 
  Layers, 
  Terminal, 
  ArrowLeft, 
  Server, 
  Sparkles,
  Key
} from 'lucide-react';
import { RCAAgent } from '../types';

interface AgentsTabProps {
  agents: RCAAgent[];
  isFetchingAgents: boolean;
  setShowAddAgent: (val: boolean) => void;
  openAgentConfig: (agent: RCAAgent) => void;
  toggleAgent: (id: string) => void;
  deleteAgent: (id: string) => void;
  handleSetDefaultAgent: (id: string) => void;
  handleCheckDiagnostics: (agent: RCAAgent) => void;
  diagnosticsMap: Record<string, { status: string; timestamp?: string; loading: boolean }>;
}

export default function AgentsTab({
  agents,
  isFetchingAgents,
  setShowAddAgent,
  openAgentConfig,
  toggleAgent,
  deleteAgent,
  handleSetDefaultAgent,
  handleCheckDiagnostics,
  diagnosticsMap,
}: AgentsTabProps) {
  const [selectedAgentTab, setSelectedAgentTab] = useState<string>('all');

  // If currently selected agent tab was deleted, fallback to 'all'
  const activeAgent = selectedAgentTab !== 'all' ? agents.find(a => a.id === selectedAgentTab) : null;
  const currentTab = activeAgent ? selectedAgentTab : 'all';

  return (
    <motion.div 
      key="agents"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="max-w-6xl mx-auto space-y-6"
    >
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">AI Diagnostic Agents</h2>
            {isFetchingAgents && (
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
            )}
            <span className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-600 rounded-full">
              {agents.length} {agents.length === 1 ? 'Agent' : 'Agents'} Active
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Autonomous multi-agent cluster specializing in distributed system root cause analysis.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowAddAgent(true)}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all"
            id="btn-deploy-agent"
          >
            <Plus size={16} /> Deploy New Agent
          </button>
        </div>
      </div>

      {/* Agent Selector / Navigation Tabs */}
      {agents.length > 0 && (
        <div className="flex items-center gap-1.5 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setSelectedAgentTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center gap-2 shrink-0 ${
              currentTab === 'all'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            id="tab-all-agents"
          >
            <Layers size={14} />
            <span>All Agents</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              currentTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {agents.length}
            </span>
          </button>

          {agents.map((agent, idx) => {
            const isSelected = currentTab === agent.id;
            const isPrimary = agent.isDefault === true || agent.is_primary === true;
            const isActive = agent.isActive === true;
            return (
              <button
                key={agent.id ? `nav-agent-${agent.id}` : `nav-agent-idx-${idx}`}
                onClick={() => setSelectedAgentTab(agent.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center gap-2.5 shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                id={`tab-agent-${agent.id || idx}`}
              >
                <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                <span className="truncate max-w-[140px]">{agent.name || `Agent ${agent.id || idx + 1}`}</span>
                {isPrimary && (
                  <span className={`text-[9px] px-1.5 py-0.2 font-black uppercase tracking-wider rounded ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                  }`}>
                    Primary
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {currentTab === 'all' ? (
          /* Grid View: All Agents */
          <motion.div
            key="view-all-agents"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isFetchingAgents && agents.length === 0 ? (
                <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
                  <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Loading Autonomous Agents...</p>
                </div>
              ) : agents.length === 0 ? (
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
              ) : (
                agents.map((agent, idx) => (
                  <div 
                    key={agent.id ? `agent-${agent.id}` : `agent-idx-${idx}`} 
                    onClick={() => setSelectedAgentTab(agent.id)}
                    className={`bg-white border rounded-2xl p-6 transition-all group shadow-sm hover:shadow-md relative overflow-hidden cursor-pointer flex flex-col justify-between ${
                      agent.isActive ? 'border-slate-200 hover:border-blue-500/50' : 'border-slate-100 opacity-70'
                    }`}
                  >
                    <div>
                      {/* Top Bar */}
                      <div className="flex justify-between items-start mb-5">
                        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center group-hover:scale-105 transition-transform ${
                          agent.isActive ? 'bg-slate-50 border-slate-100 text-blue-600' : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}>
                          <Cpu size={28} />
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => openAgentConfig(agent)}
                              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Configure"
                            >
                              <Settings size={16} />
                            </button>
                            <button 
                              onClick={() => toggleAgent(agent.id)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                agent.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                              }`}
                              title={agent.isActive ? "Deactivate" : "Activate"}
                            >
                              {agent.isActive ? <Power size={16} /> : <PowerOff size={16} />}
                            </button>
                            <button 
                              onClick={() => deleteAgent(agent.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[10px] font-mono text-slate-500 font-bold">
                            ID: {agent.id || idx + 1}
                          </span>
                        </div>
                      </div>

                      {/* Agent Title & Status */}
                      <div className="space-y-1 mb-4">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg tracking-tight text-slate-900 truncate">
                            {agent.name || `Agent ${agent.id || idx + 1}`}
                          </h3>
                          {(agent.isDefault === true || agent.is_primary === true) && (
                            <span className="text-[9px] px-2 py-0.5 font-black uppercase tracking-wider rounded bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          Model: <span className="font-mono text-slate-700">{agent.model || 'google/gemini-2.5-flash'}</span>
                        </p>
                      </div>

                      {/* Connection URL */}
                      {agent.backendUrl && (
                        <div className="mb-4 flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] text-slate-500 font-mono overflow-hidden whitespace-nowrap text-ellipsis">
                          <ExternalLink size={12} className="text-blue-500 shrink-0" />
                          <span className="truncate">{agent.backendUrl}</span>
                        </div>
                      )}

                      {/* Capabilities */}
                      <div className="space-y-2 mb-6">
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Capabilities</div>
                        <div className="flex flex-wrap gap-1.5">
                          {['Log Profiling', 'Anomaly Detection', 'Root Cause Engine'].map(cap => (
                            <span key={cap} className="text-[10px] px-2 py-0.5 rounded bg-slate-50 border border-slate-100 text-slate-600 font-medium">
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className={`w-2 h-2 rounded-full ${agent.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                          {agent.isActive ? (diagnosticsMap[agent.id]?.status || agent.status || 'idle') : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button 
                          onClick={() => handleSetDefaultAgent(agent.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                            (agent.isDefault === true || agent.is_primary === true) 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {(agent.isDefault === true || agent.is_primary === true) ? 'Primary' : 'Make Primary'}
                        </button>
                        <button 
                          disabled={!agent.isActive || !agent.backendUrl || diagnosticsMap[agent.id]?.loading}
                          onClick={() => handleCheckDiagnostics(agent)}
                          className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-700 flex items-center gap-1"
                        >
                          {diagnosticsMap[agent.id]?.loading && (
                            <div className="w-2 h-2 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                          )}
                          Diagnostics
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        ) : activeAgent ? (
          /* Focused View: Dedicated Individual Agent Tab */
          <motion.div
            key={`agent-tab-detail-${activeAgent.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Top Toolbar for this Agent */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedAgentTab('all')}
                  className="p-2 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
                  title="Back to All Agents"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 ${
                  activeAgent.isActive ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-slate-100 border-slate-200 text-slate-400'
                }`}>
                  <Cpu size={30} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                      {activeAgent.name || `Agent ${activeAgent.id}`}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      activeAgent.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {activeAgent.isActive ? 'Operational' : 'Deactivated'}
                    </span>
                    {(activeAgent.isDefault === true || activeAgent.is_primary === true) && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                        Primary Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    System Identifier: agent-{activeAgent.id} • Registered Cluster Node
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  onClick={() => handleSetDefaultAgent(activeAgent.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    (activeAgent.isDefault === true || activeAgent.is_primary === true)
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {(activeAgent.isDefault === true || activeAgent.is_primary === true) ? 'Default Agent' : 'Set as Default'}
                </button>
                <button
                  onClick={() => toggleAgent(activeAgent.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    activeAgent.isActive
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {activeAgent.isActive ? <PowerOff size={14} /> : <Power size={14} />}
                  <span>{activeAgent.isActive ? 'Deactivate' : 'Activate'}</span>
                </button>
                <button
                  onClick={() => openAgentConfig(activeAgent)}
                  className="px-3 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
                >
                  <Settings size={14} />
                  <span>Configure</span>
                </button>
                <button
                  disabled={!activeAgent.isActive || !activeAgent.backendUrl || diagnosticsMap[activeAgent.id]?.loading}
                  onClick={() => handleCheckDiagnostics(activeAgent)}
                  className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-slate-900/10 transition-all disabled:opacity-40"
                >
                  {diagnosticsMap[activeAgent.id]?.loading ? (
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Activity size={14} />
                  )}
                  <span>Run Diagnostics</span>
                </button>
                <button
                  onClick={() => {
                    deleteAgent(activeAgent.id);
                    setSelectedAgentTab('all');
                  }}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  title="Delete Agent"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Grid of details for this Agent */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Intelligence Engine */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Sparkles size={16} className="text-amber-500" />
                  <span>Intelligence Model</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active LLM</span>
                    <p className="font-mono text-xs font-bold text-slate-800 mt-0.5">
                      {activeAgent.model || 'google/gemini-2.5-flash'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Temperature</span>
                    <p className="font-mono text-xs text-slate-700 mt-0.5">0.2 (Deterministic Diagnostic)</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Authentication Key</span>
                    <p className="text-xs font-mono text-slate-600 mt-0.5 flex items-center gap-1.5">
                      <Key size={12} className="text-slate-400" />
                      <span>{activeAgent.apiKey ? '••••••••••••••••' : 'Default Platform Credentials'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 2: Gateway & Connection */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Server size={16} className="text-blue-500" />
                  <span>Connection Gateway</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Endpoint URL</span>
                    <p className="font-mono text-xs text-slate-800 break-all mt-0.5">
                      {activeAgent.backendUrl || 'Embedded Gateway Proxy (/api/*)'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cluster State</span>
                    <p className="text-xs font-medium text-slate-700 mt-0.5 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${activeAgent.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span>{activeAgent.isActive ? 'Connected & Ready' : 'Deactivated'}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Last Health Probe</span>
                    <p className="font-mono text-xs text-slate-600 mt-0.5">
                      {diagnosticsMap[activeAgent.id]?.timestamp || 'Available on demand'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 3: Assigned Capabilities */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  <span>Diagnostic Capabilities</span>
                </div>
                <div className="space-y-2">
                  {[
                    'Deep Log Stream Token Profiling',
                    'Distributed Anomaly & Outlier Detection',
                    'Automated Root Cause Synthesis',
                    'Heuristic Jenkins / CI Pipeline Auditing',
                    'Incident Timeline Reconciliation'
                  ].map((cap) => (
                    <div key={cap} className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Diagnostic Console Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Terminal size={16} className="text-blue-400" />
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-200 font-bold">
                    Autonomous Diagnostic Console — Agent #{activeAgent.id}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>TELEMETRY LIVE</span>
                </div>
              </div>

              <div className="p-6 font-mono text-xs text-slate-300 space-y-2">
                <p className="text-slate-500">// Diagnostic Telemetry Feed for {activeAgent.name}</p>
                <p className="text-blue-400">
                  [{new Date().toISOString()}] Agent &quot;{activeAgent.name}&quot; (ID: {activeAgent.id}) initialized.
                </p>
                <p className="text-slate-300">
                  Model configuration verified: {activeAgent.model || 'google/gemini-2.5-flash'} (precision: high).
                </p>
                <p className="text-slate-400">
                  Backend target: {activeAgent.backendUrl || 'Local Gateway Proxy'}.
                </p>
                {diagnosticsMap[activeAgent.id] && (
                  <p className="text-emerald-400">
                    Latest probe result: {diagnosticsMap[activeAgent.id].status} ({diagnosticsMap[activeAgent.id].timestamp || 'just now'})
                  </p>
                )}
                <p className="text-slate-500">// Standby mode. Ready to receive log stream payloads from Log Analyzer.</p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
