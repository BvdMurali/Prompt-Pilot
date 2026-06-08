import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';

export interface PromptItem {
  id: string;
  title: string;
  content: string;
  category: string;
  is_favorite: boolean;
  created_at?: string;
}

export interface HistoryItem {
  id: string;
  original_input: string;
  optimized_output: string;
  action_used: string;
  created_at: string;
  metadata: {
    score?: {
      overall: number;
      clarity?: number;
      context?: number;
      constraints?: number;
      structure?: number;
      specificity?: number;
    };
    explanations?: Array<{ action: string; why: string; how: string }>;
    variations?: string[];
    suggestions?: string[];
    platform?: string;
    tone?: string;
    model?: string;
  };
}

export interface TemplateItem {
  id: string;
  title: string;
  description: string;
  content: string;
  is_system: boolean;
  user_id?: string | null;
}

interface DatabaseContextType {
  libraryList: PromptItem[];
  historyList: HistoryItem[];
  templatesList: TemplateItem[];
  loading: boolean;
  savePrompt: (title: string, content: string, category: string) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  addHistoryItem: (
    original: string,
    optimized: string,
    action: string,
    metadata: any
  ) => Promise<void>;
  clearHistory: () => Promise<void>;
  syncData: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

const LOCAL_LIB_KEY = 'pp_local_library';
const LOCAL_HIST_KEY = 'pp_local_history';

const DEFAULT_TEMPLATES: TemplateItem[] = [
  {
    id: 't-1',
    title: 'Resume Builder',
    description: 'Revise bullet points to align with target role requirements and KPIs.',
    content: 'Act as an expert resume writer. Revise my work history bullet points to align with the role of [Target Role] at [Target Company]. Highlight my skills in [Key Skills]. Work history: [Work History]',
    is_system: true,
  },
  {
    id: 't-2',
    title: 'Cover Letter Generator',
    description: 'Create tailored, high-converting cover letters emphasizing unique qualifications.',
    content: 'Write a persuasive cover letter for the [Role Name] position at [Company Name]. I have [Years of Experience] years of experience. Target company focus: [Company Focus]',
    is_system: true,
  },
  {
    id: 't-3',
    title: 'LinkedIn Outreach',
    description: 'Craft high-response connection requests or InMail messaging campaigns.',
    content: 'Write an engaging LinkedIn outreach note to [Recipient Name] who is a [Recipient Title] at [Company Name]. Highlight our shared interest in [Shared Interest] and request a brief chat.',
    is_system: true,
  },
  {
    id: 't-4',
    title: 'SQL Generator',
    description: 'Translate plain English queries into production-optimized SQL commands.',
    content: 'Write a clean, optimized SQL query to [Describe Goal]. Base it on the following table schema: [Table Details]',
    is_system: true,
  }
];

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const { isLocalMode, user } = useAuth();
  const [libraryList, setLibraryList] = useState<PromptItem[]>([]);
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [templatesList, setTemplatesList] = useState<TemplateItem[]>(DEFAULT_TEMPLATES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    syncData();
  }, [isLocalMode, user]);

  useEffect(() => {
    if (isLocalMode || !user) return;

    console.log('[DatabaseContext] Registering real-time listeners for user:', user.id);

    // Listen to prompts table modifications
    const promptsChannel = supabase
      .channel('prompts-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prompts', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('[DatabaseContext] Real-time prompts table update:', payload.eventType);
          syncData();
        }
      )
      .subscribe();

    // Listen to history table modifications
    const historyChannel = supabase
      .channel('history-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'history', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('[DatabaseContext] Real-time history table update:', payload.eventType);
          syncData();
        }
      )
      .subscribe();

    // Listen to settings table modifications
    const settingsChannel = supabase
      .channel('settings-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('[DatabaseContext] Real-time settings table update:', payload.eventType);
          syncData();
        }
      )
      .subscribe();

    // Listen to custom templates table modifications
    const templatesChannel = supabase
      .channel('templates-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'templates', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('[DatabaseContext] Real-time templates table update:', payload.eventType);
          syncData();
        }
      )
      .subscribe();

    return () => {
      console.log('[DatabaseContext] Cleaning up real-time listeners...');
      supabase.removeChannel(promptsChannel);
      supabase.removeChannel(historyChannel);
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(templatesChannel);
    };
  }, [isLocalMode, user]);

  const syncData = async () => {
    try {
      setLoading(true);
      if (isLocalMode || !user) {
        // Load from AsyncStorage
        const localLib = await AsyncStorage.getItem(LOCAL_LIB_KEY);
        if (localLib) setLibraryList(JSON.parse(localLib));
        else setLibraryList([]);

        const localHist = await AsyncStorage.getItem(LOCAL_HIST_KEY);
        if (localHist) setHistoryList(JSON.parse(localHist));
        else setHistoryList([]);

        setTemplatesList(DEFAULT_TEMPLATES);
      } else {
        // Query Supabase directly
        // 1. Library Prompts
        const { data: dbPrompts, error: libErr } = await supabase
          .from('prompts')
          .select('*')
          .order('created_at', { ascending: false });

        if (!libErr && dbPrompts) {
          setLibraryList(dbPrompts.map(p => ({
            id: p.id,
            title: p.title,
            content: p.content,
            category: p.category,
            is_favorite: p.is_favorite,
            created_at: p.created_at,
          })));
        }

        // 2. History logs
        const { data: dbHistory, error: histErr } = await supabase
          .from('history')
          .select('*')
          .order('created_at', { ascending: false });

        if (!histErr && dbHistory) {
          setHistoryList(dbHistory.map(h => ({
            id: h.id,
            original_input: h.original_input,
            optimized_output: h.optimized_output,
            action_used: h.action_used,
            created_at: h.created_at,
            metadata: h.metadata,
          })));
        }

        // 3. Custom Templates + System Templates
        const { data: dbTemplates, error: tempErr } = await supabase
          .from('templates')
          .select('*');

        if (!tempErr && dbTemplates) {
          // Merge default system templates with custom ones from db
          const customTemps = dbTemplates.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description || '',
            content: t.content,
            is_system: t.is_system,
            user_id: t.user_id,
          }));
          
          // Filter duplicates just in case
          const allTemps = [...DEFAULT_TEMPLATES];
          customTemps.forEach(t => {
            if (!allTemps.some(x => x.title.toLowerCase() === t.title.toLowerCase())) {
              allTemps.push(t);
            }
          });
          setTemplatesList(allTemps);
        }
      }
    } catch (e) {
      console.warn('Sync failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const savePrompt = async (title: string, content: string, category: string) => {
    try {
      if (isLocalMode || !user) {
        const newItem: PromptItem = {
          id: `local-${Date.now()}`,
          title,
          content,
          category,
          is_favorite: false,
          created_at: new Date().toISOString(),
        };
        const updated = [newItem, ...libraryList];
        setLibraryList(updated);
        await AsyncStorage.setItem(LOCAL_LIB_KEY, JSON.stringify(updated));
      } else {
        const { data, error } = await supabase
          .from('prompts')
          .insert({
            user_id: user.id,
            title,
            content,
            category,
            is_favorite: false,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setLibraryList(prev => [data, ...prev]);
        }
      }
    } catch (e) {
      console.error('Error saving prompt:', e);
      throw e;
    }
  };

  const deletePrompt = async (id: string) => {
    try {
      if (isLocalMode || !user) {
        const updated = libraryList.filter(item => item.id !== id);
        setLibraryList(updated);
        await AsyncStorage.setItem(LOCAL_LIB_KEY, JSON.stringify(updated));
      } else {
        const { error } = await supabase
          .from('prompts')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setLibraryList(prev => prev.filter(item => item.id !== id));
      }
    } catch (e) {
      console.error('Error deleting prompt:', e);
      throw e;
    }
  };

  const addHistoryItem = async (
    original: string,
    optimized: string,
    action: string,
    metadata: any
  ) => {
    try {
      if (isLocalMode || !user) {
        const newItem: HistoryItem = {
          id: `hist-${Date.now()}`,
          original_input: original,
          optimized_output: optimized,
          action_used: action,
          created_at: new Date().toISOString(),
          metadata,
        };
        const updated = [newItem, ...historyList];
        setHistoryList(updated);
        await AsyncStorage.setItem(LOCAL_HIST_KEY, JSON.stringify(updated));
      } else {
        // API Route /api/prompt/process automatically saves transactions to history on DB side!
        // We just reload the history from DB.
        const { data: dbHistory, error } = await supabase
          .from('history')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && dbHistory) {
          setHistoryList(dbHistory.map(h => ({
            id: h.id,
            original_input: h.original_input,
            optimized_output: h.optimized_output,
            action_used: h.action_used,
            created_at: h.created_at,
            metadata: h.metadata,
          })));
        }
      }
    } catch (e) {
      console.error('Error updates history:', e);
    }
  };

  const clearHistory = async () => {
    try {
      if (isLocalMode || !user) {
        setHistoryList([]);
        await AsyncStorage.removeItem(LOCAL_HIST_KEY);
      } else {
        const { error } = await supabase
          .from('history')
          .delete()
          .eq('user_id', user.id);

        if (error) throw error;
        setHistoryList([]);
      }
    } catch (e) {
      console.error('Error clearing history:', e);
      throw e;
    }
  };

  return (
    <DatabaseContext.Provider value={{
      libraryList,
      historyList,
      templatesList,
      loading,
      savePrompt,
      deletePrompt,
      addHistoryItem,
      clearHistory,
      syncData,
    }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) throw new Error('useDatabase must be used within a DatabaseProvider');
  return context;
}
