// ─────────────────────────────────────────────────────────────────────────────
// PromptPilot AI Library — V1 + V2 Engine
// ─────────────────────────────────────────────────────────────────────────────

// ─── Shared Call Params ───────────────────────────────────────────────────────
type CallParams = {
  text: string;
  action: 'optimize' | 'rewrite';
  tone?: string;
  length?: string;
  platform?: string;
  preferredModel?: string;
  apiKeys?: {
    gemini?: string;
    openai?: string;
    anthropic?: string;
    openrouter?: string;
  };
};

// ─── V1 Types (preserved for backward compatibility) ─────────────────────────
export type AIScoring = {
  overall: number;
  clarity: number;
  context: number;
  constraints: number;
  structure: number;
  specificity: number;
};

export type AIExplanation = {
  action: string;
  why: string;
  how: string;
};

export type AIResult = {
  improved_text: string;
  variations: string[];
  score: AIScoring;
  suggestions: string[];
  explanations: AIExplanation[];
};

// ─── V2 Types ────────────────────────────────────────────────────────────────
export type V2Status = 'optimized' | 'needs_clarification' | 'rejected';

export type IntentType =
  | 'Rewrite'
  | 'Optimize'
  | 'Summarize'
  | 'Translate'
  | 'Generate'
  | 'Technical Specification'
  | 'Email'
  | 'Resume'
  | 'LinkedIn'
  | 'Marketing'
  | 'Research'
  | 'Coding'
  | 'UI/UX'
  | 'Documentation'
  | 'Business'
  | 'General';

export type AIScoreV2 = {
  overall: { score: number; reason: string };
  clarity: { score: number; reason: string };
  context: { score: number; reason: string };
  constraints: { score: number; reason: string };
  structure: { score: number; reason: string };
  specificity: { score: number; reason: string };
};

export type AIResultV2 = {
  status: V2Status;
  confidence: number;
  intent?: IntentType;
  domain?: string;
  // status === 'optimized'
  optimized_text?: string;
  variations?: string[];
  score?: AIScoreV2;
  improvements?: string[];
  explanations?: AIExplanation[];
  suggestions?: string[];
  // status === 'needs_clarification'
  questions?: string[];
  // status === 'rejected'
  reason?: string;
};

// ─── V1 System Prompt (unchanged) ────────────────────────────────────────────
const V1_SYSTEM_PROMPT = `You are PromptPilot, an elite AI prompt engineer and writing assistant.
Your task is to analyze the user's text and perform the requested action, outputting a valid JSON object.

If action is 'optimize':
Transform the user's input text (which is a prompt they want to send to another AI) into a highly structured, professional, and optimized prompt. Follow best practices for the target platform (ChatGPT, Claude, Gemini, etc.) if specified.
Add necessary details like clear role definition, context, clear step-by-step instructions, constraints, output format rules, and examples.

If action is 'rewrite':
Rewrite the user's text (could be an email, document, message, etc.) based on the requested tone (e.g. professional, friendly, casual) and length adjustments (e.g. shorten, expand, simplify).

Your output must be a JSON object with this EXACT structure (do not include markdown wrapping inside the JSON fields):
{
  "improved_text": "The optimized prompt or rewritten text.",
  "variations": [
    "Alternative Version A (different angle or style)",
    "Alternative Version B (different angle or style)",
    "Alternative Version C (different angle or style)"
  ],
  "score": {
    "overall": 85,
    "clarity": 90,
    "context": 80,
    "constraints": 70,
    "structure": 90,
    "specificity": 95
  },
  "suggestions": [
    "Suggestion 1 to make it even better",
    "Suggestion 2 to make it even better"
  ],
  "explanations": [
    {
      "action": "Action name (e.g., Added persona, Changed tone)",
      "why": "Why this change was made.",
      "how": "How it improves the AI output or communication."
    }
  ]
}

Ensure the output is pure JSON. Do not include markdown code block formatting (like \`\`\`json) in the response. Return raw JSON text.`;

