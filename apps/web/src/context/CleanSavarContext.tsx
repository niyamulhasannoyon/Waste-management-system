'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ApiError,
  fetchMe,
  fetchNotifications,
  fetchPublicAnalytics,
  fetchPublicHotspots,
  fetchWards,
  logoutSession,
  markNotificationRead,
  readStoredSession,
  writeStoredSession,
} from '@/lib/api-client';
import { ANALYTICS_SEED, HOTSPOTS_SEED, SAVAR_WARDS_SEED } from '@/lib/savar-data';
import { recordDevLogin } from '@/lib/dev-store';
import type {
  AnalyticsSummary,
  AuthSession,
  AuthenticatedProfile,
  NotificationRecord,
  PublicHotspotRecord,
  WardSummary,
} from '@/lib/types';

interface CleanSavarContextValue {
  session: AuthSession | null;
  profile: AuthenticatedProfile | null;
  authReady: boolean;
  authModalOpen: boolean;
  authPromptReason: string | null;
  openAuthModal: (reasonBn?: string) => void;
  closeAuthModal: () => void;
  applyAuthSession: (session: AuthSession) => Promise<void>;
  logout: () => Promise<void>;

  wards: WardSummary[];
  publicAnalytics: AnalyticsSummary;
  publicHotspots: PublicHotspotRecord[];
  isOfflinePreview: boolean;
  isLoadingPublic: boolean;
  publicError: string | null;
  refreshPublicData: () => Promise<void>;

  notifications: NotificationRecord[];
  unreadNotificationCount: number;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;

  announcement: string;
  announce: (message: string) => void;
}

const CleanSavarContext = createContext<CleanSavarContextValue | null>(null);

