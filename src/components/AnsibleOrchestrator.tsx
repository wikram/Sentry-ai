/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Terminal, 
  Server, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  RotateCw, 
  Sliders, 
  ShieldCheck, 
  Layers, 
  FolderGit2, 
  Check, 
  Copy, 
  ChevronRight, 
  Search, 
  Calendar, 
  Pause, 
  FileCode, 
  Filter, 
  Zap, 
  Eye, 
  RefreshCw,
  Tag,
  Code,
  Users,
  Activity,
  Download,
  Flame,
  GitBranch,
  GitCommit
} from 'lucide-react';

export interface AnsiblePlaybook {
  id: string;
  name: string;
  filename: string;
  category: 'security' | 'deployment' | 'maintenance' | 'networking' | 'database';
  description: string;
  defaultInventory: string;
  tags: string[];
  tasksCount: number;
  estimatedDuration: string;
  content: string;
}

export interface AnsibleJobRun {
  id: string;
  playbookName: string;
  playbookFile: string;
  targetGroup: string;
  status: 'running' | 'success' | 'failed' | 'dry_run';
  startedAt: string;
  duration: string;
  triggeredBy: string;
  mode: 'run' | 'check';
  forks: number;
  stats: {
    totalHosts: number;
    ok: number;
    changed: number;
    unreachable: number;
    failed: number;
    skipped: number;
  };
  tasks: {
    name: string;
    status: 'ok' | 'changed' | 'failed' | 'skipped' | 'running' | 'pending';
    duration?: string;
    hostsResult: {
      hostname: string;
      status: 'ok' | 'changed' | 'failed' | 'skipped';
      msg?: string;
    }[];
  }[];
  rawLogs: string[];
}

export interface ScheduledPlaybook {
  id: string;
  title: string;
  playbook: string;
  schedule: string;
  cronExpr: string;
  targetFleet: string;
  status: 'active' | 'paused';
  lastRun: string;
  nextRun: string;
  lastRunStatus: 'success' | 'failed';
}

export const PLAYBOOK_CATALOG: AnsiblePlaybook[] = [
  {
    id: 'pb-sec-harden',
    name: 'CIS Linux & K8s Node Hardening',
    filename: 'site-k8s-hardening.yml',
    category: 'security',
    description: 'Enforces CIS Level 2 benchmark, sysctl TCP tuning, disables root SSH, and locks down PAM policies.',
    defaultInventory: 'k8s_workers',
    tags: ['security', 'cis', 'sysctl', 'ssh'],
    tasksCount: 6,
    estimatedDuration: '45s',
    content: `---
- name: Production Fleet Baseline Security Hardening
  hosts: "{{ target_hosts | default('all') }}"
  become: yes
  gather_facts: yes
  vars:
    ssh_port: 22
    permit_root_login: "no"
    sysctl_hardening:
      net.ipv4.ip_forward: 1
      net.ipv4.tcp_max_syn_backlog: 4096
      net.core.somaxconn: 32768
      fs.file-max: 2097152

  tasks:
    - name: Ensure CIS benchmark sysctl parameters
      ansible.posix.sysctl:
        name: "{{ item.key }}"
        value: "{{ item.value }}"
        state: present
        reload: yes
      loop: "{{ sysctl_hardening | dict2items }}"

    - name: Enforce SSH Daemon hardened configuration
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "^#?PermitRootLogin"
        line: "PermitRootLogin {{ permit_root_login }}"
        state: present
      notify: Restart sshd

    - name: Verify UFW firewall default incoming deny policy
      community.general.ufw:
        state: enabled
        policy: deny
        direction: incoming

    - name: Enable kernel auditd daemon
      ansible.builtin.service:
        name: auditd
        state: started
        enabled: yes

  handlers:
    - name: Restart sshd
      ansible.builtin.service:
        name: sshd
        state: restarted`
  },
  {
    id: 'pb-nginx-reload',
    name: 'Nginx Zero-Downtime Rolling Reload & SSL Sync',
    filename: 'nginx-zero-downtime-reload.yml',
    category: 'deployment',
    description: 'Validates nginx configuration syntax across gateway hosts, syncs Let\'s Encrypt certificates, and executes atomic reload.',
    defaultInventory: 'webservers',
    tags: ['nginx', 'ssl', 'gateway', 'reload'],
    tasksCount: 5,
    estimatedDuration: '25s',
    content: `---
- name: Nginx Rolling Reload & TLS Verification
  hosts: webservers
  become: yes
  serial: 1
  tasks:
    - name: Validate Nginx configuration syntax
      ansible.builtin.command: nginx -t
      register: nginx_test
      changed_when: false

    - name: Synchronize TLS wildcard certificates
      ansible.builtin.copy:
        src: /etc/vault/certs/wildcard.crt
        dest: /etc/ssl/certs/app.crt
        owner: root
        group: root
        mode: '0644'

    - name: Reload Nginx with zero dropped connections
      ansible.builtin.service:
        name: nginx
        state: reloaded

    - name: Healthcheck gateway HTTP 200 OK endpoint
      ansible.builtin.uri:
        url: "http://127.0.0.1/healthz"
        status_code: 200
        timeout: 5`
  },
  {
    id: 'pb-docker-runtime',
    name: 'Containerd & CRI-O Runtime Provisioner',
    filename: 'setup-container-runtime.yml',
    category: 'maintenance',
    description: 'Installs and configures containerd v1.7+, applies CNI network plugins, and sets systemd cgroup drivers.',
    defaultInventory: 'k8s_workers',
    tags: ['containerd', 'cgroups', 'cni', 'k8s'],
    tasksCount: 7,
    estimatedDuration: '1m 20s',
    content: `---
- name: Setup Container Runtime Engine
  hosts: k8s_workers
  become: yes
  tasks:
    - name: Load required kernel modules for overlay & br_netfilter
      community.general.modprobe:
        name: "{{ item }}"
        state: present
      loop: [overlay, br_netfilter]

    - name: Configure containerd systemd cgroup driver
      ansible.builtin.template:
        src: templates/containerd-config.toml.j2
        dest: /etc/containerd/config.toml
      notify: Restart containerd

    - name: Ensure Containerd service is running & enabled
      ansible.builtin.service:
        name: containerd
        state: started
        enabled: yes`
  },
  {
    id: 'pb-db-vacuum',
    name: 'PostgreSQL DB Maintenance & Logical Backup',
    filename: 'postgres-maintenance-backup.yml',
    category: 'database',
    description: 'Executes vacuum analyze on high-traffic tables, exports encrypted logical pg_dump to object store.',
    defaultInventory: 'db_primary',
    tags: ['postgres', 'backup', 'vacuum', 'dba'],
    tasksCount: 4,
    estimatedDuration: '2m 10s',
    content: `---
- name: PostgreSQL Database Maintenance & Automated Dump
  hosts: db_primary
  become: yes
  become_user: postgres
  tasks:
    - name: Run VACUUM ANALYZE on active tables
      postgresql_query:
        db: app_production
        query: "VACUUM (ANALYZE, VERBOSE);"

    - name: Perform compressed PostgreSQL logical backup
      postgresql_db:
        name: app_production
        state: dump
        target: "/var/backups/pg_dump_{{ ansible_date_time.date }}.sql.gz"`
  },
  {
    id: 'pb-patch-os',
    name: 'Fleet Security Patching & Kernel Livepatch',
    filename: 'fleet-os-security-patch.yml',
    category: 'maintenance',
    description: 'Applies critical CVE security updates, cleans up orphaned packages, and verifies Canonical Livepatch status.',
    defaultInventory: 'all',
    tags: ['patching', 'apt', 'security', 'cve'],
    tasksCount: 5,
    estimatedDuration: '1m 45s',
    content: `---
- name: Apply Critical OS Security Updates
  hosts: all
  become: yes
  tasks:
    - name: Update apt repository cache
      ansible.builtin.apt:
        update_cache: yes
        cache_valid_time: 3600

    - name: Upgrade only security-related packages
      ansible.builtin.apt:
        upgrade: dist
        only_upgrade: yes`
  }
];

