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
  enableTrafficTracking: boolean;
  enableDownloadTracking: boolean;
  allowGuestDownloads: boolean;
  broadcastBannerType: 'none' | 'info' | 'warning' | 'emergency';
  broadcastBannerTitle: string;
  broadcastBannerMessage: string;
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

export interface DevVisitorLog {
  id: string;
  sessionId: string;
  visitorId: string;
  userId?: string | null;
  userName?: string | null;
  userPhone?: string | null;
  userRole?: ExtendedRole | 'guest';
  path: string;
  title: string;
  ip: string;
  location: {
    city: string;
    region: string;
    country: string;
    flag: string;
    isp?: string;
  };
  device: {
    type: 'mobile' | 'desktop' | 'tablet';
    os: string;
    browser: string;
    screen: string;
    userAgent: string;
  };
  referrer: string;
  timestamp: string;
  formattedTime: string;
}

export interface DevTrafficSummary {
  totalPageviews: number;
  uniqueVisitors: number;
  activeNow: number;
  mobilePercent: number;
  desktopPercent: number;
  topPages: { path: string; label: string; count: number }[];
  topLocations: { city: string; count: number }[];
  hourlyTraffic: { hour: string; count: number }[];
}

export interface DevDownloadEvent {
  id: string;
  fileId: string;
  fileName: string;
  fileVersion: string;
  fileSizeMb: number;
  downloaderId: string;
  downloaderName: string;
  downloaderPhone?: string;
  downloaderEmail?: string;
  downloaderRole: string;
  ip: string;
  location: string;
  device: string;
  timestamp: string;
  formattedTime: string;
  status: 'completed' | 'started';
}

export interface DevUserDownloadStat {
  downloaderId: string;
  downloaderName: string;
  downloaderPhone?: string;
  downloaderEmail?: string;
  downloaderRole: string;
  totalDownloads: number;
  lastDownloadTime: string;
  firstDownloadTime: string;
  filesDownloaded: string[];
  lastLocation: string;
  lastDevice: string;
  lastIp: string;
}

export interface DevDownloadSummary {
  totalDownloads: number;
  uniqueDownloaders: number;
  registeredDownloads: number;
  guestDownloads: number;
  apkDownloads: number;
  reportDownloads: number;
  todayDownloads: number;
}

export interface DevLoginEvent {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userEmail?: string;
  userRole: ExtendedRole;
  ip: string;
  location: string;
  isp?: string;
  device: string;
  authMethod: 'google_auth' | 'firebase_token' | 'phone_otp' | 'dev_bypass';
  timestamp: string;
  formattedTime: string;
  status: 'success' | 'failed' | 'blocked';
}

export interface DevUserLoginStat {
  userId: string;
  userName: string;
  userPhone: string;
  userEmail?: string;
  userRole: ExtendedRole;
  totalLogins: number;
  lastLoginTime: string;
  lastIp: string;
  lastLocation: string;
  lastDevice: string;
  lastIsp?: string;
  authMethod: string;
}

export interface DevLoginSummary {
  totalLogins: number;
  uniqueUsers: number;
  successRate: number;
  todayLogins: number;
  topLocation: string;
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
  enableTrafficTracking: true,
  enableDownloadTracking: true,
  allowGuestDownloads: true,
  broadcastBannerType: 'none',
  broadcastBannerTitle: 'জরুরি পৌর বিজ্ঞপ্তি',
  broadcastBannerMessage: 'সাভার পৌরসভা বিশেষ সতর্কতা: পরিচ্ছন্নতা কার্যক্রম অব্যাহত রয়েছে।',
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
  apkSizeMb: 24.0,
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
  VISITORS: 'cs_dev_visitors_v2',
  DOWNLOADS: 'cs_dev_downloads_v2',
  USER_DOWNLOADS: 'cs_dev_user_downloads_v2',
  LOGINS: 'cs_dev_logins_v2',
  USER_LOGINS: 'cs_dev_user_logins_v2',
};