// ─── V2 System Prompt — 6-Stage Intelligent Pipeline ─────────────────────────
const V2_SYSTEM_PROMPT = `You are PromptPilot V2, an advanced intelligent prompt optimization engine.

Your objective is NOT to blindly rewrite user inputs. You must run a 6-stage processing pipeline and determine whether to optimize, ask for clarification, or reject the request.

GOLDEN RULE: If understanding is uncertain — ask. Do not guess. Do not hallucinate context.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STAGE 1 — INTENT DETECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Classify the request into exactly one of:
Rewrite | Optimize | Summarize | Translate | Generate | Technical Specification | Email | Resume | LinkedIn | Marketing | Research | Coding | UI/UX | Documentation | Business | General

Return intent_confidence (0–100).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STAGE 2 — DOMAIN DETECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Determine the likely domain: Software Development | AI/ML | Prompt Engineering | Product Design | Marketing | Legal | Healthcare | Business | Education | Unknown

If domain_confidence < 70 mark as uncertain.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STAGE 3 — AMBIGUITY DETECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Identify project-specific or ambiguous terms (skills, rules, workflows, agents, pipelines, framework, configuration, playbook, memory, knowledge base, antigravity, etc.)

For each: mark as "clearly defined", "potentially ambiguous", or "unknown".

If more than one term is ambiguous: set needs_clarification = true.

Calculate ambiguity_score (0–100). High ambiguity = high score.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STAGE 4 — CONTEXT SUFFICIENCY CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Evaluate required vs missing information.

NEVER assume if missing_information_pct > 40.

Examples of insufficient context:
- "write resume" → missing: target role, experience, skills
- "optimize this" → missing: what it is, for whom, why

If missing > 40%: set needs_clarification = true.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STAGE 5 — TOXICITY AND SAFETY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Classify content as: Safe | Profanity | Toxic | Harassment | Hate | Dangerous

Rules:
- Profanity: Allow optimization, sanitize language in output
- Toxic: Convert into constructive communication
- Harassment: Rewrite into professional communication  
- Hate or Dangerous: REJECT — return status "rejected"

Never amplify abusive content.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STAGE 6 — CONFIDENCE CALCULATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
overall_confidence = (intent_confidence × domain_confidence × context_confidence) / 10000

If overall_confidence < 65 OR ambiguity_score > 70 OR missing_information_pct > 40:
  → Return status "needs_clarification" with 2–5 concise questions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HALLUCINATION PREVENTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before generating output, compare original concepts vs generated concepts.
If new concepts > 25%: reduce optimization depth.
If new concepts > 40%: trigger clarification mode.

For rewrites: preserve original intent and scope. Do not introduce new concepts. Correct grammar and structure only.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT — RETURN PURE JSON ONLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For SUCCESSFUL optimization (status: "optimized"):
{
  "status": "optimized",
  "confidence": 87,
  "intent": "Email",
  "domain": "Business",
  "optimized_text": "The optimized prompt or rewritten text.",
  "variations": [
    "Alternative Version A",
    "Alternative Version B",
    "Alternative Version C"
  ],
  "score": {
    "overall": { "score": 88, "reason": "Well-structured with clear objective and constraints" },
    "clarity": { "score": 92, "reason": "Objective is unambiguous" },
    "context": { "score": 85, "reason": "Sufficient background provided" },
    "constraints": { "score": 80, "reason": "Output format defined" },
    "structure": { "score": 90, "reason": "Logical flow maintained" },
    "specificity": { "score": 88, "reason": "Target audience and goals are stated" }
  },
  "improvements": [
    "Added clear role definition",
    "Specified output format constraints"
  ],
  "suggestions": [
    "Consider adding a concrete example",
    "Specify a deadline or urgency level"
  ],
  "explanations": [
    {
      "action": "Added persona",
      "why": "Giving the AI a role increases response precision.",
      "how": "The AI will tailor its output to match the specified expert role."
    }
  ]
}

For CLARIFICATION NEEDED (status: "needs_clarification"):
{
  "status": "needs_clarification",
  "confidence": 52,
  "intent": "Resume",
  "domain": "Unknown",
  "questions": [
    "What is the target job role or industry?",
    "How many years of experience should be highlighted?",
    "Which specific skills or technologies should be featured?"
  ]
}

For REJECTION (status: "rejected"):
{
  "status": "rejected",
  "confidence": 0,
  "reason": "This request contains content that violates our usage policy and cannot be processed."
}

CRITICAL: Output ONLY raw JSON. No markdown. No code fences. No explanation outside the JSON.`;

