import { AIResultV2 } from '@/lib/ai';

export interface PromptItem {
  id: string;
  title: string;
  content: string;
  is_favorite: boolean;
  category: string;
  created_at: string;
}

export interface HistoryItem {
  id: string;
  original_input: string;
  optimized_output: string;
  action_used: string;
  metadata: {
    score?: {
      overall: number;
      clarity: number;
      context: number;
      constraints: number;
      structure: number;
      specificity: number;
    };
    explanations?: Array<{
      action: string;
      why: string;
      how: string;
    }>;
    platform?: string;
    model?: string;
  };
  created_at: string;
}

export const globalCache = {
  editor: {
    text: '',
    action: 'optimize' as 'optimize' | 'rewrite',
    tone: '',
    length: '',
    platform: '',
    result: null as AIResultV2 | null,
    activeVariation: null as number | null,
    saved: false,
  },
  library: {
    prompts: [] as PromptItem[],
    search: '',
  },
  templates: {
    search: '',
    selectedId: null as string | null,
    variables: {} as Record<string, string>,
    saved: false,
  },
  history: {
    historyList: [] as HistoryItem[],
    selectedId: null as string | null,
  }
};