const DEFAULT_USER_DOWNLOADS: DevUserDownloadStat[] = [
  {
    downloaderId: 'usr-dev-001',
    downloaderName: 'সাভার পৌরসভা প্রধান অ্যাডমিন',
    downloaderPhone: '01711-240100',
    downloaderRole: 'admin',
    totalDownloads: 8,
    lastDownloadTime: 'আজ, সকাল ১০:১৫',
    firstDownloadTime: '২০২৬-১১-০১',
    filesDownloaded: ['clean-savar.apk (Universal v1.2.0)', 'clean-savar-ops-report.csv'],
    lastLocation: 'সাভার পৌরসভা কার্যালয়, সাভার',
    lastDevice: 'Windows 11 (Chrome Desktop)',
    lastIp: '103.114.98.15',
  },
  {
    downloaderId: 'usr-dev-003',
    downloaderName: 'মো. রফিকুল ইসলাম (ড্রাইভার)',
    downloaderPhone: '01712-448910',
    downloaderRole: 'collector',
    totalDownloads: 5,
    lastDownloadTime: 'আজ, সকাল ৯:৪০',
    firstDownloadTime: '২০২৬-১১-০২',
    filesDownloaded: ['clean-savar.apk (Universal v1.2.0)', 'clean-savar-arm64.apk'],
    lastLocation: 'সাভার বাসস্ট্যান্ড, ওয়ার্ড নং ৩',
    lastDevice: 'Samsung Galaxy A34 (Android 14)',
    lastIp: '103.114.98.42',
  },
  {
    downloaderId: 'usr-dev-002',
    downloaderName: 'রাফি আহমেদ (নাগরিক)',
    downloaderPhone: '01715-883210',
    downloaderRole: 'citizen',
    totalDownloads: 4,
    lastDownloadTime: 'গতকাল, সন্ধ্যা ৭:৩০',
    firstDownloadTime: '২০২৬-১১-০৫',
    filesDownloaded: ['clean-savar.apk (Universal v1.2.0)'],
    lastLocation: 'সাভার বাজার রোড, ওয়ার্ড নং ৪',
    lastDevice: 'Xiaomi Redmi Note 13 (Android 13)',
    lastIp: '103.114.98.77',
  },
  {
    downloaderId: 'usr-dev-004',
    downloaderName: 'সবুজ রিসাইক্লিং সাভার (পার্টনার)',
    downloaderPhone: '01755-880001',
    downloaderRole: 'partner',
    totalDownloads: 3,
    lastDownloadTime: '২ দিন আগে',
    firstDownloadTime: '২০২৬-১১-০৩',
    filesDownloaded: ['clean-savar.apk (Universal v1.2.0)', 'market-pricing-sheet.csv'],
    lastLocation: 'হেমায়েতপুর বাসস্ট্যান্ড, সাভার',
    lastDevice: 'Realme 11 Pro (Android 14)',
    lastIp: '202.134.12.89',
  },
  {
    downloaderId: 'gst-savar-104',
    downloaderName: 'গেস্ট ভিজিটর #১০৪',
    downloaderRole: 'guest',
    totalDownloads: 2,
    lastDownloadTime: 'আজ, সকাল ০৮:২০',
    firstDownloadTime: '২০২৬-১১-১২',
    filesDownloaded: ['clean-savar.apk (Universal v1.2.0)'],
    lastLocation: 'জাহাঙ্গীরনগর বিশ্ববিদ্যালয় ক্যাম্পাস, সাভার',
    lastDevice: 'OnePlus Nord CE (Android 14)',
    lastIp: '103.114.98.201',
  },
  {
    downloaderId: 'gst-ashulia-109',
    downloaderName: 'গেস্ট ভিজিটর #১০৯',
    downloaderRole: 'guest',
    totalDownloads: 1,
    lastDownloadTime: 'আজ, সকাল ০৭:৫০',
    firstDownloadTime: '২০২৬-১১-১৪',
    filesDownloaded: ['clean-savar-arm64.apk'],
    lastLocation: 'পল্লীবিদ্যুৎ, আশুলিয়া, সাভার',
    lastDevice: 'Infinix Hot 40 (Android 13)',
    lastIp: '103.114.98.112',
  },
];

const DEFAULT_DOWNLOADS: DevDownloadEvent[] = [
  {
    id: 'dl-evt-001',
    fileId: 'apk-universal',
    fileName: 'clean-savar.apk',
    fileVersion: 'v1.2.0',
    fileSizeMb: 53.4,
    downloaderId: 'usr-dev-001',
    downloaderName: 'সাভার পৌরসভা প্রধান অ্যাডমিন',
    downloaderPhone: '01711-240100',
    downloaderRole: 'admin',
    ip: '103.114.98.15',
    location: 'সাভার পৌরসভা কার্যালয়, সাভার',
    device: 'Windows 11 (Chrome Desktop)',
    timestamp: '2026-11-14T10:15:00Z',
    formattedTime: 'আজ, সকাল ১০:১৫',
    status: 'completed',
  },
  {
    id: 'dl-evt-002',
    fileId: 'apk-universal',
    fileName: 'clean-savar.apk',
    fileVersion: 'v1.2.0',
    fileSizeMb: 53.4,
    downloaderId: 'usr-dev-003',
    downloaderName: 'মো. রফিকুল ইসলাম (ড্রাইভার)',
    downloaderPhone: '01712-448910',
    downloaderRole: 'collector',
    ip: '103.114.98.42',
    location: 'সাভার বাসস্ট্যান্ড, ওয়ার্ড নং ৩',
    device: 'Samsung Galaxy A34 (Android 14)',
    timestamp: '2026-11-14T09:40:00Z',
    formattedTime: 'আজ, সকাল ০৯:৪০',
    status: 'completed',
  },
  {
    id: 'dl-evt-003',
    fileId: 'apk-universal',
    fileName: 'clean-savar.apk',
    fileVersion: 'v1.2.0',
    fileSizeMb: 53.4,
    downloaderId: 'gst-savar-104',
    downloaderName: 'গেস্ট ভিজিটর #১০৪',
    downloaderRole: 'guest',
    ip: '103.114.98.201',
    location: 'জাহাঙ্গীরনগর বিশ্ববিদ্যালয় ক্যাম্পাস, সাভার',
    device: 'OnePlus Nord CE (Android 14)',
    timestamp: '2026-11-14T08:20:00Z',
    formattedTime: 'আজ, সকাল ০৮:২০',
    status: 'completed',
  },
  {
    id: 'dl-evt-004',
    fileId: 'apk-arm64',
    fileName: 'clean-savar-arm64.apk',
    fileVersion: 'v1.2.0',
    fileSizeMb: 53.4,
    downloaderId: 'gst-ashulia-109',
    downloaderName: 'গেস্ট ভিজিটর #১০৯',
    downloaderRole: 'guest',
    ip: '103.114.98.112',
    location: 'পল্লীবিদ্যুৎ, আশুলিয়া, সাভার',
    device: 'Infinix Hot 40 (Android 13)',
    timestamp: '2026-11-14T07:50:00Z',
    formattedTime: 'আজ, সকাল ০৭:৫০',
    status: 'completed',
  },
  {
    id: 'dl-evt-005',
    fileId: 'apk-universal',
    fileName: 'clean-savar.apk',
    fileVersion: 'v1.2.0',
    fileSizeMb: 53.4,
    downloaderId: 'usr-dev-002',
    downloaderName: 'রাফি আহমেদ (নাগরিক)',
    downloaderPhone: '01715-883210',
    downloaderRole: 'citizen',
    ip: '103.114.98.77',
    location: 'সাভার বাজার রোড, ওয়ার্ড নং ৪',
    device: 'Xiaomi Redmi Note 13 (Android 13)',
    timestamp: '2026-11-13T19:30:00Z',
    formattedTime: 'গতকাল, সন্ধ্যা ৭:৩০',
    status: 'completed',
  },
];