export const INITIAL_SCHEDULED_JOBS: ScheduledPlaybook[] = [
  {
    id: 'sched-1',
    title: 'Daily Fleet CIS Hardening Audit',
    playbook: 'site-k8s-hardening.yml',
    schedule: 'Daily at 02:00 UTC',
    cronExpr: '0 2 * * *',
    targetFleet: 'k8s_workers, webservers',
    status: 'active',
    lastRun: 'Today, 02:00 UTC',
    nextRun: 'Tomorrow, 02:00 UTC',
    lastRunStatus: 'success'
  },
  {
    id: 'sched-2',
    title: 'Weekly OS Security Patching',
    playbook: 'fleet-os-security-patch.yml',
    schedule: 'Sundays at 04:00 UTC',
    cronExpr: '0 4 * * 0',
    targetFleet: 'all',
    status: 'active',
    lastRun: '6 days ago',
    nextRun: 'Tomorrow, 04:00 UTC',
    lastRunStatus: 'success'
  },
  {
    id: 'sched-3',
    title: 'PostgreSQL Nightly Vacuum & S3 Sync',
    playbook: 'postgres-maintenance-backup.yml',
    schedule: 'Daily at 03:30 UTC',
    cronExpr: '30 3 * * *',
    targetFleet: 'db_primary',
    status: 'active',
    lastRun: 'Today, 03:30 UTC',
    nextRun: 'Tomorrow, 03:30 UTC',
    lastRunStatus: 'success'
  }
];

