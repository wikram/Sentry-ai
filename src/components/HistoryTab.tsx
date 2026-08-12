/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { 
  Trash2, 
  History, 
  Terminal, 
  Clock, 
  ChevronRight, 
  RefreshCw, 
  Search, 
  ChevronLeft, 
  Cpu, 
  CheckCircle2, 
  Loader2
} from 'lucide-react';
import { formatDateTime } from '../lib/dateUtils';

export interface HistoryItem {
  id: string;
  analysis_code?: string;
  status?: string;
  input_char_count?: number;
  engine_llm_model?: string;
  created_at?: string;
  completed_at?: string;
  timestamp?: string;
  input?: string;
  output?: string;
}

interface HistoryTabProps {
  analysisHistory?: HistoryItem[];
  setAnalysisHistory?: (history: HistoryItem[]) => void;
  expandedHistoryId?: string | null;
  setExpandedHistoryId?: (id: string | null) => void;
  preferredBackendUrl?: string;
}

export default function HistoryTab({
  analysisHistory = [],
  setAnalysisHistory,
  expandedHistoryId: propExpandedId,
  setExpandedHistoryId: propSetExpandedId,
  preferredBackendUrl
}: HistoryTabProps) {
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state: default 15 results per page
  const [pageSize, setPageSize] = useState<number>(15);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Local expanded item state fallback
  const [localExpandedId, setLocalExpandedId] = useState<string | null>(null);

  const activeExpandedId = propExpandedId !== undefined ? propExpandedId : localExpandedId;
  const toggleExpand = (id: string) => {
    const nextId = activeExpandedId === id ? null : id;
    if (propSetExpandedId) {
      propSetExpandedId(nextId);
    } else {
      setLocalExpandedId(nextId);
    }
  };

  const fetchHistoryFromApi = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const endpoint = preferredBackendUrl 
        ? `${preferredBackendUrl.replace(/\/$/, '')}/api/list-history` 
        : '/api/list-history';
      
      console.log('Fetching history from API endpoint:', endpoint);
      const response = await fetch(endpoint, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      let fetchedItems: HistoryItem[] = [];

      if (data && Array.isArray(data.history)) {
        fetchedItems = data.history;
      } else if (Array.isArray(data)) {
        fetchedItems = data;
      }

      // Merge local frontend analysis history items if any exist that aren't in fetchedItems
      const mergedMap = new Map<string, HistoryItem>();
      fetchedItems.forEach(item => {
        mergedMap.set(item.id || item.analysis_code || Math.random().toString(), item);
      });

      analysisHistory.forEach(localItem => {
        const key = localItem.id || localItem.analysis_code || Math.random().toString();
        if (!mergedMap.has(key)) {
          mergedMap.set(key, {
            id: localItem.id,
            analysis_code: localItem.analysis_code || localItem.id,
            status: localItem.status || 'COMPLETED',
            input_char_count: localItem.input_char_count || localItem.input?.length || 0,
            engine_llm_model: localItem.engine_llm_model || 'openai/gpt-4o',
            created_at: localItem.created_at || localItem.timestamp || new Date().toISOString(),
            completed_at: localItem.completed_at || localItem.timestamp || new Date().toISOString(),
            input: localItem.input,
            output: localItem.output
          });
        }
      });

      const finalItems = Array.from(mergedMap.values());
      setHistoryList(finalItems);
    } catch (err) {
      console.error('Error fetching list-history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analysis history');
      
      // Fallback to prop history if API call fails
      if (analysisHistory && analysisHistory.length > 0) {
        setHistoryList(analysisHistory);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryFromApi();
  }, [preferredBackendUrl]);

  // Reset page to 1 when search or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize]);

  // Filtered history records with parameter search support (id, model, status, code, etc.)
  const filteredHistory = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return historyList;

    return historyList.filter(item => {
      const id = (item.id || '').toLowerCase();
      const code = (item.analysis_code || '').toLowerCase();
      const model = (item.engine_llm_model || '').toLowerCase();
      const status = (item.status || '').toLowerCase();
      const input = (item.input || '').toLowerCase();
      const output = (item.output || '').toLowerCase();
      const createdAt = (item.created_at || item.timestamp || '').toLowerCase();

      // Support parameter key:value syntax (e.g. "id:019", "model:gpt", "status:completed", "code:ANL")
      if (q.includes(':')) {
        const parts = q.split(/\s+/);
        return parts.every(part => {
          if (part.includes(':')) {
            const [key, val] = part.split(':');
            if (!val) return true;
            if (key === 'id') return id.includes(val) || code.includes(val);
            if (key === 'code') return code.includes(val);
            if (key === 'model') return model.includes(val);
            if (key === 'status') return status.includes(val);
            if (key === 'input' || key === 'log') return input.includes(val);
            if (key === 'output' || key === 'report') return output.includes(val);
          }
          return (
            id.includes(part) ||
            code.includes(part) ||
            model.includes(part) ||
            status.includes(part) ||
            input.includes(part) ||
            output.includes(part) ||
            createdAt.includes(part)
          );
        });
      }

      // Standard multi-field search across ID, Analysis Code, LLM Model, Status, Input & Output
      return (
        id.includes(q) ||
        code.includes(q) ||
        model.includes(q) ||
        status.includes(q) ||
        input.includes(q) ||
        output.includes(q) ||
        createdAt.includes(q)
      );
    });
  }, [historyList, searchQuery]);

  // Pagination calculation
  const totalRecords = filteredHistory.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const currentPaginatedItems = filteredHistory.slice(startIndex, endIndex);

  const handleClear = () => {
    if (confirm('Are you sure you want to clear history?')) {
      setHistoryList([]);
      if (setAnalysisHistory) {
        setAnalysisHistory([]);
      }
    }
  };

  return (
    <motion.div 
      key="history"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-[90%] mx-auto space-y-6 pb-12"
    >
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Analysis History</h2>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold font-mono">
              {totalRecords} records
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              const inputEl = document.getElementById('history-search-input');
              if (inputEl) inputEl.focus();
            }}
            className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm"
            title="Focus Search"
          >
            <Search size={14} className="text-slate-500" />
            Search
          </button>

          <button 
            onClick={fetchHistoryFromApi}
            disabled={isLoading}
            className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
            title="Refresh history from API"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin text-blue-600" : "text-slate-500"} />
            Refresh
          </button>

          <button 
            onClick={handleClear}
            className="px-3.5 py-2 border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
          >
            <Trash2 size={14} /> Clear
          </button>
        </div>
      </div>

      {/* Control Bar: Search & Page Size Options */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Search Bar, Tags & Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              id="history-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setCurrentPage(1); }}
              placeholder="Search by ID, model, status, code... (e.g., status:COMPLETED or id:ANL)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={() => setCurrentPage(1)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm shrink-0"
          >
            <Search size={14} />
            Search
          </button>
        </div>

        {/* Quick Parameter Filter Tags & Page Size Selector */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <span className="text-slate-400 font-semibold mr-0.5">Parameters:</span>
            {['id:', 'model:', 'status:', 'code:'].map(param => (
              <button
                key={param}
                onClick={() => {
                  setSearchQuery(prev => prev ? `${prev.trim()} ${param}` : param);
                  const el = document.getElementById('history-search-input');
                  if (el) el.focus();
                }}
                className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-lg font-mono text-[10px] font-bold transition-all border border-slate-200/80"
              >
                +{param}
              </button>
            ))}
          </div>

          {/* Display Choice: 10 / 15 / 20 results per page */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Display:</span>
            <div className="inline-flex bg-slate-100 p-1 rounded-xl gap-1">
              {[10, 15, 20].map((size) => (
                <button
                  key={size}
                  onClick={() => setPageSize(size)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    pageSize === size 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-400 font-medium">/ page</span>
          </div>
        </div>
      </div>

      {/* Main List & Loading States */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 size={32} className="animate-spin text-blue-600" />
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Fetching History from /api/list-history...</p>
        </div>
      ) : error && historyList.length === 0 ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-rose-700 text-xs font-medium space-y-2">
          <p className="font-bold text-sm">Unable to load history</p>
          <p>{error}</p>
          <button 
            onClick={fetchHistoryFromApi}
            className="mt-2 px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold"
          >
            Retry
          </button>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-20 text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
            <History size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900">No History Records Found</h3>
            <p className="text-sm text-slate-400">
              {searchQuery ? 'No results match your search parameters.' : 'Run an analysis in the Log Analyzer tab to populate history.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {currentPaginatedItems.map((item, idx) => {
            const displayCode = item.analysis_code || item.id || `ANL-${idx + 1}`;
            const displayStatus = item.status || 'COMPLETED';
            const displayModel = item.engine_llm_model || 'openai/gpt-4o';
            const displayCharCount = item.input_char_count !== undefined 
              ? item.input_char_count 
              : (item.input?.length || 0);
            const displayTimestamp = item.created_at || item.completed_at || item.timestamp || '';
            const isExpanded = activeExpandedId === item.id || activeExpandedId === displayCode;

            return (
              <div 
                key={item.id || idx} 
                className={`bg-white border transition-all rounded-2xl overflow-hidden shadow-sm hover:shadow-md ${
                  isExpanded ? 'border-blue-300 ring-4 ring-blue-500/5' : 'border-slate-200'
                }`}
              >
                <button 
                  onClick={() => toggleExpand(item.id || displayCode)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50/50 transition-colors shrink-0">
                      <Terminal size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-slate-900 tracking-tight text-sm font-mono">{displayCode}</h3>
                        
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                          displayStatus === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          displayStatus === 'RUNNING' ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse' :
                          'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {displayStatus}
                        </span>

                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold font-mono border border-slate-200 flex items-center gap-1">
                          <Cpu size={10} className="text-slate-400" />
                          {displayModel}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-400 uppercase tracking-widest">
                        {displayTimestamp && (
                          <span className="flex items-center gap-1.5 font-sans">
                            <Clock size={12} className="text-slate-400" /> 
                            {formatDateTime(displayTimestamp)}
                          </span>
                        )}
                        <span className="text-slate-200">|</span>
                        <span className="font-sans">{displayCharCount} characters analyzed</span>
                      </div>
                    </div>
                  </div>

                  <div className={`p-2 rounded-lg transition-all shrink-0 ${
                    isExpanded ? 'bg-blue-50 text-blue-600 rotate-180' : 'bg-slate-50 text-slate-400 group-hover:text-slate-900 group-hover:bg-slate-100'
                  }`}>
                    <ChevronRight size={18} />
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-2 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Input Raw Logs</h4>
                            {item.input && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(item.input || ''); }}
                                className="text-[9px] font-bold text-blue-600 uppercase hover:underline"
                              >
                                Copy Raw
                              </button>
                            )}
                          </div>
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 font-mono text-[11px] text-slate-600 max-h-[350px] overflow-y-auto whitespace-pre custom-scrollbar">
                            {item.input || 'No raw log input content recorded for this entry.'}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Intelligence Report</h4>
                            {item.output && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(item.output || ''); }}
                                className="text-[9px] font-bold text-blue-600 uppercase hover:underline"
                              >
                                Copy Report
                              </button>
                            )}
                          </div>
                          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-[11px] text-blue-100/90 max-h-[350px] overflow-y-auto custom-scrollbar leading-relaxed markdown-container">
                            {item.output ? (
                              <ReactMarkdown>{item.output}</ReactMarkdown>
                            ) : (
                              <span className="text-slate-500 italic">No output report recorded for this entry.</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {!isLoading && totalRecords > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-semibold text-slate-500">
            Showing <span className="font-bold text-slate-800">{totalRecords === 0 ? 0 : startIndex + 1}</span> to <span className="font-bold text-slate-800">{endIndex}</span> of <span className="font-bold text-slate-800">{totalRecords}</span> entries
          </div>

          {/* Page Navigation */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show pages near current page or start/end
              if (totalPages > 7) {
                if (page !== 1 && page !== totalPages && Math.abs(page - currentPage) > 1) {
                  if (page === 2 && currentPage > 3) return <span key={page} className="text-slate-400 text-xs px-1">...</span>;
                  if (page === totalPages - 1 && currentPage < totalPages - 2) return <span key={page} className="text-slate-400 text-xs px-1">...</span>;
                  return null;
                }
              }

              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                    currentPage === page
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