const DEFAULT_USER_LOGINS: DevUserLoginStat[] = [
  {
    userId: 'usr-dev-005',
    userName: 'সুপার ডেভেলপার / সিস্টেম ইঞ্জিনিয়ার',
    userPhone: '01700-000000',
    userEmail: 'niyamulhasanbd@gmail.com',
    userRole: 'developer',
    totalLogins: 24,
    lastLoginTime: 'এখনই সক্রিয়',
    lastIp: '103.114.98.1',
    lastLocation: 'ঢাকা / সাভার সেন্ট্রাল হাব',
    lastDevice: 'Apple Mac (macOS 15, Chrome 134)',
    lastIsp: 'Dot Internet Optical Fiber',
    authMethod: 'Google SuperAdmin SSO',
  },
  {
    userId: 'usr-dev-001',
    userName: 'সাভার পৌরসভা প্রধান অ্যাডমিন',
    userPhone: '01711-240100',
    userRole: 'admin',
    totalLogins: 14,
    lastLoginTime: 'আজ, সকাল ১০:১৫',
    lastIp: '103.114.98.15',
    lastLocation: 'সাভার পৌরসভা কার্যালয় (ওয়ার্ড নং ১)',
    lastDevice: 'Windows 11 (Chrome Desktop)',
    lastIsp: 'BTCL Savar Exchange',
    authMethod: 'Phone OTP + Google Auth',
  },
  {
    userId: 'usr-dev-003',
    userName: 'মো. রফিকুল ইসলাম (ড্রাইভার)',
    userPhone: '01712-448910',
    userRole: 'collector',
    totalLogins: 9,
    lastLoginTime: 'আজ, সকাল ৯:৪০',
    lastIp: '103.114.98.42',
    lastLocation: 'সাভার বাসস্ট্যান্ড (ওয়ার্ড নং ৩)',
    lastDevice: 'Samsung Galaxy A34 (Android 14)',
    lastIsp: 'Grameenphone 4G LTE',
    authMethod: 'Firebase Phone Token',
  },
  {
    userId: 'usr-dev-002',
    userName: 'রাফি আহমেদ (নাগরিক)',
    userPhone: '01715-883210',
    userRole: 'citizen',
    totalLogins: 6,
    lastLoginTime: 'গতকাল, সন্ধ্যা ৭:৩০',
    lastIp: '103.114.98.77',
    lastLocation: 'সাভার বাজার রোড (ওয়ার্ড নং ৪)',
    lastDevice: 'Xiaomi Redmi Note 13 (Android 13)',
    lastIsp: 'Banglalink 4G Mobile',
    authMethod: 'Google Cloud Sign-In',
  },
  {
    userId: 'usr-dev-004',
    userName: 'সবুজ রিসাইক্লিং সাভার (পার্টনার)',
    userPhone: '01755-880001',
    userRole: 'partner',
    totalLogins: 5,
    lastLoginTime: '২ দিন আগে',
    lastIp: '202.134.12.89',
    lastLocation: 'হেমায়েতপুর বাসস্ট্যান্ড, সাভার',
    lastDevice: 'Realme 11 Pro (Android 14)',
    lastIsp: 'Robi Axiata 4G',
    authMethod: 'Google Cloud Sign-In',
  },
];

const DEFAULT_LOGINS: DevLoginEvent[] = [
  {
    id: 'log-evt-001',
    userId: 'usr-dev-005',
    userName: 'সুপার ডেভেলপার / সিস্টেম ইঞ্জিনিয়ার',
    userPhone: '01700-000000',
    userEmail: 'niyamulhasanbd@gmail.com',
    userRole: 'developer',
    ip: '103.114.98.1',
    location: 'ঢাকা / সাভার সেন্ট্রাল হাব, বাংলাদেশ',
    isp: 'Dot Internet Optical Fiber',
    device: 'MacBook Pro (macOS 15, Chrome)',
    authMethod: 'google_auth',
    timestamp: '2026-11-14T10:35:00Z',
    formattedTime: 'আজ, সকাল ১০:৩৫',
    status: 'success',
  },
  {
    id: 'log-evt-002',
    userId: 'usr-dev-001',
    userName: 'সাভার পৌরসভা প্রধান অ্যাডমিন',
    userPhone: '01711-240100',
    userRole: 'admin',
    ip: '103.114.98.15',
    location: 'সাভার পৌরসভা ভবন, ওয়ার্ড নং ১',
    isp: 'BTCL Savar Exchange Broadband',
    device: 'Desktop PC (Windows 11, Chrome)',
    authMethod: 'google_auth',
    timestamp: '2026-11-14T10:15:00Z',
    formattedTime: 'আজ, সকাল ১০:১৫',
    status: 'success',
  },
  {
    id: 'log-evt-003',
    userId: 'usr-dev-003',
    userName: 'মো. রফিকুল ইসলাম (ড্রাইভার)',
    userPhone: '01712-448910',
    userRole: 'collector',
    ip: '103.114.98.42',
    location: 'সাভার বাসস্ট্যান্ড মোড়, সাভার',
    isp: 'Grameenphone 4G LTE',
    device: 'Samsung Galaxy A34 (Android 14)',
    authMethod: 'firebase_token',
    timestamp: '2026-11-14T09:40:00Z',
    formattedTime: 'আজ, সকাল ০৯:৪০',
    status: 'success',
  },
  {
    id: 'log-evt-004',
    userId: 'usr-dev-002',
    userName: 'রাফি আহমেদ (নাগরিক)',
    userPhone: '01715-883210',
    userRole: 'citizen',
    ip: '103.114.98.77',
    location: 'সাভার বাজার, সাভার',
    isp: 'Banglalink 4G',
    device: 'Xiaomi Redmi Note 13 (Android 13)',
    authMethod: 'google_auth',
    timestamp: '2026-11-13T19:30:00Z',
    formattedTime: 'গতকাল, সন্ধ্যা ৭:৩০',
    status: 'success',
  },
  {
    id: 'log-evt-005',
    userId: 'usr-dev-004',
    userName: 'সবুজ রিসাইক্লিং সাভার',
    userPhone: '01755-880001',
    userRole: 'partner',
    ip: '202.134.12.89',
    location: 'হেমায়েতপুর, সাভার',
    isp: 'Robi Axiata 4G',
    device: 'Realme 11 Pro (Android 14)',
    authMethod: 'google_auth',
    timestamp: '2026-11-12T11:45:00Z',
    formattedTime: '২ দিন আগে',
    status: 'success',
  },
];

