import { NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

const API_BASE = (
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://clean-savar.shuttle.app/api/v1'
    : 'http://localhost:8080/api/v1')
).replace(/\/$/, '');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idToken = body.idToken || body.id_token;
    const fullName = body.full_name || body.fullName;
    const wardId = body.ward_id || body.wardId;
    const role = body.role;

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Firebase ID token is required.',
            message_bn: 'ফায়ারবেস আইডি টোকেন প্রদান করুন।',
          },
        },
        { status: 400 },
      );
    }

    // 1. Verify ID token via firebase-admin SDK
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseIdToken(idToken);
    } catch (err) {
      console.error('Firebase Admin ID token verification error:', err);
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired Firebase ID token.',
            message_bn: 'ফায়ারবেস আইডি টোকেন যাচাই করা যায়নি বা মেয়াদ শেষ হয়েছে।',
          },
        },
        { status: 401 },
      );
    }

    const rawPhone =
      body.phone ||
      body.phoneNumber ||
      body.phone_number ||
      decodedToken.phone_number ||
      decodedToken.firebase?.identities?.phone?.[0];

    if (!rawPhone || typeof rawPhone !== 'string' || rawPhone.trim().length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'A valid Bangladeshi mobile phone number is required.',
            message_bn: 'মোবাইল নম্বর প্রদান করা আবশ্যক।',
          },
        },
        { status: 400 },
      );
    }

    const resolvedFullName = (
      fullName ||
      decodedToken.name ||
      ''
    ).trim();

    if (!resolvedFullName) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Full name is required.',
            message_bn: 'আপনার পূর্ণ নাম প্রদান করা আবশ্যক।',
          },
        },
        { status: 400 },
      );
    }

    // 2. Exchange with core backend API to issue session and record in DB
    const apiRes = await fetch(`${API_BASE}/auth/firebase-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id_token: idToken,
        phone: rawPhone.trim(),
        full_name: resolvedFullName,
        ward_id: wardId,
        role: role,
      }),
    });

    const data = await apiRes.json();

    if (!apiRes.ok) {
      return NextResponse.json(data, { status: apiRes.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err: unknown) {
    console.error('Error in /api/auth/firebase-login:', err);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during Firebase login.',
          message_bn: 'লগইন প্রক্রিয়া সম্পন্ন করা যায়নি। সার্ভার সমস্যা।',
        },
      },
      { status: 500 },
    );
  }
}
