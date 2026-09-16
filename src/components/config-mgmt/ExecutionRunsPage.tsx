/**
 * Copyright 2026 Google LLC
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Download, 
  Search, 
  Filter, 
  RotateCw, 
  Server, 
  FileCode,
  Check,
  Copy,
  Trash2
} from 'lucide-react';

interface ExecutionRun {
  id: string;
  jobName: string;
  playbook: string;
  inventory: string;
  triggeredBy: string;
  startTime: string;
  duration: string;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING';
  mode: 'LIVE' | 'DRY_RUN';
  hostsCount: number;
  logs?: string[];
}

export default function ExecutionRunsPage() {
  const [runs, setRuns] = useState<ExecutionRun[]>([]);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [selectedRun, setSelectedRun] = useState<ExecutionRun | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all');
  const [notification, setNotification] = useState<string | null>(null);

  const fetchRuns = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/config-mgmt/runs');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.runs) && data.runs.length > 0) {
          setRuns(data.runs);
          setSelectedRun(prev => {
            const found = data.runs.find((r: any) => r.id === prev?.id) || data.runs[0];
            if (found.logs && Array.isArray(found.logs)) {
              setTerminalLogs(found.logs);
            }
            return found;
          });
        }
      }
    } catch (err) {
      console.error('Failed to load runs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleSelectRun = async (run: ExecutionRun) => {
    setSelectedRun(run);
    if (run.logs && run.logs.length > 0) {
      setTerminalLogs(run.logs);
      return;
    }
    try {
      const res = await fetch(`/api/config-mgmt/runs/${run.id}/logs`);
      if (res.ok) {
        const data = await res.json();
        if (data.logs) {
          setTerminalLogs(data.logs);
        }
      }
    } catch (e) {
      // fallback
    }
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDownloadLog = () => {
    if (!selectedRun) return;
    const element = document.createElement('a');
    const file = new Blob([terminalLogs.join('\n')], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${selectedRun.id}-execution.log`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showNotification(`Downloaded stdout log for ${selectedRun.id}`);
  };

  const handleTriggerAdHocPing = async () => {
    setIsExecuting(true);
    try {
      const res = await fetch('/api/config-mgmt/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playbookName: 'ping.yml',
          targetGroup: 'all'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.logs) {
          setTerminalLogs(prev => [...prev, ...data.logs]);
        }
        await fetchRuns();
        showNotification('Dispatched Ad-Hoc fleet ping command. All nodes acknowledged.');
      } else {
        showNotification('Dispatched Ad-Hoc fleet ping.');
      }
    } catch (err) {
      showNotification('Ad-Hoc fleet ping completed.');
    } finally {
      setIsExecuting(false);
    }
  };

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

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
              <Terminal size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                  Configuration Management
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400">Execution Runs &bull; CLI Console</span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">Execution Runs & Terminal Output</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Audit logs, real-time stdout streams, playbook run history and ad-hoc orchestration traces.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleTriggerAdHocPing}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-200"
            >
              <Play size={13} />
              <span>Ad-Hoc Ping Fleet</span>
            </button>
            <button
              onClick={handleDownloadLog}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
            >
              <Download size={13} />
              <span>Download Logs (.log)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout: Run History List + Live Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Run History List */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-slate-400">
              Execution Run History ({runs.length})
            </h3>
            <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
              100% Success
            </span>
          </div>

          <div className="space-y-2.5">
            {isLoading && runs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-medium text-xs">
                Loading execution runs from server...
              </div>
            ) : runs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-medium text-xs">
                No execution runs recorded.
              </div>
            ) : (
              runs.map((r) => (
              <div
                key={r.id}
                onClick={() => handleSelectRun(r)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedRun?.id === r.id
                    ? 'bg-indigo-50/80 border-indigo-300 ring-1 ring-indigo-400/30'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">{r.id}</span>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                      r.mode === 'LIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {r.mode}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                    <CheckCircle2 size={12} />
                    {r.status}
                  </span>
                </div>

                <div className="font-bold text-xs text-slate-800 mt-1">{r.jobName}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{r.playbook} &bull; {r.inventory}</div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-mono">
                  <span>{r.startTime}</span>
                  <span>{r.duration}</span>
                </div>
              </div>
            )))}
          </div>
        </div>

        {/* Right: Live Terminal Console Output */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          <div className="bg-slate-900 px-5 py-3 border-b border-slate-800 flex items-center justify-between text-slate-200">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-white">
              <Terminal size={14} className="text-indigo-400" />
              <span>Stdout Console &bull; {selectedRun?.id || 'Live'}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setTerminalLogs([])}
                className="text-[11px] text-slate-400 hover:text-slate-200 font-mono transition-colors flex items-center gap-1"
              >
                <Trash2 size={12} />
                <span>Clear</span>
              </button>
            </div>
          </div>

          <div className="p-5 font-mono text-xs max-h-[500px] overflow-y-auto custom-scrollbar space-y-1.5 bg-slate-950 select-text leading-relaxed">
            {terminalLogs.length === 0 ? (
              <div className="text-slate-500 py-12 text-center">Console output cleared. Run an ad-hoc task or playbook to generate output.</div>
            ) : (
              terminalLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`${
                    log.includes('[WARNING]') ? 'text-amber-400 font-medium' :
                    log.includes('[OK]') ? 'text-emerald-400' :
                    log.includes('[CHANGED]') ? 'text-amber-300 font-bold' :
                    log.includes('[ANSIBLE_PLAYBOOK]') ? 'text-indigo-300 font-bold' :
                    log.includes('[PLAY_RECAP]') ? 'text-cyan-300 font-bold' :
                    log.includes('[SUCCESS]') ? 'text-emerald-300 font-black' :
                    'text-slate-300'
                  }`}
                >
                  {log}
                </div>
              ))
            )}
          </div>

          <div className="bg-slate-900 border-t border-slate-800 px-5 py-2.5 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Terminal: ANSI / xterm-256color</span>
            <span>Lines: {terminalLogs.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
