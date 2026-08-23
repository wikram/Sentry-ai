/**
 * Copyright 2026 Google LLC
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GitBranch, 
  GitCommit, 
  GitPullRequest, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Key, 
  Lock, 
  ExternalLink, 
  Check, 
  Copy, 
  Plus, 
  Trash2, 
  Globe, 
  ShieldCheck, 
  Clock, 
  ChevronRight,
  Code2,
  Terminal,
  FolderGit2,
  HelpCircle,
  Radio
} from 'lucide-react';

export interface GitRepository {
  id: string;
  name: string;
  provider: 'github' | 'gitlab';
  url: string;
  owner: string;
  repo: string;
  defaultBranch: string;
  activeBranch: string;
  branches: string[];
  authType: 'pat' | 'ssh_key' | 'oauth';
  maskedToken: string;
  lastSynced: string;
  syncStatus: 'synced' | 'syncing' | 'failed';
  headCommit: {
    hash: string;
    message: string;
    author: string;
    timestamp: string;
  };
  webhookEnabled: boolean;
  webhookUrl: string;
  webhookSecret: string;
  autoSyncMode: 'webhook' | 'polling_5m' | 'manual';
}

export const DEFAULT_CONNECTED_REPOS: GitRepository[] = [
  {
    id: 'repo-01',
    name: 'enterprise/ansible-playbooks',
    provider: 'github',
    url: 'https://github.com/enterprise/ansible-playbooks.git',
    owner: 'enterprise',
    repo: 'ansible-playbooks',
    defaultBranch: 'main',
    activeBranch: 'main',
    branches: ['main', 'staging', 'feature/k8s-hardening', 'release/v2.4'],
    authType: 'pat',
    maskedToken: 'ghp_••••••••••••••••••••39aF',
    lastSynced: '3 mins ago',
    syncStatus: 'synced',
    headCommit: {
      hash: 'e4b7c21',
      message: 'feat(nginx): enable TLS 1.3 & HSTS header policy across edge proxies',
      author: 'alex.chen@enterprise.io',
      timestamp: '2 hours ago'
    },
    webhookEnabled: true,
    webhookUrl: 'https://ais-pre-m23urbyofsdevt237yzcwi-871869845365.asia-southeast1.run.app/api/v1/webhooks/ansible-sync',
    webhookSecret: 'whsec_99a81f3d4b2e8c10928a_aes',
    autoSyncMode: 'webhook'
  },
  {
    id: 'repo-02',
    name: 'secops-team/ansible-cis-compliance',
    provider: 'gitlab',
    url: 'https://gitlab.com/secops-team/ansible-cis-compliance.git',
    owner: 'secops-team',
    repo: 'ansible-cis-compliance',
    defaultBranch: 'main',
    activeBranch: 'main',
    branches: ['main', 'audit-2026-q3', 'dev'],
    authType: 'ssh_key',
    maskedToken: 'ssh-ed25519 AAAAC3NzaC1yc2E••••••••secops-key',
    lastSynced: '18 mins ago',
    syncStatus: 'synced',
    headCommit: {
      hash: '9a310d5',
      message: 'chore(cis): update kernel module blacklist for CIS Linux Level 2',
      author: 'compliance-bot@gitlab.internal',
      timestamp: '1 day ago'
    },
    webhookEnabled: true,
    webhookUrl: 'https://ais-pre-m23urbyofsdevt237yzcwi-871869845365.asia-southeast1.run.app/api/v1/webhooks/ansible-sync',
    webhookSecret: 'glsec_8192a019e991bb2',
    autoSyncMode: 'polling_5m'
  }
];

interface GitIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  repositories: GitRepository[];
  activeRepoId: string;
  onSelectActiveRepo: (repoId: string) => void;
  onUpdateRepositories: (repos: GitRepository[]) => void;
  onShowNotification: (msg: string) => void;
}

export default function GitIntegrationModal({
  isOpen,
  onClose,
  repositories,
  activeRepoId,
  onSelectActiveRepo,
  onUpdateRepositories,
  onShowNotification
}: GitIntegrationModalProps) {
  const [activeTab, setActiveTab] = useState<'repositories' | 'connect' | 'webhooks' | 'history'>('repositories');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);

  // New Connection Form State
  const [provider, setProvider] = useState<'github' | 'gitlab'>('github');
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [authType, setAuthType] = useState<'pat' | 'ssh_key'>('pat');
  const [tokenOrKey, setTokenOrKey] = useState('');
  const [isCustomHost, setIsCustomHost] = useState(false);
  const [customHostUrl, setCustomHostUrl] = useState('');

  if (!isOpen) return null;

  const currentActiveRepo = repositories.find(r => r.id === activeRepoId) || repositories[0];

  const handleTestAndConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) return;

    setIsTestingConnection(true);

    setTimeout(() => {
      setIsTestingConnection(false);

      // Extract owner and repo
      let cleanUrl = repoUrl.trim();
      let parts = cleanUrl.replace(/\.git$/, '').split('/');
      let repoName = parts[parts.length - 1] || 'ansible-repo';
      let ownerName = parts[parts.length - 2] || (provider === 'github' ? 'github-user' : 'gitlab-user');

      const newRepo: GitRepository = {
        id: `repo-${Date.now()}`,
        name: `${ownerName}/${repoName}`,
        provider,
        url: cleanUrl,
        owner: ownerName,
        repo: repoName,
        defaultBranch: branch || 'main',
        activeBranch: branch || 'main',
        branches: [branch || 'main', 'staging', 'dev'],
        authType,
        maskedToken: authType === 'pat' 
          ? (provider === 'github' ? 'ghp_••••••••••••••••••••' + tokenOrKey.slice(-4) : 'glpat-••••••••••••••••' + tokenOrKey.slice(-4))
          : 'ssh-ed25519 AAAAC3••••••••' + tokenOrKey.slice(-4),
        lastSynced: 'Just now',
        syncStatus: 'synced',
        headCommit: {
          hash: 'c84e190',
          message: 'Initial sync: pulled latest playbooks and inventory hierarchy',
          author: `${ownerName}@${provider === 'github' ? 'users.noreply.github.com' : 'gitlab.com'}`,
          timestamp: 'Just now'
        },
        webhookEnabled: true,
        webhookUrl: 'https://ais-pre-m23urbyofsdevt237yzcwi-871869845365.asia-southeast1.run.app/api/v1/webhooks/ansible-sync',
        webhookSecret: `whsec_${Math.random().toString(36).substring(2, 12)}_aes`,
        autoSyncMode: 'webhook'
      };

      const updated = [newRepo, ...repositories];
      onUpdateRepositories(updated);
      onSelectActiveRepo(newRepo.id);
      onShowNotification(`Successfully connected to ${provider === 'github' ? 'GitHub' : 'GitLab'} repository ${newRepo.name}!`);
      
      // Reset form
      setRepoUrl('');
      setTokenOrKey('');
      setActiveTab('repositories');
    }, 1600);
  };

  const handleSyncRepository = (repoId: string) => {
    onUpdateRepositories(repositories.map(r => {
      if (r.id === repoId) {
        return {
          ...r,
          lastSynced: 'Just now',
          syncStatus: 'synced'
        };
      }
      return r;
    }));
    onShowNotification(`Fetched latest commits and playbooks from ${currentActiveRepo.provider === 'github' ? 'GitHub' : 'GitLab'}.`);
  };

  const handleCopyWebhookSecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret('secret');
    onShowNotification('Webhook HMAC Secret copied to clipboard.');
    setTimeout(() => setCopiedSecret(null), 2500);
  };

  const handleCopyWebhookUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedSecret('url');
    onShowNotification('Webhook payload URL copied to clipboard.');
    setTimeout(() => setCopiedSecret(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 15 }}
        className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <FolderGit2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                  VCS &bull; Git Integration
                </span>
                <span className="text-[10px] font-mono text-slate-400">GitHub &amp; GitLab Provider</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 mt-0.5">Ansible Git Repository Settings</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center font-bold transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 border-b border-slate-200 bg-white">
          <button
            onClick={() => setActiveTab('repositories')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'repositories'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FolderGit2 size={14} />
            <span>Connected Repositories ({repositories.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('connect')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'connect'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Plus size={14} />
            <span>Connect New Repository</span>
          </button>

          <button
            onClick={() => setActiveTab('webhooks')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'webhooks'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <RefreshCw size={14} />
            <span>Webhooks &amp; Auto-Sync</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <GitCommit size={14} />
            <span>Commit History</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
          {/* TAB 1: CONNECTED REPOSITORIES */}
          {activeTab === 'repositories' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Active Repositories</h4>
                  <p className="text-xs text-slate-500">Playbooks and manifests are automatically synced from these remotes.</p>
                </div>
                <button
                  onClick={() => setActiveTab('connect')}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Plus size={13} />
                  <span>Add Repository</span>
                </button>
              </div>

              <div className="space-y-3">
                {repositories.map((repo) => {
                  const isActive = repo.id === activeRepoId;
                  return (
                    <div
                      key={repo.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isActive
                          ? 'bg-indigo-50/60 border-indigo-300 ring-1 ring-indigo-400/30'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow-xs ${
                            repo.provider === 'github' ? 'bg-slate-900' : 'bg-orange-600'
                          }`}>
                            {repo.provider === 'github' ? (
                              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z"/>
                              </svg>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-extrabold text-sm text-slate-900 font-mono">{repo.name}</h5>
                              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700">
                                {repo.provider}
                              </span>
                              {isActive && (
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                                  <Check size={10} /> Active Source
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>{repo.url}</span>
                              <span className="text-slate-300">&bull;</span>
                              <span className="text-indigo-600 font-bold flex items-center gap-1">
                                <GitBranch size={12} /> {repo.activeBranch}
                              </span>
                              <span className="text-slate-300">&bull;</span>
                              <span>Synced: {repo.lastSynced}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!isActive && (
                            <button
                              onClick={() => {
                                onSelectActiveRepo(repo.id);
                                onShowNotification(`Switched active Ansible repository to ${repo.name}`);
                              }}
                              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
                            >
                              Set as Active
                            </button>
                          )}

                          <button
                            onClick={() => handleSyncRepository(repo.id)}
                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200"
                            title="Fetch and rebase latest commits"
                          >
                            <RefreshCw size={12} />
                            <span>Sync Now</span>
                          </button>
                        </div>
                      </div>

                      {/* Head Commit Info Box */}
                      <div className="mt-3.5 pt-3.5 border-t border-slate-100/80 bg-white/70 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600 truncate">
                          <GitCommit size={13} className="text-indigo-600 shrink-0" />
                          <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                            {repo.headCommit.hash}
                          </span>
                          <span className="truncate">{repo.headCommit.message}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono shrink-0">
                          {repo.headCommit.author} ({repo.headCommit.timestamp})
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CONNECT NEW REPO */}
          {activeTab === 'connect' && (
            <form onSubmit={handleTestAndConnect} className="space-y-5">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">1. Choose Git Provider</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    onClick={() => setProvider('github')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                      provider === 'github'
                        ? 'border-indigo-600 bg-indigo-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-slate-900">GitHub</div>
                      <div className="text-[11px] text-slate-500">github.com or GitHub Enterprise Server</div>
                    </div>
                  </div>

                  <div
                    onClick={() => setProvider('gitlab')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                      provider === 'gitlab'
                        ? 'border-indigo-600 bg-indigo-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z"/>
                      </svg>
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-slate-900">GitLab</div>
                      <div className="text-[11px] text-slate-500">gitlab.com or Self-Managed Instance</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Repo URL & Branch */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">2. Repository Target</h4>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Git Clone URL (HTTPS or SSH)</label>
                  <input
                    type="text"
                    required
                    placeholder={provider === 'github' ? 'https://github.com/org/ansible-playbooks.git' : 'https://gitlab.com/group/ansible-playbooks.git'}
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Default Branch</label>
                    <input
                      type="text"
                      placeholder="main"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Authentication Method</label>
                    <select
                      value={authType}
                      onChange={(e) => setAuthType(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      <option value="pat">Personal Access Token (PAT) / Token</option>
                      <option value="ssh_key">SSH Deploy Key (id_ed25519)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Authentication Credentials */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">3. Credentials &amp; Scopes</h4>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {authType === 'pat' 
                      ? (provider === 'github' ? 'GitHub Personal Access Token (PAT)' : 'GitLab Personal Access Token') 
                      : 'SSH Private Deploy Key (PEM/OpenSSH)'}
                  </label>
                  <textarea
                    rows={authType === 'pat' ? 2 : 4}
                    required
                    placeholder={
                      authType === 'pat'
                        ? (provider === 'github' ? 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx (Requires repo & write:repo_hook)' : 'glpat-xxxxxxxxxxxxxxxxxxxxxxxx (Requires read_repository, write_repository)')
                        : '-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----'
                    }
                    value={tokenOrKey}
                    onChange={(e) => setTokenOrKey(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-600">
                  <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">Zero-Knowledge Token Sealing: </span>
                    Your token is encrypted using AES-256 GCM in the local vault and never leaves the execution runtime.
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('repositories')}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTestingConnection}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw size={13} className={isTestingConnection ? 'animate-spin' : ''} />
                  <span>{isTestingConnection ? 'Authenticating & Verifying Remote...' : 'Test & Connect Repository'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: WEBHOOKS & AUTO SYNC */}
          {activeTab === 'webhooks' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Continuous Webhook Synchronization</h4>
                <p className="text-xs text-slate-500">
                  Configure this webhook on {currentActiveRepo.provider === 'github' ? 'GitHub' : 'GitLab'} so pushes to <span className="font-mono font-bold text-indigo-600">{currentActiveRepo.activeBranch}</span> instantly update your Ansible playbooks.
                </p>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Webhook Payload URL</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={currentActiveRepo.webhookUrl}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-700 select-all"
                    />
                    <button
                      onClick={() => handleCopyWebhookUrl(currentActiveRepo.webhookUrl)}
                      className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1"
                    >
                      {copiedSecret === 'url' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Webhook Secret (HMAC SHA-256)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      readOnly
                      value={currentActiveRepo.webhookSecret}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-700"
                    />
                    <button
                      onClick={() => handleCopyWebhookSecret(currentActiveRepo.webhookSecret)}
                      className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1"
                    >
                      {copiedSecret === 'secret' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      <span>Copy Secret</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Content Type</span>
                    <div className="font-mono font-bold text-xs text-slate-800 mt-0.5">application/json</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Trigger Events</span>
                    <div className="font-mono font-bold text-xs text-slate-800 mt-0.5">Push, Pull Request Merge</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-400">SSL Verification</span>
                    <div className="font-mono font-bold text-xs text-emerald-600 mt-0.5">Enabled (TLS 1.3)</div>
                  </div>
                </div>
              </div>

              {/* GitHub / GitLab Setup Instructions */}
              <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl font-mono text-xs space-y-2">
                <div className="text-indigo-400 font-bold flex items-center gap-2">
                  <Terminal size={14} />
                  <span>Quick Setup on {currentActiveRepo.provider === 'github' ? 'GitHub' : 'GitLab'}</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                  <li>Navigate to your repository &gt; <strong>Settings</strong> &gt; <strong>Webhooks</strong>.</li>
                  <li>Paste the <strong>Payload URL</strong> and <strong>Secret</strong> from above.</li>
                  <li>Set content type to <code>application/json</code> and select <strong>Just the push event</strong>.</li>
                  <li>Click <strong>Add webhook</strong>. Playbooks will re-sync automatically on every git commit.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 4: COMMIT HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Recent Commits ({currentActiveRepo.name})</h4>
                <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                  Branch: {currentActiveRepo.activeBranch}
                </span>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    hash: currentActiveRepo.headCommit.hash,
                    msg: currentActiveRepo.headCommit.message,
                    author: currentActiveRepo.headCommit.author,
                    time: currentActiveRepo.headCommit.timestamp,
                    filesChanged: 3
                  },
                  {
                    hash: '8f102c9',
                    msg: 'fix(sysctl): tune vm.max_map_count for elasticsearch & k8s nodes',
                    author: 'devops-ci-bot',
                    time: '1 day ago',
                    filesChanged: 1
                  },
                  {
                    hash: '3d901a4',
                    msg: 'feat(vault): inject sealed secrets for postgres cluster connection pool',
                    author: 'secops-team@enterprise.io',
                    time: '3 days ago',
                    filesChanged: 4
                  },
                  {
                    hash: '1b77a02',
                    msg: 'refactor(playbooks): modularize common tasks into ansible roles',
                    author: 'alex.chen@enterprise.io',
                    time: '5 days ago',
                    filesChanged: 12
                  }
                ].map((c, i) => (
                  <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                        <GitCommit size={15} />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 font-mono">{c.msg}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                          <span className="text-indigo-600 font-bold">{c.hash}</span>
                          <span>&bull;</span>
                          <span>{c.author}</span>
                          <span>&bull;</span>
                          <span>{c.time}</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 shrink-0">
                      {c.filesChanged} files
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Connected: {currentActiveRepo.provider.toUpperCase()} &bull; {currentActiveRepo.name}</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
