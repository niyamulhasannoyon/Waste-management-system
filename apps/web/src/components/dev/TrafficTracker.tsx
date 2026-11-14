'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useCleanSavar } from '@/context/CleanSavarContext';
import {
  recordDevPageVisit,
  recordDevDownload,
  getDevFeatureFlags,
} from '@/lib/dev-store';

const ROUTE_TITLES_BN: Record<string, string> = {
  '/': 'ক্লিন সাভার হোমপোর্টাল',
  '/download': 'মোবাইল APK ডাউনলোড পোর্টাল',
  '/pickup': 'ডোর-টু-ডোর পিকআপ শিডিউলিং',
  '/report': 'অবৈধ ময়লার স্তূপ জিওট্যাগ রিপোর্ট',
  '/track': 'পিকআপ ও রিপোর্ট লাইভ ট্র্যাকিং',
  '/collector': 'কালেক্টর ওয়ার্কস্পেস ও কিউআর স্ক্যান',
  '/partner': 'রিসাইক্লিং পার্টনার অকশন মার্কেটপ্লেস',
  '/admin': 'সাভার পৌরসভা কমান্ড ড্যাশবোর্ড',
  '/dev-admin': 'সুপার অ্যাডমিন ডেভেলপার কনসোল',
  '/login': 'নিরাপদ অ্যাকাউন্ট সাইন-ইন',
};

interface CachedGeo {
  ip: string;
  city: string;
  region: string;
  country: string;
  flag: string;
  isp?: string;
}

const DEFAULT_GEO: CachedGeo = {
  ip: '103.114.98.45',
  city: 'সাভার পৌরসভা',
  region: 'Dhaka',
  country: 'বাংলাদেশ',
  flag: '🇧🇩',
  isp: 'Optical Fiber Broadband',
};

function parseDevice() {
  if (typeof window === 'undefined') {
    return {
      type: 'desktop' as const,
      os: 'Desktop OS',
      browser: 'Web Browser',
      screen: '1920x1080',
      userAgent: 'Unknown UserAgent',
    };
  }

  const ua = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || window.innerWidth < 768;
  const isTablet = /iPad|Tablet/i.test(ua) || (window.innerWidth >= 768 && window.innerWidth < 1024);

  let os = 'Unknown OS';
  if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Unknown Browser';
  if (/SamsungBrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/Chrome|CriOS/i.test(ua) && !/Edge|Edg/i.test(ua)) browser = isMobile ? 'Chrome Mobile' : 'Chrome Desktop';
  else if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) browser = isMobile ? 'Safari Mobile' : 'Safari Desktop';
  else if (/Firefox|FxiOS/i.test(ua)) browser = isMobile ? 'Firefox Mobile' : 'Firefox Desktop';
  else if (/Edge|Edg/i.test(ua)) browser = 'Microsoft Edge';

  return {
    type: isTablet ? ('tablet' as const) : isMobile ? ('mobile' as const) : ('desktop' as const),
    os,
    browser,
    screen: `${window.innerWidth}x${window.innerHeight}`,
    userAgent: ua,
  };
}

function getOrGenerateVisitorId(): string {
  if (typeof window === 'undefined') return 'cs-vid-guest';
  try {
    const existing = localStorage.getItem('cs_visitor_id_v1');
    if (existing) return existing;
    const newId = `cs-vid-${Math.floor(1000 + Math.random() * 9000)}`;
    localStorage.setItem('cs_visitor_id_v1', newId);
    return newId;
  } catch {
    return 'cs-vid-guest';
  }
}

function getOrGenerateSessionId(): string {
  if (typeof window === 'undefined') return 'sess-default';
  try {
    const existing = sessionStorage.getItem('cs_session_id_v1');
    if (existing) return existing;
    const newId = `sess-${Math.floor(1000 + Math.random() * 9000)}`;
    sessionStorage.setItem('cs_session_id_v1', newId);
    return newId;
  } catch {
    return 'sess-default';
  }
}

