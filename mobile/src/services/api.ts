// ─── V2 Types (mirrored from web/src/lib/ai.ts) ──────────────────────────────
export type V2Status = 'optimized' | 'needs_clarification' | 'rejected';

export interface AIScoreField {
  score: number;
  reason: string;
}

export interface AIScoreV2 {
  overall: AIScoreField | number;
  clarity?: AIScoreField | number;
  context?: AIScoreField | number;
  constraints?: AIScoreField | number;
  structure?: AIScoreField | number;
  specificity?: AIScoreField | number;
}

export interface AIExplanation {
  action: string;
  why: string;
  how: string;
}

export interface AIResultV2 {
  status: V2Status;
  confidence: number;
  intent?: string;
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
}

// ─── Request Payload ──────────────────────────────────────────────────────────
export interface ProcessPayload {
  text: string;
  action: 'optimize' | 'rewrite';
  tone?: string;
  length?: string;
  platform?: string;
  version: 'v2' | 'v1';
}

// ─── API Call ─────────────────────────────────────────────────────────────────
export const processPromptApi = async (
  apiUrl: string,
  token: string | null,
  payload: ProcessPayload
): Promise<AIResultV2> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${apiUrl}/api/prompt/process`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Server error occurred while processing prompt.');
  }

  return data as AIResultV2;
};

// ─── Score Helpers ────────────────────────────────────────────────────────────
export function scoreNum(s: AIScoreField | number | undefined): number {
  if (!s) return 0;
  if (typeof s === 'number') return s;
  return s.score;
}

export function scoreReason(s: AIScoreField | number | undefined): string | null {
  if (!s || typeof s === 'number') return null;
  return s.reason;
}
