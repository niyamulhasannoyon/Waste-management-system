import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { SiteHeader } from '@/components/site-header';
import { HeroSection } from '@/components/HeroSection';
import { SubpageShell } from '@/components/SubpageShell';
import {
  checkRouteAccess,
  getNavItemsForUser,
  getUserCanonicalRole,
  isDeveloperUser,
  isPouroAdminUser,
  isCollectorUser,
  isPartnerUser,
  isCitizenUser,
  normalizeRole,
  shouldShowAdminPanelButton,
  shouldShowDevConsoleButton,
  shouldShowDownloadButton,
} from '@/lib/rbac';
import type { AuthSession, UserRecord } from '@/lib/types';
import { ANALYTICS_SEED, SAVAR_WARDS_SEED } from '@/lib/savar-data';

let mockPathname = '/';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(),
}));

let mockSession: AuthSession | null = null;
const mockOpenAuthModal = vi.fn();
const mockLogout = vi.fn();
const mockRefreshPublicData = vi.fn().mockResolvedValue(undefined);
const mockRefreshNotifications = vi.fn().mockResolvedValue(undefined);
const mockAnnounce = vi.fn();

vi.mock('@/context/CleanSavarContext', () => ({
  useCleanSavar: () => ({
    session: mockSession,
    profile: mockSession?.profile ?? null,
    authReady: true,
    authModalOpen: false,
    authPromptReason: null,
    openAuthModal: mockOpenAuthModal,
    closeAuthModal: vi.fn(),
    applyAuthSession: vi.fn(),
    logout: mockLogout,
    wards: SAVAR_WARDS_SEED,
    publicAnalytics: ANALYTICS_SEED,
    publicHotspots: [
      {
        id: 'hs-01',
        tracking_code: 'CS-DR-01088',
        ward_id: 3,
        ward_name_bn: 'ওয়ার্ড ০৩ — রেডিও কলোনি',
        title_bn: 'রেডিও কলোনি কাঁচাবাজারের পেছনে ময়লা জমে আছে',
        status: 'verified',
        severity: 'high',
        lat: 23.856,
        lng: 90.264,
        created_at: new Date().toISOString(),
      },
    ],
    isOfflinePreview: false,
    isLoadingPublic: false,
    publicError: null,
    refreshPublicData: mockRefreshPublicData,
    notifications: [],
    unreadNotificationCount: 0,
    refreshNotifications: mockRefreshNotifications,
    markAsRead: vi.fn(),
    announcement: '',
    announce: mockAnnounce,
  }),
}));

function makeSession(role: UserRecord['role'], email?: string | null): AuthSession {
  return {
    accessToken: 'tok-test',
    expiresAtIso: new Date(Date.now() + 3600_000).toISOString(),
    profile: {
      user: {
        id: 'user-id-01',
        phone: '01711-240100',
        full_name: `টেস্ট ইউজার (${role})`,
        email: email || null,
        role,
        ward_id: 3,
        is_verified: true,
        created_at: new Date().toISOString(),
      },
      vehicle_id: role === 'collector' || role === 'cleaner' ? 'v-01' : null,
      partner_id: role === 'partner' ? 'p-01' : null,
      partner_name: role === 'partner' ? 'সবুজ রিসাইক্লিং সাভার' : null,
    },
  };
}

