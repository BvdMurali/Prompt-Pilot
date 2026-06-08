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
  loginWithEmail: (url: string, email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (url: string, email: string, password: string) => Promise<boolean>;
  loginSandbox: (url: string) => Promise<void>;
  logout: () => Promise<void>;
  updateConfig: (apiUrl: string, supabaseUrl?: string, supabaseKey?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'pp_session_token';
const REFRESH_TOKEN_KEY = 'pp_refresh_token';
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
      const client = updateSupabaseInstance(activeSbUrl, activeSbKey);

      // Load secure tokens
      const secureToken = await SecureStore.getItemAsync(TOKEN_KEY);
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

      if (secureToken) {
        // Restore session with access + refresh token
        const { data: sessionData, error: sessionError } = await client.auth.setSession({
          access_token: secureToken,
          refresh_token: refreshToken || '',
        });

        if (!sessionError && sessionData.user && sessionData.session) {
          // Save potentially refreshed tokens
          const newAccess = sessionData.session.access_token;
          const newRefresh = sessionData.session.refresh_token;
          
          await SecureStore.setItemAsync(TOKEN_KEY, newAccess);
          if (newRefresh) {
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefresh);
          }

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
          setToken(newAccess);
          setIsLocalMode(false);
          setIsAuthenticated(true);
        } else {
          // Token expired or invalid
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        }
      }
    } catch (e) {
      console.warn('Failed to load session:', e);
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (url: string, email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      await AsyncStorage.setItem(API_URL_KEY, url);
      setApiUrl(url);

      const client = updateSupabaseInstance(supabaseUrl, supabaseAnonKey);
      const { data: authData, error: authError } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user || !authData.session) {
        throw new Error(authError?.message || 'Login failed. Please check your credentials.');
      }

      // Fetch user profile from public.users
      const { data: profile } = await client
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      setUser({
        id: authData.user.id,
        email: authData.user.email || '',
        name: profile?.name || '',
        avatar_url: profile?.avatar_url || '',
      });

      const accessToken = authData.session.access_token;
      const refreshToken = authData.session.refresh_token;

      await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      
      setToken(accessToken);
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

  const signUpWithEmail = async (url: string, email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      await AsyncStorage.setItem(API_URL_KEY, url);
      setApiUrl(url);

      const client = updateSupabaseInstance(supabaseUrl, supabaseAnonKey);
      const { data: authData, error: authError } = await client.auth.signUp({
        email,
        password,
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Sign up failed.');
      }

      if (authData.session) {
        const accessToken = authData.session.access_token;
        const refreshToken = authData.session.refresh_token;

        await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
        setToken(accessToken);
        
        setUser({
          id: authData.user.id,
          email: authData.user.email || '',
        });
        
        setIsLocalMode(false);
        setIsAuthenticated(true);
        return true;
      } else {
        // Sign up succeeded but needs email confirmation (or is pending auth verification)
        return false;
      }
    } catch (error) {
      console.error('Sign up failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginSandbox = async (url: string): Promise<void> => {
    try {
      setLoading(true);
      await AsyncStorage.setItem(API_URL_KEY, url);
      setApiUrl(url);
      
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      
      setToken(null);
      setUser(null);
      setIsLocalMode(true);
      setIsAuthenticated(true);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      const client = updateSupabaseInstance(supabaseUrl, supabaseAnonKey);
      await client.auth.signOut();
      
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      
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
      loginWithEmail,
      signUpWithEmail,
      loginSandbox,
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
