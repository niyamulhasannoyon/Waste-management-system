/**
 * Clean Savar — Google OAuth 2.0 Web Authentication Service
 * Official integration using Google Client ID & Secret
 */

export const GOOGLE_CONFIG = {
  clientId:
    process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  tokenInfoUrl: 'https://oauth2.googleapis.com/tokeninfo',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export interface GoogleTokenPayload {
  iss: string;
  sub: string;
  aud: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
}

export interface GoogleOAuthTokens {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
}

/**
 * Verifies a Google ID Token using Google's official tokeninfo endpoint.
 * Validates that the audience matches our configured Google Client ID.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenPayload> {
  const cleanToken = idToken.trim();
  if (!cleanToken) {
    throw new Error('Google ID token is required.');
  }

  const url = `${GOOGLE_CONFIG.tokenInfoUrl}?id_token=${encodeURIComponent(cleanToken)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('Google tokeninfo verification failed:', res.status, errorBody);
    throw new Error('Invalid or expired Google authentication token.');
  }

  const data = await res.json();

  // Validate audience matches our Client ID
  if (data.aud !== GOOGLE_CONFIG.clientId) {
    console.error('Google token audience mismatch:', {
      expected: GOOGLE_CONFIG.clientId,
      received: data.aud,
    });
    throw new Error('Google token audience does not match this application.');
  }

  return {
    iss: data.iss,
    sub: data.sub,
    aud: data.aud,
    email: data.email,
    email_verified: data.email_verified === 'true' || data.email_verified === true,
    name: data.name || data.email.split('@')[0],
    picture: data.picture,
    given_name: data.given_name,
    family_name: data.family_name,
    locale: data.locale,
  };
}

/**
 * Exchanges a Google Authorization Code for ID and Access tokens.
 */
export async function exchangeGoogleAuthCode(
  code: string,
  redirectUri: string,
): Promise<GoogleOAuthTokens> {
  const cleanCode = code.trim();
  if (!cleanCode) {
    throw new Error('Authorization code is required.');
  }

  const bodyParams = new URLSearchParams({
    code: cleanCode,
    client_id: GOOGLE_CONFIG.clientId,
    client_secret: GOOGLE_CONFIG.clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch(GOOGLE_CONFIG.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: bodyParams.toString(),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('Google token exchange error:', res.status, errorBody);
    throw new Error('Failed to exchange authorization code with Google.');
  }

  return (await res.json()) as GoogleOAuthTokens;
}

/**
 * Fetches user profile directly from Google's UserInfo API using a Google Access Token.
 */
export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleTokenPayload> {
  const cleanToken = accessToken.trim();
  if (!cleanToken) {
    throw new Error('Access token is required.');
  }

  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${cleanToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('Google UserInfo fetch failed:', res.status, errorBody);
    throw new Error('Failed to retrieve user profile from Google Cloud.');
  }

  const data = await res.json();
  return {
    iss: 'https://accounts.google.com',
    sub: data.sub,
    aud: GOOGLE_CONFIG.clientId,
    email: data.email,
    email_verified: data.email_verified === true || data.email_verified === 'true',
    name: data.name || data.email?.split('@')[0] || 'Google User',
    picture: data.picture,
    given_name: data.given_name,
    family_name: data.family_name,
    locale: data.locale,
  };
}
