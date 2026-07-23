/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  ChevronRight, 
  Clock, 
  Activity, 
  CheckCircle2, 
  ExternalLink, 
  Terminal, 
  AlertTriangle, 
  Cpu 
} from 'lucide-react';
import { Incident, RCAAgent } from '../types';
import { formatDateTime } from '../lib/dateUtils';

interface IncidentDetailViewProps {
  incident: Incident;
  agents: RCAAgent[];
  onClose: () => void;
}

export default function IncidentDetailView({ incident, agents, onClose }: IncidentDetailViewProps) {
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
            <span className="flex items-center gap-2"><Clock size={14} className="text-slate-300" /> Created {formatDateTime(incident.createdAt)}</span>
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
