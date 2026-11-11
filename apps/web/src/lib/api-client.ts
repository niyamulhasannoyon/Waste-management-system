'use client';

import {
  LOTS_SEED,
  PICKUPS_SEED,
  REPORTS_SEED,
  SAVAR_WARDS_SEED,
  VEHICLES_SEED,
  resolveNearestWardLocal,
} from './savar-data';
import type {
  CollectorVehicleRecord,
  CreateDumpReportInput,
  CreatePickupInput,
  DumpReportRecord,
  PickupRequestRecord,
  PickupStatus,
  RecyclableLotRecord,
  ReportStatus,
  StatusEventRecord,
  TrackedResult,
  WardSummary,
} from './types';
import { normalizeBdPhone } from './utils';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
const STORAGE_KEY = 'clean_savar_local_store_v1';

interface LocalStore {
  pickups: PickupRequestRecord[];
  reports: DumpReportRecord[];
  vehicles: CollectorVehicleRecord[];
  lots: RecyclableLotRecord[];
}

function readLocalStore(): LocalStore {
  if (typeof window === 'undefined') {
    return {
      pickups: PICKUPS_SEED,
      reports: REPORTS_SEED,
      vehicles: VEHICLES_SEED,
      lots: LOTS_SEED,
    };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial: LocalStore = {
        pickups: PICKUPS_SEED,
        reports: REPORTS_SEED,
        vehicles: VEHICLES_SEED,
        lots: LOTS_SEED,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw) as LocalStore;
  } catch {
    return {
      pickups: PICKUPS_SEED,
      reports: REPORTS_SEED,
      vehicles: VEHICLES_SEED,
      lots: LOTS_SEED,
    };
  }
}

function writeLocalStore(store: LocalStore) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors in restricted browsing contexts.
  }
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => null)) as
        | { error?: { message_bn?: string; message?: string } }
        | null;
      throw new Error(errBody?.error?.message_bn || errBody?.error?.message || `HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export interface ApiResult<T> {
  data: T;
  source: 'live-api' | 'local-preview';
}

export async function fetchWards(): Promise<ApiResult<WardSummary[]>> {
  try {
    const data = await fetchJson<WardSummary[]>('/wards');
    return { data, source: 'live-api' };
  } catch {
    const store = readLocalStore();
    const wards = SAVAR_WARDS_SEED.map((w) => ({
      ...w,
      pending_pickups: store.pickups.filter(
        (p) => p.ward_id === w.id && ['pending', 'assigned', 'in_progress'].includes(p.status),
      ).length,
      open_reports: store.reports.filter(
        (r) => r.ward_id === w.id && ['reported', 'verified', 'dispatched'].includes(r.status),
      ).length,
      active_vehicles: store.vehicles.filter((v) => v.ward_id === w.id && v.status !== 'offline').length,
    }));
    return { data: wards, source: 'local-preview' };
  }
}

export async function resolveWardByCoords(
  lat: number,
  lng: number,
): Promise<{ ward_id: number; name_bn: string }> {
  try {
    const res = await fetchJson<{ ward_id: number; name_bn: string }>(
      `/wards/resolve?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
    );
    return res;
  } catch {
    const w = resolveNearestWardLocal(lat, lng);
    return { ward_id: w.id, name_bn: w.name_bn };
  }
}

export async function fetchPickups(): Promise<ApiResult<PickupRequestRecord[]>> {
  try {
    const data = await fetchJson<PickupRequestRecord[]>('/pickups');
    return { data, source: 'live-api' };
  } catch {
    return { data: readLocalStore().pickups, source: 'local-preview' };
  }
}

