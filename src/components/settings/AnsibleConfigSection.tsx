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
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

  // Load configuration and directory inspection on mount
  useEffect(() => {
    fetchConfig();
    fetchInventory();
    fetchDirectoryInspection();
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
              <p className="text-[11px] text-slate-500">Base working directory, inventory mapping, SSH credentials & storage architecture</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
      </div>

      {/* SECTION 1: WHERE IS THE ANSIBLE CONFIGURATION STORED? (Storage Architecture Inspector) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white border border-slate-800 rounded-3xl p-6 shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30">
              <Database size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-tight">Where is Ansible Configuration Stored?</h3>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold rounded-md uppercase tracking-wider">
                  Storage Architecture
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Devops Studio uses a dual-layer persistence system: UI parameters persist in JSON, while native INI files are compiled for CLI execution.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleViewCfg}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Eye size={14} />
              <span>Inspect Live ansible.cfg</span>
            </button>
          </div>
        </div>

        {/* 5 Distinct Storage Locations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* 1. App Settings JSON */}
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl space-y-2 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold rounded border border-amber-500/30">
                JSON STATE
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle size={12} /> Active Store
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Application Settings File</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                Stores all UI parameter state, binary locations, custom directories, SSH credentials, and become method.
              </p>
            </div>
            <div className="flex items-center justify-between bg-slate-900 p-2 rounded-xl border border-slate-800 text-[11px] font-mono text-amber-300">
              <span className="truncate">logs/ansible_settings.json</span>
              <button
                type="button"
                onClick={() => copyToClipboard('logs/ansible_settings.json', 'settings_json')}
                className="text-slate-400 hover:text-white p-1"
                title="Copy relative path"
              >
                {copiedKey === 'settings_json' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          {/* 2. Standard ansible.cfg */}
          <div className="bg-slate-950/60 border border-blue-900/40 p-4 rounded-2xl space-y-2 hover:border-blue-700/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold rounded border border-blue-500/30">
                INI NATIVE
              </span>
              <span className="text-[10px] text-blue-400 font-semibold flex items-center gap-1">
                <RefreshCw size={12} /> Auto-Synchronized
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Native Ansible CLI Config (ansible.cfg)</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                The standard INI file read directly by CLI commands (<code className="text-blue-300">ansible</code>, <code className="text-blue-300">ansible-playbook</code>). Compiled on every save.
              </p>
            </div>
            <div className="flex items-center justify-between bg-slate-900 p-2 rounded-xl border border-slate-800 text-[11px] font-mono text-blue-300">
              <span className="truncate">{config.configFilePath || './ansible.cfg'}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(config.configFilePath || './ansible.cfg', 'ansible_cfg')}
                className="text-slate-400 hover:text-white p-1"
                title="Copy path"
              >
                {copiedKey === 'ansible_cfg' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          {/* 3. Inventory File */}
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl space-y-2 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold rounded border border-emerald-500/30">
                HOSTS & GROUPS
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">
                {inventoryStats.hostsCount} hosts registered
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Target Inventory Store</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                Target hosts, environment mappings (<code className="text-emerald-300">[webservers]</code>, <code className="text-emerald-300">[databases]</code>), and host connection vars.
              </p>
            </div>
            <div className="flex items-center justify-between bg-slate-900 p-2 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-300">
              <span className="truncate">{config.inventoryFile}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(config.inventoryFile, 'inventory_file')}
                className="text-slate-400 hover:text-white p-1"
                title="Copy path"
              >
                {copiedKey === 'inventory_file' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          {/* 4. Playbooks & Roles Folders */}
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl space-y-2 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold rounded border border-purple-500/30">
                AUTOMATION DIRECTORIES
              </span>
              <span className="text-[10px] text-purple-400 font-semibold">YAML Workflows</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Playbooks & Roles Repositories</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                Playbook manifest files in <code className="text-purple-300">{config.playbooksDir}/</code> and modular task handlers in <code className="text-purple-300">{config.rolesDir}/</code>.
              </p>
            </div>
            <div className="flex items-center justify-between bg-slate-900 p-2 rounded-xl border border-slate-800 text-[11px] font-mono text-purple-300">
              <span className="truncate">{config.ansibleDirectory}/{config.playbooksDir}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(`${config.ansibleDirectory}/${config.playbooksDir}`, 'playbooks_dir')}
                className="text-slate-400 hover:text-white p-1"
                title="Copy path"
              >
                {copiedKey === 'playbooks_dir' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          {/* 5. Execution Telemetry & Logs */}
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl space-y-2 hover:border-slate-700 transition-all md:col-span-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold rounded border border-rose-500/30">
                AUDIT & TELEMETRY
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">Real-time Stream & History</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Execution Logs & Runs Database</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                Raw terminal standard output is appended to <code className="text-rose-300">{config.logPath}</code>, while execution runs and CIS compliance benchmark results persist to <code className="text-rose-300">logs/execution_runs.json</code>.
              </p>
            </div>
            <div className="flex items-center justify-between bg-slate-900 p-2 rounded-xl border border-slate-800 text-[11px] font-mono text-rose-300">
              <span className="truncate">{config.logPath} &bull; logs/execution_runs.json</span>
              <button
                type="button"
                onClick={() => copyToClipboard(config.logPath, 'log_path')}
                className="text-slate-400 hover:text-white p-1"
                title="Copy path"
              >
                {copiedKey === 'log_path' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
            </div>
          </div>
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
