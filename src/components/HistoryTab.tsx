/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { 
  History, 
  Terminal, 
  Clock, 
  ChevronRight, 
  Search, 
  ChevronLeft, 
  Cpu, 
  CheckCircle2, 
  Loader2,
  X,
  Filter
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

export interface FilterChip {
  id: string;
  key: 'id' | 'model' | 'status' | 'logs' | 'search';
  label: string;
  value: string;
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

  // GCP-Style Filter Bar State
  const [activeChips, setActiveChips] = useState<FilterChip[]>([]);
  const [currentInputValue, setCurrentInputValue] = useState<string>('');
  const [selectedPendingKey, setSelectedPendingKey] = useState<'id' | 'model' | 'status' | 'logs' | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [hoveredParam, setHoveredParam] = useState<'id' | 'model' | 'status' | 'logs' | null>(null);

  const filterContainerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterContainerRef.current && !filterContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setHoveredParam(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Reset page to 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeChips, currentInputValue, selectedPendingKey, pageSize]);

  // Add a filter chip
  const addChip = (key: 'id' | 'model' | 'status' | 'logs' | 'search', label: string, value: string) => {
    const trimmedVal = value.trim();
    if (!trimmedVal) return;

    // Avoid duplicate identical chips
    const exists = activeChips.some(c => c.key === key && c.value.toLowerCase() === trimmedVal.toLowerCase());
    if (!exists) {
      setActiveChips(prev => [...prev, {
        id: `${key}-${trimmedVal}-${Date.now()}`,
        key,
        label,
        value: trimmedVal
      }]);
    }

    setCurrentInputValue('');
    setSelectedPendingKey(null);
    setIsDropdownOpen(false);
    setHoveredParam(null);
  };

  // Remove a filter chip
  const removeChip = (chipId: string) => {
    setActiveChips(prev => prev.filter(c => c.id !== chipId));
  };

  // Handle Enter / Backspace keys in filter input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentInputValue.trim()) {
        const key = selectedPendingKey || 'search';
        const label = 
          key === 'id' ? 'ID' :
          key === 'model' ? 'Model' :
          key === 'status' ? 'Status' :
          key === 'logs' ? 'Logs' : 'Search';
        addChip(key, label, currentInputValue);
      }
    } else if (e.key === 'Backspace' && currentInputValue === '') {
      if (selectedPendingKey) {
        setSelectedPendingKey(null);
      } else if (activeChips.length > 0) {
        setActiveChips(prev => prev.slice(0, -1));
      }
    }
  };

  // Filtered history records matching ALL active chips + pending input
  const filteredHistory = useMemo(() => {
    return historyList.filter(item => {
      const id = (item.id || '').toLowerCase();
      const code = (item.analysis_code || '').toLowerCase();
      const model = (item.engine_llm_model || '').toLowerCase();
      const status = (item.status || '').toLowerCase();
      const input = (item.input || '').toLowerCase();
      const output = (item.output || '').toLowerCase();
      const createdAt = (item.created_at || item.timestamp || '').toLowerCase();

      // Must match ALL active chips (AND logic)
      for (const chip of activeChips) {
        const val = chip.value.toLowerCase().trim();
        if (!val) continue;

        if (chip.key === 'status') {
          if (status !== val) return false;
        } else if (chip.key === 'model') {
          if (!model.includes(val)) return false;
        } else if (chip.key === 'id') {
          if (!id.includes(val) && !code.includes(val)) return false;
        } else if (chip.key === 'logs') {
          if (!input.includes(val) && !output.includes(val)) return false;
        } else if (chip.key === 'search') {
          const matchesAny =
            id.includes(val) ||
            code.includes(val) ||
            model.includes(val) ||
            status.includes(val) ||
            input.includes(val) ||
            output.includes(val) ||
            createdAt.includes(val);
          if (!matchesAny) return false;
        }
      }

      // Also filter by active typing in input field
      const pendingVal = currentInputValue.toLowerCase().trim();
      if (pendingVal) {
        if (selectedPendingKey === 'status') {
          if (!status.includes(pendingVal)) return false;
        } else if (selectedPendingKey === 'model') {
          if (!model.includes(pendingVal)) return false;
        } else if (selectedPendingKey === 'id') {
          if (!id.includes(pendingVal) && !code.includes(pendingVal)) return false;
        } else if (selectedPendingKey === 'logs') {
          if (!input.includes(pendingVal) && !output.includes(pendingVal)) return false;
        } else {
          const matchesAny =
            id.includes(pendingVal) ||
            code.includes(pendingVal) ||
            model.includes(pendingVal) ||
            status.includes(pendingVal) ||
            input.includes(pendingVal) ||
            output.includes(pendingVal) ||
            createdAt.includes(pendingVal);
          if (!matchesAny) return false;
        }
      }

      return true;
    });
  }, [historyList, activeChips, currentInputValue, selectedPendingKey]);

  // Check if any filters exist
  const hasActiveFilters = activeChips.length > 0 || currentInputValue !== '' || selectedPendingKey !== null;

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Analysis History</h2>
          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold font-mono">
            {totalRecords} records
          </span>
        </div>
      </div>

      {/* Control Bar: GCP Console Style Composite Parameter Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* GCP Filter Bar Container */}
        <div ref={filterContainerRef} className="relative flex-1">
          <div 
            onClick={() => {
              setIsDropdownOpen(true);
              if (inputRef.current) inputRef.current.focus();
            }}
            className={`min-h-[44px] bg-slate-50 border rounded-xl px-3.5 py-1.5 flex flex-wrap items-center gap-2 cursor-text transition-all ${
              isDropdownOpen ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <Search size={16} className="text-slate-400 shrink-0 mr-0.5" />

            {/* Active Filter Chips */}
            <AnimatePresence>
              {activeChips.map((chip) => (
                <motion.span
                  key={chip.id}
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.85, opacity: 0 }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 text-slate-100 rounded-lg text-xs font-semibold shadow-xs shrink-0"
                >
                  <span className="text-slate-400 font-mono text-[10px] font-bold uppercase">{chip.label}:</span>
                  <span className="font-bold">{chip.value}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeChip(chip.id);
                    }}
                    className="hover:bg-slate-700 p-0.5 rounded transition-colors text-slate-400 hover:text-white ml-0.5"
                    title="Remove filter parameter"
                  >
                    <X size={12} />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>

            {/* Active Pending Parameter Prefix */}
            {selectedPendingKey && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold font-mono shrink-0 border border-blue-200">
                {selectedPendingKey === 'id' ? 'ID' :
                 selectedPendingKey === 'model' ? 'Model' :
                 selectedPendingKey === 'status' ? 'Status' : 'Logs'}:
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPendingKey(null);
                  }}
                  className="hover:text-blue-950 p-0.5 ml-0.5"
                >
                  <X size={10} />
                </button>
              </span>
            )}

            {/* Input Field */}
            <input
              ref={inputRef}
              type="text"
              value={currentInputValue}
              onChange={(e) => setCurrentInputValue(e.target.value)}
              onFocus={() => setIsDropdownOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={
                activeChips.length > 0 || selectedPendingKey
                  ? selectedPendingKey
                    ? `Enter ${selectedPendingKey} value and press Enter...`
                    : 'Filter by another parameter...'
                  : 'Filter history by parameters (e.g. ID, Model, Status)...'
              }
              className="flex-1 bg-transparent border-none text-xs font-medium focus:outline-none min-w-[150px] py-1 text-slate-800 placeholder:text-slate-400"
            />

            {/* Clear All Button */}
            {hasActiveFilters && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveChips([]);
                  setCurrentInputValue('');
                  setSelectedPendingKey(null);
                }}
                className="text-xs font-bold text-slate-400 hover:text-rose-600 px-2 py-1 rounded transition-colors shrink-0 ml-auto"
                title="Clear all filters"
              >
                Clear all
              </button>
            )}
          </div>

          {/* GCP-Style Parameter Dropdown Menu */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 top-full mt-1.5 w-full sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-2 overflow-hidden"
              >
                <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 border-b border-slate-100 mb-1 flex items-center justify-between">
                  <span>Filter by Property</span>
                  <Filter size={12} className="text-slate-400" />
                </div>

                <div className="space-y-0.5">
                  {/* Parameter: ID / Code */}
                  <div
                    onClick={() => {
                      setSelectedPendingKey('id');
                      setIsDropdownOpen(false);
                      if (inputRef.current) inputRef.current.focus();
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <Terminal size={14} className="text-slate-400 group-hover:text-blue-600" />
                      <span>ID / Analysis Code</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Type value &crarr;</span>
                  </div>

                  {/* Parameter: Status */}
                  <div 
                    onMouseEnter={() => setHoveredParam('status')}
                    className="relative"
                  >
                    <div
                      onClick={() => setHoveredParam(hoveredParam === 'status' ? null : 'status')}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-slate-400 group-hover:text-blue-600" />
                        <span>Status</span>
                      </div>
                      <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-600" />
                    </div>

                    {/* Status Submenu Options */}
                    {hoveredParam === 'status' && (
                      <div className="ml-4 pl-3 border-l-2 border-blue-100 my-1 space-y-1">
                        {['COMPLETED', 'RUNNING', 'FAILED'].map(st => (
                          <div
                            key={st}
                            onClick={(e) => {
                              e.stopPropagation();
                              addChip('status', 'Status', st);
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-all flex items-center gap-2"
                          >
                            <span className={`w-2 h-2 rounded-full ${
                              st === 'COMPLETED' ? 'bg-emerald-500' :
                              st === 'RUNNING' ? 'bg-blue-500' : 'bg-rose-500'
                            }`} />
                            {st}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Parameter: Engine Model */}
                  <div 
                    onMouseEnter={() => setHoveredParam('model')}
                    className="relative"
                  >
                    <div
                      onClick={() => setHoveredParam(hoveredParam === 'model' ? null : 'model')}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <Cpu size={14} className="text-slate-400 group-hover:text-blue-600" />
                        <span>LLM Engine Model</span>
                      </div>
                      <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-600" />
                    </div>

                    {/* Model Submenu Options */}
                    {hoveredParam === 'model' && (
                      <div className="ml-4 pl-3 border-l-2 border-blue-100 my-1 space-y-1">
                        {[
                          { label: 'OpenAI GPT-4o', value: 'openai/gpt-4o' },
                          { label: 'Google Gemini', value: 'google/gemini-1.5' },
                          { label: 'Anthropic Claude', value: 'anthropic/claude-3' },
                          { label: 'DeepSeek R1', value: 'deepseek/r1' }
                        ].map(m => (
                          <div
                            key={m.value}
                            onClick={(e) => {
                              e.stopPropagation();
                              addChip('model', 'Model', m.value);
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-all font-mono"
                          >
                            {m.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Parameter: Log Content */}
                  <div
                    onClick={() => {
                      setSelectedPendingKey('logs');
                      setIsDropdownOpen(false);
                      if (inputRef.current) inputRef.current.focus();
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <History size={14} className="text-slate-400 group-hover:text-blue-600" />
                      <span>Log Content</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Type value &crarr;</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Display Choice: 10 / 15 / 20 results per page */}
        <div className="flex items-center gap-2 shrink-0 justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
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
              {hasActiveFilters ? 'No results match your search parameters.' : 'Run an analysis in the Log Analyzer tab to populate history.'}
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
