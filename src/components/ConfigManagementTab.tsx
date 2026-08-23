/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sliders, 
  Server, 
  FileCode, 
  ShieldCheck, 
  Key, 
  Terminal, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Play, 
  Copy, 
  Check, 
  Plus, 
  ArrowRight,
  Eye,
  EyeOff,
  Search,
  History,
  Layers,
  Lock,
  RotateCw,
  GitBranch,
  Filter,
  Zap
} from 'lucide-react';
import AnsibleOrchestrator from './AnsibleOrchestrator';

interface HostNode {
  id: string;
  hostname: string;
  ip: string;
  os: string;
  environment: 'production' | 'staging' | 'development' | 'edge';
  provider: 'AWS' | 'GCP' | 'Azure' | 'Baremetal';
  status: 'synced' | 'drifted' | 'syncing' | 'failed';
  lastApplied: string;
  driftDetails?: string[];
  activePlaybook: string;
}

interface ConfigManifest {
  id: string;
  name: string;
  path: string;
  type: 'ansible' | 'kubernetes' | 'helm' | 'env';
  environment: string;
  lastModified: string;
  author: string;
  content: string;
}

interface SecretItem {
  id: string;
  key: string;
  value: string;
  environment: string;
  scope: string;
  lastRotated: string;
  expiresInDays: number;
  status: 'valid' | 'expiring_soon' | 'expired';
}

const INITIAL_NODES: HostNode[] = [
  {
    id: 'node-01',
    hostname: 'k8s-prod-worker-us-east-1a',
    ip: '10.0.12.44',
    os: 'Ubuntu 22.04 LTS (Jammy)',
    environment: 'production',
    provider: 'AWS',
    status: 'synced',
    lastApplied: '12 mins ago',
    activePlaybook: 'site-k8s-hardening.yml'
  },
  {
    id: 'node-02',
    hostname: 'k8s-prod-worker-us-east-1b',
    ip: '10.0.12.89',
    os: 'Ubuntu 22.04 LTS (Jammy)',
    environment: 'production',
    provider: 'AWS',
    status: 'drifted',
    lastApplied: '3 hours ago',
    driftDetails: [
      'Kernel parameter `net.ipv4.tcp_max_syn_backlog` changed to 1024 (expected 4096)',
      'Security config `/etc/ssh/sshd_config` PermitRootLogin set to yes'
    ],
    activePlaybook: 'site-k8s-hardening.yml'
  },
  {
    id: 'node-03',
    hostname: 'gke-prod-app-pool-01',
    ip: '10.142.0.18',
    os: 'Container-Optimized OS (COS)',
    environment: 'production',
    provider: 'GCP',
    status: 'synced',
    lastApplied: '45 mins ago',
    activePlaybook: 'gcp-container-mesh.yml'
  },
  {
    id: 'node-04',
    hostname: 'stage-api-gateway-01',
    ip: '10.20.4.110',
    os: 'Debian 12 (Bookworm)',
    environment: 'staging',
    provider: 'AWS',
    status: 'synced',
    lastApplied: '1 hour ago',
    activePlaybook: 'nginx-reverse-proxy.yml'
  },
  {
    id: 'node-05',
    hostname: 'edge-gateway-eu-central',
    ip: '192.168.100.12',
    os: 'Rocky Linux 9.3',
    environment: 'edge',
    provider: 'Baremetal',
    status: 'drifted',
    lastApplied: '1 day ago',
    driftDetails: [
      'Firewall iptables rule PORT 8080 missing in INPUT chain',
      'Systemd service `node_exporter` is inactive'
    ],
    activePlaybook: 'edge-baseline.yml'
  }
];

