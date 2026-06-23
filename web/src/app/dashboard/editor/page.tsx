'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Sparkles, Copy, Save, AlertCircle, RefreshCw, BarChart2, HelpCircle,
  Check, Zap, Brain, Shield, Target, FileSearch, Gauge, ChevronRight,
  MessageSquare, XCircle, RotateCcw, TrendingUp, Info
} from 'lucide-react';
import { AIResultV2 } from '@/lib/ai';
import { globalCache } from '@/lib/cache';

// ─── Pipeline Stage Config ────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { id: 'intent',      label: 'Intent',      icon: Target,     description: 'Detecting request type' },
  { id: 'domain',      label: 'Domain',      icon: Brain,      description: 'Identifying knowledge domain' },
  { id: 'ambiguity',   label: 'Ambiguity',   icon: FileSearch, description: 'Checking for unclear terms' },
  { id: 'context',     label: 'Context',     icon: Info,       description: 'Evaluating information sufficiency' },
  { id: 'safety',      label: 'Safety',      icon: Shield,     description: 'Running content policy check' },
  { id: 'confidence',  label: 'Confidence',  icon: Gauge,      description: 'Calculating optimization score' },
];

// ─── Score helpers ────────────────────────────────────────────────────────────
function getScoreColor(val: number) {
  if (val >= 85) return 'bg-emerald-50 border-emerald-100 text-emerald-700';
  if (val >= 60) return 'bg-amber-50 border-amber-100 text-amber-700';
  return 'bg-red-50 border-red-100 text-red-650';
}
function getBarColor(val: number) {
  if (val >= 85) return 'bg-emerald-500';
  if (val >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}
function getConfidenceColor(val: number) {
  if (val >= 75) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  if (val >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-red-600 bg-red-50 border-red-200';
}

// Normalize V2 score (object with .score) or V1 score (plain number) → number
function scoreVal(s: { score: number; reason: string } | number | undefined): number {
  if (!s) return 0;
  if (typeof s === 'number') return s;
  return s.score;
}
function scoreReason(s: { score: number; reason: string } | number | undefined): string | null {
  if (!s || typeof s === 'number') return null;
  return s.reason;
}

// ─── Pipeline Stepper Component ───────────────────────────────────────────────
function PipelineStepper({ activeStage }: { activeStage: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm animate-slide-up-fade">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-violet-600" />
        Running V2 Intelligence Pipeline
      </p>
      <div className="flex flex-col gap-2.5">
        {PIPELINE_STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isActive = idx === activeStage;
          const isDone = idx < activeStage;
          return (
            <div
              key={stage.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 ${
                isActive ? 'bg-violet-50 border border-violet-200' :
                isDone  ? 'bg-emerald-50 border border-emerald-100' :
                           'bg-slate-50 border border-slate-100 opacity-40'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                isActive ? 'bg-violet-600 animate-pipeline-pulse' :
                isDone  ? 'bg-emerald-500' : 'bg-slate-200'
              }`}>
                {isDone
                  ? <Check className="w-3 h-3 text-white" />
                  : <Icon className={`w-3 h-3 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold ${isActive ? 'text-violet-800' : isDone ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {stage.label}
                </p>
                {isActive && (
                  <p className="text-[10px] text-violet-600 mt-0.5">{stage.description}…</p>
                )}
              </div>
              {isActive && (
                <RefreshCw className="w-3.5 h-3.5 text-violet-500 animate-spin flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Clarification Card Component ─────────────────────────────────────────────
function ClarificationCard({
  result,
  onReoptimize,
}: {
  result: AIResultV2;
  onReoptimize: (answers: string[]) => void;
}) {
  const [answers, setAnswers] = useState<string[]>((result.questions || []).map(() => ''));

  const handleReoptimize = () => {
    onReoptimize(answers);
  };

  return (
    <div className="animate-slide-up-fade flex flex-col gap-5">
      {/* Header */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4.5 h-4.5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-amber-900 mb-1">More context needed</h3>
            <p className="text-xs text-amber-700 leading-relaxed">
              The pipeline detected insufficient context to optimize safely. Answer the questions below so PromptPilot can proceed with high confidence.
            </p>
          </div>
          {/* Confidence badge */}
          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border flex-shrink-0 ${getConfidenceColor(result.confidence)}`}>
            {result.confidence}% confidence
          </span>
        </div>

        {/* Detected tags */}
        {(result.intent || result.domain) && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-amber-200">
            {result.intent && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-white border border-amber-200 text-amber-700">
                Intent: {result.intent}
              </span>
            )}
            {result.domain && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-white border border-amber-200 text-amber-700">
                Domain: {result.domain}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="flex flex-col gap-3">
        {(result.questions || []).map((question, idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2 shadow-sm">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-violet-700">{idx + 1}</span>
              </span>
              <p className="text-sm font-medium text-slate-800 leading-relaxed">{question}</p>
            </div>
            <textarea
              value={answers[idx]}
              onChange={(e) => {
                const updated = [...answers];
                updated[idx] = e.target.value;
                setAnswers(updated);
              }}
              placeholder="Type your answer here…"
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-lg p-3 text-sm text-slate-800 outline-none resize-none transition-all leading-relaxed"
            />
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={handleReoptimize}
        disabled={answers.every(a => !a.trim())}
        className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-violet-650 to-indigo-650 hover:from-violet-500 hover:to-indigo-500 text-sm font-bold text-white transition-all shadow-md shadow-indigo-600/10 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Sparkles className="w-4 h-4" />
        Answer & Re-optimize
      </button>
    </div>
  );
}

// ─── Rejection Card Component ─────────────────────────────────────────────────
function RejectionCard({ result, onReset }: { result: AIResultV2; onReset: () => void }) {
  return (
    <div className="animate-slide-up-fade bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center flex-shrink-0">
          <XCircle className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-red-900 mb-1">Request could not be processed</h3>
          <p className="text-xs text-red-700 leading-relaxed">
            {result.reason || 'This request contains content that violates our usage policy and cannot be processed.'}
          </p>
        </div>
      </div>
      <button
        onClick={onReset}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-sm font-semibold text-red-700 transition-all"
      >
        <RotateCcw className="w-4 h-4" />
        Clear & start over
      </button>
    </div>
  );
}

// ─── Optimized Result Component ───────────────────────────────────────────────
function OptimizedResult({
  result,
  text,
  session,
  action,
}: {
  result: AIResultV2;
  text: string;
  session: any;
  action: 'optimize' | 'rewrite';
}) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeVariation, setActiveVariation] = useState<number | null>(null);

  const currentOutputText = activeVariation !== null
    ? (result.variations?.[activeVariation] ?? result.optimized_text ?? '')
    : (result.optimized_text ?? '');

  const handleCopy = () => {
    navigator.clipboard.writeText(currentOutputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToLibrary = async () => {
    try {
      const { error: saveError } = await supabase
        .from('prompts')
        .insert({
          user_id: session?.user.id,
          title: `Optimized: ${text.substring(0, 25)}…`,
          content: currentOutputText,
          category: action === 'optimize' ? 'Optimization' : 'Rewrite',
        });
      if (saveError) throw saveError;
      setSaved(true);
    } catch (err) {
      console.error('Failed to save to library:', err);
    }
  };

  const scoreBreakdown = [
    { label: 'Clarity',     val: result.score?.clarity },
    { label: 'Context',     val: result.score?.context },
    { label: 'Constraints', val: result.score?.constraints },
    { label: 'Structure',   val: result.score?.structure },
    { label: 'Specificity', val: result.score?.specificity },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8 animate-fade-in scroll-mt-20">

      {/* OUTPUT */}
      <div className="lg:col-span-2 flex flex-col gap-5 xl:gap-6 bg-white border border-slate-200 p-5 xl:p-6 rounded-2xl xl:rounded-3xl shadow-sm">
        {/* Header row */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-4 gap-3 flex-wrap">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              Optimized Result
            </h3>
            {/* V2 Tags */}
            <div className="flex gap-2 flex-wrap">
              {result.intent && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-violet-50 border border-violet-200 text-violet-700">
                  {result.intent}
                </span>
              )}
              {result.domain && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700">
                  {result.domain}
                </span>
              )}
              {result.confidence != null && (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getConfidenceColor(result.confidence)}`}>
                  {result.confidence}% confidence
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5 text-xs xl:text-sm font-semibold shadow-sm"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={handleSaveToLibrary}
              disabled={saved}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5 text-xs xl:text-sm font-semibold disabled:opacity-50 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              {saved ? 'Saved' : 'Save to Library'}
            </button>
          </div>
        </div>

        <textarea
          readOnly
          value={currentOutputText}
          className="w-full h-80 xl:h-100 bg-slate-50 border border-slate-200 rounded-xl p-4 xl:p-6 text-sm xl:text-base text-slate-900 outline-none resize-none leading-relaxed font-mono"
        />

        {/* Improvements list */}
        {result.improvements && result.improvements.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
            <label className="text-[10px] xl:text-[11px] uppercase font-bold text-slate-400 mb-2.5 block flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              Improvements Made
            </label>
            <div className="flex flex-wrap gap-2">
              {result.improvements.map((imp, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 font-medium">
                  {imp}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Variations */}
        {result.variations && result.variations.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
            <label className="text-[10px] xl:text-[11px] uppercase font-bold text-slate-400 mb-2.5 block">Alternative Variations</label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <button
                onClick={() => setActiveVariation(null)}
                className={`p-3 xl:p-4 rounded-xl xl:rounded-2xl border text-left text-xs xl:text-sm transition-all ${
                  activeVariation === null
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-750 font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-sm'
                }`}
              >
                <span className="font-bold block mb-1">Standard Version</span>
                <span className="line-clamp-2">{result.optimized_text}</span>
              </button>
              {result.variations.map((v, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveVariation(idx)}
                  className={`p-3 xl:p-4 rounded-xl xl:rounded-2xl border text-left text-xs xl:text-sm transition-all ${
                    activeVariation === idx
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-750 font-bold'
                      : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <span className="font-bold block mb-1">Variation {String.fromCharCode(65 + idx)}</span>
                  <span className="line-clamp-2">{v}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SCORES + EXPLANATIONS */}
      <div className="flex flex-col gap-6">

        {/* Score Panel */}
        {result.score && (
          <div className="bg-white border border-slate-200 p-5 xl:p-6 rounded-2xl xl:rounded-3xl flex flex-col gap-4 shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm xl:text-base font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-600" />
                Prompt Score
              </h3>
              <span className={`text-sm xl:text-base font-extrabold px-2 xl:px-3 py-0.5 xl:py-1 rounded border ${getScoreColor(scoreVal(result.score.overall))}`}>
                {scoreVal(result.score.overall)}/100
              </span>
            </div>
            <div className="flex flex-col gap-3.5">
              {scoreBreakdown.map((s) => {
                const val = scoreVal(s.val);
                const reason = scoreReason(s.val);
                return (
                  <div key={s.label} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-500">{s.label}</span>
                      <span className="text-slate-900">{val}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getBarColor(val)}`}
                        style={{ width: `${val}%` }}
                      />
                    </div>
                    {reason && (
                      <p className="text-[10px] text-slate-400 leading-snug">{reason}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Explanations */}
        {result.explanations && result.explanations.length > 0 && (
          <div className="bg-white border border-slate-200 p-5 xl:p-6 rounded-2xl xl:rounded-3xl flex flex-col gap-4 flex-1 shadow-sm">
            <h3 className="text-sm xl:text-base font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-3">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              Explain Improvements
            </h3>
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[300px] xl:max-h-[400px] pr-1">
              {result.explanations.map((exp, idx) => (
                <div key={idx} className="p-3 xl:p-4 bg-slate-50 border border-slate-200 rounded-xl xl:rounded-2xl flex flex-col gap-1 xl:gap-1.5">
                  <span className="text-xs xl:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 flex-shrink-0" />
                    {exp.action}
                  </span>
                  <span className="text-[11px] xl:text-xs text-slate-650">
                    <strong className="text-slate-400">Why:</strong> {exp.why}
                  </span>
                  <span className="text-[11px] xl:text-xs text-slate-650">
                    <strong className="text-slate-400">How:</strong> {exp.how}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {result.suggestions && result.suggestions.length > 0 && (
          <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col gap-3 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-3">
              <ChevronRight className="w-4 h-4 text-indigo-600" />
              Further Suggestions
            </h3>
            <ul className="flex flex-col gap-2">
              {result.suggestions.map((s, i) => (
                <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-slate-300 flex-shrink-0 mt-1.5" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Editor Page ─────────────────────────────────────────────────────────
export default function EditorPage() {
  const { session } = useAuth();
  const [text, setText] = useState(() => {
    if (typeof window !== 'undefined') {
      const scratch = localStorage.getItem('promptpilot_scratch');
      if (scratch) {
        localStorage.removeItem('promptpilot_scratch');
        globalCache.editor.text = scratch;
        return scratch;
      }
    }
    return globalCache.editor.text;
  });
  const [action, setAction] = useState<'optimize' | 'rewrite'>(() => globalCache.editor.action);
  const [tone, setTone] = useState(() => globalCache.editor.tone);
  const [length, setLength] = useState(() => globalCache.editor.length);
  const [platform, setPlatform] = useState(() => globalCache.editor.platform);

  const [loading, setLoading] = useState(false);
  const [pipelineStage, setPipelineStage] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AIResultV2 | null>(() => globalCache.editor.result as AIResultV2 | null);

  const resultRef = useRef<HTMLDivElement | null>(null);

  // Animate through pipeline stages while loading
  useEffect(() => {
    if (!loading) { setPipelineStage(0); return; }
    let stage = 0;
    const interval = setInterval(() => {
      stage = Math.min(stage + 1, PIPELINE_STAGES.length - 1);
      setPipelineStage(stage);
    }, 900);
    return () => clearInterval(interval);
  }, [loading]);

  // Auto-scroll to result
  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  // Load default tone from settings
  useEffect(() => {
    if (!session?.user) return;
    if (globalCache.editor.tone !== '') return;
    const userId = session.user.id;
    async function loadDefaultSettings() {
      try {
        const { data } = await supabase
          .from('settings')
          .select('default_tone')
          .eq('user_id', userId)
          .single();
        if (data?.default_tone) {
          setTone(data.default_tone);
          globalCache.editor.tone = data.default_tone;
        }
      } catch (e) {
        console.error('Failed to load default settings in editor:', e);
      }
    }
    loadDefaultSettings();
  }, [session]);

  // Sync state to cache
  useEffect(() => {
    globalCache.editor.text = text;
    globalCache.editor.action = action;
    globalCache.editor.tone = tone;
    globalCache.editor.length = length;
    globalCache.editor.platform = platform;
    globalCache.editor.result = result;
  }, [text, action, tone, length, platform, result]);

  const tones = [
    { value: '', label: 'Default' }, { value: 'professional', label: 'Professional' },
    { value: 'friendly', label: 'Friendly' }, { value: 'formal', label: 'Formal' },
    { value: 'casual', label: 'Casual' }, { value: 'executive', label: 'Executive' },
    { value: 'technical', label: 'Technical' }, { value: 'persuasive', label: 'Persuasive' },
  ];
  const lengths = [
    { value: '', label: 'Default' }, { value: 'shorten', label: 'Shorten' },
    { value: 'expand', label: 'Expand' }, { value: 'summarize', label: 'Summarize' },
    { value: 'simplify', label: 'Simplify' },
  ];
  const platforms = [
    { value: '', label: 'General AI' }, { value: 'chatgpt', label: 'ChatGPT (GPT-4o)' },
    { value: 'claude', label: 'Claude (Sonnet 3.5)' }, { value: 'gemini', label: 'Gemini (2.5 Flash)' },
    { value: 'deepseek', label: 'DeepSeek' },
  ];

  const submitRequest = async (payload: {
    text: string; action: string; tone?: string; length?: string; platform?: string; version: string;
  }) => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const token = session?.access_token;
      const response = await fetch('/api/prompt/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Server error occurred during processing.');
      }

      const data: AIResultV2 = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while connecting to AI services.');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = () => {
    if (!text.trim()) {
      setError('Please input some text or a prompt to process.');
      return;
    }
    submitRequest({ text, action, tone: tone || undefined, length: length || undefined, platform: platform || undefined, version: 'v2' });
  };

  const handleReoptimizeWithAnswers = (answers: string[]) => {
    if (!result?.questions) return;
    const clarificationContext = result.questions
      .map((q, i) => `Q: ${q}\nA: ${answers[i] || '(not answered)'}`)
      .join('\n\n');

    const enrichedText = `${text}\n\n--- Clarification Context ---\n${clarificationContext}`;
    submitRequest({ text: enrichedText, action, tone: tone || undefined, length: length || undefined, platform: platform || undefined, version: 'v2' });
  };

  const handleReset = () => {
    setResult(null);
    setError('');
  };

  return (
    <div className="flex-1 flex flex-col gap-6 xl:gap-8 max-w-7xl mx-auto w-full">

      {/* INPUT PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8">
        <div className="lg:col-span-2 flex flex-col gap-5 xl:gap-6 bg-white border border-slate-200 p-5 xl:p-6 rounded-2xl xl:rounded-3xl shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-600" />
              Input Draft
            </h2>
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setAction('optimize')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  action === 'optimize' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Optimize Prompt
              </button>
              <button
                onClick={() => setAction('rewrite')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  action === 'rewrite' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rewrite Text
              </button>
            </div>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              action === 'optimize'
                ? 'Type or paste a weak prompt here (e.g. "write a blog post about web development")'
                : 'Type or paste your message here (e.g. "hey can u do this draft copy today")'
            }
            className="w-full h-60 xl:h-80 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl xl:rounded-2xl p-4 xl:p-6 text-sm xl:text-base text-slate-800 outline-none resize-none leading-relaxed transition-all"
          />

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col gap-1 xl:gap-1.5">
                <label className="text-[10px] xl:text-[11px] uppercase font-bold text-slate-400">Tone</label>
                <select value={tone} onChange={(e) => setTone(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg xl:rounded-xl px-3 py-1.5 xl:px-4 xl:py-2.5 text-xs xl:text-sm text-slate-700 outline-none focus:border-indigo-500">
                  {tones.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1 xl:gap-1.5">
                <label className="text-[10px] xl:text-[11px] uppercase font-bold text-slate-400">Length</label>
                <select value={length} onChange={(e) => setLength(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg xl:rounded-xl px-3 py-1.5 xl:px-4 xl:py-2.5 text-xs xl:text-sm text-slate-700 outline-none focus:border-indigo-500">
                  {lengths.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1 xl:gap-1.5">
                <label className="text-[10px] xl:text-[11px] uppercase font-bold text-slate-400">Platform</label>
                <select value={platform} onChange={(e) => setPlatform(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg xl:rounded-xl px-3 py-1.5 xl:px-4 xl:py-2.5 text-xs xl:text-sm text-slate-700 outline-none focus:border-indigo-500">
                  {platforms.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={handleProcess}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 xl:px-8 h-10 xl:h-12 rounded-xl bg-gradient-to-r from-violet-650 to-indigo-650 hover:from-violet-500 hover:to-indigo-500 text-sm xl:text-base font-bold text-white transition-all shadow-md shadow-indigo-600/10 disabled:opacity-50"
            >
              {loading
                ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Analyzing…</span></>
                : <><Sparkles className="w-4 h-4 text-white" /><span>Run V2 Pipeline</span></>
              }
            </button>
          </div>
        </div>

        {/* INFO PANEL */}
        <div className="flex flex-col gap-5 xl:gap-6 bg-white border border-slate-200 p-5 xl:p-6 rounded-2xl xl:rounded-3xl shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-4">
            <BarChart2 className="w-4 h-4 text-violet-600" />
            V2 Intelligence Engine
          </h2>
          <div className="flex flex-col gap-3 text-xs text-slate-600 leading-relaxed">
            {PIPELINE_STAGES.map((stage) => {
              const Icon = stage.icon;
              return (
                <div key={stage.id} className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3 h-3 text-violet-600" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">{stage.label} —</span>{' '}
                    <span className="text-slate-500">{stage.description}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-3 rounded-xl bg-violet-50 border border-violet-100 mt-auto">
            <p className="text-[10px] font-bold text-violet-700 mb-0.5">Hallucination Prevention</p>
            <p className="text-[10px] text-violet-600 leading-relaxed">
              If confidence is too low, V2 asks questions instead of guessing. A clarification is always preferred over an incorrect result.
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-650 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Pipeline Stepper (while loading) */}
      {loading && (
        <div ref={resultRef} className="scroll-mt-20">
          <PipelineStepper activeStage={pipelineStage} />
        </div>
      )}

      {/* Result Area */}
      {!loading && result && (
        <div ref={resultRef} className="scroll-mt-20">
          {result.status === 'needs_clarification' && (
            <ClarificationCard result={result} onReoptimize={handleReoptimizeWithAnswers} />
          )}
          {result.status === 'rejected' && (
            <RejectionCard result={result} onReset={handleReset} />
          )}
          {result.status === 'optimized' && (
            <OptimizedResult result={result} text={text} session={session} action={action} />
          )}
        </div>
      )}
    </div>
  );
}
