import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard/editor';
  const returnUrl = requestUrl.searchParams.get('return');
  const isMobile = !!returnUrl;

  console.log('[api/auth/callback] GET requestUrl:', request.url);
  console.log('[api/auth/callback] code present:', !!code, 'isMobile:', isMobile, 'returnUrl:', returnUrl);

  let sessionData: any = null;

  if (code) {
    try {
      const cookieStore = await cookies();
      const supabase = createClient(cookieStore);
      console.log('[api/auth/callback] Exchanging OAuth code for session...');
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('[api/auth/callback] Code exchange error:', error.message);
      } else {
        console.log('[api/auth/callback] Code exchange success. Session user:', data.session?.user?.id);
        sessionData = data.session;
      }
    } catch (err) {
      console.error('[api/auth/callback] Server side session exchange failed:', err);
    }
  }

  if (isMobile) {
    // Return the HTML page for mobile deep-linking.
    // If we have sessionData (PKCE Flow), we append it to the deep link.
    // If not (Implicit Flow), the client-side JavaScript will read the hash fragment (window.location.hash)
    // from the URL and append it automatically to the deep link.
    const access_token = sessionData?.access_token || '';
    const refresh_token = sessionData?.refresh_token || '';
    const expires_in = sessionData?.expires_in || 3600;
    const token_type = sessionData?.token_type || 'bearer';

    const fragmentParams = new URLSearchParams();
    if (access_token) {
      fragmentParams.set('access_token', access_token);
      fragmentParams.set('refresh_token', refresh_token);
      fragmentParams.set('token_type', token_type);
      fragmentParams.set('expires_in', String(expires_in));
      fragmentParams.set('type', 'oauth');
    }

    const fragmentStr = fragmentParams.toString();
    const deepLink = fragmentStr ? `${returnUrl}#${fragmentStr}` : returnUrl;

    // Set cookie if we have a returnUrl
    try {
      const cookieStore = await cookies();
      cookieStore.set('mobile_return_url', returnUrl, {
        path: '/',
        maxAge: 3600,
        sameSite: 'lax',
        httpOnly: false,
      });
    } catch (cookieErr) {
      console.error('[api/auth/callback] Failed to set mobile_return_url cookie:', cookieErr);
    }

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
      var baseDeepLink = ${JSON.stringify(returnUrl)};
      var serverDeepLink = ${JSON.stringify(deepLink)};
      
      // If the server didn't have sessionData (e.g. Implicit Flow),
      // we read the tokens from the browser hash fragment
      var hash = window.location.hash || '';
      var finalDeepLink = serverDeepLink;
      
      if (hash && hash.indexOf('access_token') > -1) {
        finalDeepLink = baseDeepLink + hash;
      }

      var isAndroid = /Android/i.test(navigator.userAgent);
      var finalUrl = finalDeepLink;

      if (isAndroid) {
        var match = finalDeepLink.match(/^([^:]+):\\/\\/([^#?]*)(.*)$/);
        if (match) {
          var scheme = match[1];
          var hostAndPath = match[2];
          var queryAndFragment = match[3];
          
          var params = queryAndFragment;
          if (params.indexOf('#') === 0) {
            params = '?' + params.substring(1);
          }
          
          finalUrl = 'intent://' + hostAndPath + params + '#Intent;scheme=' + scheme + ';end;';
        }
      }

      var openBtn = document.getElementById('openBtn');
      if (openBtn) {
        openBtn.href = finalDeepLink;
      }

      var debugEl = document.getElementById('debug');
      if (debugEl) {
        debugEl.textContent = 'Platform: ' + (isAndroid ? 'Android' : 'Other') + ' | Intent: ' + finalUrl + ' | Raw: ' + finalDeepLink;
      }

      // Try automatic redirect
      try {
        window.location.href = finalDeepLink;
      } catch (e) {
        console.error('Raw redirect failed:', e);
      }
      
      if (isAndroid && finalUrl !== finalDeepLink) {
        setTimeout(function() {
          try {
            window.location.href = finalUrl;
          } catch (e) {
            console.error('Intent redirect failed:', e);
          }
        }, 800);
      }
      
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

  // ── Web dashboard redirect (default, non-mobile) ────────────────────────────
  return NextResponse.redirect(`${requestUrl.origin}${next}`);
}