const INITIAL_MANIFESTS: ConfigManifest[] = [
  {
    id: 'man-1',
    name: 'site-k8s-hardening.yml',
    path: 'ansible/playbooks/security/site-k8s-hardening.yml',
    type: 'ansible',
    environment: 'production',
    lastModified: '2026-08-20 14:32',
    author: 'DevOps Sec Team',
    content: `---
- name: Production K8s Cluster Baseline Hardening
  hosts: k8s_workers
  become: yes
  vars:
    sysctl_params:
      net.ipv4.ip_forward: 1
      net.ipv4.tcp_max_syn_backlog: 4096
      net.core.somaxconn: 32768
      vm.max_map_count: 262144
    ssh_port: 22
    permit_root_login: "no"
    password_auth: "no"

  tasks:
    - name: Ensure CIS benchmark sysctl configurations
      ansible.posix.sysctl:
        name: "{{ item.key }}"
        value: "{{ item.value }}"
        state: present
        reload: yes
      loop: "{{ sysctl_params | dict2items }}"

    - name: Enforce SSH Daemon hardened configuration
      ansible.builtin.template:
        src: templates/sshd_config.j2
        dest: /etc/ssh/sshd_config
        owner: root
        group: root
        mode: '0600'
      notify: Restart sshd

    - name: Verify UFW firewall default deny ingress
      community.general.ufw:
        state: enabled
        policy: deny
        direction: incoming`
  },
  {
    id: 'man-2',
    name: 'configmap-cluster-env.yaml',
    path: 'k8s/manifests/base/configmap-cluster-env.yaml',
    type: 'kubernetes',
    environment: 'production',
    lastModified: '2026-08-21 09:15',
    author: 'Platform Lead',
    content: `apiVersion: v1
kind: ConfigMap
metadata:
  name: platform-runtime-config
  namespace: production
  labels:
    app.kubernetes.io/managed-by: devops-suite
    env: production
data:
  APP_ENV: "production"
  LOG_LEVEL: "INFO"
  METRICS_ENABLED: "true"
  DB_POOL_SIZE: "50"
  CACHE_TTL_SECONDS: "3600"
  RATE_LIMIT_BURST: "120"
  RATE_LIMIT_RPS: "30"
  ENABLE_OPENTELEMETRY: "true"`
  },
  {
    id: 'man-3',
    name: 'values-redis-cluster.yaml',
    path: 'helm/charts/redis-ha/values-prod.yaml',
    type: 'helm',
    environment: 'production',
    lastModified: '2026-08-19 18:40',
    author: 'DBA Ops',
    content: `cluster:
  enabled: true
  nodes: 6
  replicas: 1
auth:
  enabled: true
  existingSecret: redis-auth-secret
metrics:
  enabled: true
  serviceMonitor:
    enabled: true
    interval: 15s
resources:
  requests:
    cpu: 500m
    memory: 2Gi
  limits:
    cpu: 2000m
    memory: 8Gi`
  }
];

const INITIAL_SECRETS: SecretItem[] = [
  {
    id: 'sec-1',
    key: 'VAULT_DATABASE_MASTER_PASSWORD',
    value: 'p@ssw0rd_pr0d_db_master_9984#',
    environment: 'production',
    scope: 'RDS PostgreSQL Multi-AZ',
    lastRotated: '2026-08-01',
    expiresInDays: 68,
    status: 'valid'
  },
  {
    id: 'sec-2',
    key: 'OPENROUTER_PRIMARY_API_KEY',
    value: 'sk-or-v1-98748239048123049182309481203',
    environment: 'production',
    scope: 'AI Inference Fleet',
    lastRotated: '2026-08-10',
    expiresInDays: 82,
    status: 'valid'
  },
  {
    id: 'sec-3',
    key: 'STRIPE_WEBHOOK_SIGNING_SECRET',
    value: 'whsec_892348912304918230491283049',
    environment: 'production',
    scope: 'Billing Microservice',
    lastRotated: '2026-06-15',
    expiresInDays: 4,
    status: 'expiring_soon'
  },
  {
    id: 'sec-4',
    key: 'K8S_SERVICE_ACCOUNT_JWT_TOKEN',
    value: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMyJ9...',
    environment: 'staging',
    scope: 'Cluster Autoscale Agent',
    lastRotated: '2026-08-14',
    expiresInDays: 175,
    status: 'valid'
  }
];

