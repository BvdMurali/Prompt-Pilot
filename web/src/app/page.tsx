'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, Zap, Layout, Globe, ChevronRight, CheckCircle, Menu, X, Loader2, Eye, EyeOff } from 'lucide-react';

export default function LandingPage() {
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, loading } = useAuth();
  const router = useRouter();
  const [selectedExample, setSelectedExample] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth Modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [footerModal, setFooterModal] = useState<'privacy' | 'terms' | 'security' | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const openAuthModal = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
    setAuthError(null);
    setMessage(null);
    setEmail('');
    setPassword('');
    setShowPassword(false);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setMessage(null);
    setAuthLoading(true);
    try {
      if (authMode === 'signin') {
        // 1. Check if email exists in database
        const { data: emailExists, error: rpcError } = await supabase.rpc('check_email_exists', { email_to_check: email });
        if (rpcError) throw rpcError;

        if (!emailExists) {
          throw new Error('User email does not exist');
        }

        await signInWithEmail(email, password);
        setIsAuthModalOpen(false);
        router.push('/dashboard/editor');
      } else {
        await signUpWithEmail(email, password);
        setMessage('Registration successful! Please check your email for confirmation or sign in.');
        setAuthMode('signin');
      }
    } catch (err: any) {
      setAuthError(err.message || 'An error occurred during authentication.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setAuthError(err.message || 'Failed to initialize Google sign-in.');
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const examples = [
    {
      label: 'Email Rewrite',
      before: 'Hey, I need that report by tomorrow morning. Thanks.',
      after: 'Hi team,\n\nCould you please send over the latest status report by 9:00 AM tomorrow morning? We need it to finalize the presentation for the stakeholders. Thanks for your support!',
      action: 'Rewrite (Professional Tone)',
      scoreBefore: 45,
      scoreAfter: 95
    },
    {
      label: 'Prompt Optimization',
      before: 'Write a blog post about running.',
      after: 'Act as an expert fitness blogger. Write a 1,500-word highly engaging blog post targeted at beginner marathon runners. Focus on building endurance, preventing shin splints, and nutrition. Use an encouraging tone. Break down content with clear subheadings and include a bulleted summary checklist at the end.',
      action: 'Optimize Prompt (Gemini/ChatGPT)',
      scoreBefore: 20,
      scoreAfter: 98
    }
  ];

  return (
    <div className="flex-1 bg-slate-50 text-slate-900 flex flex-col relative overflow-x-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[60%] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[80%] h-[60%] rounded-full bg-violet-500/10 blur-[150px] pointer-events-none" />

      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

      {/* Navigation Header */}
      <header className={`transition-all duration-350 sticky top-0 z-50 border-b ${
        isScrolled 
          ? 'border-slate-200 bg-white/80 backdrop-blur-md shadow-sm' 
          : 'border-slate-200 bg-white'
      }`}>
        <div className="max-w-7xl xl:max-w-[90rem] 2xl:max-w-[98rem] mx-auto px-6 xl:px-12 2xl:px-16 h-14 xl:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-extrabold text-lg xl:text-xl tracking-tight text-slate-900">
            <svg className="w-7 h-7 xl:w-8 xl:h-8" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="pGradNav" x1="50" y1="165" x2="160" y2="40" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#7c3aed"/>
                  <stop offset="40%" stopColor="#2563eb"/>
                  <stop offset="75%" stopColor="#06b6d4"/>
                  <stop offset="100%" stopColor="#22d3ee"/>
                </linearGradient>
                <linearGradient id="speedGradNav" x1="10" y1="90" x2="70" y2="90" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#7c3aed"/>
                  <stop offset="100%" stopColor="#2563eb"/>
                </linearGradient>
              </defs>
              <rect x="42" y="75" width="28" height="10" rx="5" fill="url(#speedGradNav)"/>
              <rect x="15" y="95" width="18" height="10" rx="5" fill="#7c3aed"/>
              <rect x="38" y="95" width="32" height="10" rx="5" fill="#2563eb"/>
              <rect x="15" y="115" width="10" height="8" rx="4" fill="#1d4ed8"/>
              <rect x="29" y="115" width="18" height="8" rx="4" fill="#2563eb"/>
              <circle cx="85" cy="100" r="5" fill="#7c3aed"/>
              <circle cx="102" cy="100" r="5" fill="#3b82f6"/>
              <circle cx="119" cy="100" r="5" fill="#0ea5e9"/>
              <path d="M 70 42 H 125 C 158 42, 172 65, 172 90 C 172 115, 158 138, 125 138 H 80 C 70 138, 62 148, 58 165 C 61 146, 70 128, 76 114 H 125 C 140 114, 146 102, 146 90 C 146 78, 140 66, 125 66 H 70 C 63 66, 63 42, 70 42 Z" fill="url(#pGradNav)"/>
            </svg>
            <span>Prompt<span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">Pilot</span></span>
          </Link>

          <nav className="hidden sm:flex items-center gap-6 2xl:gap-8">
            <a href="#features" className="text-sm 2xl:text-base text-slate-600 hover:text-slate-900 font-medium transition-colors">Features</a>
            <a href="#demo" className="text-sm 2xl:text-base text-slate-600 hover:text-slate-900 font-medium transition-colors">Interactive Demo</a>
            {loading ? (
              <div className="w-20 h-8 2xl:w-24 2xl:h-10 rounded-lg bg-slate-100 animate-pulse" />
            ) : user ? (
              <Link href="/dashboard/editor" className="inline-flex items-center gap-1.5 px-4 h-9 xl:px-5 xl:h-10 2xl:px-6 2xl:h-12 rounded-lg 2xl:rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm xl:text-base 2xl:text-lg font-semibold text-white transition-all shadow-md shadow-indigo-650/10">
                <span>Dashboard</span>
                <ArrowRight className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6" />
              </Link>
            ) : (
              <button 
                onClick={() => openAuthModal('signin')}
                className="px-4 h-9 xl:px-5 xl:h-10 2xl:px-6 2xl:h-12 rounded-lg 2xl:rounded-xl bg-white hover:bg-slate-50 text-sm xl:text-base 2xl:text-lg font-semibold text-slate-800 border border-slate-200 hover:border-slate-300 transition-all flex items-center gap-2"
              >
                <span>Sign In</span>
              </button>
            )}
          </nav>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900"
          >
            {mobileMenuOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
          </button>
        </div>

        {/* Mobile Navigation Menu Overlay */}
        {mobileMenuOpen && (
          <div className="sm:hidden fixed inset-x-0 top-16 bg-white/95 backdrop-blur-md border-b border-slate-200 z-45 p-6 flex flex-col gap-4 animate-fade-in shadow-xl">
            <a 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm text-slate-600 hover:text-slate-900 py-2 border-b border-slate-100"
            >
              Features
            </a>
            <a 
              href="#demo" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm text-slate-600 hover:text-slate-900 py-2 border-b border-slate-100"
            >
              Interactive Demo
            </a>
            <div className="pt-2">
              {loading ? (
                <div className="w-full h-10 rounded-lg bg-slate-100 animate-pulse" />
              ) : user ? (
                <Link 
                  href="/dashboard/editor" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 h-10 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-semibold text-white transition-all shadow-md shadow-indigo-650/10"
                >
                  <span>Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <button 
                  onClick={() => { setMobileMenuOpen(false); openAuthModal('signin'); }}
                  className="w-full px-4 h-10 rounded-lg bg-white hover:bg-slate-50 text-sm font-semibold text-slate-800 border border-slate-200 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
                >
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl xl:max-w-[90rem] 2xl:max-w-[98rem] mx-auto px-6 xl:px-12 2xl:px-16 pt-8 xl:pt-12 2xl:pt-14 pb-6 2xl:pb-8 flex flex-col items-center text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 2xl:px-4 2xl:py-2.5 rounded-full bg-violet-100 border border-violet-200 text-xs xl:text-sm 2xl:text-base font-semibold text-violet-750 mb-4 2xl:mb-6 animate-fade-in">
          <Globe className="w-3.5 h-3.5 xl:w-4 xl:h-4 2xl:w-5 2xl:h-5 text-violet-600" />
          <span>Universal Browser Extension Available Now</span>
        </div>

        <h1 className="text-5xl md:text-7xl xl:text-8xl 2xl:text-[7rem] font-extrabold tracking-tight max-w-4xl xl:max-w-6xl 2xl:max-w-7xl leading-tight md:leading-none 2xl:leading-[1.1] text-slate-900 mb-4 2xl:mb-5">
          The Intelligent AI Layer for <br />
          <span className="bg-gradient-to-r from-violet-650 via-indigo-650 to-cyan-550 bg-clip-text text-transparent">
            Every Text Box on the Web
          </span>
        </h1>

        <p className="text-lg md:text-xl xl:text-2xl 2xl:text-3xl text-slate-650 max-w-2xl xl:max-w-4xl 2xl:max-w-5xl mb-6 xl:mb-8 2xl:mb-10 leading-relaxed">
          PromptPilot sits invisibly between you and any input field. Instantly rewrite messages, transform tones, and optimize complex prompts without leaving the page.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 xl:gap-6 2xl:gap-8 justify-center items-center w-full max-w-2xl xl:max-w-4xl 2xl:max-w-5xl">
          {user ? (
            <Link href="/dashboard/editor" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 xl:px-10 2xl:px-12 h-12 xl:h-14 2xl:h-16 rounded-xl xl:rounded-2xl 2xl:rounded-[1.25rem] bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-base xl:text-lg 2xl:text-xl font-bold text-white shadow-lg shadow-indigo-600/10 transition-all">
              <span>Go to Editor Dashboard</span>
              <ArrowRight className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6" />
            </Link>
          ) : (
            <button 
              onClick={() => openAuthModal('signin')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 xl:px-10 2xl:px-12 h-12 xl:h-14 2xl:h-16 rounded-xl xl:rounded-2xl 2xl:rounded-[1.25rem] bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-md transition-all text-base xl:text-lg 2xl:text-xl"
            >
              <span>Continue with Google</span>
              <ChevronRight className="w-5 h-5 xl:w-6 xl:h-6 2xl:w-7 2xl:h-7 text-slate-300" />
            </button>
          )}

          <a 
            href="#demo"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 xl:px-10 2xl:px-12 h-12 xl:h-14 2xl:h-16 rounded-xl xl:rounded-2xl 2xl:rounded-[1.25rem] bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-base xl:text-lg 2xl:text-xl font-semibold text-slate-700 shadow-sm transition-all"
          >
            <span>See Interactive Demo</span>
          </a>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="max-w-7xl xl:max-w-[90rem] 2xl:max-w-[98rem] mx-auto px-6 xl:px-12 2xl:px-16 py-8 xl:py-12 2xl:py-14 relative z-10 w-full scroll-mt-16">
        <h2 className="text-3xl xl:text-5xl 2xl:text-6xl font-bold text-center text-slate-900 mb-8 xl:mb-12 2xl:mb-14">
          Powerful Utilities Built for Modern AI Productivity
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 xl:gap-12 2xl:gap-16">
          {/* Card 1 */}
          <div className="p-6 xl:p-8 2xl:p-10 rounded-2xl xl:rounded-3xl 2xl:rounded-[2rem] bg-white border border-slate-200/80 shadow-sm hover:border-slate-300/80 hover:shadow-md transition-all group">
            <div className="w-12 h-12 xl:w-16 xl:h-16 2xl:w-20 2xl:h-20 rounded-xl xl:rounded-2xl 2xl:rounded-[1.25rem] bg-violet-100 flex items-center justify-center mb-4 xl:mb-6 2xl:mb-8 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6 xl:w-8 xl:h-8 2xl:w-10 2xl:h-10 text-violet-600" />
            </div>
            <h3 className="text-xl xl:text-2xl 2xl:text-3xl font-bold text-slate-900 mb-2 xl:mb-3 2xl:mb-4">Prompt Optimization</h3>
            <p className="text-slate-650 xl:text-lg 2xl:text-xl leading-relaxed">
              Injects context, specificity, and constraints to turn a single-line request into a structured prompt that gets premium results.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 xl:p-8 2xl:p-10 rounded-2xl xl:rounded-3xl 2xl:rounded-[2rem] bg-white border border-slate-200/80 shadow-sm hover:border-slate-300/80 hover:shadow-md transition-all group">
            <div className="w-12 h-12 xl:w-16 xl:h-16 2xl:w-20 2xl:h-20 rounded-xl xl:rounded-2xl 2xl:rounded-[1.25rem] bg-indigo-100 flex items-center justify-center mb-4 xl:mb-6 2xl:mb-8 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 xl:w-8 xl:h-8 2xl:w-10 2xl:h-10 text-indigo-600" />
            </div>
            <h3 className="text-xl xl:text-2xl 2xl:text-3xl font-bold text-slate-900 mb-2 xl:mb-3 2xl:mb-4">Tone & Length Control</h3>
            <p className="text-slate-650 xl:text-lg 2xl:text-xl leading-relaxed">
              Instantly rewrite text into professional, persuasive, friendly, or executive tones. Shorten, expand, or simplify on the fly.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 xl:p-8 2xl:p-10 rounded-2xl xl:rounded-3xl 2xl:rounded-[2rem] bg-white border border-slate-200/80 shadow-sm hover:border-slate-300/80 hover:shadow-md transition-all group">
            <div className="w-12 h-12 xl:w-16 xl:h-16 2xl:w-20 2xl:h-20 rounded-xl xl:rounded-2xl 2xl:rounded-[1.25rem] bg-emerald-100 flex items-center justify-center mb-4 xl:mb-6 2xl:mb-8 group-hover:scale-110 transition-transform">
              <Layout className="w-6 h-6 xl:w-8 xl:h-8 2xl:w-10 2xl:h-10 text-emerald-600" />
            </div>
            <h3 className="text-xl xl:text-2xl 2xl:text-3xl font-bold text-slate-900 mb-2 xl:mb-3 2xl:mb-4">Universal Browser Injection</h3>
            <p className="text-slate-650 xl:text-lg 2xl:text-xl leading-relaxed">
              Integrates directly with Chrome, Brave, Edge, and Firefox to capture inputs on any page and apply replacements instantly.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section id="demo" className="w-full bg-slate-100/50 border-t border-slate-200 py-8 xl:py-12 2xl:py-14 relative z-10 scroll-mt-16">
        <div className="max-w-5xl xl:max-w-7xl 2xl:max-w-[90rem] mx-auto px-6 xl:px-12 2xl:px-16">
          <div className="text-center mb-6 xl:mb-8 2xl:mb-10">
            <h2 className="text-3xl xl:text-5xl 2xl:text-6xl font-bold text-slate-900 mb-2 xl:mb-3">See PromptPilot in Action</h2>
            <p className="text-slate-600 xl:text-xl 2xl:text-2xl max-w-xl xl:max-w-2xl 2xl:max-w-4xl mx-auto">
              Compare original text with PromptPilot enhanced outputs. Select a mode below to test.
            </p>
          </div>

          {/* Demo Controller Tabs */}
          <div className="flex justify-center gap-4 xl:gap-6 2xl:gap-8 mb-4 xl:mb-6 2xl:mb-8">
            {examples.map((ex, index) => (
              <button
                key={index}
                onClick={() => setSelectedExample(index)}
                className={`px-5 py-2.5 xl:px-8 xl:py-3.5 2xl:px-10 2xl:py-4.5 rounded-xl xl:rounded-2xl 2xl:rounded-3xl font-semibold text-sm xl:text-base 2xl:text-lg transition-all ${
                  selectedExample === index
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white text-slate-650 hover:text-slate-900 border border-slate-200 shadow-sm'
                }`}
              >
                {ex.label}
              </button>
            ))}
          </div>

          {/* Interactive Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 xl:gap-12 2xl:gap-16 bg-white border border-slate-200 rounded-3xl xl:rounded-[2rem] 2xl:rounded-[2.5rem] p-6 xl:p-8 2xl:p-10 relative w-full shadow-sm">
            <div className="absolute top-3 right-6 2xl:top-4 2xl:right-8 text-xs 2xl:text-sm text-indigo-600 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 text-indigo-500" />
              <span>{examples[selectedExample].action}</span>
            </div>

            {/* Before Column */}
            <div className="flex flex-col w-full">
              <div className="flex items-center justify-between mb-3 xl:mb-4 2xl:mb-6">
                <span className="text-sm xl:text-base 2xl:text-lg font-semibold text-slate-500 uppercase tracking-wider">Before</span>
                <span className="text-xs xl:text-sm 2xl:text-base px-2.5 py-1 xl:px-4 xl:py-1.5 2xl:px-5 2xl:py-2 rounded bg-red-50 border border-red-100 text-red-650 font-bold">
                  Score: {examples[selectedExample].scoreBefore}/100
                </span>
              </div>
              <div className="flex-1 p-5 xl:p-8 2xl:p-10 rounded-2xl xl:rounded-[1.5rem] 2xl:rounded-[2rem] bg-slate-50 border border-slate-200 font-mono text-sm xl:text-base 2xl:text-lg text-slate-700 whitespace-pre-line leading-relaxed min-h-[160px] xl:min-h-[240px] 2xl:min-h-[300px] w-full">
                {examples[selectedExample].before}
              </div>
            </div>

            {/* After Column */}
            <div className="flex flex-col w-full">
              <div className="flex items-center justify-between mb-3 xl:mb-4 2xl:mb-6">
                <span className="text-sm xl:text-base 2xl:text-lg font-semibold text-slate-900 flex items-center gap-1.5 2xl:gap-2">
                  <CheckCircle className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 text-emerald-600" />
                  <span>After (PromptPilot)</span>
                </span>
                <span className="text-xs xl:text-sm 2xl:text-base px-2.5 py-1 xl:px-4 xl:py-1.5 2xl:px-5 2xl:py-2 rounded bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold">
                  Score: {examples[selectedExample].scoreAfter}/100
                </span>
              </div>
              <div className="flex-1 p-5 xl:p-8 2xl:p-10 rounded-2xl xl:rounded-[1.5rem] 2xl:rounded-[2rem] bg-slate-50 border border-slate-200 font-mono text-sm xl:text-base 2xl:text-lg text-slate-900 whitespace-pre-line leading-relaxed min-h-[160px] xl:min-h-[240px] 2xl:min-h-[300px] relative overflow-hidden w-full">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                {examples[selectedExample].after}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 mt-auto relative z-10 bg-white w-full">
        <div className="max-w-7xl xl:max-w-[90rem] 2xl:max-w-[98rem] mx-auto px-6 xl:px-12 2xl:px-16 flex flex-col md:flex-row items-center justify-between gap-6 xl:gap-8">
          <p className="text-sm 2xl:text-base text-slate-500">&copy; 2026 PromptPilot. Built for elite productivity. Privacy First.</p>
          <div className="flex gap-6 2xl:gap-8 text-sm 2xl:text-base text-slate-500">
            <button onClick={() => setFooterModal('privacy')} className="hover:text-slate-900 transition-colors cursor-pointer bg-transparent border-0 text-sm 2xl:text-base text-slate-500 font-medium">Privacy Policy</button>
            <button onClick={() => setFooterModal('terms')} className="hover:text-slate-900 transition-colors cursor-pointer bg-transparent border-0 text-sm 2xl:text-base text-slate-500 font-medium">Terms of Service</button>
            <button onClick={() => setFooterModal('security')} className="hover:text-slate-900 transition-colors cursor-pointer bg-transparent border-0 text-sm 2xl:text-base text-slate-500 font-medium">Security</button>
          </div>
        </div>
      </footer>

      {/* Footer Modals */}
      {footerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
            onClick={() => setFooterModal(null)}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            {/* Decorative Glow */}
            <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full bg-indigo-600/5 blur-3xl pointer-events-none" />
            
            {/* Close button */}
            <button 
              onClick={() => setFooterModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="mb-4">
              <h3 className="text-xl font-bold text-slate-900">
                {footerModal === 'privacy' && 'Privacy Policy'}
                {footerModal === 'terms' && 'Terms of Service'}
                {footerModal === 'security' && 'Security Architecture'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Last Updated: June 11, 2026</p>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto pr-1 text-sm text-slate-650 space-y-4 leading-relaxed font-sans scrollbar-thin">
              {footerModal === 'privacy' && (
                <>
                  <p>
                    At PromptPilot, we prioritize your data privacy. This Privacy Policy details how we handle the text and prompts you process with our extension and dashboard.
                  </p>
                  
                  <h4 className="font-bold text-slate-900 text-sm mt-4">1. Zero Retention Principle</h4>
                  <p>
                    We do not store your raw or optimized prompts on our servers permanently unless you explicitly click <strong>Save to Library</strong>. Prompt processing is ephemeral, executing in memory and passing directly to target LLM endpoints.
                  </p>

                  <h4 className="font-bold text-slate-900 text-sm mt-4">2. Local Processing & Injection</h4>
                  <p>
                    All text edits on the web browser extension run locally within your browser context. Injection occurs on your device without transmitting page content to our databases.
                  </p>

                  <h4 className="font-bold text-slate-900 text-sm mt-4">3. Third-Party API Intermediaries</h4>
                  <p>
                    When processing prompts, we query secure API endpoints of foundational model providers (OpenAI, Anthropic, Google). These calls adhere to developer agreements that prohibit model training on customer inputs.
                  </p>

                  <h4 className="font-bold text-slate-900 text-sm mt-4">4. Account and Data Control</h4>
                  <p>
                    You maintain complete control. You can delete your saved prompts or terminate your account at any time. Accounts scheduled for deletion are completely wiped from our PostgreSQL databases after 30 days.
                  </p>
                </>
              )}

              {footerModal === 'terms' && (
                <>
                  <p>
                    By using PromptPilot, you agree to these Terms of Service. Please read them carefully to understand your rights and obligations.
                  </p>

                  <h4 className="font-bold text-slate-900 text-sm mt-4">1. Service Provision</h4>
                  <p>
                    PromptPilot provides text rewrite, tone modification, and prompt structure optimization utilities via web, browser extensions, and mobile clients. We strive for high service uptime and premium model performance.
                  </p>

                  <h4 className="font-bold text-slate-900 text-sm mt-4">2. User Accounts & Keys</h4>
                  <p>
                    You are responsible for keeping your account credentials secure. If you configure custom API credentials (such as OpenAI/Anthropic/Gemini keys) in the Settings panel, you remain responsible for the usage charges incurred on those endpoints.
                  </p>

                  <h4 className="font-bold text-slate-900 text-sm mt-4">3. Content Ownership</h4>
                  <p>
                    PromptPilot claims no ownership over the text inputs or optimized prompt outputs you generate. You retain all intellectual property rights and are solely responsible for ensuring your prompts comply with third-party platform rules.
                  </p>

                  <h4 className="font-bold text-slate-900 text-sm mt-4">4. Restrictions on Use</h4>
                  <p>
                    You agree not to exploit our platform to distribute malware, generate spam, bypass system safety alignments, or perform scraping operations that degrade service quality for others.
                  </p>
                </>
              )}

              {footerModal === 'security' && (
                <>
                  <p>
                    PromptPilot is engineered with robust security protocols to protect your API keys, credentials, and text streams.
                  </p>

                  <h4 className="font-bold text-slate-900 text-sm mt-4">1. Key Encryption</h4>
                  <p>
                    All API keys entered into the Settings panel are encrypted in transit using SSL/TLS protocols and stored at rest. We leverage Supabase's secure vault framework to prevent unauthorized key exposure.
                  </p>

                  <h4 className="font-bold text-slate-900 text-sm mt-4">2. Secure Sessions</h4>
                  <p>
                    User authentication and session tokens are managed via secure JWT policies. Session states are regularly refreshed, and database interactions utilize strict Row-Level Security (RLS) policies.
                  </p>

                  <h4 className="font-bold text-slate-900 text-sm mt-4">3. Transit Security</h4>
                  <p>
                    Every communication between the browser extension, the mobile app, and our API servers is protected using HTTPS with TLS 1.3 encryption, ensuring defense against man-in-the-middle vector attacks.
                  </p>

                  <h4 className="font-bold text-slate-900 text-sm mt-4">4. Audits & Compliance</h4>
                  <p>
                    Our architecture is monitored for vulnerabilities, and model provider integrations use enterprise-grade endpoints with strict data handling covenants.
                  </p>
                </>
              )}
            </div>

            {/* Footer button */}
            <div className="mt-6 border-t border-slate-100 pt-4 flex justify-end">
              <button 
                onClick={() => setFooterModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
            onClick={() => setIsAuthModalOpen(false)}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Decorative Glow */}
            <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full bg-violet-600/5 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-40 h-40 rounded-full bg-indigo-600/5 blur-3xl pointer-events-none" />

            {/* Close button */}
            <button 
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex justify-center mb-3">
                <svg className="w-12 h-12" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="pGradModal" x1="50" y1="165" x2="160" y2="40" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#7c3aed"/>
                      <stop offset="40%" stopColor="#2563eb"/>
                      <stop offset="75%" stopColor="#06b6d4"/>
                      <stop offset="100%" stopColor="#22d3ee"/>
                    </linearGradient>
                    <linearGradient id="speedGradModal" x1="10" y1="90" x2="70" y2="90" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#7c3aed"/>
                      <stop offset="100%" stopColor="#2563eb"/>
                    </linearGradient>
                  </defs>
                  <rect x="42" y="75" width="28" height="10" rx="5" fill="url(#speedGradModal)"/>
                  <rect x="15" y="95" width="18" height="10" rx="5" fill="#7c3aed"/>
                  <rect x="38" y="95" width="32" height="10" rx="5" fill="#2563eb"/>
                  <rect x="15" y="115" width="10" height="8" rx="4" fill="#1d4ed8"/>
                  <rect x="29" y="115" width="18" height="8" rx="4" fill="#2563eb"/>
                  <circle cx="85" cy="100" r="5" fill="#7c3aed"/>
                  <circle cx="102" cy="100" r="5" fill="#3b82f6"/>
                  <circle cx="119" cy="100" r="5" fill="#0ea5e9"/>
                  <path d="M 70 42 H 125 C 158 42, 172 65, 172 90 C 172 115, 158 138, 125 138 H 80 C 70 138, 62 148, 58 165 C 61 146, 70 128, 76 114 H 125 C 140 114, 146 102, 146 90 C 146 78, 140 66, 125 66 H 70 C 63 66, 63 42, 70 42 Z" fill="url(#pGradModal)"/>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">
                {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                {authMode === 'signin' 
                  ? 'Sign in to access your PromptPilot workspace' 
                  : 'Get started with PromptPilot today'}
              </p>
            </div>

            {authError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs text-center font-medium">
                {authError}
              </div>
            )}

            {message && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs text-center font-medium">
                {message}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-4 pr-10 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer flex items-center justify-center"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading || googleLoading}
                className="w-full inline-flex items-center justify-center h-10 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-semibold text-white shadow-md shadow-indigo-650/10 transition-all disabled:opacity-50 cursor-pointer"
              >
                {authLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : authMode === 'signin' ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400">Or continue with</span>
              </div>
            </div>

            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={authLoading || googleLoading}
              className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              ) : (
                <>
                  <svg className="w-4.5 h-4.5 mr-1" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                  </svg>
                  <span>Google</span>
                </>
              )}
            </button>

            {/* Switch mode */}
            <div className="text-center mt-6">
              <button
                onClick={() => {
                  setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                  setShowPassword(false);
                }}
                className="text-xs text-slate-500 hover:text-indigo-600 transition-colors"
              >
                {authMode === 'signin' 
                  ? "Don't have an account? Sign Up" 
                  : 'Already have an account? Sign In'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
