'use client';

import {
  ANALYTICS_SEED,
  HOTSPOTS_SEED,
  PICKUPS_SEED,
  REPORTS_SEED,
  SAVAR_WARDS_SEED,
  resolveNearestWardLocal,
} from './savar-data';
import { compressImageForUpload, toBanglaDigits } from './utils';
import {
  recordDevCitizenRequest,
  updateDevCitizenRequestStatus,
  appendDevCitizenResponse,
} from './dev-store';
import type {
  AnalyticsSummary,
  AuthSession,
  AuthenticatedProfile,
  CollectorVehicleRecord,
  CompleteCollectorTaskInput,
  CompleteTaskResponse,
  CreateDumpReportInput,
  CreateDumpReportResponse,
  CreatePickupInput,
  CreateRecyclableLotInput,
  DispatchAssignInput,
  DispatchAssignResponse,
  DumpReportRecord,
  LotStatus,
  MaterialType,
  NotificationRecord,
  OtpLoginResponse,
  OtpVerifyResponse,
  PickupRequestRecord,
  PickupStatus,
  PublicHotspotRecord,
  RecyclableLotRecord,
  ReportStatus,
  ResolvedWardResponse,
  StatusEventRecord,
  SyncCollectorOperation,
  SyncCollectorResponse,
  TrackedResult,
  UpdateVehicleLocationInput,
  UploadPhotoResponse,
  UserRole,
  VehicleStatus,
  WardSummary,
} from './types';

export function getActiveApiBase(): string {
  const configured = (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ''
  ).trim().replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    // When deployed on production (e.g. clean-savar.vercel.app):
    if (!isLocalhost) {
      // If configured URL is empty or points to localhost, route through Next.js rewrite / reverse proxy
      if (!configured || configured.includes('localhost') || configured.includes('127.0.0.1')) {
        return '/api/v1';
      }
    }
  }

  return configured || 'http://localhost:8080/api/v1';
}

export const API_BASE = getActiveApiBase();

export const SESSION_STORAGE_KEY = 'clean_savar_auth_session_v1';
const REQUEST_TIMEOUT_MS = 12000;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const parsedMaxUpload = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_BYTES);
const MAX_UPLOAD_BYTES =
  Number.isFinite(parsedMaxUpload) && parsedMaxUpload >= 64 * 1024 && parsedMaxUpload <= 15 * 1024 * 1024
    ? parsedMaxUpload
    : DEFAULT_MAX_UPLOAD_BYTES;
const MAX_UPLOAD_MB_LABEL = toBanglaDigits(
  MAX_UPLOAD_BYTES % (1024 * 1024) === 0
    ? String(MAX_UPLOAD_BYTES / (1024 * 1024))
    : (MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(1),
);
const RAW_INPUT_GUARD_BYTES = 20 * 1024 * 1024;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly messageBn: string;
  readonly isNetworkError: boolean;

  constructor(params: {
    status: number;
    code: string;
    message: string;
    messageBn: string;
    isNetworkError?: boolean;
  }) {
    super(params.messageBn || params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.messageBn = params.messageBn;
    this.isNetworkError = Boolean(params.isNetworkError);
  }
}

export interface ApiResult<T> {
  data: T;
  source: 'live-api' | 'offline-preview';
  offline: boolean;
}

export function readStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (!parsed.accessToken || !parsed.profile?.user?.id || !parsed.expiresAtIso) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    const expiresMs = Date.parse(parsed.expiresAtIso);
    if (!Number.isFinite(expiresMs) || expiresMs <= Date.now()) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return parsed as AuthSession;
  } catch {
    return null;
  }
}

export function writeStoredSession(session: AuthSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!session) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignore storage quota / private mode restrictions.
  }
}

export function clearStoredSession(): void {
  writeStoredSession(null);
}

export function getActiveBearerToken(): string | null {
  return readStoredSession()?.accessToken ?? null;
}

