import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, updateSupabaseInstance, DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from '../services/supabase';

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  apiUrl: string;
  user: UserProfile | null;
  loading: boolean;
  isLocalMode: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
  login: (url: string, token: string | null) => Promise<boolean>;
  logout: () => Promise<void>;
  updateConfig: (apiUrl: string, supabaseUrl?: string, supabaseKey?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'pp_session_token';
const API_URL_KEY = 'pp_api_url';
const SB_URL_KEY = 'pp_supabase_url';
const SB_KEY_KEY = 'pp_supabase_key';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState('http://localhost:3000');
  const [supabaseUrl, setSupabaseUrl] = useState(DEFAULT_SUPABASE_URL);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(DEFAULT_SUPABASE_ANON_KEY);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLocalMode, setIsLocalMode] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      setLoading(true);
      // Load URLs
      const cachedApiUrl = await AsyncStorage.getItem(API_URL_KEY);
      if (cachedApiUrl) setApiUrl(cachedApiUrl);

      const cachedSbUrl = await AsyncStorage.getItem(SB_URL_KEY);
      const cachedSbKey = await AsyncStorage.getItem(SB_KEY_KEY);
      
      const activeSbUrl = cachedSbUrl || DEFAULT_SUPABASE_URL;
      const activeSbKey = cachedSbKey || DEFAULT_SUPABASE_ANON_KEY;
      
      setSupabaseUrl(activeSbUrl);
      setSupabaseAnonKey(activeSbKey);
      updateSupabaseInstance(activeSbUrl, activeSbKey);

      // Load secure token
      const secureToken = await SecureStore.getItemAsync(TOKEN_KEY);
      if (secureToken) {
        // Attempt to sync session
        const client = updateSupabaseInstance(activeSbUrl, activeSbKey);
        const { data: sessionData, error: sessionError } = await client.auth.setSession({
          access_token: secureToken,
          refresh_token: '',
        });

        if (!sessionError && sessionData.user) {
          const { data: profile } = await client
            .from('users')
            .select('*')
            .eq('id', sessionData.user.id)
            .single();

          setUser({
            id: sessionData.user.id,
            email: sessionData.user.email || '',
            name: profile?.name || '',
            avatar_url: profile?.avatar_url || '',
          });
          setToken(secureToken);
          setIsLocalMode(false);
          setIsAuthenticated(true);
        } else {
          // Token expired or invalid
          await SecureStore.deleteItemAsync(TOKEN_KEY);
        }
      }
    } catch (e) {
      console.warn('Failed to load session:', e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (url: string, syncToken: string | null): Promise<boolean> => {
    try {
      setLoading(true);
      await AsyncStorage.setItem(API_URL_KEY, url);
      setApiUrl(url);

      if (!syncToken || !syncToken.trim()) {
        // Enter local mode
        setToken(null);
        setUser(null);
        setIsLocalMode(true);
        setIsAuthenticated(true);
        return true;
      }

      // Sync mode - Initialize client with token
      const client = updateSupabaseInstance(supabaseUrl, supabaseAnonKey);
      const { data: sessionData, error: sessionError } = await client.auth.setSession({
        access_token: syncToken,
        refresh_token: '',
      });

      if (sessionError || !sessionData.user) {
        throw new Error(sessionError?.message || 'Invalid session token');
      }

      // Fetch user profile from public.users
      const { data: profile } = await client
        .from('users')
        .select('*')
        .eq('id', sessionData.user.id)
        .single();

      setUser({
        id: sessionData.user.id,
        email: sessionData.user.email || '',
        name: profile?.name || '',
        avatar_url: profile?.avatar_url || '',
      });

      await SecureStore.setItemAsync(TOKEN_KEY, syncToken);
      setToken(syncToken);
      setIsLocalMode(false);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      setToken(null);
      setUser(null);
      setIsLocalMode(true);
      setIsAuthenticated(false);
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (
    newApiUrl: string, 
    newSbUrl?: string, 
    newSbKey?: string
  ) => {
    try {
      await AsyncStorage.setItem(API_URL_KEY, newApiUrl);
      setApiUrl(newApiUrl);

      if (newSbUrl && newSbKey) {
        await AsyncStorage.setItem(SB_URL_KEY, newSbUrl);
        await AsyncStorage.setItem(SB_KEY_KEY, newSbKey);
        setSupabaseUrl(newSbUrl);
        setSupabaseAnonKey(newSbKey);
        updateSupabaseInstance(newSbUrl, newSbKey);
        
        // Re-authenticate if token exists
        if (token) {
          await login(newApiUrl, token);
        }
      }
    } catch (e) {
      console.error('Update config failed:', e);
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      token,
      apiUrl,
      user,
      loading,
      isLocalMode,
      supabaseUrl,
      supabaseAnonKey,
      login,
      logout,
      updateConfig,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
