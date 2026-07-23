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
  ChevronRight,
  Plus
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
  role: string;
  status: 'Active' | 'Inactive';
  lastActive: string;
  createdAt: string;
}

export interface RolePermissionMap {
  system_settings: boolean;
  user_management: boolean;
  rca_analysis: boolean;
  view_logs: boolean;
  manage_datasources: boolean;
  manage_models: boolean;
  api_access: boolean;
}

export interface CustomRole {
  id: string;
  name: string;
  description: string;
  isSystem?: boolean;
  color: 'purple' | 'blue' | 'emerald' | 'amber' | 'slate' | 'indigo' | 'rose';
  permissions: RolePermissionMap;
}

const INITIAL_ROLES: CustomRole[] = [
  {
    id: 'role-admin',
    name: 'Sentry Admin',
    description: 'Full system configuration, security role management, and root privileges.',
    isSystem: true,
    color: 'purple',
    permissions: {
      system_settings: true,
      user_management: true,
      rca_analysis: true,
      view_logs: true,
      manage_datasources: true,
      manage_models: true,
      api_access: true,
    }
  },
  {
    id: 'role-sre',
    name: 'SRE Engineer',
    description: 'Trigger root cause diagnostics, inspect live telemetry, manage sources and models.',
    isSystem: true,
    color: 'blue',
    permissions: {
      system_settings: true,
      user_management: false,
      rca_analysis: true,
      view_logs: true,
      manage_datasources: true,
      manage_models: true,
      api_access: true,
    }
  },
  {
    id: 'role-devops',
    name: 'DevOps Developer',
    description: 'Trigger pipeline agent runs, inspect incident logs, and generate API tokens.',
    isSystem: true,
    color: 'emerald',
    permissions: {
      system_settings: false,
      user_management: false,
      rca_analysis: true,
      view_logs: true,
      manage_datasources: false,
      manage_models: false,
      api_access: true,
    }
  },
  {
    id: 'role-readonly',
    name: 'Read Only',
    description: 'Auditor access for viewing logs, incident histories, and compliance reports.',
    isSystem: true,
    color: 'slate',
    permissions: {
      system_settings: false,
      user_management: false,
      rca_analysis: false,
      view_logs: true,
      manage_datasources: false,
      manage_models: false,
      api_access: false,
    }
  }
];

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

  // Roles Management State
  const [roles, setRoles] = useState<CustomRole[]>(() => {
    const saved = localStorage.getItem('sentry_custom_roles');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_ROLES;
  });

  useEffect(() => {
    localStorage.setItem('sentry_custom_roles', JSON.stringify(roles));
  }, [roles]);

  // Active view inside User Management: 'users' | 'roles'
  const [userMgmtTab, setUserMgmtTab] = useState<'users' | 'roles'>('users');

  // Role Add/Edit Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [roleColor, setRoleColor] = useState<CustomRole['color']>('purple');
  const [rolePermissions, setRolePermissions] = useState<RolePermissionMap>({
    system_settings: false,
    user_management: false,
    rca_analysis: true,
    view_logs: true,
    manage_datasources: false,
    manage_models: false,
    api_access: true,
  });
  const [roleModalError, setRoleModalError] = useState<string | null>(null);

  const openAddRoleModal = () => {
    setEditingRoleId(null);
    setRoleName('');
    setRoleDescription('');
    setRoleColor('purple');
    setRolePermissions({
      system_settings: false,
      user_management: false,
      rca_analysis: true,
      view_logs: true,
      manage_datasources: false,
      manage_models: false,
      api_access: true,
    });
    setRoleModalError(null);
    setIsRoleModalOpen(true);
  };

  const openEditRoleModal = (role: CustomRole) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleDescription(role.description);
    setRoleColor(role.color || 'purple');
    setRolePermissions({ ...role.permissions });
    setRoleModalError(null);
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    setRoleModalError(null);

    if (!roleName.trim()) {
      setRoleModalError('Role name is required.');
      return;
    }

    if (editingRoleId) {
      setRoles(prev => prev.map(r => {
        if (r.id === editingRoleId) {
          return {
            ...r,
            name: roleName.trim(),
            description: roleDescription.trim(),
            color: roleColor,
            permissions: { ...rolePermissions }
          };
        }
        return r;
      }));
    } else {
      if (roles.some(r => r.name.toLowerCase() === roleName.trim().toLowerCase())) {
        setRoleModalError('A role with this name already exists.');
        return;
      }
      const newRole: CustomRole = {
        id: 'role-' + Date.now(),
        name: roleName.trim(),
        description: roleDescription.trim() || 'Custom user role',
        color: roleColor,
        isSystem: false,
        permissions: { ...rolePermissions }
      };
      setRoles(prev => [...prev, newRole]);
    }

    setIsRoleModalOpen(false);
  };

  const handleDeleteRole = (roleId: string) => {
    const target = roles.find(r => r.id === roleId);
    if (!target) return;
    if (target.isSystem) {
      alert('System default roles cannot be deleted.');
      return;
    }
    const assignedCount = users.filter(u => u.role === target.name).length;
    if (assignedCount > 0) {
      alert(`Cannot delete role "${target.name}" because it is currently assigned to ${assignedCount} user(s). Reassign those users first.`);
      return;
    }
    if (confirm(`Are you sure you want to delete custom role "${target.name}"?`)) {
      setRoles(prev => prev.filter(r => r.id !== roleId));
    }
  };

  const handleTogglePermission = (roleId: string, permKey: keyof RolePermissionMap) => {
    setRoles(prev => prev.map(r => {
      if (r.id === roleId) {
        return {
          ...r,
          permissions: {
            ...r.permissions,
            [permKey]: !r.permissions[permKey]
          }
        };
      }
      return r;
    }));
  };

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
                <span className="text-xs text-slate-400 font-medium">v0.0.1</span>
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
          {/* Top Bar with Back Provision & Action Buttons */}
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
                <h2 className="text-base font-black text-slate-900">User & Access Management</h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openAddRoleModal}
                className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              >
                <Shield size={15} />
                <span>+ Add Custom Role</span>
              </button>

              <button
                type="button"
                onClick={openAddUserModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
              >
                <UserPlus size={16} />
                <span>+ Add New User</span>
              </button>
            </div>
          </div>

          {/* Subtab Navigation (User Accounts vs Roles & Permissions) */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setUserMgmtTab('users')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                userMgmtTab === 'users'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Users size={14} />
              <span>User Accounts ({users.length})</span>
            </button>

            <button
              onClick={() => setUserMgmtTab('roles')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                userMgmtTab === 'roles'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ShieldCheck size={14} />
              <span>Roles & Permission Matrix ({roles.length})</span>
            </button>
          </div>

          {/* USER ACCOUNTS VIEW */}
          {userMgmtTab === 'users' && (
            <div className="space-y-6">
              {/* User Management Toolbar */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Sentry Users & Access Accounts</h3>
                    <p className="text-xs text-slate-500">Manage operator credentials, role assignments, and password updates.</p>
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
                      {roles.map(r => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
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
                          const userRoleObj = roles.find(r => r.name === u.role);
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
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wider uppercase inline-block border ${
                                  userRoleObj?.color === 'purple' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                  userRoleObj?.color === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  userRoleObj?.color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  userRoleObj?.color === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  userRoleObj?.color === 'rose' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                  userRoleObj?.color === 'indigo' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                  'bg-slate-100 text-slate-600 border-slate-200'
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
            </div>
          )}

          {/* ROLES & PERMISSIONS MATRIX VIEW */}
          {userMgmtTab === 'roles' && (
            <div className="space-y-6">
              {/* Role Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {roles.map(r => {
                  const assignedCount = users.filter(u => u.role === r.name).length;
                  return (
                    <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 relative group">
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                          r.color === 'purple' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          r.color === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          r.color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          r.color === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          r.color === 'rose' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          r.color === 'indigo' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {r.isSystem ? 'System Default' : 'Custom Role'}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditRoleModal(r)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit Role & Permissions"
                          >
                            <Edit3 size={14} />
                          </button>
                          {!r.isSystem && (
                            <button
                              onClick={() => handleDeleteRole(r.id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Delete Role"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{r.name}</h4>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{r.description}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">Assigned Users:</span>
                        <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full">{assignedCount} users</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Role-Based Access Control (RBAC) Interactive Security Matrix */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Interactive Role Permission Matrix</h3>
                      <p className="text-xs text-slate-500">Click any checkmark to directly enable or disable permissions for a role in real time.</p>
                    </div>
                  </div>

                  <button
                    onClick={openAddRoleModal}
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>New Role</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-4 py-3 min-w-[200px]">Permission Scope</th>
                        {roles.map(r => (
                          <th key={r.id} className="px-4 py-3 text-center min-w-[120px]">
                            <div className="font-bold text-slate-800">{r.name}</div>
                            <div className="text-[9px] text-slate-400 font-mono uppercase">{r.isSystem ? 'System' : 'Custom'}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {[
                        { key: 'system_settings' as const, label: 'System Settings & Monitoring Access', desc: 'Configure system options and view live server status' },
                        { key: 'user_management' as const, label: 'User & Role Management', desc: 'Create users, manage roles, and reset passwords' },
                        { key: 'rca_analysis' as const, label: 'Trigger RCA Analysis & Diagnostic Agents', desc: 'Run root cause analysis on failed jobs' },
                        { key: 'view_logs' as const, label: 'View Incident Reports & Logs', desc: 'Read incident details and system telemetry' },
                        { key: 'manage_datasources' as const, label: 'Configure Data Sources & Integrations', desc: 'Add or modify Jenkins, Sentry, and DB connectors' },
                        { key: 'manage_models' as const, label: 'Manage LLM Diagnostic Models', desc: 'Switch active AI models and agent keys' },
                        { key: 'api_access' as const, label: 'API Token & CLI Access', desc: 'Generate user tokens for programmatic execution' }
                      ].map(perm => (
                        <tr key={perm.key} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800">{perm.label}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{perm.desc}</div>
                          </td>

                          {roles.map(r => {
                            const isAllowed = r.permissions[perm.key];
                            return (
                              <td key={r.id} className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleTogglePermission(r.id, perm.key)}
                                  className={`p-1.5 rounded-lg transition-transform active:scale-90 ${
                                    isAllowed ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                                  }`}
                                  title={`Click to ${isAllowed ? 'revoke' : 'grant'} "${perm.label}" for ${r.name}`}
                                >
                                  {isAllowed ? <CheckCircle2 size={18} className="mx-auto" /> : <X size={18} className="mx-auto" />}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
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
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.name}>{r.name} ({r.description})</option>
                  ))}
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

      {/* MODAL 2: ADD / EDIT CUSTOM ROLE */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600">
                  <Shield size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    {editingRoleId ? 'Edit Role & Permissions' : 'Create Custom Role'}
                  </h2>
                  <p className="text-xs text-slate-400">Define role title, description, and permission scope</p>
                </div>
              </div>
              <button 
                onClick={() => setIsRoleModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {roleModalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{roleModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Role Title *</label>
                <input 
                  type="text" 
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="e.g. Compliance Security Specialist"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Description</label>
                <input 
                  type="text" 
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  placeholder="Brief summary of duties and permissions"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Badge Color Theme</label>
                <div className="flex gap-2">
                  {(['purple', 'blue', 'emerald', 'amber', 'rose', 'indigo', 'slate'] as const).map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setRoleColor(color)}
                      className={`w-7 h-7 rounded-full transition-all flex items-center justify-center ${
                        color === 'purple' ? 'bg-purple-600' :
                        color === 'blue' ? 'bg-blue-600' :
                        color === 'emerald' ? 'bg-emerald-600' :
                        color === 'amber' ? 'bg-amber-600' :
                        color === 'rose' ? 'bg-rose-600' :
                        color === 'indigo' ? 'bg-indigo-600' : 'bg-slate-600'
                      } ${roleColor === color ? 'ring-4 ring-offset-2 ring-purple-500 scale-110' : 'opacity-80'}`}
                    >
                      {roleColor === color && <Check size={12} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-2">Granted Permissions</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {[
                    { key: 'system_settings' as const, label: 'System Settings & Monitoring Access' },
                    { key: 'user_management' as const, label: 'User & Role Management' },
                    { key: 'rca_analysis' as const, label: 'Trigger RCA Analysis & Agents' },
                    { key: 'view_logs' as const, label: 'View Incident Reports & Logs' },
                    { key: 'manage_datasources' as const, label: 'Configure Data Sources' },
                    { key: 'manage_models' as const, label: 'Manage LLM Models' },
                    { key: 'api_access' as const, label: 'API Token & CLI Access' }
                  ].map(p => (
                    <label key={p.key} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer text-xs font-semibold text-slate-700 hover:bg-slate-100/70">
                      <span>{p.label}</span>
                      <input 
                        type="checkbox" 
                        checked={rolePermissions[p.key]} 
                        onChange={(e) => setRolePermissions(prev => ({ ...prev, [p.key]: e.target.checked }))}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={14} />
                  <span>{editingRoleId ? 'Save Changes' : 'Create Role'}</span>
                </button>
              </div>
            </form>
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
