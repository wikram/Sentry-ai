/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChevronRight, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { Incident } from '../types';
import { formatShortDateTime } from '../lib/dateUtils';

export function NavItem({ 
  icon, 
  label, 
  active, 
  onClick,
  trailing,
  badge,
  isParent,
  expanded
}: { 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean; 
  onClick: () => void;
  trailing?: React.ReactNode;
  badge?: string | number;
  isParent?: boolean;
  expanded?: boolean;
}) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
        active 
          ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' 
          : isParent && expanded
            ? 'bg-slate-100/80 text-slate-900 font-bold'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      }`}
    >
      <span className={`shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'}`}>{icon}</span>
      <span className="truncate text-left flex-1">{label}</span>
      {badge && (
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold ${
          active ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-600'
        }`}>
          {badge}
        </span>
      )}
      {trailing}
      {active && !trailing && <motion.div layoutId="nav-dot" className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />}
    </button>
  );
}

export function SubNavItem({
  icon,
  label,
  active,
  onClick,
  badge
}: {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  badge?: string | number;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 pl-9 pr-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 group relative ${
        active
          ? 'bg-blue-50 text-blue-700 font-bold'
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
      }`}
    >
      {active && (
        <motion.div 
          layoutId="subnav-active-pill" 
          className="absolute left-4 w-1 h-3.5 rounded-full bg-blue-600" 
        />
      )}
      {icon && <span className={`shrink-0 ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-700'}`}>{icon}</span>}
      <span className="truncate flex-1 text-left">{label}</span>
      {badge && (
        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
          active ? 'bg-blue-200/70 text-blue-800' : 'bg-slate-100 text-slate-500'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

export function StatCard({ label, value, sub, color }: { label: string, value: string, sub: string, color: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-600',
    red: 'text-red-600',
    green: 'text-green-600',
    slate: 'text-slate-900'
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-all group">
      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">{label}</div>
      <div className={`text-4xl font-mono font-bold tracking-tighter ${colors[color]}`}>{value}</div>
      <div className="text-[10px] text-slate-400 font-bold group-hover:text-slate-600 transition-colors uppercase tracking-tight mt-1">{sub}</div>
    </div>
  );
}

interface IncidentRowProps {
  incident: Incident;
  onClick: () => void;
}

export const IncidentRow: React.FC<IncidentRowProps> = ({ incident, onClick }) => {
  const getSeverityStyles = (s: string) => {
    switch(s) {
      case 'critical': return 'bg-red-50 text-red-600 border-red-100';
      case 'warning': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-blue-50 text-blue-600 border-blue-100';
    }
  };

  return (
    <button 
      onClick={onClick}
      className="w-full grid grid-cols-12 gap-4 items-center p-5 hover:bg-slate-50 transition-all text-left group"
    >
      <div className="col-span-2 font-mono text-[11px] text-slate-300 font-medium group-hover:text-slate-500 transition-colors">{incident.id}</div>
      <div className="col-span-4 font-bold text-sm tracking-tight text-slate-900">{incident.title}</div>
      <div className="col-span-2">
        <span className={`text-[10px] px-2.5 py-1 rounded-md border uppercase font-bold tracking-widest leading-none ${getSeverityStyles(incident.severity)}`}>
          {incident.severity}
        </span>
      </div>
      <div className="col-span-2 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
        <Clock size={12} className="text-slate-300" />
        {formatShortDateTime(incident.createdAt)}
      </div>
      <div className="col-span-2 flex justify-end">
        <div className="p-1 px-2 rounded-lg bg-transparent group-hover:bg-slate-200 transition-colors">
          <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-600" />
        </div>
      </div>
    </button>
  );
};

export function EntityItem({ label, type, hits, status }: { label: string, type: string, hits: number, status?: string }) {
  return (
    <div className="flex items-center justify-between group cursor-default">
      <div className="flex flex-col">
        <span className={`text-xs font-bold tracking-tight group-hover:text-blue-600 transition-colors ${status === 'degraded' ? 'text-amber-500' : 'text-slate-700'}`}>{label}</span>
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{type}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-slate-400 group-hover:bg-blue-400 transition-colors" style={{ width: `${Math.min(hits * 2, 100)}%` }} />
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-400">{hits}</span>
      </div>
    </div>
  );
}
