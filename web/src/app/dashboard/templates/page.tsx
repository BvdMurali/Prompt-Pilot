'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Layout, Search, Copy, Save, Play } from 'lucide-react';

type TemplateItem = {
  id: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
};

export default function TemplatesPage() {
  const { session } = useAuth();
  
  // States
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Variables form state
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Default Built-in Templates
  const systemTemplates: TemplateItem[] = [
    {
      id: 'template-resume',
      title: 'Resume Builder',
      description: 'Generate high-impact resume content with achievements aligned to target job descriptions.',
      content: 'Act as an expert resume writer. Revise my work history bullets to align with the role of [Target Role] at [Target Company]. Highlight my skills in [Key Skills]. Ensure all points use strong action verbs and show measurable achievements or KPIs in the form of [Metric or Impact example: increased conversions by 20%]. Here is my work history: [Work History Details]',
      tags: ['Career', 'Writing']
    },
    {
      id: 'template-cover-letter',
      title: 'Cover Letter Generator',
      description: 'Create tailored cover letters emphasizing qualifications and enthusiasm for specific companies.',
      content: 'Write a professional, highly persuasive cover letter for the [Role Name] position at [Company Name]. I have [Years of Experience] years of experience in [Key Expertise]. Emphasize my enthusiasm for their recent initiatives in [Company Focus] and state how my skills align. Tone should be executive but approachable. Keep it under 350 words.',
      tags: ['Career', 'Writing']
    },
    {
      id: 'template-linkedin-outreach',
      title: 'LinkedIn Outreach',
      description: 'Craft high-conversion connection requests or InMail outreach messages for networking.',
      content: 'Write a LinkedIn connection request note to [Recipient Name] who is a [Recipient Title] at [Company Name]. Keep it within 300 characters. Express interest in [Shared Interest or Specific Project] and suggest a short introductory chat. Avoid sounding salesy; maintain a friendly and professional tone.',
      tags: ['Social', 'Outreach']
    },
    {
      id: 'template-cold-email',
      title: 'Cold Email Campaign',
      description: 'Write personalized cold emails that secure responses and schedule product sales calls.',
      content: 'Write a high-converting cold email targeting [Prospect Job Title] in the [Industry Name] sector. Introduce our product [Product Name] which solves the pain point of [Core Pain Point]. Include a clear, low-friction call to action (e.g. a 5-minute chat). Keep the tone warm, concise, and focused on value delivery. Subject line options should be catchy and brief.',
      tags: ['Marketing', 'Sales']
    },
    {
      id: 'template-sql-generator',
      title: 'SQL Query Generator',
      description: 'Translate natural language descriptions of data into complex, optimized PostgreSQL queries.',
      content: 'Act as an elite SQL developer. Write a highly optimized [DB Dialect: e.g. PostgreSQL] query to [Describe Goal: e.g. find top 5 customers by order value who made purchases in the last 30 days]. The tables involved are: [Table Schema Details]. Ensure query handles null values and includes comments detailing performance logic.',
      tags: ['Developer', 'Coding']
    },
    {
      id: 'template-code-review',
      title: 'Code Review Assistant',
      description: 'Analyze code snippets for bugs, security vulnerabilities, readability, and performance issues.',
      content: 'Act as a Senior Tech Lead. Perform a strict code review on the following [Language] code snippet. Analyze it for: 1. Core bugs or edge-case failures, 2. Security vulnerabilities, 3. Readability and compliance with clean code principles, 4. Performance optimizations. Structure your review into clear bullet points and provide rewritten code blocks showing refactored solutions. Code snippet: [Code Snippet]',
      tags: ['Developer', 'Coding']
    },
    {
      id: 'template-prd-generator',
      title: 'PRD Document Generator',
      description: 'Draft comprehensive Product Requirement Documents detailing scopes, metrics, and user flows.',
      content: 'Write a comprehensive Product Requirement Document (PRD) for a new feature called [Feature Name]. The target users are [Target Audience]. The primary objectives are [Objectives]. Outline the key user stories, non-functional security requirements, success metrics (KPIs), and detailed user flow descriptions. Present in clean markdown structures.',
      tags: ['Product', 'Management']
    },
    {
      id: 'template-social-media',
      title: 'Social Media Post Multi-Pack',
      description: 'Write engaging posts for LinkedIn, Twitter, and Facebook from a single source topic.',
      content: 'Write 3 social media posts (one for LinkedIn, one for Twitter, and one for Facebook) based on this topic: [Topic or Article Summary]. For LinkedIn, focus on professional lessons and use rich spacing. For Twitter, keep it punchy and under 280 characters. For Facebook, keep it engaging and casual. Include relevant hashtags and placeholders for links.',
      tags: ['Social', 'Marketing']
    }
  ];

  const selectedTemplate = systemTemplates.find(t => t.id === selectedId);

  // Variables are extracted in the template button onClick handler

  const handleVariableChange = (name: string, value: string) => {
    setVariables(prev => ({ ...prev, [name]: value }));
  };

  // Compile prompt replacing variables
  const compilePrompt = () => {
    if (!selectedTemplate) return '';
    let compiled = selectedTemplate.content;
    Object.entries(variables).forEach(([key, value]) => {
      // Escape special regex characters in variable name
      const safeKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      compiled = compiled.replace(new RegExp(`\\[${safeKey}\\]`, 'g'), value || `[${key}]`);
    });
    return compiled;
  };

  const handleCopy = () => {
    const prompt = compilePrompt();
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToLibrary = async () => {
    if (!selectedTemplate || !session?.user) return;
    try {
      const prompt = compilePrompt();
      const { error } = await supabase
        .from('prompts')
        .insert({
          user_id: session.user.id,
          title: `Template: ${selectedTemplate.title}`,
          content: prompt,
          category: selectedTemplate.tags[0] || 'Template'
        });

      if (error) throw error;
      setSaved(true);
    } catch (err) {
      setError('Save failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const filteredTemplates = systemTemplates.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) || 
    t.description.toLowerCase().includes(search.toLowerCase()) ||
    t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col gap-8">
      {/* Header filter */}
      <div className="relative max-w-md xl:max-w-xl">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 xl:w-5 xl:h-5 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search default templates or tags..."
          className="w-full bg-slate-900/40 border border-slate-900 rounded-xl pl-10 xl:pl-12 pr-4 py-2.5 xl:py-3.5 text-sm xl:text-base text-slate-200 outline-none focus:border-indigo-500 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-12">
        
        {/* TEMPLATE LIST PANEL */}
        <div className="lg:col-span-1 flex flex-col gap-4 max-h-[250px] lg:max-h-[600px] xl:max-h-[750px] 2xl:max-h-[850px] overflow-y-auto pr-1">
          {filteredTemplates.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setSelectedId(t.id);
                const regex = /\[(.*?)\]/g;
                let match;
                const detectedVars: Record<string, string> = {};
                while ((match = regex.exec(t.content)) !== null) {
                  const varName = match[1];
                  detectedVars[varName] = '';
                }
                setVariables(detectedVars);
                setCopied(false);
                setSaved(false);
                setError('');
              }}
              className={`p-4 xl:p-5.5 rounded-xl xl:rounded-2xl border text-left transition-all ${
                selectedId === t.id
                  ? 'border-indigo-500 bg-indigo-600/5'
                  : 'border-slate-900 bg-slate-900/10 hover:border-slate-800'
              }`}
            >
              <div className="flex justify-between items-start gap-2 mb-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-550/10 border border-indigo-550/20 text-indigo-400 font-bold uppercase tracking-wider">
                  {t.tags[0]}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">{t.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{t.description}</p>
            </button>
          ))}
        </div>

        {/* TEMPLATE WORKSPACE PANEL */}
        <div className="lg:col-span-2 flex flex-col gap-6 xl:gap-8 bg-slate-900/40 border border-slate-900 p-6 xl:p-8 rounded-2xl xl:rounded-3xl min-h-[450px]">
          {selectedTemplate ? (
            <div className="flex flex-col gap-6 h-full">
              
              {/* Workspace Header */}
              <div className="flex justify-between items-start border-b border-slate-850 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white mb-1">{selectedTemplate.title}</h3>
                  <p className="text-xs text-slate-400">{selectedTemplate.description}</p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? 'Copied' : 'Copy Prompt'}</span>
                  </button>
                  <button
                    onClick={handleSaveToLibrary}
                    disabled={saved}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saved ? 'Saved' : 'Save to Library'}</span>
                  </button>
                </div>
              </div>

              {error && <span className="text-xs text-red-400">{error}</span>}

              {/* Workspace contents */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                {/* Variables Inputs Column */}
                <div className="flex flex-col gap-4 overflow-y-auto max-h-[350px] xl:max-h-[500px] 2xl:max-h-[650px] pr-2">
                  <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Template Variables</h4>
                  {Object.keys(variables).map((varName) => (
                    <div key={varName} className="flex flex-col gap-1.5 xl:gap-2">
                      <label className="text-xs xl:text-sm font-semibold text-slate-355 capitalize">
                        {varName.replace(/:\s*e\.g\..*$/, '')}
                      </label>
                      <input
                        type="text"
                        value={variables[varName]}
                        onChange={(e) => handleVariableChange(varName, e.target.value)}
                        placeholder={`Provide ${varName.replace(/:\s*e\.g\..*$/, '')}`}
                        className="bg-slate-950 border border-slate-800 rounded-xl xl:rounded-2xl px-4 py-2 xl:py-3.5 text-sm xl:text-base text-slate-200 outline-none focus:border-indigo-500"
                      />
                    </div>
                  ))}
                </div>

                {/* Preview Column */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Compiled Preview</h4>
                  <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 overflow-y-auto max-h-[350px] xl:max-h-[500px] 2xl:max-h-[650px] leading-relaxed whitespace-pre-wrap select-all">
                    {compilePrompt()}
                  </div>
                </div>
              </div>

              {/* Load into Optimizer Link */}
              <div className="border-t border-slate-850 pt-4 flex justify-end">
                <a
                  href="/dashboard/editor"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('promptpilot_scratch', compilePrompt());
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <span>Load into Optimizer Workspace</span>
                  <Play className="w-3.5 h-3.5" />
                </a>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
              <Layout className="w-10 h-10 text-slate-700 mb-3" />
              <p className="text-sm font-semibold text-slate-350">Select a template to configure</p>
              <p className="text-xs max-w-xs mt-1">
                Choose a built-in template from the left list to fill variables and generate optimized prompts.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