export default function ConfigManagementTab() {
  const [activeSubTab, setActiveSubTab] = useState<'orchestrator' | 'nodes' | 'manifests' | 'secrets' | 'compliance' | 'runs'>('orchestrator');
  const [nodes, setNodes] = useState<HostNode[]>(INITIAL_NODES);
  const [manifests, setManifests] = useState<ConfigManifest[]>(INITIAL_MANIFESTS);
  const [secrets, setSecrets] = useState<SecretItem[]>(INITIAL_SECRETS);
  const [selectedManifest, setSelectedManifest] = useState<ConfigManifest>(INITIAL_MANIFESTS[0]);
  const [manifestEditorContent, setManifestEditorContent] = useState<string>(INITIAL_MANIFESTS[0].content);
  const [selectedNodeForDiff, setSelectedNodeForDiff] = useState<HostNode | null>(null);
  const [isScanningDrift, setIsScanningDrift] = useState<boolean>(false);
  const [isEnforcingState, setIsEnforcingState] = useState<boolean>(false);
  const [filterEnv, setFilterEnv] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Terminal Execution Logs state
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '[2026-08-23 04:00:10] [INFO] Ansible configuration engine v2.16.5 initialized',
    '[2026-08-23 04:00:12] [INFO] Inventory loaded from AWS Dynamic Plugin (5 nodes tracked)',
    '[2026-08-23 04:00:15] [OK] node-01 (k8s-prod-worker-us-east-1a): State in synchronization',
    '[2026-08-23 04:00:18] [WARNING] node-02 (k8s-prod-worker-us-east-1b): Drift detected in sysctl params',
    '[2026-08-23 04:00:20] [OK] node-03 (gke-prod-app-pool-01): State in synchronization',
    '[2026-08-23 04:00:24] [OK] node-04 (stage-api-gateway-01): State in synchronization',
    '[2026-08-23 04:00:28] [WARNING] node-05 (edge-gateway-eu-central): Drift detected in firewall policy'
  ]);

  const handleRunDriftScan = () => {
    setIsScanningDrift(true);
    setTerminalLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [DRIFT_CHECK] Triggering fleet-wide configuration state audit...`
    ]);

    setTimeout(() => {
      setIsScanningDrift(false);
      setTerminalLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [DRIFT_CHECK] Audit completed across 5 nodes. 2 drifted hosts identified.`
      ]);
    }, 1200);
  };

  const handleEnforceAllState = () => {
    setIsEnforcingState(true);
    setTerminalLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [ANSIBLE_PLAYBOOK] Running site-k8s-hardening.yml on drifted nodes...`,
      `[${new Date().toLocaleTimeString()}] [PLAY] Apply desired configuration state *****`,
      `[${new Date().toLocaleTimeString()}] [TASK] (node-02) Updating sysctl kernel params -> CHANGED`,
      `[${new Date().toLocaleTimeString()}] [TASK] (node-02) Hardening /etc/ssh/sshd_config -> CHANGED`,
      `[${new Date().toLocaleTimeString()}] [TASK] (node-05) Enforcing iptables rules & starting node_exporter -> CHANGED`,
      `[${new Date().toLocaleTimeString()}] [RECAP] node-02: ok=12 changed=2 failed=0 | node-05: ok=8 changed=2 failed=0`
    ]);

    setTimeout(() => {
      setNodes(prev => prev.map(n => ({ ...n, status: 'synced', driftDetails: undefined, lastApplied: 'Just now' })));
      setIsEnforcingState(false);
      if (selectedNodeForDiff) setSelectedNodeForDiff(null);
    }, 1800);
  };

  const toggleSecretReveal = (id: string) => {
    setRevealedSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredNodes = nodes.filter(n => {
    if (filterEnv !== 'all' && n.environment !== filterEnv) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return n.hostname.toLowerCase().includes(q) || n.ip.includes(q) || n.activePlaybook.toLowerCase().includes(q);
    }
    return true;
  });

  const syncedCount = nodes.filter(n => n.status === 'synced').length;
  const driftedCount = nodes.filter(n => n.status === 'drifted').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Suite Overview */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
              <Sliders size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                  DevOps Suite
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400">Ansible &bull; Puppet &bull; K8s Config</span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">Configuration Management</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Centralized desired-state enforcement, configuration drift detection, fleet inventory & secrets management.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleRunDriftScan}
              disabled={isScanningDrift}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-200 disabled:opacity-50"
            >
              <RefreshCw size={14} className={isScanningDrift ? 'animate-spin text-indigo-600' : ''} />
              <span>{isScanningDrift ? 'Scanning Drift...' : 'Check Fleet Drift'}</span>
            </button>
            <button
              onClick={handleEnforceAllState}
              disabled={isEnforcingState || driftedCount === 0}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50"
            >
              <Play size={14} />
              <span>{isEnforcingState ? 'Applying Config...' : 'Enforce Desired State'}</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Managed Hosts</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{nodes.length}</div>
            <span className="text-[11px] font-medium text-slate-500">Across 4 cloud regions</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sync Status</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-600">{syncedCount}</span>
              <span className="text-xs text-slate-400 font-bold">/ {nodes.length}</span>
            </div>
            <span className="text-[11px] font-medium text-emerald-600 font-mono">{((syncedCount / nodes.length) * 100).toFixed(0)}% in sync</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Drifted Hosts</span>
            <div className={`text-2xl font-black mt-1 ${driftedCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{driftedCount}</div>
            <span className="text-[11px] font-medium text-amber-600">Requires enforcement</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CIS Compliance</span>
            <div className="text-2xl font-black text-indigo-600 mt-1">96.4%</div>
            <span className="text-[11px] font-medium text-slate-500">Level 2 benchmark</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
          {[
            { id: 'orchestrator', label: 'Ansible Orchestrator', icon: <Play size={14} className={activeSubTab === 'orchestrator' ? 'text-indigo-400' : 'text-indigo-600'} />, badge: 'ENGINE' },
            { id: 'nodes', label: 'Host Inventory & Drift', icon: <Server size={14} />, count: nodes.length },
            { id: 'manifests', label: 'Playbooks & ConfigMaps', icon: <FileCode size={14} />, count: manifests.length },
            { id: 'secrets', label: 'Secrets & Vault', icon: <Lock size={14} />, count: secrets.length },
            { id: 'compliance', label: 'CIS Benchmark Audits', icon: <ShieldCheck size={14} /> },
            { id: 'runs', label: 'Execution Runs', icon: <Terminal size={14} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-mono font-black ${
                  activeSubTab === tab.id ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}>
                  {tab.badge}
                </span>
              )}
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeSubTab === tab.id ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-Tab Content */}
      <AnimatePresence mode="wait">
        {/* 0. Ansible Orchestrator Engine */}
        {activeSubTab === 'orchestrator' && (
          <motion.div
            key="orchestrator-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <AnsibleOrchestrator />
          </motion.div>
        )}

        {/* 1. Host Inventory & Drift */}
        {activeSubTab === 'nodes' && (
          <motion.div
            key="nodes-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* Filter Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search hosts, IP address, playbooks..."
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
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                Showing {filteredNodes.length} nodes
              </div>
            </div>

            {/* Nodes Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Hostname & IP</th>
                      <th className="py-3 px-4">Environment</th>
                      <th className="py-3 px-4">OS Platform</th>
                      <th className="py-3 px-4">Active Playbook</th>
                      <th className="py-3 px-4">Sync Status</th>
                      <th className="py-3 px-4">Last Applied</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredNodes.map((node) => (
                      <tr key={node.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 font-mono">{node.hostname}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{node.ip} &bull; {node.provider}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            node.environment === 'production' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                            node.environment === 'staging' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {node.environment}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {node.os}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-indigo-600 font-semibold bg-indigo-50/60 px-2 py-0.5 rounded border border-indigo-100/60">
                            {node.activePlaybook}
                          </span>
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
                        <td className="py-3.5 px-4 text-slate-400 font-mono">
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
                              onClick={() => {
                                setTerminalLogs(prev => [
                                  ...prev,
                                  `[${new Date().toLocaleTimeString()}] [PING] Verified connectivity to ${node.hostname} (${node.ip}): 2.4ms latency`
                                ]);
                              }}
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

            {/* Drift Inspection Modal / Drawer */}
            <AnimatePresence>
              {selectedNodeForDiff && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedNodeForDiff(null)}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
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
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Playbook Target</h4>
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
                        onClick={handleEnforceAllState}
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
          </motion.div>
        )}

        {/* 2. Playbooks & ConfigMaps Manifest Editor */}
        {activeSubTab === 'manifests' && (
          <motion.div
            key="manifests-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Sidebar Manifest Selector */}
            <div className="lg:col-span-4 space-y-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Config Repositories</h3>
                  <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">main branch</span>
                </div>

                <div className="space-y-2">
                  {manifests.map((man) => (
                    <div
                      key={man.id}
                      onClick={() => {
                        setSelectedManifest(man);
                        setManifestEditorContent(man.content);
                      }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedManifest.id === man.id
                          ? 'bg-indigo-50/70 border-indigo-300 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 font-mono truncate">{man.name}</span>
                        <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {man.type}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate mt-1">{man.path}</div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                        <span>{man.author}</span>
                        <span className="font-mono">{man.lastModified}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Code Editor Area */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
              <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-slate-200">
                <div className="flex items-center gap-2">
                  <FileCode size={16} className="text-indigo-400" />
                  <span className="font-mono text-xs font-bold text-white">{selectedManifest.path}</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedManifest.type === 'ansible' && (
                    <button
                      onClick={() => setActiveSubTab('orchestrator')}
                      className="px-3 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <Play size={12} />
                      <span>Launch in Orchestrator</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      alert('Manifest syntax validated successfully: 0 errors.');
                    }}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors"
                  >
                    Validate Syntax
                  </button>
                  <button
                    onClick={() => {
                      setTerminalLogs(prev => [
                        ...prev,
                        `[${new Date().toLocaleTimeString()}] [SAVE] Updated manifest ${selectedManifest.name} and synced with Git repository`
                      ]);
                      alert('Manifest changes saved & committed to Git repository.');
                    }}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                  >
                    Save & Commit
                  </button>
                </div>
              </div>

              <textarea
                value={manifestEditorContent}
                onChange={(e) => setManifestEditorContent(e.target.value)}
                rows={18}
                className="w-full p-4 font-mono text-xs bg-slate-950 text-indigo-100 focus:outline-none resize-none leading-relaxed selection:bg-indigo-500/30"
              />
            </div>
          </motion.div>
        )}

        {/* 3. Secrets & Vault */}
        {activeSubTab === 'secrets' && (
          <motion.div
            key="secrets-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <Lock size={18} className="text-indigo-600" />
                    Encrypted Environment & Secrets Vault
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">
                    Integrated with HashiCorp Vault, AWS Secrets Manager & Sealed Secrets with AES-256 GCM encryption.
                  </p>
                </div>

                <button
                  onClick={() => {
                    const keyName = prompt('Enter secret key name (e.g. JWT_SIGNING_KEY):');
                    if (keyName) {
                      const val = prompt('Enter secret value:');
                      if (val) {
                        const newSec: SecretItem = {
                          id: `sec-${Date.now()}`,
                          key: keyName.toUpperCase(),
                          value: val,
                          environment: 'production',
                          scope: 'Application Runtime',
                          lastRotated: '2026-08-23',
                          expiresInDays: 90,
                          status: 'valid'
                        };
                        setSecrets(prev => [newSec, ...prev]);
                      }
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
                >
                  <Plus size={14} />
                  <span>Store New Secret</span>
                </button>
              </div>

              {/* Secrets Table */}
              <div className="divide-y divide-slate-100 mt-2">
                {secrets.map((sec) => (
                  <div key={sec.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">{sec.key}</span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-bold">
                          {sec.environment}
                        </span>
                        {sec.status === 'expiring_soon' && (
                          <span className="text-[10px] px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-bold">
                            Expires in {sec.expiresInDays} days
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">{sec.scope} &bull; Rotated: {sec.lastRotated}</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-100 rounded-xl font-mono text-xs text-slate-700 min-w-[220px] flex items-center justify-between border border-slate-200">
                        <span>{revealedSecrets[sec.id] ? sec.value : '••••••••••••••••••••••••'}</span>
                        <button
                          onClick={() => toggleSecretReveal(sec.id)}
                          className="text-slate-400 hover:text-slate-700 transition-colors ml-2"
                        >
                          {revealedSecrets[sec.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>

                      <button
                        onClick={() => copyToClipboard(sec.value, sec.id)}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs transition-colors"
                        title="Copy Secret"
                      >
                        {copiedKey === sec.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>

                      <button
                        onClick={() => {
                          alert(`Secret ${sec.key} scheduled for auto-rotation.`);
                        }}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs transition-colors"
                        title="Rotate Secret"
                      >
                        <RotateCw size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* 4. CIS Benchmark Audits */}
        {activeSubTab === 'compliance' && (
          <motion.div
            key="compliance-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-600" />
                CIS Benchmark Security Hardening Scores
              </h3>
              
              <div className="space-y-3">
                {[
                  { label: 'CIS Linux Server Level 1', score: 98, status: 'PASS' },
                  { label: 'CIS Kubernetes Benchmark v1.8', score: 94, status: 'PASS' },
                  { label: 'CIS Docker & Container Runtime', score: 96, status: 'PASS' },
                  { label: 'SSH & PAM Authentication Policy', score: 100, status: 'PASS' },
                  { label: 'File Integrity Monitoring (AIDE)', score: 92, status: 'PASS' }
                ].map((item, i) => (
                  <div key={i} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                      <span className="text-slate-800">{item.label}</span>
                      <span className="font-mono text-emerald-600">{item.score}% {item.status}</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${item.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                Active Configuration Drift & Security Recommendations
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <div className="font-bold text-amber-900">node-02: SSH Root Login Enabled</div>
                  <div className="text-amber-800 text-[11px]">
                    Remediation: Enforce <code>PermitRootLogin no</code> in <code>/etc/ssh/sshd_config</code> via Ansible playbook.
                  </div>
                </div>

                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <div className="font-bold text-amber-900">edge-gateway-eu-central: Missing Ingress Firewall Rule</div>
                  <div className="text-amber-800 text-[11px]">
                    Remediation: Apply UFW baseline template to reject untrusted inbound packets on non-standard ports.
                  </div>
                </div>

                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                  <div className="font-bold text-blue-900">Stripe Webhook Secret Rotation Due</div>
                  <div className="text-blue-800 text-[11px]">
                    Rotated 86 days ago (policy requires 90-day rotation cycle).
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 5. Execution Runs & Live Terminal Logs */}
        {activeSubTab === 'runs' && (
          <motion.div
            key="runs-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-300 text-xs font-mono font-bold">
                <Terminal size={14} className="text-indigo-400" />
                <span>Ansible Automation Execution Console</span>
              </div>
              <button
                onClick={() => setTerminalLogs([])}
                className="text-[10px] text-slate-500 hover:text-slate-300 font-mono transition-colors"
              >
                Clear Console
              </button>
            </div>

            <div className="space-y-1.5 font-mono text-xs max-h-96 overflow-y-auto custom-scrollbar">
              {terminalLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`leading-relaxed ${
                    log.includes('[WARNING]') ? 'text-amber-400' :
                    log.includes('[OK]') ? 'text-emerald-400' :
                    log.includes('[DRIFT_CHECK]') ? 'text-indigo-300' :
                    log.includes('[ANSIBLE_PLAYBOOK]') ? 'text-cyan-300' :
                    'text-slate-300'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