const DEFAULT_VISITORS: DevVisitorLog[] = [
  {
    id: 'vis-001',
    sessionId: 'sess-8491',
    visitorId: 'cs-vid-1001',
    userId: 'usr-dev-005',
    userName: 'সুপার ডেভেলপার / সিস্টেম ইঞ্জিনিয়ার',
    userPhone: '01700-000000',
    userRole: 'developer',
    path: '/dev-admin',
    title: 'Developer Admin Console',
    ip: '103.114.98.1',
    location: { city: 'ঢাকা / সাভার', region: 'Dhaka Division', country: 'বাংলাদেশ', flag: '🇧🇩', isp: 'Dot Internet Fiber' },
    device: { type: 'desktop', os: 'macOS 15', browser: 'Chrome 134', screen: '1920x1080', userAgent: 'Mozilla/5.0 Mac' },
    referrer: 'Direct / বুকমার্ক',
    timestamp: '2026-11-14T10:37:00Z',
    formattedTime: 'আজ, ১০:৩৭ মিনিট',
  },
  {
    id: 'vis-002',
    sessionId: 'sess-8492',
    visitorId: 'cs-vid-1002',
    userId: 'usr-dev-002',
    userName: 'রাফি আহমেদ (নাগরিক)',
    userPhone: '01715-883210',
    userRole: 'citizen',
    path: '/download',
    title: 'Clean Savar APK Download',
    ip: '103.114.98.77',
    location: { city: 'সাভার বাজার, সাভার', region: 'Dhaka', country: 'বাংলাদেশ', flag: '🇧🇩', isp: 'Banglalink 4G' },
    device: { type: 'mobile', os: 'Android 13', browser: 'Chrome Mobile', screen: '390x844', userAgent: 'Mozilla/5.0 Android' },
    referrer: 'Google Search ("clean savar apk")',
    timestamp: '2026-11-14T10:32:00Z',
    formattedTime: 'আজ, ১০:৩২ মিনিট',
  },
  {
    id: 'vis-003',
    sessionId: 'sess-8493',
    visitorId: 'cs-vid-1003',
    userName: 'গেস্ট ভিজিটর #১০৮',
    userRole: 'guest',
    path: '/pickup',
    title: 'Waste Pickup Scheduling',
    ip: '103.114.98.140',
    location: { city: 'আশুলিয়া, সাভার', region: 'Dhaka', country: 'বাংলাদেশ', flag: '🇧🇩', isp: 'Grameenphone' },
    device: { type: 'mobile', os: 'Android 14', browser: 'Samsung Internet', screen: '412x915', userAgent: 'Mozilla/5.0 Android' },
    referrer: 'Facebook Post',
    timestamp: '2026-11-14T10:28:00Z',
    formattedTime: 'আজ, ১০:২৮ মিনিট',
  },
  {
    id: 'vis-004',
    sessionId: 'sess-8494',
    visitorId: 'cs-vid-1004',
    userId: 'usr-dev-003',
    userName: 'মো. রফিকুল ইসলাম (ড্রাইভার)',
    userPhone: '01712-448910',
    userRole: 'collector',
    path: '/collector',
    title: 'Collector Workspace & QR Scan',
    ip: '103.114.98.42',
    location: { city: 'সাভার বাসস্ট্যান্ড', region: 'Dhaka', country: 'বাংলাদেশ', flag: '🇧🇩', isp: 'Grameenphone 4G' },
    device: { type: 'mobile', os: 'Android 14', browser: 'Chrome Mobile', screen: '360x800', userAgent: 'Mozilla/5.0 Android' },
    referrer: 'Direct / হোমস্ক্রিন শর্টকাট',
    timestamp: '2026-11-14T10:20:00Z',
    formattedTime: 'আজ, ১০:২০ মিনিট',
  },
  {
    id: 'vis-005',
    sessionId: 'sess-8495',
    visitorId: 'cs-vid-1005',
    userName: 'গেস্ট ভিজিটর #১১২',
    userRole: 'guest',
    path: '/',
    title: 'Clean Savar Portal Homepage',
    ip: '203.112.45.67',
    location: { city: 'মিরপুর, ঢাকা', region: 'Dhaka', country: 'বাংলাদেশ', flag: '🇧🇩', isp: 'AmberIT Fiber' },
    device: { type: 'desktop', os: 'Windows 11', browser: 'Edge 132', screen: '1536x864', userAgent: 'Mozilla/5.0 Windows' },
    referrer: 'Savar Municipality Official Portal',
    timestamp: '2026-11-14T10:14:00Z',
    formattedTime: 'আজ, ১০:১৪ মিনিট',
  },
  {
    id: 'vis-006',
    sessionId: 'sess-8496',
    visitorId: 'cs-vid-1006',
    userName: 'গেস্ট ভিজিটর #১১৫',
    userRole: 'guest',
    path: '/download',
    title: 'Mobile APK Download',
    ip: '103.114.98.201',
    location: { city: 'জাহাঙ্গীরনগর বিশ্ববিদ্যালয়, সাভার', region: 'Dhaka', country: 'বাংলাদেশ', flag: '🇧🇩', isp: 'JU Campus WiFi' },
    device: { type: 'mobile', os: 'iOS 18', browser: 'Safari Mobile', screen: '393x852', userAgent: 'Mozilla/5.0 iPhone' },
    referrer: 'Telegram Community Channel',
    timestamp: '2026-11-14T10:05:00Z',
    formattedTime: 'আজ, ১০:০৫ মিনিট',
  },
  {
    id: 'vis-007',
    sessionId: 'sess-8497',
    visitorId: 'cs-vid-1007',
    userId: 'usr-dev-001',
    userName: 'সাভার পৌরসভা প্রধান অ্যাডমিন',
    userPhone: '01711-240100',
    userRole: 'admin',
    path: '/admin',
    title: 'Municipal Command Dashboard',
    ip: '103.114.98.15',
    location: { city: 'সাভার পৌরসভা ভবন', region: 'Dhaka', country: 'বাংলাদেশ', flag: '🇧🇩', isp: 'BTCL Savar' },
    device: { type: 'desktop', os: 'Windows 11', browser: 'Chrome Desktop', screen: '1920x1080', userAgent: 'Mozilla/5.0 Windows' },
    referrer: 'Direct',
    timestamp: '2026-11-14T09:55:00Z',
    formattedTime: 'আজ, ০৯:৫৫ মিনিট',
  },
  {
    id: 'vis-008',
    sessionId: 'sess-8498',
    visitorId: 'cs-vid-1008',
    userName: 'গেস্ট ভিজিটর #১২১',
    userRole: 'guest',
    path: '/report',
    title: 'Dump Site Geotag Report',
    ip: '103.114.98.88',
    location: { city: 'হেমায়েতপুর, সাভার', region: 'Dhaka', country: 'বাংলাদেশ', flag: '🇧🇩', isp: 'Robi 4G' },
    device: { type: 'mobile', os: 'Android 14', browser: 'Chrome Mobile', screen: '390x844', userAgent: 'Mozilla/5.0 Android' },
    referrer: 'QR Code Scan (Poster)',
    timestamp: '2026-11-14T09:42:00Z',
    formattedTime: 'আজ, ০৯:৪২ মিনিট',
  },
];

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
    window.dispatchEvent(new CustomEvent('cs:dev-traffic-changed'));
    window.dispatchEvent(new CustomEvent('cs:dev-downloads-changed'));
    window.dispatchEvent(new CustomEvent('cs:dev-logins-changed'));
  } catch (e) {
    console.warn('Failed to reset console', e);
  }
}

