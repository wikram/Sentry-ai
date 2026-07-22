/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { RefreshCw, Terminal } from 'lucide-react';

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
  return (
    <motion.div 
      key="settings"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings & Monitoring</h2>
          <p className="text-sm text-slate-500">General application configuration and live logs.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Status Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full absolute" />
              <h3 className="font-bold text-slate-800 text-base ml-2">System Logging Engine</h3>
            </div>
            <p className="text-sm text-slate-500">
              File-based capture is active and writing application logs, HTTP requests, and system anomalies in real time.
            </p>
            <div className="flex items-center gap-2 mt-2 pt-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Log File:</span>
              <code className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-mono border border-slate-200">
                {logPath || 'logs/app.log'}
              </code>
            </div>
          </div>
          
          <button
            onClick={fetchLogs}
            disabled={isLoadingLogs}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-700 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoadingLogs ? 'animate-spin' : ''} />
            {isLoadingLogs ? 'Refreshing...' : 'Refresh Logs'}
          </button>
        </div>

        {/* Logs Console */}
        <div className="bg-slate-950 rounded-2xl border border-slate-900 shadow-xl overflow-hidden flex flex-col h-[550px]">
          {/* Console Header */}
          <div className="bg-slate-900 px-5 py-3.5 border-b border-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Dot controls */}
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
              {/* Log Filter */}
              <div className="relative w-full sm:w-48">
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 text-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-slate-700 font-mono"
                />
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
                    <Terminal size={24} className="text-slate-700 animate-pulse" />
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
    </motion.div>
  );
}
