import { Incident, RCAAgent, DataSource } from './types';

export const MOCK_SOURCES: DataSource[] = [
  {
    id: 'src-1',
    name: 'Production K8s',
    type: 'kubernetes',
    status: 'connected',
    lastSync: '2026-05-09T10:45:00Z',
    config: { cluster: 'prod-main' }
  },
  {
    id: 'src-2',
    name: 'Devops Studio CI/CD',
    type: 'jenkins',
    status: 'syncing',
    lastSync: '2026-05-09T11:00:00Z',
    config: { url: 'https://cicd.internal' }
  },
  {
    id: 'src-3',
    name: 'SonarQube Quality Gateway',
    type: 'sonarqube',
    status: 'error',
    lastSync: '2026-05-09T09:00:00Z',
    config: { project: 'checkout-v2' }
  }
];

export const MOCK_AGENTS: RCAAgent[] = [
  {
    id: 'agent-1',
    name: 'SRE-Bot Alpha',
    status: 'analyzing',
    isActive: true,
    findings: [
      'CPU spikes detected on node k8s-worker-7',
      'Memory pressure transition observed at 14:22:10'
    ]
  },
  {
    id: 'agent-2',
    name: 'NetScan Omega',
    status: 'complete',
    isActive: true,
    findings: [
      'Increased latency on api-gateway endpoint',
      'Packet drop rate exceeded threshold in VPC-2'
    ]
  },
  {
    id: 'agent-3',
    name: 'DB-Sentinel',
    status: 'idle',
    isActive: true,
    findings: [
      'Locked queries in Postgres pool: 12 detected',
      'Storage IOPS reaching provisioned limits'
    ]
  }
];

export const MOCK_INCIDENTS: Incident[] = [
  {
    id: 'INC-4029',
    title: 'API Latency Spike - checkout-service',
    status: 'investigating',
    severity: 'critical',
    createdAt: new Date(new Date().getTime() - 15 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    sourceTools: ['Kubernetes', 'CloudWatch', 'Datadog'],
    confidence: 85,
    possibleRCA: 'Recursive wait-loop in checkout-service during payment processing handshake.',
    logs: [
      { id: 'l1', timestamp: '14:22:01', source: 'ingress', message: '504 Gateway Timeout /api/v1/checkout', level: 'error' },
      { id: 'l2', timestamp: '14:22:05', source: 'checkout-svc', message: 'Connection reset by peer: payment-gateway:443', level: 'warn' },
      { id: 'l3', timestamp: '14:22:10', source: 'k8s-node', message: 'Memory pressure reached on node-4 (92%)', level: 'warn' },
      { id: 'l4', timestamp: '14:22:12', source: 'checkout-svc', message: 'Thread pool saturation detected. Active threads: 200', level: 'error' },
      { id: 'l5', timestamp: '14:22:15', source: 'payment-gateway', message: 'Handshake timeout during TLS negotiation', level: 'error' },
      { id: 'l6', timestamp: '14:22:18', source: 'db-proxy', message: 'Slow query detected: SELECT * FROM transactions WHERE status="pending"', level: 'info' },
      { id: 'l7', timestamp: '14:22:20', source: 'checkout-svc', message: 'Retrying connection to payment-gateway... (Attempt 3/5)', level: 'warn' }
    ]
  },
  {
    id: 'INC-3981',
    title: 'Database connection pool exhaustion',
    status: 'resolved',
    severity: 'warning',
    createdAt: '2026-05-09T08:00:00Z',
    updatedAt: '2026-05-09T09:30:00Z',
    sourceTools: ['PostgreSQL', 'Prometheus'],
    confidence: 98,
    possibleRCA: 'Connection leak in user-profile-service after recent deployment v2.4.1.',
    logs: []
  }
];
