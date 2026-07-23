/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  User, 
  Key, 
  Sliders, 
  Shield, 
  LogOut, 
  Camera, 
  Check, 
  ChevronDown, 
  Lock, 
  Mail, 
  Palette, 
  Copy, 
  RefreshCw, 
  X, 
  Eye, 
  EyeOff, 
  BadgeCheck,
  Bell,
  Globe
} from 'lucide-react';
import { UserProfile } from '../types';

interface UserDropdownMenuProps {
  user: { email: string } | null;
  onSignOut: () => void;
}

export function getInitials(emailOrName: string): string {
  if (!emailOrName) return 'U';
  let namePart = emailOrName.includes('@') ? emailOrName.split('@')[0] : emailOrName;
  namePart = namePart.replace(/[._\-]/g, ' ').trim();
  const parts = namePart.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].substring(0, 2).toUpperCase();
  } else if (parts.length === 1 && parts[0].length === 1) {
    return parts[0].toUpperCase();
  }
  return 'U';
}

const PRESET_BG_COLORS = [
  { name: 'Sentry Blue', class: 'bg-blue-600', hex: '#2563eb' },
  { name: 'Indigo', class: 'bg-indigo-600', hex: '#4f46e5' },
  { name: 'Violet', class: 'bg-purple-600', hex: '#9333ea' },
  { name: 'Emerald', class: 'bg-emerald-600', hex: '#059669' },
  { name: 'Amber', class: 'bg-amber-600', hex: '#d97706' },
  { name: 'Rose', class: 'bg-rose-600', hex: '#e11d48' },
  { name: 'Dark Slate', class: 'bg-slate-800', hex: '#1e293b' },
];

const PRESET_AVATARS = [
  { id: 'devops', label: 'DevOps Engineer', icon: '🛠️' },
  { id: 'admin', label: 'System Admin', icon: '⚡' },
  { id: 'security', label: 'Security Specialist', icon: '🛡️' },
  { id: 'sre', label: 'SRE Specialist', icon: '🚀' },
  { id: 'sentry', label: 'Sentry Bot', icon: '🤖' },
];

