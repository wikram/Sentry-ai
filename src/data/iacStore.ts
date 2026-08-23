/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IaCWorkspace, SecurityFinding, IaCTemplate } from '../types/iac';

const STORAGE_KEY_WORKSPACES = 'devsecops_iac_workspaces_v2';
const STORAGE_KEY_ACTIVE_WORKSPACE = 'devsecops_iac_active_workspace_id';

export const DEFAULT_WORKSPACES: IaCWorkspace[] = [
  {
    id: 'ws-aws-eks-prod',
    name: 'production-aws-eks-cluster',
    description: 'High-availability AWS EKS Kubernetes v1.30 cluster with VPC CNI, EBS CSI Driver & Karpenter Node Autoscaler.',
    environment: 'production',
    provider: 'AWS',
    terraformVersion: '1.9.5',
    stateBackend: {
      type: 's3',
      bucket: 'enterprise-tfstate-prod-useast1',
      key: 'kubernetes/eks-cluster.tfstate',
      region: 'us-east-1',
      lockTable: 'tf-state-locks-dynamodb'
    },
    gitConfig: {
      provider: 'github',
      repoUrl: 'https://github.com/enterprise-cloud/terraform-aws-kubernetes',
      repoName: 'enterprise-cloud/terraform-aws-kubernetes',
      branch: 'main',
      workingDirectory: 'environments/production/us-east-1',
      authType: 'pat',
      tokenSecretRef: 'ghp_enc_sec_vault_k8s_prod',
      webhookEnabled: true,
      webhookSecret: 'whsec_98af21d0a811c7849e',
      lastCommitHash: 'e4b7c21',
      lastCommitMessage: 'feat(karpenter): bump node pool to c6i.2xlarge with spot fallback',
      lastCommitAuthor: 'DevOps Lead (@alexandra-ops)',
      lastCommitDate: '2 hours ago',
      syncStatus: 'synced',
      lastSyncedAt: '10 minutes ago'
    },
    variables: [
      {
        id: 'var-1',
        key: 'cluster_name',
        value: 'prod-core-eks-v1',
        category: 'terraform',
        hcl: false,
        sensitive: false,
        description: 'Unique identifier for the AWS EKS Cluster'
      },
      {
        id: 'var-2',
        key: 'cluster_version',
        value: '1.30',
        category: 'terraform',
        hcl: false,
        sensitive: false,
        description: 'Kubernetes Control Plane version'
      },
      {
        id: 'var-3',
        key: 'vpc_cidr',
        value: '10.100.0.0/16',
        category: 'terraform',
        hcl: false,
        sensitive: false,
        description: 'VPC CIDR address space for the cluster subnets'
      },
      {
        id: 'var-4',
        key: 'node_group_subnets',
        value: '["subnet-0a12b34c56", "subnet-0d78e90f12", "subnet-0f34a56b78"]',
        category: 'terraform',
        hcl: true,
        sensitive: false,
        description: 'Private worker node subnet IDs across 3 Availability Zones'
      },
      {
        id: 'var-5',
        key: 'enable_irsa',
        value: 'true',
        category: 'terraform',
        hcl: true,
        sensitive: false,
        description: 'Enable IAM Roles for Service Accounts (IRSA)'
      },
      {
        id: 'var-6',
        key: 'AWS_REGION',
        value: 'us-east-1',
        category: 'environment',
        hcl: false,
        sensitive: false,
        description: 'Target AWS deployment region'
      },
      {
        id: 'var-7',
        key: 'AWS_ROLE_ARN',
        value: 'arn:aws:iam::871869845365:role/TerraformPipelineDeploymentRole',
        category: 'environment',
        hcl: false,
        sensitive: false,
        description: 'Assumed IAM Role for cross-account provisioning'
      },
      {
        id: 'var-8',
        key: 'TF_VAR_db_master_password',
        value: '••••••••••••••••',
        category: 'terraform',
        hcl: false,
        sensitive: true,
        description: 'Master database secret key for RDS bootstrap'
      }
    ],
    isLocked: false,
    resourceCount: 48,
    lastPlanStatus: 'success',
    lastApplied: '2 hours ago',
    monthlyCost: 1420.50,
    costDelta: 0,
    autoApply: false,
    speculativePlans: true,
    tags: ['kubernetes', 'aws', 'production', 'tier-1', 'pci-dss'],
    createdAt: '2026-03-12T10:00:00Z',
    updatedAt: '2026-08-23T05:20:00Z'
  },
  {
    id: 'ws-gcp-data-lake',
    name: 'gcp-analytics-data-lake',
    description: 'Google Cloud Platform BigQuery, Cloud Storage buckets, Pub/Sub & Dataflow infrastructure for real-time analytics.',
    environment: 'production',
    provider: 'GCP',
    terraformVersion: '1.9.5',
    stateBackend: {
      type: 'gcs',
      bucket: 'gcp-tfstate-analytics-europe-west3',
      key: 'data-lake/terraform.tfstate',
      region: 'europe-west3'
    },
    gitConfig: {
      provider: 'gitlab',
      repoUrl: 'https://gitlab.com/fintech-ops/gcp-data-infra',
      repoName: 'fintech-ops/gcp-data-infra',
      branch: 'release/v2.4',
      workingDirectory: 'terraform/pipelines/prod-lake',
      authType: 'pat',
      tokenSecretRef: 'glpat_enc_sec_analytics',
      webhookEnabled: true,
      webhookSecret: 'glsec_71c42b918a',
      lastCommitHash: '89fd104',
      lastCommitMessage: 'refactor(bigquery): enable partitioned tables and CMK encryption',
      lastCommitAuthor: 'Data Engineer (@marcus.g)',
      lastCommitDate: 'Yesterday at 18:42',
      syncStatus: 'synced',
      lastSyncedAt: '25 minutes ago'
    },
    variables: [
      {
        id: 'gcp-var-1',
        key: 'gcp_project_id',
        value: 'enterprise-analytics-prod-88',
        category: 'terraform',
        hcl: false,
        sensitive: false,
        description: 'GCP Target Project ID'
      },
      {
        id: 'gcp-var-2',
        key: 'gcp_region',
        value: 'europe-west3',
        category: 'terraform',
        hcl: false,
        sensitive: false,
        description: 'GCP Frankfurt Primary Region'
      },
      {
        id: 'gcp-var-3',
        key: 'storage_bucket_retention_days',
        value: '365',
        category: 'terraform',
        hcl: true,
        sensitive: false,
        description: 'Data retention policy for raw parquet ingestion'
      },
      {
        id: 'gcp-var-4',
        key: 'GOOGLE_CREDENTIALS',
        value: '{"type": "service_account", "project_id": "enterprise-analytics-prod-88", ...}',
        category: 'environment',
        hcl: false,
        sensitive: true,
        description: 'GCP Service Account JSON Private Key'
      }
    ],
    isLocked: false,
    resourceCount: 32,
    lastPlanStatus: 'drift',
    lastApplied: '1 day ago',
    monthlyCost: 890.00,
    costDelta: 45.20,
    autoApply: false,
    speculativePlans: true,
    tags: ['gcp', 'analytics', 'bigquery', 'europe', 'gdpr'],
    createdAt: '2026-04-10T14:30:00Z',
    updatedAt: '2026-08-22T18:45:00Z'
  },
  {
    id: 'ws-aws-vpc-network',
    name: 'core-vpc-networking-hub',
    description: 'Transit Gateway, VPC peering meshes, NAT Gateways, DirectConnect links & Route53 Private Hosted Zones.',
    environment: 'production',
    provider: 'AWS',
    terraformVersion: 'OpenTofu 1.8.2',
    stateBackend: {
      type: 's3',
      bucket: 'enterprise-tfstate-network-global',
      key: 'networking/transit-gateway.tfstate',
      region: 'us-east-1',
      lockTable: 'tf-network-locks'
    },
    gitConfig: {
      provider: 'github',
      repoUrl: 'https://github.com/enterprise-cloud/terraform-network-core',
      repoName: 'enterprise-cloud/terraform-network-core',
      branch: 'main',
      workingDirectory: 'live/global-tgw',
      authType: 'deploy_key',
      sshKeyRef: 'id_ed25519_network_core',
      webhookEnabled: true,
      lastCommitHash: '3ca192b',
      lastCommitMessage: 'chore(dns): add split-horizon resolver endpoints',
      lastCommitAuthor: 'NetOps (@sarah.k)',
      lastCommitDate: '3 days ago',
      syncStatus: 'synced',
      lastSyncedAt: '1 hour ago'
    },
    variables: [
      {
        id: 'net-var-1',
        key: 'tgw_asn',
        value: '64512',
        category: 'terraform',
        hcl: true,
        sensitive: false,
        description: 'BGP Autonomous System Number for AWS Transit Gateway'
      },
      {
        id: 'net-var-2',
        key: 'enable_flow_logs',
        value: 'true',
        category: 'terraform',
        hcl: true,
        sensitive: false,
        description: 'Publish VPC Flow Logs to CloudWatch & S3 Parquet'
      },
      {
        id: 'net-var-3',
        key: 'AWS_REGION',
        value: 'us-east-1',
        category: 'environment',
        hcl: false,
        sensitive: false,
        description: 'Primary deployment region'
      }
    ],
    isLocked: true,
    lockDetails: {
      lockedBy: 'CI/CD Pipeline #4819 (Pipeline-Deploy-Bot)',
      lockedAt: '2026-08-23T04:15:00Z',
      lockId: 'lock-tgw-991204'
    },
    resourceCount: 26,
    lastPlanStatus: 'success',
    lastApplied: '3 days ago',
    monthlyCost: 310.00,
    costDelta: -15.00,
    autoApply: false,
    speculativePlans: true,
    tags: ['networking', 'tgw', 'aws', 'core-infra'],
    createdAt: '2026-02-01T08:00:00Z',
    updatedAt: '2026-08-20T11:15:00Z'
  },
  {
    id: 'ws-azure-identity-vault',
    name: 'azure-entra-id-keyvault-staging',
    description: 'Azure Key Vault HSM, Managed Identities, Entra ID App Registrations & Role-Based Access Control assignments.',
    environment: 'staging',
    provider: 'Azure',
    terraformVersion: '1.9.5',
    stateBackend: {
      type: 'azurerm',
      containerName: 'tfstate',
      bucket: 'sttfstatevaultstaging',
      key: 'identity/keyvault.tfstate',
      resourceGroup: 'rg-terraform-staging'
    },
    gitConfig: {
      provider: 'github',
      repoUrl: 'https://github.com/enterprise-cloud/terraform-azure-security',
      repoName: 'enterprise-cloud/terraform-azure-security',
      branch: 'staging',
      workingDirectory: 'environments/staging/keyvault',
      authType: 'pat',
      tokenSecretRef: 'ghp_enc_sec_vault_staging',
      webhookEnabled: false,
      lastCommitHash: '11fa77c',
      lastCommitMessage: 'fix(access-policy): enforce RBAC authorization mode on Key Vault',
      lastCommitAuthor: 'SecOps (@jordan.t)',
      lastCommitDate: '4 days ago',
      syncStatus: 'synced',
      lastSyncedAt: '2 hours ago'
    },
    variables: [
      {
        id: 'az-var-1',
        key: 'key_vault_sku',
        value: 'premium',
        category: 'terraform',
        hcl: false,
        sensitive: false,
        description: 'Key Vault SKU tier (standard vs premium HSM)'
      },
      {
        id: 'az-var-2',
        key: 'ARM_SUBSCRIPTION_ID',
        value: 'd9b73461-8041-4e92-94ea-2a819c4b7110',
        category: 'environment',
        hcl: false,
        sensitive: false,
        description: 'Azure Subscription ID'
      },
      {
        id: 'az-var-3',
        key: 'ARM_CLIENT_SECRET',
        value: '••••••••••••••••',
        category: 'environment',
        hcl: false,
        sensitive: true,
        description: 'Azure Service Principal Client Secret'
      }
    ],
    isLocked: false,
    resourceCount: 18,
    lastPlanStatus: 'success',
    lastApplied: '5 days ago',
    monthlyCost: 240.00,
    costDelta: 0,
    autoApply: true,
    speculativePlans: true,
    tags: ['azure', 'security', 'keyvault', 'staging', 'entra-id'],
    createdAt: '2026-05-14T09:00:00Z',
    updatedAt: '2026-08-19T14:20:00Z'
  }
];