export async function createPickup(input: CreatePickupInput): Promise<ApiResult<PickupRequestRecord>> {
  try {
    const data = await fetchJson<PickupRequestRecord>('/pickups', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return { data, source: 'live-api' };
  } catch (err) {
    if (err instanceof Error && !err.message.includes('Failed to fetch') && err.name !== 'AbortError') {
      // Only propagate explicit API validation errors if server responded with 4xx.
      if (!err.message.startsWith('HTTP 5')) {
        const isNetwork = err.message.includes('NetworkError') || err.message.includes('fetch');
        if (!isNetwork) throw err;
      }
    }

    const store = readLocalStore();
    const ward = SAVAR_WARDS_SEED.find((w) => w.id === input.ward_id) ?? SAVAR_WARDS_SEED[0]!;
    const phone = normalizeBdPhone(input.citizen_phone) ?? input.citizen_phone;
    const suffix = Math.floor(2100 + Math.random() * 7800);
    const nowIso = new Date().toISOString();

    const record: PickupRequestRecord = {
      id: crypto.randomUUID(),
      tracking_code: `CS-PK-${suffix}`,
      citizen_name: input.citizen_name.trim(),
      citizen_phone: phone,
      ward_id: ward.id,
      ward_name_bn: ward.name_bn,
      address_line: input.address_line.trim(),
      landmark: input.landmark.trim(),
      waste_type: input.waste_type,
      slot: input.slot,
      estimated_bags: input.estimated_bags,
      status: 'pending',
      lat: input.lat ?? ward.centroid_lat,
      lng: input.lng ?? ward.centroid_lng,
      assigned_vehicle_id: null,
      assigned_vehicle_code: null,
      notes: input.notes.trim(),
      created_at: nowIso,
      updated_at: nowIso,
    };

    store.pickups = [record, ...store.pickups];
    writeLocalStore(store);
    return { data: record, source: 'local-preview' };
  }
}

export async function uploadDumpPhoto(file: File): Promise<string> {
  try {
    const form = new FormData();
    form.append('photo', file);
    const res = await fetchJson<{ url: string }>('/uploads/photo', {
      method: 'POST',
      body: form,
    });
    return res.url;
  } catch {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(new Error('ছবি প্রিভিউ তৈরি করা যায়নি।'));
      reader.readAsDataURL(file);
    });
  }
}

export async function fetchReports(): Promise<ApiResult<DumpReportRecord[]>> {
  try {
    const data = await fetchJson<DumpReportRecord[]>('/reports');
    return { data, source: 'live-api' };
  } catch {
    return { data: readLocalStore().reports, source: 'local-preview' };
  }
}

