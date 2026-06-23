import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { callLLM, callLLMV2 } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    let supabase;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
          global: {
            headers: { Authorization: `Bearer ${token}` },
          },
        }
      );
    } else {
      const cookieStore = await cookies();
      supabase = createServerClient(cookieStore);
    }

    // 1. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to use PromptPilot API.' },
        { status: 401 }
      );
    }

    // 2. Parse request payload
    const body = await request.json();
    const { text, action, tone, length, platform, version = 'v2' } = body;

    if (!text || !action) {
      return NextResponse.json(
        { error: 'Missing required parameters: text and action' },
        { status: 400 }
      );
    }

    // 3. Retrieve user settings & custom key overrides
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('preferred_model, api_key_override')
      .eq('user_id', user.id)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching settings:', settingsError);
    }

    const preferredModel = settings?.preferred_model || 'gemini-2.0-flash-lite';
    const apiKeys = settings?.api_key_override || {};

    const callParams = { text, action, tone, length, platform, preferredModel, apiKeys };

    // 4. Invoke LLM — V2 (default) or V1 (legacy fallback)
    let result;
    let isV2 = version !== 'v1';

    if (isV2) {
      result = await callLLMV2(callParams);
    } else {
      result = await callLLM(callParams);
    }

    // 5. Store in history
    // V2: only write to history when the result is a successful optimization
    const shouldWriteHistory = isV2
      ? (result as any).status === 'optimized'
      : true;

    if (shouldWriteHistory) {
      const outputText = isV2
        ? (result as any).optimized_text
        : (result as any).improved_text;

      const actionUsed = action === 'optimize'
        ? 'optimize_prompt'
        : `rewrite_${tone || 'default'}`;

      const { error: historyError } = await supabase
        .from('history')
        .insert({
          user_id: user.id,
          original_input: text,
          optimized_output: outputText,
          action_used: actionUsed,
          metadata: {
            // V1 fields (kept for existing history viewers)
            score: isV2 ? undefined : (result as any).score,
            explanations: (result as any).explanations,
            variations: (result as any).variations,
            suggestions: (result as any).suggestions,
            // V2 enriched fields
            v2_status: isV2 ? (result as any).status : undefined,
            confidence: isV2 ? (result as any).confidence : undefined,
            intent: isV2 ? (result as any).intent : undefined,
            domain: isV2 ? (result as any).domain : undefined,
            improvements: isV2 ? (result as any).improvements : undefined,
            // Common fields
            platform: platform || 'general',
            tone: tone || null,
            length: length || null,
            model: preferredModel,
            api_version: isV2 ? 'v2' : 'v1',
          },
        });

      if (historyError) {
        console.error('Error writing optimization history:', historyError);
      }
    }

    // 6. Record analytics event
    const { error: analyticsError } = await supabase
      .from('analytics_events')
      .insert({
        user_id: user.id,
        event_name: 'prompt_processed',
        properties: {
          action,
          tone,
          length,
          platform,
          model: preferredModel,
          api_version: isV2 ? 'v2' : 'v1',
          v2_status: isV2 ? (result as any).status : undefined,
          confidence: isV2 ? (result as any).confidence : undefined,
        },
      });

    if (analyticsError) {
      console.error('Error tracking analytics event:', analyticsError);
    }

    // 7. Return structured result
    return NextResponse.json(result);

  } catch (error) {
    console.error('API Error in /api/prompt/process:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