export const DEFAULT_SECURITY_FINDINGS: SecurityFinding[] = [
  {
    id: 'sec-chk-01',
    ruleId: 'CKV_AWS_18',
    severity: 'HIGH',
    resource: 'aws_s3_bucket.artifacts_bucket',
    file: 'modules/s3/main.tf',
    line: 14,
    title: 'Ensure S3 bucket has access logging enabled',
    description: 'S3 Bucket access logging generates detailed records for requests that are made to an Amazon S3 bucket for security audit and compliance.',
    remediationCode: `resource "aws_s3_bucket_logging" "artifacts" {
  bucket        = aws_s3_bucket.artifacts_bucket.id
  target_bucket = aws_s3_bucket.log_bucket.id
  target_prefix = "log/"
}`,
    workspaceId: 'ws-aws-eks-prod'
  },
  {
    id: 'sec-chk-02',
    ruleId: 'CKV_AWS_260',
    severity: 'CRITICAL',
    resource: 'aws_security_group.ingress_rules',
    file: 'modules/security_groups/ingress.tf',
    line: 28,
    title: 'Security Group rule allows unrestricted ingress on Port 22 (SSH)',
    description: 'Port 22 is exposed to 0.0.0.0/0, allowing unauthorized internet entities to attempt brute-force attacks on internal bastion hosts.',
    remediationCode: `ingress {
  description = "SSH from VPN CIDR only"
  from_port   = 22
  to_port     = 22
  protocol    = "tcp"
  cidr_blocks = ["10.200.0.0/16"] # Restricted to internal VPN CIDR
}`,
    workspaceId: 'ws-aws-eks-prod'
  },
  {
    id: 'sec-chk-03',
    ruleId: 'CKV_GCP_62',
    severity: 'MEDIUM',
    resource: 'google_container_cluster.primary',
    file: 'gcp/gke/cluster.tf',
    line: 42,
    title: 'Ensure GKE cluster has Shielded GKE Nodes enabled',
    description: 'Shielded GKE Nodes provide strong cryptographic identity and boot integrity protection against kernel rootkits.',
    remediationCode: `enable_shielded_nodes = true`,
    workspaceId: 'ws-gcp-data-lake'
  },
  {
    id: 'sec-chk-04',
    ruleId: 'CKV_AZURE_109',
    severity: 'HIGH',
    resource: 'azurerm_key_vault.vault',
    file: 'azure/keyvault/main.tf',
    line: 19,
    title: 'Ensure Key Vault has purge protection enabled',
    description: 'Enabling purge protection prevents permanent deletion of secrets, certificates, and cryptographic keys before retention period expiration.',
    remediationCode: `purge_protection_enabled = true`,
    workspaceId: 'ws-azure-identity-vault'
  }
];

