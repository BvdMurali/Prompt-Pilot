'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Sparkles, ArrowRight, Zap, Layout, Globe, ChevronRight, CheckCircle, Menu, X } from 'lucide-react';

export default function LandingPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const [selectedExample, setSelectedExample] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col relative overflow-x-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[60%] rounded-full bg-indigo-900/20 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[80%] h-[60%] rounded-full bg-violet-900/20 blur-[150px] pointer-events-none" />

      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Navigation Header */}
      <header className={`transition-all duration-350 sticky top-0 z-50 border-b ${
        isScrolled 
          ? 'border-slate-900 bg-slate-950/80 backdrop-blur-md shadow-lg shadow-slate-950/20' 
          : 'border-slate-900 bg-slate-950'
      }`}>
        <div className="max-w-7xl xl:max-w-[90rem] 2xl:max-w-[95rem] mx-auto px-6 xl:px-12 h-16 xl:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
            </div>
            <span>Prompt<span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Pilot</span></span>
          </Link>

          <nav className="hidden sm:flex items-center gap-6">
            <a href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">Features</a>
            <a href="#demo" className="text-sm text-slate-400 hover:text-white transition-colors">Interactive Demo</a>
            {loading ? (
              <div className="w-20 h-8 rounded-lg bg-slate-900 animate-pulse" />
            ) : user ? (
              <Link href="/dashboard/editor" className="inline-flex items-center gap-1.5 px-4 h-9 xl:px-5 xl:h-10 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm xl:text-base font-semibold text-white transition-all shadow-md shadow-indigo-600/10">
                <span>Dashboard</span>
                <ArrowRight className="w-4 h-4 xl:w-5 xl:h-5" />
              </Link>
            ) : (
              <button 
                onClick={signInWithGoogle}
                className="px-4 h-9 xl:px-5 xl:h-10 rounded-lg bg-slate-900 hover:bg-slate-800 text-sm xl:text-base font-semibold text-white border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-2"
              >
                <span>Sign In</span>
              </button>
            )}
          </nav>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 rounded-lg border border-slate-900 bg-slate-950 text-slate-455 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
          </button>
        </div>

        {/* Mobile Navigation Menu Overlay */}
        {mobileMenuOpen && (
          <div className="sm:hidden fixed inset-x-0 top-16 bg-slate-950/95 backdrop-blur-md border-b border-slate-900 z-45 p-6 flex flex-col gap-4 animate-fade-in shadow-2xl">
            <a 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm text-slate-400 hover:text-white py-2 border-b border-slate-900/60"
            >
              Features
            </a>
            <a 
              href="#demo" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm text-slate-400 hover:text-white py-2 border-b border-slate-900/60"
            >
              Interactive Demo
            </a>
            <div className="pt-2">
              {loading ? (
                <div className="w-full h-10 rounded-lg bg-slate-900 animate-pulse" />
              ) : user ? (
                <Link 
                  href="/dashboard/editor" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 h-10 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-semibold text-white transition-all shadow-md shadow-indigo-600/10"
                >
                  <span>Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signInWithGoogle();
                  }}
                  className="w-full px-4 h-10 rounded-lg bg-slate-900 hover:bg-slate-800 text-sm font-semibold text-white border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl xl:max-w-[90rem] 2xl:max-w-[95rem] mx-auto px-6 xl:px-12 pt-20 xl:pt-32 pb-16 flex flex-col items-center text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs xl:text-sm font-semibold text-violet-300 mb-8 animate-fade-in">
          <Globe className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
          <span>Universal Browser Extension Available Now</span>
        </div>

        <h1 className="text-5xl md:text-7xl xl:text-8xl 2xl:text-[5.5rem] font-extrabold tracking-tight max-w-4xl xl:max-w-6xl leading-tight md:leading-none 2xl:leading-[1.15] text-white mb-6">
          The Intelligent AI Layer for <br />
          <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
            Every Text Box on the Web
          </span>
        </h1>

        <p className="text-lg md:text-xl xl:text-2xl text-slate-400 max-w-2xl xl:max-w-4xl mb-10 xl:mb-14 leading-relaxed">
          PromptPilot sits invisibly between you and any input field. Instantly rewrite messages, transform tones, and optimize complex prompts without leaving the page.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 xl:gap-6 justify-center items-center w-full max-w-2xl xl:max-w-4xl">
          {user ? (
            <Link href="/dashboard/editor" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 xl:px-10 h-12 xl:h-14 rounded-xl xl:rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-base xl:text-lg font-bold text-white shadow-xl shadow-indigo-500/20 transition-all">
              <span>Go to Editor Dashboard</span>
              <ArrowRight className="w-4 h-4 xl:w-5 xl:h-5" />
            </Link>
          ) : (
            <button 
              onClick={signInWithGoogle}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 xl:px-10 h-12 xl:h-14 rounded-xl xl:rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-bold shadow-lg transition-all text-base xl:text-lg"
            >
              <span>Continue with Google</span>
              <ChevronRight className="w-5 h-5 xl:w-6 xl:h-6 text-slate-500" />
            </button>
          )}

          <a 
            href="#demo"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 xl:px-10 h-12 xl:h-14 rounded-xl xl:rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-base xl:text-lg font-semibold text-slate-350 transition-all"
          >
            <span>See Interactive Demo</span>
          </a>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="max-w-7xl xl:max-w-[90rem] 2xl:max-w-[95rem] mx-auto px-6 xl:px-12 py-20 xl:py-32 relative z-10 w-full scroll-mt-16">
        <h2 className="text-3xl xl:text-5xl font-bold text-center text-white mb-16 xl:mb-24">
          Powerful Utilities Built for Modern AI Productivity
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 xl:gap-12">
          {/* Card 1 */}
          <div className="p-8 xl:p-12 rounded-2xl xl:rounded-3xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-all group">
            <div className="w-12 h-12 xl:w-16 xl:h-16 rounded-xl xl:rounded-2xl bg-violet-500/10 flex items-center justify-center mb-6 xl:mb-8 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6 xl:w-8 xl:h-8 text-violet-400" />
            </div>
            <h3 className="text-xl xl:text-2xl font-bold text-white mb-3 xl:mb-4">Prompt Optimization</h3>
            <p className="text-slate-400 xl:text-lg leading-relaxed">
              Injects context, specificity, and constraints to turn a single-line request into a structured prompt that gets premium results.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-8 xl:p-12 rounded-2xl xl:rounded-3xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-all group">
            <div className="w-12 h-12 xl:w-16 xl:h-16 rounded-xl xl:rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 xl:mb-8 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 xl:w-8 xl:h-8 text-indigo-400" />
            </div>
            <h3 className="text-xl xl:text-2xl font-bold text-white mb-3 xl:mb-4">Tone & Length Control</h3>
            <p className="text-slate-400 xl:text-lg leading-relaxed">
              Instantly rewrite text into professional, persuasive, friendly, or executive tones. Shorten, expand, or simplify on the fly.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-8 xl:p-12 rounded-2xl xl:rounded-3xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-all group">
            <div className="w-12 h-12 xl:w-16 xl:h-16 rounded-xl xl:rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 xl:mb-8 group-hover:scale-110 transition-transform">
              <Layout className="w-6 h-6 xl:w-8 xl:h-8 text-emerald-400" />
            </div>
            <h3 className="text-xl xl:text-2xl font-bold text-white mb-3 xl:mb-4">Universal Browser Injection</h3>
            <p className="text-slate-400 xl:text-lg leading-relaxed">
              Integrates directly with Chrome, Brave, Edge, and Firefox to capture inputs on any page and apply replacements instantly.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section id="demo" className="max-w-5xl xl:max-w-7xl mx-auto px-6 xl:px-12 py-20 xl:py-32 relative z-10 w-full scroll-mt-16">
        <div className="text-center mb-12 xl:mb-16">
          <h2 className="text-3xl xl:text-5xl font-bold text-white mb-4 xl:mb-6">See PromptPilot in Action</h2>
          <p className="text-slate-400 xl:text-xl max-w-xl xl:max-w-2xl mx-auto">
            Compare original text with PromptPilot enhanced outputs. Select a mode below to test.
          </p>
        </div>

        {/* Demo Controller Tabs */}
        <div className="flex justify-center gap-4 xl:gap-6 mb-8 xl:mb-12">
          {examples.map((ex, index) => (
            <button
              key={index}
              onClick={() => setSelectedExample(index)}
              className={`px-5 py-2.5 xl:px-8 xl:py-3.5 rounded-xl xl:rounded-2xl font-semibold text-sm xl:text-base transition-all ${
                selectedExample === index
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {ex.label}
            </button>
          ))}
        </div>

        {/* Interactive Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 xl:gap-12 bg-slate-900/30 border border-slate-800/80 backdrop-blur-sm rounded-3xl xl:rounded-[2rem] p-8 xl:p-12 relative">
          <div className="absolute top-3 right-6 text-xs text-indigo-400 font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{examples[selectedExample].action}</span>
          </div>

          {/* Before Column */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-4 xl:mb-6">
              <span className="text-sm xl:text-base font-semibold text-slate-500 uppercase tracking-wider">Before</span>
              <span className="text-xs xl:text-sm px-2.5 py-1 xl:px-4 xl:py-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-bold">
                Score: {examples[selectedExample].scoreBefore}/100
              </span>
            </div>
            <div className="flex-1 p-5 xl:p-8 rounded-2xl xl:rounded-[1.5rem] bg-slate-950 border border-slate-900 font-mono text-sm xl:text-base text-slate-400 whitespace-pre-line leading-relaxed min-h-[160px] xl:min-h-[240px]">
              {examples[selectedExample].before}
            </div>
          </div>

          {/* After Column */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-4 xl:mb-6">
              <span className="text-sm xl:text-base font-semibold text-white flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 xl:w-5 xl:h-5 text-emerald-400" />
                <span>After (PromptPilot)</span>
              </span>
              <span className="text-xs xl:text-sm px-2.5 py-1 xl:px-4 xl:py-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold animate-pulse">
                Score: {examples[selectedExample].scoreAfter}/100
              </span>
            </div>
            <div className="flex-1 p-5 xl:p-8 rounded-2xl xl:rounded-[1.5rem] bg-slate-950 border border-slate-800/50 font-mono text-sm xl:text-base text-slate-100 whitespace-pre-line leading-relaxed min-h-[160px] xl:min-h-[240px] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
              {examples[selectedExample].after}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-12 mt-auto relative z-10 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-sm text-slate-500">&copy; 2026 PromptPilot. Built for elite productivity. Privacy First.</p>
          <div className="flex gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
