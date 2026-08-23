/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileCode,
  Copy,
  Check,
  Download,
  Boxes,
  Server,
  Cloud,
  ChevronRight,
  ExternalLink,
  Code2,
  Layers
} from 'lucide-react';
import { IaCTemplate } from '../../types/iac';
import { DEFAULT_IAC_TEMPLATES } from '../../data/iacStore';

interface BlueprintLibraryPageProps {
  onSelectBlueprint?: (template: IaCTemplate) => void;
}

export default function BlueprintLibraryPage({ onSelectBlueprint }: BlueprintLibraryPageProps) {
  const [templates, setTemplates] = useState<IaCTemplate[]>(DEFAULT_IAC_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<IaCTemplate>(DEFAULT_IAC_TEMPLATES[0]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeProviderFilter, setActiveProviderFilter] = useState<string>('all');

  const filteredTemplates = templates.filter(t => {
    if (activeProviderFilter === 'all') return true;
    return t.provider.toLowerCase() === activeProviderFilter.toLowerCase();
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedTemplate.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([selectedTemplate.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTemplate.id}.tf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner Overview */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-600 text-white flex items-center justify-center shadow-lg shadow-cyan-600/20 shrink-0">
              <FileCode size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-700 bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded-md">
                  Modular HCL Modules
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400">Terraform 1.9 &bull; CIS Verified</span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">IaC Blueprint Library</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Curated, production-hardened Terraform and OpenTofu infrastructure blueprints adhering to enterprise security baselines.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {['all', 'AWS', 'GCP', 'Azure'].map(prov => (
              <button
                key={prov}
                onClick={() => setActiveProviderFilter(prov)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeProviderFilter === prov
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {prov === 'all' ? 'All Providers' : prov}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Blueprints Selector (Left) + Code Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Blueprint Selector (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Available Blueprints</h3>
            <div className="space-y-2.5">
              {filteredTemplates.map(tmpl => {
                const isSelected = selectedTemplate.id === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplate(tmpl)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-50/80 border-cyan-400 ring-2 ring-cyan-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{tmpl.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{tmpl.description}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                        {tmpl.provider}
                      </span>
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-100 text-cyan-800">
                        {tmpl.framework}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Code Viewer (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col">
          {/* Header */}
          <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-200">
            <div className="flex items-center gap-2.5">
              <FileCode size={18} className="text-cyan-400" />
              <div>
                <h4 className="font-mono text-xs font-bold text-white">{selectedTemplate.title}</h4>
                <p className="text-[10px] text-slate-400 font-mono">main.tf &bull; {selectedTemplate.framework} {selectedTemplate.provider}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700"
              >
                <Download size={13} />
                <span>.tf</span>
              </button>
              <button
                onClick={handleCopy}
                className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                {copiedCode ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedCode ? 'Copied HCL' : 'Copy Blueprint'}</span>
              </button>
            </div>
          </div>

          {/* Code Viewer Body */}
          <div className="p-6 bg-slate-950 text-cyan-100 font-mono text-xs overflow-x-auto max-h-[580px] leading-relaxed custom-scrollbar select-text">
            <pre>{selectedTemplate.code}</pre>
          </div>
        </div>

      </div>
    </div>
  );
}
