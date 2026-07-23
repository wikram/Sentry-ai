/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { formatDateOnly, formatDateTime } from '../lib/dateUtils';
import { 
  RefreshCw, 
  Terminal, 
  Users, 
  Activity, 
  UserPlus, 
  Shield, 
  Search, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Key, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Cpu, 
  HardDrive, 
  Server, 
  Clock, 
  ShieldCheck, 
  BadgeCheck, 
  Download, 
  Eye, 
  Sliders,
  ArrowLeft,
  ArrowRight,
  ChevronRight
} from 'lucide-react';

interface SettingsTabProps {
  logPath: string;
  logs: string;
  isLoadingLogs: boolean;
  logFilter: string;
  setLogFilter: (filter: string) => void;
  autoRefreshLogs: boolean;
  setAutoRefreshLogs: (v: boolean) => void;
  fetchLogs: () => void;
}

export interface ManagedUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'Sentry Admin' | 'SRE Engineer' | 'DevOps Developer' | 'Read Only';
  status: 'Active' | 'Inactive';
  lastActive: string;
  createdAt: string;
}

const INITIAL_USERS: ManagedUser[] = [
  {
    id: 'usr-1',
    username: 'admin',
    email: 'admin@sentry.local',
    fullName: 'System Administrator',
    role: 'Sentry Admin',
    status: 'Active',
    lastActive: 'Just now',
    createdAt: '2026-01-10'
  },
  {
    id: 'usr-2',
    username: 'wikram.patankar',
    email: 'wikram.patankar@gmail.com',
    fullName: 'Wikram Patankar',
    role: 'SRE Engineer',
    status: 'Active',
    lastActive: '5 mins ago',
    createdAt: '2026-02-15'
  },
  {
    id: 'usr-3',
    username: 'devops.lead',
    email: 'devops.lead@company.io',
    fullName: 'DevOps Lead',
    role: 'DevOps Developer',
    status: 'Active',
    lastActive: '2 hours ago',
    createdAt: '2026-03-01'
  },
  {
    id: 'usr-4',
    username: 'auditor',
    email: 'compliance@company.io',
    fullName: 'Security Auditor',
    role: 'Read Only',
    status: 'Active',
    lastActive: '1 day ago',
    createdAt: '2026-04-12'
  }
];

