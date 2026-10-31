/**
 * Copyright 2026 Google LLC
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  RotateCw, 
  Plus, 
  Key, 
  ShieldCheck, 
  AlertTriangle, 
  Search, 
  Clock, 
  CheckCircle2, 
  Layers, 
  History,
  ShieldAlert,
  RefreshCw,
  Unplug
} from 'lucide-react';

export interface SecretItem {
  id: string;
  key: string;
  value: string;
  fullValue?: string;
  source: 'vault' | 'local' | 'env';
  vaultPath?: string;
  environment: 'production' | 'staging' | 'development';
  scope: string;
  lastRotated: string;
  expiresInDays: number;
  status: 'valid' | 'expiring_soon' | 'expired';
}

interface VaultStatus {
  address: string;
  mount: string;
  pathPrefix: string;
  namespace: string;
  configured: boolean;
  connected: boolean;
  hasToken: boolean;
  tokenFromEnv: boolean;
  version?: string;
  error?: string;
}

export const INITIAL_SECRETS: SecretItem[] = [];

export default function SecretsVaultPage() {
  const [secrets, setSecrets] = useState<SecretItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEnv, setFilterEnv] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // New Secret Form State
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyEnv, setNewKeyEnv] = useState<'production' | 'staging' | 'development'>('production');
  const [newKeyScope, setNewKeyScope] = useState('');
  const [secretError, setSecretError] = useState<string | null>(null);

  // HashiCorp Vault Connection State
  const [vault, setVault] = useState<VaultStatus | null>(null);
  const [vaultForm, setVaultForm] = useState({ address: '', token: '', mount: 'secret', pathPrefix: 'devops-studio', namespace: '' });
  const [isVaultFormOpen, setIsVaultFormOpen] = useState(false);
  const [isConnectingVault, setIsConnectingVault] = useState(false);
  const [vaultFormError, setVaultFormError] = useState<string | null>(null);
  const [vaultListError, setVaultListError] = useState<string | null>(null);

  const applyVaultStatus = (status: VaultStatus) => {
    setVault(status);
    setVaultForm({ address: status.address, token: '', mount: status.mount, pathPrefix: status.pathPrefix, namespace: status.namespace });
  };

  const fetchVaultStatus = async () => {
    try {
      const res = await fetch('/api/config-mgmt/vault');
      const data = await res.json();
      if (data.success) applyVaultStatus(data.vault);
    } catch (err) {
      console.error('Failed to load Vault status:', err);
    }
  };

  const fetchSecrets = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/config-mgmt/secrets');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.secrets)) {
          setSecrets(data.secrets);
          setVaultListError(data.vaultError || null);
        }
      }
    } catch (err) {
      console.error('Failed to load secrets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSecrets();
    fetchVaultStatus();
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const toggleSecretReveal = (id: string) => {
    setRevealedSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    showNotification('Secret copied to clipboard (clears automatically)');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const openSecretModal = (sec?: SecretItem) => {
    setNewKeyName(sec?.key || '');
    setNewKeyValue('');
    setNewKeyEnv(sec?.environment || 'production');
    setNewKeyScope(sec?.scope || '');
    setSecretError(null);
    setIsAddModalOpen(true);
  };

  const handleCreateSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName || !newKeyValue) return;

    const formattedKey = newKeyName.toUpperCase().replace(/\s+/g, '_');
    setSecretError(null);
    try {
      const res = await fetch('/api/config-mgmt/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: formattedKey,
          value: newKeyValue,
          environment: newKeyEnv,
          scope: newKeyScope || 'Application Service'
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSecretError(data.error || `Request failed with status ${res.status}`);
        return;
      }
      setSecrets(data.secrets);
      setVaultListError(data.vaultError || null);
      showNotification(vault?.configured ? `Secret ${formattedKey} stored in HashiCorp Vault.` : `Secret ${formattedKey} saved on this server, unencrypted.`);
    } catch (err) {
      setSecretError('Could not reach the server. The secret was not saved.');
      return;
    }

    setIsAddModalOpen(false);
    setNewKeyName('');
    setNewKeyValue('');
    setNewKeyScope('');
  };

  const handleConnectVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setVaultFormError(null);
    setIsConnectingVault(true);
    try {
      const res = await fetch('/api/config-mgmt/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vaultForm)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVaultFormError(data.error || `Request failed with status ${res.status}`);
        return;
      }
      applyVaultStatus(data.vault);
      setIsVaultFormOpen(false);
      await fetchSecrets();
      showNotification(`Connected to HashiCorp Vault at ${data.vault.address}.`);
    } catch (err) {
      setVaultFormError('Could not reach the server.');
    } finally {
      setIsConnectingVault(false);
    }
  };

  const handleDisconnectVault = async () => {
    if (!confirm('Disconnect from HashiCorp Vault? Secrets stay in Vault, but new secrets will be saved on this server, unencrypted.')) return;
    const res = await fetch('/api/config-mgmt/vault', { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (data.success) {
      applyVaultStatus(data.vault);
      await fetchSecrets();
      showNotification(data.vault.configured ? 'Saved Vault settings removed. VAULT_ADDR and VAULT_TOKEN are still set.' : 'Disconnected from HashiCorp Vault.');
    }
  };

  const filteredSecrets = secrets.filter(s => {
    const matchesSearch = s.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.scope.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEnv = filterEnv === 'all' || s.environment === filterEnv;
    return matchesSearch && matchesEnv;
  });

  const expiringCount = secrets.filter(s => s.status === 'expiring_soon').length;
  const vaultCount = secrets.filter(s => s.source === 'vault').length;
  const localCount = secrets.filter(s => s.source === 'local').length;
  const showVaultForm = isVaultFormOpen || !vault?.connected;

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

      {/* Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
              <Lock size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                  Configuration Management
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400">HashiCorp Vault &bull; KV v2</span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">Secrets & Key Vault</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Store secrets in HashiCorp Vault. Values are write-only here: this page shows names and paths, never Vault values.
              </p>
            </div>
          </div>

          <button
            onClick={() => openSecretModal()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 shrink-0"
          >
            <Plus size={14} />
            <span>Store New Secret</span>
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Secrets</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{secrets.length}</div>
            <span className="text-[11px] font-medium text-slate-500 font-mono">{vaultCount} in Vault</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vault Engine</span>
            <div className={`text-2xl font-black mt-1 ${vault?.connected ? 'text-emerald-600' : 'text-slate-900'}`}>
              {vault?.connected ? 'Connected' : vault?.configured ? 'Error' : 'Off'}
            </div>
            <span className="text-[11px] font-medium text-slate-500 font-mono">
              {vault?.connected ? `HashiCorp Vault v${vault.version}` : 'HashiCorp Vault'}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expiring Soon</span>
            <div className={`text-2xl font-black mt-1 ${expiringCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{expiringCount}</div>
            <span className="text-[11px] font-medium text-amber-600 font-mono">&lt; 7 days to rotate</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Saved Locally</span>
            <div className={`text-2xl font-black mt-1 ${localCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{localCount}</div>
            <span className="text-[11px] font-medium text-slate-500 font-mono">Unencrypted on disk</span>
          </div>
        </div>
      </div>

      {/* HashiCorp Vault Connection */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-slate-900">HashiCorp Vault Connection</h3>
            <p className="text-xs text-slate-500 font-mono truncate">
              {vault?.connected
                ? `${vault.address} • ${vault.mount}/${vault.pathPrefix}`
                : 'Not connected. New secrets are saved on this server, unencrypted.'}
            </p>
          </div>
          {vault?.connected && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsVaultFormOpen(open => !open)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
              >
                {isVaultFormOpen ? 'Close' : 'Edit'}
              </button>
              <button
                type="button"
                onClick={handleDisconnectVault}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Unplug size={13} />
                <span>Disconnect</span>
              </button>
            </div>
          )}
        </div>

        {(vault?.error || vaultListError) && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{vault?.error || vaultListError}</span>
          </div>
        )}

        {showVaultForm && (
          <form onSubmit={handleConnectVault} className="space-y-3 pt-3 border-t border-slate-100">
            {vaultFormError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{vaultFormError}</span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Vault Address</label>
                <input
                  type="text"
                  required
                  placeholder="https://vault.internal:8200"
                  value={vaultForm.address}
                  onChange={(e) => setVaultForm({ ...vaultForm, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {vaultForm.address.startsWith('http://') && (
                  <p className="text-[11px] text-amber-600 mt-1">http sends the token and secrets unencrypted. Use https outside local testing.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Token</label>
                <input
                  type="password"
                  autoComplete="off"
                  placeholder={vault?.hasToken ? 'Saved. Leave blank to keep it.' : 'Vault token'}
                  value={vaultForm.token}
                  onChange={(e) => setVaultForm({ ...vaultForm, token: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {vault?.tokenFromEnv ? 'Using VAULT_TOKEN from the server environment.' : 'A token entered here is saved in plaintext on this server. VAULT_TOKEN is safer.'}
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">KV v2 Mount</label>
                <input
                  type="text"
                  required
                  value={vaultForm.mount}
                  onChange={(e) => setVaultForm({ ...vaultForm, mount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Path Prefix</label>
                <input
                  type="text"
                  value={vaultForm.pathPrefix}
                  onChange={(e) => setVaultForm({ ...vaultForm, pathPrefix: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Namespace (Enterprise only)</label>
                <input
                  type="text"
                  value={vaultForm.namespace}
                  onChange={(e) => setVaultForm({ ...vaultForm, namespace: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isConnectingVault}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
              >
                <ShieldCheck size={13} />
                <span>{isConnectingVault ? 'Connecting...' : 'Connect to Vault'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search secret keys, scopes..."
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
          </select>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing {filteredSecrets.length} secrets
        </div>
      </div>

      {/* Secrets List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="divide-y divide-slate-100">
          {isLoading && secrets.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-medium text-xs">
              <RefreshCw className="animate-spin inline-block mr-2 text-indigo-600" size={16} />
              Loading secrets...
            </div>
          ) : filteredSecrets.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-medium text-xs">
              No matching secrets found.
            </div>
          ) : (
            filteredSecrets.map((sec) => (
            <div key={sec.id} className="py-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-xs text-slate-900">{sec.key}</span>
                  <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold ${
                    sec.environment === 'production' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                    sec.environment === 'staging' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {sec.environment}
                  </span>
                  {sec.status === 'expiring_soon' && (
                    <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-bold flex items-center gap-1">
                      <Clock size={11} />
                      Expires in {sec.expiresInDays} days
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">{sec.scope} &bull; Last Rotated: {sec.lastRotated}</div>
                {sec.vaultPath && <div className="text-[11px] text-slate-400 font-mono">{sec.vaultPath}</div>}
              </div>

              <div className="flex items-center gap-3">
                {sec.source === 'vault' ? (
                  <div className="p-2.5 bg-indigo-50 rounded-xl text-xs font-medium text-indigo-700 min-w-[240px] max-w-sm flex items-center gap-2 border border-indigo-100">
                    <ShieldCheck size={14} className="shrink-0" />
                    <span className="truncate">Stored in HashiCorp Vault</span>
                  </div>
                ) : (
                  <>
                    <div className="p-2.5 bg-slate-100 rounded-xl font-mono text-xs text-slate-700 min-w-[240px] max-w-sm flex items-center justify-between border border-slate-200 overflow-hidden">
                      <span className="truncate">{revealedSecrets[sec.id] ? (sec.fullValue || sec.value) : '••••••••••••••••••••••••'}</span>
                      <button
                        onClick={() => toggleSecretReveal(sec.id)}
                        className="text-slate-400 hover:text-slate-700 transition-colors ml-2 shrink-0"
                        title={revealedSecrets[sec.id] ? 'Mask Secret' : 'Reveal Secret'}
                      >
                        {revealedSecrets[sec.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>

                    <button
                      onClick={() => copyToClipboard(sec.fullValue || sec.value, sec.id)}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs transition-colors"
                      title="Copy Secret"
                    >
                      {copiedKey === sec.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </>
                )}

                {sec.source !== 'env' && (
                  <button
                    onClick={() => openSecretModal(sec)}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs transition-colors"
                    title="Enter a New Value"
                  >
                    <RotateCw size={14} />
                  </button>
                )}
              </div>
            </div>
          )))}
        </div>
      </div>

      {/* Add Secret Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
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
                    <Key size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Store Secret</h3>
                    <p className="text-xs text-slate-400">
                      {vault?.configured ? 'Stored in HashiCorp Vault. Existing keys get a new version.' : 'Saved on this server, unencrypted. Connect Vault to encrypt it.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateSecret} className="space-y-4 mt-4">
                {secretError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>{secretError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Secret Key Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SENTRY_DSN_KEY"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Secret Plaintext Value</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Enter private token, API key or password..."
                    value={newKeyValue}
                    onChange={(e) => setNewKeyValue(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Environment</label>
                    <select
                      value={newKeyEnv}
                      onChange={(e) => setNewKeyEnv(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      <option value="production">Production</option>
                      <option value="staging">Staging</option>
                      <option value="development">Development</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Service Scope</label>
                    <input
                      type="text"
                      placeholder="e.g. Payments Gateway"
                      value={newKeyScope}
                      onChange={(e) => setNewKeyScope(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                  >
                    <Lock size={13} />
                    <span>Store Secret</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
