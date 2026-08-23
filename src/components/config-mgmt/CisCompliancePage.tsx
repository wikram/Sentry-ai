/**
 * Copyright 2026 Google LLC
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Download, 
  FileText, 
  Terminal, 
  Lock, 
  Server, 
  ExternalLink,
  Check,
  Play,
  Copy
} from 'lucide-react';

interface BenchmarkScore {
  category: string;
  score: number;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  status: 'PASS' | 'WARN' | 'FAIL';
}

interface ComplianceFinding {
  id: string;
  ruleId: string;
  title: string;
  targetNode: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  remediationSnippet: string;
  description: string;
}

const INITIAL_SCORES: BenchmarkScore[] = [
  { category: 'CIS Linux Server Level 1 & 2', score: 98, totalRules: 142, passedRules: 139, failedRules: 3, status: 'PASS' },
  { category: 'CIS Kubernetes Benchmark v1.8', score: 94, totalRules: 88, passedRules: 83, failedRules: 5, status: 'PASS' },
  { category: 'CIS Docker & Containerd Runtime', score: 96, totalRules: 64, passedRules: 61, failedRules: 3, status: 'PASS' },
  { category: 'SSH & PAM Authentication Policy', score: 100, totalRules: 28, passedRules: 28, failedRules: 0, status: 'PASS' },
  { category: 'AIDE File Integrity & Syslog Hardening', score: 92, totalRules: 36, passedRules: 33, failedRules: 3, status: 'PASS' }
];

const INITIAL_FINDINGS: ComplianceFinding[] = [
  {
    id: 'find-01',
    ruleId: 'CIS-5.2.14',
    title: 'SSH Root Login Allowed via Remote Session',
    targetNode: 'k8s-worker-gpu-04.prod.internal',
    severity: 'HIGH',
    category: 'Identity & Access',
    description: 'PermitRootLogin directive in /etc/ssh/sshd_config is configured to "yes".',
    remediationSnippet: `- name: Enforce PermitRootLogin no\n  ansible.builtin.lineinfile:\n    path: /etc/ssh/sshd_config\n    regexp: '^#?PermitRootLogin'\n    line: 'PermitRootLogin no'\n  notify: Restart SSHD`
  },
  {
    id: 'find-02',
    ruleId: 'CIS-3.4.1.2',
    title: 'Missing Ingress Dropping Rules on Unallocated Ports',
    targetNode: 'edge-gateway-eu-central.internal',
    severity: 'MEDIUM',
    category: 'Network Hardening',
    description: 'UFW incoming traffic default policy is set to ACCEPT instead of DROP.',
    remediationSnippet: `- name: Set UFW default incoming to DROP\n  community.general.ufw:\n    default: drop\n    direction: incoming`
  },
  {
    id: 'find-03',
    ruleId: 'CIS-1.1.21',
    title: 'Sticky Bit Missing on World-Writable Directories',
    targetNode: 'stage-app-worker-01.internal',
    severity: 'LOW',
    category: 'File System & Permissions',
    description: 'World-writable directories without sticky bit allow unprivileged users to delete files owned by others.',
    remediationSnippet: `find / -xdev -type d \\( -perm -0002 -a ! -perm -1000 \\) -exec chmod a+t {} \\;`
  }
];

export default function CisCompliancePage() {
  const [scores, setScores] = useState<BenchmarkScore[]>(INITIAL_SCORES);
  const [findings, setFindings] = useState<ComplianceFinding[]>(INITIAL_FINDINGS);
  const [isScanning, setIsScanning] = useState(false);
  const [copiedFindingId, setCopiedFindingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRunScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      showNotification('CIS Benchmark audit completed: 358 rules evaluated across fleet. Overall compliance: 96.4%.');
    }, 2000);
  };

  const handleCopySnippet = (snippet: string, id: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedFindingId(id);
    showNotification('Remediation playbook snippet copied to clipboard');
    setTimeout(() => setCopiedFindingId(null), 2500);
  };

  const handleRemediateFinding = (finding: ComplianceFinding) => {
    setFindings(prev => prev.filter(f => f.id !== finding.id));
    showNotification(`Remediation playbook dispatched for ${finding.ruleId} on ${finding.targetNode}`);
  };

  const overallScore = Math.round(scores.reduce((acc, s) => acc + s.score, 0) / scores.length);

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
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                  Configuration Management
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400">CIS Level 1 & 2 Hardening</span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">CIS Benchmark & Security Audits</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Automated continuous verification against Center for Internet Security (CIS) benchmarks for Linux, Docker & Kubernetes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => showNotification('CIS Audit Report exported as CIS-Audit-Report-2026.pdf')}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-200"
            >
              <Download size={14} />
              <span>Export Audit Report</span>
            </button>
            <button
              onClick={handleRunScan}
              disabled={isScanning}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
              <span>{isScanning ? 'Auditing Rules...' : 'Run Full Benchmark Audit'}</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fleet CIS Score</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{overallScore}%</div>
            <span className="text-[11px] font-medium text-emerald-600 font-mono">Grade A+ Baseline</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rules Evaluated</span>
            <div className="text-2xl font-black text-slate-900 mt-1">358</div>
            <span className="text-[11px] font-medium text-slate-500 font-mono">Across 7 fleet nodes</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Passed Rules</span>
            <div className="text-2xl font-black text-indigo-600 mt-1">344</div>
            <span className="text-[11px] font-medium text-indigo-600 font-mono">96.1% pass rate</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Open Remediations</span>
            <div className={`text-2xl font-black mt-1 ${findings.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{findings.length}</div>
            <span className="text-[11px] font-medium text-amber-600 font-mono">Actionable items</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Benchmark Scores & Open Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Benchmark Scores */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-600" />
              <span>Benchmark Framework Compliance</span>
            </h3>
            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              v1.8 Spec
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {scores.map((item, i) => (
              <div key={i} className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-800">{item.category}</span>
                  <span className="font-mono text-emerald-600 font-black">{item.score}% {item.status}</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${item.score}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                  <span>{item.passedRules} Passed &bull; {item.failedRules} Failed</span>
                  <span>{item.totalRules} Total Rules</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Active Security Findings & Remediation */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              <span>Active Compliance Discrepancies ({findings.length})</span>
            </h3>
            <span className="text-[10px] font-mono text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
              Immediate Remediation
            </span>
          </div>

          {findings.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
              <div className="text-xs font-bold text-slate-700">All CIS Benchmarks 100% Compliant</div>
              <div className="text-[11px]">No active discrepancies or drift detected on managed fleet nodes.</div>
            </div>
          ) : (
            <div className="space-y-4">
              {findings.map((f) => (
                <div key={f.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                          {f.ruleId}
                        </span>
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                          f.severity === 'HIGH' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          f.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {f.severity}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">{f.targetNode}</span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 mt-1">{f.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{f.description}</p>
                    </div>

                    <button
                      onClick={() => handleRemediateFinding(f)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
                    >
                      <Play size={12} />
                      <span>Auto Remediate</span>
                    </button>
                  </div>

                  {/* Remediation Snippet */}
                  <div className="relative group bg-slate-950 p-3 rounded-xl font-mono text-[11px] text-indigo-100 overflow-x-auto">
                    <button
                      onClick={() => handleCopySnippet(f.remediationSnippet, f.id)}
                      className="absolute right-2 top-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
                      title="Copy Ansible Task Snippet"
                    >
                      {copiedFindingId === f.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                    <pre className="whitespace-pre">{f.remediationSnippet}</pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