export default function SettingsTab({
  logPath,
  logs,
  isLoadingLogs,
  logFilter,
  setLogFilter,
  autoRefreshLogs,
  setAutoRefreshLogs,
  fetchLogs,
}: SettingsTabProps) {
  // Navigation State: null (Main Overview Hub) | 'settings-monitoring' | 'user-management'
  const [activeSubTab, setActiveSubTab] = useState<'settings-monitoring' | 'user-management' | null>(null);

  // User Management State
  const [users, setUsers] = useState<ManagedUser[]>(() => {
    const saved = localStorage.getItem('sentry_managed_users');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_USERS;
  });

  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Save users to localStorage
  useEffect(() => {
    localStorage.setItem('sentry_managed_users', JSON.stringify(users));
  }, [users]);

  // Modal State for Add/Edit User
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form State
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formRole, setFormRole] = useState<ManagedUser['role']>('DevOps Developer');
  const [formPassword, setFormPassword] = useState('');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formError, setFormError] = useState<string | null>(null);

  // Reset Password Modal State
  const [resetPassUserId, setResetPassUserId] = useState<string | null>(null);
  const [newPassInput, setNewPassInput] = useState('');
  const [passSuccessMsg, setPassSuccessMsg] = useState<string | null>(null);

  const openAddUserModal = () => {
    setFormUsername('');
    setFormEmail('');
    setFormFullName('');
    setFormRole('DevOps Developer');
    setFormPassword('');
    setFormStatus('Active');
    setFormError(null);
    setEditingUserId(null);
    setIsAddUserOpen(true);
  };

  const openEditUserModal = (u: ManagedUser) => {
    setEditingUserId(u.id);
    setFormUsername(u.username);
    setFormEmail(u.email);
    setFormFullName(u.fullName);
    setFormRole(u.role);
    setFormStatus(u.status);
    setFormPassword('');
    setFormError(null);
    setIsAddUserOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formUsername.trim()) {
      setFormError('Username is required.');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormError('Valid email address is required.');
      return;
    }

    if (editingUserId) {
      // Edit mode
      setUsers(prev => prev.map(u => {
        if (u.id === editingUserId) {
          return {
            ...u,
            username: formUsername.trim(),
            email: formEmail.trim(),
            fullName: formFullName.trim() || formUsername.trim(),
            role: formRole,
            status: formStatus
          };
        }
        return u;
      }));
    } else {
      // Duplicate check
      if (users.some(u => u.username.toLowerCase() === formUsername.trim().toLowerCase())) {
        setFormError('A user with this username already exists.');
        return;
      }
      const newUser: ManagedUser = {
        id: 'usr-' + Date.now(),
        username: formUsername.trim(),
        email: formEmail.trim(),
        fullName: formFullName.trim() || formUsername.trim(),
        role: formRole,
        status: formStatus,
        lastActive: 'Never',
        createdAt: new Date().toISOString().split('T')[0]
      };
      setUsers(prev => [newUser, ...prev]);
    }

    setIsAddUserOpen(false);
  };

  const handleDeleteUser = (id: string) => {
    const target = users.find(u => u.id === id);
    if (!target) return;
    if (target.username === 'admin') {
      alert('The root admin user cannot be deleted.');
      return;
    }
    if (confirm(`Are you sure you want to delete user "${target.username}"?`)) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassInput || newPassInput.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }
    setPassSuccessMsg('Password successfully reset for user.');
    setTimeout(() => {
      setResetPassUserId(null);
      setNewPassInput('');
      setPassSuccessMsg(null);
    }, 1500);
  };

  // Filtered Users
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.fullName.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <motion.div 
      key="settings"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-5xl mx-auto space-y-6"
    >
      {/* 1. MAIN OVERVIEW HUB (When no subtab is selected) */}
      {activeSubTab === null && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-slate-900 text-white font-mono text-[10px] font-bold rounded-lg tracking-widest uppercase">
                  Sentry Configuration
                </span>
                <span className="text-xs text-slate-400 font-medium">v2.440.1-lts</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Manage Sentry</h2>
              <p className="text-xs text-slate-500 mt-0.5">Configure system settings, monitor live logs, and manage user security permissions.</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <ShieldCheck size={14} />
                <span>System Operational</span>
              </div>
            </div>
          </div>

          {/* Sentry 2-Menu Section Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              type="button"
              onClick={() => setActiveSubTab('settings-monitoring')}
              className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/60 hover:border-blue-400 hover:shadow-md transition-all text-left flex items-start gap-4 group"
            >
              <div className="p-3.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
                <Activity size={26} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-base text-slate-900 group-hover:text-blue-900">
                    Settings & Monitoring
                  </h3>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Live stream application logs, log filter controls, and real-time backend diagnostic monitoring.
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 group-hover:underline">
                  <span>Open Settings & Monitoring</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('user-management')}
              className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/60 hover:border-blue-400 hover:shadow-md transition-all text-left flex items-start gap-4 group"
            >
              <div className="p-3.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
                <Users size={26} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-base text-slate-900 group-hover:text-indigo-900">
                    User Management
                  </h3>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Manage Sentry user credentials, roles, security permissions matrix, and password resets.
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 group-hover:underline">
                  <span>Open User Management</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 2. DEDICATED PAGE VIEW: SETTINGS & MONITORING */}
      {activeSubTab === 'settings-monitoring' && (
        <div className="space-y-6">
          {/* Top Bar with Back Provision */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-xs gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveSubTab(null)}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors shrink-0"
              >
                <ArrowLeft size={16} />
                <span>Back to Manage Sentry</span>
              </button>
              <div className="h-4 w-px bg-slate-200 hidden sm:block" />
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-blue-600" />
                <h2 className="text-base font-black text-slate-900">Settings & Monitoring</h2>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-emerald-700">Live Telemetry Active</span>
            </div>
          </div>

          {/* Status & Diagnostic Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                <span>SYSTEM LOGGING ENGINE</span>
                <Server size={16} className="text-blue-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">Active</span>
                <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">Realtime</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>File:</span>
                <span className="text-slate-800 font-bold">{logPath || 'logs/app.log'}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                <span>LOG STREAM RATE</span>
                <Cpu size={16} className="text-purple-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">12 msg/s</span>
                <span className="text-xs text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-md">Low Latency</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Auto Refresh:</span>
                <span className="text-slate-800 font-bold">{autoRefreshLogs ? 'Enabled (5s)' : 'Disabled'}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                <span>LOG STORAGE USAGE</span>
                <HardDrive size={16} className="text-amber-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">2.4 MB</span>
                <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md">Optimal</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Retention:</span>
                <span className="text-slate-800 font-bold">7 Days Rolling</span>
              </div>
            </div>
          </div>

          {/* Action Header bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
                <Terminal size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">System & Pipeline Console Log Stream</h3>
                <p className="text-xs text-slate-500">View real-time backend events, RCA agent calls, and HTTP API traffic.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchLogs}
              disabled={isLoadingLogs}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 shrink-0"
            >
              <RefreshCw size={14} className={isLoadingLogs ? 'animate-spin' : ''} />
              <span>Refresh Logs</span>
            </button>
          </div>

          {/* Log Stream Terminal Container */}
          <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            {/* Console Toolbar */}
            <div className="bg-slate-900 px-5 py-3 border-b border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-slate-400 font-mono text-xs ml-2 font-bold">
                  &gt;_ app.log — active stream
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <input
                    type="text"
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                    placeholder="Filter console log..."
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs rounded-xl px-3 py-1.5 font-mono focus:outline-none focus:border-blue-500/50"
                  />
                  {logFilter && (
                    <button 
                      onClick={() => setLogFilter('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <label className="flex items-center gap-2 text-slate-400 text-xs font-mono cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={autoRefreshLogs}
                    onChange={(e) => setAutoRefreshLogs(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-blue-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <span>AUTO (5S)</span>
                </label>
              </div>
            </div>

            {/* Console Output Area */}
            <div className="p-5 font-mono text-xs text-slate-300 h-96 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
              {isLoadingLogs && !logs ? (
                <div className="flex items-center justify-center h-full text-slate-500 gap-2">
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Loading backend system logs...</span>
                </div>
              ) : !logs ? (
                <div className="text-slate-500 italic p-4 text-center">No logs available or empty log stream.</div>
              ) : (
                logs.split('\n').filter(line => !logFilter || line.toLowerCase().includes(logFilter.toLowerCase())).map((line, idx) => {
                  let colorClass = 'text-slate-300';
                  if (line.includes('ERROR') || line.includes('CRITICAL') || line.includes('500') || line.includes('Failed')) {
                    colorClass = 'text-red-400 font-bold bg-red-950/30 px-1 rounded';
                  } else if (line.includes('WARN') || line.includes('404')) {
                    colorClass = 'text-amber-400';
                  } else if (line.includes('INFO') || line.includes('200')) {
                    colorClass = 'text-cyan-400';
                  }
                  return (
                    <div key={idx} className="flex items-start gap-3 hover:bg-slate-900/50 px-2 py-0.5 rounded leading-relaxed">
                      <span className="text-slate-600 select-none w-8 text-right shrink-0 font-mono text-[11px]">{idx + 1}</span>
                      <span className={`${colorClass} break-all font-mono`}>{line}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. DEDICATED PAGE VIEW: USER MANAGEMENT */}
      {activeSubTab === 'user-management' && (
        <div className="space-y-6">
          {/* Top Bar with Back Provision */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-xs gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveSubTab(null)}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors shrink-0"
              >
                <ArrowLeft size={16} />
                <span>Back to Manage Sentry</span>
              </button>
              <div className="h-4 w-px bg-slate-200 hidden sm:block" />
              <div className="flex items-center gap-2">
                <Users size={18} className="text-indigo-600" />
                <h2 className="text-base font-black text-slate-900">User Management</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openAddUserModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
              >
                <UserPlus size={16} />
                <span>Add New User</span>
              </button>
            </div>
          </div>

          {/* User Management Toolbar */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Sentry Users & Security Permissions</h3>
                <p className="text-xs text-slate-500">Configure access control, roles, and password management for all registered operators.</p>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
              <div className="relative flex-1 w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by username, full name, or email..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider shrink-0">Role:</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full sm:w-auto"
                >
                  <option value="ALL">All Roles ({users.length})</option>
                  <option value="Sentry Admin">Sentry Admin</option>
                  <option value="SRE Engineer">SRE Engineer</option>
                  <option value="DevOps Developer">DevOps Developer</option>
                  <option value="Read Only">Read Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* User Table */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-3.5">User / Email</th>
                    <th className="px-6 py-3.5">Assigned Role</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Last Active</th>
                    <th className="px-6 py-3.5">Created Date</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        <Users size={28} className="mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-xs">No users found matching your filter criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const initials = u.username.substring(0, 2).toUpperCase();
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0">
                                {initials}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                  <span>{u.fullName}</span>
                                  {u.role === 'Sentry Admin' && (
                                    <span title="Admin Access"><Shield size={12} className="text-blue-600" /></span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">@{u.username} • {u.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wider uppercase inline-block ${
                              u.role === 'Sentry Admin'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : u.role === 'SRE Engineer'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : u.role === 'DevOps Developer'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {u.role}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${u.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                              <span className="font-semibold text-xs text-slate-700">{u.status}</span>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-slate-500 font-medium">
                            <div className="flex items-center gap-1">
                              <Clock size={12} className="text-slate-400" />
                              <span>{u.lastActive}</span>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">
                            {formatDateOnly(u.createdAt)}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditUserModal(u)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit User Role & Details"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                onClick={() => setResetPassUserId(u.id)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Reset User Password"
                              >
                                <Key size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                disabled={u.username === 'admin'}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                                title={u.username === 'admin' ? 'Root admin cannot be deleted' : 'Delete User'}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Role-Based Access Control (RBAC) Security Matrix */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Sentry Security & Role Permission Matrix</h3>
                <p className="text-xs text-slate-500">Summary of capabilities granted per user role level in Sentry.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3">Permission Scope</th>
                    <th className="px-4 py-3 text-center">Sentry Admin</th>
                    <th className="px-4 py-3 text-center">SRE Engineer</th>
                    <th className="px-4 py-3 text-center">DevOps Developer</th>
                    <th className="px-4 py-3 text-center">Read Only</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-800">System Settings & Logging</td>
                    <td className="px-4 py-3 text-center"><CheckCircle2 size={16} className="text-emerald-500 mx-auto" /></td>
                    <td className="px-4 py-3 text-center"><CheckCircle2 size={16} className="text-emerald-500 mx-auto" /></td>
                    <td className="px-4 py-3 text-center"><X size={16} className="text-slate-300 mx-auto" /></td>
                    <td className="px-4 py-3 text-center"><X size={16} className="text-slate-300 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-800">User Management & Password Reset</td>
                    <td className="px-4 py-3 text-center"><CheckCircle2 size={16} className="text-emerald-500 mx-auto" /></td>
                    <td className="px-4 py-3 text-center"><X size={16} className="text-slate-300 mx-auto" /></td>
                    <td className="px-4 py-3 text-center"><X size={16} className="text-slate-300 mx-auto" /></td>
                    <td className="px-4 py-3 text-center"><X size={16} className="text-slate-300 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-800">Trigger RCA Analysis & Agents</td>
                    <td className="px-4 py-3 text-center"><CheckCircle2 size={16} className="text-emerald-500 mx-auto" /></td>
                    <td className="px-4 py-3 text-center"><CheckCircle2 size={16} className="text-emerald-500 mx-auto" /></td>
                    <td className="px-4 py-3 text-center"><CheckCircle2 size={16} className="text-emerald-500 mx-auto" /></td>
                    <td className="px-4 py-3 text-center"><X size={16} className="text-slate-300 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-800">View Logs & Incident Reports</td>
                    <td className="px-4 py-3 text-center"><CheckCircle2 size={16} className="text-emerald-500 mx-auto" /></td>
                    <td className="px-4 py-3 text-center"><CheckCircle2 size={16} className="text-emerald-500 mx-auto" /></td>
                    <td className="px-4 py-3 text-center"><CheckCircle2 size={16} className="text-emerald-500 mx-auto" /></td>
                    <td className="px-4 py-3 text-center"><CheckCircle2 size={16} className="text-emerald-500 mx-auto" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT USER */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    {editingUserId ? 'Edit User Credentials' : 'Create New Sentry User'}
                  </h2>
                  <p className="text-xs text-slate-400">Configure username, email, and security role</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddUserOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Username *</label>
                <input 
                  type="text" 
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="e.g. john.doe"
                  disabled={editingUserId !== null && formUsername === 'admin'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Email Address *</label>
                <input 
                  type="email" 
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. john.doe@company.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Role & Permissions</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as ManagedUser['role'])}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="Sentry Admin">Sentry Admin (Full System Access)</option>
                  <option value="SRE Engineer">SRE Engineer (RCA & Diagnostic Logs)</option>
                  <option value="DevOps Developer">DevOps Developer (Trigger & View Builds)</option>
                  <option value="Read Only">Read Only (Auditor View)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Account Status</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input 
                      type="radio" 
                      name="status"
                      checked={formStatus === 'Active'}
                      onChange={() => setFormStatus('Active')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input 
                      type="radio" 
                      name="status"
                      checked={formStatus === 'Inactive'}
                      onChange={() => setFormStatus('Inactive')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Inactive (Disabled)</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={14} />
                  <span>{editingUserId ? 'Save Changes' : 'Create User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESET PASSWORD */}
      {resetPassUserId && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
                  <Key size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Reset User Password</h2>
                  <p className="text-xs text-slate-400">
                    Target User: <span className="font-mono font-bold text-slate-700">
                      {users.find(u => u.id === resetPassUserId)?.username}
                    </span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setResetPassUserId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {passSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-medium flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                <span>{passSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">New Password *</label>
                <input 
                  type="password" 
                  value={newPassInput}
                  onChange={(e) => setNewPassInput(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  required
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetPassUserId(null)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Lock size={14} />
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
