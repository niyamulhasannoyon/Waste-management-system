import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Handles Google OAuth 2.0 popup redirect callback.
 * Relays the credentials back to the opener window securely and self-closes.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Google Cloud Authentication</title>
</head>
<body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc;">
  <div style="text-align: center;">
    <p>Google Cloud যাচাইকরণ সম্পন্ন হচ্ছে...</p>
  </div>
  <script>
    (function() {
      var hash = window.location.hash.substring(1);
      var params = new URLSearchParams(hash || window.location.search);
      var accessToken = params.get('access_token');
      var idToken = params.get('id_token');
      var code = ${JSON.stringify(code)};
      var error = ${JSON.stringify(error)} || params.get('error');

      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_CLOUD_AUTH_RESPONSE',
          accessToken: accessToken,
          idToken: idToken,
          code: code,
          error: error
        }, window.location.origin);
        setTimeout(function() { window.close(); }, 300);
      } else {
        window.location.href = '/';
      }
    })();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Frame-Options': 'DENY',
    },
  });
}
