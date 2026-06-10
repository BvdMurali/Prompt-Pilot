'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Layout, Search, Copy, Save, Play } from 'lucide-react';
import { globalCache } from '@/lib/cache';

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
  const [search, setSearch] = useState(() => globalCache.templates.search);
  const [selectedId, setSelectedId] = useState<string | null>(() => globalCache.templates.selectedId);
  
  // Variables form state
  const [variables, setVariables] = useState<Record<string, string>>(() => globalCache.templates.variables);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(() => globalCache.templates.saved);
  const [error, setError] = useState('');

  // Sync state back to the cache
  useEffect(() => {
    globalCache.templates.search = search;
    globalCache.templates.selectedId = selectedId;
    globalCache.templates.variables = variables;
    globalCache.templates.saved = saved;
  }, [search, selectedId, variables, saved]);

  // Default Built-in Templates
  const systemTemplates: TemplateItem[] = [
    {
      id: 'template-resume',
      title: 'Resume Builder',
      description: 'Generate high-impact, ATS-optimized resume content with achievements aligned to target job descriptions.',
      content: 'Act as an expert resume writer and ATS optimization specialist. Rewrite my work history for [Target Role] at [Target Company]. Optimize for the keywords [Key Skills] and align the content with the responsibilities in [Job Description]. Convert each responsibility into an achievement using strong action verbs and quantifiable outcomes. If exact numbers are not available, infer realistic impact from the context without exaggeration. My work history details are: [Work History Details]. Return the result as polished resume bullets only.',
      tags: ['Career', 'Writing']
    },
    {
      id: 'template-cover-letter',
      title: 'Cover Letter Generator',
      description: 'Create tailored cover letters emphasizing qualifications and enthusiasm for specific companies.',
      content: 'Write a professional, highly persuasive cover letter for the [Role Name] position at [Company Name]. I have [Years of Experience] years of experience in [Key Expertise]. Emphasize my enthusiasm for the company’s work in [Company Focus] and explain how my background, achievements, and skills align with the role. Keep the tone executive but approachable, use specific and credible language, and keep it under 350 words. Structure it in 4 short paragraphs: opening interest, relevant experience, company alignment, and confident closing. Include measurable outcomes where possible and avoid generic phrases.',
      tags: ['Career', 'Writing']
    },
    {
      id: 'template-linkedin-outreach',
      title: 'LinkedIn Outreach',
      description: 'Craft high-conversion connection requests or InMail outreach messages for networking.',
      content: 'Write a LinkedIn connection request note to [Recipient Name], who is a [Recipient Title] at [Company Name]. Keep it within 300 characters. Mention genuine interest in [Shared Interest or Specific Project], show that I value their work, and suggest a short introductory chat. Keep the tone friendly, professional, and natural, without sounding salesy or overly formal.',
      tags: ['Social', 'Outreach']
    },
    {
      id: 'template-cold-email',
      title: 'Cold Email Campaign',
      description: 'Write personalized cold emails that secure responses and schedule product sales calls.',
      content: 'Write a high-converting cold email targeting [Prospect Job Title] in the [Industry Name] sector. Introduce our product [Product Name], which helps solve [Core Pain Point]. Keep the email warm, concise, and focused on value. Include a clear, low-friction call to action, such as a 5-minute chat or quick reply. Also provide 3–5 catchy, brief subject line options.',
      tags: ['Marketing', 'Sales']
    },
    {
      id: 'template-sql-generator',
      title: 'SQL Query Generator',
      description: 'Translate natural language descriptions of data into complex, optimized database queries.',
      content: 'Act as an elite SQL developer. Write a highly optimized [DB Dialect] query to [Describe Goal]. The tables involved are: [Table Schema Details]. Ensure the query handles null values safely, uses efficient joins and filters, and includes comments explaining key performance choices.',
      tags: ['Developer', 'Coding']
    },
    {
      id: 'template-code-review',
      title: 'Code Review Assistant',
      description: 'Perform strict production-grade reviews for bugs, security, readability, and performance.',
      content: 'Act as a Senior Tech Lead performing a strict production-grade code review. Review the following [Language] code snippet for: 1) bugs and edge-case failures, 2) security vulnerabilities, 3) readability and clean code issues, 4) performance bottlenecks, and 5) missing tests or maintainability risks. Structure the review as clear bullet points grouped by severity: Critical, Important, and Minor. For each issue, explain what is wrong, why it matters, and how to fix it. Then provide a rewritten, refactored version of the code. Code snippet: [Code Snippet].',
      tags: ['Developer', 'Coding']
    },
    {
      id: 'template-prd-generator',
      title: 'PRD Document Generator',
      description: 'Draft comprehensive, structured Product Requirement Documents detailing scopes, metrics, and user flows.',
      content: 'Write a comprehensive Product Requirements Document (PRD) for a new feature called [Feature Name]. The target users are [Target Audience]. The primary objectives are [Objectives]. Present the PRD in clean markdown and include: problem statement, goals, in-scope and out-of-scope items, assumptions, user stories, functional requirements, non-functional requirements, security and privacy requirements, dependencies, risks, success metrics (KPIs), analytics events, and detailed user flow descriptions. Make the document clear, structured, and actionable for product, design, and engineering teams.',
      tags: ['Product', 'Management']
    },
    {
      id: 'template-social-media',
      title: 'Social Media Post Multi-Pack',
      description: 'Write engaging posts for LinkedIn, Twitter/X, and Facebook from a single source topic.',
      content: 'Write 3 social media posts based on [Topic or Article Summary]:\n\nOne for LinkedIn: professional, insightful, and formatted with rich spacing for readability.\n\nOne for Twitter/X: punchy, concise, and under 280 characters.\n\nOne for Facebook: engaging, casual, and conversation-friendly.\n\nInclude relevant hashtags for each platform and add a [link placeholder] where appropriate. Adapt tone and length to each channel while keeping the core message consistent.',
      tags: ['Social', 'Marketing']
    }
  ];

  const selectedTemplate = systemTemplates.find(t => t.id === selectedId);

  // Field completed variables calculations
  const totalFields = Object.keys(variables).length;
  const completedFields = Object.values(variables).filter(v => v.trim().length > 0).length;
  const allFieldsCompleted = totalFields > 0 && Object.values(variables).every(v => v.trim().length > 0);

  const handleVariableChange = (name: string, value: string) => {
    setVariables(prev => ({ ...prev, [name]: value }));
  };

  // Compile prompt replacing variables
  const compilePrompt = () => {
    if (!selectedTemplate) return '';
    let compiled = selectedTemplate.content;
    const regex = /\[(.*?)\]/g;
    compiled = compiled.replace(regex, (fullMatch, innerText) => {
      let key = innerText;
      if (innerText.includes('=')) {
        key = innerText.split('=')[0].trim();
      }
      const val = variables[key];
      return val !== undefined && val !== '' ? val : fullMatch;
    });
    return compiled;
  };

  // Render Highlighted Preview React Nodes
  const renderHighlightPreview = () => {
    if (!selectedTemplate) return null;
    const segments = selectedTemplate.content.split(/(\[.*?\])/g);
    
    return segments.map((segment, index) => {
      if (segment.startsWith('[') && segment.endsWith(']')) {
        const innerText = segment.substring(1, segment.length - 1);
        let key = innerText;
        if (innerText.includes('=')) {
          key = innerText.split('=')[0].trim();
        }
        
        const val = variables[key];
        if (val !== undefined && val.trim() !== '') {
          return (
            <span 
              key={index} 
              className="rounded bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 text-indigo-700 font-medium font-sans inline-block"
            >
              {val}
            </span>
          );
        } else {
          const displayLabel = key.replace(/:\s*e\.g\..*$/, '');
          return (
            <span 
              key={index} 
              className="rounded bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 text-slate-400 font-medium font-sans inline-block"
            >
              {displayLabel}
            </span>
          );
        }
      }
      return <span key={index}>{segment}</span>;
    });
  };

  const handleClearAll = () => {
    if (!selectedTemplate) return;
    const regex = /\[(.*?)\]/g;
    let match;
    const clearedVars: Record<string, string> = {};
    while ((match = regex.exec(selectedTemplate.content)) !== null) {
      const fullInner = match[1];
      let key = fullInner;
      if (fullInner.includes('=')) {
        key = fullInner.split('=')[0].trim();
      }
      clearedVars[key] = '';
    }
    setVariables(clearedVars);
    setSaved(false);
    setCopied(false);
    setError('');
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
    <div className="flex-1 flex flex-col gap-8 xl:gap-12 max-w-7xl mx-auto w-full">
      {/* Header filter */}
      <div className="relative w-full lg:max-w-[320px] xl:max-w-[360px] 2xl:max-w-[400px]">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 xl:w-5 xl:h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search default templates or tags..."
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 xl:pl-12 pr-4 py-2.5 xl:py-3.5 text-sm xl:text-base text-slate-800 outline-none focus:border-indigo-500 transition-all shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8 xl:gap-12">
        
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
                  const fullInner = match[1];
                  if (fullInner.includes('=')) {
                    const [varName, defaultVal] = fullInner.split('=');
                    detectedVars[varName.trim()] = defaultVal.trim();
                  } else {
                    detectedVars[fullInner] = '';
                  }
                }
                setVariables(detectedVars);
                setCopied(false);
                setSaved(false);
                setError('');
              }}
              className={`p-4 xl:p-5.5 rounded-xl xl:rounded-2xl border text-left transition-all ${
                selectedId === t.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
              }`}
            >
              <div className="flex justify-between items-start gap-2 mb-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold uppercase tracking-wider">
                  {t.tags[0]}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1.5">{t.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{t.description}</p>
            </button>
          ))}
        </div>

        {/* TEMPLATE WORKSPACE PANEL */}
        <div className="lg:col-span-2 xl:col-span-3 flex flex-col gap-6 xl:gap-8 bg-white border border-slate-200 p-6 xl:p-8 rounded-2xl xl:rounded-3xl min-h-[450px] shadow-sm">
          {selectedTemplate ? (
            <div className="flex flex-col gap-6 h-full">
              
              {/* Workspace Header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">{selectedTemplate.title}</h3>
                  <p className="text-xs text-slate-500">{selectedTemplate.description}</p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    disabled={!allFieldsCompleted}
                    className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-650 hover:text-slate-900 transition-all flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? 'Copied' : 'Copy Prompt'}</span>
                  </button>
                  <button
                    onClick={handleSaveToLibrary}
                    disabled={saved || !allFieldsCompleted}
                    className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-650 hover:text-slate-900 transition-all flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saved ? 'Saved' : 'Save to Library'}</span>
                  </button>
                </div>
              </div>

              {error && <span className="text-xs text-red-500">{error}</span>}

              {/* Progress & Clear All Row */}
              <div className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold text-slate-600">
                <span>{completedFields} of {totalFields} fields completed</span>
                <button
                  onClick={handleClearAll}
                  className="text-indigo-650 hover:text-indigo-750 font-bold transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              </div>              {/* Workspace contents */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 xl:gap-10 2xl:gap-16 flex-1">
                {/* Variables Inputs Column */}
                <div className="flex flex-col gap-4 overflow-y-auto max-h-[350px] xl:max-h-[500px] 2xl:max-h-[650px] pr-2">
                  <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Template Variables</h4>
                  {Object.keys(variables).map((varName) => {
                    const isTextarea = /description|code|text|details|content/i.test(varName);
                    const labelText = varName.replace(/:\s*e\.g\..*$/, '');
                    
                    return (
                      <div key={varName} className="flex flex-col gap-1.5 xl:gap-2">
                        <label className="text-xs xl:text-sm 2xl:text-base font-semibold text-slate-700 capitalize flex items-center justify-between">
                          <span>{labelText}</span>
                          {variables[varName].trim().length === 0 && (
                            <span className="text-[10px] text-red-500 font-bold lowercase">required</span>
                          )}
                        </label>
                        {isTextarea ? (
                          <textarea
                            value={variables[varName]}
                            onChange={(e) => handleVariableChange(varName, e.target.value)}
                            placeholder={`Provide details for ${labelText.toLowerCase()}...`}
                            className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl xl:rounded-2xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500 resize-none leading-relaxed transition-all"
                          />
                        ) : (
                          <input
                            type="text"
                            value={variables[varName]}
                            onChange={(e) => handleVariableChange(varName, e.target.value)}
                            placeholder={`Provide ${labelText.toLowerCase()}...`}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl xl:rounded-2xl px-4 py-2 xl:py-3.5 text-sm xl:text-base text-slate-800 outline-none focus:border-indigo-500 transition-all"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Preview Column */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Compiled Preview</h4>
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs xl:text-sm 2xl:text-base font-mono text-slate-700 overflow-y-auto max-h-[350px] xl:max-h-[500px] 2xl:max-h-[650px] leading-relaxed whitespace-pre-wrap select-all">
                    {renderHighlightPreview()}
                  </div>
                </div>
              </div>

              {/* Load into Optimizer Link */}
              <div className="border-t border-slate-100 pt-4 flex justify-end">
                <a
                  href={allFieldsCompleted ? "/dashboard/editor" : "#"}
                  onClick={(e) => {
                    if (!allFieldsCompleted) {
                      e.preventDefault();
                      return;
                    }
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('promptpilot_scratch', compilePrompt());
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 text-xs font-bold transition-colors ${
                    allFieldsCompleted 
                      ? 'text-indigo-650 hover:text-indigo-755' 
                      : 'text-slate-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  <span>Load into Optimizer Workspace</span>
                  <Play className="w-3.5 h-3.5" />
                </a>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400">
              <Layout className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-700">Select a template to configure</p>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Choose a built-in template from the left list to fill variables and generate optimized prompts.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
