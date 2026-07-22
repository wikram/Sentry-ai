/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Terminal, Plus, Upload, X, ShieldCheck, Activity, Cpu } from 'lucide-react';
import { RCAAgent } from '../types';

interface LogAnalyzerTabProps {
  logStream: string;
  setLogStream: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  selectedFile: File | null;
  setSelectedFile: (f: File | null) => void;
  isFileInputMode: boolean;
  setIsFileInputMode: (v: boolean) => void;
  isAnalyzing: boolean;
  analysisResult: string;
  setAnalysisResult: (v: string) => void;
  hasActiveAgent: boolean;
  agents: RCAAgent[];
  handleAnalyzeLogs: () => void;
}

export default function LogAnalyzerTab({
  logStream,
  setLogStream,
  description,
  setDescription,
  selectedFile,
  setSelectedFile,
  isFileInputMode,
  setIsFileInputMode,
  isAnalyzing,
  analysisResult,
  setAnalysisResult,
  hasActiveAgent,
  agents,
  handleAnalyzeLogs,
}: LogAnalyzerTabProps) {
  return (
    <motion.div 
      key="log-analyzer"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Advanced Log Analyzer</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-slate-500 font-medium">Cross-reference logs across all active distributed systems.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => { setLogStream(''); setAnalysisResult(''); setDescription(''); setSelectedFile(null); setIsFileInputMode(false); }}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all"
          >
            <Terminal size={14} /> Clear Stream
          </button>
          <button 
            onClick={handleAnalyzeLogs}
            disabled={isAnalyzing || (!logStream && !selectedFile) || !hasActiveAgent}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-slate-900/10 disabled:opacity-50"
            title={agents.length === 0 ? "Please add at least one agent to proceed" : (!hasActiveAgent ? "Please activate your analysis agent to proceed" : "")}
          >
            {isAnalyzing ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={14} />} 
            Analyze Logs
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-8 h-auto">
        {/* Input Side - Aligned Right */}
        <div className="w-[95%] ml-auto bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <header className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isFileInputMode ? 'bg-purple-500 animate-pulse' : 'bg-blue-500'}`}></span>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">
                Input: {isFileInputMode ? 'File Buffer (Multipart)' : 'Log Stream Payload'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <label className={`flex items-center gap-2 px-3 py-1.5 border hover:border-blue-400 rounded-lg text-[10px] font-bold cursor-pointer transition-all shadow-sm ${isFileInputMode ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600'}`}>
                <Upload size={12} className={isFileInputMode ? "text-blue-600" : "text-blue-500"} />
                <span>{isFileInputMode && selectedFile ? selectedFile.name.toUpperCase() : 'UPLOAD LOG FILE'}</span>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".txt,.log,text/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                      setIsFileInputMode(true);
                      setLogStream(''); // Clear text input if file selected
                    }
                  }}
                />
              </label>
              {isFileInputMode && (
                <button 
                  onClick={() => { setIsFileInputMode(false); setSelectedFile(null); }}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Switch to Text Input"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </header>
          
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description / Instructions</label>
                <span className={`text-[9px] font-mono ${description.length >= 200 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                  {description.length}/200
                </span>
              </div>
              <input 
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                placeholder="What should I look for? (e.g. 'Identify latency bottlenecks')"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 transition-all font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {isFileInputMode ? 'File Manifest View' : 'Local Buffer Logs'}
              </label>
              
              {isFileInputMode ? (
                <div className="w-full h-64 bg-blue-50/20 border border-blue-100 border-dashed rounded-xl flex flex-col items-center justify-center gap-5 group transition-colors hover:bg-blue-50/40">
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-xl shadow-blue-500/5 border border-blue-100 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-all duration-500">
                    <Terminal size={40} />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-bold text-slate-900 tracking-tight">{selectedFile?.name || 'Awaiting selection...'}</p>
                    <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                      {selectedFile 
                        ? `${(selectedFile.size / 1024).toFixed(2)} KB • ${selectedFile.type || 'plain/text'}`
                        : 'Select a direct log file system resource'
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-100 rounded-full shadow-sm text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                    <ShieldCheck size={10} className="text-green-500" /> Integrity Check Passed
                  </div>
                </div>
              ) : (
                <textarea 
                  value={logStream}
                  onChange={(e) => setLogStream(e.target.value)}
                  spellCheck={false}
                  className="w-full h-64 bg-slate-50 border border-slate-100 rounded-xl p-4 font-mono text-[11px] text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 transition-all custom-scrollbar selection:bg-blue-500/10 leading-relaxed"
                  placeholder="Paste logs here..."
                />
              )}
            </div>
          </div>

          <footer className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
             <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter">
               {isFileInputMode 
                 ? `Binary Stream Size: ${selectedFile?.size.toLocaleString() || 0} Bytes`
                 : `Payload Size: ${logStream.length.toLocaleString()} Bytes`
               }
             </span>
          </footer>
        </div>

        {/* Output Side - Aligned Left */}
        <div className="w-[95%] mr-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[300px]">
          <header className="px-6 py-4 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isAnalyzing ? (
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              ) : (
                <Activity size={14} className="text-blue-400" />
              )}
              <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest font-bold">Intelligence Analysis Report</span>
            </div>
          </header>

          <div className="flex-1 p-8">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center h-48 gap-4">
                 <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                 <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest animate-pulse">Agent is processing data nodes...</span>
              </div>
            ) : analysisResult ? (
              <div className="prose prose-invert prose-xs max-w-none text-blue-100/90 leading-relaxed selection:bg-blue-500/30 font-mono whitespace-pre-wrap">
                <ReactMarkdown>{analysisResult}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-slate-600 italic gap-4 opacity-40">
                <Cpu size={40} />
                <span className="text-[10px] uppercase font-bold tracking-[0.2em]">Awaiting Data for Synthesis</span>
              </div>
            )}
          </div>

          <footer className="px-8 py-4 bg-black/40 border-t border-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-bold uppercase tracking-widest">
              <ShieldCheck size={12} className="text-blue-500" /> AICORE-V3 VERIFIED
            </div>
            <span className="text-[9px] font-mono text-slate-600 uppercase">Analysis Precision: High</span>
          </footer>
        </div>
      </div>
    </motion.div>
  );
}
