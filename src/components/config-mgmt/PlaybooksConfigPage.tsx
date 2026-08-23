/**
 * Copyright 2026 Google LLC
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileCode, 
  Play, 
  Check, 
  Copy, 
  GitBranch, 
  Save, 
  RefreshCw, 
  ShieldCheck, 
  Search, 
  Plus, 
  Sparkles,
  CheckCircle2,
  FileCheck,
  Code2,
  FolderGit2,
  GitCommit,
  GitPullRequest,
  ExternalLink,
  UploadCloud,
  ChevronDown,
  Terminal,
  Settings
} from 'lucide-react';
import GitIntegrationModal, { 
  DEFAULT_CONNECTED_REPOS, 
  GitRepository 
} from './GitIntegrationModal';

export interface ConfigManifest {
  id: string;
  name: string;
  type: 'ansible' | 'puppet' | 'k8s' | 'systemd';
  path: string;
  lastModified: string;
  author: string;
  branch: string;
  content: string;
}

export const INITIAL_MANIFESTS: ConfigManifest[] = [
  {
    id: 'man-01',
    name: 'k8s-cluster-baseline.yml',
    type: 'ansible',
    path: 'playbooks/k8s/k8s-cluster-baseline.yml',
    lastModified: '2 hours ago',
    author: 'alex.chen@enterprise.io',
    branch: 'main',
    content: `---
- name: Hardened Kubernetes Cluster Node Baseline
  hosts: k8s_nodes
  become: true
  vars:
    containerd_version: "1.7.13"
    runc_version: "1.1.12"
    cni_plugins_version: "v1.4.0"
    k8s_version: "1.29.2-1.1"

  tasks:
    - name: Disable Swap on all Kubernetes Worker Nodes
      ansible.posix.sysctl:
        name: vm.swappiness
        value: '0'
        state: present
        reload: true

    - name: Load Required Kernel Modules (overlay & br_netfilter)
      community.general.modprobe:
        name: "{{ item }}"
        state: present
      loop:
        - overlay
        - br_netfilter

    - name: Set Essential Sysctl Parameters for K8s Networking
      ansible.posix.sysctl:
        name: "{{ item.name }}"
        value: "{{ item.value }}"
        sysctl_set: true
        state: present
        reload: true
      loop:
        - { name: 'net.bridge.bridge-nf-call-iptables', value: '1' }
        - { name: 'net.bridge.bridge-nf-call-ip6tables', value: '1' }
        - { name: 'net.ipv4.ip_forward', value: '1' }

    - name: Ensure containerd runtime service is active and enabled
      ansible.builtin.systemd:
        name: containerd
        state: started
        enabled: true
`
  },
  {
    id: 'man-02',
    name: 'nginx-hardened-edge.yml',
    type: 'ansible',
    path: 'playbooks/edge/nginx-hardened-edge.yml',
    lastModified: '1 day ago',
    author: 'secops-team',
    branch: 'main',
    content: `---
- name: Deploy Zero-Trust Nginx Reverse Proxy with TLS 1.3 & HSTS
  hosts: webservers
  become: true
  tasks:
    - name: Install Nginx Mainline Package & Certbot
      ansible.builtin.apt:
        name:
          - nginx
          - certbot
          - python3-certbot-nginx
        state: latest
        update_cache: true

    - name: Deploy Secure TLS Hardening Template
      ansible.builtin.template:
        src: templates/ssl-params.conf.j2
        dest: /etc/nginx/conf.d/ssl-params.conf
        owner: root
        group: root
        mode: '0644'
      notify: Reload Nginx

  handlers:
    - name: Reload Nginx
      ansible.builtin.systemd:
        name: nginx
        state: reloaded
`
  },
  {
    id: 'man-03',
    name: 'cis-linux-hardening.yml',
    type: 'ansible',
    path: 'playbooks/security/cis-linux-hardening.yml',
    lastModified: '3 days ago',
    author: 'compliance-auditor',
    branch: 'main',
    content: `---
- name: CIS Linux Benchmark Level 2 Hardening
  hosts: all
  become: true
  tasks:
    - name: Disable Legacy SSH Root Login & Password Auth
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
        validate: '/usr/sbin/sshd -t -f %s'
      loop:
        - { regexp: '^#?PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^#?PasswordAuthentication', line: 'PasswordAuthentication no' }
        - { regexp: '^#?X11Forwarding', line: 'X11Forwarding no' }
        - { regexp: '^#?MaxAuthTries', line: 'MaxAuthTries 4' }
      notify: Restart SSHD

    - name: Restrict Core Dumps for System Accounts
      ansible.builtin.lineinfile:
        path: /etc/security/limits.conf
        line: "* hard core 0"
`
  },
  {
    id: 'man-04',
    name: 'postgres-ha-cluster.yml',
    type: 'ansible',
    path: 'playbooks/database/postgres-ha-cluster.yml',
    lastModified: '5 days ago',
    author: 'db-team',
    branch: 'main',
    content: `---
- name: Configure High-Availability PostgreSQL Cluster
  hosts: db_primary
  become: true
  tasks:
    - name: Enforce pg_hba.conf MD5 & SSL Authentication
      ansible.builtin.template:
        src: templates/pg_hba.conf.j2
        dest: /etc/postgresql/16/main/pg_hba.conf
        mode: '0600'
      notify: Reload Postgres
`
  }
];

interface PlaybooksConfigPageProps {
  onLaunchOrchestrator?: () => void;
}

export default function PlaybooksConfigPage({ onLaunchOrchestrator }: PlaybooksConfigPageProps) {
  const [manifests, setManifests] = useState<ConfigManifest[]>(INITIAL_MANIFESTS);
  const [selectedManifest, setSelectedManifest] = useState<ConfigManifest>(INITIAL_MANIFESTS[0]);
  const [manifestEditorContent, setManifestEditorContent] = useState<string>(INITIAL_MANIFESTS[0].content);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Git State
  const [repositories, setRepositories] = useState<GitRepository[]>(DEFAULT_CONNECTED_REPOS);
  const [activeRepoId, setActiveRepoId] = useState<string>(DEFAULT_CONNECTED_REPOS[0].id);
  const [isGitModalOpen, setIsGitModalOpen] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [targetBranch, setTargetBranch] = useState('main');
  const [createPR, setCreatePR] = useState(false);

  const currentRepo = repositories.find(r => r.id === activeRepoId) || repositories[0];

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSelectManifest = (man: ConfigManifest) => {
    setSelectedManifest(man);
    setManifestEditorContent(man.content);
    setHasUnsavedChanges(false);
  };

  const handleSaveLocal = () => {
    setManifests(prev => prev.map(m => m.id === selectedManifest.id ? { ...m, content: manifestEditorContent, lastModified: 'Just now' } : m));
    setHasUnsavedChanges(false);
    showNotification(`Saved changes locally for ${selectedManifest.name}. Ready to commit to ${currentRepo.provider === 'github' ? 'GitHub' : 'GitLab'}.`);
  };

  const handlePullFromGit = () => {
    setIsPulling(true);
    setTimeout(() => {
      setIsPulling(false);
      setRepositories(prev => prev.map(r => r.id === currentRepo.id ? { ...r, lastSynced: 'Just now' } : r));
      showNotification(`Successfully pulled latest playbooks from ${currentRepo.provider === 'github' ? 'GitHub' : 'GitLab'} (${currentRepo.name} @ ${currentRepo.activeBranch}).`);
    }, 1500);
  };

  const handlePushToGit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage) return;

    setIsPushing(true);
    setTimeout(() => {
      setIsPushing(false);
      setIsPushModalOpen(false);
      
      const newHash = Math.random().toString(16).substring(2, 9);
      
      // Update repository HEAD commit
      setRepositories(prev => prev.map(r => {
        if (r.id === currentRepo.id) {
          return {
            ...r,
            lastSynced: 'Just now',
            headCommit: {
              hash: newHash,
              message: commitMessage,
              author: 'you@enterprise.io',
              timestamp: 'Just now'
            }
          };
        }
        return r;
      }));

      // Update manifest
      setManifests(prev => prev.map(m => m.id === selectedManifest.id ? { 
        ...m, 
        content: manifestEditorContent, 
        lastModified: 'Just now',
        author: 'you@enterprise.io'
      } : m));

      setHasUnsavedChanges(false);
      const prText = createPR ? ` & created ${currentRepo.provider === 'github' ? 'Pull Request #42' : 'Merge Request !18'}` : '';
      showNotification(`Pushed commit [${newHash}] to ${currentRepo.name} on ${targetBranch}${prText}!`);
      setCommitMessage('');
    }, 1800);
  };

  const handleSwitchBranch = (branchName: string) => {
    setRepositories(prev => prev.map(r => r.id === currentRepo.id ? { ...r, activeBranch: branchName, lastSynced: 'Just now' } : r));
    showNotification(`Switched branch to ${branchName}. Playbook repository index reloaded.`);
  };

  const handleValidateSyntax = () => {
    showNotification(`YAML validation passed for ${selectedManifest.name} (0 syntax errors, 0 lint warnings).`);
  };

  const filteredManifests = manifests.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
              <FileCode size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                  Configuration Management
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400">Ansible &bull; Git Repository &bull; YAML</span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">Playbooks &amp; ConfigMaps Repository</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Version-controlled desired-state manifest repository with GitHub/GitLab two-way sync, YAML linting &amp; commit integration.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={() => setIsGitModalOpen(true)}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
            >
              <FolderGit2 size={14} className="text-indigo-400" />
              <span>Connect GitHub / GitLab</span>
            </button>

            {onLaunchOrchestrator && (
              <button
                onClick={onLaunchOrchestrator}
                className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              >
                <Play size={14} className="text-indigo-600" />
                <span>Go to Orchestrator</span>
              </button>
            )}

            <button
              onClick={() => {
                const name = prompt('Enter new playbook name (e.g. redis-cluster.yml):');
                if (name) {
                  const newM: ConfigManifest = {
                    id: `man-${Date.now()}`,
                    name,
                    type: 'ansible',
                    path: `playbooks/custom/${name}`,
                    lastModified: 'Just now',
                    author: 'current-user',
                    branch: currentRepo.activeBranch,
                    content: `---\n- name: Custom Playbook ${name}\n  hosts: all\n  become: true\n  tasks:\n    - name: Ping host\n      ansible.builtin.ping:\n`
                  };
                  setManifests(prev => [newM, ...prev]);
                  handleSelectManifest(newM);
                }
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
            >
              <Plus size={14} />
              <span>New Playbook</span>
            </button>
          </div>
        </div>

        {/* Git Remote Integration Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white shadow-2xs ${
                currentRepo.provider === 'github' ? 'bg-slate-900' : 'bg-orange-600'
              }`}>
                {currentRepo.provider === 'github' ? (
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z"/>
                  </svg>
                )}
              </div>
              <span className="font-extrabold text-xs text-slate-900 font-mono">{currentRepo.name}</span>
            </div>

            <span className="text-slate-300">|</span>

            {/* Branch Switcher Dropdown */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs">
              <GitBranch size={13} className="text-indigo-600" />
              <select
                value={currentRepo.activeBranch}
                onChange={(e) => handleSwitchBranch(e.target.value)}
                className="bg-transparent text-xs font-bold font-mono text-slate-800 focus:outline-none cursor-pointer"
              >
                {currentRepo.branches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <span className="text-slate-300">|</span>

            {/* HEAD Commit Hash */}
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
              <GitCommit size={13} className="text-indigo-600" />
              <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                {currentRepo.headCommit.hash}
              </span>
              <span className="text-slate-400 truncate max-w-[220px]" title={currentRepo.headCommit.message}>
                {currentRepo.headCommit.message}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-slate-400 font-mono mr-1">
              Synced: {currentRepo.lastSynced}
            </span>

            <button
              onClick={handlePullFromGit}
              disabled={isPulling}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
              title="Pull latest playbooks from GitHub/GitLab"
            >
              <RefreshCw size={12} className={isPulling ? 'animate-spin text-indigo-600' : ''} />
              <span>{isPulling ? 'Pulling...' : 'Pull from Git'}</span>
            </button>

            <button
              onClick={() => setIsGitModalOpen(true)}
              className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors"
              title="Git Settings & Webhooks"
            >
              <Settings size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Manifest File Tree / Selector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FolderGit2 size={13} className="text-indigo-600" />
                <span>Playbooks &amp; Manifests</span>
              </h3>
              <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold border border-indigo-100">
                {currentRepo.activeBranch} &bull; {filteredManifests.length} files
              </span>
            </div>

            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search playbooks & manifests..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="space-y-2 max-h-[550px] overflow-y-auto custom-scrollbar pt-1">
              {filteredManifests.map((man) => (
                <div
                  key={man.id}
                  onClick={() => handleSelectManifest(man)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedManifest.id === man.id
                      ? 'bg-indigo-50/80 border-indigo-300 shadow-xs ring-1 ring-indigo-400/30'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
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
                    <span className="font-mono">{man.author}</span>
                    <span className="font-mono text-slate-400">{man.lastModified}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Code Editor & Actions */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="bg-slate-900 px-5 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-slate-200">
            <div className="flex items-center gap-2">
              <FileCode size={16} className="text-indigo-400" />
              <span className="font-mono text-xs font-bold text-white">{selectedManifest.path}</span>
              {hasUnsavedChanges && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Unsaved changes" />
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onLaunchOrchestrator && selectedManifest.type === 'ansible' && (
                <button
                  onClick={onLaunchOrchestrator}
                  className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Play size={12} />
                  <span>Launch in Orchestrator</span>
                </button>
              )}
              <button
                onClick={handleValidateSyntax}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <FileCheck size={13} className="text-emerald-400" />
                <span>Validate Syntax</span>
              </button>
              <button
                onClick={handleSaveLocal}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Save size={13} />
                <span>Save</span>
              </button>
              <button
                onClick={() => {
                  setCommitMessage(`update(${selectedManifest.name}): configure desired state parameters`);
                  setIsPushModalOpen(true);
                }}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
              >
                <UploadCloud size={13} />
                <span>Push to {currentRepo.provider === 'github' ? 'GitHub' : 'GitLab'}</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <textarea
              value={manifestEditorContent}
              onChange={(e) => {
                setManifestEditorContent(e.target.value);
                setHasUnsavedChanges(true);
              }}
              rows={22}
              className="w-full p-5 font-mono text-xs bg-slate-950 text-indigo-100 focus:outline-none resize-none leading-relaxed selection:bg-indigo-500/30"
              spellCheck={false}
            />
          </div>

          <div className="bg-slate-900 border-t border-slate-800 px-5 py-2.5 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-4">
              <span>Encoding: UTF-8</span>
              <span>Syntax: YAML / Ansible</span>
              <span>Lines: {manifestEditorContent.split('\n').length}</span>
            </div>
            <div className="text-emerald-400 flex items-center gap-1">
              <Check size={12} />
              <span>Remote: {currentRepo.provider.toUpperCase()} ({currentRepo.activeBranch})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Push / Commit Dialog Modal */}
      <AnimatePresence>
        {isPushModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPushModalOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden p-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                    <UploadCloud size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Commit &amp; Push to {currentRepo.provider === 'github' ? 'GitHub' : 'GitLab'}</h3>
                    <p className="text-xs text-slate-400 font-mono">{currentRepo.name} &bull; {selectedManifest.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPushModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handlePushToGit} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Commit Message</label>
                  <textarea
                    rows={2}
                    required
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="e.g. feat(nginx): harden cipher suites to TLS 1.3"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Target Branch</label>
                    <select
                      value={targetBranch}
                      onChange={(e) => setTargetBranch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-700 focus:outline-none"
                    >
                      {currentRepo.branches.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Author Identity</label>
                    <input
                      type="text"
                      readOnly
                      value="you@enterprise.io"
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <GitPullRequest size={14} className="text-indigo-600" />
                    <span>Create {currentRepo.provider === 'github' ? 'Pull Request' : 'Merge Request'} automatically</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={createPR}
                    onChange={(e) => setCreatePR(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsPushModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPushing}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                  >
                    <UploadCloud size={13} className={isPushing ? 'animate-bounce' : ''} />
                    <span>{isPushing ? 'Pushing to Remote...' : 'Commit & Push'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GitHub / GitLab Git Integration Settings Modal */}
      <GitIntegrationModal
        isOpen={isGitModalOpen}
        onClose={() => setIsGitModalOpen(false)}
        repositories={repositories}
        activeRepoId={activeRepoId}
        onSelectActiveRepo={(repoId) => setActiveRepoId(repoId)}
        onUpdateRepositories={(updated) => setRepositories(updated)}
        onShowNotification={showNotification}
      />
    </div>
  );
}
