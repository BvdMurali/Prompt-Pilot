import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    
    // 1. Verify Authentication / Secret Token
    const authHeader = request.headers.get('Authorization');
    const secretToken = process.env.MOBILE_BUILD_WEBHOOK_SECRET;

    if (!secretToken) {
      console.error('MOBILE_BUILD_WEBHOOK_SECRET is not configured on the server.');
      return NextResponse.json(
        { error: 'Webhook is not configured' },
        { status: 500 }
      );
    }

    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : request.nextUrl.searchParams.get('secret');

    if (token !== secretToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request payload
    const body = await request.json();
    
    // Check if it's a native Expo EAS Webhook payload
    const isEasWebhook = body.artifacts?.buildUrl !== undefined && body.metadata !== undefined;

    let version = body.version;
    let build_number = body.build_number;
    let platform = body.platform || 'android';
    let file_url = body.file_url;
    let file_path = body.file_path;
    let file_size = body.file_size;
    let release_notes = body.release_notes;

    if (isEasWebhook) {
      console.log('Detected Expo EAS Webhook payload.');
      // Ignore builds that are not finished
      if (body.status !== 'finished') {
        return NextResponse.json({ 
          success: true, 
          message: `Ignored build with status: ${body.status}` 
        });
      }
      
      version = body.metadata.appVersion;
      build_number = body.metadata.appBuildVersion;
      file_url = body.artifacts.buildUrl;
      platform = body.platform;
      release_notes = body.metadata.gitCommitMessage 
        || `EAS Build triggered (Commit: ${body.metadata.gitCommitHash?.substring(0, 7) || 'N/A'})`;
    }

    if (!version || !build_number) {
      return NextResponse.json(
        { error: 'Missing version or build_number in payload' },
        { status: 400 }
      );
    }

    if (!file_url && !file_path) {
      return NextResponse.json(
        { error: 'Missing file_url or file_path in payload' },
        { status: 400 }
      );
    }

    let finalFilePath = file_url || file_path;
    let finalFileSize = file_size || 0;

    // 3. If file size is not provided, fetch it using a fast HEAD request to prevent timeouts
    if (file_url && !file_size) {
      try {
        console.log(`Fetching file size for: ${file_url}`);
        const headRes = await fetch(file_url, { method: 'HEAD' });
        const contentLength = headRes.headers.get('content-length');
        if (contentLength) {
          finalFileSize = parseInt(contentLength, 10);
          console.log(`Resolved file size: ${finalFileSize} bytes`);
        }
      } catch (e) {
        console.warn('Failed to fetch file size via HEAD request:', e instanceof Error ? e.message : String(e));
      }
    }


    // 5. Delete old database records
    const { error: deleteDbError } = await supabase
      .from('mobile_builds')
      .delete()
      .eq('platform', platform);

    if (deleteDbError) {
      console.error('Failed to delete old build records from database:', deleteDbError);
    }

    // 6. Insert the new build record
    const { data: newRecord, error: insertError } = await supabase
      .from('mobile_builds')
      .insert({
        version,
        build_number: parseInt(build_number, 10),
        platform,
        file_path: finalFilePath,
        file_size: finalFileSize,
        release_notes: release_notes || ''
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      message: 'Mobile build updated and old builds cleaned up successfully.',
      build: newRecord
    });

  } catch (err) {
    console.error('Error handling mobile webhook:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