export const INITIAL_JOB_RUNS: AnsibleJobRun[] = [
  {
    id: 'JOB-8941',
    playbookName: 'CIS Linux & K8s Node Hardening',
    playbookFile: 'site-k8s-hardening.yml',
    targetGroup: 'k8s_workers',
    status: 'success',
    startedAt: '15 mins ago',
    duration: '42s',
    triggeredBy: 'DevOps Automation CI',
    mode: 'run',
    forks: 10,
    stats: {
      totalHosts: 5,
      ok: 24,
      changed: 4,
      unreachable: 0,
      failed: 0,
      skipped: 2
    },
    tasks: [
      {
        name: 'Gathering Facts',
        status: 'ok',
        duration: '3.2s',
        hostsResult: [
          { hostname: 'k8s-prod-worker-us-east-1a', status: 'ok' },
          { hostname: 'k8s-prod-worker-us-east-1b', status: 'ok' },
          { hostname: 'gke-prod-app-pool-01', status: 'ok' },
          { hostname: 'stage-api-gateway-01', status: 'ok' },
          { hostname: 'edge-gateway-eu-central', status: 'ok' }
        ]
      },
      {
        name: 'Ensure CIS benchmark sysctl parameters',
        status: 'changed',
        duration: '8.4s',
        hostsResult: [
          { hostname: 'k8s-prod-worker-us-east-1a', status: 'ok' },
          { hostname: 'k8s-prod-worker-us-east-1b', status: 'changed', msg: 'net.ipv4.tcp_max_syn_backlog set to 4096' },
          { hostname: 'gke-prod-app-pool-01', status: 'ok' },
          { hostname: 'stage-api-gateway-01', status: 'ok' },
          { hostname: 'edge-gateway-eu-central', status: 'changed', msg: 'fs.file-max tuned' }
        ]
      },
      {
        name: 'Enforce SSH Daemon hardened configuration',
        status: 'changed',
        duration: '4.1s',
        hostsResult: [
          { hostname: 'k8s-prod-worker-us-east-1a', status: 'ok' },
          { hostname: 'k8s-prod-worker-us-east-1b', status: 'changed', msg: 'PermitRootLogin set to no' },
          { hostname: 'gke-prod-app-pool-01', status: 'ok' },
          { hostname: 'stage-api-gateway-01', status: 'ok' },
          { hostname: 'edge-gateway-eu-central', status: 'ok' }
        ]
      },
      {
        name: 'Verify UFW firewall default incoming deny policy',
        status: 'ok',
        duration: '5.6s',
        hostsResult: [
          { hostname: 'k8s-prod-worker-us-east-1a', status: 'ok' },
          { hostname: 'k8s-prod-worker-us-east-1b', status: 'ok' },
          { hostname: 'gke-prod-app-pool-01', status: 'ok' },
          { hostname: 'stage-api-gateway-01', status: 'ok' },
          { hostname: 'edge-gateway-eu-central', status: 'ok' }
        ]
      }
    ],
    rawLogs: [
      'PLAY [Production Fleet Baseline Security Hardening] ****************************',
      '',
      'TASK [Gathering Facts] *********************************************************',
      'ok: [k8s-prod-worker-us-east-1a]',
      'ok: [k8s-prod-worker-us-east-1b]',
      'ok: [gke-prod-app-pool-01]',
      'ok: [stage-api-gateway-01]',
      'ok: [edge-gateway-eu-central]',
      '',
      'TASK [Ensure CIS benchmark sysctl parameters] **********************************',
      'ok: [k8s-prod-worker-us-east-1a]',
      'changed: [k8s-prod-worker-us-east-1b]',
      'ok: [gke-prod-app-pool-01]',
      'ok: [stage-api-gateway-01]',
      'changed: [edge-gateway-eu-central]',
      '',
      'TASK [Enforce SSH Daemon hardened configuration] *******************************',
      'ok: [k8s-prod-worker-us-east-1a]',
      'changed: [k8s-prod-worker-us-east-1b]',
      'ok: [gke-prod-app-pool-01]',
      'ok: [stage-api-gateway-01]',
      'ok: [edge-gateway-eu-central]',
      '',
      'PLAY RECAP *********************************************************************',
      'k8s-prod-worker-us-east-1a : ok=4  changed=0  unreachable=0  failed=0  skipped=0',
      'k8s-prod-worker-us-east-1b : ok=2  changed=2  unreachable=0  failed=0  skipped=0',
      'gke-prod-app-pool-01       : ok=4  changed=0  unreachable=0  failed=0  skipped=0',
      'stage-api-gateway-01       : ok=4  changed=0  unreachable=0  failed=0  skipped=0',
      'edge-gateway-eu-central    : ok=3  changed=1  unreachable=0  failed=0  skipped=0'
    ]
  }
];