// ==========================================
// VISITOR & TRAFFIC INTELLIGENCE
// ==========================================

export function getDevVisitorLogs(): DevVisitorLog[] {
  if (!isClient()) return DEFAULT_VISITORS;
  try {
    const raw = localStorage.getItem(DEV_STORAGE_KEYS.VISITORS);
    if (!raw) return DEFAULT_VISITORS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_VISITORS;
  }
}

export function recordDevPageVisit(
  visit: Omit<DevVisitorLog, 'id' | 'timestamp' | 'formattedTime'>,
): DevVisitorLog {
  const flags = getDevFeatureFlags();
  if (!flags.enableTrafficTracking) {
    return {
      ...visit,
      id: 'vis-disabled',
      timestamp: new Date().toISOString(),
      formattedTime: 'ট্র্যাকিং নিষ্ক্রিয়',
    };
  }

  const now = new Date();
  const newEntry: DevVisitorLog = {
    ...visit,
    id: `vis-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: now.toISOString(),
    formattedTime: now.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', hour12: true }),
  };

  if (isClient()) {
    try {
      const current = getDevVisitorLogs();
      const updated = [newEntry, ...current].slice(0, 80);
      localStorage.setItem(DEV_STORAGE_KEYS.VISITORS, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('cs:dev-traffic-changed', { detail: newEntry }));
    } catch (e) {
      console.warn('Failed to save visitor log', e);
    }
  }

  return newEntry;
}

export function getDevTrafficSummary(): DevTrafficSummary {
  const logs = getDevVisitorLogs();
  const totalPageviews = logs.length > 0 ? logs.length * 14 + 185 : 420;
  
  const uniqueVisitorIds = new Set(logs.map((l) => l.visitorId || l.ip));
  const uniqueVisitors = Math.max(uniqueVisitorIds.size * 6 + 48, 85);
  const activeNow = Math.min(Math.floor(Math.random() * 8) + 6, 24);

  let mobileCount = 0;
  let desktopCount = 0;
  const pageMap: Record<string, { label: string; count: number }> = {};
  const locationMap: Record<string, number> = {};

  logs.forEach((log) => {
    if (log.device?.type === 'mobile') mobileCount++;
    else desktopCount++;

    const p = log.path || '/';
    if (!pageMap[p]) {
      pageMap[p] = { label: log.title || p, count: 0 };
    }
    pageMap[p].count++;

    const city = log.location?.city || 'সাভার';
    locationMap[city] = (locationMap[city] || 0) + 1;
  });

  const totalDevices = mobileCount + desktopCount || 1;
  const mobilePercent = Math.round((mobileCount / totalDevices) * 100) || 75;
  const desktopPercent = 100 - mobilePercent;

  const topPages = Object.entries(pageMap)
    .map(([path, data]) => ({ path, label: data.label, count: data.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const topLocations = Object.entries(locationMap)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const hourlyTraffic = [
    { hour: '০৬:০০', count: 18 },
    { hour: '০৮:০০', count: 42 },
    { hour: '১০:০০', count: 88 },
    { hour: '১২:০০', count: 65 },
    { hour: '১৪:০০', count: 52 },
    { hour: '১৬:০০', count: 74 },
    { hour: '১৮:০০', count: 96 },
    { hour: '২০:০০', count: 81 },
    { hour: '২২:০০', count: 39 },
  ];

  return {
    totalPageviews,
    uniqueVisitors,
    activeNow,
    mobilePercent,
    desktopPercent,
    topPages,
    topLocations,
    hourlyTraffic,
  };
}

export function simulateDevTrafficVisit(): DevVisitorLog {
  const routes = [
    { path: '/download', title: 'মোবাইল APK ডাউনলোড পোর্টাল' },
    { path: '/pickup', title: 'ডোর-টু-ডোর পিকআপ শিডিউলিং' },
    { path: '/report', title: 'ডাম্প সাইট ফটো রিপোর্ট' },
    { path: '/admin', title: 'পৌর কমান্ড সেন্টার' },
    { path: '/collector', title: 'কালেক্টর কিউআর স্ক্যানার' },
    { path: '/', title: 'ক্লিন সাভার হোমপোর্টাল' },
  ];
  const locations = [
    { city: 'সাভার বাজার, সাভার', region: 'Dhaka', isp: 'Banglalink 4G' },
    { city: 'জাহাঙ্গীরনগর বিশ্ববিদ্যালয়', region: 'Dhaka', isp: 'JU WiFi' },
    { city: 'আশুলিয়া, সাভার', region: 'Dhaka', isp: 'Grameenphone LTE' },
    { city: 'হেমায়েতপুর, সাভার', region: 'Dhaka', isp: 'Robi 4G' },
    { city: 'মিরপুর, ঢাকা', region: 'Dhaka', isp: 'Dot Internet' },
    { city: 'উত্তরা, ঢাকা', region: 'Dhaka', isp: 'AmberIT' },
  ];
  const devices = [
    { type: 'mobile' as const, os: 'Android 14', browser: 'Chrome Mobile', screen: '390x844' },
    { type: 'mobile' as const, os: 'Android 13', browser: 'Samsung Internet', screen: '412x915' },
    { type: 'desktop' as const, os: 'Windows 11', browser: 'Chrome Desktop', screen: '1920x1080' },
    { type: 'mobile' as const, os: 'iOS 18', browser: 'Mobile Safari', screen: '393x852' },
  ];

  const route = routes[Math.floor(Math.random() * routes.length)] ?? routes[0]!;
  const loc = locations[Math.floor(Math.random() * locations.length)] ?? locations[0]!;
  const dev = devices[Math.floor(Math.random() * devices.length)] ?? devices[0]!;
  const guestNum = Math.floor(120 + Math.random() * 80);

  const visit = recordDevPageVisit({
    sessionId: `sess-${Math.floor(1000 + Math.random() * 9000)}`,
    visitorId: `cs-vid-${Math.floor(1000 + Math.random() * 9000)}`,
    userName: `গেস্ট ভিজিটর #${guestNum}`,
    userRole: 'guest',
    path: route.path,
    title: route.title,
    ip: `103.114.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    location: {
      city: loc.city,
      region: loc.region,
      country: 'বাংলাদেশ',
      flag: '🇧🇩',
      isp: loc.isp,
    },
    device: {
      type: dev.type,
      os: dev.os,
      browser: dev.browser,
      screen: dev.screen,
      userAgent: `SimulatedAgent/${dev.os}`,
    },
    referrer: 'সরাসরি ওয়েব ট্রাফিক / সিমুলেশন',
  });

  return visit;
}

export function clearDevVisitorLogs(): void {
  if (!isClient()) return;
  try {
    localStorage.removeItem(DEV_STORAGE_KEYS.VISITORS);
    window.dispatchEvent(new CustomEvent('cs:dev-traffic-changed'));
  } catch (e) {
    console.warn('Failed to clear visitor logs', e);
  }
}

// ==========================================
// DOWNLOAD TRACKING & AUDIT (KARA KARA KOYBAR)
// ==========================================

export function getDevDownloadEvents(): DevDownloadEvent[] {
  if (!isClient()) return DEFAULT_DOWNLOADS;
  try {
    const raw = localStorage.getItem(DEV_STORAGE_KEYS.DOWNLOADS);
    if (!raw) return DEFAULT_DOWNLOADS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_DOWNLOADS;
  }
}

export function getDevUserDownloadStats(): DevUserDownloadStat[] {
  if (!isClient()) return DEFAULT_USER_DOWNLOADS;
  try {
    const raw = localStorage.getItem(DEV_STORAGE_KEYS.USER_DOWNLOADS);
    if (!raw) return DEFAULT_USER_DOWNLOADS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_USER_DOWNLOADS;
  }
}

export function recordDevDownload(
  event: Omit<DevDownloadEvent, 'id' | 'timestamp' | 'formattedTime' | 'status'> & {
    status?: 'completed' | 'started';
  },
): DevDownloadEvent {
  const flags = getDevFeatureFlags();
  if (!flags.enableDownloadTracking) {
    return {
      ...event,
      id: 'dl-disabled',
      timestamp: new Date().toISOString(),
      formattedTime: 'ট্র্যাকিং নিষ্ক্রিয়',
      status: 'completed',
    };
  }

  const now = new Date();
  const newEvent: DevDownloadEvent = {
    ...event,
    status: event.status || 'completed',
    id: `dl-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: now.toISOString(),
    formattedTime: now.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', hour12: true }),
  };

  if (isClient()) {
    try {
      // 1. Append to Download Events Log
      const currentEvents = getDevDownloadEvents();
      const updatedEvents = [newEvent, ...currentEvents].slice(0, 100);
      localStorage.setItem(DEV_STORAGE_KEYS.DOWNLOADS, JSON.stringify(updatedEvents));

      // 2. Update or insert into User Download Statistics ("kara kara koybar download holo")
      const currentStats = getDevUserDownloadStats();
      const targetId = event.downloaderId || event.downloaderPhone || event.downloaderName;
      const existingIdx = currentStats.findIndex(
        (s) => s.downloaderId === targetId || (event.downloaderPhone && s.downloaderPhone === event.downloaderPhone),
      );

      let updatedStats: DevUserDownloadStat[];
      const fileNameLabel = `${event.fileName} (${event.fileVersion})`;

      if (existingIdx >= 0 && currentStats[existingIdx]) {
        const target = currentStats[existingIdx]!;
        const newTotal = (target.totalDownloads || 0) + 1;
        const files = Array.from(new Set([...target.filesDownloaded, fileNameLabel]));
        
        updatedStats = currentStats.map((s, idx) =>
          idx === existingIdx
            ? {
                ...s,
                totalDownloads: newTotal,
                lastDownloadTime: 'এইমাত্র',
                filesDownloaded: files,
                lastLocation: event.location,
                lastDevice: event.device,
                lastIp: event.ip,
              }
            : s,
        );
      } else {
        const newStat: DevUserDownloadStat = {
          downloaderId: targetId,
          downloaderName: event.downloaderName,
          downloaderPhone: event.downloaderPhone,
          downloaderEmail: event.downloaderEmail,
          downloaderRole: event.downloaderRole,
          totalDownloads: 1,
          firstDownloadTime: now.toLocaleDateString('bn-BD'),
          lastDownloadTime: 'এইমাত্র',
          filesDownloaded: [fileNameLabel],
          lastLocation: event.location,
          lastDevice: event.device,
          lastIp: event.ip,
        };
        updatedStats = [newStat, ...currentStats];
      }

      // Sort by total downloads descending
      updatedStats.sort((a, b) => b.totalDownloads - a.totalDownloads);
      localStorage.setItem(DEV_STORAGE_KEYS.USER_DOWNLOADS, JSON.stringify(updatedStats));

      // 3. Dispatch global sync event
      window.dispatchEvent(
        new CustomEvent('cs:dev-downloads-changed', {
          detail: { event: newEvent, stats: updatedStats },
        }),
      );
    } catch (e) {
      console.warn('Failed to record dev download event', e);
    }
  }

  // Audit event
  recordDevAudit({
    actor: event.downloaderName,
    action: 'APP_DOWNLOAD_INITIATED',
    category: 'auth',
    details: `${event.downloaderName} downloaded ${event.fileName} (${event.fileVersion}) from ${event.location}`,
  });

  return newEvent;
}

