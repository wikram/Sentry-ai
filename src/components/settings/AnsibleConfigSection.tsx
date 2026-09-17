/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Server, 
  FileCode, 
  FolderGit2, 
  Folder, 
  FolderPlus, 
  FolderCheck, 
  HardDrive, 
  Key, 
  Shield, 
  Sliders, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft, 
  Play, 
  Layers, 
  FileText, 
  RefreshCw, 
  Check, 
  Copy, 
  Info, 
  HelpCircle, 
  Code, 
  Wrench, 
  Database,
  ExternalLink,
  ChevronRight,
  Eye,
  CheckCircle,
  GitBranch,
  GitPullRequest,
  GitCommit,
  Clock,
  Lock,
  Globe,
  AlertCircle,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface AnsibleGitSyncData {
  enabled: boolean;
  repoUrl: string;
  branch: string;
  targetDirectory: string;
  syncIntervalMinutes: number;
  authType: 'none' | 'token';
  token?: string;
  hasToken?: boolean;
  autoPullChanges: boolean;
  syncInventory: boolean;
  syncPlaybooks: boolean;
  syncRoles: boolean;
  syncAnsibleCfg: boolean;
  lastStatus: 'idle' | 'checking' | 'synced' | 'changes_pulled' | 'error';
  lastStatusMessage?: string;
  lastCheckedAt?: string;
  lastPulledAt?: string;
  lastCommitHash?: string;
  lastCommitMessage?: string;
  lastCommitAuthor?: string;
  lastCommitDate?: string;
  changedFilesCount?: number;
  lastChangedFiles?: string[];
  nextScheduledCheck?: string;
}

export interface AnsibleGitSyncLog {
  id: string;
  timestamp: string;
  type: 'CHECK' | 'PULL' | 'CLONE' | 'ERROR';
  status: 'SUCCESS' | 'NO_CHANGES' | 'CHANGED' | 'ERROR';
  commitHash?: string;
  commitMessage?: string;
  changedFiles?: string[];
  message: string;
  durationMs?: number;
}

export interface AnsibleConfigData {
  ansibleDirectory: string;
  ansibleLocation: string;
  ansibleBinary: string;
  inventoryFile: string;
  configFilePath: string;
  playbooksDir: string;
  rolesDir: string;
  groupVarsDir: string;
  hostVarsDir: string;
  collectionsDir: string;
  remoteUser: string;
  privateKeyFile: string;
  sshPort: number;
  timeout: number;
  hostKeyChecking: boolean;
  become: boolean;
  becomeMethod: string;
  becomeUser: string;
  forks: number;
  pipelining: boolean;
  verbosity: string;
  vaultPasswordFile: string;
  logPath: string;
  lastSaved?: string;
}

export interface DirectoryItemStatus {
  name: string;
  path: string;
  resolved: string;
  exists: boolean;
  itemCount: number;
  items?: string[];
  description: string;
}

export interface AnsibleStorageLocation {
  id: string;
  label: string;
  path: string;
  resolved: string;
  format: 'JSON' | 'INI' | 'YAML' | 'LOG';
  description: string;
  exists: boolean;
  sizeBytes?: number;
  lastModified?: string;
}

export interface DirectoryInspection {
  baseDirectory: {
    path: string;
    resolved: string;
    exists: boolean;
    isWritable: boolean;
  };
  subdirectories: DirectoryItemStatus[];
  storageLocations: AnsibleStorageLocation[];
}

export interface AnsibleTestResponse {
  success: boolean;
  timestamp: string;
  binaryStatus: {
    location: string;
    exists: boolean;
    versionOutput?: string;
    details: string;
  };
  inventoryStatus: {
    location: string;
    exists: boolean;
    hostsCount: number;
    groups: string[];
    details: string;
  };
  playbooksStatus: {
    location: string;
    exists: boolean;
    count: number;
    playbooks: string[];
  };
  summary: string;
}

interface AnsibleConfigSectionProps {
  onBack: () => void;
  showNotification?: (msg: string) => void;
}

const DEFAULT_CONFIG: AnsibleConfigData = {
  ansibleDirectory: '.',
  ansibleLocation: '/usr/bin/ansible-playbook',
  ansibleBinary: '/usr/bin/ansible',
  inventoryFile: 'inventory/hosts.ini',
  configFilePath: './ansible.cfg',
  playbooksDir: 'playbooks',
  rolesDir: 'roles',
  groupVarsDir: 'group_vars',
  hostVarsDir: 'host_vars',
  collectionsDir: 'collections',
  remoteUser: 'ansible',
  privateKeyFile: '~/.ssh/id_rsa',
  sshPort: 22,
  timeout: 30,
  hostKeyChecking: false,
  become: true,
  becomeMethod: 'sudo',
  becomeUser: 'root',
  forks: 5,
  pipelining: true,
  verbosity: 'default',
  vaultPasswordFile: '.vault_pass',
  logPath: 'logs/ansible.log'
};

