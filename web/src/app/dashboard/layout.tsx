'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Sparkles, Library, Layout, History, Settings, LogOut, Loader2, Menu, X, AlertTriangle } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [deletedAt, setDeletedAt] = useState<string | null>(null);
  const [checkingSoftDelete, setCheckingSoftDelete] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [profile, setProfile] = useState<{ name: string | null; avatarUrl: string | null } | null>(null);
  const [mobileReturnUrl, setMobileReturnUrl] = useState<string | null>(null);

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )mobile_return_url=([^;]*)/);
    if (match) {
      setMobileReturnUrl(decodeURIComponent(match[1]));
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setCheckingSoftDelete(false);
      return;
    }

    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('name, avatar_url, deleted_at')
          .eq('id', user.id)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') {
            console.error('Error loading profile:', error);
          }
        } else if (data) {
          setDeletedAt(data.deleted_at);
          setProfile({
            name: data.name,
            avatarUrl: data.avatar_url,
          });
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setCheckingSoftDelete(false);
      }
    };

    loadProfile();

    // Subscribe to realtime profile updates for the logged in user
    const channel = supabase
      .channel(`user-profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload.new) {
            setDeletedAt(payload.new.deleted_at);
            setProfile({
              name: payload.new.name,
              avatarUrl: payload.new.avatar_url,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loading]);

  const handleRestore = async () => {
    if (!user) return;
    setRestoring(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ deleted_at: null })
        .eq('id', user.id);

      if (error) throw error;
      setDeletedAt(null);
    } catch (err) {
      alert('Failed to restore account: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setRestoring(false);
    }
  };

  if (loading || checkingSoftDelete || !user) {
    return (
      <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 text-indigo-650 animate-spin mb-4" />
        <p className="text-slate-600 text-sm font-medium">Verifying secure session...</p>
      </div>
    );
  }

  if (deletedAt) {
    const deletedDate = new Date(deletedAt);
    const expiryDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const diffTime = expiryDate.getTime() - Date.now();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    return (
      <div className="flex-1 bg-slate-50 flex items-center justify-center min-h-screen p-4 sm:p-6 relative overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35rem] h-[35rem] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[25rem] h-[25rem] bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-md w-full bg-white border border-slate-200 p-6 sm:p-8 rounded-2xl sm:rounded-3xl flex flex-col items-center text-center shadow-xl relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-6 shadow-md shadow-red-500/5">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 tracking-tight">Account Deletion Scheduled</h2>
          <p className="text-slate-650 text-xs sm:text-sm mb-6 leading-relaxed">
            Your account is scheduled for deletion. All your prompts, templates, configuration preferences, and history logs will be permanently deleted in <span className="font-bold text-red-500">{daysRemaining} days</span>.
          </p>

          <div className="w-full flex flex-col gap-3">
            <button
              onClick={handleRestore}
              disabled={restoring}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-650 to-violet-650 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:scale-100 text-white rounded-xl text-sm font-extrabold shadow-lg shadow-indigo-600/10 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
            >
              {restoring ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Restoring Account...</span>
                </>
              ) : (
                <span>Restore Account</span>
              )}
            </button>

            <button
              onClick={() => signOut()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-sm"
            >
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: 'Optimizer & Rewrite', href: '/dashboard/editor', icon: Sparkles },
    { name: 'Prompt Library', href: '/dashboard/library', icon: Library },
    { name: 'Templates', href: '/dashboard/templates', icon: Layout },
    { name: 'History Logs', href: '/dashboard/history', icon: History },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="flex-1 bg-slate-50 text-slate-900 flex h-full overflow-hidden relative">
      {/* Background radial glows */}
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Mobile Sidebar Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* Side Navigation Panel */}
      <aside className={`w-64 xl:w-72 2xl:w-80 border-r border-slate-200 bg-white flex flex-col z-40 md:z-20 fixed md:sticky top-0 h-full transition-transform duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="h-14 xl:h-16 px-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold text-lg xl:text-xl tracking-tight text-slate-900">
            <svg className="w-7 h-7 xl:w-8 xl:h-8" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="pGradDash" x1="50" y1="165" x2="160" y2="40" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#7c3aed"/>
                  <stop offset="40%" stopColor="#2563eb"/>
                  <stop offset="75%" stopColor="#06b6d4"/>
                  <stop offset="100%" stopColor="#22d3ee"/>
                </linearGradient>
                <linearGradient id="speedGradDash" x1="10" y1="90" x2="70" y2="90" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#7c3aed"/>
                  <stop offset="100%" stopColor="#2563eb"/>
                </linearGradient>
              </defs>
              <rect x="42" y="75" width="28" height="10" rx="5" fill="url(#speedGradDash)"/>
              <rect x="15" y="95" width="18" height="10" rx="5" fill="#7c3aed"/>
              <rect x="38" y="95" width="32" height="10" rx="5" fill="#2563eb"/>
              <rect x="15" y="115" width="10" height="8" rx="4" fill="#1d4ed8"/>
              <rect x="29" y="115" width="18" height="8" rx="4" fill="#2563eb"/>
              <circle cx="85" cy="100" r="5" fill="#7c3aed"/>
              <circle cx="102" cy="100" r="5" fill="#3b82f6"/>
              <circle cx="119" cy="100" r="5" fill="#0ea5e9"/>
              <path d="M 70 42 H 125 C 158 42, 172 65, 172 90 C 172 115, 158 138, 125 138 H 80 C 70 138, 62 148, 58 165 C 61 146, 70 128, 76 114 H 125 C 140 114, 146 102, 146 90 C 146 78, 140 66, 125 66 H 70 C 63 66, 63 42, 70 42 Z" fill="url(#pGradDash)"/>
            </svg>
            <span>Prompt<span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">Pilot</span></span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 xl:px-4.5 xl:py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-50 border border-indigo-100 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 xl:w-5 xl:h-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Bar */}
        <div className="p-4 border-t border-slate-200 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {profile?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={profile.avatarUrl} 
                alt={user.email} 
                className="w-10 h-10 rounded-full border border-slate-200 object-cover"
              />
            ) : user.user_metadata?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={user.user_metadata.avatar_url} 
                alt={user.email} 
                className="w-10 h-10 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white uppercase border border-slate-200">
                {user.email?.substring(0, 2)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">
                {profile?.name || user.user_metadata?.full_name || user.email?.split('@')[0]}
              </p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-sm font-semibold text-slate-650 hover:text-slate-900 transition-all shadow-sm bg-white"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full relative z-10 overflow-y-auto">
        <header className="h-14 xl:h-16 border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 xl:px-8 bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900"
            >
              <Menu className="w-4.5 h-4.5" />
            </button>
            <h1 className="text-lg xl:text-xl font-extrabold text-slate-900 tracking-tight">
              {navItems.find(n => n.href === pathname)?.name || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {mobileReturnUrl && (
              <button
                onClick={async () => {
                  try {
                    const session = (await supabase.auth.getSession()).data.session;
                    if (session) {
                      const { access_token, refresh_token, expires_in, token_type } = session;
                      const fragment = new URLSearchParams({
                        access_token,
                        refresh_token: refresh_token ?? '',
                        token_type: token_type ?? 'bearer',
                        expires_in: String(expires_in ?? 3600),
                        type: 'oauth',
                      }).toString();
                      
                      window.location.href = `${mobileReturnUrl}#${fragment}`;
                    } else {
                      window.location.href = mobileReturnUrl;
                    }
                  } catch (err) {
                    console.error('Failed to resolve session for mobile redirect:', err);
                    window.location.href = mobileReturnUrl;
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-650/10 transition-all cursor-pointer"
              >
                <span>📱 Open in Mobile App</span>
              </button>
            )}
          </div>
        </header>

        <div className="p-4 sm:p-6 xl:p-8 flex-1 flex flex-col w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