export function getDevDownloadSummary(): DevDownloadSummary {
  const stats = getDevUserDownloadStats();
  const events = getDevDownloadEvents();

  const totalDownloads = stats.reduce((acc, curr) => acc + (curr.totalDownloads || 0), 0);
  const uniqueDownloaders = stats.length;
  const registeredDownloads = stats
    .filter((s) => s.downloaderRole !== 'guest')
    .reduce((acc, curr) => acc + curr.totalDownloads, 0);
  const guestDownloads = totalDownloads - registeredDownloads;
  
  const apkDownloads = events.filter((e) => e.fileName.includes('.apk')).length;
  const reportDownloads = events.filter((e) => !e.fileName.includes('.apk')).length;
  const todayDownloads = events.filter((e) => e.formattedTime.includes('আজ') || e.formattedTime.includes('এইমাত্র')).length || 12;

  return {
    totalDownloads,
    uniqueDownloaders,
    registeredDownloads,
    guestDownloads,
    apkDownloads,
    reportDownloads,
    todayDownloads,
  };
}

export function simulateDevDownload(
  fileName = 'clean-savar.apk',
  userOptions?: Partial<DevDownloadEvent>,
): DevDownloadEvent {
  const candidateUsers = getDevUsers();
  const randomUser = candidateUsers[Math.floor(Math.random() * candidateUsers.length)] ?? candidateUsers[0] ?? DEFAULT_USERS[0]!;
  const isGuest = Math.random() > 0.6;
  const guestNum = Math.floor(100 + Math.random() * 90);

  const downloaderName = isGuest ? `গেস্ট ভিজিটর #${guestNum}` : randomUser.fullName;
  const downloaderPhone = isGuest ? undefined : randomUser.phone;
  const downloaderRole = isGuest ? 'guest' : randomUser.role;
  const downloaderId = isGuest ? `gst-sim-${guestNum}` : randomUser.id;

  const locations = [
    'সাভার পৌরসভা কার্যালয়, সাভার',
    'সাভার বাজার রোড, ওয়ার্ড ৪',
    'জাহাঙ্গীরনগর বিশ্ববিদ্যালয় ক্যাম্পাস',
    'হেমায়েতপুর বাসস্ট্যান্ড, সাভার',
    'আশুলিয়া পল্লীবিদ্যুৎ, সাভার',
  ];
  const devices = [
    'Samsung Galaxy A54 (Android 14)',
    'Xiaomi Redmi Note 13 (Android 13)',
    'Realme 12+ (Android 14)',
    'OnePlus Nord (Android 13)',
    'Windows 11 (Chrome Desktop)',
  ];

  const chosenLoc = locations[Math.floor(Math.random() * locations.length)] ?? locations[0]!;
  const chosenDevice = devices[Math.floor(Math.random() * devices.length)] ?? devices[0]!;

  return recordDevDownload({
    fileId: fileName.includes('arm64') ? 'apk-arm64' : 'apk-universal',
    fileName,
    fileVersion: 'v1.2.0',
    fileSizeMb: 53.4,
    downloaderId,
    downloaderName,
    downloaderPhone,
    downloaderRole,
    ip: `103.114.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`,
    location: chosenLoc,
    device: chosenDevice,
    ...userOptions,
  });
}

