/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Plus, Save, Cpu, Activity, Terminal } from 'lucide-react';
import { RCAAgent, Incident } from '../types';
import { MOCK_INCIDENTS } from '../mockData';
import { StatCard, IncidentRow, EntityItem } from './Common';

interface DashboardTabProps {
  agents: RCAAgent[];
  sources: any[];
  isSaving: boolean;
  setShowAddAgent: (val: boolean) => void;
  handleSaveToXml: () => void;
  setActiveTab: (tab: 'dashboard' | 'history' | 'log-analyzer' | 'agents' | 'data-sources' | 'integrations' | 'models' | 'settings') => void;
  setSelectedIncident: (incident: Incident | null) => void;
}

export default function DashboardTab({
  agents,
  sources,
  isSaving,
  setShowAddAgent,
  handleSaveToXml,
  setActiveTab,
  setSelectedIncident,
}: DashboardTabProps) {
  return (
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
  );
}
