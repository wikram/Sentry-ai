/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Activity } from 'lucide-react';

export default function IntegrationsTab() {
  return (
    <motion.div 
      key="integrations"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Integrations</h2>
          <p className="text-sm text-slate-500">Configure external communication and notification channels.</p>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center flex flex-col items-center gap-4 shadow-sm">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
          <Activity size={32} />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-slate-900 tracking-tight">No Integrations Configured</h3>
          <p className="text-sm text-slate-400 max-w-xs mx-auto">Connect Slack, Jira, or custom webhooks to receive real-time incident analysis reports.</p>
        </div>
        <button className="mt-4 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-slate-900/10">
          Browse Marketplace
        </button>
      </div>
    </motion.div>
  );
}
