'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Sparkles, Copy, Save, AlertCircle, RefreshCw, BarChart2, HelpCircle, Check, Zap } from 'lucide-react';
import { AIResult } from '@/lib/ai';
import { globalCache } from '@/lib/cache';

export default function EditorPage() {
  const { session } = useAuth();
  const [text, setText] = useState(() => globalCache.editor.text);
  const [action, setAction] = useState<'optimize' | 'rewrite'>(() => globalCache.editor.action);
  
  // Custom optimization options
  const [tone, setTone] = useState(() => globalCache.editor.tone);
  const [length, setLength] = useState(() => globalCache.editor.length);
  const [platform, setPlatform] = useState(() => globalCache.editor.platform);
  
  // Processing States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AIResult | null>(() => globalCache.editor.result);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(() => globalCache.editor.saved);
  const [activeVariation, setActiveVariation] = useState<number | null>(() => globalCache.editor.activeVariation);

  const resultRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to result when it is generated
  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  // Check for scratch prompt loaded from templates page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const scratch = localStorage.getItem('promptpilot_scratch');
      if (scratch) {
        setText(scratch);
        globalCache.editor.text = scratch;
        localStorage.removeItem('promptpilot_scratch');
      }
    }
  }, []);

  // Load settings default tone if not already cached
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

  // Sync state back to the cache
  useEffect(() => {
    globalCache.editor.text = text;
    globalCache.editor.action = action;
    globalCache.editor.tone = tone;
    globalCache.editor.length = length;
    globalCache.editor.platform = platform;
    globalCache.editor.result = result;
    globalCache.editor.activeVariation = activeVariation;
    globalCache.editor.saved = saved;
  }, [text, action, tone, length, platform, result, activeVariation, saved]);

  // Tones list
  const tones = [
    { value: '', label: 'Default' },
    { value: 'professional', label: 'Professional' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'formal', label: 'Formal' },
    { value: 'casual', label: 'Casual' },
    { value: 'executive', label: 'Executive' },
    { value: 'technical', label: 'Technical' },
    { value: 'persuasive', label: 'Persuasive' }
  ];

  // Lengths list
  const lengths = [
    { value: '', label: 'Default' },
    { value: 'shorten', label: 'Shorten' },
    { value: 'expand', label: 'Expand' },
    { value: 'summarize', label: 'Summarize' },
    { value: 'simplify', label: 'Simplify' }
  ];

  // Platforms list
  const platforms = [
    { value: '', label: 'General AI' },
    { value: 'chatgpt', label: 'ChatGPT (GPT-4o)' },
    { value: 'claude', label: 'Claude (Sonnet 3.5)' },
    { value: 'gemini', label: 'Gemini (3.5 Flash)' },
    { value: 'deepseek', label: 'DeepSeek' }
  ];

  const handleProcess = async () => {
    if (!text.trim()) {
      setError('Please input some text or a prompt to process.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setSaved(false);
    setActiveVariation(null);

    try {
      const token = session?.access_token;
      const response = await fetch('/api/prompt/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text,
          action,
          tone: tone || undefined,
          length: length || undefined,
          platform: platform || undefined
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Server error occurred during processing.');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while connecting to AI services.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (txtToCopy: string) => {
    navigator.clipboard.writeText(txtToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToLibrary = async () => {
    if (!result) return;
    try {
      const outputText = activeVariation !== null ? result.variations[activeVariation] : result.improved_text;
      
      const { error: saveError } = await supabase
        .from('prompts')
        .insert({
          user_id: session?.user.id,
          title: `Optimized: ${text.substring(0, 25)}...`,
          content: outputText,
          category: action === 'optimize' ? 'Optimization' : 'Rewrite'
        });

      if (saveError) throw saveError;
      setSaved(true);
    } catch (err) {
      setError('Failed to save to library: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const getScoreColor = (val: number) => {
    if (val >= 85) return 'bg-emerald-50 border-emerald-100 text-emerald-700';
    if (val >= 60) return 'bg-amber-50 border-amber-100 text-amber-700';
    return 'bg-red-50 border-red-100 text-red-650';
  };

  const currentOutputText = result 
    ? (activeVariation !== null ? result.variations[activeVariation] : result.improved_text)
    : '';

  return (
    <div className="flex-1 flex flex-col gap-6 xl:gap-8 max-w-7xl mx-auto w-full">
      {/* Selection Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8">
        
        {/* INPUT FORM BLOCK */}
        <div className="lg:col-span-2 flex flex-col gap-5 xl:gap-6 bg-white border border-slate-200 p-5 xl:p-6 rounded-2xl xl:rounded-3xl shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-600" />
              <span>Input Draft</span>
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
              {/* Tone Option */}
              <div className="flex flex-col gap-1 xl:gap-1.5">
                <label className="text-[10px] xl:text-[11px] uppercase font-bold text-slate-400">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg xl:rounded-xl px-3 py-1.5 xl:px-4 xl:py-2.5 text-xs xl:text-sm text-slate-700 outline-none focus:border-indigo-500"
                >
                  {tones.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {/* Length Option */}
              <div className="flex flex-col gap-1 xl:gap-1.5">
                <label className="text-[10px] xl:text-[11px] uppercase font-bold text-slate-400">Length</label>
                <select
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg xl:rounded-xl px-3 py-1.5 xl:px-4 xl:py-2.5 text-xs xl:text-sm text-slate-700 outline-none focus:border-indigo-500"
                >
                  {lengths.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>

              {/* Target Platform Option */}
              <div className="flex flex-col gap-1 xl:gap-1.5">
                <label className="text-[10px] xl:text-[11px] uppercase font-bold text-slate-400">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg xl:rounded-xl px-3 py-1.5 xl:px-4 xl:py-2.5 text-xs xl:text-sm text-slate-700 outline-none focus:border-indigo-500"
                >
                  {platforms.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={handleProcess}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 xl:px-8 h-10 xl:h-12 rounded-xl bg-gradient-to-r from-violet-650 to-indigo-650 hover:from-violet-500 hover:to-indigo-500 text-sm xl:text-base font-bold text-white transition-all shadow-md shadow-indigo-600/10 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>Optimize draft</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* CONTROLS INFO BLOCK */}
        <div className="flex flex-col gap-5 xl:gap-6 bg-white border border-slate-200 p-5 xl:p-6 rounded-2xl xl:rounded-3xl shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-4">
            <BarChart2 className="w-4 h-4 text-violet-600" />
            <span>Optimization Info</span>
          </h2>

          <div className="flex flex-col gap-4 text-sm text-slate-600 leading-relaxed">
            <p>
              Select <strong>Optimize Prompt</strong> if you are preparing instructions for LLMs. This will add rich structures, constraints, and outputs tailored to the target platform.
            </p>
            <p>
              Select <strong>Rewrite Text</strong> to clean up drafts, polish grammar, write emails, or adjust tone.
            </p>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 mt-2 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-slate-900 mb-1">Low Cost Abstraction</p>
                <p className="text-slate-500">PromptPilot handles all calls through server endpoints. Storing custom keys in settings allows unlimited models.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-650 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Result Section */}
      {result && (
        <div ref={resultRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8 animate-fade-in scroll-mt-20">
          
          {/* OUTPUT COMPONENT */}
          <div className="lg:col-span-2 flex flex-col gap-5 xl:gap-6 bg-white border border-slate-200 p-5 xl:p-6 rounded-2xl xl:rounded-3xl shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Optimized Result</span>
              </h3>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopy(currentOutputText)}
                  className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5 text-xs xl:text-sm font-semibold shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleSaveToLibrary}
                  disabled={saved}
                  className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5 text-xs xl:text-sm font-semibold disabled:opacity-50 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saved ? 'Saved' : 'Save to Library'}</span>
                </button>
              </div>
            </div>

            <textarea
              readOnly
              value={currentOutputText}
              className="w-full h-80 xl:h-100 bg-slate-50 border border-slate-200 rounded-xl p-4 xl:p-6 text-sm xl:text-base text-slate-900 outline-none resize-none leading-relaxed font-mono"
            />

            {/* Variations Drawer */}
            <div className="border-t border-slate-100 pt-4">
              <label className="text-[10px] xl:text-[11px] uppercase font-bold text-slate-400 mb-2.5 block">Alternative Variations</label>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <button
                  onClick={() => setActiveVariation(null)}
                  className={`p-3 xl:p-4.5 rounded-xl xl:rounded-2xl border text-left text-xs xl:text-sm transition-all ${
                    activeVariation === null
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-750 font-bold'
                      : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <span className="font-bold block mb-1">Standard Version</span>
                  <span className="line-clamp-2">{result.improved_text}</span>
                </button>
                {result.variations.map((v, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveVariation(idx)}
                    className={`p-3 xl:p-4.5 rounded-xl xl:rounded-2xl border text-left text-xs xl:text-sm transition-all ${
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
          </div>

          {/* SCORES AND EXPLANATIONS */}
          <div className="flex flex-col gap-6">
            
            {/* SCORE SYSTEM */}
            <div className="bg-white border border-slate-200 p-5 xl:p-6 rounded-2xl xl:rounded-3xl flex flex-col gap-4 shadow-sm">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm xl:text-base font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-indigo-600" />
                  <span>Prompt Score</span>
                </h3>
                <span className={`text-sm xl:text-base font-extrabold px-2 xl:px-3 py-0.5 xl:py-1 rounded border ${getScoreColor(result.score.overall)}`}>
                  {result.score.overall}/100
                </span>
              </div>

              {/* Score breakdowns */}
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Clarity', val: result.score.clarity },
                  { label: 'Context', val: result.score.context },
                  { label: 'Constraints', val: result.score.constraints },
                  { label: 'Structure', val: result.score.structure },
                  { label: 'Specificity', val: result.score.specificity },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-500">{s.label}</span>
                      <span className="text-slate-900">{s.val}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div 
                        className={`h-full rounded-full transition-all duration-550 ${getScoreColor(s.val).split(' ')[0]}`}
                        style={{ width: `${s.val}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* EXPLANATIONS LIST */}
            <div className="bg-white border border-slate-200 p-5 xl:p-6 rounded-2xl xl:rounded-3xl flex flex-col gap-4 flex-1 shadow-sm">
              <h3 className="text-sm xl:text-base font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-3">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                <span>Explain Improvements</span>
              </h3>

              <div className="flex flex-col gap-3 overflow-y-auto max-h-[300px] xl:max-h-[400px] 2xl:max-h-[500px] pr-1">
                {result.explanations.map((exp, idx) => (
                  <div key={idx} className="p-3 xl:p-4.5 bg-slate-50 border border-slate-200 rounded-xl xl:rounded-2xl flex flex-col gap-1 xl:gap-1.5">
                    <span className="text-xs xl:text-sm font-bold text-slate-900 flex items-center gap-1 xl:gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                      <span>{exp.action}</span>
                    </span>
                    <span className="text-[11px] xl:text-xs text-slate-650"><strong className="text-slate-400">Why:</strong> {exp.why}</span>
                    <span className="text-[11px] xl:text-xs text-slate-650"><strong className="text-slate-400">How:</strong> {exp.how}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
