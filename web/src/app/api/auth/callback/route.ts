import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard/editor';

  // ── Mobile app deep-link redirect ───────────────────────────────────────────
  // When the mobile app initiates Google OAuth, it sets redirectTo to this
  // callback URL with a `mobile=1` query param. After Supabase exchanges the
  // code, we redirect back to the mobile app scheme instead of the web dashboard.
  //
  // Flow:
  //   Mobile app → Supabase OAuth → Google → Supabase callback →
  //   THIS route (with ?code=xxx&mobile=1) → exchanges code → redirects to
  //   promptpilot://#access_token=yyy&refresh_token=zzz  (app opens directly)
  const isMobile = requestUrl.searchParams.get('mobile') === '1';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session && isMobile) {
      // Build the mobile deep-link URL with tokens in the hash fragment
      const { access_token, refresh_token, expires_in, token_type } = data.session;
      const mobileRedirect = new URL('promptpilot://');
      const fragment = new URLSearchParams({
        access_token,
        refresh_token: refresh_token ?? '',
        token_type: token_type ?? 'bearer',
        expires_in: String(expires_in ?? 3600),
        type: 'oauth',
      });
      // Redirect to the mobile app with tokens — the Expo deep link handler
      // will catch this and establish the session
      return NextResponse.redirect(`promptpilot://#${fragment.toString()}`);
    }
  }

  // ── Web dashboard redirect (default) ────────────────────────────────────────
  return NextResponse.redirect(`${requestUrl.origin}${next}`);
}
