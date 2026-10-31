/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Loader2, Plus, Server, Trash2 } from 'lucide-react';

interface ModelsTabProps {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  supportedModels: any[];
  onModelsChanged: () => Promise<void> | void;
}

interface LocalProviderStatus {
  id: string;
  name: string;
  type: 'ollama' | 'openai' | 'custom';
  baseUrl: string;
  verified: boolean;
  online: boolean;
  models: string[];
  error?: string;
}

type ProviderFormType = 'auto' | LocalProviderStatus['type'];

const DEFAULT_URLS: Record<ProviderFormType, string> = {
  auto: 'http://192.168.0.50:8080',
  ollama: 'http://192.168.0.50:11434',
  openai: 'http://192.168.0.50:1234/v1',
  custom: 'http://192.168.0.50:5001/api/v1/generate'
};

export default function ModelsTab({
  selectedModel,
  setSelectedModel,
  supportedModels,
  onModelsChanged,
}: ModelsTabProps) {
  const selectedModelInfo = supportedModels.find(m => m.id === selectedModel);
  const [providers, setProviders] = useState<LocalProviderStatus[]>([]);
  const [providerName, setProviderName] = useState('');
  const [providerType, setProviderType] = useState<ProviderFormType>('auto');
  const [providerUrl, setProviderUrl] = useState('');
  const [providerKey, setProviderKey] = useState('');
  const [providerModels, setProviderModels] = useState('');
  const [requestTemplate, setRequestTemplate] = useState('{"prompt": "{{prompt}}", "model": "{{model}}"}');
  const [responsePath, setResponsePath] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [providerError, setProviderError] = useState('');

  const loadProviders = async () => {
    try {
      const res = await fetch('/api/local-models/providers');
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
      }
    } catch (err) {
      console.error('Failed to load local model providers:', err);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setProviderError('');
    try {
      const res = await fetch('/api/local-models/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: providerName,
          type: providerType,
          baseUrl: providerUrl,
          apiKey: providerKey,
          models: providerModels,
          requestTemplate,
          responsePath
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setProviderError(data?.error || `Failed to add endpoint (status ${res.status})`);
        return;
      }
      setProviderName('');
      setProviderUrl('');
      setProviderKey('');
      setProviderModels('');
      setResponsePath('');
      await Promise.all([loadProviders(), onModelsChanged()]);
    } catch (err) {
      setProviderError('Failed to add endpoint');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRemoveProvider = async (provider: LocalProviderStatus) => {
    if (!confirm(`Remove local endpoint "${provider.name}"?`)) return;
    try {
      const res = await fetch(`/api/local-models/providers/${provider.id}`, { method: 'DELETE' });
      if (res.ok) {
        await Promise.all([loadProviders(), onModelsChanged()]);
      }
    } catch (err) {
      console.error('Failed to remove local model provider:', err);
    }
  };

  return (
    <motion.div 
      key="models"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Models</h2>
          <p className="text-sm text-slate-500">Configure global model settings via OpenRouter or self-hosted endpoints.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-6 shadow-sm">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Default Primary Model</label>
          <div className="relative">
            <select 
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
            >
              {supportedModels.length === 0 ? (
                <option>Loading models...</option>
              ) : (
                <>
                  {selectedModel && !selectedModelInfo && (
                    <option value={selectedModel}>{selectedModel} (not in model list)</option>
                  )}
                  {[...supportedModels]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name} ({model.id})
                      </option>
                    ))}
                </>
              )}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronRight className="rotate-90" size={16} />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            Select the specialized LLM that will drive root cause analysis across all autonomous agents.
          </p>
        </div>

        {selectedModel && supportedModels.length > 0 && (
          <div className="pt-4 border-t border-slate-100">
            {selectedModelInfo ? (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Context Window</p>
                  <p className="text-sm font-mono text-slate-700">
                    {selectedModelInfo.context_length?.toLocaleString() || 'Unknown'} tokens
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pricing (per 1M tokens)</p>
                  <p className="text-sm font-mono text-slate-700">
                    ${(parseFloat(selectedModelInfo.pricing?.prompt || '0') * 1000000).toFixed(2)} prompt /
                    ${(parseFloat(selectedModelInfo.pricing?.completion || '0') * 1000000).toFixed(2)} completion
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 font-medium">
                No context window or pricing details are available for {selectedModel} because it is not in the current model list.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-6 shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Local Model Endpoints</h3>
          <p className="text-[11px] text-slate-400 font-medium mt-1">
            Connect any LLM that runs behind an HTTP server. Its models appear in every model selector, prefixed with "Local:". Addresses are resolved from the Devops Studio server. Many LLM servers accept only local connections by default, so enable network access on the server first (for Ollama, start it with OLLAMA_HOST=0.0.0.0).
          </p>
        </div>

        {providers.length > 0 && (
          <div className="space-y-3">
            {providers.map(provider => (
              <div key={provider.id} className="flex items-start justify-between gap-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <div className="flex items-start gap-3 min-w-0">
                  <Server size={16} className={`mt-0.5 shrink-0 ${!provider.online ? 'text-red-500' : provider.verified ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700">{provider.name}</p>
                    <p className="text-[11px] font-mono text-slate-400 break-all">{provider.baseUrl}</p>
                    <p className={`text-[11px] font-medium mt-1 ${provider.online ? 'text-slate-500' : 'text-red-500'}`}>
                      {provider.online
                        ? `${provider.models.length} model${provider.models.length === 1 ? '' : 's'} ${provider.verified ? 'available' : 'configured, checked when used'}`
                        : provider.error || 'Offline'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveProvider(provider)}
                  aria-label={`Remove ${provider.name}`}
                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAddProvider} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Server Type</label>
              <select
                value={providerType}
                onChange={(e) => setProviderType(e.target.value as ProviderFormType)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              >
                <option value="auto">Auto-detect</option>
                <option value="ollama">Ollama</option>
                <option value="openai">OpenAI-compatible (LM Studio, vLLM, llama.cpp, LocalAI, Jan)</option>
                <option value="custom">Custom HTTP Endpoint (any other API)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Display Name</label>
              <input
                type="text"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="Office GPU box"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">{providerType === 'custom' ? 'Request URL' : 'Endpoint URL'}</label>
              <input
                type="text"
                required
                value={providerUrl}
                onChange={(e) => setProviderUrl(e.target.value)}
                placeholder={DEFAULT_URLS[providerType]}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">API Key (Optional)</label>
              <input
                type="password"
                autoComplete="new-password"
                value={providerKey}
                onChange={(e) => setProviderKey(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                Model Names (Optional)
              </label>
              <input
                type="text"
                value={providerModels}
                onChange={(e) => setProviderModels(e.target.value)}
                placeholder="mistral-7b, qwen-14b"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <p className="text-[11px] text-slate-400 font-medium">
                Comma-separated. Only needed for servers that cannot list their models.
              </p>
            </div>
            {providerType === 'custom' && (
              <>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Request Body (JSON)</label>
                  <textarea
                    required
                    rows={3}
                    value={requestTemplate}
                    onChange={(e) => setRequestTemplate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <p className="text-[11px] text-slate-400 font-medium">
                    Sent as a POST request. {'{{prompt}}'} and {'{{model}}'} are replaced for each call.
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Response Text Path</label>
                  <input
                    type="text"
                    required
                    value={responsePath}
                    onChange={(e) => setResponsePath(e.target.value)}
                    placeholder="results.0.text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <p className="text-[11px] text-slate-400 font-medium">
                    Where the reply sits in the JSON response. Adding the endpoint sends a short test prompt.
                  </p>
                </div>
              </>
            )}
          </div>

          {providerError && (
            <p role="alert" className="text-xs font-medium text-red-500">{providerError}</p>
          )}

          <button
            type="submit"
            disabled={isConnecting}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-colors"
          >
            {isConnecting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {isConnecting ? 'Connecting...' : 'Connect & Add'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
