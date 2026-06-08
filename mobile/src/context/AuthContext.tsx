import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { updateSupabaseInstance, DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from '../services/supabase';

// Required for expo-web-browser OAuth redirect handling on Android
WebBrowser.maybeCompleteAuthSession();

// Base web callback URL — the device's own deep-link return URL is appended at call time
const WEB_CALLBACK_BASE = 'https://prompt-pilot-ochre.vercel.app/api/auth/callback';

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
  signInWithGoogle: () => Promise<void>;
  loginWithOAuth: (accessToken: string, refreshToken: string) => Promise<void>;
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

/**
 * Parse key=value pairs from ALL segments of a deep-link URL.
 * Handles both ? (query string) and # (hash fragment) params.
 */
function parseUrlParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const segments = url.split(/[#?]/).slice(1);
  segments.forEach((segment) => {
    segment.split('&').forEach((pair) => {
      const eqIdx = pair.indexOf('=');
      if (eqIdx > -1) {
        const key = pair.substring(0, eqIdx).trim();
        const value = pair.substring(eqIdx + 1);
        if (key) params[key] = decodeURIComponent(value);
      }
    });
  });
  return params;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState('https://prompt-pilot-ochre.vercel.app');
  const [supabaseUrl, setSupabaseUrl] = useState(DEFAULT_SUPABASE_URL);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(DEFAULT_SUPABASE_ANON_KEY);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLocalMode, setIsLocalMode] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  // ── Deep link listener ───────────────────────────────────────────────────────
  // After the web callback exchanges the Supabase code, it redirects to:
  //   promptpilot://#access_token=xxx&refresh_token=yyy
  // This listener catches that URL and establishes the session.
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const { url } = event;
      if (!url || !url.startsWith('promptpilot://')) return;

      console.log('[AuthContext] Deep link received:', url.substring(0, 80) + '...');
      const params = parseUrlParams(url);
      const accessToken = params['access_token'];
      const refreshToken = params['refresh_token'];

      if (accessToken && refreshToken) {
        console.log('[AuthContext] Tokens found in deep link, logging in...');
        loginWithOAuth(accessToken, refreshToken).catch((e) =>
          console.error('[AuthContext] Deep link login failed:', e)
        );
      }
    };

    // Listen for deep links while the app is in the foreground
    const sub = Linking.addEventListener('url', handleDeepLink);

    // Handle the case where the app was launched via a deep link (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => sub.remove();
  }, [supabaseUrl, supabaseAnonKey]);

  const loadSession = async () => {
    try {
      setLoading(true);
      const cachedApiUrl = await AsyncStorage.getItem(API_URL_KEY);
      if (cachedApiUrl) setApiUrl(cachedApiUrl);

      const cachedSbUrl = await AsyncStorage.getItem(SB_URL_KEY);
      const cachedSbKey = await AsyncStorage.getItem(SB_KEY_KEY);

      const activeSbUrl = cachedSbUrl || DEFAULT_SUPABASE_URL;
      const activeSbKey = cachedSbKey || DEFAULT_SUPABASE_ANON_KEY;

      setSupabaseUrl(activeSbUrl);
      setSupabaseAnonKey(activeSbKey);
      const client = updateSupabaseInstance(activeSbUrl, activeSbKey);

      const secureToken = await SecureStore.getItemAsync(TOKEN_KEY);
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

      if (secureToken) {
        const { data: sessionData, error: sessionError } = await client.auth.setSession({
          access_token: secureToken,
          refresh_token: refreshToken || '',
        });

        if (!sessionError && sessionData.user && sessionData.session) {
          const newAccess = sessionData.session.access_token;
          const newRefresh = sessionData.session.refresh_token;
          await SecureStore.setItemAsync(TOKEN_KEY, newAccess);
          if (newRefresh) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefresh);

          const { data: profile } = await client
            .from('users').select('*').eq('id', sessionData.user.id).single();

          setUser({
            id: sessionData.user.id,
            email: sessionData.user.email || '',
            name: profile?.name || '',
            avatar_url: profile?.avatar_url || '',
          });
          setToken(newAccess);
          setIsLocalMode(false);
          setIsAuthenticated(true);
          return;
        } else {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        }
      }
    } catch (e) {
      console.warn('[AuthContext] loadSession failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const finalizeSession = async (
    accessToken: string,
    refreshToken: string,
    userId: string,
    email: string
  ) => {
    const client = updateSupabaseInstance(supabaseUrl, supabaseAnonKey);
    await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);

    const { data: profile } = await client
      .from('users').select('*').eq('id', userId).single();

    setUser({
      id: userId,
      email,
      name: profile?.name || '',
      avatar_url: profile?.avatar_url || '',
    });
    setToken(accessToken);
    setIsLocalMode(false);
    setIsAuthenticated(true);
  };

  /**
   * Google Sign-In — Three-step approach that works in Expo Go AND standalone:
   *
   * Step 1: Get the device's own deep-link URL:
   *         - Expo Go:    exp://192.168.x.x:8081
   *         - Standalone: promptpilot://
   *
   * Step 2: Pass it as `return=<encoded>` in the Vercel web callback URL.
   *         The redirectTo sent to Supabase is:
   *         https://prompt-pilot-ochre.vercel.app/api/auth/callback?return=exp%3A%2F%2F...
   *
   * Step 3: After Google login, the Vercel page:
   *         - Exchanges the Supabase code for tokens
   *         - Shows a page with window.location = "<return>#access_token=..."
   *         - The OS routes this back to the correct app (Expo Go or standalone)
   *         - Linking.addEventListener in this AuthProvider catches it
   */
  const signInWithGoogle = async (): Promise<void> => {
    try {
      setLoading(true);
      const client = updateSupabaseInstance(supabaseUrl, supabaseAnonKey);

      // Get THIS device's deep-link URL — changes per device/environment
      // Expo Go:    exp://192.168.x.x:8081
      // Standalone: promptpilot://
      const deviceReturnUrl = Linking.createURL('');
      const callbackUrl = `${WEB_CALLBACK_BASE}?return=${encodeURIComponent(deviceReturnUrl)}`;

      console.log('[AuthContext] Device deep-link URL:', deviceReturnUrl);
      console.log('[AuthContext] Callback URL:', callbackUrl);

      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error || !data?.url) {
        throw new Error(error?.message || 'Failed to get Google OAuth URL from Supabase');
      }

      console.log('[AuthContext] Opening browser for OAuth...');

      // Open Chrome Custom Tab / Safari — the web callback will show a page
      // that uses window.location to redirect to deviceReturnUrl#tokens
      // The Linking listener below catches that deep link and logs the user in.
      await WebBrowser.openBrowserAsync(data.url);

      console.log('[AuthContext] Browser closed/dismissed.');
      // Note: loginWithOAuth is called by the deep link listener, not here.
      // We just stop the loading spinner — authentication completes asynchronously.
    } catch (error: any) {
      console.error('[AuthContext] Google Sign-In error:', error?.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithOAuth = async (accessToken: string, refreshToken: string): Promise<void> => {
    try {
      setLoading(true);
      const client = updateSupabaseInstance(supabaseUrl, supabaseAnonKey);

      const { data: sessionData, error: sessionError } = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError || !sessionData.user) {
        throw new Error(sessionError?.message || 'Failed to set OAuth session');
      }

      await finalizeSession(
        accessToken,
        refreshToken,
        sessionData.user.id,
        sessionData.user.email || ''
      );
    } catch (error) {
      console.error('[AuthContext] loginWithOAuth failed:', error);
      throw error;
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
      const { data: authData, error: authError } = await client.auth.signInWithPassword({ email, password });

      if (authError || !authData.user || !authData.session) {
        throw new Error(authError?.message || 'Login failed. Please check your credentials.');
      }

      const { data: profile } = await client
        .from('users').select('*').eq('id', authData.user.id).single();

      setUser({
        id: authData.user.id,
        email: authData.user.email || '',
        name: profile?.name || '',
        avatar_url: profile?.avatar_url || '',
      });

      await SecureStore.setItemAsync(TOKEN_KEY, authData.session.access_token);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, authData.session.refresh_token);
      setToken(authData.session.access_token);
      setIsLocalMode(false);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('[AuthContext] loginWithEmail failed:', error);
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
      const { data: authData, error: authError } = await client.auth.signUp({ email, password });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Sign up failed.');
      }

      if (authData.session) {
        await SecureStore.setItemAsync(TOKEN_KEY, authData.session.access_token);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, authData.session.refresh_token);
        setToken(authData.session.access_token);
        setUser({ id: authData.user.id, email: authData.user.email || '' });
        setIsLocalMode(false);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[AuthContext] signUpWithEmail failed:', error);
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
      console.error('[AuthContext] logout error:', e);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (newApiUrl: string, newSbUrl?: string, newSbKey?: string) => {
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
      console.error('[AuthContext] updateConfig failed:', e);
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
      signInWithGoogle,
      loginWithOAuth,
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
