/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Severity = 'critical' | 'warning' | 'info' | 'resolved';

export interface LogEntry {
  id: string;
  timestamp: string;
  source: string;
  message: string;
  level: 'error' | 'warn' | 'info' | 'debug';
}

export interface RCAAgent {
  id: string;
  name: string;
  status: 'analyzing' | 'idle' | 'complete';
  isActive: boolean;
  isDefault?: boolean;
  backendUrl?: string;
  model?: string;
  findings: string[];
}

export interface DataSource {
  id: string;
  name: string;
  type: 'jenkins' | 'sonarqube' | 'github' | 'kubernetes' | 'datadog' | 'postgresql' | 'mysql' | 'pinecone' | 'weaviate' | 'milvus' | 'chromadb' | 'generic';
  status: 'connected' | 'error' | 'syncing';
  lastSync?: string;
  config: Record<string, string>;
}

export interface Incident {
  id: string;
  title: string;
  status: 'active' | 'investigating' | 'resolved';
  severity: Severity;
  createdAt: string;
  updatedAt: string;
  sourceTools: string[];
  logs: LogEntry[];
  possibleRCA?: string;
  confidence: number;
}
