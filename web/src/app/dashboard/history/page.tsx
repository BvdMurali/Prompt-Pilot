'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { History, Calendar, Copy, AlertCircle, ChevronRight } from 'lucide-react';

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
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

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
      if (data && data.length > 0) {
        setSelectedId(data[0].id);
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

  const getScoreColor = (val: number) => {
    if (val >= 85) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5';
    if (val >= 60) return 'text-amber-400 border-amber-500/30 bg-amber-500/5';
    return 'text-red-400 border-red-500/30 bg-red-500/5';
  };

  return (
    <div className="flex-1 flex flex-col gap-6">
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <span className="text-sm text-slate-500">Retrieving audit history logs...</span>
        </div>
      ) : historyList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-900 rounded-2xl bg-slate-950">
          <History className="w-10 h-10 text-slate-700 mb-3" />
          <p className="text-sm font-semibold text-slate-350">No optimization history found</p>
          <p className="text-xs text-slate-550 max-w-xs text-center mt-1">
            Optimizations and rewrites run from the dashboard or browser extension will accumulate here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-12">
          
          {/* HISTORY LOGS LIST PANEL */}
          <div className="lg:col-span-1 flex flex-col gap-3 max-h-[250px] lg:max-h-[600px] xl:max-h-[750px] 2xl:max-h-[850px] overflow-y-auto pr-1">
            {historyList.map((h) => (
              <button
                key={h.id}
                onClick={() => setSelectedId(h.id)}
                className={`p-4 xl:p-5.5 rounded-xl xl:rounded-2xl border text-left transition-all flex items-center justify-between gap-4 xl:gap-6 ${
                  selectedId === h.id
                    ? 'border-indigo-500 bg-indigo-600/5'
                    : 'border-slate-900 bg-slate-900/10 hover:border-slate-800'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 font-bold uppercase tracking-wider">
                      {h.action_used.replace('rewrite_', 'Rewrite: ').replace('optimize_prompt', 'Optimize')}
                    </span>
                    {h.metadata?.score?.overall && (
                      <span className="text-[10px] font-extrabold text-indigo-400">
                        Score: {h.metadata.score.overall}%
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white truncate mb-1">
                    {h.original_input.substring(0, 35)}...
                  </h4>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(h.created_at).toLocaleString()}</span>
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            ))}
          </div>

          {/* HISTORY LOG DETAILS WORKSPACE */}
          <div className="lg:col-span-2 flex flex-col gap-6 xl:gap-8 bg-slate-900/40 border border-slate-900 p-6 xl:p-8 rounded-2xl xl:rounded-3xl min-h-[450px]">
            {selectedItem ? (
              <div className="flex flex-col gap-6">
                
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-850 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">History Execution Details</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <span>Model: {selectedItem.metadata.model || 'Gemini'}</span>
                      <span>&bull;</span>
                      <span>Platform: {selectedItem.metadata.platform || 'General'}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => handleCopy(selectedItem.optimized_output)}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? 'Copied' : 'Copy Output'}</span>
                  </button>
                </div>

                {/* Score breakdown if available */}
                {selectedItem.metadata?.score && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-900/50 flex flex-wrap gap-6 items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Overall Prompt Score</span>
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
                          <span className="text-[10px] text-slate-500 font-semibold">{s.label}</span>
                          <span className="text-xs font-bold text-slate-300">{s.val}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Before / After Panel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Before */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Original Input Draft</span>
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-900 text-xs font-mono text-slate-400 leading-relaxed max-h-[200px] xl:max-h-[300px] 2xl:max-h-[400px] overflow-y-auto whitespace-pre-wrap select-all">
                      {selectedItem.original_input}
                    </div>
                  </div>

                  {/* After */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Optimized Output</span>
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 text-xs font-mono text-slate-200 leading-relaxed max-h-[200px] xl:max-h-[300px] 2xl:max-h-[400px] overflow-y-auto whitespace-pre-wrap select-all">
                      {selectedItem.optimized_output}
                    </div>
                  </div>
                </div>

                {/* Explanations if available */}
                {selectedItem.metadata?.explanations && selectedItem.metadata.explanations.length > 0 && (
                  <div className="flex flex-col gap-2 border-t border-slate-850 pt-4">
                    <span className="text-[10px] uppercase font-bold text-slate-500 mb-1">Explain Changes</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[180px] xl:max-h-[260px] 2xl:max-h-[350px] overflow-y-auto pr-1">
                      {selectedItem.metadata.explanations.map((exp, idx) => (
                        <div key={idx} className="p-3 bg-slate-950 border border-slate-900 rounded-xl flex flex-col gap-1 text-[11px] leading-relaxed">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            <span>{exp.action}</span>
                          </span>
                          <span className="text-slate-450"><strong className="text-slate-550">Why:</strong> {exp.why}</span>
                          <span className="text-slate-450"><strong className="text-slate-550">How:</strong> {exp.how}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
                <History className="w-10 h-10 text-slate-700 mb-3" />
                <p className="text-sm font-semibold text-slate-350">Select a history entry</p>
                <p className="text-xs max-w-xs mt-1">
                  Choose a log entry from the list to view full optimization details, prompt scores, and change reasons.
                </p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