export async function createDumpReport(input: CreateDumpReportInput): Promise<ApiResult<DumpReportRecord>> {
  try {
    const data = await fetchJson<DumpReportRecord>('/reports', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return { data, source: 'live-api' };
  } catch {
    const store = readLocalStore();
    const ward =
      SAVAR_WARDS_SEED.find((w) => w.id === input.ward_id) ??
      resolveNearestWardLocal(input.lat, input.lng);
    const phone = normalizeBdPhone(input.reporter_phone) ?? input.reporter_phone;
    const suffix = Math.floor(1100 + Math.random() * 8800);
    const nowIso = new Date().toISOString();

    const record: DumpReportRecord = {
      id: crypto.randomUUID(),
      tracking_code: `CS-DR-${suffix}`,
      reporter_name: input.reporter_name.trim() || 'সাভারের নাগরিক',
      reporter_phone: phone,
      ward_id: ward.id,
      ward_name_bn: ward.name_bn,
      title_bn: input.title_bn.trim(),
      description_bn: input.description_bn.trim(),
      landmark: input.landmark.trim(),
      severity: input.severity,
      status: 'reported',
      lat: input.lat,
      lng: input.lng,
      photo_urls: input.photo_urls,
      resolved_photo_url: null,
      assigned_vehicle_id: null,
      assigned_vehicle_code: null,
      cleared_at: null,
      created_at: nowIso,
      updated_at: nowIso,
    };

    store.reports = [record, ...store.reports];
    writeLocalStore(store);
    return { data: record, source: 'local-preview' };
  }
}

export async function fetchVehicles(lat?: number, lng?: number): Promise<ApiResult<CollectorVehicleRecord[]>> {
  try {
    const qs =
      lat !== undefined && lng !== undefined
        ? `?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
        : '';
    const data = await fetchJson<CollectorVehicleRecord[]>(`/dispatch/vehicles${qs}`);
    return { data, source: 'live-api' };
  } catch {
    const store = readLocalStore();
    const vehicles = store.vehicles.map((v) => {
      if (lat === undefined || lng === undefined) return v;
      const r = 6371000;
      const dLat = ((lat - v.lat) * Math.PI) / 180;
      const dLng = ((lng - v.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((v.lat * Math.PI) / 180) *
          Math.cos((lat * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      const dist = 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return { ...v, distance_meters: dist };
    });
    vehicles.sort((a, b) => (a.distance_meters ?? 9e9) - (b.distance_meters ?? 9e9));
    return { data: vehicles, source: 'local-preview' };
  }
}

export async function assignVehicleToTask(params: {
  entity_type: 'pickup' | 'dump_report';
  entity_id: string;
  vehicle_id?: string;
  note_bn?: string;
}): Promise<ApiResult<{ assigned_vehicle_code: string }>> {
  try {
    const data = await fetchJson<{ assigned_vehicle_code: string }>('/dispatch/assign', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return { data, source: 'live-api' };
  } catch {
    const store = readLocalStore();
    const vehicle =
      store.vehicles.find((v) => v.id === params.vehicle_id) ??
      store.vehicles.find((v) => v.status === 'available') ??
      store.vehicles[0]!;

    if (params.entity_type === 'pickup') {
      store.pickups = store.pickups.map((p) =>
        p.id === params.entity_id
          ? {
              ...p,
              status: 'assigned' as PickupStatus,
              assigned_vehicle_id: vehicle.id,
              assigned_vehicle_code: vehicle.code,
              updated_at: new Date().toISOString(),
            }
          : p,
      );
    } else {
      store.reports = store.reports.map((r) =>
        r.id === params.entity_id
          ? {
              ...r,
              status: 'dispatched' as ReportStatus,
              assigned_vehicle_id: vehicle.id,
              assigned_vehicle_code: vehicle.code,
              updated_at: new Date().toISOString(),
            }
          : r,
      );
    }

    store.vehicles = store.vehicles.map((v) =>
      v.id === vehicle.id && v.status === 'available' ? { ...v, status: 'en_route' } : v,
    );
    writeLocalStore(store);

    return { data: { assigned_vehicle_code: vehicle.code }, source: 'local-preview' };
  }
}

export async function markTaskCompleted(
  entityType: 'pickup' | 'dump_report',
  entityId: string,
): Promise<void> {
  try {
    const path =
      entityType === 'pickup' ? `/pickups/${entityId}/status` : `/reports/${entityId}/status`;
    const status = entityType === 'pickup' ? 'collected' : 'cleared';
    await fetchJson(path, {
      method: 'PATCH',
      body: JSON.stringify({ status, note_bn: 'মাঠপর্যায়ে কাজ সম্পন্ন হয়েছে' }),
    });
  } catch {
    const store = readLocalStore();
    const nowIso = new Date().toISOString();
    if (entityType === 'pickup') {
      store.pickups = store.pickups.map((p) =>
        p.id === entityId ? { ...p, status: 'collected', updated_at: nowIso } : p,
      );
    } else {
      store.reports = store.reports.map((r) =>
        r.id === entityId
          ? { ...r, status: 'cleared', cleared_at: nowIso, updated_at: nowIso }
          : r,
      );
    }
    writeLocalStore(store);
  }
}

export async function trackByCodeOrPhone(query: string): Promise<TrackedResult | null> {
  const cleaned = query.trim().toUpperCase();
  if (!cleaned) return null;

  if (cleaned.startsWith('CS-PK-')) {
    try {
      const res = await fetchJson<{ pickup: PickupRequestRecord; events: StatusEventRecord[] }>(
        `/pickups/track/${encodeURIComponent(cleaned)}`,
      );
      return { kind: 'pickup', pickup: res.pickup, events: res.events };
    } catch {
      const pickup = readLocalStore().pickups.find((p) => p.tracking_code.toUpperCase() === cleaned);
      if (!pickup) return null;
      return {
        kind: 'pickup',
        pickup,
        events: buildFallbackEvents('pickup', pickup.id, pickup.status, pickup.created_at, pickup.updated_at, pickup.assigned_vehicle_code),
      };
    }
  }

  if (cleaned.startsWith('CS-DR-')) {
    try {
      const res = await fetchJson<{ report: DumpReportRecord; events: StatusEventRecord[] }>(
        `/reports/track/${encodeURIComponent(cleaned)}`,
      );
      return { kind: 'dump_report', report: res.report, events: res.events };
    } catch {
      const report = readLocalStore().reports.find((r) => r.tracking_code.toUpperCase() === cleaned);
      if (!report) return null;
      return {
        kind: 'dump_report',
        report,
        events: buildFallbackEvents('dump_report', report.id, report.status, report.created_at, report.updated_at, report.assigned_vehicle_code),
      };
    }
  }

  const normalizedPhone = normalizeBdPhone(query);
  const store = readLocalStore();
  if (normalizedPhone) {
    const matchedPickup = store.pickups.find((p) => p.citizen_phone === normalizedPhone);
    if (matchedPickup) {
      return {
        kind: 'pickup',
        pickup: matchedPickup,
        events: buildFallbackEvents('pickup', matchedPickup.id, matchedPickup.status, matchedPickup.created_at, matchedPickup.updated_at, matchedPickup.assigned_vehicle_code),
      };
    }
    const matchedReport = store.reports.find((r) => r.reporter_phone === normalizedPhone);
    if (matchedReport) {
      return {
        kind: 'dump_report',
        report: matchedReport,
        events: buildFallbackEvents('dump_report', matchedReport.id, matchedReport.status, matchedReport.created_at, matchedReport.updated_at, matchedReport.assigned_vehicle_code),
      };
    }
  }

  return null;
}

function buildFallbackEvents(
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
      to_status: entityType === 'pickup' ? 'assigned' : 'dispatched',
      actor_label: 'সাভার পৌরসভা অপস',
      note_bn: vehicleCode ? `গাড়ি ${vehicleCode} নির্ধারণ করা হয়েছে` : 'ওয়ার্ড সুপারভাইজার যাচাই করেছেন',
      created_at: updatedAt,
    });
  }

  if (status === 'collected' || status === 'cleared') {
    events.push({
      id: `${entityId}-3`,
      entity_type: entityType,
      entity_id: entityId,
      from_status: entityType === 'pickup' ? 'assigned' : 'dispatched',
      to_status: status,
      actor_label: 'মাঠপর্যায় সংগ্রহকারী',
      note_bn: entityType === 'pickup' ? 'ময়লা সংগ্রহ সম্পন্ন হয়েছে' : 'জায়গাটি পরিষ্কার করা হয়েছে',
      created_at: updatedAt,
    });
  }

  return events;
}

export async function fetchRecyclableLots(): Promise<ApiResult<RecyclableLotRecord[]>> {
  try {
    const data = await fetchJson<RecyclableLotRecord[]>('/partner/lots');
    return { data, source: 'live-api' };
  } catch {
    return { data: readLocalStore().lots, source: 'local-preview' };
  }
}

export async function claimRecyclableLot(
  lotId: string,
  partnerName: string,
): Promise<ApiResult<RecyclableLotRecord>> {
  try {
    const data = await fetchJson<RecyclableLotRecord>(`/partner/lots/${lotId}/claim`, {
      method: 'POST',
      body: JSON.stringify({ partner_name: partnerName }),
    });
    return { data, source: 'live-api' };
  } catch {
    const store = readLocalStore();
    let updated: RecyclableLotRecord | undefined;
    store.lots = store.lots.map((l) => {
      if (l.id === lotId) {
        updated = { ...l, status: 'claimed', claimed_partner_name: partnerName.trim() };
        return updated;
      }
      return l;
    });
    writeLocalStore(store);
    if (!updated) throw new Error('লটটি পাওয়া যায়নি।');
    return { data: updated, source: 'local-preview' };
  }
}
