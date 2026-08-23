/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layers, 
  Cloud, 
  Terminal, 
  ShieldCheck, 
  DollarSign, 
  Play, 
  FileCode, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  RotateCw, 
  Copy, 
  Check, 
  Plus, 
  ExternalLink,
  ChevronRight,
  Search,
  Download,
  Boxes,
  Cpu,
  Server,
  CloudLightning,
  GitPullRequest
} from 'lucide-react';

interface IaCStack {
  id: string;
  name: string;
  provider: 'AWS' | 'GCP' | 'Azure' | 'Kubernetes';
  framework: 'Terraform' | 'OpenTofu' | 'Pulumi' | 'CDK' | 'Helm';
  workspace: string;
  stateBackend: string;
  isLocked: boolean;
  resourceCount: number;
  lastPlanStatus: 'success' | 'drift' | 'error';
  lastApplied: string;
  monthlyCost: number;
  costDelta: number;
}

interface SecurityFinding {
  id: string;
  ruleId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  resource: string;
  file: string;
  line: number;
  title: string;
  description: string;
  remediationCode: string;
}

const INITIAL_STACKS: IaCStack[] = [
  {
    id: 'stack-01',
    name: 'production-aws-eks-cluster',
    provider: 'AWS',
    framework: 'OpenTofu',
    workspace: 'prod-us-east-1',
    stateBackend: 's3://tf-state-prod-vpc/eks.tfstate',
    isLocked: false,
    resourceCount: 48,
    lastPlanStatus: 'success',
    lastApplied: '2 hours ago',
    monthlyCost: 1420.50,
    costDelta: 0
  },
  {
    id: 'stack-02',
    name: 'gcp-analytics-data-lake',
    provider: 'GCP',
    framework: 'Terraform',
    workspace: 'prod-europe-west3',
    stateBackend: 'gs://gcp-tf-analytics-state/core.tfstate',
    isLocked: false,
    resourceCount: 32,
    lastPlanStatus: 'drift',
    lastApplied: '1 day ago',
    monthlyCost: 890.00,
    costDelta: 45.20
  },
  {
    id: 'stack-03',
    name: 'core-vpc-networking',
    provider: 'AWS',
    framework: 'OpenTofu',
    workspace: 'prod-global',
    stateBackend: 's3://tf-state-prod-vpc/network.tfstate',
    isLocked: true,
    resourceCount: 26,
    lastPlanStatus: 'success',
    lastApplied: '3 days ago',
    monthlyCost: 310.00,
    costDelta: -15.00
  },
  {
    id: 'stack-04',
    name: 'observability-prometheus-grafana',
    provider: 'Kubernetes',
    framework: 'Helm',
    workspace: 'cluster-system',
    stateBackend: 'k8s-secret://observability/helm-release',
    isLocked: false,
    resourceCount: 19,
    lastPlanStatus: 'success',
    lastApplied: '5 hours ago',
    monthlyCost: 120.00,
    costDelta: 0
  }
];

const SECURITY_FINDINGS: SecurityFinding[] = [
  {
    id: 'sec-chk-01',
    ruleId: 'CKV_AWS_18',
    severity: 'HIGH',
    resource: 'aws_s3_bucket.artifacts_bucket',
    file: 'modules/s3/main.tf',
    line: 14,
    title: 'Ensure S3 bucket has access logging enabled',
    description: 'S3 Bucket access logging generates detailed records for requests that are made to an Amazon S3 bucket.',
    remediationCode: `resource "aws_s3_bucket_logging" "artifacts" {
  bucket        = aws_s3_bucket.artifacts_bucket.id
  target_bucket = aws_s3_bucket.log_bucket.id
  target_prefix = "log/"
}`
  },
  {
    id: 'sec-chk-02',
    ruleId: 'CKV_AWS_260',
    severity: 'CRITICAL',
    resource: 'aws_security_group.ingress_rules',
    file: 'modules/security_groups/ingress.tf',
    line: 28,
    title: 'Security Group rule allows unrestricted ingress on Port 22 (SSH)',
    description: 'Port 22 is exposed to 0.0.0.0/0, allowing unauthorized attempts to access internal bastion hosts.',
    remediationCode: `ingress {
  description = "SSH from VPN CIDR only"
  from_port   = 22
  to_port     = 22
  protocol    = "tcp"
  cidr_blocks = ["10.200.0.0/16"] # Restricted to internal VPN
}`
  },
  {
    id: 'sec-chk-03',
    ruleId: 'CKV_GCP_62',
    severity: 'MEDIUM',
    resource: 'google_container_cluster.primary',
    file: 'gcp/gke/cluster.tf',
    line: 42,
    title: 'Ensure GKE cluster has Shielded GKE Nodes enabled',
    description: 'Shielded GKE Nodes provide strong cryptographic identity and boot integrity protection.',
    remediationCode: `enable_shielded_nodes = true`
  }
];

