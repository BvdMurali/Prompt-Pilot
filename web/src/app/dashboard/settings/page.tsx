'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Settings, Save, Key, Database, Trash2, Check, AlertTriangle, ShieldCheck, Download } from 'lucide-react';

export default function SettingsPage() {
  const { session, signOut } = useAuth();
  
  // Settings values
  const [model, setModel] = useState('gemini-2.5-flash');
  const [tone, setTone] = useState('professional');
  const [theme, setTheme] = useState('dark');
  
  // API Keys
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');

  // Statuses
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      if (!session?.user) return;
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
          setModel(data.preferred_model);
          setTone(data.default_tone);
          setTheme(data.theme);
          
          const keys = data.api_key_override || {};
          setGeminiKey(keys.gemini || '');
          setOpenaiKey(keys.openai || '');
          setAnthropicKey(keys.anthropic || '');
          setOpenrouterKey(keys.openrouter || '');
        }
      } catch (err) {
        setError('Failed to fetch settings: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [session]);

  const handleSaveSettings = async () => {
    if (!session?.user) return;
    setSaving(true);
    setSuccess(false);
    setError('');

    try {
      const keys = {
        gemini: geminiKey.trim() || undefined,
        openai: openaiKey.trim() || undefined,
        anthropic: anthropicKey.trim() || undefined,
        openrouter: openrouterKey.trim() || undefined,
      };

      const { error } = await supabase
        .from('settings')
        .upsert({
          user_id: session.user.id,
          preferred_model: model,
          default_tone: tone,
          theme: theme,
          api_key_override: keys,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to update settings: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    if (!session?.user) return;
    try {
      const { data: prompts } = await supabase.from('prompts').select('*').eq('user_id', session.user.id);
      const { data: history } = await supabase.from('history').select('*').eq('user_id', session.user.id);
      const { data: settings } = await supabase.from('settings').select('*').eq('user_id', session.user.id).single();

      const exportObj = {
        user: {
          id: session.user.id,
          email: session.user.email,
        },
        settings,
        prompts,
        history,
        exportedAt: new Date().toISOString(),
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `promptpilot_export_${session.user.id}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      setError('Export failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDeleteAccount = async () => {
    if (!session?.user) return;
    try {
      // 1. Delete user profile from profile database (which cascades history, prompts, settings)
      const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('id', session.user.id);

      if (dbError) throw dbError;

      // 2. Sign out the user
      await signOut();
    } catch (err) {
      setError('Account deletion failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-48">
        <span className="text-sm text-slate-400">Loading settings configurations...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-8 xl:gap-12">
      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-12">
        
        {/* Core preferences */}
        <div className="lg:col-span-2 flex flex-col gap-6 xl:gap-8 bg-slate-900/40 border border-slate-900 p-6 xl:p-10 rounded-2xl xl:rounded-[2rem]">
          <h2 className="text-sm xl:text-lg font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 xl:gap-3 border-b border-slate-800 pb-4 xl:pb-6">
            <Settings className="w-4 h-4 xl:w-5 xl:h-5 text-violet-400" />
            <span>Preferences</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 xl:gap-8">
            <div className="flex flex-col gap-1.5 xl:gap-2.5">
              <label className="text-xs xl:text-sm font-semibold text-slate-300">Preferred AI Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl xl:rounded-2xl px-4 py-2.5 xl:px-6 xl:py-4 text-sm xl:text-base text-slate-200 outline-none"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Default)</option>
                <option value="gpt-4o-mini">GPT-4o Mini (Fast)</option>
                <option value="gpt-4o">GPT-4o (Premium)</option>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                <option value="google/gemini-2.5-flash:free">OpenRouter Gemini Flash (Free)</option>
                <option value="deepseek/deepseek-chat">OpenRouter DeepSeek Chat</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 xl:gap-2.5">
              <label className="text-xs xl:text-sm font-semibold text-slate-300">Default Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl xl:rounded-2xl px-4 py-2.5 xl:px-6 xl:py-4 text-sm xl:text-base text-slate-200 outline-none"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
                <option value="executive">Executive</option>
              </select>
            </div>
          </div>

          {/* API Credentials */}
          <h2 className="text-sm xl:text-lg font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 xl:gap-3 border-b border-slate-800 pt-6 xl:pt-8 pb-4 xl:pb-6">
            <Key className="w-4 h-4 xl:w-5 xl:h-5 text-violet-400" />
            <span>API Key Overrides (Optional)</span>
          </h2>

          <div className="flex flex-col gap-4 xl:gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-6">
              <div className="flex flex-col gap-1.5 xl:gap-2.5">
                <label className="text-xs xl:text-sm font-semibold text-slate-300">Google Gemini Key</label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="bg-slate-950 border border-slate-800 rounded-xl xl:rounded-2xl px-4 py-2 xl:px-6 xl:py-3.5 text-sm xl:text-base text-slate-200 outline-none font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5 xl:gap-2.5">
                <label className="text-xs xl:text-sm font-semibold text-slate-300">OpenAI Api Key</label>
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="bg-slate-950 border border-slate-800 rounded-xl xl:rounded-2xl px-4 py-2 xl:px-6 xl:py-3.5 text-sm xl:text-base text-slate-200 outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-6">
              <div className="flex flex-col gap-1.5 xl:gap-2.5">
                <label className="text-xs xl:text-sm font-semibold text-slate-300">Anthropic Key</label>
                <input
                  type="password"
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="bg-slate-950 border border-slate-800 rounded-xl xl:rounded-2xl px-4 py-2 xl:px-6 xl:py-3.5 text-sm xl:text-base text-slate-200 outline-none font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5 xl:gap-2.5">
                <label className="text-xs xl:text-sm font-semibold text-slate-300">OpenRouter Key</label>
                <input
                  type="password"
                  value={openrouterKey}
                  onChange={(e) => setOpenrouterKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="bg-slate-950 border border-slate-800 rounded-xl xl:rounded-2xl px-4 py-2 xl:px-6 xl:py-3.5 text-sm xl:text-base text-slate-200 outline-none font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-2 xl:pt-6 xl:mt-4">
            {error && <span className="text-xs xl:text-sm text-red-400">{error}</span>}
            {success && <span className="text-xs xl:text-sm text-emerald-400 flex items-center gap-1 xl:gap-1.5"><Check className="w-3.5 h-3.5 xl:w-4.5 xl:h-4.5" /> Settings Saved!</span>}
            {!error && !success && <span />}
            
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="inline-flex items-center gap-2 xl:gap-3 px-6 py-2 xl:px-8 xl:py-3.5 rounded-xl xl:rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-sm xl:text-base font-bold text-white transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4 xl:w-5 xl:h-5" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>

        {/* Security & Data exports */}
        <div className="flex flex-col gap-6 xl:gap-8 bg-slate-900/40 border border-slate-900 p-6 xl:p-10 rounded-2xl xl:rounded-[2rem] h-fit">
          <h2 className="text-sm xl:text-lg font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 xl:gap-3 border-b border-slate-800 pb-4 xl:pb-6">
            <Database className="w-4 h-4 xl:w-5 xl:h-5 text-violet-400" />
            <span>Account & Privacy</span>
          </h2>

          <div className="flex flex-col gap-6 xl:gap-8 text-sm xl:text-base text-slate-400">
            <div className="flex flex-col gap-2.5 xl:gap-4">
              <span className="font-bold text-white flex items-center gap-1.5 xl:gap-2.5">
                <ShieldCheck className="w-4 h-4 xl:w-5 xl:h-5 text-emerald-400" />
                <span>Privacy First Architecture</span>
              </span>
              <p className="text-xs xl:text-sm leading-relaxed">
                Your data is isolated securely using PostgreSQL Row Level Security (RLS). You hold the authority to export or permanently purge all record data.
              </p>
            </div>

            {/* Export block */}
            <div className="flex flex-col gap-2 xl:gap-3">
              <span className="font-semibold text-slate-300 xl:text-sm">Export Information</span>
              <button
                onClick={handleExportData}
                className="w-full inline-flex items-center justify-center gap-2 xl:gap-3 px-4 py-2 xl:py-3.5 rounded-xl xl:rounded-2xl border border-slate-800 hover:bg-slate-950 text-xs xl:text-sm font-semibold text-slate-300 transition-all"
              >
                <Download className="w-3.5 h-3.5 xl:w-4.5 xl:h-4.5" />
                <span>Export My Data</span>
              </button>
            </div>

            {/* Delete Block */}
            <div className="border-t border-slate-800 pt-6 xl:pt-8 flex flex-col gap-3 xl:gap-4">
              <span className="font-semibold text-slate-300 xl:text-sm">Danger Zone</span>
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full inline-flex items-center justify-center gap-2 xl:gap-3 px-4 py-2 xl:py-3.5 rounded-xl xl:rounded-2xl border border-red-900/50 hover:bg-red-950/20 text-xs xl:text-sm font-semibold text-red-400 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 xl:w-4.5 xl:h-4.5" />
                  <span>Delete My Account</span>
                </button>
              ) : (
                <div className="p-3 xl:p-5 bg-red-950/20 border border-red-900/40 rounded-xl xl:rounded-2xl flex flex-col gap-3 xl:gap-4">
                  <div className="flex gap-2 xl:gap-3 text-red-400 text-xs xl:text-sm leading-relaxed">
                    <AlertTriangle className="w-5 h-5 xl:w-6 xl:h-6 flex-shrink-0" />
                    <span>Are you sure? This deletes your library, templates, preferences, and logs forever.</span>
                  </div>
                  <div className="flex gap-2 xl:gap-3 justify-end">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="px-3 py-1 xl:px-4 xl:py-2 bg-slate-900 text-slate-400 rounded-lg xl:rounded-xl text-xs xl:text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      className="px-3 py-1 xl:px-4 xl:py-2 bg-red-650 hover:bg-red-550 text-white rounded-lg xl:rounded-xl text-xs xl:text-sm font-bold"
                    >
                      Confirm Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
