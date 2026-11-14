/**
 * Clean Savar — Developer Admin Console Store
 * Centralized client-side state & persistence for developer-level controls,
 * feature flags, simulation engines, user RBAC, and telemetry.
 */

export interface DevFeatureFlags {
  enableDemoMode: boolean;
  strictOtp: boolean;
  otpPaused: boolean;
  otpPauseNoticeBn: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  emergencyAlertActive: boolean;
  emergencyAlertText: string;
  requireDumpPhoto: boolean;
  autoDispatchNearest: boolean;
  strictGeofence: boolean;
  simulateGpsMovement: boolean;
}

export type ExtendedRole = 'citizen' | 'collector' | 'partner' | 'admin' | 'developer';

export interface DevUserAccount {
  id: string;
  phone: string;
  fullName: string;
  role: ExtendedRole;
  wardId: number | null;
  isVerified: boolean;
  createdAt: string;
  lastActive: string;
}

export interface DevOtpRecord {
  id: string;
  phone: string;
  otp: string;
  expiresAt: string;
  source: 'firebase' | 'render_api' | 'dev_simulator';
  consumed: boolean;
}

export interface DevVehicleSim {
  id: string;
  code: string;
  vehicleType: 'rickshaw_van' | 'mini_truck' | 'compactor';
  driverName: string;
  driverPhone: string;
  wardId: number;
  lat: number;
  lng: number;
  status: 'available' | 'en_route' | 'busy' | 'offline';
  fuelPercent: number;
  currentLoadKg: number;
  capacityKg: number;
}

export interface DevMarketRate {
  id: string;
  materialType: 'plastic' | 'paper_cardboard' | 'metal_ewaste' | 'glass' | 'organic';
  nameBn: string;
  nameEn: string;
  basePricePerKg: number;
  marketTrend: 'up' | 'down' | 'stable';
  minLotSizeKg: number;
}

export interface DevAuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  category: 'auth' | 'flag' | 'dispatch' | 'seeder' | 'security' | 'purge';
  details: string;
  ip: string;
}

export interface DevApkReleaseConfig {
  versionName: string;
  versionCode: number;
  releaseDate: string;
  apkSizeMb: number;
  downloadUrl: string;
  sha256DebugCert: string;
  minSupportedVersionCode: number;
  forceUpdateEnabled: boolean;
  changelogBn: string[];
}

const DEFAULT_FLAGS: DevFeatureFlags = {
  enableDemoMode: true,
  strictOtp: false,
  otpPaused: true,
  otpPauseNoticeBn:
    'টেলিকম এসএমএস গেটওয়েতে সাময়িক যান্ত্রিক ত্রুটির কারণে মোবাইল OTP যাচাইকরণ সাময়িকভাবে স্থগিত রাখা হয়েছে। দ্রুত ও নিরবচ্ছিন্ন সেবার জন্য আপনার পূর্ণ নাম ও মোবাইল নম্বর পূরণ করে Google অ্যাকাউন্টের মাধ্যমে সাইন-ইন সম্পন্ন করুন।',
  maintenanceMode: false,
  maintenanceMessage: 'সিস্টেম উন্নয়নের কাজ চলছে। শীঘ্রই আমরা ফিরে আসব।',
  emergencyAlertActive: false,
  emergencyAlertText: 'সাভার পৌরসভা বিশেষ সতর্কতা: ভারী বৃষ্টির কারণে বর্জ্য নিষ্কাশন সূচি সাময়িক পরিবর্তিত।',
  requireDumpPhoto: true,
  autoDispatchNearest: true,
  strictGeofence: false,
  simulateGpsMovement: false,
};

export const ALLOWED_DEV_EMAILS: readonly string[] = [
  'niyamulhasanbd@gmail.com',
  'niyamulhasan1089@gmail.com',
];

export function isAllowedDevEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return ALLOWED_DEV_EMAILS.some((allowed) => allowed.toLowerCase() === clean);
}

export interface ApprovedAdminRecord {
  id: string;
  phone: string;
  fullName: string;
  email?: string;
  role: 'admin';
  status: 'approved' | 'pending' | 'revoked';
  approvedAt?: string;
  approvedBy?: string;
  requestedAt?: string;
  note?: string;
}

