import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard/editor';

  // The mobile app encodes its own deep-link URL in the `return` param so
  // this server knows exactly where to redirect after auth completes.
  // e.g. in Expo Go:   exp://192.168.x.x:8081
  //      in standalone: promptpilot://
  const returnUrl = requestUrl.searchParams.get('return');
  const isMobile = !!returnUrl;

  console.log('[api/auth/callback] GET requestUrl:', request.url);
  console.log('[api/auth/callback] code present:', !!code, 'isMobile:', isMobile, 'returnUrl:', returnUrl);

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    console.log('[api/auth/callback] Exchanging OAuth code for session...');
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[api/auth/callback] Code exchange error:', error.message);
    } else {
      console.log('[api/auth/callback] Code exchange success. Session user:', data.session?.user?.id);
    }

    if (!error && data.session && isMobile) {
      const { access_token, refresh_token, expires_in, token_type } = data.session;

      const fragment = new URLSearchParams({
        access_token,
        refresh_token: refresh_token ?? '',
        token_type: token_type ?? 'bearer',
        expires_in: String(expires_in ?? 3600),
        type: 'oauth',
      }).toString();

      // Build the deep link back to the mobile app
      const deepLink = `${returnUrl}#${fragment}`;

      // Return an HTML page that:
      // 1. Auto-redirects via JS (works in most cases)
      // 2. Shows a manual "Open App" button as fallback
      // Using HTML instead of NextResponse.redirect because:
      // - Custom scheme redirects (exp://, promptpilot://) can be blocked by browsers
      // - window.location assignment works more reliably for custom schemes on Android
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Login Successful — PromptPilot</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f172a;
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 40px 32px;
      max-width: 360px;
      width: 100%;
      text-align: center;
    }
    .icon { font-size: 48px; margin-bottom: 20px; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
    p { font-size: 14px; color: #94a3b8; margin-bottom: 28px; line-height: 1.6; }
    .btn {
      display: block;
      width: 100%;
      padding: 14px;
      background: #6366f1;
      color: white;
      font-size: 16px;
      font-weight: 600;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.2s;
    }
    .btn:hover { background: #4f46e5; }
    .status { font-size: 12px; color: #64748b; margin-top: 16px; }
    .debug { font-size: 10px; color: #475569; margin-top: 24px; word-break: break-all; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>Login Successful!</h1>
    <p>You have signed in with Google. Tap the button below to return to PromptPilot.</p>
    <a class="btn" id="openBtn" href="${deepLink}">Open PromptPilot App</a>
    <p class="status" id="status">Attempting to open app automatically...</p>
    <p class="debug" id="debug"></p>
  </div>
  <script>
    (function() {
      var deepLink = ${JSON.stringify(deepLink)};
      var isAndroid = /Android/i.test(navigator.userAgent);
      var finalUrl = deepLink;

      if (isAndroid) {
        // Parse the deep link to construct an Android Intent URL
        // e.g. exp://10.66.53.216:8081#access_token=...
        // or promptpilot://#access_token=...
        var match = deepLink.match(/^([^:]+):\\/\\/([^#?]*)(.*)$/);
        if (match) {
          var scheme = match[1];
          var hostAndPath = match[2];
          var queryAndFragment = match[3];
          
          var params = queryAndFragment;
          // Change fragment hash (#) to query (?) for intent data URL parameter passing
          if (params.indexOf('#') === 0) {
            params = '?' + params.substring(1);
          }
          
          // We omit the package name (package=...) to prevent Android Chrome from
          // redirecting to the Google Play Store if it fails to resolve the app.
          // This allows implicit intent matching, which is safer for local development.
          finalUrl = 'intent://' + hostAndPath + params + '#Intent;scheme=' + scheme + ';end;';
        }
      }

      // Update button href: KEEP it as the raw deepLink (e.g. exp:// or promptpilot://)
      // because when a user clicks the button, it is a user gesture and custom schemes
      // are always allowed to open the app directly without intent:// wrapping.
      var openBtn = document.getElementById('openBtn');
      if (openBtn) {
        openBtn.href = deepLink;
      }

      // Show debug URL
      var debugEl = document.getElementById('debug');
      if (debugEl) {
        debugEl.textContent = 'Platform: ' + (isAndroid ? 'Android' : 'Other') + ' | Intent: ' + finalUrl + ' | Raw: ' + deepLink;
      }

      // Try automatic redirect using the raw custom scheme link first
      try {
        window.location.href = deepLink;
      } catch (e) {
        console.error('Raw redirect failed:', e);
      }
      
      // Fallback: Try automatic redirect using the intent link after a short delay
      if (isAndroid && finalUrl !== deepLink) {
        setTimeout(function() {
          try {
            window.location.href = finalUrl;
          } catch (e) {
            console.error('Intent redirect failed:', e);
          }
        }, 800);
      }
      
      // Update status text if redirect doesn't trigger immediately
      setTimeout(function() {
        var statusEl = document.getElementById('status');
        if (statusEl) {
          statusEl.textContent = 'If the app did not open, tap the button above.';
        }
      }, 2500);
    })();
  </script>
</body>
</html>`;

      return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Failed to exchange code — show error
    if (error && isMobile) {
      return new Response(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Auth Error</title>
<style>body{font-family:sans-serif;background:#0f172a;color:#f1f5f9;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;text-align:center;}</style>
</head><body><div><h1>⚠️ Authentication Error</h1><p style="color:#94a3b8;margin-top:12px">${error.message}</p><p style="margin-top:20px;font-size:13px;color:#64748b">Please close this and try again.</p></div></body></html>`,
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }
  }

  // ── Web dashboard redirect (default, non-mobile) ────────────────────────────
  return NextResponse.redirect(`${requestUrl.origin}${next}`);
}
