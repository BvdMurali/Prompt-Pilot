import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = 'https://hgomlxujcuiedubjszjd.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_3sGt4NdZuFfqOqAfztx1Pw_pxyra3j0';

const initSupabase = (url?: string, anonKey?: string) => {
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

// Store active client internally
let activeClient = initSupabase();
let currentUrl = DEFAULT_SUPABASE_URL;
let currentKey = DEFAULT_SUPABASE_ANON_KEY;

export const updateSupabaseInstance = (url?: string, anonKey?: string) => {
  const targetUrl = url || DEFAULT_SUPABASE_URL;
  const targetKey = anonKey || DEFAULT_SUPABASE_ANON_KEY;
  
  if (activeClient && currentUrl === targetUrl && currentKey === targetKey) {
    return activeClient;
  }
  
  console.log(`[supabase.ts] Creating a new Supabase client instance for URL: ${targetUrl}`);
  currentUrl = targetUrl;
  currentKey = targetKey;
  activeClient = initSupabase(targetUrl, targetKey);
  return activeClient;
};

// Export a Proxy that routes all actions to the current activeClient.
// This resolves the CommonJS copy-by-value binding limitation in Metro/React Native.
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop, receiver) {
    const value = (activeClient as any)[prop];
    if (typeof value === 'function') {
      return value.bind(activeClient);
    }
    return value;
  },
  set(target, prop, value, receiver) {
    (activeClient as any)[prop] = value;
    return true;
  }
});
