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
  Sliders
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
  role: 'Jenkins Admin' | 'SRE Engineer' | 'DevOps Developer' | 'Read Only';
  status: 'Active' | 'Inactive';
  lastActive: string;
  createdAt: string;
}

const INITIAL_USERS: ManagedUser[] = [
  {
    id: 'usr-1',
    username: 'admin',
    email: 'admin@jenkins.local',
    fullName: 'System Administrator',
    role: 'Jenkins Admin',
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
  // Top Level Sub-Nav: 'settings-monitoring' | 'user-management'
  const [activeSubTab, setActiveSubTab] = useState<'settings-monitoring' | 'user-management'>('settings-monitoring');

  // User Management State
  const [users, setUsers] = useState<ManagedUser[]>(() => {
    const saved = localStorage.getItem('jenkins_managed_users');
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
    localStorage.setItem('jenkins_managed_users', JSON.stringify(users));
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
      {/* Jenkins Settings Header & Sub-Nav Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-slate-900 text-white font-mono text-[10px] font-bold rounded-lg tracking-widest uppercase">
                Jenkins Configuration
              </span>
              <span className="text-xs text-slate-400 font-medium">v2.440.1-lts</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Manage Jenkins</h2>
            <p className="text-xs text-slate-500 mt-0.5">Configure system settings, monitor live logs, and manage user security permissions.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck size={14} />
              <span>System Operational</span>
            </div>
          </div>
        </div>

        {/* Jenkins 2-Menu Cards / Navigation Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setActiveSubTab('settings-monitoring')}
            className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group flex items-start gap-4 ${
              activeSubTab === 'settings-monitoring'
                ? 'bg-blue-50/70 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300'
            }`}
          >
            <div className={`p-3 rounded-xl transition-all ${
              activeSubTab === 'settings-monitoring' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 text-slate-700 group-hover:bg-slate-300'
            }`}>
              <Activity size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className={`font-black text-sm ${activeSubTab === 'settings-monitoring' ? 'text-blue-900' : 'text-slate-800'}`}>
                  1. Settings & Monitoring
                </h3>
                {activeSubTab === 'settings-monitoring' && (
                  <BadgeCheck size={16} className="text-blue-600 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Live stream application logs, log filter controls, and real-time backend diagnostic monitoring.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('user-management')}
            className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group flex items-start gap-4 ${
              activeSubTab === 'user-management'
                ? 'bg-blue-50/70 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300'
            }`}
          >
            <div className={`p-3 rounded-xl transition-all ${
              activeSubTab === 'user-management' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 text-slate-700 group-hover:bg-slate-300'
            }`}>
              <Users size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className={`font-black text-sm ${activeSubTab === 'user-management' ? 'text-blue-900' : 'text-slate-800'}`}>
                  2. User Management
                </h3>
                {activeSubTab === 'user-management' && (
                  <BadgeCheck size={16} className="text-blue-600 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Manage Jenkins user credentials, roles, security permissions matrix, and password resets.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* SUB-MENU 1: SETTINGS & MONITORING */}
      {activeSubTab === 'settings-monitoring' && (
        <div className="space-y-6">
          {/* Status & Diagnostic Metrics Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                <span>System Logging Engine</span>
                <Server size={16} className="text-blue-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-slate-900">Active</span>
                <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">Realtime</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>File:</span>
                <span className="font-bold text-slate-700 truncate max-w-[150px]">{logPath || 'logs/app.log'}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                <span>Log Stream Rate</span>
                <Cpu size={16} className="text-purple-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-slate-900">12 msg/s</span>
                <span className="text-xs text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-md">Low Latency</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Auto Refresh:</span>
                <span className="font-bold text-slate-700">{autoRefreshLogs ? 'Enabled (5s)' : 'Manual'}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                <span>Log Storage Usage</span>
                <HardDrive size={16} className="text-amber-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-slate-900">2.4 MB</span>
                <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md">Optimal</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Retention:</span>
                <span className="font-bold text-slate-700">7 Days Rolling</span>
              </div>
            </div>
          </div>

          {/* Action Bar & Log Refresh */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-900 text-white rounded-xl">
                <Terminal size={18} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">System & Pipeline Console Log Stream</h4>
                <p className="text-xs text-slate-500">View real-time backend events, RCA agent calls, and HTTP API traffic.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchLogs}
                disabled={isLoadingLogs}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
              >
                <RefreshCw size={14} className={isLoadingLogs ? 'animate-spin' : ''} />
                {isLoadingLogs ? 'Refreshing...' : 'Refresh Logs'}
              </button>
            </div>
          </div>

          {/* Logs Console */}
          <div className="bg-slate-950 rounded-3xl border border-slate-900 shadow-xl overflow-hidden flex flex-col h-[550px]">
            {/* Console Header */}
            <div className="bg-slate-900 px-5 py-3.5 border-b border-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 bg-red-500/80 rounded-full" />
                  <span className="w-3 h-3 bg-yellow-500/80 rounded-full" />
                  <span className="w-3 h-3 bg-green-500/80 rounded-full" />
                </div>
                <span className="text-xs text-slate-400 font-mono tracking-tight flex items-center gap-2">
                  <Terminal size={14} className="text-slate-500" />
                  {logPath ? logPath.split('/').pop() : 'app.log'} — active stream
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {/* Log Filter Input */}
                <div className="relative w-full sm:w-52">
                  <input
                    type="text"
                    placeholder="Filter console log..."
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-slate-700 font-mono"
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

                {/* Auto refresh switch */}
                <label className="flex items-center gap-2 cursor-pointer select-none whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={autoRefreshLogs}
                    onChange={(e) => setAutoRefreshLogs(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-7 h-4 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white relative"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Auto (5s)</span>
                </label>
              </div>
            </div>

            {/* Console Output */}
            <div className="flex-1 overflow-y-auto p-5 font-mono text-xs leading-relaxed space-y-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {(() => {
                const allLines = logs.split('\n');
                const filteredLines = allLines.filter(line => 
                  !logFilter || line.toLowerCase().includes(logFilter.toLowerCase())
                );

                if (filteredLines.length === 0 || (filteredLines.length === 1 && !filteredLines[0])) {
                  return (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
                      <Terminal size={28} className="text-slate-700 animate-pulse" />
                      <p className="text-xs">No matching log entries found.</p>
                    </div>
                  );
                }

                return filteredLines.map((line, index) => {
                  if (!line.trim()) return null;

                  let colorClass = 'text-slate-400';
                  if (line.includes('[ERROR]')) {
                    colorClass = 'text-red-400 font-medium';
                  } else if (line.includes('[WARN]')) {
                    colorClass = 'text-yellow-400/90 font-medium';
                  } else if (line.includes('[HTTP]')) {
                    colorClass = 'text-cyan-400';
                  } else if (line.includes('[INFO]')) {
                    colorClass = 'text-slate-300';
                  }

                  return (
                    <div key={index} className="hover:bg-slate-900/40 px-2 py-0.5 rounded transition-all flex items-start gap-3 border-l-2 border-transparent hover:border-slate-800">
                      <span className="text-slate-700 select-none text-[10px] w-8 text-right shrink-0">{index + 1}</span>
                      <span className={colorClass}>{line}</span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* SUB-MENU 2: USER MANAGEMENT */}
      {activeSubTab === 'user-management' && (
        <div className="space-y-6">
          {/* User Management Toolbar */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Jenkins Users & Security Permissions</h3>
                <p className="text-xs text-slate-500">Configure access control, roles, and password management for all registered operators.</p>
              </div>

              <button
                onClick={openAddUserModal}
                className="w-full md:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                <UserPlus size={16} />
                <span>Add New User</span>
              </button>
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
                  <option value="Jenkins Admin">Jenkins Admin</option>
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
                                  {u.role === 'Jenkins Admin' && (
                                    <span title="Admin Access"><Shield size={12} className="text-blue-600" /></span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">@{u.username} • {u.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wider uppercase inline-block ${
                              u.role === 'Jenkins Admin'
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
                <h3 className="text-base font-bold text-slate-900">Jenkins Security & Role Permission Matrix</h3>
                <p className="text-xs text-slate-500">Summary of capabilities granted per user role level in Jenkins.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3">Permission Scope</th>
                    <th className="px-4 py-3 text-center">Jenkins Admin</th>
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
                    {editingUserId ? 'Edit User Credentials' : 'Create New Jenkins User'}
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
                  <option value="Jenkins Admin">Jenkins Admin (Full System Access)</option>
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
