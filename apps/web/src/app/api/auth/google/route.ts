import crypto from 'crypto';
import { NextResponse } from 'next/server';
import {
  verifyGoogleIdToken,
  exchangeGoogleAuthCode,
  fetchGoogleUserInfo,
  type GoogleTokenPayload,
} from '@/lib/google-auth';
import { normalizeBdPhone } from '@/lib/utils';
import { isAllowedDevEmail, isUserApprovedAdmin } from '@/lib/dev-store';

export const runtime = 'nodejs';

const API_BASE = (
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://clean-savar-api.onrender.com/api/v1'
    : 'http://localhost:8080/api/v1')
).replace(/\/$/, '');

const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://wosjqtspcblftirykphs.supabase.co'
).replace(/\/$/, '');

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indvc2pxdHNwY2JsZnRpcnlrcGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1NjcxMzMsImV4cCI6MjExMDE0MzEzM30.L7X4LUujetlAhwTlMkG4ohEwb4sHg6c2i2OJJK_6a8A';

const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  '52ef472453946c689c0d40479521ebf6f28c8f709b31b1dee81f8dd64831056b';

interface DbUserRow {
  id: string;
  phone: string;
  full_name: string;
  email?: string | null;
  role: string;
  ward_id: number | null;
  is_verified: boolean;
  created_at: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idToken = body.idToken || body.id_token;
    const accessToken = body.accessToken || body.access_token;
    const authCode = body.code;
    const redirectUri = body.redirectUri || body.redirect_uri || 'postmessage';
    const rawPhone = body.phone || body.phoneNumber || body.phone_number;
    const fullName = body.full_name || body.fullName;
    const rawWardId = body.ward_id ?? body.wardId;
    const requestedRole = body.role || 'citizen';

    let verifiedProfile: GoogleTokenPayload | null = null;
    let resolvedIdToken = idToken;

    // 1. Verify with Google Access Token if provided
    if (accessToken && typeof accessToken === 'string' && accessToken.trim()) {
      try {
        verifiedProfile = await fetchGoogleUserInfo(accessToken);
      } catch (err: unknown) {
        console.warn('Google Access Token verification failed, checking other credentials:', err);
      }
    }

    // 2. If authorization code is provided, exchange it for tokens
    if (!verifiedProfile && authCode) {
      try {
        const tokenResponse = await exchangeGoogleAuthCode(authCode, redirectUri);
        resolvedIdToken = tokenResponse.id_token;
        if (tokenResponse.access_token) {
          try {
            verifiedProfile = await fetchGoogleUserInfo(tokenResponse.access_token);
          } catch {
            // Fallback to id_token verification below
          }
        }
      } catch (err: unknown) {
        console.error('Google authorization code exchange failed:', err);
        return NextResponse.json(
          {
            error: {
              code: 'AUTH_CODE_EXCHANGE_FAILED',
              message:
                err instanceof Error
                  ? err.message
                  : 'Failed to exchange authorization code with Google Cloud.',
              message_bn: 'Google ক্লাউড অথরাইজেশন কোড যাচাই করা যায়নি।',
            },
          },
          { status: 400 },
        );
      }
    }