describe('Role-Based Access Control (RBAC) Core & Navigation Matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/';
    mockSession = null;
  });

  describe('1. Role Normalization and Role Predicates', () => {
    it('normalizes roles correctly into 5 canonical roles', () => {
      expect(normalizeRole(undefined)).toBe('citizen');
      expect(normalizeRole(null)).toBe('citizen');
      expect(normalizeRole('citizen')).toBe('citizen');

      expect(normalizeRole('admin')).toBe('pouro_admin');
      expect(normalizeRole('pouro_admin')).toBe('pouro_admin');
      expect(normalizeRole('পৌর অ্যাডমিন')).toBe('pouro_admin');

      expect(normalizeRole('collector')).toBe('collector');
      expect(normalizeRole('cleaner')).toBe('collector');
      expect(normalizeRole('সংগ্রহকারী')).toBe('collector');

      expect(normalizeRole('partner')).toBe('partner');
      expect(normalizeRole('রিসাইক্লিং পার্টনার')).toBe('partner');

      expect(normalizeRole('developer')).toBe('developer');
      expect(normalizeRole('super_admin')).toBe('developer');
      expect(normalizeRole('dev')).toBe('developer');
    });

    it('identifies developer user strictly by role or whitelisted developer email', () => {
      expect(isDeveloperUser({ role: 'citizen', email: 'citizen@example.com' })).toBe(false);
      expect(isDeveloperUser({ role: 'admin', email: 'pouro@savar.gov.bd' })).toBe(false);
      expect(isDeveloperUser({ role: 'developer', email: null })).toBe(true);
      expect(isDeveloperUser({ role: 'super_admin', email: null })).toBe(true);
      expect(isDeveloperUser({ role: 'admin', email: 'niyamulhasanbd@gmail.com' })).toBe(true);
    });

    it('ensures Pouro Admin is strictly segregated from Developer', () => {
      const pouroUser = { role: 'admin' as const, email: 'admin@savar.gov.bd' };
      expect(isPouroAdminUser(pouroUser)).toBe(true);
      expect(isDeveloperUser(pouroUser)).toBe(false);
      expect(getUserCanonicalRole(pouroUser)).toBe('pouro_admin');
    });

    it('identifies collector, partner, and citizen users', () => {
      expect(isCollectorUser({ role: 'collector' })).toBe(true);
      expect(isCollectorUser({ role: 'cleaner' })).toBe(true);
      expect(isCollectorUser({ role: 'citizen' })).toBe(false);

      expect(isPartnerUser({ role: 'partner' })).toBe(true);
      expect(isPartnerUser({ role: 'collector' })).toBe(false);

      expect(isCitizenUser(null)).toBe(true);
      expect(isCitizenUser({ role: 'citizen' })).toBe(true);
      expect(isCitizenUser({ role: 'admin' })).toBe(false);
    });
  });

  describe('2. Navbar Filtering per Role Matrix', () => {
    it('1. Citizen / Public: Shows citizen tabs only, strictly hides staff/admin/dev tabs and buttons', () => {
      mockSession = null; // Unauthenticated
      const navLinks = getNavItemsForUser(null);
      expect(navLinks.map((i) => i.label)).toEqual([
        'হোম',
        'পিকআপ',
        'ছবি দিন',
        'ট্র্যাক',
        'অ্যাপ ডাউনলোড',
      ]);
      expect(shouldShowAdminPanelButton(null)).toBe(false);
      expect(shouldShowDevConsoleButton(null)).toBe(false);
      expect(shouldShowDownloadButton(null)).toBe(true);

      render(<SiteHeader />);
      const desktopNav = screen.getByRole('navigation', { name: 'প্রধান নেভিগেশন' });
      expect(within(desktopNav).getByText('হোম')).toBeInTheDocument();
      expect(within(desktopNav).getByText('পিকআপ')).toBeInTheDocument();
      expect(within(desktopNav).getByText('ছবি দিন')).toBeInTheDocument();
      expect(within(desktopNav).getByText('ট্র্যাক')).toBeInTheDocument();
      expect(within(desktopNav).getByText('অ্যাপ ডাউনলোড')).toBeInTheDocument();

      // Strictly hidden from desktop nav
      expect(within(desktopNav).queryByText('কালেক্টর')).not.toBeInTheDocument();
      expect(within(desktopNav).queryByText('পার্টনার')).not.toBeInTheDocument();
      expect(within(desktopNav).queryByText('অ্যাডমিন')).not.toBeInTheDocument();

      // Top-right action buttons hidden
      expect(screen.queryByText('অ্যাডমিন প্যানেল')).not.toBeInTheDocument();
      expect(screen.queryByText('দেব কনসোল')).not.toBeInTheDocument();
    });

    it('2. Pouro Admin: Only shows হোম and অ্যাডমিন প্যানেল, Dev Console & Citizen/Worker tabs strictly hidden', () => {
      mockSession = makeSession('admin', 'admin@savar.gov.bd');
      const user = mockSession.profile.user;
      const navLinks = getNavItemsForUser(user);

      expect(navLinks.map((i) => i.label)).toEqual(['হোম', 'অ্যাডমিন প্যানেল']);
      expect(shouldShowAdminPanelButton(user)).toBe(true);
      expect(shouldShowDevConsoleButton(user)).toBe(false); // MUST NEVER BE VISIBLE
      expect(shouldShowDownloadButton(user)).toBe(false);

      render(<SiteHeader />);
      const desktopNav = screen.getByRole('navigation', { name: 'প্রধান নেভিগেশন' });
      expect(within(desktopNav).getByText('হোম')).toBeInTheDocument();
      expect(within(desktopNav).getByText('অ্যাডমিন প্যানেল')).toBeInTheDocument();

      // Strictly hidden from Pouro Admin
      expect(within(desktopNav).queryByText('পিকআপ')).not.toBeInTheDocument();
      expect(within(desktopNav).queryByText('ছবি দিন')).not.toBeInTheDocument();
      expect(within(desktopNav).queryByText('কালেক্টর')).not.toBeInTheDocument();
      expect(within(desktopNav).queryByText('পার্টনার')).not.toBeInTheDocument();
      expect(screen.queryByText('দেব কনসোল')).not.toBeInTheDocument();
    });

    it('3. Collector: Only shows কালেক্টর ড্যাশবোর্ড and profile/logout', () => {
      mockSession = makeSession('collector');
      const user = mockSession.profile.user;
      const navLinks = getNavItemsForUser(user);

      expect(navLinks.map((i) => i.label)).toEqual(['কালেক্টর ড্যাশবোর্ড']);
      expect(shouldShowAdminPanelButton(user)).toBe(false);
      expect(shouldShowDevConsoleButton(user)).toBe(false);

      render(<SiteHeader />);
      const desktopNav = screen.getByRole('navigation', { name: 'প্রধান নেভিগেশন' });
      expect(within(desktopNav).getByText('কালেক্টর ড্যাশবোর্ড')).toBeInTheDocument();
      expect(screen.getByText('লগআউট')).toBeInTheDocument();

      // Strictly hidden
      expect(within(desktopNav).queryByText('পিকআপ')).not.toBeInTheDocument();
      expect(within(desktopNav).queryByText('ছবি দিন')).not.toBeInTheDocument();
      expect(within(desktopNav).queryByText('পার্টনার')).not.toBeInTheDocument();
      expect(within(desktopNav).queryByText('অ্যাডমিন')).not.toBeInTheDocument();
      expect(screen.queryByText('অ্যাডমিন প্যানেল')).not.toBeInTheDocument();
      expect(screen.queryByText('দেব কনসোল')).not.toBeInTheDocument();
    });

    it('4. Partner: Only shows পার্টনার ড্যাশবোর্ড and profile/logout', () => {
      mockSession = makeSession('partner');
      const user = mockSession.profile.user;
      const navLinks = getNavItemsForUser(user);

      expect(navLinks.map((i) => i.label)).toEqual(['পার্টনার ড্যাশবোর্ড']);
      expect(shouldShowAdminPanelButton(user)).toBe(false);
      expect(shouldShowDevConsoleButton(user)).toBe(false);

      render(<SiteHeader />);
      const desktopNav = screen.getByRole('navigation', { name: 'প্রধান নেভিগেশন' });
      expect(within(desktopNav).getByText('পার্টনার ড্যাশবোর্ড')).toBeInTheDocument();
      expect(screen.getByText('লগআউট')).toBeInTheDocument();

      // Strictly hidden
      expect(within(desktopNav).queryByText('পিকআপ')).not.toBeInTheDocument();
      expect(within(desktopNav).queryByText('ছবি দিন')).not.toBeInTheDocument();
      expect(within(desktopNav).queryByText('কালেক্টর')).not.toBeInTheDocument();
      expect(within(desktopNav).queryByText('অ্যাডমিন')).not.toBeInTheDocument();
      expect(screen.queryByText('অ্যাডমিন প্যানেল')).not.toBeInTheDocument();
      expect(screen.queryByText('দেব কনসোল')).not.toBeInTheDocument();
    });

    it('5. Developer: Only role allowed to see and access দেব কনসোল button', () => {
      mockSession = makeSession('developer');
      const user = mockSession.profile.user;
      const navLinks = getNavItemsForUser(user);

      expect(navLinks.map((i) => i.label)).toEqual([
        'হোম',
        'অ্যাডমিন',
        'কালেক্টর',
        'পার্টনার',
      ]);
      expect(shouldShowDevConsoleButton(user)).toBe(true);
      expect(shouldShowAdminPanelButton(user)).toBe(true);

      render(<SiteHeader />);
      const desktopNav = screen.getByRole('navigation', { name: 'প্রধান নেভিগেশন' });
      expect(within(desktopNav).getByText('হোম')).toBeInTheDocument();
      expect(within(desktopNav).getByText('অ্যাডমিন')).toBeInTheDocument();
      expect(within(desktopNav).getByText('কালেক্টর')).toBeInTheDocument();
      expect(within(desktopNav).getByText('পার্টনার')).toBeInTheDocument();

      expect(screen.getByText('দেব কনসোল')).toBeInTheDocument();
      expect(screen.getByText('অ্যাডমিন প্যানেল')).toBeInTheDocument();
    });
  });

  describe('3. Home Page Role-Aware CTAs', () => {
    it('Citizen / Public: Displays citizen CTAs (পিকআপ অনুরোধ করুন, ময়লার স্তূপ রিপোর্ট করুন)', () => {
      mockSession = null;
      render(<HeroSection />);
      expect(screen.getByRole('link', { name: /পিকআপ অনুরোধ করুন/ })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /ময়লার স্তূপ রিপোর্ট করুন/ })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /মোবাইল অ্যাপ \(APK\)/ })).toBeInTheDocument();
      expect(screen.getByText('নতুন রিপোর্ট করুন →')).toBeInTheDocument();
    });

    it('Pouro Admin: Hides citizen CTAs and replaces with Admin Quick Actions', () => {
      mockSession = makeSession('admin', 'admin@savar.gov.bd');
      render(<HeroSection />);

      // Citizen CTAs strictly hidden
      expect(screen.queryByRole('link', { name: /পিকআপ অনুরোধ করুন/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /ময়লার স্তূপ রিপোর্ট করুন/ })).not.toBeInTheDocument();

      // Admin Quick Actions displayed
      expect(screen.getByRole('link', { name: /ওভারভিউ ও ফ্লিট কন্ট্রোল/ })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /পেন্ডিং রিপোর্ট দেখুন/ })).toBeInTheDocument();
      expect(screen.getByText('অ্যাডমিন ডিসপ্যাচ ও তদারকি →')).toBeInTheDocument();
    });

    it('Collector: Hides citizen CTAs and replaces with Collector Quick Actions', () => {
      mockSession = makeSession('collector');
      render(<HeroSection />);

      expect(screen.queryByRole('link', { name: /পিকআপ অনুরোধ করুন/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /ময়লার স্তূপ রিপোর্ট করুন/ })).not.toBeInTheDocument();

      expect(screen.getByRole('link', { name: /আমার নির্ধারিত টাস্ক ও জিপিএস/ })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /গাড়ির অবস্থান আপডেট/ })).toBeInTheDocument();
      expect(screen.getByText('আমার হটস্পট টাস্ক দেখুন →')).toBeInTheDocument();
    });

    it('Partner: Hides citizen CTAs and replaces with Partner Quick Actions', () => {
      mockSession = makeSession('partner');
      render(<HeroSection />);

      expect(screen.queryByRole('link', { name: /পিকআপ অনুরোধ করুন/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /ময়লার স্তূপ রিপোর্ট করুন/ })).not.toBeInTheDocument();

      expect(screen.getByRole('link', { name: /রিসাইক্লিং লট মার্কেটপ্লেস/ })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /লট সংগ্রহ ও প্রসেসিং/ })).toBeInTheDocument();
      expect(screen.getByText('রিসাইক্লিং হাব দেখুন →')).toBeInTheDocument();
    });
  });

  describe('4. Strict Route Protection & Guards', () => {
    it('blocks Pouro Admin from /dev and /dev-admin', () => {
      const pouro = makeSession('admin', 'admin@savar.gov.bd').profile.user;
      const resDev = checkRouteAccess('/dev', pouro);
      expect(resDev.allowed).toBe(false);
      expect(resDev.redirectHref).toBe('/admin');
      expect(resDev.reasonBn).toContain('দেব কনসোল (Dev Console) শুধুমাত্র সিস্টেম ইঞ্জিনিয়ার');

      const resDevAdmin = checkRouteAccess('/dev-admin', pouro);
      expect(resDevAdmin.allowed).toBe(false);
      expect(resDevAdmin.redirectHref).toBe('/admin');
    });

    it('blocks Collector from /admin, /partner, and citizen submission forms', () => {
      const collector = makeSession('collector').profile.user;

      const resAdmin = checkRouteAccess('/admin', collector);
      expect(resAdmin.allowed).toBe(false);
      expect(resAdmin.redirectHref).toBe('/collector');

      const resPartner = checkRouteAccess('/partner', collector);
      expect(resPartner.allowed).toBe(false);
      expect(resPartner.redirectHref).toBe('/collector');

      const resPickup = checkRouteAccess('/pickup', collector);
      expect(resPickup.allowed).toBe(false);
      expect(resPickup.redirectHref).toBe('/collector');

      // Collector IS allowed on /collector and /track
      expect(checkRouteAccess('/collector', collector).allowed).toBe(true);
      expect(checkRouteAccess('/track', collector).allowed).toBe(true);
    });

    it('blocks Partner from /admin, /collector, and citizen submission forms', () => {
      const partner = makeSession('partner').profile.user;

      const resAdmin = checkRouteAccess('/admin', partner);
      expect(resAdmin.allowed).toBe(false);
      expect(resAdmin.redirectHref).toBe('/partner');

      const resCollector = checkRouteAccess('/collector', partner);
      expect(resCollector.allowed).toBe(false);
      expect(resCollector.redirectHref).toBe('/partner');

      const resReport = checkRouteAccess('/report', partner);
      expect(resReport.allowed).toBe(false);
      expect(resReport.redirectHref).toBe('/partner');

      // Partner IS allowed on /partner and /
      expect(checkRouteAccess('/partner', partner).allowed).toBe(true);
      expect(checkRouteAccess('/', partner).allowed).toBe(true);
    });

    it('blocks Pouro Admin from standalone worker /collector and /partner portals', () => {
      const pouro = makeSession('admin', 'admin@savar.gov.bd').profile.user;
      expect(checkRouteAccess('/collector', pouro).allowed).toBe(false);
      expect(checkRouteAccess('/partner', pouro).allowed).toBe(false);
      expect(checkRouteAccess('/pickup', pouro).allowed).toBe(false);

      // Allowed on /admin and /
      expect(checkRouteAccess('/admin', pouro).allowed).toBe(true);
      expect(checkRouteAccess('/', pouro).allowed).toBe(true);
    });

    it('allows Developer on all routes for system-wide debugging', () => {
      const dev = makeSession('developer').profile.user;
      expect(checkRouteAccess('/dev-admin', dev).allowed).toBe(true);
      expect(checkRouteAccess('/admin', dev).allowed).toBe(true);
      expect(checkRouteAccess('/collector', dev).allowed).toBe(true);
      expect(checkRouteAccess('/partner', dev).allowed).toBe(true);
      expect(checkRouteAccess('/pickup', dev).allowed).toBe(true);
      expect(checkRouteAccess('/', dev).allowed).toBe(true);
    });

    it('renders RouteAccessDeniedCard in SubpageShell when route is blocked', () => {
      mockPathname = '/admin';
      mockSession = makeSession('collector'); // Collector accessing /admin

      render(
        <SubpageShell>
          <div>Admin Secret Content</div>
        </SubpageShell>,
      );

      expect(screen.queryByText('Admin Secret Content')).not.toBeInTheDocument();
      expect(screen.getByText('অননুমোদিত প্রবেশাধিকার')).toBeInTheDocument();
      expect(screen.getByText(/সাভার পৌরসভা অ্যাডমিন কমান্ড প্যানেল শুধুমাত্র পৌর অ্যাডমিনদের জন্য/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /আমার কালেক্টর ওয়ার্কস্পেসে যান/ })).toHaveAttribute(
        'href',
        '/collector',
      );
    });
  });
});
