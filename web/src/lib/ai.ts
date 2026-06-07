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

const DEFAULT_SYSTEM_PROMPT = `You are PromptPilot, an elite AI prompt engineer and writing assistant.
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

async function callGemini(prompt: string, apiKey: string, model: string = 'gemini-3.1-flash-lite'): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
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
  const url = 'https://api.openai.com/v1/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
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
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
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
  const url = 'https://api.anthropic.com/v1/messages';
  const modelId = model === 'claude-3-5-sonnet' ? 'claude-3-5-sonnet-20241022' : model;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 4000,
      system: DEFAULT_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

export async function callLLM(params: CallParams): Promise<AIResult> {
  const { text, action, tone, length, platform, preferredModel = 'gemini-3.1-flash-lite', apiKeys } = params;

  // 1. Build prompt context
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

  const fullPrompt = `${DEFAULT_SYSTEM_PROMPT}\n\n${userInstructions}`;

  // 2. Select Provider
  let responseText = '';
  
  // Decrypt/Read API keys (override first, then default Env vars)
  const geminiKey = apiKeys?.gemini || process.env.GEMINI_API_KEY || '';
  const openaiKey = apiKeys?.openai || process.env.OPENAI_API_KEY || '';
  const anthropicKey = apiKeys?.anthropic || process.env.ANTHROPIC_API_KEY || '';
  const openrouterKey = apiKeys?.openrouter || process.env.OPENROUTER_API_KEY || '';

  // Retry configuration
  const maxRetries = 2;
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    try {
      const isOpenAIModel = preferredModel.startsWith('gpt') || 
                            preferredModel.startsWith('o1') || 
                            preferredModel.startsWith('o3');
      if (isOpenAIModel && openaiKey) {
        responseText = await callOpenAI(fullPrompt, openaiKey, preferredModel);
      } else if (preferredModel.startsWith('claude') && anthropicKey) {
        responseText = await callAnthropic(fullPrompt, anthropicKey, preferredModel);
      } else if ((preferredModel.includes('/') || preferredModel.includes('openrouter')) && openrouterKey) {
        responseText = await callOpenRouter(fullPrompt, openrouterKey, preferredModel);
      } else if (preferredModel.startsWith('gemini') && geminiKey) {
        responseText = await callGemini(fullPrompt, geminiKey, preferredModel);
      } else if (geminiKey) {
        responseText = await callGemini(fullPrompt, geminiKey, preferredModel);
      } else if (openrouterKey) {
        // Fallback to free OpenRouter Gemini if direct key is missing
        responseText = await callOpenRouter(fullPrompt, openrouterKey, 'google/gemini-2.5-flash:free');
      } else if (openaiKey) {
        responseText = await callOpenAI(fullPrompt, openaiKey, 'gpt-4o-mini');
      } else {
        throw new Error('No valid API keys configured for processing request.');
      }
      break; // Success! Exit retry loop
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      attempt++;
      if (attempt <= maxRetries) {
        await new Promise(res => setTimeout(res, 1000 * attempt)); // exponential backoff
      }
    }
  }

  if (!responseText) {
    throw new Error(`AI processing failed after ${attempt} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  // 3. Parse and Sanitize JSON Response
  try {
    // Sometimes models add ```json ... ``` formatting despite instructions
    let sanitized = responseText.trim();
    if (sanitized.startsWith('```')) {
      sanitized = sanitized.replace(/^```json\s*/i, '').replace(/```$/, '');
    }
    const result: AIResult = JSON.parse(sanitized.trim());
    return result;
    } catch {
      console.error('Failed to parse JSON response from LLM:', responseText);
    // Return a structured default if parsing fails
    return {
      improved_text: responseText,
      variations: [responseText],
      score: { overall: 70, clarity: 70, context: 60, constraints: 50, structure: 70, specificity: 70 },
      suggestions: ['Check formatting', 'Parser was unable to break down score metrics'],
      explanations: [{ action: 'Processed', why: 'System fallback due to JSON parsing error', how: 'Rendered raw model output' }]
    };
  }
}