const DEFAULT_APPROVED_ADMINS: ApprovedAdminRecord[] = [
  {
    id: 'adm-001',
    phone: '01711-240100',
    fullName: 'সাভার পৌরসভা প্রধান অ্যাডমিন',
    role: 'admin',
    status: 'approved',
    approvedAt: '2026-11-01 09:00',
    approvedBy: 'Developer SuperAdmin (System Bootstrap)',
    note: 'সাভার পৌরসভা অফিসিয়াল অ্যাডমিন নম্বর',
  },
  {
    id: 'adm-002',
    phone: '01700-000000',
    fullName: 'সুপার অ্যাডমিন / ডেভেলপার',
    email: 'niyamulhasanbd@gmail.com',
    role: 'admin',
    status: 'approved',
    approvedAt: '2026-11-01 00:00',
    approvedBy: 'Developer SuperAdmin',
    note: 'প্রধান সিস্টেম ডেভেলপার অ্যাকাউন্ট',
  },
  {
    id: 'adm-003',
    phone: '01715-883210',
    fullName: 'নিয়ামুল হাসান (ম্যানেজমেন্ট অ্যাডমিন)',
    email: 'niyamulhasan1089@gmail.com',
    role: 'admin',
    status: 'approved',
    approvedAt: '2026-11-01 00:00',
    approvedBy: 'Developer SuperAdmin',
    note: 'ম্যানেজমেন্ট ও টেকনিক্যাল অ্যাডমিন অ্যাকাউন্ট',
  },
];

const DEFAULT_USERS: DevUserAccount[] = [
  {
    id: 'usr-dev-001',
    phone: '01711-240100',
    fullName: 'সাভার পৌরসভা অ্যাডমিন',
    role: 'admin',
    wardId: 1,
    isVerified: true,
    createdAt: '2026-11-01T08:00:00Z',
    lastActive: 'আজ, ১০:১৫ মিনিট',
  },
  {
    id: 'usr-dev-002',
    phone: '01715-883210',
    fullName: 'রাফি আহমেদ (নাগরিক)',
    role: 'citizen',
    wardId: 4,
    isVerified: true,
    createdAt: '2026-11-05T14:20:00Z',
    lastActive: 'গতকাল, সন্ধ্যা ৭:৩০',
  },
  {
    id: 'usr-dev-003',
    phone: '01712-448910',
    fullName: 'মো. রফিকুল ইসলাম (ড্রাইভার)',
    role: 'collector',
    wardId: 3,
    isVerified: true,
    createdAt: '2026-11-02T09:10:00Z',
    lastActive: 'আজ, সকাল ৯:৪০',
  },
  {
    id: 'usr-dev-004',
    phone: '01755-880001',
    fullName: 'সবুজ রিসাইক্লিং সাভার',
    role: 'partner',
    wardId: 5,
    isVerified: true,
    createdAt: '2026-11-03T11:45:00Z',
    lastActive: '২ দিন আগে',
  },
  {
    id: 'usr-dev-005',
    phone: '01700-000000',
    fullName: 'সুপার ডেভেলপার / সিস্টেম ইঞ্জিনিয়ার',
    role: 'developer',
    wardId: null,
    isVerified: true,
    createdAt: '2026-11-01T00:00:00Z',
    lastActive: 'সক্রিয় (Active)',
  },
];

const DEFAULT_VEHICLES: DevVehicleSim[] = [
  {
    id: 'v-01',
    code: 'TRUCK-SAVAR-01',
    vehicleType: 'compactor',
    driverName: 'মো. রফিকুল ইসলাম',
    driverPhone: '01712-448910',
    wardId: 3,
    lat: 23.8492,
    lng: 90.2546,
    status: 'en_route',
    fuelPercent: 82,
    currentLoadKg: 1450,
    capacityKg: 3500,
  },
  {
    id: 'v-02',
    code: 'VAN-SAVAR-02',
    vehicleType: 'mini_truck',
    driverName: 'আব্দুল করিম',
    driverPhone: '01754-812309',
    wardId: 4,
    lat: 23.8458,
    lng: 90.2571,
    status: 'available',
    fuelPercent: 95,
    currentLoadKg: 320,
    capacityKg: 1200,
  },
  {
    id: 'v-03',
    code: 'RICKSHAW-03',
    vehicleType: 'rickshaw_van',
    driverName: 'মো. সেলিম আহমেদ',
    driverPhone: '01733-112233',
    wardId: 5,
    lat: 23.8412,
    lng: 90.2535,
    status: 'busy',
    fuelPercent: 100,
    currentLoadKg: 280,
    capacityKg: 400,
  },
  {
    id: 'v-04',
    code: 'TRUCK-SAVAR-04',
    vehicleType: 'compactor',
    driverName: 'জাহাঙ্গীর আলম',
    driverPhone: '01766-998877',
    wardId: 8,
    lat: 23.8436,
    lng: 90.2688,
    status: 'available',
    fuelPercent: 64,
    currentLoadKg: 890,
    capacityKg: 3500,
  },
];