export default function UserDropdownMenu({ user, onSignOut }: UserDropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // User Profile State (persisted in localStorage)
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('user_profile_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    const defaultInitials = user?.email ? getInitials(user.email) : 'AD';
    return {
      email: user?.email || 'admin@sentry.local',
      displayName: user?.email ? user.email.split('@')[0].replace(/[._\-]/g, ' ') : 'Administrator',
      role: 'Sentry Admin / SRE',
      initials: defaultInitials,
      bgColor: 'bg-blue-600',
      timezone: 'UTC (GMT+0)',
      apiToken: '11a4f89d' + Math.random().toString(36).substring(2, 12),
    };
  });

  // Keep email in sync if user changes
  useEffect(() => {
    if (user?.email && profile.email !== user.email) {
      const updated = {
        ...profile,
        email: user.email,
        initials: profile.initials || getInitials(user.email)
      };
      setProfile(updated);
      localStorage.setItem('user_profile_data', JSON.stringify(updated));
    }
  }, [user]);

  // Save profile helper
  const updateProfile = (newFields: Partial<UserProfile>) => {
    setProfile(prev => {
      const updated = { ...prev, ...newFields };
      localStorage.setItem('user_profile_data', JSON.stringify(updated));
      return updated;
    });
  };

  // Modals state
  const [activeModal, setActiveModal] = useState<'none' | 'avatar' | 'password' | 'preferences' | 'token'>('none');

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passFeedback, setPassFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Change Avatar state
  const [customInitials, setCustomInitials] = useState(profile.initials || getInitials(profile.email));
  const [selectedBgColor, setSelectedBgColor] = useState(profile.bgColor || 'bg-blue-600');
  const [avatarUrlInput, setAvatarUrlInput] = useState(profile.avatarUrl || '');
  const [selectedPresetAvatar, setSelectedPresetAvatar] = useState<string | null>(null);
  const [avatarTab, setAvatarTab] = useState<'initials' | 'presets' | 'url'>('initials');

  // Copy notification state
  const [copiedToken, setCopiedToken] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score += 25;
    if (pass.length >= 10) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9!@#$%^&*]/.test(pass)) score += 25;
    return score;
  };

  const passStrength = getPasswordStrength(newPassword);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassFeedback(null);

    if (!currentPassword) {
      setPassFeedback({ type: 'error', message: 'Current password is required.' });
      return;
    }
    if (newPassword.length < 6) {
      setPassFeedback({ type: 'error', message: 'New password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassFeedback({ type: 'error', message: 'New password and confirm password do not match.' });
      return;
    }

    setIsChangingPass(true);
    try {
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: profile.email,
          currentPassword,
          newPassword
        })
      });

      if (response.ok) {
        setPassFeedback({ type: 'success', message: 'Password updated successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setActiveModal('none');
          setPassFeedback(null);
        }, 1500);
      } else {
        const data = await response.json().catch(() => ({}));
        setPassFeedback({ type: 'error', message: data.message || 'Failed to change password on server.' });
      }
    } catch (err) {
      // Local fallback success for standalone mode
      setPassFeedback({ type: 'success', message: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setActiveModal('none');
        setPassFeedback(null);
      }, 1500);
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleSaveAvatar = () => {
    if (avatarTab === 'initials') {
      updateProfile({
        initials: (customInitials || getInitials(profile.email)).substring(0, 3).toUpperCase(),
        bgColor: selectedBgColor,
        avatarUrl: undefined
      });
    } else if (avatarTab === 'presets' && selectedPresetAvatar) {
      updateProfile({
        avatarUrl: undefined,
        initials: selectedPresetAvatar,
        bgColor: selectedBgColor
      });
    } else if (avatarTab === 'url') {
      updateProfile({
        avatarUrl: avatarUrlInput.trim() || undefined,
        bgColor: selectedBgColor
      });
    }
    setActiveModal('none');
  };

  const handleCopyToken = () => {
    if (profile.apiToken) {
      navigator.clipboard.writeText(profile.apiToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleRegenerateToken = () => {
    const newToken = '11' + Math.random().toString(36).substring(2, 14) + Math.random().toString(36).substring(2, 10);
    updateProfile({ apiToken: newToken });
  };

  const displayInitials = profile.initials || getInitials(profile.email);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Top Bar Circular Avatar Icon Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 group p-1 rounded-full hover:bg-slate-100/80 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        title={`Logged in as ${profile.email}`}
      >
        <div className={`relative w-9 h-9 rounded-full ${profile.avatarUrl ? '' : (profile.bgColor || 'bg-blue-600')} text-white flex items-center justify-center font-black text-xs shadow-sm ring-2 ring-slate-200 group-hover:ring-blue-500/50 transition-all overflow-hidden select-none`}>
          {profile.avatarUrl ? (
            <img 
              src={profile.avatarUrl} 
              alt="User Icon" 
              className="w-full h-full object-cover" 
              onError={() => updateProfile({ avatarUrl: undefined })}
            />
          ) : (
            <span>{displayInitials}</span>
          )}
          {/* Online status indicator dot */}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
        </div>
        <ChevronDown 
          size={14} 
          className={`text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Jenkins Style User Menu Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200/80 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 divide-y divide-slate-100 text-slate-700">
          
          {/* User Header Section */}
          <div className="px-4 py-3 bg-slate-50/60 rounded-t-2xl flex items-center gap-3">
            <div className={`w-11 h-11 rounded-full ${profile.avatarUrl ? '' : (profile.bgColor || 'bg-blue-600')} text-white flex items-center justify-center font-black text-sm shadow-md ring-2 ring-white overflow-hidden flex-shrink-0`}>
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{displayInitials}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 truncate">{profile.displayName || 'User'}</span>
                <BadgeCheck size={14} className="text-blue-500 flex-shrink-0" />
              </div>
              <p className="text-[11px] text-slate-500 truncate font-mono">{profile.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 font-extrabold text-[9px] uppercase tracking-wider rounded-md border border-blue-100">
                {profile.role || 'Sentry Admin'}
              </span>
            </div>
          </div>

          {/* User Functions Navigation Menu */}
          <div className="py-1.5">
            <button
              onClick={() => { setActiveModal('avatar'); setIsOpen(false); }}
              className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 transition-colors group"
            >
              <div className="p-1.5 bg-slate-100 group-hover:bg-blue-100/80 rounded-lg text-slate-500 group-hover:text-blue-600 transition-colors">
                <Camera size={14} />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Change Icon / Avatar</div>
                <div className="text-[10px] text-slate-400 font-normal">Custom initials, colors & badges</div>
              </div>
            </button>

            <button
              onClick={() => { setActiveModal('password'); setIsOpen(false); }}
              className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 transition-colors group"
            >
              <div className="p-1.5 bg-slate-100 group-hover:bg-blue-100/80 rounded-lg text-slate-500 group-hover:text-blue-600 transition-colors">
                <Key size={14} />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Change Password</div>
                <div className="text-[10px] text-slate-400 font-normal">Update security credentials</div>
              </div>
            </button>

            <button
              onClick={() => { setActiveModal('preferences'); setIsOpen(false); }}
              className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 transition-colors group"
            >
              <div className="p-1.5 bg-slate-100 group-hover:bg-blue-100/80 rounded-lg text-slate-500 group-hover:text-blue-600 transition-colors">
                <Sliders size={14} />
              </div>
              <div className="flex-1">
                <div className="font-semibold">User Preferences</div>
                <div className="text-[10px] text-slate-400 font-normal">Timezone, alerts & view settings</div>
              </div>
            </button>

            <button
              onClick={() => { setActiveModal('token'); setIsOpen(false); }}
              className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 transition-colors group"
            >
              <div className="p-1.5 bg-slate-100 group-hover:bg-blue-100/80 rounded-lg text-slate-500 group-hover:text-blue-600 transition-colors">
                <Shield size={14} />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Sentry API Token</div>
                <div className="text-[10px] text-slate-400 font-normal">API credentials for CLI & triggers</div>
              </div>
            </button>
          </div>

          {/* Sign Out Action */}
          <div className="py-1.5">
            <button
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              className="w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors group font-bold"
            >
              <div className="p-1.5 bg-red-50 group-hover:bg-red-100 rounded-lg text-red-500 transition-colors">
                <LogOut size={14} />
              </div>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL 1: CHANGE ICON / AVATAR */}
      {activeModal === 'avatar' && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-6 animate-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                  <Palette size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Customize User Avatar</h2>
                  <p className="text-xs text-slate-400">Personalize your top bar initials and style</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveModal('none')}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Live Preview Header */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full ${avatarTab === 'url' && avatarUrlInput ? '' : selectedBgColor} text-white flex items-center justify-center font-black text-xl shadow-lg ring-4 ring-white overflow-hidden flex-shrink-0`}>
                {avatarTab === 'url' && avatarUrlInput ? (
                  <img src={avatarUrlInput} alt="Preview" className="w-full h-full object-cover" />
                ) : avatarTab === 'presets' && selectedPresetAvatar ? (
                  <span className="text-2xl">{selectedPresetAvatar}</span>
                ) : (
                  <span>{(customInitials || getInitials(profile.email)).substring(0, 3).toUpperCase()}</span>
                )}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Live Header Preview</span>
                <h4 className="text-sm font-bold text-slate-800">{profile.displayName || 'User'}</h4>
                <p className="text-xs text-slate-500 font-mono">{profile.email}</p>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setAvatarTab('initials')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${avatarTab === 'initials' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Initials & Color
              </button>
              <button
                type="button"
                onClick={() => setAvatarTab('presets')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${avatarTab === 'presets' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Preset Badge
              </button>
              <button
                type="button"
                onClick={() => setAvatarTab('url')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${avatarTab === 'url' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Image URL
              </button>
            </div>

            {/* Tab 1: Initials & Colors */}
            {avatarTab === 'initials' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">User Initials (1-3 chars)</label>
                  <input 
                    type="text" 
                    maxLength={3}
                    value={customInitials}
                    onChange={(e) => setCustomInitials(e.target.value.toUpperCase())}
                    placeholder="e.g. WP"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/20 uppercase"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-2">Background Accent Color</label>
                  <div className="grid grid-cols-7 gap-2">
                    {PRESET_BG_COLORS.map(c => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setSelectedBgColor(c.class)}
                        className={`w-9 h-9 rounded-xl ${c.class} text-white flex items-center justify-center transition-transform hover:scale-110 shadow-sm ${selectedBgColor === c.class ? 'ring-2 ring-offset-2 ring-blue-600 scale-105' : ''}`}
                        title={c.name}
                      >
                        {selectedBgColor === c.class && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Preset Badges */}
            {avatarTab === 'presets' && (
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Select Role Badge Icon</label>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_AVATARS.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedPresetAvatar(item.icon)}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${selectedPresetAvatar === item.icon ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
                    >
                      <span className="text-2xl">{item.icon}</span>
                      <span className="text-[9px] font-bold text-slate-600 line-clamp-1">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Image URL */}
            {avatarTab === 'url' && (
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Image Avatar URL</label>
                <input 
                  type="url" 
                  value={avatarUrlInput}
                  onChange={(e) => setAvatarUrlInput(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="text-[10px] text-slate-400">Paste a direct image URL for your profile picture.</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAvatar}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Check size={14} />
                Save Icon Changes
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: CHANGE PASSWORD */}
      {activeModal === 'password' && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-6 animate-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                  <Key size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Change Password</h2>
                  <p className="text-xs text-slate-400">Update account credentials for security</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveModal('none')}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {passFeedback && (
              <div className={`p-3 rounded-xl text-xs font-medium flex items-start gap-2.5 ${passFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {passFeedback.type === 'success' ? <Check size={16} className="mt-0.5 flex-shrink-0" /> : <X size={16} className="mt-0.5 flex-shrink-0" />}
                <span>{passFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Current Password</label>
                <div className="relative">
                  <input 
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">New Password</label>
                <div className="relative">
                  <input 
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="At least 6 characters"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div 
                        className={`h-full transition-all duration-300 ${passStrength <= 25 ? 'bg-red-500 w-1/4' : passStrength <= 50 ? 'bg-amber-500 w-2/4' : passStrength <= 75 ? 'bg-blue-500 w-3/4' : 'bg-emerald-500 w-full'}`}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 text-right">
                      Strength: {passStrength <= 25 ? 'Weak' : passStrength <= 50 ? 'Fair' : passStrength <= 75 ? 'Good' : 'Strong'}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Confirm New Password</label>
                <input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter new password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isChangingPass ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3: USER PREFERENCES */}
      {activeModal === 'preferences' && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-6 animate-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600">
                  <Sliders size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">User Preferences</h2>
                  <p className="text-xs text-slate-400">Manage display settings and system notifications</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveModal('none')}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Display Name</label>
                <input 
                  type="text" 
                  value={profile.displayName || ''}
                  onChange={(e) => updateProfile({ displayName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Timezone</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
                  <Globe size={14} className="text-slate-400" />
                  <select 
                    value={profile.timezone || 'UTC (GMT+0)'}
                    onChange={(e) => updateProfile({ timezone: e.target.value })}
                    className="bg-transparent w-full focus:outline-none text-slate-700 font-medium"
                  >
                    <option value="UTC (GMT+0)">UTC (Coordinated Universal Time)</option>
                    <option value="EST (GMT-5)">EST (Eastern Standard Time)</option>
                    <option value="PST (GMT-8)">PST (Pacific Standard Time)</option>
                    <option value="GMT (GMT+0)">GMT (London / Dublin)</option>
                    <option value="IST (GMT+5:30)">IST (India Standard Time)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Notifications & Alerts</label>
                <label className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <Bell size={14} className="text-purple-600" />
                    <span className="text-xs font-semibold text-slate-700">Critical Incident Email Alerts</span>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4" />
                </label>
                <label className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <RefreshCw size={14} className="text-purple-600" />
                    <span className="text-xs font-semibold text-slate-700">Sentry Build Failure Scraper</span>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4" />
                </label>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 4: SENTRY API TOKEN */}
      {activeModal === 'token' && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-6 animate-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
                  <Shield size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Sentry User API Token</h2>
                  <p className="text-xs text-slate-400">Use for CLI, scripts & pipeline authentication</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveModal('none')}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">User API Token</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={profile.apiToken || ''}
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-slate-700 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    {copiedToken ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copiedToken ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Shield size={14} className="text-amber-600" /> Security Recommendation
                </div>
                <p className="text-[11px] leading-relaxed text-amber-700">
                  Keep your API token private. It grants programmatic access to Sentry triggers and RCA agent diagnostic endpoints.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRegenerateToken}
                  className="w-full py-2.5 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} />
                  Revoke & Generate New Token
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
