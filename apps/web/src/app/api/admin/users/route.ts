import { NextResponse } from 'next/server';
import { normalizeBdPhone } from '@/lib/utils';

export const runtime = 'nodejs';

const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://wosjqtspcblftirykphs.supabase.co'
).replace(/\/$/, '');

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indvc2pxdHNwY2JsZnRpcnlrcGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1NjcxMzMsImV4cCI6MjExMDE0MzEzM30.L7X4LUujetlAhwTlMkG4ohEwb4sHg6c2i2OJJK_6a8A';

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const role = url.searchParams.get('role');
    const search = url.searchParams.get('q');

    let endpoint = `${SUPABASE_URL}/rest/v1/users?order=created_at.desc&select=*`;
    if (role && role !== 'all') {
      endpoint += `&role=eq.${encodeURIComponent(role)}`;
    }
    if (search && search.trim()) {
      const q = encodeURIComponent(`%${search.trim()}%`);
      endpoint += `&or=(full_name.ilike.${q},phone.ilike.${q},email.ilike.${q})`;
    }

    const res = await fetch(endpoint, {
      headers,
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: { message: `Supabase error: ${err}` } },
        { status: res.status },
      );
    }

    const users = await res.json();
    return NextResponse.json({ users }, { status: 200 });
  } catch (err: unknown) {
    console.error('Error fetching admin users:', err);
    return NextResponse.json(
      { error: { message: 'Failed to fetch users from database.' } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawPhone = body.phone || body.phoneNumber;
    const fullName = (body.full_name || body.fullName || '').trim();
    const email = body.email ? body.email.trim().toLowerCase() : null;
    const role = body.role || 'admin';
    const rawWardId = body.ward_id ?? body.wardId;

    if (!rawPhone || !fullName) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message_bn: 'মোবাইল নম্বর ও পূর্ণ নাম আবশ্যক।',
          },
        },
        { status: 400 },
      );
    }

    const normalizedPhone = normalizeBdPhone(rawPhone) ?? rawPhone.trim();
    let wardId: number | null = null;
    if (rawWardId !== undefined && rawWardId !== null && rawWardId !== '') {
      const num = Number(rawWardId);
      if (!isNaN(num) && num > 0) {
        wardId = num;
      }
    }

    // Step 1: Check if user already exists by phone
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?phone=eq.${encodeURIComponent(normalizedPhone)}&select=*&limit=1`,
      { headers, cache: 'no-store' },
    );

    let existingUser = null;
    if (checkRes.ok) {
      const list = await checkRes.json();
      if (list && list.length > 0) {
        existingUser = list[0];
      }
    }

    let savedUser;
    if (existingUser) {
      // Step 2A: Update existing user to the requested role (e.g. admin or collector)
      const updateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/users?id=eq.${existingUser.id}`,
        {
          method: 'PATCH',
          headers: { ...headers, Prefer: 'return=representation' },
          body: JSON.stringify({
            full_name: fullName || existingUser.full_name,
            email: email || existingUser.email,
            role,
            ward_id: wardId !== null ? wardId : existingUser.ward_id,
            is_verified: true,
            updated_at: new Date().toISOString(),
          }),
        },
      );

      if (!updateRes.ok) {
        const err = await updateRes.text();
        return NextResponse.json({ error: { message: err } }, { status: 400 });
      }

      const rows = await updateRes.json();
      savedUser = rows[0] || existingUser;
    } else {
      // Step 2B: Insert brand new user
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({
          phone: normalizedPhone,
          full_name: fullName,
          email,
          role,
          ward_id: wardId,
          is_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });

      if (!insertRes.ok) {
        const err = await insertRes.text();
        return NextResponse.json({ error: { message: err } }, { status: 400 });
      }

      const rows = await insertRes.json();
      savedUser = rows[0];
    }

    return NextResponse.json(
      { success: true, user: savedUser },
      { status: 200 },
    );
  } catch (err: unknown) {
    console.error('Error saving admin user:', err);
    return NextResponse.json(
      { error: { message: 'Failed to save user in database.' } },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = body.id;
    const phone = body.phone;
    const role = body.role;
    const fullName = body.full_name || body.fullName;
    const email = body.email;
    const rawWardId = body.ward_id ?? body.wardId;
    const isVerified = body.is_verified ?? body.isVerified;

    if (!id && !phone) {
      return NextResponse.json(
        { error: { message: 'User ID or Phone is required for update.' } },
        { status: 400 },
      );
    }

    const filter = id
      ? `id=eq.${encodeURIComponent(id)}`
      : `phone=eq.${encodeURIComponent(normalizeBdPhone(phone) ?? phone)}`;

    const patchPayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (role !== undefined) patchPayload.role = role;
    if (fullName !== undefined) patchPayload.full_name = fullName.trim();
    if (email !== undefined) patchPayload.email = email ? email.trim().toLowerCase() : null;
    if (rawWardId !== undefined) {
      patchPayload.ward_id = rawWardId === null || rawWardId === '' ? null : Number(rawWardId);
    }
    if (isVerified !== undefined) patchPayload.is_verified = Boolean(isVerified);

    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/users?${filter}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify(patchPayload),
    });

    if (!patchRes.ok) {
      const err = await patchRes.text();
      return NextResponse.json({ error: { message: err } }, { status: 400 });
    }

    const rows = await patchRes.json();
    return NextResponse.json({ success: true, user: rows[0] }, { status: 200 });
  } catch (err: unknown) {
    console.error('Error updating user in database:', err);
    return NextResponse.json(
      { error: { message: 'Failed to update user in database.' } },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const phone = url.searchParams.get('phone');

    if (!id && !phone) {
      return NextResponse.json(
        { error: { message: 'User ID or Phone is required.' } },
        { status: 400 },
      );
    }

    const filter = id
      ? `id=eq.${encodeURIComponent(id)}`
      : `phone=eq.${encodeURIComponent(phone!)}`;

    // Revert role to 'citizen' rather than hard deleting so audit trails remain intact
    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/users?${filter}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({
        role: 'citizen',
        updated_at: new Date().toISOString(),
      }),
    });

    if (!patchRes.ok) {
      const err = await patchRes.text();
      return NextResponse.json({ error: { message: err } }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    console.error('Error revoking admin user:', err);
    return NextResponse.json(
      { error: { message: 'Failed to revoke admin role.' } },
      { status: 500 },
    );
  }
}