const DEFAULT_MARKET_RATES: DevMarketRate[] = [
  {
    id: 'mr-1',
    materialType: 'plastic',
    nameBn: 'মিশ্র প্লাস্টিক ও বোতল',
    nameEn: 'Rigid & Pet Plastic',
    basePricePerKg: 42,
    marketTrend: 'up',
    minLotSizeKg: 100,
  },
  {
    id: 'mr-2',
    materialType: 'paper_cardboard',
    nameBn: 'কাগজ ও শক্ত কার্ডবোর্ড',
    nameEn: 'Corrugated Paper & Cartons',
    basePricePerKg: 18,
    marketTrend: 'stable',
    minLotSizeKg: 250,
  },
  {
    id: 'mr-3',
    materialType: 'metal_ewaste',
    nameBn: 'লোহা ও ইলেকট্রনিক বর্জ্য',
    nameEn: 'Scrap Metal & E-waste',
    basePricePerKg: 115,
    marketTrend: 'up',
    minLotSizeKg: 50,
  },
  {
    id: 'mr-4',
    materialType: 'glass',
    nameBn: 'অক্ষত ও ভাঙা কাঁচের বোতল',
    nameEn: 'Cullet & Glass Bottles',
    basePricePerKg: 12,
    marketTrend: 'down',
    minLotSizeKg: 300,
  },
  {
    id: 'mr-5',
    materialType: 'organic',
    nameBn: 'কম্পোস্টযোগ্য জৈব বর্জ্য',
    nameEn: 'Segregated Organic Substrate',
    basePricePerKg: 6,
    marketTrend: 'stable',
    minLotSizeKg: 500,
  },
];

const DEFAULT_APK_CONFIG: DevApkReleaseConfig = {
  versionName: '1.2.0',
  versionCode: 3,
  releaseDate: '2026-11-14',
  apkSizeMb: 53.4,
  downloadUrl: '/clean-savar.apk',
  sha256DebugCert: '49:82:B4:C6:48:4D:04:C8:82:E3:41:66:18:C7:1B:EB:59:18:58:8B:AB:5A:A4:0B:0C:A0:8D:FD:55:CB:66:70',
  minSupportedVersionCode: 1,
  forceUpdateEnabled: false,
  changelogBn: [
    'অফিসিয়াল অ্যান্ড্রয়েড ফুল-স্কেল অ্যাডাপ্টিভ আইকন (Circle & Squircle ফ্রেন্ডলি)',
    'সাভার পৌরসভার ৯টি ওয়ার্ড ও ৬টি ইউনিয়নের লাইভ ড্যাশবোর্ড',
    'নাগরিক ডোর-টু-ডোর ময়লা পিকআপ শিডিউল ও অন-ডিমান্ড বুকিং',
    'ফটো সহ সরাসরি অবৈধ ডাম্প সাইট জিও-ট্যাগ রিপোর্টিং',
    'পরিচ্ছন্নতাকর্মী ডেডিকেটেড কিউআর কোড স্ক্যানার ও অফলাইন সিঙ্ক',
    'রিসাইক্লিং পার্টনার ওপেন অকশন মার্কেটপ্লেস',
  ],
};

const DEV_STORAGE_KEYS = {
  FLAGS: 'cs_dev_feature_flags_v1',
  USERS: 'cs_dev_users_v1',
  APPROVED_ADMINS: 'cs_dev_approved_admins_v1',
  OTPS: 'cs_dev_otps_v1',
  VEHICLES: 'cs_dev_vehicles_v1',
  MARKET: 'cs_dev_market_v1',
  APK: 'cs_dev_apk_config_v1',
  AUDIT: 'cs_dev_audit_v1',
  SESSION: 'cs_dev_auth_session_v1',
};

// Check if running in browser
function isClient(): boolean {
  return typeof window !== 'undefined';
}