const IAC_TEMPLATES = [
  {
    id: 'tmpl-eks',
    title: 'AWS Production EKS Cluster + VPC & Karpenter',
    provider: 'AWS',
    framework: 'Terraform',
    description: 'High-availability 3-AZ VPC with NAT Gateways, EKS v1.30 control plane, and Karpenter autoscaler.',
    code: `terraform {
  required_version = ">= 1.8.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
  }
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.8.1"

  name = "prod-eks-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = false
  enable_dns_hostnames = true
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "20.14.0"

  cluster_name    = "production-core-eks"
  cluster_version = "1.30"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets

  cluster_endpoint_public_access = false
  enable_cluster_creator_admin_permissions = true
}`
  },
  {
    id: 'tmpl-gcp-sql',
    title: 'GCP Cloud SQL PostgreSQL Multi-Region HA',
    provider: 'GCP',
    framework: 'OpenTofu',
    description: 'Enterprise Cloud SQL PostgreSQL instance with Private Service Access, automated failover & backup.',
    code: `resource "google_sql_database_instance" "postgres_master" {
  name             = "prod-pg-ha-db"
  database_version = "POSTGRES_16"
  region           = "europe-west3"

  settings {
    tier              = "db-custom-4-16384"
    availability_type = "REGIONAL"
    disk_autoresize   = true
    disk_size         = 100
    disk_type         = "PD_SSD"

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "02:00"
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
      require_ssl     = true
    }
  }
}`
  }
];

export interface IaCTabProps {
  initialSubTab?: 'workspaces' | 'plan' | 'security' | 'cost' | 'templates';
  onSubTabChange?: (tab: 'workspaces' | 'plan' | 'security' | 'cost' | 'templates') => void;
}