export default function AnsibleConfigSection({ onBack, showNotification }: AnsibleConfigSectionProps) {
  const [config, setConfig] = useState<AnsibleConfigData>(DEFAULT_CONFIG);
  const [initialConfig, setInitialConfig] = useState<AnsibleConfigData>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<AnsibleTestResponse | null>(null);

  // Directory Inspection & Scaffolding State
  const [inspection, setInspection] = useState<DirectoryInspection | null>(null);
  const [isLoadingInspection, setIsLoadingInspection] = useState<boolean>(false);
  const [isScaffolding, setIsScaffolding] = useState<boolean>(false);
  const [scaffoldResult, setScaffoldResult] = useState<{ success: boolean; message: string; created: string[] } | null>(null);

  // Live ansible.cfg Viewer Modal State
  const [showCfgModal, setShowCfgModal] = useState<boolean>(false);
  const [cfgData, setCfgData] = useState<{ path: string; content: string; exists: boolean }>({ path: '', content: '', exists: false });
  const [isLoadingCfg, setIsLoadingCfg] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Inventory Inspector State
  const [showInventoryEditor, setShowInventoryEditor] = useState<boolean>(false);
  const [inventoryContent, setInventoryContent] = useState<string>('');
  const [inventoryStats, setInventoryStats] = useState<{ hostsCount: number; groups: string[] }>({ hostsCount: 0, groups: [] });
  const [isSavingInventory, setIsSavingInventory] = useState<boolean>(false);

  // GitHub Integration & Auto-Sync (30 Min) State
  const [gitSync, setGitSync] = useState<AnsibleGitSyncData>({
    enabled: true,
    repoUrl: '',
    branch: 'main',
    targetDirectory: 'ansible-repo',
    syncIntervalMinutes: 30,
    authType: 'none',
    token: '',
    autoPullChanges: true,
    syncInventory: true,
    syncPlaybooks: true,
    syncRoles: true,
    syncAnsibleCfg: false,
    lastStatus: 'idle',
    lastStatusMessage: 'Scheduled to check every 30 minutes',
    changedFilesCount: 0,
    lastChangedFiles: []
  });
  const [gitSyncLogs, setGitSyncLogs] = useState<AnsibleGitSyncLog[]>([]);
  const [isLoadingGitSync, setIsLoadingGitSync] = useState<boolean>(false);
  const [isSavingGit, setIsSavingGit] = useState<boolean>(false);
  const [isTestingGit, setIsTestingGit] = useState<boolean>(false);
  const [isPullingGit, setIsPullingGit] = useState<boolean>(false);
  const [gitTestResult, setGitTestResult] = useState<{ success: boolean; message: string; remoteHead?: string } | null>(null);
  const [showGitLogs, setShowGitLogs] = useState<boolean>(false);
  const [isGitEditing, setIsGitEditing] = useState<boolean>(false);

  // Load configuration, inventory, directory inspection & git sync on mount
  useEffect(() => {
    fetchConfig();
    fetchInventory();
    fetchDirectoryInspection();
    fetchGitSync();
  }, []);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/config-mgmt/ansible-config');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
          setInitialConfig(data.config);
        }
      }
    } catch (err) {
      console.error('Failed to load ansible config:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDirectoryInspection = async () => {
    try {
      setIsLoadingInspection(true);
      const res = await fetch('/api/config-mgmt/ansible-directories');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setInspection(data);
        }
      }
    } catch (err) {
      console.error('Failed to inspect directories:', err);
    } finally {
      setIsLoadingInspection(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/config-mgmt/inventory-file');
      if (res.ok) {
        const data = await res.json();
        if (typeof data.content === 'string') {
          setInventoryContent(data.content);
          setInventoryStats({
            hostsCount: data.hostsCount || 0,
            groups: data.groups || []
          });
        }
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
    }
  };

  const fetchGitSync = async () => {
    try {
      setIsLoadingGitSync(true);
      const res = await fetch('/api/config-mgmt/ansible-git-sync');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setGitSync(data.config);
        }
        if (data.logs) {
          setGitSyncLogs(data.logs);
        }
      }
    } catch (err) {
      console.error('Failed to load Git sync configuration:', err);
    } finally {
      setIsLoadingGitSync(false);
    }
  };

  const handleSaveGitSync = async (override?: Partial<AnsibleGitSyncData>) => {
    setIsSavingGit(true);
    try {
      const payload = override ? { ...gitSync, ...override } : gitSync;
      const res = await fetch('/api/config-mgmt/ansible-git-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) setGitSync(data.config);
        if (data.logs) setGitSyncLogs(data.logs);
        setIsGitEditing(false);
        showNotification?.('GitHub integration settings saved. 30-min auto-sync is active.');
      } else {
        showNotification?.('Failed to update GitHub sync configuration');
      }
    } catch (err) {
      showNotification?.('Error updating GitHub sync configuration');
    } finally {
      setIsSavingGit(false);
    }
  };

  const handleTestGitConnection = async () => {
    setIsTestingGit(true);
    setGitTestResult(null);
    try {
      const res = await fetch('/api/config-mgmt/ansible-git-sync/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: gitSync.repoUrl,
          branch: gitSync.branch,
          token: gitSync.token
        })
      });
      const data = await res.json();
      setGitTestResult(data);
      if (data.success) {
        showNotification?.('GitHub connection verified successfully!');
      } else {
        showNotification?.('GitHub connection check failed: ' + data.message);
      }
    } catch (err: any) {
      setGitTestResult({ success: false, message: err.message });
      showNotification?.('Network error testing GitHub connection');
    } finally {
      setIsTestingGit(false);
    }
  };

  const handlePullGitNow = async (force: boolean = false) => {
    setIsPullingGit(true);
    try {
      const res = await fetch('/api/config-mgmt/ansible-git-sync/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force })
      });
      const data = await res.json();
      if (data.config) setGitSync(data.config);
      if (data.logs) setGitSyncLogs(data.logs);

      if (data.success) {
        if (data.changesDetected) {
          showNotification?.(`Pulled ${data.changedFiles?.length || 0} updated files from GitHub (${gitSync.branch})!`);
        } else {
          showNotification?.('Checked GitHub: Local files are already up-to-date with remote branch.');
        }
        // Refresh local playbooks and inventories in UI
        fetchInventory();
        fetchDirectoryInspection();
      } else {
        showNotification?.('GitHub Pull error: ' + data.message);
      }
    } catch (err: any) {
      showNotification?.('Error pulling from GitHub: ' + err.message);
    } finally {
      setIsPullingGit(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/config-mgmt/ansible-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
          setInitialConfig(data.config);
        }
        showNotification?.('Ansible configuration saved & synced to ansible.cfg');
        fetchDirectoryInspection();
      } else {
        showNotification?.('Failed to save Ansible configuration');
      }
    } catch (err) {
      showNotification?.('Error saving configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleScaffoldDirectories = async () => {
    setIsScaffolding(true);
    setScaffoldResult(null);
    try {
      const res = await fetch('/api/config-mgmt/ansible-directories/scaffold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      setScaffoldResult(data);
      if (data.inspection) {
        setInspection(data.inspection);
      } else {
        fetchDirectoryInspection();
      }
      showNotification?.(data.message || 'Directories scaffolded successfully');
    } catch (err) {
      showNotification?.('Error scaffolding directories');
    } finally {
      setIsScaffolding(false);
    }
  };

  const handleViewCfg = async () => {
    setIsLoadingCfg(true);
    setShowCfgModal(true);
    try {
      const res = await fetch('/api/config-mgmt/ansible-cfg');
      if (res.ok) {
        const data = await res.json();
        setCfgData(data);
      }
    } catch (err) {
      console.error('Failed to fetch ansible.cfg:', err);
    } finally {
      setIsLoadingCfg(false);
    }
  };

  const handleRunTest = async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/config-mgmt/ansible-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult(data);
        if (data.success) {
          showNotification?.('Ansible environment & paths verified successfully!');
        } else {
          showNotification?.('Environment check completed with advisories');
        }
      }
    } catch (err) {
      showNotification?.('Error running environment verification');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveInventory = async () => {
    setIsSavingInventory(true);
    try {
      const res = await fetch('/api/config-mgmt/inventory-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: config.inventoryFile,
          content: inventoryContent
        })
      });
      if (res.ok) {
        const data = await res.json();
        setInventoryStats({
          hostsCount: data.hostsCount || 0,
          groups: data.groups || []
        });
        showNotification?.(`Inventory saved (${data.hostsCount} hosts, ${data.groups?.length || 0} groups)`);
        fetchDirectoryInspection();
      } else {
        showNotification?.('Failed to save inventory file');
      }
    } catch (err) {
      showNotification?.('Error saving inventory file');
    } finally {
      setIsSavingInventory(false);
    }
  };

  const handleResetDefaults = () => {
    setConfig(DEFAULT_CONFIG);
    showNotification?.('Restored default Ansible parameters. Click Save to persist.');
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isDirty = JSON.stringify(config) !== JSON.stringify(initialConfig);

  return (
    <div className="space-y-6">
      {/* Top Header with Back Navigation & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-xs gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
            <span>Back to Devops Studio</span>
          </button>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 font-black text-xs">
              A
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 leading-tight">Ansible Configuration</h2>
              <p className="text-[11px] text-slate-500">Base working directory, inventory mapping, SSH credentials & execution parameters</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleViewCfg}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-colors"
          >
            <Code size={14} className="text-slate-500" />
            <span>View ansible.cfg</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition-colors"
          >
            <RotateCcw size={14} />
            <span>Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleRunTest}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50"
          >
            {isTesting ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
            <span>{isTesting ? 'Testing Paths...' : 'Test Ansible Setup'}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-4 py-2 font-bold text-xs rounded-xl shadow-xs transition-all ${
              isDirty 
                ? 'bg-blue-600 hover:bg-blue-700 text-white ring-2 ring-blue-500/20 animate-pulse' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{isSaving ? 'Saving...' : isDirty ? 'Save Changes *' : 'Saved'}</span>
          </button>
        </div>
      </div>

      {/* Quick Status Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Ansible Working Directory</span>
            <Folder size={14} className="text-blue-500" />
          </div>
          <div className="text-sm font-black text-slate-900 truncate font-mono">
            {config.ansibleDirectory || '.'}
          </div>
          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${inspection?.baseDirectory.exists ? 'bg-emerald-500' : 'bg-amber-500'} inline-block`} />
            <span className="truncate">{inspection?.baseDirectory.resolved || 'Working Root'}</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Active Inventory</span>
            <Server size={14} className="text-emerald-500" />
          </div>
          <div className="text-sm font-black text-slate-900 truncate font-mono">
            {config.inventoryFile}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {inventoryStats.hostsCount} hosts &bull; {inventoryStats.groups.length} groups
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Execution User & Escalation</span>
            <Key size={14} className="text-amber-500" />
          </div>
          <div className="text-sm font-black text-slate-900 truncate font-mono">
            {config.remoteUser} {config.become ? `(${config.becomeMethod} ${config.becomeUser})` : ''}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            SSH Port: {config.sshPort} &bull; Timeout: {config.timeout}s
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Concurrency & Pipelining</span>
            <Sliders size={14} className="text-purple-500" />
          </div>
          <div className="text-sm font-black text-slate-900">
            {config.forks} Parallel Hosts
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Pipelining: {config.pipelining ? 'Active (Fast)' : 'Disabled'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>GitHub Sync (30m Loop)</span>
            <GitBranch size={14} className="text-indigo-500" />
          </div>
          <div className="text-sm font-black text-slate-900 truncate flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${
              gitSync.lastStatus === 'synced' ? 'bg-emerald-500' :
              gitSync.lastStatus === 'changes_pulled' ? 'bg-indigo-500' :
              gitSync.lastStatus === 'checking' ? 'bg-blue-500 animate-ping' :
              gitSync.lastStatus === 'error' ? 'bg-rose-500' : 'bg-slate-400'
            }`} />
            <span className="truncate">{gitSync.branch || 'main'}</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium truncate">
            {gitSync.lastCommitHash ? `Commit ${gitSync.lastCommitHash.substring(0, 7)}` : 'Checked every 30m'}
          </p>
        </div>
      </div>


      {/* Diagnostic Verification Result Banner */}
      {testResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`border rounded-2xl p-5 shadow-xs ${
            testResult.success 
              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
              : 'bg-amber-50/70 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl mt-0.5 ${testResult.success ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'}`}>
                {testResult.success ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm tracking-tight">
                    {testResult.success ? 'Ansible Environment Verified' : 'Environment Configuration Diagnostic'}
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/80 border font-bold">
                    {testResult.timestamp.split('T')[1]?.slice(0, 8)} UTC
                  </span>
                </div>
                <p className="text-xs font-medium leading-relaxed">
                  {testResult.summary}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTestResult(null)}
              className="text-slate-400 hover:text-slate-600 p-1 text-xs font-bold"
            >
              &times;
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-200/60 text-xs">
            <div className="bg-white/70 p-3 rounded-xl border border-slate-200/50 space-y-1">
              <span className="font-bold text-[10px] uppercase text-slate-500 block">Binary Validation</span>
              <p className="font-mono text-[11px] text-slate-800 truncate">{testResult.binaryStatus.location}</p>
              <p className="text-[11px] text-slate-600">{testResult.binaryStatus.details}</p>
            </div>
            <div className="bg-white/70 p-3 rounded-xl border border-slate-200/50 space-y-1">
              <span className="font-bold text-[10px] uppercase text-slate-500 block">Inventory Targets</span>
              <p className="font-mono text-[11px] text-slate-800 truncate">{testResult.inventoryStatus.location}</p>
              <p className="text-[11px] text-slate-600">{testResult.inventoryStatus.details}</p>
            </div>
            <div className="bg-white/70 p-3 rounded-xl border border-slate-200/50 space-y-1">
              <span className="font-bold text-[10px] uppercase text-slate-500 block">Playbooks Root</span>
              <p className="font-mono text-[11px] text-slate-800 truncate">{testResult.playbooksStatus.location}</p>
              <p className="text-[11px] text-slate-600">
                {testResult.playbooksStatus.count} valid YAML playbooks ready for dispatch
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* SECTION 1: GITHUB REPOSITORY INTEGRATION & CONTINUOUS 30-MIN SYNC */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-slate-900 text-white rounded-2xl shadow-xs shrink-0 mt-0.5">
              <GitBranch size={20} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight">GitHub Configuration Integration</h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  <Clock size={12} className="text-indigo-600" />
                  Checks every 30 mins
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  gitSync.lastStatus === 'synced'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : gitSync.lastStatus === 'changes_pulled'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : gitSync.lastStatus === 'checking'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : gitSync.lastStatus === 'error'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {gitSync.lastStatus === 'synced' && <CheckCircle2 size={12} className="text-emerald-600" />}
                  {gitSync.lastStatus === 'changes_pulled' && <GitPullRequest size={12} className="text-indigo-600" />}
                  {gitSync.lastStatus === 'checking' && <RefreshCw size={12} className="animate-spin text-blue-600" />}
                  {gitSync.lastStatus === 'error' && <AlertCircle size={12} className="text-rose-600" />}
                  {gitSync.lastStatus === 'idle' && <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
                  <span>
                    {gitSync.lastStatus === 'synced' ? 'Up to Date' :
                     gitSync.lastStatus === 'changes_pulled' ? 'Changes Pulled' :
                     gitSync.lastStatus === 'checking' ? 'Checking Remote...' :
                     gitSync.lastStatus === 'error' ? 'Sync Advisory' : 'Ready'}
                  </span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Store your playbooks, roles, and inventory files in GitHub. The application continuously inspects GitHub every 30 minutes and automatically pulls updates into your active workspace.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleTestGitConnection}
              disabled={isTestingGit || !gitSync.repoUrl}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition-all disabled:opacity-50"
              title="Verify GitHub repository reachability and remote branch"
            >
              {isTestingGit ? <RefreshCw size={13} className="animate-spin" /> : <Globe size={13} />}
              <span>{isTestingGit ? 'Verifying...' : 'Test Connection'}</span>
            </button>

            <button
              type="button"
              onClick={() => handlePullGitNow(false)}
              disabled={isPullingGit || !gitSync.repoUrl}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50"
              title="Check GitHub immediately and pull any new commits into local playbooks, roles, and inventory"
            >
              {isPullingGit ? <RefreshCw size={13} className="animate-spin" /> : <GitPullRequest size={13} />}
              <span>{isPullingGit ? 'Checking & Pulling...' : 'Check & Pull Now'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsGitEditing(!isGitEditing)}
              className={`flex items-center gap-1.5 px-3 py-2 font-bold text-xs rounded-xl border transition-all ${
                isGitEditing 
                  ? 'bg-slate-900 text-white border-slate-900' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <Wrench size={13} />
              <span>{isGitEditing ? 'Close Settings' : 'Configure Repo'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowGitLogs(!showGitLogs)}
              className={`flex items-center gap-1.5 px-3 py-2 font-bold text-xs rounded-xl border transition-all ${
                showGitLogs
                  ? 'bg-slate-200 text-slate-900 border-slate-300'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <History size={13} />
              <span>History ({gitSyncLogs.length})</span>
            </button>
          </div>
        </div>

        {/* Git Test Connection Result Notice */}
        {gitTestResult && (
          <div className={`p-4 rounded-2xl border text-xs flex items-start justify-between gap-3 ${
            gitTestResult.success 
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
              : 'bg-rose-50/80 border-rose-200 text-rose-950'
          }`}>
            <div className="flex items-start gap-2.5">
              {gitTestResult.success ? (
                <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
              )}
              <div className="space-y-1">
                <p className="font-bold">{gitTestResult.message}</p>
                {gitTestResult.remoteHead && (
                  <p className="font-mono text-[11px] opacity-80">Remote HEAD Commit: {gitTestResult.remoteHead}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setGitTestResult(null)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1"
            >
              &times;
            </button>
          </div>
        )}

        {/* Current Sync Telemetry Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Repository & Branch</span>
            <div className="flex items-center gap-1.5 font-mono text-xs text-slate-800 font-bold truncate">
              <GitBranch size={13} className="text-indigo-600 shrink-0" />
              <span className="truncate">{gitSync.repoUrl ? gitSync.repoUrl.replace('https://github.com/', '') : 'Not Configured'}</span>
            </div>
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <span>Branch:</span>
              <span className="font-mono font-bold text-slate-700 bg-white px-1.5 py-0.2 rounded border">{gitSync.branch || 'main'}</span>
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">30-Min Schedule Cycle</span>
            <div className="flex items-center gap-1.5 text-xs text-slate-800 font-bold">
              <Clock size={13} className="text-blue-600 shrink-0" />
              <span>
                {gitSync.enabled ? 'Active (Every 30 Mins)' : 'Scheduled Polling Paused'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {gitSync.lastCheckedAt 
                ? `Last checked: ${new Date(gitSync.lastCheckedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                : 'Initial scan pending'}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Latest Pulled Commit</span>
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-800 font-bold truncate">
              <GitCommit size={13} className="text-emerald-600 shrink-0" />
              <span>{gitSync.lastCommitHash ? gitSync.lastCommitHash.substring(0, 7) : 'None pulled yet'}</span>
            </div>
            <p className="text-[11px] text-slate-500 truncate" title={gitSync.lastCommitMessage}>
              {gitSync.lastCommitMessage || (gitSync.repoUrl ? 'Remote synchronized' : 'Awaiting repo URL')}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Auto-Synced Artifacts</span>
            <div className="flex flex-wrap gap-1 pt-0.5">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-700">
                playbooks/
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-700">
                roles/
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-700">
                hosts.ini
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {gitSync.changedFilesCount !== undefined ? `${gitSync.changedFilesCount} files affected in last pull` : 'Ready to receive changes'}
            </p>
          </div>
        </div>

        {/* Configuration Edit Form (Collapsible) */}
        <AnimatePresence>
          {isGitEditing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-5 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <FolderGit2 size={16} className="text-slate-700" />
                    <h4 className="text-sm font-extrabold text-slate-900">Configure GitHub Repository & Continuous Pull</h4>
                  </div>
                  <span className="text-xs text-slate-500">Changes take effect immediately on next cycle</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Repo URL */}
                  <div className="md:col-span-8 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>GitHub Repository URL (HTTPS)</span>
                      <span className="text-[10px] font-normal text-slate-500">e.g., https://github.com/organization/ansible-configs.git</span>
                    </label>
                    <input
                      type="text"
                      value={gitSync.repoUrl}
                      onChange={(e) => setGitSync({ ...gitSync, repoUrl: e.target.value })}
                      placeholder="https://github.com/organization/ansible-configs.git"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  {/* Branch */}
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Target Git Branch</label>
                    <input
                      type="text"
                      value={gitSync.branch}
                      onChange={(e) => setGitSync({ ...gitSync, branch: e.target.value })}
                      placeholder="main"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  {/* GitHub Personal Access Token */}
                  <div className="md:col-span-8 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Lock size={12} className="text-slate-500" />
                        <span>GitHub Token / PAT (Required for Private Repositories)</span>
                      </span>
                      {gitSync.hasToken && (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 size={11} /> Token Saved
                        </span>
                      )}
                    </label>
                    <input
                      type="password"
                      value={gitSync.token || ''}
                      onChange={(e) => setGitSync({ ...gitSync, token: e.target.value })}
                      placeholder={gitSync.hasToken ? "•••••••••••••••••••••••• (Leave blank to keep current token)" : "ghp_xxxxxxxxxxxxxxxxxxxx (Optional for public repos)"}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  {/* Polling Interval */}
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Clock size={12} className="text-slate-500" />
                      <span>Sync Check Interval</span>
                    </label>
                    <select
                      value={gitSync.syncIntervalMinutes}
                      onChange={(e) => setGitSync({ ...gitSync, syncIntervalMinutes: parseInt(e.target.value, 10) || 30 })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value={15}>Every 15 minutes</option>
                      <option value={30}>Every 30 minutes (Standard User Request)</option>
                      <option value={60}>Every 60 minutes</option>
                      <option value={120}>Every 2 hours</option>
                    </select>
                  </div>
                </div>

                {/* Synchronization Scope & Toggles */}
                <div className="pt-3 border-t border-slate-200/80 space-y-3">
                  <span className="text-xs font-bold text-slate-800 block">Configuration Components to Synchronize from GitHub</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={gitSync.syncPlaybooks}
                        onChange={(e) => setGitSync({ ...gitSync, syncPlaybooks: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="font-bold block text-slate-800">Playbooks</span>
                        <span className="text-[10px] text-slate-500">playbooks/*.yml</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={gitSync.syncRoles}
                        onChange={(e) => setGitSync({ ...gitSync, syncRoles: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="font-bold block text-slate-800">Roles</span>
                        <span className="text-[10px] text-slate-500">roles/* subtrees</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={gitSync.syncInventory}
                        onChange={(e) => setGitSync({ ...gitSync, syncInventory: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="font-bold block text-slate-800">Inventory Files</span>
                        <span className="text-[10px] text-slate-500">hosts.ini / inventory</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={gitSync.syncAnsibleCfg}
                        onChange={(e) => setGitSync({ ...gitSync, syncAnsibleCfg: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="font-bold block text-slate-800">Ansible Config</span>
                        <span className="text-[10px] text-slate-500">ansible.cfg root file</span>
                      </div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gitSync.autoPullChanges}
                        onChange={(e) => setGitSync({ ...gitSync, autoPullChanges: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Automatically pull code into workspace whenever differences are detected in Git
                      </span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsGitEditing(false)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveGitSync()}
                        disabled={isSavingGit}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                      >
                        {isSavingGit ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                        <span>Save GitHub Settings</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sync Audit History Drawer (Collapsible) */}
        <AnimatePresence>
          {showGitLogs && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <History size={15} className="text-slate-700" />
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">GitHub Pull & 30-Min Sync Audit Log</h4>
                  </div>
                  <span className="text-[11px] text-slate-500">{gitSyncLogs.length} events recorded</span>
                </div>

                {gitSyncLogs.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No Git sync operations recorded yet. Click &ldquo;Check & Pull Now&rdquo; to trigger initial synchronization.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {gitSyncLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase font-mono mt-0.5 ${
                            log.status === 'CHANGED'
                              ? 'bg-indigo-100 text-indigo-800'
                              : log.status === 'NO_CHANGES'
                              ? 'bg-slate-100 text-slate-700'
                              : log.status === 'SUCCESS'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {log.status}
                          </span>
                          <div className="space-y-0.5">
                            <p className="font-semibold text-slate-800">{log.message}</p>
                            {log.commitHash && (
                              <p className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                                <GitCommit size={11} className="text-slate-400" />
                                <span>{log.commitHash.substring(0, 8)}</span>
                                {log.commitMessage && <span className="italic truncate max-w-xs">&ldquo;{log.commitMessage}&rdquo;</span>}
                              </p>
                            )}
                            {log.changedFiles && log.changedFiles.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {log.changedFiles.slice(0, 4).map((f, i) => (
                                  <span key={i} className="px-1.5 py-0.2 bg-slate-50 border rounded text-[10px] font-mono text-slate-600">
                                    {f}
                                  </span>
                                ))}
                                {log.changedFiles.length > 4 && (
                                  <span className="text-[10px] text-slate-400">+{log.changedFiles.length - 4} more</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0 text-[11px] text-slate-400 font-mono">
                          <div>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                          {log.durationMs !== undefined && (
                            <div className="text-[10px] text-slate-400">{log.durationMs}ms</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Settings Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls (8 cols) */}
        <div className="lg:col-span-8 space-y-6">

          {/* SECTION 2: CONFIGURE ANSIBLE DIRECTORY & PROJECT STRUCTURE */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FolderGit2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">Ansible Directory & Project Structure</h3>
                  <p className="text-[11px] text-slate-500">Configure base working directory, playbook roots, roles, and variable locations</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleScaffoldDirectories}
                  disabled={isScaffolding}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-colors disabled:opacity-50"
                  title="Create missing directories and initial templates on disk"
                >
                  {isScaffolding ? <RefreshCw size={13} className="animate-spin" /> : <FolderPlus size={13} />}
                  <span>{isScaffolding ? 'Scaffolding...' : 'Scaffold Directories'}</span>
                </button>

                <button
                  type="button"
                  onClick={fetchDirectoryInspection}
                  disabled={isLoadingInspection}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                  title="Refresh directory inspection"
                >
                  <RefreshCw size={14} className={isLoadingInspection ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Scaffold Result Notification */}
            {scaffoldResult && (
              <div className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 ${
                scaffoldResult.success ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' : 'bg-rose-50 border border-rose-200 text-rose-900'
              }`}>
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold">{scaffoldResult.message}</span>
                  {scaffoldResult.created && scaffoldResult.created.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {scaffoldResult.created.map((item, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-white rounded-md border text-[10px] font-mono">
                          + {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Base Directory Configuration */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span>Base Ansible Directory (Working Directory)</span>
                    <span className="text-red-500">*</span>
                  </label>
                  {inspection && (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${
                      inspection.baseDirectory.exists 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${inspection.baseDirectory.exists ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {inspection.baseDirectory.exists ? 'Directory Exists' : 'Directory Missing'}
                      {inspection.baseDirectory.isWritable && ' (Writable)'}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Folder size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={config.ansibleDirectory}
                    onChange={(e) => setConfig({ ...config, ansibleDirectory: e.target.value })}
                    placeholder="./ (Current Project Root) or /etc/ansible"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400">Directory presets:</span>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, ansibleDirectory: '.' })}
                    className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold"
                  >
                    . (Current App Root)
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, ansibleDirectory: '/etc/ansible' })}
                    className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold"
                  >
                    /etc/ansible (System Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, ansibleDirectory: '/opt/ansible' })}
                    className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold"
                  >
                    /opt/ansible
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, ansibleDirectory: '/workspace/ansible' })}
                    className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold"
                  >
                    /workspace/ansible
                  </button>
                </div>

                {inspection?.baseDirectory.resolved && (
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    Resolved Absolute Path: <span className="text-slate-600">{inspection.baseDirectory.resolved}</span>
                  </p>
                )}
              </div>

              {/* Subdirectories Grid: Playbooks, Roles, Inventory, Vars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Playbooks Directory */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Playbooks Directory
                  </label>
                  <div className="relative">
                    <FileCode size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={config.playbooksDir}
                      onChange={(e) => setConfig({ ...config, playbooksDir: e.target.value })}
                      placeholder="playbooks"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Relative to base directory (contains *.yml playbooks)</span>
                </div>

                {/* Roles Directory */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Roles Directory (`roles_path`)
                  </label>
                  <div className="relative">
                    <Layers size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={config.rolesDir}
                      onChange={(e) => setConfig({ ...config, rolesDir: e.target.value })}
                      placeholder="roles"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Contains modular roles, handlers, templates</span>
                </div>

                {/* Group Vars Directory */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Group Variables Directory (`group_vars`)
                  </label>
                  <input
                    type="text"
                    value={config.groupVarsDir}
                    onChange={(e) => setConfig({ ...config, groupVarsDir: e.target.value })}
                    placeholder="group_vars"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Stores group-specific YAML variables</span>
                </div>

                {/* Host Vars Directory */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Host Variables Directory (`host_vars`)
                  </label>
                  <input
                    type="text"
                    value={config.hostVarsDir}
                    onChange={(e) => setConfig({ ...config, hostVarsDir: e.target.value })}
                    placeholder="host_vars"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Stores target host override variables</span>
                </div>
              </div>

              {/* Collections Paths */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Collections Path (`collections_paths`)
                </label>
                <input
                  type="text"
                  value={config.collectionsDir}
                  onChange={(e) => setConfig({ ...config, collectionsDir: e.target.value })}
                  placeholder="collections"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Installed Ansible Galaxy collections and partner modules</span>
              </div>
            </div>

            {/* Live Directory Health Map */}
            {inspection && inspection.subdirectories && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FolderCheck size={15} className="text-emerald-600" />
                    <span>Live Directory Structure & Contents</span>
                  </span>
                  <span className="text-[10px] text-slate-400">On-disk verification</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {inspection.subdirectories.map((dir, idx) => (
                    <div 
                      key={idx}
                      className={`p-3 rounded-xl border text-xs transition-all ${
                        dir.exists ? 'bg-slate-50/70 border-slate-200' : 'bg-amber-50/50 border-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800 truncate">{dir.name}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                          dir.exists ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {dir.exists ? `${dir.itemCount} items` : 'Missing'}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-slate-500 truncate">{dir.path}</p>
                      {dir.items && dir.items.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {dir.items.slice(0, 3).map((file, fIdx) => (
                            <span key={fIdx} className="text-[9px] font-mono px-1 bg-white border border-slate-200 rounded text-slate-600">
                              {file}
                            </span>
                          ))}
                          {dir.items.length > 3 && (
                            <span className="text-[9px] text-slate-400">+{dir.items.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Group 2: Executable Binary & Inventory Mapping */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Terminal size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">Ansible Executables & Inventory File</h3>
                <p className="text-[11px] text-slate-500">Binary execution paths and active host inventory location</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Ansible Playbook Location */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ansible Playbook Binary Location <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Terminal size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={config.ansibleLocation}
                    onChange={(e) => setConfig({ ...config, ansibleLocation: e.target.value })}
                    placeholder="/usr/bin/ansible-playbook"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-slate-400">Quick presets:</span>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, ansibleLocation: '/usr/bin/ansible-playbook' })}
                    className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md font-semibold"
                  >
                    /usr/bin/ansible-playbook
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, ansibleLocation: '/usr/local/bin/ansible-playbook' })}
                    className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md font-semibold"
                  >
                    /usr/local/bin/ansible-playbook
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, ansibleLocation: 'ansible-playbook' })}
                    className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md font-semibold"
                  >
                    $PATH
                  </button>
                </div>
              </div>

              {/* Inventory File */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Inventory File Location <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowInventoryEditor(!showInventoryEditor)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                  >
                    <FileText size={13} />
                    <span>{showInventoryEditor ? 'Hide Inventory Editor' : 'Inspect / Edit Inventory File'}</span>
                  </button>
                </div>
                <div className="relative">
                  <Server size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={config.inventoryFile}
                    onChange={(e) => setConfig({ ...config, inventoryFile: e.target.value })}
                    placeholder="inventory/hosts.ini or /etc/ansible/hosts"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-slate-400">Common files:</span>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, inventoryFile: 'inventory/hosts.ini' })}
                    className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md font-semibold"
                  >
                    inventory/hosts.ini
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, inventoryFile: 'inventory/hosts.yml' })}
                    className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md font-semibold"
                  >
                    inventory/hosts.yml
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, inventoryFile: '/etc/ansible/hosts' })}
                    className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md font-semibold"
                  >
                    /etc/ansible/hosts
                  </button>
                </div>
              </div>

              {/* Inline Inventory Editor Drawer */}
              {showInventoryEditor && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <FileCode size={16} className="text-blue-400" />
                      <span className="text-xs font-mono font-bold">{config.inventoryFile}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-md">
                        {inventoryStats.hostsCount} hosts identified
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveInventory}
                      disabled={isSavingInventory}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {isSavingInventory ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                      <span>Save Inventory File</span>
                    </button>
                  </div>
                  <textarea
                    value={inventoryContent}
                    onChange={(e) => setInventoryContent(e.target.value)}
                    rows={8}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Active Groups: {inventoryStats.groups.join(', ') || 'None detected'}</span>
                    <button
                      type="button"
                      onClick={fetchInventory}
                      className="hover:text-white flex items-center gap-1"
                    >
                      <RefreshCw size={11} /> Re-read from disk
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Config File Path */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ansible Configuration File (`ansible.cfg`)
                </label>
                <input
                  type="text"
                  value={config.configFilePath}
                  onChange={(e) => setConfig({ ...config, configFilePath: e.target.value })}
                  placeholder="./ansible.cfg"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  When saved, settings are automatically compiled and synchronized to this configuration file on disk.
                </p>
              </div>
            </div>
          </div>

          {/* Group 3: SSH Connection & Authentication */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Key size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">SSH Connection & Remote Credentials</h3>
                <p className="text-[11px] text-slate-500">Configure default SSH user, private keys, port, and connection timeouts</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Default Remote SSH User
                </label>
                <input
                  type="text"
                  value={config.remoteUser}
                  onChange={(e) => setConfig({ ...config, remoteUser: e.target.value })}
                  placeholder="ansible or root"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  SSH Private Key Location
                </label>
                <input
                  type="text"
                  value={config.privateKeyFile}
                  onChange={(e) => setConfig({ ...config, privateKeyFile: e.target.value })}
                  placeholder="~/.ssh/id_rsa"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  SSH Port
                </label>
                <input
                  type="number"
                  value={config.sshPort}
                  onChange={(e) => setConfig({ ...config, sshPort: parseInt(e.target.value) || 22 })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Connection Timeout (Seconds)
                </label>
                <input
                  type="number"
                  value={config.timeout}
                  onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) || 30 })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-2xl cursor-pointer transition-colors">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-900 block">Strict Host Key Checking</span>
                  <span className="text-[11px] text-slate-500">
                    When disabled (recommended for dynamic cloud environments), Ansible connects without prompt for known hosts.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.hostKeyChecking}
                  onChange={(e) => setConfig({ ...config, hostKeyChecking: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
              </label>
            </div>
          </div>

          {/* Group 4: Privilege Escalation (Become) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <Shield size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">Privilege Escalation (`become`)</h3>
                <p className="text-[11px] text-slate-500">Manage elevated execution, sudo escalation, and root target parameters</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-2xl cursor-pointer transition-colors">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-900 block">Enable Privilege Escalation (`become: true`)</span>
                  <span className="text-[11px] text-slate-500">
                    Automatically escalate permissions on remote targets when running security & baseline playbooks.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.become}
                  onChange={(e) => setConfig({ ...config, become: e.target.checked })}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                />
              </label>

              {config.become && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Become Method
                    </label>
                    <select
                      value={config.becomeMethod}
                      onChange={(e) => setConfig({ ...config, becomeMethod: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                    >
                      <option value="sudo">sudo</option>
                      <option value="su">su</option>
                      <option value="pbrun">pbrun</option>
                      <option value="pfexec">pfexec</option>
                      <option value="doas">doas</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Become User
                    </label>
                    <input
                      type="text"
                      value={config.becomeUser}
                      onChange={(e) => setConfig({ ...config, becomeUser: e.target.value })}
                      placeholder="root"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Execution Parameters & Diagnostics (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Performance & Execution Tuning */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Sliders size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">Runtime & Performance</h3>
                <p className="text-[11px] text-slate-500">Execution concurrency & speed</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Forks Slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Forks (Concurrency)</label>
                  <span className="text-xs font-mono font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {config.forks} hosts
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={config.forks}
                  onChange={(e) => setConfig({ ...config, forks: parseInt(e.target.value) || 5 })}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>1 (Sequential)</span>
                  <span>25 (Fleet)</span>
                  <span>50 (High)</span>
                </div>
              </div>

              {/* Pipelining Toggle */}
              <label className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl cursor-pointer transition-colors">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-900 block">SSH Pipelining</span>
                  <span className="text-[10px] text-slate-500">Reduces roundtrips by 60%+</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.pipelining}
                  onChange={(e) => setConfig({ ...config, pipelining: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
              </label>

              {/* Verbosity Level */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Output Verbosity
                </label>
                <select
                  value={config.verbosity}
                  onChange={(e) => setConfig({ ...config, verbosity: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="default">Default (Standard concise output)</option>
                  <option value="-v">-v (Verbose task outputs)</option>
                  <option value="-vv">-vv (Detailed task & handler results)</option>
                  <option value="-vvv">-vvv (Connection debug & SSH packets)</option>
                  <option value="-vvvv">-vvvv (Trace / raw socket communication)</option>
                </select>
              </div>

              {/* Vault Password File */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ansible Vault Password File
                </label>
                <input
                  type="text"
                  value={config.vaultPasswordFile}
                  onChange={(e) => setConfig({ ...config, vaultPasswordFile: e.target.value })}
                  placeholder=".vault_pass"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Log File Destination */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ansible Run Log Path
                </label>
                <input
                  type="text"
                  value={config.logPath}
                  onChange={(e) => setConfig({ ...config, logPath: e.target.value })}
                  placeholder="logs/ansible.log"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Quick CLI Syntax Reference Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md space-y-4">
            <div className="flex items-center gap-2">
              <Terminal size={18} className="text-indigo-400" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300">Ansible CLI Syntax Reference</h4>
            </div>

            <div className="space-y-2 text-[11px] font-mono text-slate-300 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
              <p className="text-slate-400"># Run playbook against fleet:</p>
              <p className="text-emerald-400">$ ansible-playbook -i {config.inventoryFile} {config.playbooksDir}/system-baseline.yml</p>
              <div className="my-2 border-t border-slate-800" />
              <p className="text-slate-400"># Ad-hoc ping test all hosts:</p>
              <p className="text-blue-400">$ ansible all -i {config.inventoryFile} -m ping</p>
            </div>

            <div className="text-[11px] text-slate-400 leading-relaxed">
              When dispatched from Devops Studio, all executions respect these directory parameters and settings, logs stream to Execution Runs, and CIS benchmark scores update automatically.
            </div>
          </div>
        </div>
      </div>

      {/* LIVE ANSIBLE.CFG MODAL VIEWER */}
      <AnimatePresence>
        {showCfgModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 text-white border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
                    <Code size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Live Compiled ansible.cfg</h3>
                    <p className="text-[11px] text-slate-400 font-mono truncate max-w-md">{cfgData.path || './ansible.cfg'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(cfgData.content, 'cfg_modal_content')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors"
                  >
                    {copiedKey === 'cfg_modal_content' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copiedKey === 'cfg_modal_content' ? 'Copied' : 'Copy INI'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCfgModal(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors text-lg font-bold"
                  >
                    &times;
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-5 overflow-y-auto font-mono text-xs text-emerald-400 bg-slate-950 leading-relaxed flex-1">
                {isLoadingCfg ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Loading configuration file from disk...</span>
                  </div>
                ) : cfgData.content ? (
                  <pre className="whitespace-pre-wrap">{cfgData.content}</pre>
                ) : (
                  <div className="text-slate-500 py-8 text-center">
                    No ansible.cfg file found at the configured location. Click "Save Changes" to compile and generate it.
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Synchronized automatically on every save</span>
                <button
                  type="button"
                  onClick={() => setShowCfgModal(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