export default function AnsibleOrchestrator() {
  const [activeView, setActiveView] = useState<'launcher' | 'live-job' | 'history' | 'schedules' | 'inventory-cmd'>('launcher');
  const [playbooks] = useState<AnsiblePlaybook[]>(PLAYBOOK_CATALOG);
  const [selectedPlaybook, setSelectedPlaybook] = useState<AnsiblePlaybook>(PLAYBOOK_CATALOG[0]);
  const [selectedInventory, setSelectedInventory] = useState<string>('k8s_workers');
  const [executionMode, setExecutionMode] = useState<'run' | 'check'>('run');
  const [concurrencyForks, setConcurrencyForks] = useState<number>(10);
  const [extraVars, setExtraVars] = useState<string>('{\n  "permit_root_login": "no",\n  "sysctl_apply_immediate": true\n}');
  const [tagsFilter, setTagsFilter] = useState<string>('');
  const [becomeSudo, setBecomeSudo] = useState<boolean>(true);
  const [verbosity, setVerbosity] = useState<string>('-v');
  
  // Job execution state
  const [jobRuns, setJobRuns] = useState<AnsibleJobRun[]>(INITIAL_JOB_RUNS);
  const [activeJob, setActiveJob] = useState<AnsibleJobRun | null>(INITIAL_JOB_RUNS[0]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [liveTaskIndex, setLiveTaskIndex] = useState<number>(0);
  const [copiedLog, setCopiedLog] = useState<boolean>(false);

  // Scheduled Jobs state
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledPlaybook[]>(INITIAL_SCHEDULED_JOBS);

  // Ad-hoc command state
  const [adHocModule, setAdHocModule] = useState<string>('ping');
  const [adHocArgs, setAdHocArgs] = useState<string>('');
  const [adHocTarget, setAdHocTarget] = useState<string>('all');
  const [adHocOutput, setAdHocOutput] = useState<string[]>([
    'ansible all -m ping -u ubuntu --become',
    'k8s-prod-worker-us-east-1a | SUCCESS => { "ansible_facts": { "discovered_interpreter_python": "/usr/bin/python3" }, "changed": false, "ping": "pong" }',
    'k8s-prod-worker-us-east-1b | SUCCESS => { "ansible_facts": { "discovered_interpreter_python": "/usr/bin/python3" }, "changed": false, "ping": "pong" }',
    'gke-prod-app-pool-01       | SUCCESS => { "ansible_facts": { "discovered_interpreter_python": "/usr/bin/python3" }, "changed": false, "ping": "pong" }',
    'stage-api-gateway-01       | SUCCESS => { "ansible_facts": { "discovered_interpreter_python": "/usr/bin/python3" }, "changed": false, "ping": "pong" }',
    'edge-gateway-eu-central    | SUCCESS => { "ansible_facts": { "discovered_interpreter_python": "/usr/bin/python3" }, "changed": false, "ping": "pong" }'
  ]);
  const [isExecutingAdHoc, setIsExecutingAdHoc] = useState<boolean>(false);

  const handleLaunchPlaybook = (mode: 'run' | 'check' = 'run') => {
    setIsExecuting(true);
    const newJobId = `JOB-${Math.floor(1000 + Math.random() * 9000)}`;

    const newJob: AnsibleJobRun = {
      id: newJobId,
      playbookName: selectedPlaybook.name,
      playbookFile: selectedPlaybook.filename,
      targetGroup: selectedInventory,
      status: 'running',
      startedAt: 'Just now',
      duration: '0s',
      triggeredBy: 'DevOps Operator (Interactive Console)',
      mode: mode,
      forks: concurrencyForks,
      stats: {
        totalHosts: selectedInventory === 'all' ? 5 : selectedInventory === 'k8s_workers' ? 3 : 2,
        ok: 0,
        changed: 0,
        unreachable: 0,
        failed: 0,
        skipped: 0
      },
      tasks: [
        {
          name: 'Task 1: Gathering Host Facts & CPU/Memory Specs',
          status: 'running',
          hostsResult: [
            { hostname: 'k8s-prod-worker-us-east-1a', status: 'ok' },
            { hostname: 'k8s-prod-worker-us-east-1b', status: 'ok' },
            { hostname: 'gke-prod-app-pool-01', status: 'ok' }
          ]
        },
        {
          name: `Task 2: Applying ${selectedPlaybook.name} Core Configurations`,
          status: 'pending',
          hostsResult: [
            { hostname: 'k8s-prod-worker-us-east-1a', status: 'ok' },
            { hostname: 'k8s-prod-worker-us-east-1b', status: 'changed' },
            { hostname: 'gke-prod-app-pool-01', status: 'ok' }
          ]
        },
        {
          name: 'Task 3: Security Benchmark & PAM Verification',
          status: 'pending',
          hostsResult: [
            { hostname: 'k8s-prod-worker-us-east-1a', status: 'ok' },
            { hostname: 'k8s-prod-worker-us-east-1b', status: 'changed' },
            { hostname: 'gke-prod-app-pool-01', status: 'ok' }
          ]
        },
        {
          name: 'Task 4: Service Handlers & Daemon Reload',
          status: 'pending',
          hostsResult: [
            { hostname: 'k8s-prod-worker-us-east-1a', status: 'ok' },
            { hostname: 'k8s-prod-worker-us-east-1b', status: 'ok' },
            { hostname: 'gke-prod-app-pool-01', status: 'ok' }
          ]
        }
      ],
      rawLogs: [
        `[${new Date().toLocaleTimeString()}] ansible-playbook -i inventories/production playbooks/${selectedPlaybook.filename} --limit ${selectedInventory} ${mode === 'check' ? '--check' : ''} --forks ${concurrencyForks}`,
        'PLAY [' + selectedPlaybook.name + '] ***************************************************',
        '',
        'TASK [Gathering Facts] *********************************************************',
        'ok: [k8s-prod-worker-us-east-1a]',
        'ok: [k8s-prod-worker-us-east-1b]',
        'ok: [gke-prod-app-pool-01]'
      ]
    };

    setActiveJob(newJob);
    setJobRuns(prev => [newJob, ...prev]);
    setActiveView('live-job');

    // Simulate task progression
    setTimeout(() => {
      newJob.tasks[0].status = 'ok';
      newJob.tasks[1].status = 'running';
      newJob.rawLogs.push(
        '',
        `TASK [Applying ${selectedPlaybook.name} Core Configurations] **************************`,
        'ok: [k8s-prod-worker-us-east-1a]',
        mode === 'check' ? 'changed (DRY-RUN): [k8s-prod-worker-us-east-1b]' : 'changed: [k8s-prod-worker-us-east-1b]',
        'ok: [gke-prod-app-pool-01]'
      );
      setActiveJob({ ...newJob });
    }, 1200);

    setTimeout(() => {
      newJob.tasks[1].status = 'changed';
      newJob.tasks[2].status = 'running';
      newJob.rawLogs.push(
        '',
        'TASK [Security Benchmark & PAM Verification] **********************************',
        'ok: [k8s-prod-worker-us-east-1a]',
        'ok: [k8s-prod-worker-us-east-1b]',
        'ok: [gke-prod-app-pool-01]'
      );
      setActiveJob({ ...newJob });
    }, 2400);

    setTimeout(() => {
      newJob.tasks[2].status = 'ok';
      newJob.tasks[3].status = 'ok';
      newJob.status = mode === 'check' ? 'dry_run' : 'success';
      newJob.duration = '18s';
      newJob.stats = {
        totalHosts: 3,
        ok: 10,
        changed: mode === 'check' ? 0 : 2,
        unreachable: 0,
        failed: 0,
        skipped: 0
      };
      newJob.rawLogs.push(
        '',
        'PLAY RECAP *********************************************************************',
        `k8s-prod-worker-us-east-1a : ok=4  changed=0  unreachable=0  failed=0  skipped=0`,
        `k8s-prod-worker-us-east-1b : ok=2  changed=${mode === 'check' ? 0 : 2}  unreachable=0  failed=0  skipped=0`,
        `gke-prod-app-pool-01       : ok=4  changed=0  unreachable=0  failed=0  skipped=0`,
        '',
        `[${new Date().toLocaleTimeString()}] Playbook execution completed successfully.`
      );
      setActiveJob({ ...newJob });
      setIsExecuting(false);
      setJobRuns(prev => prev.map(j => j.id === newJob.id ? { ...newJob } : j));
    }, 3800);
  };

  const handleRunAdHoc = () => {
    setIsExecutingAdHoc(true);
    const cmd = `ansible ${adHocTarget} -m ${adHocModule} ${adHocArgs ? `-a "${adHocArgs}"` : ''} --become`;
    
    setTimeout(() => {
      setIsExecutingAdHoc(false);
      let outputLines = [
        cmd,
        `k8s-prod-worker-us-east-1a | SUCCESS => { "changed": ${adHocModule === 'shell' ? 'true' : 'false'}, "rc": 0, "stdout": "Ad-hoc task execution completed on target host." }`,
        `k8s-prod-worker-us-east-1b | SUCCESS => { "changed": ${adHocModule === 'shell' ? 'true' : 'false'}, "rc": 0, "stdout": "Ad-hoc task execution completed on target host." }`,
        `gke-prod-app-pool-01       | SUCCESS => { "changed": ${adHocModule === 'shell' ? 'true' : 'false'}, "rc": 0, "stdout": "Ad-hoc task execution completed on target host." }`
      ];
      setAdHocOutput(outputLines);
    }, 1100);
  };

  const toggleScheduleActive = (id: string) => {
    setScheduledJobs(prev => prev.map(s => s.id === id ? {
      ...s,
      status: s.status === 'active' ? 'paused' : 'active'
    } : s));
  };

  return (
    <div className="space-y-6">
      {/* Orchestrator Sub-Nav Header */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
              <Terminal size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-950/80 border border-indigo-800 px-2 py-0.5 rounded-md">
                  Ansible Automation Engine v2.16
                </span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Cluster Engine Online
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white mt-1">Playbook Orchestrator & Execution Hub</h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Centralized orchestration for multi-tier Ansible playbooks, speculative dry-runs, fleet-wide scheduling & ad-hoc commands.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleLaunchPlaybook('check')}
              disabled={isExecuting}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-2 disabled:opacity-50"
            >
              <Eye size={14} className="text-indigo-400" />
              <span>Dry Run (--check)</span>
            </button>
            <button
              onClick={() => handleLaunchPlaybook('run')}
              disabled={isExecuting}
              className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2 disabled:opacity-50"
            >
              <Play size={14} />
              <span>{isExecuting ? 'Executing Playbook...' : 'Launch Playbook'}</span>
            </button>
          </div>
        </div>

        {/* Quick Orchestrator Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-800/80 overflow-x-auto custom-scrollbar">
          {[
            { id: 'launcher', label: 'Playbook Launcher', icon: <Play size={13} /> },
            { id: 'live-job', label: 'Active Job Monitor', icon: <Activity size={13} />, badge: isExecuting ? 'RUNNING' : undefined },
            { id: 'history', label: 'Execution Audit Logs', icon: <Clock size={13} />, count: jobRuns.length },
            { id: 'schedules', label: 'Scheduled Automations', icon: <Calendar size={13} />, count: scheduledJobs.length },
            { id: 'inventory-cmd', label: 'Ad-Hoc Ansible CLI', icon: <Terminal size={13} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                activeView === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="text-[9px] px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black rounded-full animate-pulse">
                  {tab.badge}
                </span>
              )}
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeView === tab.id ? 'bg-indigo-700 text-white' : 'bg-slate-700 text-slate-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tab Content */}
      <AnimatePresence mode="wait">
        {/* 1. Playbook Launcher View */}
        {activeView === 'launcher' && (
          <motion.div
            key="launcher-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Left: Playbook Catalog Selection */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">1. Select Target Playbook</h3>
                  <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {playbooks.length} Available
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                  {playbooks.map((pb) => (
                    <div
                      key={pb.id}
                      onClick={() => {
                        setSelectedPlaybook(pb);
                        setSelectedInventory(pb.defaultInventory);
                      }}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedPlaybook.id === pb.id
                          ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-400/20 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900">{pb.name}</span>
                        <span className={`text-[9px] font-bold uppercase font-mono px-2 py-0.5 rounded ${
                          pb.category === 'security' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                          pb.category === 'deployment' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          pb.category === 'database' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {pb.category}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {pb.description}
                      </p>

                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100/80 text-[10px] text-slate-400 font-mono">
                        <span className="text-indigo-600 font-semibold">{pb.filename}</span>
                        <span>{pb.tasksCount} tasks &bull; ~{pb.estimatedDuration}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Target Inventory, Execution Variables & Launch Parameters */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">2. Execution Configuration &amp; Target Fleet</h3>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-bold">
                        <FolderGit2 size={12} className="text-indigo-600" />
                        GitHub: enterprise/ansible-playbooks @ main
                      </span>
                      <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                        e4b7c21
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Inventory Group */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">Target Inventory / Host Pattern</label>
                      <select
                        value={selectedInventory}
                        onChange={(e) => setSelectedInventory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="k8s_workers">k8s_workers (3 nodes: us-east-1a, us-east-1b, gke-pool-01)</option>
                        <option value="webservers">webservers (2 nodes: stage-api-gateway, edge-gateway)</option>
                        <option value="db_primary">db_primary (1 node: postgres-master-ha)</option>
                        <option value="all">all (All 5 Managed Fleet Nodes)</option>
                        <option value="edge_nodes">edge_nodes (1 node: edge-gateway-eu-central)</option>
                      </select>
                    </div>

                    {/* Concurrency / Forks */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">Concurrency (Ansible Forks)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="1"
                          max="25"
                          value={concurrencyForks}
                          onChange={(e) => setConcurrencyForks(parseInt(e.target.value))}
                          className="flex-1 accent-indigo-600"
                        />
                        <span className="font-mono text-xs font-bold bg-slate-100 px-2.5 py-1 rounded-lg text-slate-800 border border-slate-200">
                          {concurrencyForks} forks
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Flags & Controls */}
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 mb-3">Runtime Flags & Execution Settings</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/80 transition-colors">
                      <input
                        type="checkbox"
                        checked={becomeSudo}
                        onChange={(e) => setBecomeSudo(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-bold text-slate-700">--become (sudo)</span>
                    </label>

                    <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/80 transition-colors">
                      <input
                        type="radio"
                        name="mode_radio"
                        checked={executionMode === 'run'}
                        onChange={() => setExecutionMode('run')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-bold text-slate-700">Live Apply</span>
                    </label>

                    <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/80 transition-colors">
                      <input
                        type="radio"
                        name="mode_radio"
                        checked={executionMode === 'check'}
                        onChange={() => setExecutionMode('check')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-bold text-slate-700">--check (Dry-Run)</span>
                    </label>

                    <div>
                      <select
                        value={verbosity}
                        onChange={(e) => setVerbosity(e.target.value)}
                        className="w-full h-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
                      >
                        <option value="-v">-v (Standard)</option>
                        <option value="-vv">-vv (Verbose)</option>
                        <option value="-vvv">-vvv (Debug)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Extra Variables (JSON/YAML) */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">Extra Runtime Variables (`--extra-vars` JSON)</label>
                    <span className="text-[10px] font-mono text-slate-400">Injected dynamically</span>
                  </div>
                  <textarea
                    value={extraVars}
                    onChange={(e) => setExtraVars(e.target.value)}
                    rows={4}
                    className="w-full p-3 font-mono text-xs bg-slate-950 text-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>

                {/* Action trigger footer */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-500 font-mono">
                    Target: <strong className="text-slate-900">{selectedInventory}</strong> &bull; Playbook: <strong className="text-indigo-600">{selectedPlaybook.filename}</strong>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleLaunchPlaybook('check')}
                      disabled={isExecuting}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200"
                    >
                      Speculative Check
                    </button>
                    <button
                      onClick={() => handleLaunchPlaybook(executionMode)}
                      disabled={isExecuting}
                      className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
                    >
                      <Play size={14} />
                      <span>{isExecuting ? 'Starting Engine...' : 'Run Playbook Now'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 2. Active Job Monitor View */}
        {activeView === 'live-job' && activeJob && (
          <motion.div
            key="live-job-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            {/* Job Summary Banner */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-black text-sm text-slate-900">{activeJob.id}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider font-mono ${
                      activeJob.status === 'running' ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse' :
                      activeJob.status === 'dry_run' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                      activeJob.status === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {activeJob.status === 'running' ? 'IN PROGRESS' : activeJob.status.toUpperCase()}
                    </span>
                    {activeJob.mode === 'check' && (
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-bold">
                        DRY-RUN (--check)
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-slate-900">{activeJob.playbookName}</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Playbook: {activeJob.playbookFile} &bull; Target: {activeJob.targetGroup} &bull; Triggered by: {activeJob.triggeredBy}
                  </p>
                </div>

                {/* Recap Counter Matrix */}
                <div className="flex items-center gap-2">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center min-w-[70px]">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Total</div>
                    <div className="text-base font-black text-slate-800 font-mono">{activeJob.stats.totalHosts}</div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-center min-w-[70px]">
                    <div className="text-[10px] uppercase font-bold text-emerald-600">OK</div>
                    <div className="text-base font-black text-emerald-700 font-mono">{activeJob.stats.ok}</div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-center min-w-[70px]">
                    <div className="text-[10px] uppercase font-bold text-amber-600">Changed</div>
                    <div className="text-base font-black text-amber-700 font-mono">{activeJob.stats.changed}</div>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-center min-w-[70px]">
                    <div className="text-[10px] uppercase font-bold text-rose-600">Failed</div>
                    <div className="text-base font-black text-rose-700 font-mono">{activeJob.stats.failed}</div>
                  </div>
                </div>
              </div>

              {/* Task Breakdown Stepper */}
              <div className="pt-6 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Task Execution Flow</h4>
                
                <div className="space-y-2.5">
                  {activeJob.tasks.map((task, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border transition-all ${
                        task.status === 'running' ? 'bg-amber-50/80 border-amber-300' :
                        task.status === 'changed' ? 'bg-indigo-50/60 border-indigo-200' :
                        task.status === 'ok' ? 'bg-slate-50 border-slate-200' :
                        'bg-slate-50/50 border-slate-100 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {task.status === 'running' ? (
                            <RotateCw size={16} className="text-amber-600 animate-spin" />
                          ) : task.status === 'changed' ? (
                            <CheckCircle2 size={16} className="text-indigo-600" />
                          ) : task.status === 'ok' ? (
                            <CheckCircle2 size={16} className="text-emerald-600" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                          )}
                          <span className="font-bold text-xs text-slate-900">{task.name}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                            task.status === 'running' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                            task.status === 'changed' ? 'bg-indigo-100 text-indigo-800' :
                            task.status === 'ok' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-slate-200 text-slate-600'
                          }`}>
                            {task.status}
                          </span>
                          {task.duration && (
                            <span className="text-[10px] font-mono text-slate-400">{task.duration}</span>
                          )}
                        </div>
                      </div>

                      {/* Host results list */}
                      {task.status !== 'pending' && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex flex-wrap gap-2">
                          {task.hostsResult.map((hr, hIdx) => (
                            <span
                              key={hIdx}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium flex items-center gap-1 ${
                                hr.status === 'changed' ? 'bg-amber-100 text-amber-900' :
                                hr.status === 'ok' ? 'bg-emerald-100 text-emerald-900' :
                                'bg-slate-100 text-slate-700'
                              }`}
                            >
                              <span>{hr.hostname}:</span>
                              <strong>{hr.status}</strong>
                              {hr.msg && <span className="opacity-75">({hr.msg})</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Raw Terminal Output */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-slate-300 font-mono text-xs font-bold">
                  <Terminal size={14} className="text-indigo-400" />
                  <span>Real-Time Ansible CLI Stdout</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(activeJob.rawLogs.join('\n'));
                    setCopiedLog(true);
                    setTimeout(() => setCopiedLog(false), 2000);
                  }}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono font-bold transition-colors flex items-center gap-1.5"
                >
                  {copiedLog ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedLog ? 'Copied Stdout' : 'Copy Stdout'}</span>
                </button>
              </div>

              <div className="p-4 bg-slate-900/90 rounded-xl font-mono text-xs text-slate-300 max-h-80 overflow-y-auto custom-scrollbar space-y-1">
                {activeJob.rawLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`leading-relaxed ${
                      log.includes('PLAY RECAP') ? 'text-indigo-300 font-bold border-t border-slate-800 pt-2' :
                      log.includes('changed:') ? 'text-amber-300 font-semibold' :
                      log.includes('ok:') ? 'text-emerald-400' :
                      log.includes('failed:') ? 'text-rose-400 font-bold' :
                      log.startsWith('PLAY [') || log.startsWith('TASK [') ? 'text-indigo-400 font-bold' :
                      'text-slate-300'
                    }`}
                  >
                    {log || '\u00A0'}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* 3. Execution Audit Logs & History */}
        {activeView === 'history' && (
          <motion.div
            key="history-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Execution History & Audit Trail</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Historical playbook run records, node-level recaps, and duration statistics.</p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">{jobRuns.length} Total Executions</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Job ID & Playbook</th>
                    <th className="py-3 px-4">Target Fleet</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Recap (OK / Changed / Failed)</th>
                    <th className="py-3 px-4">Triggered By</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobRuns.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{job.playbookName}</div>
                        <div className="text-[11px] font-mono text-indigo-600">{job.id} &bull; {job.playbookFile}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                        {job.targetGroup}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                          {job.mode === 'check' ? 'DRY-RUN' : 'LIVE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          job.status === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          job.status === 'dry_run' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          <CheckCircle2 size={12} />
                          {job.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <span className="text-emerald-600 font-bold">{job.stats.ok} ok</span> /{' '}
                        <span className="text-amber-600 font-bold">{job.stats.changed} changed</span> /{' '}
                        <span className="text-rose-600 font-bold">{job.stats.failed} fail</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        <div>{job.triggeredBy}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{job.startedAt} ({job.duration})</div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setActiveJob(job);
                            setActiveView('live-job');
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                        >
                          View Logs
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* 4. Scheduled Automations View */}
        {activeView === 'schedules' && (
          <motion.div
            key="schedules-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <Calendar size={18} className="text-indigo-600" />
                    Automated Recurring Playbook Schedules
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Cron-based automated orchestration for continuous drift remediation, nightly database tasks & updates.
                  </p>
                </div>

                <button
                  onClick={() => {
                    const title = prompt('Enter schedule title:');
                    if (title) {
                      const newSched: ScheduledPlaybook = {
                        id: `sched-${Date.now()}`,
                        title: title,
                        playbook: 'site-k8s-hardening.yml',
                        schedule: 'Hourly at minute 0',
                        cronExpr: '0 * * * *',
                        targetFleet: 'all',
                        status: 'active',
                        lastRun: 'Never',
                        nextRun: 'In 45 minutes',
                        lastRunStatus: 'success'
                      };
                      setScheduledJobs(prev => [newSched, ...prev]);
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
                >
                  <Calendar size={14} />
                  <span>Create Automation Schedule</span>
                </button>
              </div>

              {/* Schedule list */}
              <div className="divide-y divide-slate-100 mt-2">
                {scheduledJobs.map((sched) => (
                  <div key={sched.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{sched.title}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold">
                          {sched.cronExpr}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          sched.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {sched.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Playbook: <code className="text-indigo-600 font-mono">{sched.playbook}</code> &bull; Target: <span className="font-mono font-bold">{sched.targetFleet}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Schedule: {sched.schedule} &bull; Next run: {sched.nextRun}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleScheduleActive(sched.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                          sched.status === 'active' 
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {sched.status === 'active' ? 'Pause' : 'Activate'}
                      </button>

                      <button
                        onClick={() => {
                          handleLaunchPlaybook('run');
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                      >
                        <Play size={12} />
                        <span>Run Now</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* 5. Ad-Hoc Ansible CLI */}
        {activeView === 'inventory-cmd' && (
          <motion.div
            key="adhoc-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Terminal size={18} className="text-indigo-600" />
                  Ansible Ad-Hoc Command Dispatcher
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Execute quick single-task modules (e.g. ping, shell, command, setup, service) across specified host groups without writing a playbook.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Target Pattern</label>
                  <input
                    type="text"
                    value={adHocTarget}
                    onChange={(e) => setAdHocTarget(e.target.value)}
                    placeholder="all, webservers, db_primary..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Module (`-m`)</label>
                  <select
                    value={adHocModule}
                    onChange={(e) => setAdHocModule(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  >
                    <option value="ping">ping (Verify SSH & Python connectivity)</option>
                    <option value="shell">shell (Execute arbitrary bash command)</option>
                    <option value="command">command (Execute binary without shell interpolation)</option>
                    <option value="setup">setup (Dump Ansible host facts & hardware specs)</option>
                    <option value="service">service (Query or restart systemd daemon)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Arguments (`-a`)</label>
                  <input
                    type="text"
                    value={adHocArgs}
                    onChange={(e) => setAdHocArgs(e.target.value)}
                    placeholder={adHocModule === 'shell' ? 'uptime, df -h, free -m' : 'name=nginx state=started'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleRunAdHoc}
                  disabled={isExecutingAdHoc}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
                >
                  <Play size={14} />
                  <span>{isExecutingAdHoc ? 'Dispatching Ad-hoc Command...' : 'Execute Ad-Hoc Task'}</span>
                </button>
              </div>

              {/* Output */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                {adHocOutput.map((line, idx) => (
                  <div
                    key={idx}
                    className={line.includes('SUCCESS') ? 'text-emerald-400' : line.startsWith('ansible ') ? 'text-indigo-400 font-bold' : 'text-slate-300'}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