export function CleanSavarProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authPromptReason, setAuthPromptReason] = useState<string | null>(null);

  const [wards, setWards] = useState<WardSummary[]>(SAVAR_WARDS_SEED);
  const [publicAnalytics, setPublicAnalytics] = useState<AnalyticsSummary>(ANALYTICS_SEED);
  const [publicHotspots, setPublicHotspots] = useState<PublicHotspotRecord[]>(HOTSPOTS_SEED);
  const [isOfflinePreview, setIsOfflinePreview] = useState<boolean>(false);
  const [isLoadingPublic, setIsLoadingPublic] = useState<boolean>(true);
  const [publicError, setPublicError] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [announcement, setAnnouncement] = useState<string>('');
  const announceTimerRef = useRef<number | null>(null);

  const announce = useCallback((message: string) => {
    setAnnouncement('');
    window.setTimeout(() => {
      setAnnouncement(message);
    }, 30);
    if (announceTimerRef.current !== null) {
      window.clearTimeout(announceTimerRef.current);
    }
    announceTimerRef.current = window.setTimeout(() => {
      setAnnouncement('');
    }, 6000);
  }, []);

  const refreshPublicData = useCallback(async () => {
    setIsLoadingPublic(true);
    setPublicError(null);
    try {
      const [wardsRes, analyticsRes, hotspotsRes] = await Promise.all([
        fetchWards(),
        fetchPublicAnalytics(),
        fetchPublicHotspots({ limit: 30 }),
      ]);
      setWards(wardsRes.data);
      setPublicAnalytics(analyticsRes.data);
      setPublicHotspots(hotspotsRes.data);
      setIsOfflinePreview(wardsRes.offline || analyticsRes.offline || hotspotsRes.offline);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.messageBn
          : 'সাভার এলাকার তথ্য লোড করা যায়নি।';
      setPublicError(message);
    } finally {
      setIsLoadingPublic(false);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    const active = readStoredSession();
    if (!active) {
      setNotifications([]);
      return;
    }
    try {
      const list = await fetchNotifications();
      setNotifications(list);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        console.error('Session verification rejected with 401 in refreshNotifications:', err);
        setSession(null);
        setNotifications([]);
      } else {
        console.warn('Notification sync background note (non-fatal):', err);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      const stored = readStoredSession();
      if (stored && active) {
        setSession(stored);
        try {
          const freshProfile = await fetchMe();
          if (active) {
            const updatedSession: AuthSession = { ...stored, profile: freshProfile };
            writeStoredSession(updatedSession);
            setSession(updatedSession);
          }
          const list = await fetchNotifications();
          if (active) setNotifications(list);
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            writeStoredSession(null);
            if (active) {
              setSession(null);
              setNotifications([]);
            }
          }
        }
      }
      if (active) {
        setAuthReady(true);
      }
      await refreshPublicData();
    }
    void bootstrap();
    return () => {
      active = false;
      if (announceTimerRef.current !== null) {
        window.clearTimeout(announceTimerRef.current);
      }
    };
  }, [refreshPublicData]);

  const openAuthModal = useCallback((reasonBn?: string) => {
    setAuthPromptReason(reasonBn ?? null);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    setAuthPromptReason(null);
  }, []);

  const applyAuthSession = useCallback(
    async (nextSession: AuthSession) => {
      writeStoredSession(nextSession);
      setSession(nextSession);
      setAuthModalOpen(false);
      setAuthPromptReason(null);
      announce(`${nextSession.profile.user.full_name} হিসেবে লগইন সম্পন্ন হয়েছে।`);

      // Track login in developer intelligence store
      try {
        const cachedGeoStr = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('cs_geo_cache_v1') : null;
        const geo = cachedGeoStr ? JSON.parse(cachedGeoStr) : { ip: '103.114.98.15', city: 'সাভার পৌরসভা', isp: 'Optical Fiber' };
        recordDevLogin({
          userId: nextSession.profile.user.id,
          userName: nextSession.profile.user.full_name,
          userPhone: nextSession.profile.user.phone,
          userRole: nextSession.profile.user.role,
          ip: geo.ip || '103.114.98.15',
          location: `${geo.city || 'সাভার পৌরসভা'}, বাংলাদেশ`,
          isp: geo.isp,
          device: typeof navigator !== 'undefined' ? (navigator.userAgent.includes('Mobile') ? 'Mobile Device (Chrome/Browser)' : 'Desktop Browser') : 'Web Client',
          authMethod: 'google_auth',
          status: 'success',
        });
      } catch (loginLogErr) {
        console.warn('Dev login logging note:', loginLogErr);
      }
      try {
        await Promise.all([refreshNotifications(), refreshPublicData()]);
      } catch (syncErr) {
        console.warn('Post-login background sync note:', syncErr);
      }
    },
    [announce, refreshNotifications, refreshPublicData],
  );

  const logout = useCallback(async () => {
    await logoutSession();
    setSession(null);
    setNotifications([]);
    announce('লগআউট সম্পন্ন হয়েছে।');
  }, [announce]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_read: true } : item)),
    );
    try {
      const updated = await markNotificationRead(id);
      if (updated && updated.id) {
        setNotifications((prev) =>
          prev.map((item) => (item.id === id ? updated : item)),
        );
      }
    } catch {
      // Keep UI responsive; next sync restores authoritative state if transient failure.
    }
  }, []);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications],
  );

  const value = useMemo<CleanSavarContextValue>(
    () => ({
      session,
      profile: session?.profile ?? null,
      authReady,
      authModalOpen,
      authPromptReason,
      openAuthModal,
      closeAuthModal,
      applyAuthSession,
      logout,
      wards,
      publicAnalytics,
      publicHotspots,
      isOfflinePreview,
      isLoadingPublic,
      publicError,
      refreshPublicData,
      notifications,
      unreadNotificationCount,
      refreshNotifications,
      markAsRead,
      announcement,
      announce,
    }),
    [
      session,
      authReady,
      authModalOpen,
      authPromptReason,
      openAuthModal,
      closeAuthModal,
      applyAuthSession,
      logout,
      wards,
      publicAnalytics,
      publicHotspots,
      isOfflinePreview,
      isLoadingPublic,
      publicError,
      refreshPublicData,
      notifications,
      unreadNotificationCount,
      refreshNotifications,
      markAsRead,
      announcement,
      announce,
    ],
  );

  return (
    <CleanSavarContext.Provider value={value}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </CleanSavarContext.Provider>
  );
}

export function useCleanSavar(): CleanSavarContextValue {
  const ctx = useContext(CleanSavarContext);
  if (!ctx) {
    throw new Error('useCleanSavar must be used within CleanSavarProvider');
  }
  return ctx;
}
