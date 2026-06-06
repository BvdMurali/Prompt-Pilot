'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Library, Layout, History, Settings, LogOut, Loader2, Menu, X } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  if (loading || !user) {
    return (
      <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Verifying secure session...</p>
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
    <div className="flex-1 bg-slate-950 text-slate-100 flex h-full overflow-hidden relative">
      {/* Background radial glows */}
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-indigo-900/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-violet-900/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Mobile Sidebar Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* Side Navigation Panel */}
      <aside className={`w-64 xl:w-72 2xl:w-80 border-r border-slate-900 bg-slate-950/85 backdrop-blur-md flex flex-col z-40 md:z-20 fixed md:sticky top-0 h-full transition-transform duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="p-6 border-b border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg text-white">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span>Prompt<span className="text-indigo-400">Pilot</span></span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white"
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
                className={`flex items-center gap-3 px-4 py-3 xl:px-5 xl:py-3.5 rounded-xl text-sm xl:text-base font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600/10 border border-indigo-500/20 text-white'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 xl:w-5 xl:h-5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Bar */}
        <div className="p-4 border-t border-slate-900 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {user.user_metadata?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={user.user_metadata.avatar_url} 
                alt={user.email} 
                className="w-10 h-10 rounded-full border border-slate-800"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white uppercase border border-slate-800">
                {user.email?.substring(0, 2)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">
                {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-900 hover:border-slate-800 hover:bg-slate-900/40 text-sm font-semibold text-slate-400 hover:text-white transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full relative z-10 overflow-y-auto">
        <header className="h-16 xl:h-20 border-b border-slate-900 flex items-center justify-between px-4 sm:px-8 xl:px-12 bg-slate-950/40 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-lg border border-slate-900 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white"
            >
              <Menu className="w-4.5 h-4.5" />
            </button>
            <h1 className="text-base xl:text-lg font-bold text-white">
              {navItems.find(n => n.href === pathname)?.name || 'Dashboard'}
            </h1>
          </div>
          <div className="text-xs xl:text-sm text-slate-500">
            Session active
          </div>
        </header>

        <div className="p-4 sm:p-8 flex-1 flex flex-col max-w-7xl xl:max-w-[90rem] 2xl:max-w-[95rem] mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
