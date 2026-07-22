/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Trash2, History, Terminal, Clock, ChevronRight } from 'lucide-react';

interface HistoryItem {
  id: string;
  timestamp: string;
  input: string;
  output: string;
}

interface HistoryTabProps {
  analysisHistory: HistoryItem[];
  setAnalysisHistory: (history: HistoryItem[]) => void;
  expandedHistoryId: string | null;
  setExpandedHistoryId: (id: string | null) => void;
}

export default function HistoryTab({
  analysisHistory,
  setAnalysisHistory,
  expandedHistoryId,
  setExpandedHistoryId,
}: HistoryTabProps) {
  return (
    <motion.div 
      key="history"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-[90%] mx-auto space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Analysis History</h2>
          <p className="text-sm text-slate-500 font-medium">Review past log analysis reports and insights.</p>
        </div>
        <button 
          onClick={() => setAnalysisHistory([])}
          className="px-4 py-2 border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all"
        >
          <Trash2 size={14} /> Clear History
        </button>
      </div>

      <div className="space-y-4">
        {analysisHistory.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-20 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
              <History size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900">No History Yet</h3>
              <p className="text-sm text-slate-400">Run an analysis in the Log Analyzer to see results here.</p>
            </div>
          </div>
        ) : (
          analysisHistory.map((item) => (
            <div 
              key={item.id} 
              className={`bg-white border transition-all rounded-2xl overflow-hidden shadow-sm hover:shadow-md ${expandedHistoryId === item.id ? 'border-blue-200 ring-4 ring-blue-500/5' : 'border-slate-200'}`}
            >
              <button 
                onClick={() => setExpandedHistoryId(expandedHistoryId === item.id ? null : item.id)}
                className="w-full px-8 py-6 flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                    <Terminal size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-slate-900 tracking-tight">{item.id}</h3>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black uppercase tracking-widest border border-blue-100">
                        COMPLETED
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1.5"><Clock size={12} /> {new Date(item.timestamp).toLocaleString()}</span>
                      <span className="text-slate-200">|</span>
                      <span>{item.input.length} characters analyzed</span>
                    </div>
                  </div>
                </div>
                <div className={`p-2 rounded-lg transition-all ${expandedHistoryId === item.id ? 'bg-blue-50 text-blue-500 rotate-180' : 'bg-slate-50 text-slate-400 group-hover:text-slate-900 group-hover:bg-slate-100'}`}>
                  <ChevronRight size={20} />
                </div>
              </button>

              <AnimatePresence>
                {expandedHistoryId === item.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-8 pb-8 pt-2 grid grid-cols-2 gap-8 border-t border-slate-50">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Input Raw Logs</h4>
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(item.input); }}
                            className="text-[9px] font-bold text-blue-500 uppercase hover:underline"
                          >
                            Copy Raw
                          </button>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 font-mono text-[11px] text-slate-600 max-h-[400px] overflow-y-auto whitespace-pre custom-scrollbar">
                          {item.input}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Intelligence Report</h4>
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(item.output); }}
                            className="text-[9px] font-bold text-blue-500 uppercase hover:underline"
                          >
                            Copy Report
                          </button>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-[11px] text-blue-100/90 max-h-[400px] overflow-y-auto custom-scrollbar leading-relaxed markdown-container">
                          <ReactMarkdown>{item.output}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
