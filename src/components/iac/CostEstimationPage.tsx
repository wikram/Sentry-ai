/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  RotateCw,
  Download,
  Info,
  Server,
  Zap
} from 'lucide-react';
import { IaCWorkspace } from '../../types/iac';
import { loadWorkspaces } from '../../data/iacStore';

export default function CostEstimationPage() {
  const [workspaces, setWorkspaces] = useState<IaCWorkspace[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setWorkspaces(loadWorkspaces());
  }, []);

  const totalMonthlyCost = workspaces.reduce((acc, w) => acc + (w.monthlyCost || 0), 0);
  const totalCostDelta = workspaces.reduce((acc, w) => acc + (w.costDelta || 0), 0);

  const handleRefreshInfracost = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner Overview */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <DollarSign size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">
                  FinOps Engine
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400">Infracost &bull; AWS / GCP / Azure Pricing APIs</span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">Infracost Budget Impact</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Shift-left cloud cost visibility. Predict monthly expenses before merging Pull Requests and provisioning infrastructure.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleRefreshInfracost}
              disabled={isRefreshing}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
            >
              <RotateCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              <span>{isRefreshing ? 'Re-calculating...' : 'Refresh Infracost Estimates'}</span>
            </button>
          </div>
        </div>

        {/* Cost Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Monthly Projected Cost</span>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono">${totalMonthlyCost.toFixed(2)}</div>
            <span className="text-[11px] font-medium text-slate-500">Across all active workspaces</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Speculative Plan Delta</span>
            <div className={`text-2xl font-black mt-1 font-mono ${totalCostDelta > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {totalCostDelta > 0 ? `+$${totalCostDelta.toFixed(2)}` : `-$${Math.abs(totalCostDelta).toFixed(2)}`}
            </div>
            <span className="text-[11px] font-medium text-slate-500">From pending Git branches</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monthly Budget Threshold</span>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono">$4,000.00</div>
            <span className="text-[11px] font-medium text-emerald-600">Within Safe Limits (71% Cap)</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Identified Savings</span>
            <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">$384.00/mo</div>
            <span className="text-[11px] font-medium text-emerald-600">3 Recommendations Available</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Workspace Breakdown + Optimization Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Workspaces Cost Breakdown (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Boxes size={18} className="text-amber-600" />
              Workspace Cloud Spend Breakdown
            </h3>
            <span className="text-xs font-mono font-bold text-slate-500">{workspaces.length} Workspaces</span>
          </div>

          <div className="space-y-3">
            {workspaces.map(ws => (
              <div
                key={ws.id}
                className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-slate-100/70 transition-colors"
              >
                <div>
                  <div className="font-bold text-xs text-slate-900 font-mono flex items-center gap-2">
                    {ws.name}
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-slate-200 text-slate-700">
                      {ws.provider}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {ws.resourceCount} managed resources &bull; {ws.environment}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-sm text-slate-900">${ws.monthlyCost.toFixed(2)}/mo</div>
                  {ws.costDelta !== 0 && (
                    <div className={`text-[10px] font-mono font-bold ${ws.costDelta > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {ws.costDelta > 0 ? `+$${ws.costDelta.toFixed(2)}` : `-$${Math.abs(ws.costDelta).toFixed(2)}`}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: FinOps Optimization Recommendations (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Zap size={18} className="text-emerald-600" />
              FinOps Optimization Opportunities
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1.5">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-600" />
                Unused Multi-AZ NAT Gateways
              </div>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                Consolidating idle NAT Gateways in non-production environments to a single regional endpoint saves <strong>$64.80/month</strong>.
              </p>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1.5">
              <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                AWS Graviton3 (ARM64) Instance Upgrade
              </div>
              <p className="text-emerald-800 text-[11px] leading-relaxed">
                Switching Kubernetes EKS worker nodes from <code>m5.xlarge</code> to <code>m7g.xlarge</code> yields a <strong>20% compute discount ($180.00/mo savings)</strong> with higher benchmark performance.
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-1.5">
              <div className="font-bold text-blue-900 flex items-center gap-1.5">
                <Server size={14} className="text-blue-600" />
                Cloud SQL Committed Use Discounts (1-Year)
              </div>
              <p className="text-blue-800 text-[11px] leading-relaxed">
                Applying a 1-year GCP CUD reservation to BigQuery &amp; Cloud SQL saves approximately <strong>$139.20/month</strong>.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