// ─── Provider Functions (shared by V1 + V2) ───────────────────────────────────
async function callGemini(prompt: string, apiKey: string, model: string = 'gemini-2.0-flash-lite'): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callOpenAI(prompt: string, apiKey: string, model: string = 'gpt-4o-mini'): Promise<string> {
  const systemPrompt = prompt.split('\n\n')[0];
  const userContent = prompt.split('\n\n').slice(1).join('\n\n');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent || prompt }
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callOpenRouter(prompt: string, apiKey: string, model: string = 'google/gemini-2.5-flash:free'): Promise<string> {
  const systemPrompt = prompt.split('\n\n')[0];
  const userContent = prompt.split('\n\n').slice(1).join('\n\n');
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent || prompt }
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callAnthropic(prompt: string, apiKey: string, model: string = 'claude-3-5-sonnet'): Promise<string> {
  const modelId = model === 'claude-3-5-sonnet' ? 'claude-3-5-sonnet-20241022' : model;
  const systemPrompt = prompt.split('\n\n')[0];
  const userContent = prompt.split('\n\n').slice(1).join('\n\n');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent || prompt }],
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }
  const data = await response.json();
  return data.content?.[0]?.text || '';
}

// ─── Provider Dispatcher (shared) ────────────────────────────────────────────
async function dispatchToProvider(
  fullPrompt: string,
  preferredModel: string,
  apiKeys: { gemini?: string; openai?: string; anthropic?: string; openrouter?: string }
): Promise<string> {
  const geminiKey = apiKeys?.gemini || '';
  const openaiKey = apiKeys?.openai || '';
  const anthropicKey = apiKeys?.anthropic || '';
  const openrouterKey = apiKeys?.openrouter || '';

  const isOpenAIModel = preferredModel.startsWith('gpt') || preferredModel.startsWith('o1') || preferredModel.startsWith('o3');

  if (isOpenAIModel && openaiKey) return callOpenAI(fullPrompt, openaiKey, preferredModel);
  if (preferredModel.startsWith('claude') && anthropicKey) return callAnthropic(fullPrompt, anthropicKey, preferredModel);
  if ((preferredModel.includes('/') || preferredModel.includes('openrouter')) && openrouterKey) return callOpenRouter(fullPrompt, openrouterKey, preferredModel);
  if (preferredModel.startsWith('gemini') && geminiKey) return callGemini(fullPrompt, geminiKey, preferredModel);
  if (geminiKey) return callGemini(fullPrompt, geminiKey, preferredModel);
  if (openrouterKey) return callOpenRouter(fullPrompt, openrouterKey, 'google/gemini-2.5-flash:free');
  if (openaiKey) return callOpenAI(fullPrompt, openaiKey, 'gpt-4o-mini');
  if (anthropicKey) return callAnthropic(fullPrompt, anthropicKey, 'claude-3-5-sonnet');
  throw new Error('No API key configured. Please add your API key in Settings → API Key Overrides to start using PromptPilot.');
}

// ─── JSON Sanitizer ───────────────────────────────────────────────────────────
function sanitizeJSON(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '');
  }
  return s.trim();
}

