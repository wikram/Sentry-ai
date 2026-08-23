/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface IaCVariable {
  id: string;
  key: string;
  value: string;
  category: 'terraform' | 'environment'; // terraform (tfvars) vs environment (env vars like AWS_REGION)
  hcl?: boolean;
  sensitive?: boolean;
  description?: string;
  createdAt?: string;
}

export interface GitRepoConfig {
  provider: 'github' | 'gitlab' | 'git_ssh';
  repoUrl: string; // e.g. "https://github.com/enterprise-cloud/terraform-aws-infra"
  repoName: string; // e.g. "enterprise-cloud/terraform-aws-infra"
  branch: string; // e.g. "main", "release/v2.1"
  workingDirectory: string; // e.g. "environments/production/eks"
  authType: 'pat' | 'deploy_key' | 'vcs_oauth';
  tokenSecretRef?: string;
  sshKeyRef?: string;
  webhookEnabled: boolean;
  webhookSecret?: string;
  lastCommitHash?: string;
  lastCommitMessage?: string;
  lastCommitAuthor?: string;
  lastCommitDate?: string;
  syncStatus: 'synced' | 'diverged' | 'syncing' | 'error';
  lastSyncedAt?: string;
}

export interface IaCWorkspace {
  id: string;
  name: string;
  description: string;
  environment: 'production' | 'staging' | 'development' | 'sandbox' | 'dr';
  provider: 'AWS' | 'GCP' | 'Azure' | 'Kubernetes' | 'Multi-Cloud';
  terraformVersion: string; // e.g. "1.9.5", "1.8.5", "OpenTofu 1.8.2"
  stateBackend: {
    type: 's3' | 'gcs' | 'azurerm' | 'remote' | 'http' | 'local';
    bucket?: string;
    key?: string;
    region?: string;
    lockTable?: string;
    resourceGroup?: string;
    containerName?: string;
  };
  gitConfig: GitRepoConfig;
  variables: IaCVariable[];
  isLocked: boolean;
  lockDetails?: {
    lockedBy: string;
    lockedAt: string;
    lockId: string;
  };
  resourceCount: number;
  lastPlanStatus: 'success' | 'drift' | 'error' | 'pending';
  lastApplied: string;
  monthlyCost: number;
  costDelta: number;
  autoApply: boolean;
  speculativePlans: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SecurityFinding {
  id: string;
  ruleId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  resource: string;
  file: string;
  line: number;
  title: string;
  description: string;
  remediationCode: string;
  workspaceId?: string;
}

export interface IaCTemplate {
  id: string;
  title: string;
  provider: 'AWS' | 'GCP' | 'Azure' | 'Kubernetes' | 'Multi-Cloud';
  framework: 'Terraform' | 'OpenTofu' | 'Pulumi' | 'CDK';
  description: string;
  code: string;
  suggestedVariables: { key: string; defaultValue: string; description: string }[];
}
