/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Terminal,
  Play,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  FolderGit2,
  GitBranch,
  Copy,
  Check,
  ShieldCheck,
  DollarSign,
  Download,
  Trash2,
  FileCode,
  RefreshCw,
  Flame
} from 'lucide-react';
import { IaCWorkspace } from '../../types/iac';
import { loadWorkspaces, loadActiveWorkspaceId, saveActiveWorkspaceId, saveWorkspaces } from '../../data/iacStore';

export default function TerraformPlanEnginePage() {
  const [workspaces, setWorkspaces] = useState<IaCWorkspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [isPlanning, setIsPlanning] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [autoApprove, setAutoApprove] = useState<boolean>(false);
  const [copiedLog, setCopiedLog] = useState<boolean>(false);

  // Execution terminal output
  const [tfLogs, setTfLogs] = useState<string[]>([
    'Initializing the backend "s3" with encryption enabled...',
    'Backend state lock verified against DynamoDB table "tf-state-locks-dynamodb".',
    'Successfully configured remote backend.',
    '',
    'Initializing provider plugins...',
    '- Finding hashicorp/aws versions matching "~> 5.50"...',
    '- Installing hashicorp/aws v5.54.1...',
    '- Installed hashicorp/aws v5.54.1 (signed by HashiCorp)',
    '',
    'Terraform has been successfully initialized!',
    '',
    'Running speculative plan on branch main (commit e4b7c21)...',
    'Resource actions are indicated with the following symbols:',
    '  + create',
    '  ~ update in-place',
    '  - destroy',
    '',
    'Terraform will perform the following actions:',
    '',
    '  # aws_eks_node_group.workers will be updated in-place',
    '  ~ resource "aws_eks_node_group" "workers" {',
    '      ~ desired_size = 6 -> 8',
    '      ~ max_size     = 12 -> 16',
    '        instance_types = ["c6i.2xlarge"]',
    '        # (14 unchanged attributes hidden)',
    '    }',
    '',
    '  # aws_cloudwatch_metric_alarm.node_cpu_high will be created',
    '  + resource "aws_cloudwatch_metric_alarm" "node_cpu_high" {',
    '      + alarm_name          = "eks-node-high-cpu"',
    '      + comparison_operator = "GreaterThanThreshold"',
    '      + evaluation_periods  = 2',
    '      + metric_name         = "CPUUtilization"',
    '      + namespace           = "AWS/EC2"',
    '      + period              = 300',
    '      + statistic           = "Average"',
    '      + threshold           = 80',
    '    }',
    '',
    'Plan: 1 to add, 1 to change, 0 to destroy.',
    '',
    'Infracost: Estimated monthly cost delta: +$84.50 (New Total: $1,420.50/mo)'
  ]);

  useEffect(() => {
    const loaded = loadWorkspaces();
    setWorkspaces(loaded);
    const activeId = loadActiveWorkspaceId();
    if (loaded.find(w => w.id === activeId)) {
      setSelectedWorkspaceId(activeId);
    } else if (loaded.length > 0) {
      setSelectedWorkspaceId(loaded[0].id);
    }
  }, []);

  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId) || workspaces[0];

  const handleSelectWorkspace = (id: string) => {
    setSelectedWorkspaceId(id);
    saveActiveWorkspaceId(id);
    setTfLogs([
      `Switched to workspace: ${id}`,
      `Workspace Git: ${selectedWorkspace?.gitConfig.repoName} @ ${selectedWorkspace?.gitConfig.branch}`,
      'Ready. Run "Speculative Plan" or "Apply" to execute.'
    ]);
  };

  const handleRunPlan = () => {
    if (!selectedWorkspace) return;
    setIsPlanning(true);
    const time = new Date().toLocaleTimeString();

    const backendDesc = selectedWorkspace.stateBackend.type === 'pg' 
      ? `pg://${selectedWorkspace.stateBackend.schemaName || 'terraform_remote_state'}`
      : `${selectedWorkspace.stateBackend.type}://${selectedWorkspace.stateBackend.bucket || 'backend'}`;
    
    const lockDesc = selectedWorkspace.stateBackend.type === 'pg'
      ? `PostgreSQL table "${selectedWorkspace.stateBackend.schemaName || 'terraform_remote_state'}" (Advisory Lock)`
      : (selectedWorkspace.stateBackend.lockTable || 'state-lock-table');

    setTfLogs(prev => [
      ...prev,
      '',
      `--------------------------------------------------------------------------------`,
      `[${time}] $ terraform plan -input=false -compact-warnings`,
      `Workspace: ${selectedWorkspace.name} (Terraform OSS v${selectedWorkspace.terraformVersion})`,
      `Git Commit: ${selectedWorkspace.gitConfig.lastCommitHash} on ${selectedWorkspace.gitConfig.branch}`,
      `Evaluating remote state from ${backendDesc}...`,
      `Acquiring state lock on ${lockDesc}... OK`,
      `Refreshing Terraform state in memory...`,
      `Read ${selectedWorkspace.resourceCount} resources in 2.1s`,
      '',
      `Terraform used selected providers to generate the execution plan:`,
      `  ~ module.compute.workloads (update in-place)`,
      `  + module.network.ingress_route (create)`,
      '',
      `Plan: 1 to add, 1 to change, 0 to destroy.`,
      `[Infracost] Speculative cost impact: +$34.00/month`,
      `[Checkov] Scanned ${selectedWorkspace.resourceCount + 1} resources across 12 files. 0 Critical vulnerabilities detected.`,
      `[${new Date().toLocaleTimeString()}] Plan generated successfully.`
    ]);

    setTimeout(() => {
      setIsPlanning(false);
    }, 1200);
  };

  const handleRunApply = () => {
    if (!selectedWorkspace) return;
    setIsApplying(true);
    const time = new Date().toLocaleTimeString();

    setTfLogs(prev => [
      ...prev,
      '',
      `--------------------------------------------------------------------------------`,
      `[${time}] $ terraform apply ${autoApprove ? '-auto-approve' : ''}`,
      `Applying changes to target infrastructure: ${selectedWorkspace.provider}...`,
      `module.eks.aws_eks_node_group.workers: Modifying... [id=prod-core-workers]`,
      `module.vpc.aws_subnet.private_subnet_3: Creating...`,
      `module.vpc.aws_subnet.private_subnet_3: Creation complete after 6s [id=subnet-0b91e4f]`,
      `module.eks.aws_eks_node_group.workers: Modifications complete after 12s`,
      '',
      `Apply complete! Resources: 1 added, 1 changed, 0 destroyed.`,
      `State locked released. Outputs updated.`,
      `[${new Date().toLocaleTimeString()}] Apply finished successfully.`
    ]);

    setTimeout(() => {
      setIsApplying(false);
      const updated = workspaces.map(w => {
        if (w.id === selectedWorkspace.id) {
          return {
            ...w,
            lastApplied: 'Just now',
            lastPlanStatus: 'success' as const,
            resourceCount: w.resourceCount + 1
          };
        }
        return w;
      });
      setWorkspaces(updated);
      saveWorkspaces(updated);
    }, 1800);
  };

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(tfLogs.join('\n'));
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  const handleClearLogs = () => {
    setTfLogs(['Terminal logs cleared.', 'Ready for next Terraform command execution.']);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Overview */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-600 text-white flex items-center justify-center shadow-lg shadow-cyan-600/20 shrink-0">
              <Terminal size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-700 bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded-md">
                  CLI Engine
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400">Terraform v1.9 &bull; OpenTofu v1.8</span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">Plan &amp; Execution Engine</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Run speculative execution plans, verify cloud state diffs in real time, and trigger governed apply workflows.
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-3 shrink-0">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
              <input
                type="checkbox"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                className="rounded text-cyan-600 focus:ring-cyan-500"
              />
              <span>Auto-Approve</span>
            </label>

            <button
              onClick={handleRunPlan}
              disabled={isPlanning}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-200 disabled:opacity-50"
            >
              <RotateCw size={14} className={isPlanning ? 'animate-spin text-cyan-600' : ''} />
              <span>{isPlanning ? 'Planning...' : 'Run Speculative Plan'}</span>
            </button>

            <button
              onClick={handleRunApply}
              disabled={isApplying || selectedWorkspace?.isLocked}
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-cyan-600/20 flex items-center gap-2 disabled:opacity-50"
            >
              <Play size={14} />
              <span>{isApplying ? 'Applying...' : 'Apply Stack'}</span>
            </button>
          </div>
        </div>

        {/* Workspace Selector Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Workspace:</span>
            <select
              value={selectedWorkspaceId}
              onChange={(e) => handleSelectWorkspace(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            >
              {workspaces.map(ws => (
                <option key={ws.id} value={ws.id}>
                  {ws.name} ({ws.provider} &bull; {ws.environment})
                </option>
              ))}
            </select>
          </div>

          {selectedWorkspace && (
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100 font-bold">
                <FolderGit2 size={13} className="text-indigo-600" />
                {selectedWorkspace.gitConfig.repoName} @ {selectedWorkspace.gitConfig.branch}
              </span>
              <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-lg border border-slate-200 font-bold">
                {selectedWorkspace.gitConfig.lastCommitHash}
              </span>
              {selectedWorkspace.isLocked && (
                <span className="bg-rose-50 text-rose-700 px-2 py-1 rounded-lg border border-rose-200 font-bold flex items-center gap-1">
                  <Lock size={12} />
                  Locked
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Terminal Console */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        {/* Terminal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="h-4 w-px bg-slate-800" />
            <span className="font-mono text-xs font-bold text-slate-300">
              terraform-cli@cloud-runner &bull; {selectedWorkspace?.name || 'workspace'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLogs}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-800"
            >
              {copiedLog ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copiedLog ? 'Copied' : 'Copy Output'}</span>
            </button>
            <button
              onClick={handleClearLogs}
              className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
              title="Clear Terminal Output"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-4 bg-slate-900/90 rounded-2xl font-mono text-xs text-slate-300 max-h-[520px] overflow-y-auto custom-scrollbar space-y-1 select-text">
          {tfLogs.map((line, idx) => (
            <div
              key={idx}
              className={`leading-relaxed ${
                line.includes('Plan:') ? 'text-emerald-400 font-bold bg-emerald-950/30 p-1.5 rounded' :
                line.includes('Apply complete!') ? 'text-cyan-400 font-bold bg-cyan-950/30 p-1.5 rounded' :
                line.startsWith('  +') ? 'text-emerald-300 font-semibold' :
                line.startsWith('  ~') ? 'text-amber-300 font-semibold' :
                line.startsWith('  -') ? 'text-rose-300 font-semibold' :
                line.includes('Infracost:') ? 'text-cyan-300' :
                line.startsWith('$') ? 'text-white font-bold' :
                'text-slate-300'
              }`}
            >
              {line || '\u00A0'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