// ─── V1 Public API (kept for backward compatibility) ─────────────────────────
export async function callLLM(params: CallParams): Promise<AIResult> {
  const { text, action, tone, length, platform, preferredModel = 'gemini-2.0-flash-lite', apiKeys = {} } = params;

  const userInstructions = `
Action: ${action.toUpperCase()}
Tone Requested: ${tone || 'default'}
Length Requested: ${length || 'default'}
Target AI Platform: ${platform || 'general'}

Input Text to Process:
"""
${text}
"""
`;

  const fullPrompt = `${V1_SYSTEM_PROMPT}\n\n${userInstructions}`;

  const maxRetries = 2;
  let attempt = 0;
  let responseText = '';
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    try {
      responseText = await dispatchToProvider(fullPrompt, preferredModel, apiKeys);
      break;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      attempt++;
      if (attempt <= maxRetries) await new Promise(res => setTimeout(res, 1000 * attempt));
    }
  }

  if (!responseText) {
    throw new Error(`AI processing failed after ${attempt} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  try {
    const result: AIResult = JSON.parse(sanitizeJSON(responseText));
    return result;
  } catch {
    console.error('Failed to parse V1 JSON response from LLM:', responseText);
    return {
      improved_text: responseText,
      variations: [responseText],
      score: { overall: 70, clarity: 70, context: 60, constraints: 50, structure: 70, specificity: 70 },
      suggestions: ['Check formatting', 'Parser was unable to break down score metrics'],
      explanations: [{ action: 'Processed', why: 'System fallback due to JSON parsing error', how: 'Rendered raw model output' }]
    };
  }
}

// ─── V2 Public API ────────────────────────────────────────────────────────────
export async function callLLMV2(params: CallParams): Promise<AIResultV2> {
  const { text, action, tone, length, platform, preferredModel = 'gemini-2.0-flash-lite', apiKeys = {} } = params;

  const userInstructions = `
Action Requested: ${action.toUpperCase()}
Tone Preference: ${tone || 'not specified'}
Length Preference: ${length || 'not specified'}
Target AI Platform: ${platform || 'general'}

User Input Text:
"""
${text}
"""

Now run the full 6-stage pipeline and return a single valid JSON object as your response.`;

  const fullPrompt = `${V2_SYSTEM_PROMPT}\n\n${userInstructions}`;

  const maxRetries = 2;
  let attempt = 0;
  let responseText = '';
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    try {
      responseText = await dispatchToProvider(fullPrompt, preferredModel, apiKeys);
      break;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      attempt++;
      if (attempt <= maxRetries) await new Promise(res => setTimeout(res, 1000 * attempt));
    }
  }

  if (!responseText) {
    throw new Error(`AI processing failed after ${attempt} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  try {
    const result: AIResultV2 = JSON.parse(sanitizeJSON(responseText));
    // Validate the status field exists
    if (!result.status || !['optimized', 'needs_clarification', 'rejected'].includes(result.status)) {
      throw new Error('Invalid V2 response: missing or unknown status field');
    }
    return result;
  } catch (parseErr) {
    console.error('Failed to parse V2 JSON response from LLM:', responseText);
    // Attempt a graceful fallback — treat as optimized with the raw text
    return {
      status: 'optimized',
      confidence: 60,
      intent: 'General',
      domain: 'Unknown',
      optimized_text: responseText,
      variations: [],
      score: {
        overall: { score: 60, reason: 'Parser fallback — manual review recommended' },
        clarity: { score: 60, reason: 'Could not extract structured score' },
        context: { score: 60, reason: 'Could not extract structured score' },
        constraints: { score: 60, reason: 'Could not extract structured score' },
        structure: { score: 60, reason: 'Could not extract structured score' },
        specificity: { score: 60, reason: 'Could not extract structured score' },
      },
      improvements: [],
      suggestions: ['Review output manually — JSON parsing encountered an error'],
      explanations: [{ action: 'Processed', why: 'System fallback due to JSON parsing error', how: 'Rendered raw model output' }],
    };
  }
}
