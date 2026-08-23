/**
 * Copyright 2026 Google LLC
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Server, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Filter, 
  Terminal, 
  ShieldCheck, 
  Check, 
  Globe, 
  Cpu, 
  HardDrive,
  Activity,
  ArrowUpDown,
  ExternalLink
} from 'lucide-react';

export interface HostNode {
  id: string;
  hostname: string;
  ip: string;
  os: string;
  provider: string;
  environment: 'production' | 'staging' | 'development' | 'edge';
  status: 'synced' | 'drifted' | 'unreachable';
  activePlaybook: string;
  lastApplied: string;
  driftDetails?: string[];
  cpuUsage?: number;
  memoryUsage?: number;
}

export const INITIAL_NODES: HostNode[] = [
  {
    id: 'node-01',
    hostname: 'k8s-control-plane-01.prod.internal',
    ip: '10.240.0.12',
    os: 'Ubuntu 22.04 LTS (Jammy)',
    provider: 'GCP us-central1-a',
    environment: 'production',
    status: 'synced',
    activePlaybook: 'k8s-cluster-baseline.yml',
    lastApplied: '12 mins ago',
    cpuUsage: 34,
    memoryUsage: 62
  },
  {
    id: 'node-02',
    hostname: 'k8s-worker-gpu-04.prod.internal',
    ip: '10.240.1.44',
    os: 'Ubuntu 22.04 LTS (Jammy)',
    provider: 'GCP us-central1-b',
    environment: 'production',
    status: 'drifted',
    activePlaybook: 'nvidia-k8s-driver.yml',
    lastApplied: '3 hours ago',
    cpuUsage: 78,
    memoryUsage: 89,
    driftDetails: [
      'Nvidia container toolkit version mismatch (Expected: 1.14.0, Found: 1.13.2)',
      'sysctl: vm.max_map_count set to 65530 (Expected: 262144)',
      'sshd_config: PermitRootLogin set to yes (Expected: no)'
    ]
  },
  {
    id: 'node-03',
    hostname: 'api-gateway-edge-01.prod.internal',
    ip: '35.201.12.89',
    os: 'Debian 12 (Bookworm)',
    provider: 'AWS us-east-1',
    environment: 'production',
    status: 'synced',
    activePlaybook: 'nginx-hardened-edge.yml',
    lastApplied: '45 mins ago',
    cpuUsage: 22,
    memoryUsage: 41
  },
  {
    id: 'node-04',
    hostname: 'db-postgres-primary.prod.internal',
    ip: '10.240.4.10',
    os: 'RHEL 9.2 (Plow)',
    provider: 'GCP us-central1-c',
    environment: 'production',
    status: 'synced',
    activePlaybook: 'postgres-ha-cluster.yml',
    lastApplied: '1 hour ago',
    cpuUsage: 45,
    memoryUsage: 71
  },
  {
    id: 'node-05',
    hostname: 'stage-app-worker-01.internal',
    ip: '10.242.0.8',
    os: 'Ubuntu 22.04 LTS (Jammy)',
    provider: 'GCP us-west1-b',
    environment: 'staging',
    status: 'drifted',
    activePlaybook: 'app-runtime-base.yml',
    lastApplied: '18 hours ago',
    cpuUsage: 19,
    memoryUsage: 38,
    driftDetails: [
      'Docker daemon configuration modified manually without Ansible tags',
      'Systemd service cron-backup.service is inactive (Expected: active/running)'
    ]
  },
  {
    id: 'node-06',
    hostname: 'edge-gateway-eu-central.internal',
    ip: '185.190.22.4',
    os: 'Debian 12 (Bookworm)',
    provider: 'Hetzner fsn1-dc14',
    environment: 'edge',
    status: 'synced',
    activePlaybook: 'wireguard-edge-mesh.yml',
    lastApplied: '6 hours ago',
    cpuUsage: 14,
    memoryUsage: 29
  },
  {
    id: 'node-07',
    hostname: 'dev-sandbox-runner-02.internal',
    ip: '10.250.2.19',
    os: 'Fedora CoreOS 39',
    provider: 'GCP us-east4-a',
    environment: 'development',
    status: 'synced',
    activePlaybook: 'dev-tools-ci.yml',
    lastApplied: '1 day ago',
    cpuUsage: 51,
    memoryUsage: 56
  }
];

export default function HostInventoryPage() {
  const [nodes, setNodes] = useState<HostNode[]>(INITIAL_NODES);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEnv, setFilterEnv] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isScanningDrift, setIsScanningDrift] = useState(false);
  const [isEnforcingState, setIsEnforcingState] = useState(false);
  const [selectedNodeForDiff, setSelectedNodeForDiff] = useState<HostNode | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRunDriftScan = () => {
    setIsScanningDrift(true);
    setTimeout(() => {
      setIsScanningDrift(false);
      showNotification('Fleet configuration scan completed: 2 host drifts detected across 7 nodes.');
    }, 1800);
  };

  const handleEnforceAllState = () => {
    setIsEnforcingState(true);
    setTimeout(() => {
      setNodes(prev => prev.map(n => ({ ...n, status: 'synced', driftDetails: undefined, lastApplied: 'Just now' })));
      setIsEnforcingState(false);
      setSelectedNodeForDiff(null);
      showNotification('Desired configuration state successfully enforced on all fleet nodes.');
    }, 2200);
  };

  const handleEnforceSingleNode = (node: HostNode) => {
    setNodes(prev => prev.map(n => n.id === node.id ? { ...n, status: 'synced', driftDetails: undefined, lastApplied: 'Just now' } : n));
    setSelectedNodeForDiff(null);
    showNotification(`Desired configuration state applied to ${node.hostname}`);
  };

  const filteredNodes = nodes.filter(n => {
    const matchesSearch = n.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          n.ip.includes(searchQuery) ||
                          n.activePlaybook.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          n.provider.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEnv = filterEnv === 'all' || n.environment === filterEnv;
    const matchesStatus = filterStatus === 'all' || n.status === filterStatus;
    return matchesSearch && matchesEnv && matchesStatus;
  });

  const syncedCount = nodes.filter(n => n.status === 'synced').length;
  const driftedCount = nodes.filter(n => n.status === 'drifted').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 right-8 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs font-bold"
          >
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
              <Server size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                  Configuration Management
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400">Inventory &bull; Drift Detection</span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">Host Inventory & Drift Management</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Real-time desired state enforcement, configuration drift inspection, and continuous node telemetry across cloud fleets.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleRunDriftScan}
              disabled={isScanningDrift}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-200 disabled:opacity-50"
            >
              <RefreshCw size={14} className={isScanningDrift ? 'animate-spin text-indigo-600' : ''} />
              <span>{isScanningDrift ? 'Scanning Drift...' : 'Scan Fleet Drift'}</span>
            </button>
            <button
              onClick={handleEnforceAllState}
              disabled={isEnforcingState || driftedCount === 0}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50"
            >
              <Play size={14} />
              <span>{isEnforcingState ? 'Enforcing...' : 'Enforce Desired State'}</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Managed Hosts</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{nodes.length}</div>
            <span className="text-[11px] font-medium text-slate-500">4 Cloud Regions</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">In-Sync Status</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-600">{syncedCount}</span>
              <span className="text-xs text-slate-400 font-bold">/ {nodes.length}</span>
            </div>
            <span className="text-[11px] font-medium text-emerald-600 font-mono">{((syncedCount / nodes.length) * 100).toFixed(0)}% In Sync</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Drifted Hosts</span>
            <div className={`text-2xl font-black mt-1 ${driftedCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{driftedCount}</div>
            <span className="text-[11px] font-medium text-amber-600 font-mono">Requires Remediation</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inventory Health</span>
            <div className="text-2xl font-black text-indigo-600 mt-1">100%</div>
            <span className="text-[11px] font-medium text-slate-500 font-mono">All Agents Reachable</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hostname, IP, provider, playbook..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <select
            value={filterEnv}
            onChange={(e) => setFilterEnv(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="all">All Environments</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
            <option value="edge">Edge</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="synced">In Sync</option>
            <option value="drifted">Drift Detected</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          Showing {filteredNodes.length} of {nodes.length} hosts
        </div>
      </div>

      {/* Nodes Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Hostname & IP</th>
                <th className="py-3.5 px-4">Environment</th>
                <th className="py-3.5 px-4">OS & Provider</th>
                <th className="py-3.5 px-4">Active Playbook</th>
                <th className="py-3.5 px-4">CPU / RAM</th>
                <th className="py-3.5 px-4">Sync Status</th>
                <th className="py-3.5 px-4">Last Applied</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredNodes.map((node) => (
                <tr key={node.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 font-mono text-xs">{node.hostname}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{node.ip}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      node.environment === 'production' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                      node.environment === 'staging' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                      node.environment === 'edge' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                      'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {node.environment}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-slate-800 font-semibold">{node.os}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{node.provider}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-indigo-600 font-bold bg-indigo-50/70 px-2 py-0.5 rounded border border-indigo-100">
                      {node.activePlaybook}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600">
                      <span>{node.cpuUsage}% CPU</span>
                      <span className="text-slate-300">|</span>
                      <span>{node.memoryUsage}% RAM</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {node.status === 'synced' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-bold border border-emerald-200">
                        <CheckCircle2 size={12} />
                        In Sync
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-[11px] font-bold border border-amber-200 animate-pulse">
                        <AlertTriangle size={12} />
                        Drift Detected
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                    {node.lastApplied}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {node.status === 'drifted' ? (
                      <button
                        onClick={() => setSelectedNodeForDiff(node)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                      >
                        Inspect Drift
                      </button>
                    ) : (
                      <button
                        onClick={() => showNotification(`Verified SSH & Ansible Ping to ${node.hostname} (${node.ip}): 2.1ms roundtrip.`)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                      >
                        Test Ping
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drift Inspection Modal */}
      <AnimatePresence>
        {selectedNodeForDiff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNodeForDiff(null)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 bg-amber-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Configuration Drift Detected</h3>
                    <p className="text-xs font-mono text-slate-500">{selectedNodeForDiff.hostname} ({selectedNodeForDiff.ip})</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNodeForDiff(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
                >
                  &times;
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Drift Discrepancies</h4>
                  <div className="space-y-2">
                    {(selectedNodeForDiff.driftDetails || []).map((detail, idx) => (
                      <div key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-medium text-amber-900 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Playbook Target Command</h4>
                  <div className="p-4 bg-slate-900 text-slate-200 font-mono text-xs rounded-xl overflow-x-auto">
                    <span className="text-indigo-400 font-bold">ansible-playbook</span> -i inventory/prod.yml playbooks/{selectedNodeForDiff.activePlaybook} --limit {selectedNodeForDiff.hostname}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setSelectedNodeForDiff(null)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  onClick={() => handleEnforceSingleNode(selectedNodeForDiff)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  <Play size={14} />
                  <span>Enforce Fix on {selectedNodeForDiff.hostname}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