    // 3. Verify Google ID token if not already verified via access token
    if (!verifiedProfile) {
      if (!resolvedIdToken || typeof resolvedIdToken !== 'string') {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message:
                'Google Cloud credential (ID token, access token or auth code) is required.',
              message_bn: 'Google ক্লাউড ক্রেডেনশিয়াল (আইডি টোকেন বা অ্যাক্সেস টোকেন) প্রদান করুন।',
            },
          },
          { status: 400 },
        );
      }

      try {
        verifiedProfile = await verifyGoogleIdToken(resolvedIdToken);
      } catch (err: unknown) {
        console.error('Google ID token verification error:', err);
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_GOOGLE_TOKEN',
              message: err instanceof Error ? err.message : 'Invalid Google Cloud token.',
              message_bn: 'Google ক্লাউড টোকেন যাচাই করা যায়নি বা মেয়াদ শেষ হয়েছে।',
            },
          },
          { status: 401 },
        );
      }
    }

    // 4. Resolve safe user fields
    const googleEmail = verifiedProfile.email?.toLowerCase().trim() || null;
    const resolvedFullName = (
      fullName ||
      verifiedProfile.name ||
      googleEmail?.split('@')[0] ||
      'নাগরিক'
    ).trim();

    const normalizedPhone = normalizeBdPhone(rawPhone || '');
    const finalPhone = (normalizedPhone || rawPhone || '01715-883210').trim();

    // Sanitize wardId: ensure null if empty or non-numeric or <= 0
    let resolvedWardId: number | null = null;
    if (rawWardId !== undefined && rawWardId !== null && rawWardId !== '') {
      const num = Number(rawWardId);
      if (!isNaN(num) && num > 0) {
        resolvedWardId = num;
      }
    }

    const isDevOrApprovedAdmin =
      isAllowedDevEmail(googleEmail) ||
      isUserApprovedAdmin(finalPhone, googleEmail);

    const safeRole = isDevOrApprovedAdmin
      ? 'admin'
      : ['citizen', 'collector', 'partner', 'admin'].includes(requestedRole)
        ? requestedRole
        : 'citizen';

    // 5. Attempt contacting core backend API (/auth/firebase-login) first
    if (resolvedIdToken) {
      try {
        const apiRes = await fetch(`${API_BASE}/auth/firebase-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_token: resolvedIdToken,
            phone: finalPhone,
            full_name: resolvedFullName,
            ward_id: resolvedWardId,
            role: safeRole,
          }),
        });

        if (apiRes.ok) {
          const data = await apiRes.json();
          return NextResponse.json(data, { status: 200 });
        } else {
          const errText = await apiRes.text().catch(() => '');
          console.warn('Backend API /auth/firebase-login responded non-ok:', apiRes.status, errText);
        }
      } catch (backendErr) {
        console.warn('Backend API /auth/firebase-login unreachable, proceeding to direct Supabase sync:', backendErr);
      }
    }

    // 6. Direct Supabase Database Sync & Session Creation
    // Handles upserting profile by Google email or phone and writing real session to auth_sessions table
    try {
      const headers = {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      // Step A: Search for existing user record by phone OR email
      let existingUser: DbUserRow | null = null;
      try {
        const queryFilter = googleEmail
          ? `or=(phone.eq.${encodeURIComponent(finalPhone)},email.eq.${encodeURIComponent(googleEmail)})`
          : `phone=eq.${encodeURIComponent(finalPhone)}`;

        const searchRes = await fetch(
          `${SUPABASE_URL}/rest/v1/users?${queryFilter}&select=*&limit=1`,
          { headers, cache: 'no-store' },
        );

        if (searchRes.ok) {
          const rows = (await searchRes.json()) as DbUserRow[];
          if (rows && rows.length > 0 && rows[0]) {
            existingUser = rows[0];
          }
        }
      } catch (searchErr) {
        console.warn('Supabase user lookup note:', searchErr);
      }

      let userRecord: DbUserRow;

      if (existingUser) {
        // Step B1: Update existing user record (preserving admin privileges)
        const finalRole =
          isDevOrApprovedAdmin || existingUser.role === 'admin'
            ? 'admin'
            : safeRole;

        const patchRes = await fetch(
          `${SUPABASE_URL}/rest/v1/users?id=eq.${existingUser.id}`,
          {
            method: 'PATCH',
            headers: { ...headers, Prefer: 'return=representation' },
            body: JSON.stringify({
              full_name: resolvedFullName || existingUser.full_name,
              email: googleEmail || existingUser.email,
              role: finalRole,
              ward_id: resolvedWardId !== null ? resolvedWardId : existingUser.ward_id,
              is_verified: true,
              updated_at: new Date().toISOString(),
            }),
          },
        );

        if (patchRes.ok) {
          const updated = (await patchRes.json()) as DbUserRow[];
          userRecord = updated[0] || {
            ...existingUser,
            full_name: resolvedFullName,
            email: googleEmail || existingUser.email,
            role: finalRole,
            ward_id: resolvedWardId !== null ? resolvedWardId : existingUser.ward_id,
          };
        } else {
          userRecord = existingUser;
        }
      } else {
        // Step B2: Insert new verified user record
        const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
          method: 'POST',
          headers: { ...headers, Prefer: 'return=representation' },
          body: JSON.stringify({
            phone: finalPhone,
            full_name: resolvedFullName,
            email: googleEmail,
            role: safeRole,
            ward_id: resolvedWardId,
            is_verified: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });

        if (insertRes.ok) {
          const created = (await insertRes.json()) as DbUserRow[];
          userRecord = (created && created[0]) ? created[0] : {
            id: crypto.randomUUID(),
            phone: finalPhone,
            full_name: resolvedFullName,
            email: googleEmail,
            role: safeRole,
            ward_id: resolvedWardId,
            is_verified: true,
            created_at: new Date().toISOString(),
          };
        } else {
          // If insert failed due to concurrent race, fallback to querying by phone
          const fallbackRes = await fetch(
            `${SUPABASE_URL}/rest/v1/users?phone=eq.${encodeURIComponent(finalPhone)}&select=*&limit=1`,
            { headers, cache: 'no-store' },
          );
          const fallbackRows = (await fallbackRes.json()) as DbUserRow[];
          userRecord = (fallbackRows && fallbackRows[0]) ? fallbackRows[0] : {
            id: crypto.randomUUID(),
            phone: finalPhone,
            full_name: resolvedFullName,
            email: googleEmail,
            role: safeRole,
            ward_id: resolvedWardId,
            is_verified: true,
            created_at: new Date().toISOString(),
          };
        }
      }

      // Step C: Generate a cryptographically secure 256-bit Bearer token and HMAC digest
      const sessionToken = 'cs_' + crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto
        .createHmac('sha256', AUTH_SECRET)
        .update(sessionToken)
        .digest('hex');

      const expiresSeconds = 7 * 24 * 3600; // 7 days
      const expiresAt = new Date(Date.now() + expiresSeconds * 1000).toISOString();

      // Insert active session into auth_sessions table
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/auth_sessions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            user_id: userRecord.id,
            token_hash: tokenHash,
            expires_at: expiresAt,
          }),
        });
      } catch (sessionInsertErr) {
        console.warn('Failed inserting into auth_sessions table directly:', sessionInsertErr);
      }

      // Step D: Return fully authenticated session matching API response
      const sessionResponse = {
        access_token: sessionToken,
        token_type: 'Bearer',
        expires_in_seconds: expiresSeconds,
        profile: {
          user: {
            id: userRecord.id,
            phone: userRecord.phone,
            full_name: userRecord.full_name,
            email: userRecord.email ?? googleEmail,
            role: userRecord.role,
            ward_id: userRecord.ward_id,
            is_verified: true,
            created_at: userRecord.created_at,
          },
          vehicle_id: null,
          partner_id: null,
          partner_name: null,
        },
      };

      return NextResponse.json(sessionResponse, { status: 200 });
    } catch (dbErr: unknown) {
      console.error('Database direct sync failed during Google login:', dbErr);
      return NextResponse.json(
        {
          error: {
            code: 'DB_SYNC_FAILED',
            message: dbErr instanceof Error ? dbErr.message : 'Database profile sync failed.',
            message_bn: 'ব্যবহারকারী প্রোফাইল ডাটাবেজে সংরক্ষণ করা যায়নি।',
          },
        },
        { status: 500 },
      );
    }
  } catch (err: unknown) {
    console.error('Unexpected error in /api/auth/google:', err);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during Google Cloud authentication.',
          message_bn: 'Google ক্লাউড সাইন-ইন প্রক্রিয়া সম্পন্ন করা যায়নি। সার্ভার সমস্যা।',
        },
      },
      { status: 500 },
    );
  }
}
