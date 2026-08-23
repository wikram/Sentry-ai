/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  Check,
  Copy,
  RotateCw,
  FileCode,
  Lock,
  Boxes
} from 'lucide-react';
import { SecurityFinding, IaCWorkspace } from '../../types/iac';
import { DEFAULT_SECURITY_FINDINGS, loadWorkspaces } from '../../data/iacStore';

export default function SecurityGatesPage() {
  const [workspaces, setWorkspaces] = useState<IaCWorkspace[]>([]);
  const [findings, setFindings] = useState<SecurityFinding[]>(DEFAULT_SECURITY_FINDINGS);
  const [appliedRemediations, setAppliedRemediations] = useState<Record<string, boolean>>({});
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkspaceFilter, setSelectedWorkspaceFilter] = useState<string>('all');
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    setWorkspaces(loadWorkspaces());
  }, []);

  const handleApplyRemediation = (findingId: string) => {
    setAppliedRemediations(prev => ({ ...prev, [findingId]: true }));
  };

  const handleRescan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 1200);
  };

  const filteredFindings = findings.filter(f => {
    const matchesSeverity = severityFilter === 'all' || f.severity.toLowerCase() === severityFilter.toLowerCase();
    const matchesWorkspace = selectedWorkspaceFilter === 'all' || f.workspaceId === selectedWorkspaceFilter;
    const matchesSearch = f.ruleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.resource.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesWorkspace && matchesSearch;
  });

  const criticalCount = findings.filter(f => f.severity === 'CRITICAL' && !appliedRemediations[f.id]).length;
  const highCount = findings.filter(f => f.severity === 'HIGH' && !appliedRemediations[f.id]).length;
  const mediumCount = findings.filter(f => f.severity === 'MEDIUM' && !appliedRemediations[f.id]).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner Overview */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20 shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                  Policy as Code
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400">Checkov &bull; tfsec &bull; OPA Conftest</span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">Checkov &amp; Security Gates</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Automated static analysis across Terraform templates to enforce CIS Benchmarks, NIST SP 800-53, and zero-trust IAM.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleRescan}
              disabled={isScanning}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
            >
              <RotateCw size={14} className={isScanning ? 'animate-spin' : ''} />
              <span>{isScanning ? 'Scanning Modules...' : 'Re-scan All Workspaces'}</span>
            </button>
          </div>
        </div>

        {/* Severity Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Overall Security Score</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">94.8%</div>
            <span className="text-[11px] font-medium text-slate-500">CIS Benchmark Grade A</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Critical Findings</span>
            <div className="text-2xl font-black text-rose-600 mt-1">{criticalCount}</div>
            <span className="text-[11px] font-medium text-rose-700">Immediate Remediation</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">High Findings</span>
            <div className="text-2xl font-black text-amber-600 mt-1">{highCount}</div>
            <span className="text-[11px] font-medium text-amber-700">Warning Level</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Medium Findings</span>
            <div className="text-2xl font-black text-blue-600 mt-1">{mediumCount}</div>
            <span className="text-[11px] font-medium text-blue-700">Best Practice Suggestions</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Search size={14} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search rule ID, resource, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedWorkspaceFilter}
            onChange={(e) => setSelectedWorkspaceFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
          >
            <option value="all">All Workspaces</option>
            {workspaces.map(ws => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="high">High Only</option>
            <option value="medium">Medium Only</option>
          </select>
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        {filteredFindings.map(finding => (
          <div key={finding.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider font-mono ${
                  finding.severity === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                  finding.severity === 'HIGH' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {finding.severity}
                </span>
                <span className="font-mono text-xs font-bold text-slate-800">{finding.ruleId}: {finding.title}</span>
              </div>

              {appliedRemediations[finding.id] ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <CheckCircle2 size={14} />
                  Auto-Patch Applied to HCL
                </span>
              ) : (
                <button
                  onClick={() => handleApplyRemediation(finding.id)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  Apply 1-Click Patch
                </button>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">{finding.description}</p>

            <div className="p-3.5 bg-slate-950 text-emerald-200 font-mono text-xs rounded-xl overflow-x-auto leading-relaxed">
              <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                Remediation Code ({finding.file}:{finding.line})
              </div>
              <pre>{finding.remediationCode}</pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
