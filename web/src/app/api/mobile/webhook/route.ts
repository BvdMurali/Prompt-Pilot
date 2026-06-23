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

    let finalFilePath = file_path || `android/promptpilot-v${version}-${build_number}.apk`;
    let finalFileSize = file_size || 0;

    // 3. Handle APK download & upload if file_url is provided
    if (file_url) {
      console.log(`Fetching build from: ${file_url}`);
      const fileResponse = await fetch(file_url);
      if (!fileResponse.ok) {
        throw new Error(`Failed to fetch build from url: ${fileResponse.statusText}`);
      }
      
      const arrayBuffer = await fileResponse.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);
      finalFileSize = fileBuffer.length;

      console.log(`Uploading build to Supabase Storage: ${finalFilePath} (${finalFileSize} bytes)`);
      const { error: uploadError } = await supabase.storage
        .from('builds')
        .upload(finalFilePath, fileBuffer, {
          contentType: 'application/vnd.android.package-archive',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }
    }

    // 4. Implement Retention Option A: Delete older APK files from storage
    // Query all existing builds for the same platform
    const { data: existingBuilds, error: fetchBuildsError } = await supabase
      .from('mobile_builds')
      .select('file_path')
      .eq('platform', platform);

    if (fetchBuildsError) {
      console.error('Failed to fetch existing builds for cleanup:', fetchBuildsError);
    } else if (existingBuilds && existingBuilds.length > 0) {
      const filesToDelete = existingBuilds
        .map(b => b.file_path)
        .filter(path => path !== finalFilePath); // Do not delete the one we just uploaded

      if (filesToDelete.length > 0) {
        console.log(`Cleaning up old build files from storage:`, filesToDelete);
        const { error: deleteStorageError } = await supabase.storage
          .from('builds')
          .remove(filesToDelete);

        if (deleteStorageError) {
          console.error('Failed to delete old builds from storage:', deleteStorageError);
        }
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
