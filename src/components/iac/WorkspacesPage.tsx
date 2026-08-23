/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Lock,
  Unlock,
  FolderGit2,
  GitBranch,
  RotateCw,
  Edit2,
  Trash2,
  Play,
  Terminal,
  ShieldCheck,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Eye,
  EyeOff,
  Code2,
  KeyRound,
  FileCode,
  Layers,
  Upload,
  Download,
  Copy,
  Check,
  Settings,
  X,
  Server,
  Cloud,
  ChevronRight,
  Info
} from 'lucide-react';
import { IaCWorkspace, IaCVariable, GitRepoConfig } from '../../types/iac';
import { loadWorkspaces, saveWorkspaces, loadActiveWorkspaceId, saveActiveWorkspaceId } from '../../data/iacStore';

interface WorkspacesPageProps {
  onNavigateToPlan?: (workspaceId: string) => void;
  onNavigateToSecurity?: (workspaceId: string) => void;
  onNavigateToCost?: (workspaceId: string) => void;
}

export default function WorkspacesPage({
  onNavigateToPlan,
  onNavigateToSecurity,
  onNavigateToCost
}: WorkspacesPageProps) {
  const [workspaces, setWorkspaces] = useState<IaCWorkspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [envFilter, setEnvFilter] = useState<string>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workspaceToEdit, setWorkspaceToEdit] = useState<IaCWorkspace | null>(null);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<IaCWorkspace | null>(null);

  // Active drawer / detail view tabs: 'overview' | 'git' | 'variables' | 'backend'
  const [detailTab, setDetailTab] = useState<'overview' | 'git' | 'variables' | 'backend'>('overview');
  
  // Variables sub-tab & search inside workspace drawer
  const [varCategoryFilter, setVarCategoryFilter] = useState<'all' | 'terraform' | 'environment'>('all');
  const [showNewVarForm, setShowNewVarForm] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [newVarData, setNewVarData] = useState<Partial<IaCVariable>>({
    key: '',
    value: '',
    category: 'terraform',
    hcl: false,
    sensitive: false,
    description: ''
  });

  // Git sync simulation state
  const [isSyncingGit, setIsSyncingGit] = useState<Record<string, boolean>>({});
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Load from store on mount
  useEffect(() => {
    const loaded = loadWorkspaces();
    setWorkspaces(loaded);
    const activeId = loadActiveWorkspaceId();
    if (loaded.find(w => w.id === activeId)) {
      setSelectedWorkspaceId(activeId);
    } else if (loaded.length > 0) {
      setSelectedWorkspaceId(loaded[0].id);
    }
  }, []);

  const handleSelectWorkspace = (id: string) => {
    setSelectedWorkspaceId(id);
    saveActiveWorkspaceId(id);
  };

  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId) || workspaces[0];

  // Helper to persist changes
  const updateWorkspaces = (updated: IaCWorkspace[]) => {
    setWorkspaces(updated);
    saveWorkspaces(updated);
  };

  // Toggle State Lock
  const handleToggleLock = (workspaceId: string) => {
    const updated = workspaces.map(w => {
      if (w.id === workspaceId) {
        const nextLock = !w.isLocked;
        return {
          ...w,
          isLocked: nextLock,
          lockDetails: nextLock ? {
            lockedBy: 'DevOps Engineer (Console User)',
            lockedAt: new Date().toISOString(),
            lockId: `lock-manual-${Math.random().toString(36).substring(2, 8)}`
          } : undefined,
          updatedAt: new Date().toISOString()
        };
      }
      return w;
    });
    updateWorkspaces(updated);
  };

  // 1-Click Git Pull / Sync
  const handleSyncGit = (workspaceId: string) => {
    setIsSyncingGit(prev => ({ ...prev, [workspaceId]: true }));
    setTimeout(() => {
      const updated = workspaces.map(w => {
        if (w.id === workspaceId) {
          return {
            ...w,
            gitConfig: {
              ...w.gitConfig,
              syncStatus: 'synced' as const,
              lastSyncedAt: 'Just now',
              lastCommitHash: Math.random().toString(36).substring(2, 9),
              lastCommitDate: 'Just now'
            },
            updatedAt: new Date().toISOString()
          };
        }
        return w;
      });
      updateWorkspaces(updated);
      setIsSyncingGit(prev => ({ ...prev, [workspaceId]: false }));
    }, 1200);
  };

  // Delete Workspace
  const handleConfirmDelete = () => {
    if (!workspaceToDelete) return;
    const updated = workspaces.filter(w => w.id !== workspaceToDelete.id);
    updateWorkspaces(updated);
    if (selectedWorkspaceId === workspaceToDelete.id) {
      if (updated.length > 0) {
        setSelectedWorkspaceId(updated[0].id);
        saveActiveWorkspaceId(updated[0].id);
      }
    }
    setShowDeleteModal(false);
    setWorkspaceToDelete(null);
  };

  // Variable Management Handlers
  const handleAddVariable = () => {
    if (!newVarData.key || !selectedWorkspace) return;
    const newVar: IaCVariable = {
      id: `var-${Date.now()}`,
      key: newVarData.key.trim(),
      value: newVarData.value || '',
      category: newVarData.category || 'terraform',
      hcl: !!newVarData.hcl,
      sensitive: !!newVarData.sensitive,
      description: newVarData.description || '',
      createdAt: new Date().toISOString()
    };

    const updated = workspaces.map(w => {
      if (w.id === selectedWorkspace.id) {
        return {
          ...w,
          variables: [...w.variables, newVar],
          updatedAt: new Date().toISOString()
        };
      }
      return w;
    });

    updateWorkspaces(updated);
    setNewVarData({
      key: '',
      value: '',
      category: 'terraform',
      hcl: false,
      sensitive: false,
      description: ''
    });
    setShowNewVarForm(false);
  };

  const handleDeleteVariable = (varId: string) => {
    if (!selectedWorkspace) return;
    const updated = workspaces.map(w => {
      if (w.id === selectedWorkspace.id) {
        return {
          ...w,
          variables: w.variables.filter(v => v.id !== varId),
          updatedAt: new Date().toISOString()
        };
      }
      return w;
    });
    updateWorkspaces(updated);
  };

  const handleExportVariables = (format: 'tfvars' | 'env') => {
    if (!selectedWorkspace) return;
    let text = '';
    if (format === 'tfvars') {
      text = `# Terraform Variables (.tfvars) for Workspace: ${selectedWorkspace.name}\n`;
      selectedWorkspace.variables
        .filter(v => v.category === 'terraform')
        .forEach(v => {
          if (v.description) text += `# ${v.description}\n`;
          if (v.hcl) {
            text += `${v.key} = ${v.value}\n\n`;
          } else {
            text += `${v.key} = "${v.value}"\n\n`;
          }
        });
    } else {
      text = `# Environment Variables (.env) for Workspace: ${selectedWorkspace.name}\n`;
      selectedWorkspace.variables
        .filter(v => v.category === 'environment')
        .forEach(v => {
          if (v.description) text += `# ${v.description}\n`;
          text += `${v.key}="${v.value}"\n`;
        });
    }

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = format === 'tfvars' ? `${selectedWorkspace.name}.terraform.tfvars` : `${selectedWorkspace.name}.env`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered workspaces
  const filteredWorkspaces = workspaces.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.gitConfig.repoName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesProvider = providerFilter === 'all' || w.provider.toLowerCase() === providerFilter.toLowerCase();
    const matchesEnv = envFilter === 'all' || w.environment.toLowerCase() === envFilter.toLowerCase();

    return matchesSearch && matchesProvider && matchesEnv;
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner Overview */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-600 text-white flex items-center justify-center shadow-lg shadow-cyan-600/20 shrink-0">
              <Boxes size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-700 bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded-md">
                  IaC Workspace Hub
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400">Terraform &bull; OpenTofu &bull; GitOps</span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">Workspaces &amp; Terraform Stacks</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Manage cloud state backends, multi-cloud Terraform workspaces, per-workspace Git repositories, and scoped environment variables.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-cyan-600/20 flex items-center gap-2"
            >
              <Plus size={15} />
              <span>New Workspace</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Workspaces</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{workspaces.length}</div>
            <span className="text-[11px] font-medium text-slate-500">Configured &amp; Active</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Git-Integrated</span>
            <div className="text-2xl font-black text-indigo-600 mt-1">
              {workspaces.filter(w => w.gitConfig?.repoUrl).length}
            </div>
            <span className="text-[11px] font-medium text-indigo-700">GitHub &amp; GitLab Repos</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Managed Cloud Resources</span>
            <div className="text-2xl font-black text-cyan-600 mt-1">
              {workspaces.reduce((sum, w) => sum + (w.resourceCount || 0), 0)}
            </div>
            <span className="text-[11px] font-medium text-cyan-700">Tracked in Remote State</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monthly Projected Spend</span>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
              ${workspaces.reduce((sum, w) => sum + (w.monthlyCost || 0), 0).toFixed(2)}
            </div>
            <span className="text-[11px] font-medium text-slate-500">Infracost Live Estimates</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Workspaces List (Left) + Detailed Workspace Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Workspaces List & Filters (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search workspaces, repos, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="all">All Providers</option>
                <option value="aws">AWS</option>
                <option value="gcp">GCP</option>
                <option value="azure">Azure</option>
                <option value="kubernetes">Kubernetes</option>
              </select>

              <select
                value={envFilter}
                onChange={(e) => setEnvFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="all">All Environments</option>
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
                <option value="sandbox">Sandbox</option>
              </select>
            </div>
          </div>

          {/* Workspaces List Cards */}
          <div className="space-y-3">
            {filteredWorkspaces.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
                <Boxes size={32} className="mx-auto mb-2 opacity-40 text-slate-500" />
                <p className="text-xs font-medium">No workspaces match your filters.</p>
              </div>
            ) : (
              filteredWorkspaces.map(ws => {
                const isSelected = selectedWorkspaceId === ws.id;
                return (
                  <div
                    key={ws.id}
                    onClick={() => handleSelectWorkspace(ws.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white shadow-sm hover:shadow-md relative ${
                      isSelected
                        ? 'border-cyan-500 ring-2 ring-cyan-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">{ws.name}</span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                            ws.environment === 'production' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            ws.environment === 'staging' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {ws.environment}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-1 font-medium">{ws.description}</div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {ws.isLocked && (
                          <span className="p-1 rounded bg-rose-50 text-rose-600 border border-rose-200" title="State Locked">
                            <Lock size={12} />
                          </span>
                        )}
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">
                          {ws.provider}
                        </span>
                      </div>
                    </div>

                    {/* Git Repo Tag */}
                    {ws.gitConfig && (
                      <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                        <span className="flex items-center gap-1.5 truncate">
                          <FolderGit2 size={12} className="text-indigo-600 shrink-0" />
                          <span className="font-bold text-slate-700 truncate">{ws.gitConfig.repoName}</span>
                          <span className="text-slate-400">@</span>
                          <span className="text-indigo-700 font-bold">{ws.gitConfig.branch}</span>
                        </span>
                        <span className="text-[9px] text-slate-400 shrink-0">{ws.gitConfig.lastCommitHash}</span>
                      </div>
                    )}

                    {/* Metadata Footer */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{ws.resourceCount} resources &bull; {ws.variables.length} vars</span>
                      <span className="font-bold text-slate-700">${ws.monthlyCost.toFixed(0)}/mo</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Workspace Inspector (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedWorkspace ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              
              {/* Header with Title, Actions, Lock Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 font-mono">{selectedWorkspace.name}</h3>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                      selectedWorkspace.environment === 'production' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      selectedWorkspace.environment === 'staging' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {selectedWorkspace.environment}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-cyan-50 text-cyan-800 border border-cyan-100 rounded">
                      TF {selectedWorkspace.terraformVersion}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">{selectedWorkspace.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleLock(selectedWorkspace.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                      selectedWorkspace.isLocked
                        ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                    title={selectedWorkspace.isLocked ? 'Unlock State' : 'Lock State Backend'}
                  >
                    {selectedWorkspace.isLocked ? <Lock size={13} className="text-rose-600" /> : <Unlock size={13} />}
                    <span>{selectedWorkspace.isLocked ? 'State Locked' : 'Unlocked'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setWorkspaceToEdit(selectedWorkspace);
                      setShowEditModal(true);
                    }}
                    className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold transition-all"
                    title="Edit Workspace Configuration"
                  >
                    <Edit2 size={14} />
                  </button>

                  <button
                    onClick={() => {
                      setWorkspaceToDelete(selectedWorkspace);
                      setShowDeleteModal(true);
                    }}
                    className="p-2 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition-all"
                    title="Delete Workspace"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Tabs Navigation in Inspector */}
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                {[
                  { id: 'overview', label: 'Overview & Metrics', icon: <Layers size={14} /> },
                  { id: 'git', label: 'Git Repository & Branch', icon: <FolderGit2 size={14} /> },
                  { id: 'variables', label: `Variables & .tfvars (${selectedWorkspace.variables.length})`, icon: <KeyRound size={14} /> },
                  { id: 'backend', label: 'State Backend', icon: <Server size={14} /> }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setDetailTab(t.id as any)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      detailTab === t.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              {/* TAB 1: OVERVIEW */}
              {detailTab === 'overview' && (
                <div className="space-y-6">
                  {/* Quick Action Navigation Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={() => onNavigateToPlan && onNavigateToPlan(selectedWorkspace.id)}
                      className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-left transition-all group flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
                          <Terminal size={16} />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 group-hover:text-cyan-700">Speculative Plan</div>
                          <div className="text-[10px] text-slate-400">Terraform CLI Engine</div>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <button
                      onClick={() => onNavigateToSecurity && onNavigateToSecurity(selectedWorkspace.id)}
                      className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-left transition-all group flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <ShieldCheck size={16} />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 group-hover:text-emerald-700">Policy Security</div>
                          <div className="text-[10px] text-slate-400">Checkov &amp; tfsec Gates</div>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <button
                      onClick={() => onNavigateToCost && onNavigateToCost(selectedWorkspace.id)}
                      className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-left transition-all group flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                          <DollarSign size={16} />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 group-hover:text-amber-700">Infracost Budget</div>
                          <div className="text-[10px] text-slate-400">${selectedWorkspace.monthlyCost.toFixed(0)}/month</div>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>

                  {/* Overview Grid Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Target Provider</span>
                      <div className="font-bold text-slate-800 text-sm mt-1">{selectedWorkspace.provider}</div>
                      <span className="text-[10px] text-slate-400">Cloud Platform</span>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Managed Resources</span>
                      <div className="font-bold text-cyan-700 text-sm mt-1">{selectedWorkspace.resourceCount}</div>
                      <span className="text-[10px] text-slate-400">In Remote State</span>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Last Applied</span>
                      <div className="font-bold text-slate-800 text-sm mt-1">{selectedWorkspace.lastApplied}</div>
                      <span className="text-[10px] text-slate-400">Status: {selectedWorkspace.lastPlanStatus}</span>
                    </div>
                  </div>

                  {/* Tags Pill Container */}
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Workspace Tags</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedWorkspace.tags.map(tag => (
                        <span key={tag} className="text-[11px] font-mono px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: GIT REPOSITORY & GITOPS */}
              {detailTab === 'git' && (
                <div className="space-y-5">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderGit2 size={18} className="text-indigo-600" />
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                          {selectedWorkspace.gitConfig.provider.toUpperCase()} Integration
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Synced
                        </span>
                      </div>

                      <button
                        onClick={() => handleSyncGit(selectedWorkspace.id)}
                        disabled={isSyncingGit[selectedWorkspace.id]}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <RotateCw size={12} className={isSyncingGit[selectedWorkspace.id] ? 'animate-spin' : ''} />
                        <span>{isSyncingGit[selectedWorkspace.id] ? 'Pulling from Git...' : 'Pull Latest Commits'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Repository URL</span>
                        <div className="font-bold text-slate-800 break-all mt-0.5">{selectedWorkspace.gitConfig.repoUrl}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Branch</span>
                        <div className="font-bold text-indigo-700 mt-0.5 flex items-center gap-1">
                          <GitBranch size={12} />
                          {selectedWorkspace.gitConfig.branch}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Working Directory</span>
                        <div className="font-bold text-slate-800 mt-0.5">{selectedWorkspace.gitConfig.workingDirectory || './'}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Auth Credential</span>
                        <div className="font-bold text-slate-800 mt-0.5">
                          {selectedWorkspace.gitConfig.authType === 'pat' ? 'Personal Access Token (PAT)' : 'Deploy Key (SSH)'}
                        </div>
                      </div>
                    </div>

                    {/* Latest Commit Details Card */}
                    <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-indigo-600">
                          Commit {selectedWorkspace.gitConfig.lastCommitHash}
                        </span>
                        <span className="text-[10px] text-slate-400">{selectedWorkspace.gitConfig.lastCommitDate}</span>
                      </div>
                      <div className="text-slate-800 font-medium text-xs">{selectedWorkspace.gitConfig.lastCommitMessage}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Author: {selectedWorkspace.gitConfig.lastCommitAuthor}</div>
                    </div>
                  </div>

                  {/* Webhook Configuration Card */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Continuous GitOps Webhook</h4>
                        <p className="text-[11px] text-slate-500">Automatically trigger speculative plans on Pull Requests &amp; commits.</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Webhook Payload URL</div>
                      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 font-mono text-[11px] text-slate-800">
                        <span className="truncate flex-1">
                          https://devsecops.enterprise.internal/api/v1/iac/webhooks/{selectedWorkspace.id}
                        </span>
                        <button
                          onClick={() => copyToClipboard(`https://devsecops.enterprise.internal/api/v1/iac/webhooks/${selectedWorkspace.id}`, 'webhook')}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold shrink-0 flex items-center gap-1"
                        >
                          {copiedText === 'webhook' ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedText === 'webhook' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: VARIABLES & .TFVARS */}
              {detailTab === 'variables' && (
                <div className="space-y-4">
                  {/* Top Toolbar: Filters, Add Variable, Export */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                      {[
                        { id: 'all', label: 'All Vars' },
                        { id: 'terraform', label: 'Terraform (.tfvars)' },
                        { id: 'environment', label: 'Environment (ENV)' }
                      ].map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setVarCategoryFilter(cat.id as any)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            varCategoryFilter === cat.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExportVariables('tfvars')}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-slate-200"
                        title="Download terraform.tfvars"
                      >
                        <Download size={12} />
                        <span>.tfvars</span>
                      </button>
                      <button
                        onClick={() => handleExportVariables('env')}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-slate-200"
                        title="Download .env"
                      >
                        <Download size={12} />
                        <span>.env</span>
                      </button>
                      <button
                        onClick={() => setShowNewVarForm(true)}
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                      >
                        <Plus size={13} />
                        <span>Add Variable</span>
                      </button>
                    </div>
                  </div>

                  {/* Add Variable Form Drawer */}
                  <AnimatePresence>
                    {showNewVarForm && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-cyan-50/70 border border-cyan-200 rounded-2xl p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-extrabold text-cyan-900 uppercase tracking-wider">New Workspace Variable</h4>
                          <button onClick={() => setShowNewVarForm(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={14} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold uppercase text-slate-600">Key Name</label>
                            <input
                              type="text"
                              placeholder="e.g. cluster_name or AWS_REGION"
                              value={newVarData.key || ''}
                              onChange={(e) => setNewVarData({ ...newVarData, key: e.target.value })}
                              className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold uppercase text-slate-600">Category</label>
                            <select
                              value={newVarData.category || 'terraform'}
                              onChange={(e) => setNewVarData({ ...newVarData, category: e.target.value as any })}
                              className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
                            >
                              <option value="terraform">Terraform Variable (HCL / .tfvars)</option>
                              <option value="environment">Environment Variable (TF_VAR_* / Cloud Envs)</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-600">Value</label>
                          <textarea
                            rows={2}
                            placeholder='e.g. "prod-cluster-01" or ["us-east-1a", "us-east-1b"]'
                            value={newVarData.value || ''}
                            onChange={(e) => setNewVarData({ ...newVarData, value: e.target.value })}
                            className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-600">Description (Optional)</label>
                          <input
                            type="text"
                            placeholder="Brief purpose of this variable..."
                            value={newVarData.description || ''}
                            onChange={(e) => setNewVarData({ ...newVarData, description: e.target.value })}
                            className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!newVarData.hcl}
                                onChange={(e) => setNewVarData({ ...newVarData, hcl: e.target.checked })}
                                className="rounded text-cyan-600 focus:ring-cyan-500"
                              />
                              <span>HCL Object/Array</span>
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!newVarData.sensitive}
                                onChange={(e) => setNewVarData({ ...newVarData, sensitive: e.target.checked })}
                                className="rounded text-cyan-600 focus:ring-cyan-500"
                              />
                              <span>Sensitive (Mask in UI/Logs)</span>
                            </label>
                          </div>

                          <button
                            onClick={handleAddVariable}
                            disabled={!newVarData.key}
                            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                          >
                            Save Variable
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Variables Table */}
                  <div className="space-y-2">
                    {selectedWorkspace.variables
                      .filter(v => varCategoryFilter === 'all' || v.category === varCategoryFilter)
                      .map(v => {
                        const isMasked = v.sensitive && !revealedSecrets[v.id];
                        return (
                          <div
                            key={v.id}
                            className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono hover:bg-slate-100/80 transition-colors"
                          >
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{v.key}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                  v.category === 'terraform' ? 'bg-cyan-100 text-cyan-800' : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {v.category === 'terraform' ? 'HCL .tfvars' : 'ENV'}
                                </span>
                                {v.sensitive && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-rose-100 text-rose-700">
                                    Secret
                                  </span>
                                )}
                                {v.hcl && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-slate-200 text-slate-700">
                                    HCL
                                  </span>
                                )}
                              </div>
                              {v.description && (
                                <p className="text-[11px] text-slate-500 font-sans">{v.description}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 text-xs truncate max-w-xs">
                                {isMasked ? '••••••••••••••••' : v.value}
                              </div>

                              {v.sensitive && (
                                <button
                                  onClick={() => setRevealedSecrets(prev => ({ ...prev, [v.id]: !prev[v.id] }))}
                                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white transition-colors"
                                  title={revealedSecrets[v.id] ? 'Hide Secret' : 'Reveal Secret'}
                                >
                                  {revealedSecrets[v.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteVariable(v.id)}
                                className="p-1.5 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
                                title="Delete Variable"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* TAB 4: STATE BACKEND */}
              {detailTab === 'backend' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server size={18} className="text-cyan-600" />
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                        Terraform State Backend Configuration ({selectedWorkspace.stateBackend.type.toUpperCase()})
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                      Lock OK
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-950 text-cyan-200 font-mono text-xs rounded-xl overflow-x-auto leading-relaxed">
                    <pre>
{`terraform {
  backend "${selectedWorkspace.stateBackend.type}" {
    bucket         = "${selectedWorkspace.stateBackend.bucket || 'my-tfstate-bucket'}"
    key            = "${selectedWorkspace.stateBackend.key || 'terraform.tfstate'}"
    region         = "${selectedWorkspace.stateBackend.region || 'us-east-1'}"
    ${selectedWorkspace.stateBackend.lockTable ? `dynamodb_table = "${selectedWorkspace.stateBackend.lockTable}"\n    encrypt        = true` : ''}
  }
}`}
                    </pre>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400">
              <Boxes size={48} className="mx-auto mb-3 opacity-30 text-slate-500" />
              <h3 className="text-base font-bold text-slate-700">Select a Workspace</h3>
              <p className="text-xs text-slate-400 mt-1">Choose a workspace from the left list to view Git repositories, variables, and execution plans.</p>
            </div>
          )}
        </div>

      </div>

      {/* CREATE WORKSPACE MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center">
                    <Plus size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Create Terraform Workspace</h3>
                    <p className="text-xs text-slate-500">Configure cloud target, Git repository, and state backend.</p>
                  </div>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <AddWorkspaceForm
                onCancel={() => setShowAddModal(false)}
                onSubmit={(newWs) => {
                  const updated = [newWs, ...workspaces];
                  updateWorkspaces(updated);
                  setSelectedWorkspaceId(newWs.id);
                  saveActiveWorkspaceId(newWs.id);
                  setShowAddModal(false);
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT WORKSPACE MODAL */}
      <AnimatePresence>
        {showEditModal && workspaceToEdit && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center">
                    <Edit2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Edit Workspace: {workspaceToEdit.name}</h3>
                    <p className="text-xs text-slate-500">Modify workspace properties, Git branches, and state parameters.</p>
                  </div>
                </div>
                <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <EditWorkspaceForm
                workspace={workspaceToEdit}
                onCancel={() => setShowEditModal(false)}
                onSubmit={(edited) => {
                  const updated = workspaces.map(w => w.id === edited.id ? edited : w);
                  updateWorkspaces(updated);
                  setShowEditModal(false);
                  setWorkspaceToEdit(null);
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE WORKSPACE MODAL */}
      <AnimatePresence>
        {showDeleteModal && workspaceToDelete && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Delete Workspace?</h3>
                  <p className="text-xs text-slate-500">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Are you sure you want to delete workspace <strong className="font-mono text-slate-900">{workspaceToDelete.name}</strong>?
                This will remove its associated configuration, Git triggers, and variable mappings.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// FORM SUB-COMPONENT: Add Workspace
function AddWorkspaceForm({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (ws: IaCWorkspace) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [environment, setEnvironment] = useState<'production' | 'staging' | 'development' | 'sandbox'>('production');
  const [provider, setProvider] = useState<'AWS' | 'GCP' | 'Azure' | 'Kubernetes'>('AWS');
  const [terraformVersion, setTerraformVersion] = useState('1.9.5');
  const [gitProvider, setGitProvider] = useState<'github' | 'gitlab'>('github');
  const [repoUrl, setRepoUrl] = useState('https://github.com/enterprise-cloud/terraform-aws-infra');
  const [branch, setBranch] = useState('main');
  const [workingDirectory, setWorkingDirectory] = useState('environments/production');
  const [stateBucket, setStateBucket] = useState('enterprise-tfstate-bucket');
  const [stateKey, setStateKey] = useState('terraform.tfstate');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const repoName = repoUrl.replace(/^https?:\/\/[^\/]+\//, '').replace(/\.git$/, '');

    const newWs: IaCWorkspace = {
      id: `ws-${Date.now()}`,
      name: name.trim().toLowerCase().replace(/\s+/g, '-'),
      description: description.trim() || 'Terraform infrastructure workspace',
      environment,
      provider,
      terraformVersion,
      stateBackend: {
        type: provider === 'AWS' ? 's3' : provider === 'GCP' ? 'gcs' : 'azurerm',
        bucket: stateBucket,
        key: stateKey,
        region: provider === 'AWS' ? 'us-east-1' : 'europe-west3'
      },
      gitConfig: {
        provider: gitProvider,
        repoUrl,
        repoName: repoName || 'enterprise/terraform-infra',
        branch,
        workingDirectory,
        authType: 'pat',
        webhookEnabled: true,
        lastCommitHash: 'e4b7c21',
        lastCommitMessage: 'feat: bootstrap initial workspace structure',
        lastCommitAuthor: 'DevOps Platform Team',
        lastCommitDate: 'Just now',
        syncStatus: 'synced',
        lastSyncedAt: 'Just now'
      },
      variables: [
        {
          id: `var-init-1`,
          key: provider === 'AWS' ? 'AWS_REGION' : provider === 'GCP' ? 'GCP_REGION' : 'ARM_LOCATION',
          value: provider === 'AWS' ? 'us-east-1' : provider === 'GCP' ? 'europe-west3' : 'eastus2',
          category: 'environment',
          hcl: false,
          sensitive: false,
          description: 'Primary deployment cloud region'
        }
      ],
      isLocked: false,
      resourceCount: 0,
      lastPlanStatus: 'pending',
      lastApplied: 'Never',
      monthlyCost: 0,
      costDelta: 0,
      autoApply: false,
      speculativePlans: true,
      tags: [environment, provider.toLowerCase(), 'terraform'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSubmit(newWs);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-600">Workspace Name *</label>
          <input
            type="text"
            required
            placeholder="e.g. prod-vpc-us-east-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-slate-600">Environment</label>
          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as any)}
            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
          >
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
            <option value="sandbox">Sandbox</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase text-slate-600">Description</label>
        <input
          type="text"
          placeholder="Purpose of this workspace..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-600">Target Cloud Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as any)}
            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
          >
            <option value="AWS">AWS (Amazon Web Services)</option>
            <option value="GCP">GCP (Google Cloud Platform)</option>
            <option value="Azure">Microsoft Azure</option>
            <option value="Kubernetes">Kubernetes Provider</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-slate-600">Terraform Version</label>
          <select
            value={terraformVersion}
            onChange={(e) => setTerraformVersion(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
          >
            <option value="1.9.5">Terraform v1.9.5 (Latest)</option>
            <option value="1.8.5">Terraform v1.8.5</option>
            <option value="1.7.5">Terraform v1.7.5</option>
            <option value="OpenTofu 1.8.2">OpenTofu v1.8.2 (Open Source)</option>
          </select>
        </div>
      </div>

      {/* Git Repository Settings */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <FolderGit2 size={14} className="text-indigo-600" />
          Git Repository Configuration
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-600">Git Provider</label>
            <select
              value={gitProvider}
              onChange={(e) => setGitProvider(e.target.value as any)}
              className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="github">GitHub</option>
              <option value="gitlab">GitLab</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-600">Branch Name</label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold text-indigo-700"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-slate-600">Repository HTTPS / SSH URL</label>
          <input
            type="text"
            required
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-900"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-slate-600">Working Directory</label>
          <input
            type="text"
            value={workingDirectory}
            onChange={(e) => setWorkingDirectory(e.target.value)}
            className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-900"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
        >
          Create Workspace
        </button>
      </div>
    </form>
  );
}

// FORM SUB-COMPONENT: Edit Workspace
function EditWorkspaceForm({ workspace, onCancel, onSubmit }: { workspace: IaCWorkspace; onCancel: () => void; onSubmit: (ws: IaCWorkspace) => void }) {
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description);
  const [environment, setEnvironment] = useState(workspace.environment);
  const [provider, setProvider] = useState(workspace.provider);
  const [terraformVersion, setTerraformVersion] = useState(workspace.terraformVersion);
  const [repoUrl, setRepoUrl] = useState(workspace.gitConfig.repoUrl);
  const [branch, setBranch] = useState(workspace.gitConfig.branch);
  const [workingDirectory, setWorkingDirectory] = useState(workspace.gitConfig.workingDirectory);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const repoName = repoUrl.replace(/^https?:\/\/[^\/]+\//, '').replace(/\.git$/, '');

    const edited: IaCWorkspace = {
      ...workspace,
      name,
      description,
      environment,
      provider,
      terraformVersion,
      gitConfig: {
        ...workspace.gitConfig,
        repoUrl,
        repoName: repoName || workspace.gitConfig.repoName,
        branch,
        workingDirectory
      },
      updatedAt: new Date().toISOString()
    };
    onSubmit(edited);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-600">Workspace Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-slate-600">Environment</label>
          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as any)}
            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
          >
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
            <option value="sandbox">Sandbox</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase text-slate-600">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-600">Cloud Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as any)}
            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
          >
            <option value="AWS">AWS</option>
            <option value="GCP">GCP</option>
            <option value="Azure">Azure</option>
            <option value="Kubernetes">Kubernetes</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-slate-600">Terraform Version</label>
          <select
            value={terraformVersion}
            onChange={(e) => setTerraformVersion(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700"
          >
            <option value="1.9.5">Terraform v1.9.5</option>
            <option value="1.8.5">Terraform v1.8.5</option>
            <option value="1.7.5">Terraform v1.7.5</option>
            <option value="OpenTofu 1.8.2">OpenTofu v1.8.2</option>
          </select>
        </div>
      </div>

      {/* Git Config */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <FolderGit2 size={14} className="text-indigo-600" />
          Git Repository &amp; Branch
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-600">Repository URL</label>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-900"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-600">Branch Name</label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold text-indigo-700"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-slate-600">Working Directory</label>
          <input
            type="text"
            value={workingDirectory}
            onChange={(e) => setWorkingDirectory(e.target.value)}
            className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-900"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
}