export default function IaCTab({ initialSubTab = 'workspaces', onSubTabChange }: IaCTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'workspaces' | 'plan' | 'security' | 'cost' | 'templates'>(initialSubTab);

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const handleSubTabClick = (tab: 'workspaces' | 'plan' | 'security' | 'cost' | 'templates') => {
    setActiveSubTab(tab);
    if (onSubTabChange) {
      onSubTabChange(tab);
    }
  };
  const [stacks, setStacks] = useState<IaCStack[]>(INITIAL_STACKS);
  const [selectedStack, setSelectedStack] = useState<IaCStack>(INITIAL_STACKS[0]);
  const [isPlanning, setIsPlanning] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [appliedRemediations, setAppliedRemediations] = useState<Record<string, boolean>>({});
  const [selectedTemplate, setSelectedTemplate] = useState(IAC_TEMPLATES[0]);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Simulated Terraform CLI Output
  const [tfLogs, setTfLogs] = useState<string[]>([
    'Initializing the backend...',
    'Successfully configured the backend "s3"! Terraform will automatically',
    'use this backend unless the backend configuration changes.',
    '',
    'Initializing provider plugins...',
    '- Finding hashicorp/aws versions matching "~> 5.50"...',
    '- Installing hashicorp/aws v5.54.1...',
    '- Installed hashicorp/aws v5.54.1 (signed by HashiCorp)',
    '',
    'Terraform has been successfully initialized!',
    '',
    'Terraform used the selected providers to generate the following execution plan.',
    'Resource actions are indicated with the following symbols:',
    '  + create',
    '  ~ update in-place',
    '',
    'Terraform will perform the following actions:',
    '',
    '  # aws_eks_node_group.workers will be updated in-place',
    '  ~ resource "aws_eks_node_group" "workers" {',
    '      ~ desired_size = 6 -> 8',
    '      ~ max_size     = 12 -> 16',
    '        # (14 unchanged attributes hidden)',
    '    }',
    '',
    'Plan: 0 to add, 1 to change, 0 to destroy.'
  ]);

  const handleRunPlan = () => {
    setIsPlanning(true);
    setTfLogs(prev => [
      ...prev,
      '',
      `[${new Date().toLocaleTimeString()}] Running speculative terraform plan for workspace ${selectedStack.workspace}...`
    ]);

    setTimeout(() => {
      setIsPlanning(false);
      setTfLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Plan generated: 2 to add, 1 to change, 0 to destroy. Cost delta: +$34.00/month.`
      ]);
    }, 1400);
  };

  const handleRunApply = () => {
    setIsApplying(true);
    setTfLogs(prev => [
      ...prev,
      '',
      `[${new Date().toLocaleTimeString()}] Applying plan with auto-approve...`,
      'aws_eks_node_group.workers: Modifying... [id=prod-core-workers]',
      'aws_eks_node_group.workers: Modifications complete after 8s',
      '',
      'Apply complete! Resources: 0 added, 1 changed, 0 destroyed.'
    ]);

    setTimeout(() => {
      setIsApplying(false);
      setStacks(prev => prev.map(s => s.id === selectedStack.id ? { ...s, lastApplied: 'Just now', lastPlanStatus: 'success' } : s));
    }, 1800);
  };

  const handleToggleLock = (stackId: string) => {
    setStacks(prev => prev.map(s => s.id === stackId ? { ...s, isLocked: !s.isLocked } : s));
  };

  const handleApplyRemediation = (findingId: string) => {
    setAppliedRemediations(prev => ({ ...prev, [findingId]: true }));
    setTfLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [CHECKOV] Applied automated security patch for rule ${findingId}`
    ]);
  };

  const totalMonthlyCost = stacks.reduce((sum, s) => sum + s.monthlyCost, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner Overview */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-600 text-white flex items-center justify-center shadow-lg shadow-cyan-600/20 shrink-0">
              <Layers size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-700 bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded-md">
                  DevOps Suite
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400">Terraform &bull; OpenTofu &bull; Pulumi &bull; Infracost</span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">Infrastructure as Code (IaC)</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Declarative cloud provisioning, speculative plans, policy-as-code security scans & cost projections.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleRunPlan}
              disabled={isPlanning}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-200 disabled:opacity-50"
            >
              <RotateCw size={14} className={isPlanning ? 'animate-spin text-cyan-600' : ''} />
              <span>{isPlanning ? 'Generating Plan...' : 'Run Speculative Plan'}</span>
            </button>
            <button
              onClick={handleRunApply}
              disabled={isApplying || selectedStack.isLocked}
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-cyan-600/20 flex items-center gap-2 disabled:opacity-50"
            >
              <Play size={14} />
              <span>{isApplying ? 'Applying...' : 'Apply Stack'}</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Workspaces</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{stacks.length}</div>
            <span className="text-[11px] font-medium text-slate-500">AWS &bull; GCP &bull; K8s</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Managed Resources</span>
            <div className="text-2xl font-black text-cyan-600 mt-1">
              {stacks.reduce((acc, s) => acc + s.resourceCount, 0)}
            </div>
            <span className="text-[11px] font-medium text-cyan-700">Tracked in state backends</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Est. Cloud Spend</span>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono">${totalMonthlyCost.toFixed(2)}</div>
            <span className="text-[11px] font-medium text-slate-500">Infracost Monthly Projection</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Policy Security Score</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">94.8%</div>
            <span className="text-[11px] font-medium text-emerald-600">Checkov & tfsec passing</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
          {[
            { id: 'workspaces', label: 'Workspaces & Stacks', icon: <Boxes size={14} />, count: stacks.length },
            { id: 'plan', label: 'Plan & Execution Engine', icon: <Terminal size={14} /> },
            { id: 'security', label: 'Checkov & Security Gates', icon: <ShieldCheck size={14} />, count: SECURITY_FINDINGS.length },
            { id: 'cost', label: 'Infracost Budget Impact', icon: <DollarSign size={14} /> },
            { id: 'templates', label: 'IaC Blueprint Library', icon: <FileCode size={14} />, count: IAC_TEMPLATES.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleSubTabClick(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeSubTab === tab.id ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-Tab Content */}
      <AnimatePresence mode="wait">
        {/* 1. Workspaces & Stacks */}
        {activeSubTab === 'workspaces' && (
          <motion.div
            key="workspaces-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stacks.map((stack) => (
                <div
                  key={stack.id}
                  onClick={() => setSelectedStack(stack)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white shadow-sm hover:shadow-md ${
                    selectedStack.id === stack.id ? 'border-cyan-500 ring-2 ring-cyan-500/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{stack.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-slate-100 text-slate-700">
                        {stack.framework}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleLock(stack.id);
                      }}
                      className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                        stack.isLocked ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500 hover:text-slate-900'
                      }`}
                      title={stack.isLocked ? 'State Locked' : 'State Unlocked'}
                    >
                      {stack.isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                      <span className="text-[10px]">{stack.isLocked ? 'Locked' : 'Unlocked'}</span>
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono mt-2 truncate">
                    Backend: {stack.stateBackend}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 text-center">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Resources</div>
                      <div className="text-sm font-black text-slate-800 font-mono mt-0.5">{stack.resourceCount}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Monthly Cost</div>
                      <div className="text-sm font-black text-slate-800 font-mono mt-0.5">${stack.monthlyCost.toFixed(0)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Last Applied</div>
                      <div className="text-xs font-bold text-slate-600 mt-0.5">{stack.lastApplied}</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-slate-500">Workspace: {stack.workspace}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStack(stack);
                        setActiveSubTab('plan');
                        handleRunPlan();
                      }}
                      className="px-3 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <span>Inspect Plan</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 2. Plan & Execution Engine */}
        {activeSubTab === 'plan' && (
          <motion.div
            key="plan-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
                    <Terminal size={18} />
                  </div>
                  <div>
                    <h3 className="font-mono text-xs font-bold text-white">
                      Terraform CLI &bull; Workspace: {selectedStack.workspace} ({selectedStack.name})
                    </h3>
                    <p className="text-[11px] font-mono text-slate-500">OpenTofu Engine v1.8.2 &bull; State: OK</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunPlan}
                    disabled={isPlanning}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <RotateCw size={12} className={isPlanning ? 'animate-spin' : ''} />
                    <span>Plan</span>
                  </button>
                  <button
                    onClick={handleRunApply}
                    disabled={isApplying || selectedStack.isLocked}
                    className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-600/30 disabled:opacity-50"
                  >
                    <Play size={12} />
                    <span>Apply</span>
                  </button>
                </div>
              </div>

              {/* Terminal Logs Output */}
              <div className="p-4 bg-slate-900/90 rounded-xl font-mono text-xs text-slate-300 max-h-96 overflow-y-auto custom-scrollbar space-y-1">
                {tfLogs.map((line, idx) => (
                  <div
                    key={idx}
                    className={`leading-relaxed ${
                      line.includes('Plan:') ? 'text-emerald-400 font-bold' :
                      line.includes('Apply complete!') ? 'text-cyan-400 font-bold' :
                      line.startsWith('  +') ? 'text-emerald-300' :
                      line.startsWith('  ~') ? 'text-amber-300' :
                      line.startsWith('  -') ? 'text-rose-300' :
                      'text-slate-300'
                    }`}
                  >
                    {line || '\u00A0'}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* 3. Checkov & Security Gate */}
        {activeSubTab === 'security' && (
          <motion.div
            key="security-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <ShieldCheck size={18} className="text-cyan-600" />
                    Policy-as-Code Static Security Analysis (Checkov & tfsec)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">
                    Continuous static verification against CIS Benchmarks, NIST SP 800-53, and AWS/GCP Best Practices.
                  </p>
                </div>

                <button
                  onClick={() => alert('Checkov scan re-executed. 3 findings verified.')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Re-scan All Modules
                </button>
              </div>

              {/* Findings List */}
              <div className="divide-y divide-slate-100 mt-2 space-y-4">
                {SECURITY_FINDINGS.map((finding) => (
                  <div key={finding.id} className="pt-4 space-y-3">
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
                          Auto-Patch Applied
                        </span>
                      ) : (
                        <button
                          onClick={() => handleApplyRemediation(finding.id)}
                          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                        >
                          Apply 1-Click Patch
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{finding.description}</p>

                    <div className="p-3 bg-slate-950 text-cyan-200 font-mono text-xs rounded-xl overflow-x-auto">
                      <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Recommended Code Fix ({finding.file}:{finding.line})</div>
                      <pre>{finding.remediationCode}</pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* 4. Infracost Budget Impact */}
        {activeSubTab === 'cost' && (
          <motion.div
            key="cost-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <DollarSign size={18} className="text-emerald-600" />
                Monthly Cost Projection Breakdown
              </h3>

              <div className="space-y-3">
                {stacks.map((stack) => (
                  <div key={stack.id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-800 font-mono">{stack.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{stack.provider} &bull; {stack.resourceCount} resources</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-sm text-slate-900">${stack.monthlyCost.toFixed(2)}/mo</div>
                      {stack.costDelta !== 0 && (
                        <div className={`text-[10px] font-mono font-bold ${stack.costDelta > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {stack.costDelta > 0 ? `+$${stack.costDelta.toFixed(2)}` : `-$${Math.abs(stack.costDelta).toFixed(2)}`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                Cloud Cost Optimization Opportunities
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <div className="font-bold text-amber-900">Unused NAT Gateways in us-east-1c</div>
                  <div className="text-amber-800 text-[11px]">
                    Consolidating to a single Multi-AZ NAT Gateway could save <strong>$64.80/month</strong>.
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <div className="font-bold text-emerald-900">Graviton (ARM64) Instance Migration</div>
                  <div className="text-emerald-800 text-[11px]">
                    Switching EKS nodes from <code>m5.xlarge</code> to <code>m7g.xlarge</code> saves <strong>20% compute costs</strong>.
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 5. IaC Blueprint Library */}
        {activeSubTab === 'templates' && (
          <motion.div
            key="templates-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            <div className="lg:col-span-4 space-y-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">Enterprise Blueprints</h3>
                <div className="space-y-2">
                  {IAC_TEMPLATES.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      onClick={() => setSelectedTemplate(tmpl)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedTemplate.id === tmpl.id ? 'bg-cyan-50 border-cyan-300' : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900">{tmpl.title}</div>
                      <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">{tmpl.description}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                          {tmpl.provider}
                        </span>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700">
                          {tmpl.framework}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
              <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-slate-200">
                <div className="flex items-center gap-2">
                  <FileCode size={16} className="text-cyan-400" />
                  <span className="font-mono text-xs font-bold text-white">{selectedTemplate.title}</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedTemplate.code);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedCode ? 'Copied' : 'Copy Blueprint'}</span>
                </button>
              </div>

              <div className="p-4 bg-slate-950 text-cyan-100 font-mono text-xs overflow-x-auto max-h-[500px] leading-relaxed">
                <pre>{selectedTemplate.code}</pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