function defaultBnForStatus(status: number): string {
  if (status === 401) return 'এই কাজের জন্য মোবাইল OTP দিয়ে লগইন করুন।';
  if (status === 403) return 'আপনার বর্তমান অ্যাকাউন্ট ভূমিকার জন্য এই অনুমতি নেই।';
  if (status === 404) return 'অনুরোধকৃত তথ্যটি পাওয়া যায়নি।';
  if (status === 409) return 'তথ্যের অবস্থার সাথে এই ধাপটি সামঞ্জস্যপূর্ণ নয়।';
  if (status === 413) return `ছবির আকার ${MAX_UPLOAD_MB_LABEL} মেগাবাইটের বেশি হতে পারবে না।`;
  if (status === 422) return 'প্রদত্ত তথ্যগুলো যাচাই করে আবার চেষ্টা করুন।';
  if (status === 429) return 'অনেকবার চেষ্টা করা হয়েছে — কিছুক্ষণ পর আবার চেষ্টা করুন।';
  if (status >= 500) return 'সার্ভারে সাময়িক ত্রুটি হয়েছে। কিছুক্ষণ পর চেষ্টা করুন।';
  return `অনুরোধ সম্পন্ন হয়নি (HTTP ${status})।`;
}

async function fetchJson<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = false, headers: customHeaders, ...rest } = init;
  const headers: Record<string, string> = {
    ...(rest.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(customHeaders as Record<string, string> | undefined),
  };

  if (auth) {
    const token = getActiveBearerToken();
    if (!token) {
      throw new ApiError({
        status: 401,
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
        messageBn: 'অনুগ্রহ করে প্রথমে মোবাইল OTP দিয়ে লগইন করুন।',
      });
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  const base = getActiveApiBase();
  const url =
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('/api/auth/')
      ? path
      : `${base}${path}`;
  try {
    res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers,
    });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    throw new ApiError({
      status: 0,
      code: isAbort ? 'TIMEOUT' : 'NETWORK_UNAVAILABLE',
      message: err instanceof Error ? err.message : 'Network error',
      messageBn: 'সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি। ইন্টারনেট বা এপিআই সার্ভার যাচাই করুন।',
      isNetworkError: true,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as
      | { error?: { code?: string; message?: string; message_bn?: string }; message_bn?: string; message?: string }
      | null;
    const messageBn =
      errBody?.error?.message_bn ||
      errBody?.message_bn ||
      defaultBnForStatus(res.status);
    const message = errBody?.error?.message || errBody?.message || `HTTP ${res.status}`;
    const code = errBody?.error?.code || `HTTP_${res.status}`;

    if (res.status === 401 && auth) {
      clearStoredSession();
    }

    throw new ApiError({
      status: res.status,
      code,
      message,
      messageBn,
      isNetworkError: false,
    });
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

function unwrapList<T>(payload: T[] | { items?: T[] }): T[] {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.items)) return payload.items;
  return [];
}

function isNetworkOnlyFallback(err: unknown): err is ApiError {
  return err instanceof ApiError && err.isNetworkError;
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      sp.set(k, String(v));
    }
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

// ---------------------------------------------------------------------------
// Health & Public Endpoints (Read-only offline preview ONLY on network error)
// ---------------------------------------------------------------------------

export async function checkApiHealth(): Promise<{ ok: boolean }> {
  try {
    await fetchJson<{ status?: string }>('/health');
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function fetchWards(): Promise<ApiResult<WardSummary[]>> {
  try {
    const data = await fetchJson<WardSummary[]>('/wards');
    return { data, source: 'live-api', offline: false };
  } catch (err) {
    if (!isNetworkOnlyFallback(err)) throw err;
    return { data: SAVAR_WARDS_SEED, source: 'offline-preview', offline: true };
  }
}

export async function resolveWardByCoords(
  lat: number,
  lng: number,
): Promise<ResolvedWardResponse & { offline: boolean }> {
  try {
    const data = await fetchJson<ResolvedWardResponse>(
      `/wards/resolve${buildQuery({ lat, lng })}`,
    );
    return { ...data, offline: false };
  } catch (err) {
    if (!isNetworkOnlyFallback(err)) throw err;
    const local = resolveNearestWardLocal(lat, lng);
    return {
      ward_id: local.id,
      code: local.code,
      zone_type: local.zone_type,
      name_bn: local.name_bn,
      name_en: local.name_en,
      zone_label_bn: local.zone_label_bn,
      exact_match: false,
      offline: true,
    };
  }
}

export async function fetchPublicAnalytics(): Promise<ApiResult<AnalyticsSummary>> {
  try {
    const data = await fetchJson<AnalyticsSummary>('/analytics/public');
    return { data, source: 'live-api', offline: false };
  } catch (err) {
    if (!isNetworkOnlyFallback(err)) throw err;
    return { data: ANALYTICS_SEED, source: 'offline-preview', offline: true };
  }
}

export async function fetchPublicHotspots(params?: {
  ward_id?: number;
  status?: ReportStatus;
  limit?: number;
}): Promise<ApiResult<PublicHotspotRecord[]>> {
  try {
    const raw = await fetchJson<PublicHotspotRecord[] | { items?: PublicHotspotRecord[] }>(
      `/reports/public${buildQuery(params ?? {})}`,
    );
    return { data: unwrapList(raw), source: 'live-api', offline: false };
  } catch (err) {
    if (!isNetworkOnlyFallback(err)) throw err;
    const filtered = HOTSPOTS_SEED.filter(
      (h) =>
        (!params?.ward_id || h.ward_id === params.ward_id) &&
        (!params?.status || h.status === params.status),
    ).slice(0, params?.limit ?? 50);
    return { data: filtered, source: 'offline-preview', offline: true };
  }
}

function buildOfflinePreviewEvents(
  entityType: 'pickup' | 'dump_report',
  entityId: string,
  status: string,
  createdAt: string,
  updatedAt: string,
  vehicleCode: string | null,
): StatusEventRecord[] {
  const events: StatusEventRecord[] = [
    {
      id: `${entityId}-1`,
      entity_type: entityType,
      entity_id: entityId,
      from_status: null,
      to_status: entityType === 'pickup' ? 'pending' : 'reported',
      actor_label: 'নাগরিক পোর্টাল',
      note_bn:
        entityType === 'pickup'
          ? 'পিকআপ রিকোয়েস্ট গ্রহণ করা হয়েছে'
          : 'ছবি ও লোকেশনসহ ময়লার রিপোর্ট জমা হয়েছে',
      created_at: createdAt,
    },
  ];
  if (['assigned', 'in_progress', 'collected', 'verified', 'dispatched', 'cleared'].includes(status)) {
    events.push({
      id: `${entityId}-2`,
      entity_type: entityType,
      entity_id: entityId,
      from_status: entityType === 'pickup' ? 'pending' : 'reported',
      to_status: entityType === 'pickup' ? 'assigned' : status === 'verified' ? 'verified' : 'dispatched',
      actor_label: 'সাভার পৌরসভা অপস',
      note_bn: vehicleCode ? `গাড়ি ${vehicleCode} নির্ধারণ করা হয়েছে` : 'ওয়ার্ড সুপারভাইজার যাচাই করেছেন',
      created_at: updatedAt,
    });
  }
  return events;
}

export async function trackByCode(
  code: string,
  phone?: string,
): Promise<ApiResult<TrackedResult | null>> {
  const cleaned = code.trim().toUpperCase();
  if (!cleaned) {
    return { data: null, source: 'live-api', offline: false };
  }

  const isPickup = cleaned.startsWith('CS-PK-');
  const isReport = cleaned.startsWith('CS-DR-');
  if (!isPickup && !isReport) {
    throw new ApiError({
      status: 422,
      code: 'INVALID_TRACKING_CODE',
      message: 'Tracking code must start with CS-PK- or CS-DR-',
      messageBn: 'সঠিক ট্র্যাকিং কোড লিখুন (যেমন: CS-PK-02041 বা CS-DR-01088)।',
    });
  }

  const qs = buildQuery({ phone: phone?.trim() });
  try {
    if (isPickup) {
      const res = await fetchJson<{ pickup: PickupRequestRecord; events: StatusEventRecord[] }>(
        `/pickups/track/${encodeURIComponent(cleaned)}${qs}`,
      );
      return {
        data: { kind: 'pickup', pickup: res.pickup, events: res.events },
        source: 'live-api',
        offline: false,
      };
    }
    const res = await fetchJson<{ report: DumpReportRecord; events: StatusEventRecord[] }>(
      `/reports/track/${encodeURIComponent(cleaned)}${qs}`,
    );
    return {
      data: { kind: 'dump_report', report: res.report, events: res.events },
      source: 'live-api',
      offline: false,
    };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return { data: null, source: 'live-api', offline: false };
    }
    if (!isNetworkOnlyFallback(err)) throw err;

    if (isPickup) {
      const pickup = PICKUPS_SEED.find((p) => p.tracking_code.toUpperCase() === cleaned);
      return {
        data: pickup
          ? {
              kind: 'pickup',
              pickup,
              events: buildOfflinePreviewEvents(
                'pickup',
                pickup.id,
                pickup.status,
                pickup.created_at,
                pickup.updated_at,
                pickup.assigned_vehicle_code,
              ),
            }
          : null,
        source: 'offline-preview',
        offline: true,
      };
    }
    const report = REPORTS_SEED.find((r) => r.tracking_code.toUpperCase() === cleaned);
    return {
      data: report
        ? {
            kind: 'dump_report',
            report,
            events: buildOfflinePreviewEvents(
              'dump_report',
              report.id,
              report.status,
              report.created_at,
              report.updated_at,
              report.assigned_vehicle_code,
            ),
          }
        : null,
      source: 'offline-preview',
      offline: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Authentication (Strict live API — never fabricated)
// ---------------------------------------------------------------------------

export async function requestOtp(input: {
  phone: string;
  full_name?: string;
  ward_id?: number;
  role?: Extract<UserRole, 'citizen' | 'collector'>;
}): Promise<OtpLoginResponse> {
  return fetchJson<OtpLoginResponse>('/auth/otp-login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function verifyOtp(input: {
  phone: string;
  otp: string;
}): Promise<AuthSession> {
  const res = await fetchJson<OtpVerifyResponse>('/auth/otp-verify', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const session: AuthSession = {
    accessToken: res.access_token,
    expiresAtIso: new Date(Date.now() + res.expires_in_seconds * 1000).toISOString(),
    profile: res.profile,
  };
  writeStoredSession(session);
  return session;
}

export async function loginWithFirebaseToken(input: {
  idToken: string;
  phone?: string;
  fullName?: string;
  wardId?: number;
  role?: UserRole;
}): Promise<AuthSession> {
  const res = await fetchJson<OtpVerifyResponse>('/auth/firebase-login', {
    method: 'POST',
    body: JSON.stringify({
      id_token: input.idToken,
      phone: input.phone,
      full_name: input.fullName,
      ward_id: input.wardId,
      role: input.role,
    }),
  });
  const session: AuthSession = {
    accessToken: res.access_token,
    expiresAtIso: new Date(Date.now() + res.expires_in_seconds * 1000).toISOString(),
    profile: res.profile,
  };
  writeStoredSession(session);
  return session;
}

export async function loginWithGoogleAuth(input: {
  idToken?: string;
  accessToken?: string;
  code?: string;
  phone?: string;
  email?: string;
  fullName?: string;
  wardId?: number;
  role?: UserRole;
  redirectUri?: string;
}): Promise<AuthSession> {
  const res = await fetchJson<OtpVerifyResponse>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({
      id_token: input.idToken,
      access_token: input.accessToken,
      code: input.code,
      phone: input.phone,
      email: input.email,
      full_name: input.fullName,
      ward_id: input.wardId,
      role: input.role,
      redirect_uri: input.redirectUri,
    }),
  });
  const session: AuthSession = {
    accessToken: res.access_token,
    expiresAtIso: new Date(Date.now() + res.expires_in_seconds * 1000).toISOString(),
    profile: res.profile,
  };
  writeStoredSession(session);
  return session;
}

export async function fetchMe(): Promise<AuthenticatedProfile> {
  return fetchJson<AuthenticatedProfile>('/auth/me', { auth: true });
}

export async function logoutSession(): Promise<void> {
  const token = getActiveBearerToken();
  try {
    if (token) {
      await fetchJson<void>('/auth/logout', { method: 'POST', auth: true });
    }
  } catch {
    // Best-effort revocation; local session still cleared below.
  } finally {
    clearStoredSession();
  }
}

// ---------------------------------------------------------------------------
// Notifications (Strict authenticated)
// ---------------------------------------------------------------------------

export async function fetchNotifications(): Promise<NotificationRecord[]> {
  const raw = await fetchJson<NotificationRecord[] | { items?: NotificationRecord[] }>(
    '/notifications',
    { auth: true },
  );
  return unwrapList(raw);
}

export async function markNotificationRead(
  id: string,
): Promise<NotificationRecord | undefined> {
  return fetchJson<NotificationRecord | undefined>(
    `/notifications/${encodeURIComponent(id)}/read`,
    {
      method: 'PATCH',
      auth: true,
    },
  );
}

// ---------------------------------------------------------------------------
// Pickups & Dump Reports (Strict authenticated)
// ---------------------------------------------------------------------------

export async function fetchPickups(params?: {
  ward_id?: number;
  status?: PickupStatus;
  phone?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<PickupRequestRecord[]> {
  const raw = await fetchJson<PickupRequestRecord[] | { items?: PickupRequestRecord[] }>(
    `/pickups${buildQuery(params ?? {})}`,
    { auth: true },
  );
  return unwrapList(raw);
}

export async function createPickup(input: CreatePickupInput): Promise<PickupRequestRecord> {
  const result = await fetchJson<PickupRequestRecord>('/pickups', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(input),
  });

  try {
    recordDevCitizenRequest({
      type: 'pickup',
      trackingCode: result.tracking_code,
      citizenName: result.citizen_name,
      citizenPhone: result.citizen_phone,
      wardId: result.ward_id,
      wardNameBn: result.ward_name_bn,
      addressOrLandmark: result.address_line,
      wasteTypeOrSeverity: result.waste_type,
      details: `${result.estimated_bags} ব্যাগ, ${result.slot} স্লট`,
      status: result.status,
    });
  } catch (err) {
    console.warn('Dev citizen request sync note:', err);
  }

  return result;
}

export async function updatePickupStatus(
  id: string,
  input: { status: PickupStatus; weight_kg?: number; note_bn: string },
): Promise<PickupRequestRecord> {
  const result = await fetchJson<PickupRequestRecord>(`/pickups/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(input),
  });

  try {
    updateDevCitizenRequestStatus(result.tracking_code, result.status);
    if (input.note_bn) {
      appendDevCitizenResponse(result.tracking_code, {
        senderName: 'সাভার পৌর কন্ট্রোল (অ্যাডমিন)',
        senderRole: 'admin',
        message: input.note_bn,
      });
    }
  } catch (err) {
    console.warn('Dev citizen response sync note:', err);
  }

  return result;
}

export async function uploadDumpPhoto(file: File): Promise<UploadPhotoResponse> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new ApiError({
      status: 422,
      code: 'INVALID_MIME_TYPE',
      message: 'Only JPEG, PNG, and WebP images are supported',
      messageBn: 'শুধুমাত্র JPEG, PNG বা WebP ফরম্যাটের ছবি আপলোড করা যাবে।',
    });
  }
  if (file.size > RAW_INPUT_GUARD_BYTES) {
    throw new ApiError({
      status: 413,
      code: 'FILE_TOO_LARGE',
      message: 'Raw image file exceeds 20 MB browser limit',
      messageBn: 'মূল ছবির আকার ২০ মেগাবাইটের কম হতে হবে।',
    });
  }

  const preparedFile = await compressImageForUpload(file);
  if (preparedFile.size > MAX_UPLOAD_BYTES) {
    throw new ApiError({
      status: 413,
      code: 'FILE_TOO_LARGE',
      message: `Photo exceeds ${MAX_UPLOAD_BYTES} bytes limit`,
      messageBn: `ছবির আকার ${MAX_UPLOAD_MB_LABEL} মেগাবাইটের কম হতে হবে।`,
    });
  }

  const form = new FormData();
  form.append('photo', preparedFile);
  return fetchJson<UploadPhotoResponse>('/uploads/photo', {
    method: 'POST',
    auth: true,
    body: form,
  });
}

export async function fetchReports(params?: {
  ward_id?: number;
  status?: ReportStatus;
  lat?: number;
  lng?: number;
  radius_m?: number;
  include_duplicates?: boolean;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<DumpReportRecord[]> {
  const raw = await fetchJson<DumpReportRecord[] | { items?: DumpReportRecord[] }>(
    `/reports${buildQuery(params ?? {})}`,
    { auth: true },
  );
  return unwrapList(raw);
}

export async function createDumpReport(
  input: CreateDumpReportInput,
): Promise<CreateDumpReportResponse> {
  const result = await fetchJson<CreateDumpReportResponse>('/reports', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(input),
  });

  try {
    recordDevCitizenRequest({
      type: 'dump_report',
      trackingCode: result.report.tracking_code,
      citizenName: result.report.reporter_name,
      citizenPhone: result.report.reporter_phone,
      wardId: result.report.ward_id,
      wardNameBn: result.report.ward_name_bn,
      addressOrLandmark: result.report.landmark,
      wasteTypeOrSeverity: result.report.severity,
      details: result.report.title_bn,
      status: result.report.status,
      photoUrls: result.report.photo_urls,
    });
  } catch (err) {
    console.warn('Dev citizen dump report sync note:', err);
  }

  return result;
}

export async function updateReportStatus(
  id: string,
  input: { status: ReportStatus; resolved_photo_url?: string; note_bn: string },
): Promise<DumpReportRecord> {
  const result = await fetchJson<DumpReportRecord>(`/reports/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(input),
  });

  try {
    updateDevCitizenRequestStatus(result.tracking_code, result.status);
    if (input.note_bn) {
      appendDevCitizenResponse(result.tracking_code, {
        senderName: 'সাভার পৌর কন্ট্রোল (অ্যাডমিন)',
        senderRole: 'admin',
        message: input.note_bn,
      });
    }
  } catch (err) {
    console.warn('Dev citizen report response sync note:', err);
  }

  return result;
}

export async function sendAdminResponseToCitizen(input: {
  trackingCode: string;
  entityType: 'pickup' | 'dump_report';
  entityId: string;
  senderName: string;
  message: string;
}): Promise<void> {
  try {
    appendDevCitizenResponse(input.trackingCode, {
      senderName: input.senderName,
      senderRole: 'admin',
      message: input.message,
    });
  } catch (err) {
    console.warn('Direct citizen response logging note:', err);
  }
}

// ---------------------------------------------------------------------------
// Dispatch, Vehicles & Collector Field Ops (Strict authenticated)
// ---------------------------------------------------------------------------

export async function fetchVehicles(params?: {
  lat?: number;
  lng?: number;
  ward_id?: number;
  status?: VehicleStatus;
}): Promise<CollectorVehicleRecord[]> {
  const raw = await fetchJson<CollectorVehicleRecord[] | { items?: CollectorVehicleRecord[] }>(
    `/dispatch/vehicles${buildQuery(params ?? {})}`,
    { auth: true },
  );
  return unwrapList(raw);
}

export async function fetchNearbyWorkers(
  lat: number,
  lng: number,
): Promise<CollectorVehicleRecord[]> {
  const raw = await fetchJson<
    | CollectorVehicleRecord[]
    | { items?: CollectorVehicleRecord[]; vehicles?: CollectorVehicleRecord[] }
  >(`/workers/nearby${buildQuery({ lat, lng })}`, { auth: true });
  if (!Array.isArray(raw) && raw && Array.isArray(raw.vehicles)) {
    return raw.vehicles;
  }
  return unwrapList(raw);
}

export async function updateVehicleLocation(
  vehicleId: string,
  input: UpdateVehicleLocationInput,
): Promise<CollectorVehicleRecord> {
  return fetchJson<CollectorVehicleRecord>(
    `/dispatch/vehicles/${encodeURIComponent(vehicleId)}/location`,
    {
      method: 'PATCH',
      auth: true,
      body: JSON.stringify(input),
    },
  );
}

export async function assignVehicleToTask(
  input: DispatchAssignInput,
): Promise<DispatchAssignResponse> {
  return fetchJson<DispatchAssignResponse>('/dispatch/assign', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(input),
  });
}

export async function completeCollectorTask(
  taskId: string,
  input: CompleteCollectorTaskInput,
  idempotencyKey: string,
): Promise<CompleteTaskResponse> {
  return fetchJson<CompleteTaskResponse>(`/collector/tasks/${encodeURIComponent(taskId)}/complete`, {
    method: 'POST',
    auth: true,
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(input),
  });
}

interface BackendSyncBatchResultItem {
  idempotency_key: string;
  task_id: string;
  ok: boolean;
  replay: boolean;
  error?: string | null;
  result?: CompleteTaskResponse | null;
}

export async function syncCollectorOperations(
  operations: SyncCollectorOperation[],
): Promise<SyncCollectorResponse> {
  const items = operations.map((op) => ({
    idempotency_key: op.idempotency_key,
    task_id: op.entity_id,
    task_type: op.entity_type,
    weight_kg: op.weight_kg,
    completion_photo_url: op.completion_photo_url,
    notes: op.notes,
  }));

  const raw = await fetchJson<BackendSyncBatchResultItem[]>('/collector/sync', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ items }),
  });

  const batch = Array.isArray(raw) ? raw : [];
  const synced_count = batch.filter((r) => r.ok && !r.replay).length;
  const skipped_count = batch.filter((r) => !r.ok || r.replay).length;
  const results = batch
    .map((r) => r.result)
    .filter((r): r is CompleteTaskResponse => Boolean(r));
  const failed_keys = batch.filter((r) => !r.ok).map((r) => r.idempotency_key);

  return {
    synced_count,
    skipped_count,
    results,
    failed_keys,
  };
}

// ---------------------------------------------------------------------------
// Partner Recycling Lots & Admin Analytics (Strict authenticated)
// ---------------------------------------------------------------------------

export async function fetchRecyclableLots(params?: {
  status?: LotStatus;
  material_type?: MaterialType;
  ward_id?: number;
}): Promise<RecyclableLotRecord[]> {
  const raw = await fetchJson<RecyclableLotRecord[] | { items?: RecyclableLotRecord[] }>(
    `/partner/lots${buildQuery(params ?? {})}`,
    { auth: true },
  );
  return unwrapList(raw);
}

export async function createRecyclableLot(
  input: CreateRecyclableLotInput,
): Promise<RecyclableLotRecord> {
  return fetchJson<RecyclableLotRecord>('/partner/lots', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(input),
  });
}

export async function claimRecyclableLot(
  lotId: string,
  note_bn: string,
): Promise<RecyclableLotRecord> {
  return fetchJson<RecyclableLotRecord>(`/partner/lots/${encodeURIComponent(lotId)}/claim`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ note_bn }),
  });
}

export async function collectRecyclableLot(lotId: string): Promise<RecyclableLotRecord> {
  return fetchJson<RecyclableLotRecord>(`/partner/lots/${encodeURIComponent(lotId)}/collect`, {
    method: 'POST',
    auth: true,
  });
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  return fetchJson<AnalyticsSummary>('/analytics/summary', { auth: true });
}
