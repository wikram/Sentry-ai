/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';

interface ModelsTabProps {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  supportedModels: any[];
}

export default function ModelsTab({
  selectedModel,
  setSelectedModel,
  supportedModels,
}: ModelsTabProps) {
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
          <p className="text-sm text-slate-500">Configure global model settings via OpenRouter.</p>
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
                [...supportedModels]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.id})
                    </option>
                  ))
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
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Context Window</p>
                <p className="text-sm font-mono text-slate-700">
                  {supportedModels.find(m => m.id === selectedModel)?.context_length?.toLocaleString() || 'Unknown'} tokens
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pricing (per 1M tokens)</p>
                <p className="text-sm font-mono text-slate-700">
                  ${(parseFloat(supportedModels.find(m => m.id === selectedModel)?.pricing?.prompt || '0') * 1000000).toFixed(2)} prompt / 
                  ${(parseFloat(supportedModels.find(m => m.id === selectedModel)?.pricing?.completion || '0') * 1000000).toFixed(2)} completion
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
