'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Library, Search, Star, Trash2, Edit3, Copy, Plus, X, Save, AlertCircle } from 'lucide-react';
import { globalCache } from '@/lib/cache';

type PromptItem = {
  id: string;
  title: string;
  content: string;
  is_favorite: boolean;
  category: string;
  created_at: string;
};

export default function LibraryPage() {
  const { session } = useAuth();
  
  // Data State
  const [prompts, setPrompts] = useState<PromptItem[]>(() => globalCache.library.prompts);
  const [loading, setLoading] = useState(() => globalCache.library.prompts.length === 0);
  const [search, setSearch] = useState(() => globalCache.library.search);
  
  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');
  const [error, setError] = useState('');
  
  // Status states
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync search query to cache
  useEffect(() => {
    globalCache.library.search = search;
  }, [search]);

  const loadLibrary = async () => {
    if (!session?.user) return;
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrompts(data || []);
      globalCache.library.prompts = data || [];
    } catch (err) {
      setError('Failed to load library: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLibrary();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleFavoriteToggle = async (item: PromptItem) => {
    try {
      const { error } = await supabase
        .from('prompts')
        .update({ is_favorite: !item.is_favorite })
        .eq('id', item.id);

      if (error) throw error;
      
      setPrompts(prompts.map(p => 
        p.id === item.id ? { ...p, is_favorite: !p.is_favorite } : p
      ));
    } catch (err) {
      setError('Failed to update favorite: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleOpenCreate = () => {
    setIsEditing(true);
    setEditingId(null);
    setTitle('');
    setContent('');
    setCategory('General');
  };

  const handleOpenEdit = (item: PromptItem) => {
    setIsEditing(true);
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setCategory(item.category || 'General');
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Title and Content are required.');
      return;
    }
    setError('');

    try {
      if (editingId) {
        // Edit existing prompt
        const { error } = await supabase
          .from('prompts')
          .update({ title, content, category, updated_at: new Date().toISOString() })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        // Insert new prompt
        const { error } = await supabase
          .from('prompts')
          .insert({
            user_id: session?.user.id,
            title,
            content,
            category,
            is_favorite: false
          });

        if (error) throw error;
      }

      setIsEditing(false);
      loadLibrary();
    } catch (err) {
      setError('Failed to save prompt: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    try {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setPrompts(prompts.filter(p => p.id !== id));
    } catch (err) {
      setError('Failed to delete prompt: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleCopy = (txt: string, id: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter list
  const filteredPrompts = prompts.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.category.toLowerCase().includes(search.toLowerCase()) ||
    p.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col gap-6 xl:gap-8 max-w-7xl mx-auto w-full">
      
      {/* Search and Header panel */}
      <div className="flex flex-col sm:flex-row gap-4 xl:gap-6 items-center justify-between">
        <div className="relative w-full sm:max-w-md xl:max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 xl:w-5 xl:h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved prompts or categories..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 xl:pl-12 pr-4 py-2.5 xl:py-3.5 text-sm xl:text-base text-slate-800 outline-none focus:border-indigo-500 transition-all shadow-sm"
          />
        </div>

        <button
          onClick={handleOpenCreate}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 xl:px-8 xl:py-3.5 rounded-xl xl:rounded-2xl bg-indigo-650 hover:bg-indigo-750 text-sm xl:text-base font-bold text-white transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Save New Prompt</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Editor Modal Overlay */}
      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-5 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                {editingId ? 'Modify Prompt' : 'Create New Saved Prompt'}
              </h3>
              <button 
                onClick={() => setIsEditing(false)}
                className="text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Prompt Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Expert Copywriter Persona"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Marketing, Copywriting, Coding"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Prompt Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste or write prompt here..."
                  className="w-full h-48 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-900 outline-none resize-none leading-relaxed focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 hover:text-slate-900 text-xs font-semibold shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-indigo-650 hover:bg-indigo-750 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Prompt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompts Display */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <span className="text-sm text-slate-500">Retrieving saved library items...</span>
        </div>
      ) : filteredPrompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-200 rounded-2xl bg-white shadow-sm">
          <Library className="w-10 h-10 text-slate-400 mb-3" />
          <p className="text-sm font-semibold text-slate-900">Your prompt library is empty</p>
          <p className="text-xs text-slate-500 max-w-xs text-center mt-1">
            Save prompts from the optimizer workspace or add items manually using the top button.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 xl:gap-6">
          {filteredPrompts.map((item) => (
            <div 
              key={item.id}
              className="p-4 xl:p-5.5 rounded-2xl xl:rounded-3xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all flex flex-col gap-3.5 xl:gap-5 relative overflow-hidden group"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <span className="inline-block text-[10px] xl:text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold mb-2 uppercase tracking-wide">
                    {item.category || 'General'}
                  </span>
                  <h4 className="text-sm xl:text-base font-bold text-slate-900 truncate pr-6">{item.title}</h4>
                </div>

                <button
                  onClick={() => handleFavoriteToggle(item)}
                  className="absolute top-5 right-5 xl:top-8 xl:right-8 text-slate-400 hover:text-amber-500 transition-colors"
                >
                  <Star className={`w-4.5 h-4.5 xl:w-5.5 xl:h-5.5 ${item.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                </button>
              </div>

              <p className="text-xs xl:text-sm text-slate-800 line-clamp-4 font-mono leading-relaxed bg-slate-50 p-3 xl:p-4.5 rounded-lg xl:rounded-xl border border-slate-100 flex-1">
                {item.content}
              </p>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 xl:pt-4 mt-1">
                <span className="text-[10px] xl:text-[11px] text-slate-500">
                  Saved {new Date(item.created_at).toLocaleDateString()}
                </span>
                
                <div className="flex gap-1.5 xl:gap-2">
                  <button
                    onClick={() => handleCopy(item.content, item.id)}
                    className="p-1.5 xl:px-2.5 xl:py-2 rounded bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-650 hover:text-slate-900 transition-all flex items-center gap-1 xl:gap-1.5 text-[10px] xl:text-xs font-bold shadow-sm"
                  >
                    <Copy className="w-3 h-3 xl:w-4 xl:h-4" />
                    <span>{copiedId === item.id ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 xl:p-2.5 rounded bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-900 transition-all shadow-sm"
                  >
                    <Edit3 className="w-3 h-3 xl:w-4 xl:h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 xl:p-2.5 rounded bg-slate-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-500 transition-all shadow-sm"
                  >
                    <Trash2 className="w-3 h-3 xl:w-4 xl:h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