export function getDevFeatureFlags(): DevFeatureFlags {
  if (!isClient()) return DEFAULT_FLAGS;
  try {
    const raw = localStorage.getItem(DEV_STORAGE_KEYS.FLAGS);
    if (!raw) return DEFAULT_FLAGS;
    return { ...DEFAULT_FLAGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FLAGS;
  }
}

export function saveDevFeatureFlags(flags: Partial<DevFeatureFlags>): DevFeatureFlags {
  const current = getDevFeatureFlags();
  const updated = { ...current, ...flags };
  if (isClient()) {
    try {
      localStorage.setItem(DEV_STORAGE_KEYS.FLAGS, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('cs:dev-flags-changed', { detail: updated }));
    } catch (e) {
      console.warn('Failed to save dev feature flags', e);
    }
  }
  recordDevAudit({
    actor: 'SuperDeveloper (Console)',
    action: 'UPDATE_FEATURE_FLAGS',
    category: 'flag',
    details: `Updated keys: ${Object.keys(flags).join(', ')}`,
  });
  return updated;
}

export function getDevUsers(): DevUserAccount[] {
  if (!isClient()) return DEFAULT_USERS;
  try {
    const raw = localStorage.getItem(DEV_STORAGE_KEYS.USERS);
    if (!raw) return DEFAULT_USERS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_USERS;
  }
}

export function updateDevUserRole(userId: string, newRole: ExtendedRole): DevUserAccount[] {
  const list = getDevUsers();
  const updated = list.map((u) => (u.id === userId ? { ...u, role: newRole } : u));
  if (isClient()) {
    try {
      localStorage.setItem(DEV_STORAGE_KEYS.USERS, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save users', e);
    }
  }
  const target = list.find((u) => u.id === userId);
  recordDevAudit({
    actor: 'SuperDeveloper (Console)',
    action: 'PROMOTE_USER_ROLE',
    category: 'auth',
    details: `Changed role of ${target?.phone || userId} to '${newRole}'`,
  });
  return updated;
}

export function addNewDevUser(user: Omit<DevUserAccount, 'id' | 'createdAt' | 'lastActive'>): DevUserAccount[] {
  const list = getDevUsers();
  const newUser: DevUserAccount = {
    ...user,
    id: `usr-dev-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    lastActive: 'এখনই তৈরি',
  };
  const updated = [newUser, ...list];
  if (isClient()) {
    try {
      localStorage.setItem(DEV_STORAGE_KEYS.USERS, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to add user', e);
    }
  }
  recordDevAudit({
    actor: 'SuperDeveloper (Console)',
    action: 'CREATE_USER',
    category: 'auth',
    details: `Created new user ${newUser.phone} (${newUser.role})`,
  });
  return updated;
}

function cleanDigits(p?: string | null): string {
  if (!p) return '';
  return p.replace(/\D/g, '').replace(/^880/, '0');
}

export function getApprovedAdminRecords(): ApprovedAdminRecord[] {
  if (!isClient()) return DEFAULT_APPROVED_ADMINS;
  try {
    const raw = localStorage.getItem(DEV_STORAGE_KEYS.APPROVED_ADMINS);
    if (!raw) return DEFAULT_APPROVED_ADMINS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_APPROVED_ADMINS;
  }
}

export function isUserApprovedAdmin(phone?: string | null, email?: string | null): boolean {
  if (isAllowedDevEmail(email)) return true;
  const targetDigits = cleanDigits(phone);
  const targetEmail = (email || '').trim().toLowerCase();
  const list = getApprovedAdminRecords();
  return list.some((rec) => {
    if (rec.status !== 'approved') return false;
    if (targetDigits && cleanDigits(rec.phone) === targetDigits) return true;
    if (targetEmail && rec.email && rec.email.toLowerCase() === targetEmail) return true;
    return false;
  });
}

export function approveAdminUser(
  phone: string,
  fullName?: string,
  email?: string,
  approvedBy = 'Developer SuperAdmin',
): ApprovedAdminRecord[] {
  const list = getApprovedAdminRecords();
  const targetDigits = cleanDigits(phone);
  const existingIndex = list.findIndex((a) => cleanDigits(a.phone) === targetDigits);
  const now = new Date().toLocaleString('bn-BD');
  let updated: ApprovedAdminRecord[];
  if (existingIndex >= 0) {
    updated = list.map((a, idx) =>
      idx === existingIndex
        ? {
            ...a,
            fullName: fullName || a.fullName,
            email: email || a.email,
            status: 'approved' as const,
            approvedAt: now,
            approvedBy,
          }
        : a,
    );
  } else {
    const newRecord: ApprovedAdminRecord = {
      id: `adm-${Date.now().toString(36)}`,
      phone: phone.trim(),
      fullName: fullName?.trim() || 'পৌরসভা অ্যাডমিন',
      email: email?.trim(),
      role: 'admin',
      status: 'approved',
      approvedAt: now,
      approvedBy,
      note: 'ডেভেলপার কনসোল থেকে অনুমোদিত',
    };
    updated = [newRecord, ...list];
  }
  if (isClient()) {
    try {
      localStorage.setItem(DEV_STORAGE_KEYS.APPROVED_ADMINS, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('cs:admin-approvals-changed', { detail: updated }));
    } catch (e) {
      console.warn('Failed to save approved admin', e);
    }
  }
  recordDevAudit({
    actor: approvedBy,
    action: 'APPROVE_MUNICIPAL_ADMIN',
    category: 'auth',
    details: `Approved municipal/management admin access for ${phone}`,
  });
  return updated;
}

export function revokeAdminUser(phone: string): ApprovedAdminRecord[] {
  const list = getApprovedAdminRecords();
  const targetDigits = cleanDigits(phone);
  const updated = list.map((a) =>
    cleanDigits(a.phone) === targetDigits ? { ...a, status: 'revoked' as const } : a,
  );
  if (isClient()) {
    try {
      localStorage.setItem(DEV_STORAGE_KEYS.APPROVED_ADMINS, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('cs:admin-approvals-changed', { detail: updated }));
    } catch (e) {
      console.warn('Failed to revoke admin', e);
    }
  }
  recordDevAudit({
    actor: 'Developer SuperAdmin',
    action: 'REVOKE_MUNICIPAL_ADMIN',
    category: 'auth',
    details: `Revoked municipal admin access for ${phone}`,
  });
  return updated;
}

export function requestAdminAccess(phone: string, fullName: string, email?: string): void {
  const list = getApprovedAdminRecords();
  const targetDigits = cleanDigits(phone);
  const exists = list.some((a) => cleanDigits(a.phone) === targetDigits);
  if (exists) return;
  const newReq: ApprovedAdminRecord = {
    id: `adm-req-${Date.now().toString(36)}`,
    phone: phone.trim(),
    fullName: fullName.trim(),
    email: email?.trim(),
    role: 'admin',
    status: 'pending',
    requestedAt: new Date().toLocaleString('bn-BD'),
    note: 'পৌর অ্যাডমিন প্যানেলে প্রবেশের অপেক্ষমাণ আবেদন',
  };
  const updated = [...list, newReq];
  if (isClient()) {
    try {
      localStorage.setItem(DEV_STORAGE_KEYS.APPROVED_ADMINS, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('cs:admin-approvals-changed', { detail: updated }));
    } catch (e) {
      console.warn('Failed to save admin request', e);
    }
  }
}

export function getDevOtps(): DevOtpRecord[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(DEV_STORAGE_KEYS.OTPS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function generateDevSimulatedOtp(phone: string): DevOtpRecord {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const record: DevOtpRecord = {
    id: `otp-${Date.now().toString(36)}`,
    phone: phone.trim(),
    otp: code,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toLocaleTimeString('bn-BD'),
    source: 'dev_simulator',
    consumed: false,
  };
  const list = [record, ...getDevOtps().slice(0, 19)];
  if (isClient()) {
    try {
      localStorage.setItem(DEV_STORAGE_KEYS.OTPS, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to save simulated OTP', e);
    }
  }
  recordDevAudit({
    actor: 'SuperDeveloper (Console)',
    action: 'GENERATE_SIMULATED_OTP',
    category: 'auth',
    details: `Generated instant OTP ${code} for ${phone}`,
  });
  return record;
}

export function getDevVehicles(): DevVehicleSim[] {
  if (!isClient()) return DEFAULT_VEHICLES;
  try {
    const raw = localStorage.getItem(DEV_STORAGE_KEYS.VEHICLES);
    if (!raw) return DEFAULT_VEHICLES;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_VEHICLES;
  }
}

export function updateDevVehicle(id: string, patch: Partial<DevVehicleSim>): DevVehicleSim[] {
  const list = getDevVehicles();
  const updated = list.map((v) => (v.id === id ? { ...v, ...patch } : v));
  if (isClient()) {
    try {
      localStorage.setItem(DEV_STORAGE_KEYS.VEHICLES, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to update vehicle', e);
    }
  }
  recordDevAudit({
    actor: 'SuperDeveloper (Console)',
    action: 'UPDATE_VEHICLE_SIM',
    category: 'dispatch',
    details: `Updated vehicle ${id} parameters`,
  });
  return updated;
}

export function tickSimulateVehicleMovements(): DevVehicleSim[] {
  const list = getDevVehicles();
  const updated = list.map((v) => {
    // Add small jitter (~30-80 meters) around Savar coordinates
    const dLat = (Math.random() - 0.5) * 0.0015;
    const dLng = (Math.random() - 0.5) * 0.0015;
    const newLoad = Math.min(v.capacityKg, v.currentLoadKg + Math.floor(Math.random() * 25));
    const newFuel = Math.max(15, v.fuelPercent - (Math.random() > 0.8 ? 1 : 0));
    return {
      ...v,
      lat: Number((v.lat + dLat).toFixed(5)),
      lng: Number((v.lng + dLng).toFixed(5)),
      currentLoadKg: newLoad,
      fuelPercent: newFuel,
    };
  });
  if (isClient()) {
    try {
      localStorage.setItem(DEV_STORAGE_KEYS.VEHICLES, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to tick vehicles', e);
    }
  }
  return updated;
}

export function getDevMarketRates(): DevMarketRate[] {
  if (!isClient()) return DEFAULT_MARKET_RATES;
  try {
    const raw = localStorage.getItem(DEV_STORAGE_KEYS.MARKET);
    if (!raw) return DEFAULT_MARKET_RATES;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_MARKET_RATES;
  }
}

export function updateDevMarketRate(id: string, newPrice: number): DevMarketRate[] {
  const list = getDevMarketRates();
  const updated = list.map((m) => (m.id === id ? { ...m, basePricePerKg: newPrice } : m));
  if (isClient()) {
    try {
      localStorage.setItem(DEV_STORAGE_KEYS.MARKET, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to update market rate', e);
    }
  }
  recordDevAudit({
    actor: 'SuperDeveloper (Console)',
    action: 'UPDATE_MARKET_RATE',
    category: 'flag',
    details: `Updated price for lot type ${id} to ৳${newPrice}/kg`,
  });
  return updated;
}

export function getDevApkConfig(): DevApkReleaseConfig {
  if (!isClient()) return DEFAULT_APK_CONFIG;
  try {
    const raw = localStorage.getItem(DEV_STORAGE_KEYS.APK);
    if (!raw) return DEFAULT_APK_CONFIG;
    return { ...DEFAULT_APK_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_APK_CONFIG;
  }
}

export function saveDevApkConfig(patch: Partial<DevApkReleaseConfig>): DevApkReleaseConfig {
  const current = getDevApkConfig();
  const updated = { ...current, ...patch };
  if (isClient()) {
    try {
      localStorage.setItem(DEV_STORAGE_KEYS.APK, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save APK config', e);
    }
  }
  recordDevAudit({
    actor: 'SuperDeveloper (Console)',
    action: 'UPDATE_APK_RELEASE_CONFIG',
    category: 'flag',
    details: `Updated APK release version to ${updated.versionName} (${updated.versionCode})`,
  });
  return updated;
}

export function getDevAuditLogs(): DevAuditEvent[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(DEV_STORAGE_KEYS.AUDIT);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function recordDevAudit(event: Omit<DevAuditEvent, 'id' | 'timestamp' | 'ip'>): void {
  if (!isClient()) return;
  try {
    const newEntry: DevAuditEvent = {
      ...event,
      id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('bn-BD', { hour12: true }),
      ip: '127.0.0.1 (Local Dev Session)',
    };
    const current = getDevAuditLogs();
    const updated = [newEntry, ...current].slice(0, 50);
    localStorage.setItem(DEV_STORAGE_KEYS.AUDIT, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to record dev audit event', e);
  }
}

export function clearDevAuditLogs(): void {
  if (!isClient()) return;
  try {
    localStorage.removeItem(DEV_STORAGE_KEYS.AUDIT);
  } catch (e) {
    console.warn('Failed to clear audit logs', e);
  }
}

export function resetDevConsoleToDefaults(): void {
  if (!isClient()) return;
  try {
    Object.values(DEV_STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    window.dispatchEvent(new CustomEvent('cs:dev-flags-changed', { detail: DEFAULT_FLAGS }));
  } catch (e) {
    console.warn('Failed to reset console', e);
  }
}
