/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Save, Plus, AlertTriangle, Activity, ExternalLink, Power, PowerOff, Settings, ShieldAlert } from 'lucide-react';
import { formatDateTime } from '../lib/dateUtils';

interface DataSource {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  status: string;
  lastSync?: string;
}

interface DataSourcesTabProps {
  sources: DataSource[];
  failedJenkinsJobs: any[];
  isScrapingJenkins: boolean;
  isSaving: boolean;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  handleScrapeJenkins: () => void;
  handleSaveToXml: () => void;
  setShowAddSource: (val: boolean) => void;
  setFailedJenkinsJobs: (jobs: any[]) => void;
  toggleSource: (id: string) => void;
  openConfig: (source: DataSource) => void;
  deleteSource: (id: string) => void;
}

export default function DataSourcesTab({
  sources,
  failedJenkinsJobs,
  isScrapingJenkins,
  isSaving,
  activeMenuId,
  setActiveMenuId,
  handleScrapeJenkins,
  handleSaveToXml,
  setShowAddSource,
  setFailedJenkinsJobs,
  toggleSource,
  openConfig,
  deleteSource,
}: DataSourcesTabProps) {
  return (
    <motion.div 
      key="data-sources"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">Data Sources</h2>
            <div className="bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider">
              {sources.length}
            </div>
          </div>
          <p className="text-sm text-slate-500">Manage your DevOps toolchain integrations for analysis.</p>
        </div>
        <div className="flex gap-3">
          {sources.some(s => s.type === 'jenkins' && s.isActive) && (
            <button 
              onClick={handleScrapeJenkins}
              disabled={isScrapingJenkins}
              className="px-4 py-2 border border-blue-200 text-blue-600 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-blue-50 transition-all disabled:opacity-50"
            >
              <Search size={16} className={isScrapingJenkins ? 'animate-spin' : ''} />
              {isScrapingJenkins ? 'Scraping...' : 'Scrape Failed Jobs'}
            </button>
          )}
          <button 
            onClick={handleSaveToXml}
            disabled={isSaving}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            <Save size={16} className={isSaving ? 'animate-pulse' : ''} />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
          <button 
            onClick={() => setShowAddSource(true)}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2"
          >
            <Plus size={16} /> Add Source
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {failedJenkinsJobs.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-6 bg-red-50 border border-red-100 rounded-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-500 text-white p-2 rounded-lg">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-red-900">Failed Sentry Jobs Detected</h3>
                  <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">{failedJenkinsJobs.length} Critical failures</p>
                </div>
              </div>
              <button 
                onClick={() => setFailedJenkinsJobs([])}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            
            <div className="space-y-3">
              {failedJenkinsJobs.map((job, idx) => (
                <div key={idx} className="bg-white border border-red-50 rounded-xl p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                      <Activity size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{job.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{job.sourceName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {job.lastBuild && (
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Failed on</p>
                        <p className="text-xs font-mono text-slate-600">{formatDateTime(job.lastBuild.timestamp)}</p>
                      </div>
                    )}
                    <a 
                      href={job.url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <ExternalLink size={18} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {sources.map(source => (
            <div key={source.id} className={`bg-white border transition-all rounded-xl p-5 flex items-center justify-between shadow-sm ${source.isActive ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => toggleSource(source.id)}
                  className={`p-2 rounded-lg transition-all ${source.isActive ? 'text-blue-500 bg-blue-50' : 'text-slate-400 bg-slate-50'}`}
                  title={source.isActive ? 'Deactivate Source' : 'Activate Source'}
                >
                  {source.isActive ? <Power size={18} /> : <PowerOff size={18} />}
                </button>
                <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 uppercase font-black text-slate-400 text-[10px]">
                  {source.type.substring(0, 2)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{source.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{source.type}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Status</p>
                  <span className={`text-xs font-bold ${!source.isActive ? 'text-slate-400' : source.status === 'connected' ? 'text-green-600' : source.status === 'syncing' ? 'text-blue-500' : 'text-red-500'}`}>
                    {source.isActive ? source.status.toUpperCase() : 'INACTIVE'}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Last Sync</p>
                  <p className="text-xs font-mono text-slate-600">{source.lastSync ? formatDateTime(source.lastSync) : 'Never'}</p>
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setActiveMenuId(activeMenuId === source.id ? null : source.id)}
                    className={`p-2 transition-colors rounded-lg ${activeMenuId === source.id ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
                  >
                    <Settings size={16} />
                  </button>
                  
                  <AnimatePresence>
                    {activeMenuId === source.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setActiveMenuId(null)}
                        />
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden py-1"
                        >
                          <button 
                            className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            onClick={() => setActiveMenuId(null)}
                          >
                            <Activity size={14} /> View Logs
                          </button>
                          <button 
                            className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            onClick={() => { openConfig(source); setActiveMenuId(null); }}
                          >
                            <Settings size={14} /> Configure
                          </button>
                          <div className="h-px bg-slate-100 my-1" />
                          <button 
                            className="w-full px-4 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                            onClick={() => { deleteSource(source.id); setActiveMenuId(null); }}
                          >
                            <ShieldAlert size={14} /> Delete Source
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
