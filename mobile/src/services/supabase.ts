import { createClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = 'https://hgomlxujcuiedubjszjd.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_3sGt4NdZuFfqOqAfztx1Pw_pxyra3j0';

export const initSupabase = (url?: string, anonKey?: string) => {
  const finalUrl = url || DEFAULT_SUPABASE_URL;
  const finalKey = anonKey || DEFAULT_SUPABASE_ANON_KEY;
  
  return createClient(finalUrl, finalKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
};

// Global singleton client
export let supabase = initSupabase();

export const updateSupabaseInstance = (url?: string, anonKey?: string) => {
  supabase = initSupabase(url, anonKey);
  return supabase;
};