export const DEFAULT_IAC_TEMPLATES: IaCTemplate[] = [
  {
    id: 'tmpl-eks',
    title: 'AWS Production EKS Cluster + VPC & Karpenter',
    provider: 'AWS',
    framework: 'Terraform',
    description: 'High-availability 3-AZ VPC with NAT Gateways, EKS v1.30 control plane, and Karpenter autoscaler.',
    suggestedVariables: [
      { key: 'cluster_name', defaultValue: 'production-core-eks', description: 'Name of the EKS Cluster' },
      { key: 'vpc_cidr', defaultValue: '10.0.0.0/16', description: 'Network address CIDR' },
      { key: 'kubernetes_version', defaultValue: '1.30', description: 'EKS Control plane release' }
    ],
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

  name = var.cluster_name
  cidr = var.vpc_cidr

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

  cluster_name    = var.cluster_name
  cluster_version = var.kubernetes_version
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
    framework: 'Terraform',
    description: 'Enterprise Cloud SQL PostgreSQL instance with Private Service Access, automated failover & backup.',
    suggestedVariables: [
      { key: 'instance_name', defaultValue: 'prod-pg-ha-db', description: 'Cloud SQL instance name' },
      { key: 'gcp_region', defaultValue: 'europe-west3', description: 'Target GCP region' }
    ],
    code: `resource "google_sql_database_instance" "postgres_master" {
  name             = var.instance_name
  database_version = "POSTGRES_16"
  region           = var.gcp_region

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
  },
  {
    id: 'tmpl-azure-appservice',
    title: 'Azure App Service Linux + Key Vault & VNet Integration',
    provider: 'Azure',
    framework: 'Terraform',
    description: 'Secure Container App Service on Linux with private VNet integration and system-assigned Managed Identity.',
    suggestedVariables: [
      { key: 'app_name', defaultValue: 'core-api-service', description: 'Azure App Service Name' },
      { key: 'location', defaultValue: 'eastus2', description: 'Azure Datacenter region' }
    ],
    code: `resource "azurerm_linux_web_app" "app" {
  name                = var.app_name
  resource_group_name = azurerm_resource_group.rg.name
  location            = var.location
  service_plan_id     = azurerm_service_plan.plan.id

  site_config {
    always_on = true
    vnet_route_all_enabled = true
    application_stack {
      docker_image_name   = "enterprise/api:latest"
      docker_registry_url = "https://enterpriseregistry.azurecr.io"
    }
  }

  identity {
    type = "SystemAssigned"
  }
}`
  }
];

// Helper functions for persistent storage
export function loadWorkspaces(): IaCWorkspace[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WORKSPACES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load workspaces from localStorage:', err);
  }
  return DEFAULT_WORKSPACES;
}

export function saveWorkspaces(workspaces: IaCWorkspace[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_WORKSPACES, JSON.stringify(workspaces));
  } catch (err) {
    console.warn('Failed to save workspaces to localStorage:', err);
  }
}

export function loadActiveWorkspaceId(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_WORKSPACE);
    if (raw) return raw;
  } catch (err) {
    console.warn('Failed to load active workspace ID:', err);
  }
  return DEFAULT_WORKSPACES[0].id;
}

export function saveActiveWorkspaceId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_WORKSPACE, id);
  } catch (err) {
    console.warn('Failed to save active workspace ID:', err);
  }
}
