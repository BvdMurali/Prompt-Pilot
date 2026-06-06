import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { callLLM } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const supabase = getSupabaseServerClient(authHeader);

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
    const { text, action, tone, length, platform } = body;

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

    const preferredModel = settings?.preferred_model || 'gemini-2.5-flash';
    const apiKeys = settings?.api_key_override || {};

    // 4. Invoke LLM layer
    const result = await callLLM({
      text,
      action,
      tone,
      length,
      platform,
      preferredModel,
      apiKeys,
    });

    // 5. Store in history (DB writing)
    const { error: historyError } = await supabase
      .from('history')
      .insert({
        user_id: user.id,
        original_input: text,
        optimized_output: result.improved_text,
        action_used: action === 'optimize' ? 'optimize_prompt' : `rewrite_${tone || 'default'}`,
        metadata: {
          score: result.score,
          explanations: result.explanations,
          variations: result.variations,
          suggestions: result.suggestions,
          platform: platform || 'general',
          tone: tone || null,
          length: length || null,
          model: preferredModel,
        },
      });

    if (historyError) {
      console.error('Error writing optimization history:', historyError);
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
