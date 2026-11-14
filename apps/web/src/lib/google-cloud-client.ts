/**
 * Clean Savar — Google Cloud Identity Services (GIS) Client
 * Direct Google Cloud OAuth 2.0 Web Client (No Firebase dependency)
 */

export const GOOGLE_CLOUD_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            prompt?: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              error_description?: string;
            }) => void;
          }) => {
            requestAccessToken: (override?: { prompt?: string }) => void;
          };
        };
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

let gsiScriptLoadedPromise: Promise<void> | null = null;

export function loadGoogleGsiScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.oauth2) return Promise.resolve();

  if (gsiScriptLoadedPromise) return gsiScriptLoadedPromise;

  gsiScriptLoadedPromise = new Promise<void>((resolve, reject) => {
    // Check if script already exists in DOM
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services.')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services SDK.'));
    document.head.appendChild(script);
  });

  return gsiScriptLoadedPromise;
}

export interface GoogleCloudAuthResult {
  accessToken?: string;
  idToken?: string;
  userEmail?: string;
  userName?: string;
}

/**
 * Triggers native Google Cloud OAuth 2.0 Account Picker Popup
 * Pure Google Cloud Platform — zero Firebase requirement.
 */
export async function signInWithGoogleCloud(): Promise<GoogleCloudAuthResult> {
  if (typeof window === 'undefined') {
    throw new Error('Google Cloud Sign-In is only available in the browser.');
  }

  try {
    await loadGoogleGsiScript();
  } catch (err) {
    console.warn('GSI script load note:', err);
  }

  // 1. If Google Identity Services SDK is available on window
  if (window.google?.accounts?.oauth2) {
    return new Promise((resolve, reject) => {
      try {
        const tokenClient = window.google!.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLOUD_CLIENT_ID,
          scope: 'openid email profile',
          prompt: 'select_account',
          callback: async (resp) => {
            if (resp.error) {
              if (resp.error === 'popup_closed_by_user') {
                reject(new Error('Google সাইন-ইন উইন্ডো বন্ধ করা হয়েছে।'));
                return;
              }
              reject(new Error(resp.error_description || resp.error));
              return;
            }

            if (!resp.access_token) {
              reject(new Error('Google থেকে কোনো অ্যাক্সেস টোকেন পাওয়া যায়নি।'));
              return;
            }

            // Optional: fetch user profile directly to confirm details
            let userEmail: string | undefined;
            let userName: string | undefined;
            try {
              const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${resp.access_token}` },
              });
              if (infoRes.ok) {
                const info = await infoRes.json();
                userEmail = info.email;
                userName = info.name;
              }
            } catch {
              // Ignore failure, server will verify
            }

            resolve({
              accessToken: resp.access_token,
              userEmail,
              userName,
            });
          },
        });

        tokenClient.requestAccessToken({ prompt: 'select_account' });
      } catch (e) {
        reject(e);
      }
    });
  }

  // 2. Fallback: Direct OAuth 2.0 Popup Window if script blocked
  return new Promise((resolve, reject) => {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const redirectUri = `${window.location.origin}/api/auth/google/callback`;

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      GOOGLE_CLOUD_CLIENT_ID,
    )}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&response_type=token%20id_token&scope=openid%20email%20profile&prompt=select_account&nonce=${Date.now()}`;

    const popup = window.open(
      authUrl,
      'google_cloud_login',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`,
    );

    if (!popup) {
      reject(new Error('ব্রাউজার পপআপ ব্লক করেছে। অনুগ্রহ করে পপআপ অনুমোদন করুন।'));
      return;
    }

    // Listen for message from popup callback
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'GOOGLE_CLOUD_AUTH_RESPONSE') {
        window.removeEventListener('message', handleMessage);
        clearInterval(checkTimer);
        popup?.close();
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve({
            accessToken: event.data.accessToken,
            idToken: event.data.idToken,
          });
        }
      }
    }

    window.addEventListener('message', handleMessage);

    const checkTimer = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkTimer);
        window.removeEventListener('message', handleMessage);
        reject(new Error('Google সাইন-ইন উইন্ডো বন্ধ করা হয়েছে।'));
      }
    }, 1000);
  });
}