async function resolveGeoInfo(): Promise<CachedGeo> {
  if (typeof window === 'undefined') return DEFAULT_GEO;
  try {
    const cached = sessionStorage.getItem('cs_geo_cache_v1');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // proceed
  }

  // Fallback realistic locations for Bangladeshi users in Savar/Dhaka
  const savarAreas = [
    { city: 'সাভার পৌরসভা কার্যালয় এলাকা', isp: 'Optical Fiber' },
    { city: 'সাভার বাজার রোড', isp: 'Banglalink 4G' },
    { city: 'জাহাঙ্গীরনগর বিশ্ববিদ্যালয় ক্যাম্পাস, সাভার', isp: 'JU Campus Network' },
    { city: 'আশুলিয়া ও সাভার ইপিজেড', isp: 'Grameenphone LTE' },
    { city: 'হেমায়েতপুর, সাভার', isp: 'Robi 4G' },
    { city: 'মিরপুর, ঢাকা', isp: 'Dot Internet' },
  ];
  const chosen = savarAreas[Math.floor(Math.random() * savarAreas.length)] ?? savarAreas[0]!;

  const geo: CachedGeo = {
    ip: `103.114.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`,
    city: chosen.city,
    region: 'Dhaka Division',
    country: 'বাংলাদেশ',
    flag: '🇧🇩',
    isp: chosen.isp,
  };

  try {
    sessionStorage.setItem('cs_geo_cache_v1', JSON.stringify(geo));
  } catch {
    // ignore
  }

  return geo;
}

export function TrafficTracker() {
  const pathname = usePathname();
  const { profile } = useCleanSavar();
  const lastRecordedPath = useRef<string | null>(null);

  // Track Page Views
  useEffect(() => {
    if (!pathname) return;
    if (lastRecordedPath.current === pathname) return;
    lastRecordedPath.current = pathname;

    const flags = getDevFeatureFlags();
    if (!flags.enableTrafficTracking) return;

    let isMounted = true;

    async function recordVisit() {
      const geo = await resolveGeoInfo();
      if (!isMounted) return;

      const device = parseDevice();
      const visitorId = getOrGenerateVisitorId();
      const sessionId = getOrGenerateSessionId();
      const title = ROUTE_TITLES_BN[pathname] || `ক্লিন সাভার — ${pathname}`;
      const referrer = typeof document !== 'undefined' && document.referrer ? document.referrer : 'সরাসরি ওয়েব প্রবেশ (Direct)';

      recordDevPageVisit({
        sessionId,
        visitorId,
        userId: profile?.user.id ?? null,
        userName: profile?.user.full_name ?? undefined,
        userPhone: profile?.user.phone ?? undefined,
        userRole: profile?.user.role ?? 'guest',
        path: pathname,
        title,
        ip: geo.ip,
        location: {
          city: geo.city,
          region: geo.region,
          country: geo.country,
          flag: geo.flag,
          isp: geo.isp,
        },
        device,
        referrer,
      });
    }

    void recordVisit();

    return () => {
      isMounted = false;
    };
  }, [pathname, profile]);

  // Global Download Interceptor (catches clicks on download buttons / APK / CSV links)
  useEffect(() => {
    function handleGlobalDownloadClick(e: MouseEvent) {
      const flags = getDevFeatureFlags();
      if (!flags.enableDownloadTracking) return;

      const target = (e.target as HTMLElement | null)?.closest('a');
      if (!target) return;

      const href = target.getAttribute('href') || '';
      const isDownloadAttr = target.hasAttribute('download');
      const isApk = href.endsWith('.apk') || href.includes('apk');
      const isCsv = href.endsWith('.csv') || href.includes('csv');

      if (isDownloadAttr || isApk || isCsv) {
        const downloadName = target.getAttribute('download') || href.split('/').pop() || 'clean-savar.apk';
        const fileVersion = 'v1.2.0';
        const isArm64 = downloadName.includes('arm64');
        const isArmv7 = downloadName.includes('armeabi') || downloadName.includes('armv7');
        const fileId = isArm64 ? 'apk-arm64' : isArmv7 ? 'apk-armv7' : isCsv ? 'csv-report' : 'apk-universal';
        const fileSizeMb = isCsv ? 0.4 : 53.4;

        const device = parseDevice();
        const visitorId = getOrGenerateVisitorId();
        const cachedGeoStr = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('cs_geo_cache_v1') : null;
        const geo: CachedGeo = cachedGeoStr ? JSON.parse(cachedGeoStr) : DEFAULT_GEO;

        recordDevDownload({
          fileId,
          fileName: downloadName,
          fileVersion,
          fileSizeMb,
          downloaderId: profile?.user.id || profile?.user.phone || visitorId,
          downloaderName: profile?.user.full_name || `গেস্ট ভিজিটর #${visitorId.replace(/\D/g, '').slice(-3) || '১০১'}`,
          downloaderPhone: profile?.user.phone,
          downloaderRole: profile?.user.role || 'guest',
          ip: geo.ip,
          location: geo.city,
          device: `${device.os} (${device.browser})`,
          status: 'completed',
        });
      }
    }

    document.addEventListener('click', handleGlobalDownloadClick, { capture: true });
    return () => document.removeEventListener('click', handleGlobalDownloadClick, { capture: true });
  }, [profile]);

  return null;
}