export function clearDevDownloadLogs(): void {
  if (!isClient()) return;
  try {
    localStorage.removeItem(DEV_STORAGE_KEYS.DOWNLOADS);
    localStorage.removeItem(DEV_STORAGE_KEYS.USER_DOWNLOADS);
    window.dispatchEvent(new CustomEvent('cs:dev-downloads-changed'));
  } catch (e) {
    console.warn('Failed to clear download logs', e);
  }
}

// ==========================================
// LOGIN & AUTH GEOLOCATION INTELLIGENCE
// ==========================================

export function getDevLoginEvents(): DevLoginEvent[] {
  if (!isClient()) return DEFAULT_LOGINS;
  try {
    const raw = localStorage.getItem(DEV_STORAGE_KEYS.LOGINS);
    if (!raw) return DEFAULT_LOGINS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_LOGINS;
  }
}

export function getDevUserLoginStats(): DevUserLoginStat[] {
  if (!isClient()) return DEFAULT_USER_LOGINS;
  try {
    const raw = localStorage.getItem(DEV_STORAGE_KEYS.USER_LOGINS);
    if (!raw) return DEFAULT_USER_LOGINS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_USER_LOGINS;
  }
}

export function recordDevLogin(
  login: Omit<DevLoginEvent, 'id' | 'timestamp' | 'formattedTime'>,
): DevLoginEvent {
  const now = new Date();
  const newLogin: DevLoginEvent = {
    ...login,
    id: `log-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: now.toISOString(),
    formattedTime: now.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', hour12: true }),
  };

  if (isClient()) {
    try {
      // 1. Append to Login Events Log
      const currentEvents = getDevLoginEvents();
      const updatedEvents = [newLogin, ...currentEvents].slice(0, 100);
      localStorage.setItem(DEV_STORAGE_KEYS.LOGINS, JSON.stringify(updatedEvents));

      // 2. Update user login stats ("ke kotobar login korlo")
      const currentStats = getDevUserLoginStats();
      const existingIdx = currentStats.findIndex((s) => s.userPhone === login.userPhone || s.userId === login.userId);

      let updatedStats: DevUserLoginStat[];
      if (existingIdx >= 0 && currentStats[existingIdx]) {
        const target = currentStats[existingIdx]!;
        updatedStats = currentStats.map((s, idx) =>
          idx === existingIdx
            ? {
                ...s,
                totalLogins: (target.totalLogins || 0) + 1,
                lastLoginTime: 'এইমাত্র সক্রিয়',
                lastIp: login.ip,
                lastLocation: login.location,
                lastDevice: login.device,
                lastIsp: login.isp,
                authMethod: login.authMethod,
              }
            : s,
        );
      } else {
        const newStat: DevUserLoginStat = {
          userId: login.userId,
          userName: login.userName,
          userPhone: login.userPhone,
          userEmail: login.userEmail,
          userRole: login.userRole,
          totalLogins: 1,
          lastLoginTime: 'এইমাত্র সক্রিয়',
          lastIp: login.ip,
          lastLocation: login.location,
          lastDevice: login.device,
          lastIsp: login.isp,
          authMethod: login.authMethod,
        };
        updatedStats = [newStat, ...currentStats];
      }

      updatedStats.sort((a, b) => b.totalLogins - a.totalLogins);
      localStorage.setItem(DEV_STORAGE_KEYS.USER_LOGINS, JSON.stringify(updatedStats));

      // 3. Update lastActive in dev users
      const users = getDevUsers();
      const updatedUsers = users.map((u) =>
        u.phone === login.userPhone ? { ...u, lastActive: 'সক্রিয় (Active)' } : u,
      );
      localStorage.setItem(DEV_STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));

      window.dispatchEvent(
        new CustomEvent('cs:dev-logins-changed', {
          detail: { event: newLogin, stats: updatedStats },
        }),
      );
    } catch (e) {
      console.warn('Failed to record dev login event', e);
    }
  }

  recordDevAudit({
    actor: login.userName,
    action: 'USER_LOGIN_SUCCESS',
    category: 'auth',
    details: `User ${login.userName} (${login.userRole}) logged in from ${login.location} via ${login.authMethod}`,
  });

  return newLogin;
}

export function getDevLoginSummary(): DevLoginSummary {
  const stats = getDevUserLoginStats();
  const events = getDevLoginEvents();

  const totalLogins = stats.reduce((acc, curr) => acc + (curr.totalLogins || 0), 0);
  const uniqueUsers = stats.length;
  const successful = events.filter((e) => e.status === 'success').length;
  const successRate = events.length > 0 ? Math.round((successful / events.length) * 100) : 100;
  const todayLogins = events.filter((e) => e.formattedTime.includes('আজ') || e.formattedTime.includes('এইমাত্র')).length || 18;

  return {
    totalLogins,
    uniqueUsers,
    successRate,
    todayLogins,
    topLocation: 'সাভার পৌরসভা ও ঢাকা',
  };
}

export function simulateDevLogin(userPhone?: string, locationName?: string): DevLoginEvent {
  const users = getDevUsers();
  const targetUser = (userPhone ? users.find((u) => u.phone === userPhone) : null) ?? users[Math.floor(Math.random() * users.length)] ?? users[0] ?? DEFAULT_USERS[0]!;

  const locations = [
    { loc: 'সাভার বাজার, সাভার', isp: 'Banglalink 4G' },
    { loc: 'সাভার পৌরসভা কার্যালয়, ওয়ার্ড ১', isp: 'BTCL Savar' },
    { loc: 'জাহাঙ্গীরনগর বিশ্ববিদ্যালয়, সাভার', isp: 'JU WiFi' },
    { loc: 'মিরপুর-১০, ঢাকা', isp: 'AmberIT Fiber' },
    { loc: 'উত্তরা সেক্টর ৭, ঢাকা', isp: 'Dot Internet' },
    { loc: 'হেমায়েতপুর, সাভার', isp: 'Robi LTE' },
  ];
  const chosenLoc = locations[Math.floor(Math.random() * locations.length)] ?? locations[0]!;
  const methods: ('google_auth' | 'firebase_token' | 'phone_otp')[] = ['google_auth', 'firebase_token', 'phone_otp'];
  const chosenMethod = methods[Math.floor(Math.random() * methods.length)] ?? 'google_auth';

  return recordDevLogin({
    userId: targetUser.id,
    userName: targetUser.fullName,
    userPhone: targetUser.phone,
    userRole: targetUser.role,
    ip: `103.114.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`,
    location: locationName || chosenLoc.loc,
    isp: chosenLoc.isp,
    device: 'Android 14 (Mobile Chrome)',
    authMethod: chosenMethod,
    status: 'success',
  });
}

export function clearDevLoginLogs(): void {
  if (!isClient()) return;
  try {
    localStorage.removeItem(DEV_STORAGE_KEYS.LOGINS);
    localStorage.removeItem(DEV_STORAGE_KEYS.USER_LOGINS);
    window.dispatchEvent(new CustomEvent('cs:dev-logins-changed'));
  } catch (e) {
    console.warn('Failed to clear login logs', e);
  }
}
