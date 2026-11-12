import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  claimRecyclableLot,
  clearStoredSession,
  createPickup,
  fetchPickups,
  fetchWards,
  readStoredSession,
  syncCollectorOperations,
  uploadDumpPhoto,
  verifyOtp,
  writeStoredSession,
} from '@/lib/api-client';
import type { AuthSession } from '@/lib/types';

function mockSession(role: 'citizen' | 'partner' = 'citizen'): AuthSession {
  return {
    accessToken: 'test-token-123',
    expiresAtIso: new Date(Date.now() + 3600_000).toISOString(),
    profile: {
      user: {
        id: 'aaaa1111-1111-4111-8111-111111111107',
        phone: '01715-883210',
        full_name: 'রাফি আহমেদ',
        role,
        ward_id: 5,
        is_verified: true,
        created_at: new Date().toISOString(),
      },
      vehicle_id: null,
      partner_id: role === 'partner' ? 'bbbb1111-1111-4111-8111-111111111101' : null,
      partner_name: role === 'partner' ? 'সবুজ রিসাইক্লিং সাভার' : null,
    },
  };
}

describe('Unified Clean Savar API Client', () => {
  beforeEach(() => {
    clearStoredSession();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearStoredSession();
  });

  it('returns canonical offline preview Savar wards ONLY when network transport fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const res = await fetchWards();
    expect(res.offline).toBe(true);
    expect(res.source).toBe('offline-preview');
    expect(res.data).toHaveLength(15);
    expect(res.data.some((w) => w.id === 101)).toBe(true);
  });

  it('propagates HTTP 401 on createPickup instead of silently fabricating fake local writes', async () => {
    writeStoredSession(mockSession('citizen'));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 'UNAUTHORIZED',
              message: 'Expired token',
              message_bn: 'আপনার সেশন মেয়াদোত্তীর্ণ হয়েছে',
            },
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    await expect(
      createPickup({
        ward_id: 5,
        address_line: 'বাসা ১৪, রোড ২',
        landmark: '১নং গেট',
        waste_type: 'household',
        slot: 'morning',
        schedule_type: 'one_time',
        estimated_bags: 2,
        notes: '',
      }),
    ).rejects.toMatchObject({
      status: 401,
      messageBn: 'আপনার সেশন মেয়াদোত্তীর্ণ হয়েছে',
    });

    // Stale token cleared automatically after 401
    expect(readStoredSession()).toBeNull();
  });

  it('never fabricates base64 data URIs when uploadDumpPhoto fails', async () => {
    writeStoredSession(mockSession('citizen'));
    const validPng = new File([new Uint8Array([137, 80, 78, 71])], 'dump.png', {
      type: 'image/png',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message_bn: 'সার্ভার ত্রুটি' } }), {
          status: 500,
        }),
      ),
    );

    await expect(uploadDumpPhoto(validPng)).rejects.toBeInstanceOf(ApiError);
  });

  it('rejects unsupported photo file formats before upload', async () => {
    writeStoredSession(mockSession('citizen'));
    const badFile = new File(['<svg></svg>'], 'xss.svg', { type: 'image/svg+xml' });
    await expect(uploadDumpPhoto(badFile)).rejects.toMatchObject({ status: 422 });
  });

  it('persists session on verifyOtp and clears on fetchPickups 401', async () => {
    const verifyRes = {
      access_token: 'jwt-valid-xyz',
      token_type: 'Bearer',
      expires_in_seconds: 3600,
      profile: mockSession('citizen').profile,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(verifyRes), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message_bn: 'অনুমতি নেই' } }), {
          status: 401,
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const session = await verifyOtp({ phone: '01715-883210', otp: '123456' });
    expect(session.accessToken).toBe('jwt-valid-xyz');
    expect(readStoredSession()?.accessToken).toBe('jwt-valid-xyz');

    await expect(fetchPickups()).rejects.toMatchObject({ status: 401 });
    expect(readStoredSession()).toBeNull();
  });

  it('sends note_bn payload with Authorization header on claimRecyclableLot', async () => {
    writeStoredSession(mockSession('partner'));
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: '44444444-4444-4444-8444-444444444401',
          lot_code: 'CS-LOT-00401',
          ward_id: 5,
          ward_name_bn: 'ওয়ার্ড ০৫',
          material_type: 'plastic',
          estimated_kg: 185,
          pickup_hub_bn: 'ব্যাংক টাউন STS',
          status: 'claimed',
          claimed_partner_name: 'সবুজ রিসাইক্লিং সাভার',
          created_at: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const updated = await claimRecyclableLot(
      '44444444-4444-4444-8444-444444444401',
      'আগামীকাল সকাল ১০টায় ভ্যান যাবে',
    );
    expect(updated.status).toBe('claimed');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer test-token-123',
    );
    expect(JSON.parse(init.body as string)).toEqual({
      note_bn: 'আগামীকাল সকাল ১০টায় ভ্যান যাবে',
    });
  });

  it('maps offline collector operations to backend { items } payload and normalizes batch response', async () => {
    writeStoredSession(mockSession('citizen'));
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            idempotency_key: 'idem-1',
            task_id: '55555555-5555-4555-8555-555555555501',
            ok: true,
            replay: false,
            error: null,
            result: {
              completion_id: 'comp-1',
              task_type: 'pickup',
              task_id: '55555555-5555-4555-8555-555555555501',
              tracking_code: 'CS-PK-02041',
              status: 'completed',
              idempotent_replay: false,
            },
          },
          {
            idempotency_key: 'idem-2',
            task_id: '55555555-5555-4555-8555-555555555502',
            ok: false,
            replay: false,
            error: 'Task not found',
            result: null,
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const syncRes = await syncCollectorOperations([
      {
        entity_type: 'pickup',
        entity_id: '55555555-5555-4555-8555-555555555501',
        idempotency_key: 'idem-1',
        weight_kg: 12.5,
        notes: 'অফলাইন থেকে সম্পন্ন',
      },
      {
        entity_type: 'dump_report',
        entity_id: '55555555-5555-4555-8555-555555555502',
        idempotency_key: 'idem-2',
        notes: 'অফলাইন রিপোর্ট',
      },
    ]);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/collector/sync');
    expect(JSON.parse(init.body as string)).toEqual({
      items: [
        {
          idempotency_key: 'idem-1',
          task_id: '55555555-5555-4555-8555-555555555501',
          task_type: 'pickup',
          weight_kg: 12.5,
          notes: 'অফলাইন থেকে সম্পন্ন',
        },
        {
          idempotency_key: 'idem-2',
          task_id: '55555555-5555-4555-8555-555555555502',
          task_type: 'dump_report',
          notes: 'অফলাইন রিপোর্ট',
        },
      ],
    });
    expect(syncRes.synced_count).toBe(1);
    expect(syncRes.skipped_count).toBe(1);
    expect(syncRes.results).toHaveLength(1);
    expect(syncRes.failed_keys).toEqual(['idem-2']);
  });

  it('rejects oversized uploads (>5 MB) and disallowed MIME types client-side before fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { uploadDumpPhoto } = await import('@/lib/api-client');

    const badMime = new File(['<svg></svg>'], 'evil.svg', { type: 'image/svg+xml' });
    await expect(uploadDumpPhoto(badMime)).rejects.toMatchObject({
      code: 'INVALID_MIME_TYPE',
      status: 422,
    });

    const bigFile = new File([new Uint8Array(5 * 1024 * 1024 + 1024)], 'huge.jpg', {
      type: 'image/jpeg',
    });
    await expect(uploadDumpPhoto(bigFile)).rejects.toMatchObject({
      code: 'FILE_TOO_LARGE',
      status: 413,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
