'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  Settings, Save, Key, Database, Trash2, Check, AlertTriangle, 
  ShieldCheck, Download, User, Lock, Eye, EyeOff, Copy, Camera, Loader2,
  Smartphone, QrCode
} from 'lucide-react';

const STANDARD_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gpt-4o-mini',
  'gpt-4o',
  'o1-mini',
  'o3-mini',
  'claude-3-5-sonnet',
  'claude-3-5-haiku',
  'google/gemini-2.5-flash:free',
  'deepseek/deepseek-chat',
  'deepseek/deepseek-r1',
  'meta-llama/llama-3.3-70b-instruct'
];

export default function SettingsPage() {
  const { session, signOut } = useAuth();
  
  // Profile settings
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  // Storage upload reference & state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Settings values
  const [model, setModel] = useState('gemini-3.1-flash-lite');
  const [customModel, setCustomModel] = useState('');
  const [tone, setTone] = useState('professional');
  const [theme, setTheme] = useState('dark');
  
  // API Keys
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');

  // Show/Hide credentials state
  const [showGemini, setShowGemini] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [showOpenrouter, setShowOpenrouter] = useState(false);

  // Statuses
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Mobile app build settings
  const [latestBuild, setLatestBuild] = useState<{
    version: string;
    build_number: number;
    file_size: number;
    created_at: string;
    download_url: string;
    release_notes?: string;
  } | null>(null);
  const [loadingBuild, setLoadingBuild] = useState(true);

  useEffect(() => {
    async function fetchLatestBuild() {
      try {
        const response = await fetch('/api/mobile/latest');
        if (response.ok) {
          const data = await response.json();
          setLatestBuild(data);
        }
      } catch (err) {
        console.error('Failed to load latest mobile build:', err);
      } finally {
        setLoadingBuild(false);
      }
    }
    fetchLatestBuild();
  }, []);

  useEffect(() => {
    async function loadSettings() {
      if (!session?.user) return;
      const user = session.user;
      try {
        // Fetch preferences and keys
        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
        
        if (settingsData) {
          const loadedModel = settingsData.preferred_model || 'gemini-3.1-flash-lite';
          if (STANDARD_MODELS.includes(loadedModel)) {
            setModel(loadedModel);
            setCustomModel('');
          } else {
            setModel('custom');
            setCustomModel(loadedModel);
          }
          setTone(settingsData.default_tone);
          setTheme(settingsData.theme);
          
          const keys = settingsData.api_key_override || {};
          setGeminiKey(keys.gemini || '');
          setOpenaiKey(keys.openai || '');
          setAnthropicKey(keys.anthropic || '');
          setOpenrouterKey(keys.openrouter || '');
        }

        // Fetch profile details
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('name, avatar_url')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') throw profileError;

        if (profileData) {
          setName(profileData.name || '');
          setAvatarUrl(profileData.avatar_url || '');
        } else {
          setName(user.user_metadata?.full_name || user.email?.split('@')[0] || '');
        }
      } catch (err) {
        setError('Failed to fetch settings: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [session]);

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user) return;

    // Validate image file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    // Validate file size under 2MB
    if (file.size > 2 * 1024 * 1024) {
      setError('Image file must be under 2MB.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess(false);

    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const filePath = `${session.user.id}/avatar-${Math.floor(Math.random() * 1000000)}.${fileExt}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Retrieve public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);

      // Save immediately to users table and Supabase Auth metadata for seamless UX
      const { error: profileError } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id);

      if (profileError) throw profileError;

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: name.trim(),
          avatar_url: publicUrl
        }
      });

      if (authError) throw authError;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to upload profile picture: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
      // Reset input value to allow selecting same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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

      const finalModel = model === 'custom' ? customModel.trim() : model;

      if (model === 'custom' && !customModel.trim()) {
        throw new Error('Please specify a custom model ID.');
      }

      // 1. Save Settings
      const { error: settingsError } = await supabase
        .from('settings')
        .upsert({
          user_id: session.user.id,
          preferred_model: finalModel,
          default_tone: tone,
          theme: theme,
          api_key_override: keys,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (settingsError) throw settingsError;

      // 2. Save Profile (Users table)
      const { error: profileError } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          avatar_url: avatarUrl.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id);

      if (profileError) throw profileError;

      // 3. Update Supabase Auth user metadata full_name & avatar_url
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: name.trim(),
          avatar_url: avatarUrl.trim()
        }
      });

      if (authError) throw authError;

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
    setDeleting(true);
    setError('');
    try {
      // 1. Soft delete user profile by setting deleted_at timestamp
      const { error: dbError } = await supabase
        .from('users')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', session.user.id);

      if (dbError) throw dbError;

      // 2. Sign out the user
      await signOut();
    } catch (err) {
      setError('Account deletion failed: ' + (err instanceof Error ? err.message : String(err)));
      setDeleting(false);
    }
  };

  const handleCopyUserId = () => {
    if (!session?.user) return;
    navigator.clipboard.writeText(session.user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-48">
        <span className="text-sm text-slate-400">Loading settings configurations...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6 xl:gap-8 max-w-7xl mx-auto w-full">
      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8">
        
        {/* Main Settings Area */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Profile Details Card */}
          <div className="flex flex-col gap-6 xl:gap-8 bg-white border border-slate-200 p-6 xl:p-8 rounded-2xl xl:rounded-3xl shadow-sm">
            <h2 className="text-sm xl:text-lg font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 xl:gap-3 border-b border-slate-100 pb-4 xl:pb-6">
              <User className="w-4 h-4 xl:w-5 xl:h-5 text-violet-600" />
              <span>Profile Details</span>
            </h2>

            <div className="flex flex-col md:flex-row items-center gap-6 xl:gap-8">
              <div className="flex-shrink-0">
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                />
                
                {/* Clickable Profile Image Container */}
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  className="group relative w-24 h-24 rounded-full border border-slate-200 overflow-hidden flex items-center justify-center cursor-pointer shadow-md shadow-indigo-600/5 hover:border-indigo-500/50 transition-colors disabled:cursor-not-allowed"
                  title="Upload profile picture from local device"
                >
                  {uploading ? (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                      <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-slate-50/90 flex flex-col items-center justify-center text-slate-800 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
                      <Camera className="w-5 h-5 text-indigo-600 mb-0.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Upload</span>
                    </div>
                  )}

                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={avatarUrl} 
                      alt={name || 'Avatar'} 
                      className="w-full h-full object-cover shadow-inner"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-violet-650 to-indigo-650 flex items-center justify-center text-3xl font-extrabold text-white uppercase">
                      {name ? name.substring(0, 2) : session?.user?.email?.substring(0, 2)}
                    </div>
                  )}
                </button>
              </div>

              <div className="flex-1 w-full flex flex-col gap-1.5 xl:gap-2.5">
                <label className="text-xs xl:text-sm font-semibold text-slate-750">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="E.g. Murali"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl xl:rounded-2xl px-4 py-2 xl:px-4.5 xl:py-2 text-sm xl:text-base text-slate-800 outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-6 pt-2">
              <div className="flex flex-col gap-1.5 xl:gap-2.5">
                <label className="text-xs xl:text-sm font-semibold text-slate-500">Email Address (Read-only)</label>
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl xl:rounded-2xl px-4 py-2 xl:px-4.5 xl:py-2 text-sm xl:text-base text-slate-400 cursor-not-allowed">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span className="truncate">{session?.user?.email}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 xl:gap-2.5">
                <label className="text-xs xl:text-sm font-semibold text-slate-500">User UID</label>
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl xl:rounded-2xl px-4 py-2 xl:px-4.5 xl:py-2 text-sm text-slate-400">
                  <span className="font-mono text-xs truncate max-w-[200px] xl:max-w-xs">{session?.user?.id}</span>
                  <button
                    onClick={handleCopyUserId}
                    className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors"
                    title="Copy User ID"
                  >
                    {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Core Preferences Card */}
          <div className="flex flex-col gap-6 xl:gap-8 bg-white border border-slate-200 p-6 xl:p-8 rounded-2xl xl:rounded-3xl shadow-sm">
            <h2 className="text-sm xl:text-lg font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 xl:gap-3 border-b border-slate-100 pb-4 xl:pb-6">
              <Settings className="w-4 h-4 xl:w-5 xl:h-5 text-violet-600" />
              <span>Workspace Preferences</span>
            </h2>

            <div className="flex flex-col gap-6 xl:gap-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 xl:gap-8">
                <div className="flex flex-col gap-1.5 xl:gap-2.5">
                  <label className="text-xs xl:text-sm font-semibold text-slate-700">Preferred AI Model</label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl xl:rounded-2xl px-4 py-2 xl:px-4.5 xl:py-2 text-sm xl:text-base text-slate-800 outline-none focus:border-indigo-500/50 transition-colors"
                  >
                    <optgroup label="Google Gemini (Direct)">
                      <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Default)</option>
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                      <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                    </optgroup>
                    
                    <optgroup label="OpenAI (Direct)">
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                      <option value="gpt-4o">GPT-4o Premium</option>
                      <option value="o1-mini">o1 Mini (Reasoning)</option>
                      <option value="o3-mini">o3 Mini (Reasoning)</option>
                    </optgroup>
                    
                    <optgroup label="Anthropic Claude (Direct)">
                      <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                      <option value="claude-3-5-haiku">Claude 3.5 Haiku</option>
                    </optgroup>
                    
                    <optgroup label="OpenRouter (API Proxy)">
                      <option value="google/gemini-2.5-flash:free">OpenRouter: Gemini Flash (Free)</option>
                      <option value="deepseek/deepseek-chat">OpenRouter: DeepSeek V3 Chat</option>
                      <option value="deepseek/deepseek-r1">OpenRouter: DeepSeek R1</option>
                      <option value="meta-llama/llama-3.3-70b-instruct">OpenRouter: Llama 3.3 70B</option>
                    </optgroup>

                    <optgroup label="Other">
                      <option value="custom">Custom Model...</option>
                    </optgroup>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 xl:gap-2.5">
                  <label className="text-xs xl:text-sm font-semibold text-slate-700">Default Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl xl:rounded-2xl px-4 py-2 xl:px-4.5 xl:py-2 text-sm xl:text-base text-slate-800 outline-none focus:border-indigo-500/50 transition-colors"
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="casual">Casual</option>
                    <option value="executive">Executive</option>
                  </select>
                </div>
              </div>

              {model === 'custom' && (
                <div className="flex flex-col gap-1.5 xl:gap-2.5 animate-fade-in">
                  <label className="text-xs xl:text-sm font-semibold text-slate-700">Custom Model ID</label>
                  <input
                    type="text"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder="E.g. meta-llama/llama-3-8b-instruct or custom-fine-tuned-model"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl xl:rounded-2xl px-4 py-2 xl:px-4.5 xl:py-2 text-sm xl:text-base text-slate-800 outline-none focus:border-indigo-500/50 transition-colors font-mono"
                  />
                  <span className="text-[10px] xl:text-[11px] text-slate-500">
                    Type the exact model identifier required by your API provider (e.g. OpenAI model ID, OpenRouter route path, etc.).
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* API Credentials Card */}
          <div className="flex flex-col gap-6 xl:gap-8 bg-white border border-slate-200 p-6 xl:p-8 rounded-2xl xl:rounded-3xl shadow-sm">
            <h2 className="text-sm xl:text-lg font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 xl:gap-3 border-b border-slate-100 pb-4 xl:pb-6">
              <Key className="w-4 h-4 xl:w-5 xl:h-5 text-violet-600" />
              <span>API Key Overrides (Optional)</span>
            </h2>

            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5 xl:gap-2.5">
                  <label className="text-xs xl:text-sm font-semibold text-slate-700">Google Gemini Key</label>
                  <div className="relative flex items-center">
                    <input
                      type={showGemini ? "text" : "password"}
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder={geminiKey ? "••••••••••••••••" : "AIzaSy..."}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl xl:rounded-2xl pl-4 pr-12 py-2 xl:pl-5 xl:pr-12 xl:py-2 text-sm xl:text-base text-slate-800 outline-none font-mono focus:border-indigo-500/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGemini(!showGemini)}
                      className="absolute right-4 p-1 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      {showGemini ? <EyeOff className="w-4 h-4 xl:w-5 xl:h-5" /> : <Eye className="w-4 h-4 xl:w-5 xl:h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 xl:gap-2.5">
                  <label className="text-xs xl:text-sm font-semibold text-slate-700">OpenAI API Key</label>
                  <div className="relative flex items-center">
                    <input
                      type={showOpenai ? "text" : "password"}
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      placeholder={openaiKey ? "••••••••••••••••" : "sk-proj-..."}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl xl:rounded-2xl pl-4 pr-12 py-2 xl:pl-5 xl:pr-12 xl:py-2 text-sm xl:text-base text-slate-800 outline-none font-mono focus:border-indigo-500/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpenai(!showOpenai)}
                      className="absolute right-4 p-1 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      {showOpenai ? <EyeOff className="w-4 h-4 xl:w-5 xl:h-5" /> : <Eye className="w-4 h-4 xl:w-5 xl:h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5 xl:gap-2.5">
                  <label className="text-xs xl:text-sm font-semibold text-slate-700">Anthropic Key</label>
                  <div className="relative flex items-center">
                    <input
                      type={showAnthropic ? "text" : "password"}
                      value={anthropicKey}
                      onChange={(e) => setAnthropicKey(e.target.value)}
                      placeholder={anthropicKey ? "••••••••••••••••" : "sk-ant-..."}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl xl:rounded-2xl pl-4 pr-12 py-2 xl:pl-5 xl:pr-12 xl:py-2 text-sm xl:text-base text-slate-800 outline-none font-mono focus:border-indigo-500/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAnthropic(!showAnthropic)}
                      className="absolute right-4 p-1 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      {showAnthropic ? <EyeOff className="w-4 h-4 xl:w-5 xl:h-5" /> : <Eye className="w-4 h-4 xl:w-5 xl:h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 xl:gap-2.5">
                  <label className="text-xs xl:text-sm font-semibold text-slate-700">OpenRouter Key</label>
                  <div className="relative flex items-center">
                    <input
                      type={showOpenrouter ? "text" : "password"}
                      value={openrouterKey}
                      onChange={(e) => setOpenrouterKey(e.target.value)}
                      placeholder={openrouterKey ? "••••••••••••••••" : "sk-or-v1-..."}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl xl:rounded-2xl pl-4 pr-12 py-2 xl:pl-5 xl:pr-12 xl:py-2 text-sm xl:text-base text-slate-800 outline-none font-mono focus:border-indigo-500/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpenrouter(!showOpenrouter)}
                      className="absolute right-4 p-1 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      {showOpenrouter ? <EyeOff className="w-4 h-4 xl:w-5 xl:h-5" /> : <Eye className="w-4 h-4 xl:w-5 xl:h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Save Actions Bar */}
          <div className="flex items-center justify-between bg-white border border-slate-200 p-5 xl:p-6 rounded-2xl xl:rounded-3xl shadow-sm">
            <div className="flex-1">
              {error && <span className="text-xs xl:text-sm text-red-500 font-semibold">{error}</span>}
              {success && <span className="text-xs xl:text-sm text-emerald-600 flex items-center gap-1.5 font-semibold"><Check className="w-4 h-4 text-emerald-600" /> Settings Saved!</span>}
            </div>
            
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="inline-flex items-center gap-2 xl:gap-3 px-6 py-2 xl:px-6 xl:py-2 rounded-xl xl:rounded-2xl bg-indigo-650 hover:bg-indigo-750 text-sm xl:text-base font-bold text-white transition-all shadow-md shadow-indigo-650/10 hover:shadow-indigo-650/20 disabled:opacity-50"
            >
              <Save className="w-4 h-4 xl:w-5 xl:h-5" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>

        </div>

        {/* Security & Data exports panel */}
        <div className="flex flex-col gap-6">
          
          {/* Privacy info card */}
          <div className="flex flex-col gap-6 xl:gap-8 bg-white border border-slate-200 p-6 xl:p-8 rounded-2xl xl:rounded-3xl shadow-sm h-fit">
            <h2 className="text-sm xl:text-lg font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 xl:gap-3 border-b border-slate-200 pb-4 xl:pb-6">
              <Database className="w-4 h-4 xl:w-5 xl:h-5 text-violet-600" />
              <span>Account & Privacy</span>
            </h2>

            <div className="flex flex-col gap-6 xl:gap-8 text-sm xl:text-base text-slate-650">
              <div className="flex flex-col gap-2.5 xl:gap-4">
                <span className="font-bold text-slate-900 flex items-center gap-1.5 xl:gap-2.5">
                  <ShieldCheck className="w-4 h-4 xl:w-5 xl:h-5 text-emerald-600" />
                  <span>Privacy First Architecture</span>
                </span>
                <p className="text-xs xl:text-sm leading-relaxed text-slate-500">
                  Your data is isolated securely using PostgreSQL Row Level Security (RLS). You hold the authority to export or permanently purge all record data.
                </p>
              </div>

              {/* Export block */}
              <div className="flex flex-col gap-3 border-t border-slate-100 pt-6">
                <span className="font-semibold text-slate-755 text-xs xl:text-sm">Export Information</span>
                <button
                  onClick={handleExportData}
                  className="w-full inline-flex items-center justify-center gap-2 xl:gap-3 px-4 py-2 xl:py-2 rounded-xl xl:rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs xl:text-sm font-semibold text-slate-700 transition-all cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 xl:w-4.5 xl:h-4.5" />
                  <span>Export My Data</span>
                </button>
              </div>

              {/* Delete Block */}
              <div className="border-t border-slate-100 pt-6 flex flex-col gap-3">
                <span className="font-semibold text-slate-755 text-xs xl:text-sm">Danger Zone</span>
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full inline-flex items-center justify-center gap-2 xl:gap-3 px-4 py-2 xl:py-2 rounded-xl xl:rounded-2xl border border-red-200 hover:border-red-300 hover:bg-red-50 text-xs xl:text-sm font-semibold text-red-650 transition-all cursor-pointer shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5 xl:w-4.5 xl:h-4.5" />
                    <span>Delete My Account</span>
                  </button>
                ) : (
                  <div className="p-4 xl:p-5 bg-red-50/80 border border-red-200 rounded-xl xl:rounded-2xl flex flex-col gap-4 shadow-sm">
                    <div className="flex gap-2.5 text-red-700 text-xs xl:text-sm leading-relaxed">
                      <AlertTriangle className="w-5 h-5 xl:w-6 xl:h-6 flex-shrink-0 text-red-500" />
                      <div className="flex flex-col gap-1.5">
                        <span className="font-bold text-red-800">This action is permanent and irreversible!</span>
                        <span>It will delete your display settings, saved prompt library, version history, and optimization logs forever.</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">
                        Type <span className="font-mono text-red-600 select-all">{session?.user?.email}</span> to confirm:
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="Type your email address"
                        className="bg-white border border-red-200 rounded-xl px-4 py-2 text-xs xl:text-sm text-slate-900 outline-none focus:border-red-500/50 transition-colors font-mono"
                        disabled={deleting}
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        onClick={() => {
                          setConfirmDelete(false);
                          setDeleteConfirmText('');
                        }}
                        className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl text-xs xl:text-sm font-semibold transition-colors cursor-pointer shadow-sm"
                        disabled={deleting}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== session?.user?.email || deleting}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-650 hover:bg-red-700 disabled:bg-red-50 disabled:text-red-300 disabled:border-red-100 text-white border border-red-650 rounded-xl text-xs xl:text-sm font-extrabold shadow-md active:scale-[0.97] transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
                      >
                        {deleting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Deleting...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Permanently Delete</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Application Card */}
          <div className="flex flex-col gap-6 xl:gap-8 bg-white border border-slate-200 p-6 xl:p-8 rounded-2xl xl:rounded-3xl shadow-sm h-fit">
            <h2 className="text-sm xl:text-lg font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 xl:gap-3 border-b border-slate-200 pb-4 xl:pb-6">
              <Smartphone className="w-4 h-4 xl:w-5 xl:h-5 text-violet-600" />
              <span>Mobile Application</span>
            </h2>

            <div className="flex flex-col gap-6 text-sm xl:text-base text-slate-650">
              <p className="text-xs xl:text-sm leading-relaxed text-slate-500">
                Get the latest version of the PromptPilot Android mobile app to use AI-powered optimizations directly on your phone.
              </p>

              {loadingBuild ? (
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                  <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
                  <span className="text-xs text-slate-400">Fetching latest build details...</span>
                </div>
              ) : latestBuild ? (
                <div className="flex flex-col gap-4">
                  {/* Build metadata */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-2 text-xs xl:text-sm">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-500">Version</span>
                      <span className="font-bold text-slate-800">v{latestBuild.version} ({latestBuild.build_number})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-500">File Size</span>
                      <span className="font-bold text-slate-800">
                        {(latestBuild.file_size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-500">Released</span>
                      <span className="font-bold text-slate-800">
                        {new Date(latestBuild.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  {latestBuild.release_notes && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-slate-500">Changelog</span>
                      <p className="text-xs bg-slate-50 border border-slate-100 rounded-lg p-3 text-slate-600 font-mono max-h-24 overflow-y-auto whitespace-pre-wrap">
                        {latestBuild.release_notes}
                      </p>
                    </div>
                  )}

                  {/* QR Code section */}
                  <div className="flex flex-col items-center gap-3 border-t border-slate-100 pt-5">
                    <span className="text-xs font-semibold text-slate-500">Scan to Download APK</span>
                    <div className="p-2 border border-slate-200 rounded-2xl bg-white shadow-sm hover:scale-[1.02] transition-transform duration-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                          typeof window !== 'undefined' ? `${window.location.origin}/api/mobile/latest?download=true` : ''
                        )}&color=4f46e5`}
                        alt="Download QR Code" 
                        className="w-40 h-40"
                      />
                    </div>
                    <span className="text-[10px] text-center text-slate-400 max-w-[200px] leading-relaxed">
                      Point your phone camera here to download directly.
                    </span>
                  </div>

                  {/* Download Button */}
                  <a
                    href="/api/mobile/latest?download=true"
                    className="w-full inline-flex items-center justify-center gap-2 xl:gap-3 px-4 py-3 rounded-xl xl:rounded-2xl bg-indigo-650 hover:bg-indigo-750 text-white font-bold text-sm xl:text-base shadow-md shadow-indigo-650/10 hover:shadow-indigo-650/20 transition-all text-center"
                  >
                    <Download className="w-4 h-4 xl:w-5 xl:h-5" />
                    <span>Download Latest APK</span>
                  </a>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Fallback showing Awaiting builds */}
                  <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 text-center flex flex-col items-center gap-3">
                    <QrCode className="w-12 h-12 text-slate-300 stroke-[1.5]" />
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-slate-700 text-xs xl:text-sm">No builds deployed yet</span>
                      <p className="text-[11px] xl:text-xs text-slate-400 max-w-[220px] leading-relaxed">
                        To activate downloads, trigger a mobile build in your EAS deployment pipeline. Deployed builds will appear here automatically.
                      </p>
                    </div>
                  </div>

                  {/* Disabled Download Button for UI placeholder */}
                  <button
                    disabled
                    className="w-full inline-flex items-center justify-center gap-2 xl:gap-3 px-4 py-3 rounded-xl xl:rounded-2xl bg-slate-100 text-slate-450 font-bold text-sm xl:text-base cursor-not-allowed border border-slate-200"
                  >
                    <Download className="w-4 h-4 xl:w-5 xl:h-5 text-slate-400" />
                    <span>Awaiting Pipeline Upload</span>
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
