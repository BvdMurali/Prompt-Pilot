'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { History, Calendar, Copy, AlertCircle, ChevronRight, Check } from 'lucide-react';
import { globalCache } from '@/lib/cache';

type HistoryItem = {
  id: string;
  original_input: string;
  optimized_output: string;
  action_used: string;
  metadata: {
    score?: {
      overall: number;
      clarity: number;
      context: number;
      constraints: number;
      structure: number;
      specificity: number;
    };
    explanations?: Array<{
      action: string;
      why: string;
      how: string;
    }>;
    platform?: string;
    model?: string;
  };
  created_at: string;
};

export default function HistoryPage() {
  const { session } = useAuth();
  
  // Data state
  const [historyList, setHistoryList] = useState<HistoryItem[]>(() => globalCache.history.historyList);
  const [loading, setLoading] = useState(() => globalCache.history.historyList.length === 0);
  const [selectedId, setSelectedId] = useState<string | null>(() => globalCache.history.selectedId);
  const [copied, setCopied] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [error, setError] = useState('');

  // Sync selected item selection back to cache
  useEffect(() => {
    globalCache.history.selectedId = selectedId;
  }, [selectedId]);

  const loadHistory = async () => {
    if (!session?.user) return;
    try {
      const { data, error } = await supabase
        .from('history')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistoryList(data || []);
      globalCache.history.historyList = data || [];
      if (data && data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
        globalCache.history.selectedId = data[0].id;
      }
    } catch (err) {
      setError('Failed to load history logs: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadHistory();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const selectedItem = historyList.find(h => h.id === selectedId);

  const handleCopy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAll = () => {
    if (historyList.length === 0) return;
    
    const formatted = historyList.map((h, index) => {
      const date = new Date(h.created_at).toLocaleString();
      const action = h.action_used.replace('rewrite_', 'Rewrite: ').replace('optimize_prompt', 'Optimize');
      const score = h.metadata?.score?.overall ? `${h.metadata.score.overall}%` : 'N/A';
      const model = h.metadata?.model || 'Gemini';
      const platform = h.metadata?.platform || 'General';
      
      let explanationsText = '';
      if (h.metadata?.explanations && h.metadata.explanations.length > 0) {
        explanationsText = '\n\n[EXPLANATIONS]\n' + h.metadata.explanations.map(exp => `- ${exp.action}\n  Why: ${exp.why}\n  How: ${exp.how}`).join('\n');
      }

      return `Entry #${index + 1}
Date: ${date}
Action: ${action}
Model: ${model}
Platform: ${platform}
Overall Score: ${score}

[ORIGINAL INPUT]
${h.original_input}

[OPTIMIZED OUTPUT]
${h.optimized_output}${explanationsText}
==================================================`;
    }).join('\n\n');

    const header = `==================================================
PROMPT PILOT - OPTIMIZATION HISTORY LOGS EXPORT
Total Entries: ${historyList.length}
Exported on: ${new Date().toLocaleString()}
==================================================\n\n`;

    navigator.clipboard.writeText(header + formatted);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const getScoreColor = (val: number) => {
    if (val >= 85) return 'text-emerald-700 border-emerald-200 bg-emerald-50';
    if (val >= 60) return 'text-amber-700 border-amber-200 bg-amber-50';
    return 'text-red-650 border-red-200 bg-red-50';
  };

  return (
    <div className="flex-1 flex flex-col gap-6 xl:gap-8 max-w-7xl mx-auto w-full">
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <span className="text-sm text-slate-500">Retrieving audit history logs...</span>
        </div>
      ) : historyList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 border border-dashed border-slate-200 rounded-2xl bg-white shadow-sm">
          <History className="w-10 h-10 text-slate-400 mb-3" />
          <p className="text-sm font-semibold text-slate-900">No optimization history found</p>
          <p className="text-xs text-slate-500 max-w-xs text-center mt-1">
            Optimizations and rewrites run from the dashboard or browser extension will accumulate here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 xl:gap-8">
          {/* Top Info & Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 border border-indigo-150 rounded-xl text-indigo-650">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-950">Audit History & Logs</h2>
                <p className="text-xs text-slate-500">Review your past prompt optimizations, scores, and change histories. Total {historyList.length} logs found.</p>
              </div>
            </div>
            <button
              onClick={handleCopyAll}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all shadow-xs cursor-pointer ${
                copiedAll
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-indigo-650 hover:bg-indigo-600 border-indigo-700 text-white hover:shadow-md'
              }`}
            >
              {copiedAll ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>All Logs Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-white/95" />
                  <span>Copy All Logs</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8">
          
          {/* HISTORY LOGS LIST PANEL */}
          <div className="lg:col-span-1 flex flex-col gap-3 max-h-[250px] lg:max-h-[600px] xl:max-h-[750px] 2xl:max-h-[850px] overflow-y-auto pr-1">
            {historyList.map((h) => (
              <button
                key={h.id}
                onClick={() => setSelectedId(h.id)}
                className={`p-4 xl:p-5.5 rounded-xl xl:rounded-2xl border text-left transition-all flex items-center justify-between gap-4 xl:gap-6 ${
                  selectedId === h.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-650 font-bold uppercase tracking-wider">
                      {h.action_used.replace('rewrite_', 'Rewrite: ').replace('optimize_prompt', 'Optimize')}
                    </span>
                    {h.metadata?.score?.overall && (
                      <span className="text-[10px] font-extrabold text-indigo-650">
                        Score: {h.metadata.score.overall}%
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 truncate mb-1">
                    {h.original_input.substring(0, 35)}...
                  </h4>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{new Date(h.created_at).toLocaleString()}</span>
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            ))}
          </div>

          {/* HISTORY LOG DETAILS WORKSPACE */}
          <div className="lg:col-span-2 flex flex-col gap-5 xl:gap-6 bg-white border border-slate-200 p-5 xl:p-6 rounded-2xl xl:rounded-3xl min-h-[450px] shadow-sm">
            {selectedItem ? (
              <div className="flex flex-col gap-6">
                
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">History Execution Details</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <span>Model: {selectedItem.metadata.model || 'Gemini'}</span>
                      <span>&bull;</span>
                      <span>Platform: {selectedItem.metadata.platform || 'General'}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => handleCopy(selectedItem.optimized_output)}
                    className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? 'Copied' : 'Copy Output'}</span>
                  </button>
                </div>

                {/* Score breakdown if available */}
                {selectedItem.metadata?.score && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap gap-6 items-center justify-between shadow-inner">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-450">Overall Prompt Score</span>
                      <span className={`text-sm font-extrabold px-2.5 py-0.5 rounded border ${getScoreColor(selectedItem.metadata.score.overall)}`}>
                        {selectedItem.metadata.score.overall}/100
                      </span>
                    </div>

                    <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4">
                      {[
                        { label: 'Clarity', val: selectedItem.metadata.score.clarity },
                        { label: 'Context', val: selectedItem.metadata.score.context },
                        { label: 'Constraints', val: selectedItem.metadata.score.constraints },
                        { label: 'Structure', val: selectedItem.metadata.score.structure },
                        { label: 'Specificity', val: selectedItem.metadata.score.specificity },
                      ].map(s => (
                        <div key={s.label} className="flex flex-col">
                          <span className="text-[10px] text-slate-400 font-semibold">{s.label}</span>
                          <span className="text-xs font-bold text-slate-800">{s.val}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Before / After Panel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Before */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-450">Original Input Draft</span>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-650 leading-relaxed max-h-[200px] xl:max-h-[300px] 2xl:max-h-[400px] overflow-y-auto whitespace-pre-wrap select-all shadow-inner">
                      {selectedItem.original_input}
                    </div>
                  </div>

                  {/* After */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-450">Optimized Output</span>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 leading-relaxed max-h-[200px] xl:max-h-[300px] 2xl:max-h-[400px] overflow-y-auto whitespace-pre-wrap select-all shadow-inner">
                      {selectedItem.optimized_output}
                    </div>
                  </div>
                </div>

                {/* Explanations if available */}
                {selectedItem.metadata?.explanations && selectedItem.metadata.explanations.length > 0 && (
                  <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
                    <span className="text-[10px] uppercase font-bold text-slate-400 mb-1">Explain Changes</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[180px] xl:max-h-[260px] 2xl:max-h-[350px] overflow-y-auto pr-1">
                      {selectedItem.metadata.explanations.map((exp, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-1 text-[11px] leading-relaxed shadow-sm">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                            <span>{exp.action}</span>
                          </span>
                          <span className="text-slate-650"><strong className="text-slate-450">Why:</strong> {exp.why}</span>
                          <span className="text-slate-650"><strong className="text-slate-450">How:</strong> {exp.how}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400">
                <History className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-700">Select a history entry</p>
                <p className="text-xs max-w-xs mt-1">
                  Choose a log entry from the list to view full optimization details, prompt scores, and change reasons.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
      )}
    </div>
  );
}
