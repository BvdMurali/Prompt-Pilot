import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    
    // Fetch the latest Android build record
    const { data: build, error } = await supabase
      .from('mobile_builds')
      .select('*')
      .eq('platform', 'android')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !build) {
      return NextResponse.json(
        { error: 'No builds found' },
        { status: 404 }
      );
    }

    // Get the download URL (support external URLs directly or fall back to Supabase Storage)
    let downloadUrl = '';
    if (build.file_path.startsWith('http://') || build.file_path.startsWith('https://')) {
      downloadUrl = build.file_path;
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from('builds')
        .getPublicUrl(build.file_path);
      downloadUrl = publicUrl;
    }

    // If query parameter download=true is passed, redirect to the direct file URL
    const searchParams = request.nextUrl.searchParams;
    const isDownload = searchParams.get('download') === 'true';

    if (isDownload) {
      return NextResponse.redirect(downloadUrl, { status: 307 });
    }

    // Otherwise return metadata
    return NextResponse.json({
      id: build.id,
      version: build.version,
      build_number: build.build_number,
      platform: build.platform,
      file_path: build.file_path,
      file_size: build.file_size,
      release_notes: build.release_notes,
      created_at: build.created_at,
      download_url: downloadUrl,
    });
  } catch (err) {
    console.error('Error fetching latest build:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
