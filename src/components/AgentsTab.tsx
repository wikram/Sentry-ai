/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Plus, Cpu, Settings, Power, PowerOff, Trash2, ExternalLink } from 'lucide-react';
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
  return (
    <motion.div 
      key="agents"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="max-w-6xl mx-auto space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">AI Diagnostic Agents</h2>
            {isFetchingAgents && (
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
            )}
          </div>
          <p className="text-sm text-slate-500">Autonomous agents specializing in root cause analysis.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowAddAgent(true)}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-slate-900/10"
          >
            <Plus size={16} /> Deploy New Agent
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {isFetchingAgents && agents.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
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
        ) : agents.map((agent, idx) => (
          <div 
            key={agent.id ? `agent-${agent.id}` : `agent-idx-${idx}`} 
            className={`bg-white border rounded-2xl p-8 transition-all group shadow-sm hover:shadow-md relative overflow-hidden ${agent.isActive ? 'border-slate-200 hover:border-blue-500/50' : 'border-slate-100 opacity-60'}`}
          >
            {!agent.isActive && (
              <div className="absolute top-0 right-0 p-2">
                 <span className="text-[8px] font-black uppercase tracking-tighter bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">DEACTIVATED</span>
              </div>
            )}
            
            <div className="flex justify-between items-start mb-6">
              <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center text-3xl group-hover:scale-110 transition-transform ${agent.isActive ? 'bg-slate-50 border-slate-100' : 'bg-slate-100 border-slate-200'}`}>
                <Cpu size={32} className={agent.isActive ? 'text-blue-500' : 'text-slate-400'} />
              </div>
              <div className="flex flex-col items-end gap-2">
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
                <input 
                  type="text" 
                  readOnly 
                  value={`Agent id : ${agent.id || idx + 1}`} 
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-mono text-slate-500 max-w-[140px] text-right focus:outline-none"
                  id={`agent-id-box-${agent.id || idx}`}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
              </div>
            </div>

            <h3 className="font-bold text-xl tracking-tight text-slate-900">{agent.name || `Agent ${agent.id || idx + 1}`}</h3>
            
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
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${(agent.isDefault || agent.is_primary) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  {(agent.isDefault || agent.is_primary) ? 'Primary' : 'Set Primary'}
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
  );
}
