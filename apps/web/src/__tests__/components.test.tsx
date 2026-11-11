import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OtpAuthPanel } from '@/components/OtpAuthPanel';
import PickupPage from '@/app/pickup/page';
import PartnerPage from '@/app/partner/page';
import { ANALYTICS_SEED, LOTS_SEED, SAVAR_WARDS_SEED } from '@/lib/savar-data';
import type { AuthSession, RecyclableLotRecord } from '@/lib/types';

// Mock Next navigation primitives cleanly
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const mockRequestOtp = vi.fn();
const mockVerifyOtp = vi.fn();
const mockCreatePickup = vi.fn();
const mockFetchPickups = vi.fn();
const mockFetchRecyclableLots = vi.fn();
const mockClaimRecyclableLot = vi.fn();

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();
  return {
    ...actual,
    requestOtp: (...args: unknown[]) => mockRequestOtp(...args),
    verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
    createPickup: (...args: unknown[]) => mockCreatePickup(...args),
    fetchPickups: (...args: unknown[]) => mockFetchPickups(...args),
    fetchRecyclableLots: (...args: unknown[]) => mockFetchRecyclableLots(...args),
    claimRecyclableLot: (...args: unknown[]) => mockClaimRecyclableLot(...args),
  };
});

let mockSession: AuthSession | null = null;
const mockOpenAuthModal = vi.fn();
const mockApplyAuthSession = vi.fn();
const mockRefreshPublicData = vi.fn().mockResolvedValue(undefined);
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
    applyAuthSession: mockApplyAuthSession,
    logout: vi.fn(),
    wards: SAVAR_WARDS_SEED,
    publicAnalytics: ANALYTICS_SEED,
    publicHotspots: [],
    isOfflinePreview: false,
    isLoadingPublic: false,
    publicError: null,
    refreshPublicData: mockRefreshPublicData,
    notifications: [],
    unreadNotificationCount: 0,
    refreshNotifications: vi.fn(),
    markAsRead: vi.fn(),
    announcement: '',
    announce: mockAnnounce,
  }),
}));

function buildSession(role: 'citizen' | 'partner'): AuthSession {
  return {
    accessToken: 'tok-abc',
    expiresAtIso: new Date(Date.now() + 3600_000).toISOString(),
    profile: {
      user: {
        id: 'aaaa1111-1111-4111-8111-111111111107',
        phone: '01715-883210',
        full_name: role === 'partner' ? 'সবুজ রিসাইক্লিং সাভার' : 'রাফি আহমেদ',
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

describe('Clean Savar interactive web workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
  });

  it('validates OTP phone after interaction and progresses through single-input WebOTP flow', async () => {
    mockRequestOtp.mockResolvedValueOnce({
      phone: '01715-883210',
      expires_in_seconds: 300,
      message: 'OTP issued',
      message_bn: 'OTP পাঠানো হয়েছে',
      otp_preview: '654321',
    });
    const verified = buildSession('citizen');
    mockVerifyOtp.mockResolvedValueOnce(verified);

    render(<OtpAuthPanel />);

    const phoneInput = screen.getByLabelText(/মোবাইল নম্বর/);
    // Error is not shown before interaction
    expect(screen.queryByText(/সঠিক বাংলাদেশি মোবাইল নম্বর/)).not.toBeInTheDocument();

    fireEvent.change(phoneInput, { target: { value: '123' } });
    fireEvent.blur(phoneInput);
    expect(screen.getByText(/সঠিক বাংলাদেশি মোবাইল নম্বর/)).toBeInTheDocument();

    fireEvent.change(phoneInput, { target: { value: '01715883210' } });
    fireEvent.click(screen.getByRole('button', { name: /মোবাইল OTP পাঠান/ }));

    await waitFor(() => {
      expect(mockRequestOtp).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '01715-883210', role: 'citizen' }),
      );
    });

    const otpInput = await screen.findByLabelText(/৬ সংখ্যার OTP কোড/);
    expect(otpInput).toHaveAttribute('autocomplete', 'one-time-code');
    expect(otpInput).toHaveAttribute('inputmode', 'numeric');

    fireEvent.click(screen.getByRole('button', { name: 'কোড বসান' }));
    fireEvent.click(screen.getByRole('button', { name: /OTP যাচাই করে লগইন করুন/ }));

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        phone: '01715-883210',
        otp: '654321',
      });
      expect(mockApplyAuthSession).toHaveBeenCalledWith(verified);
    });
  });

  it('supports recurring weekly pickup scheduling and displays tracking receipt', async () => {
    mockSession = buildSession('citizen');
    mockFetchPickups.mockResolvedValueOnce([]);
    mockCreatePickup.mockResolvedValueOnce({
      id: 'pk-1',
      tracking_code: 'CS-PK-09001',
      citizen_name: 'রাফি আহমেদ',
      citizen_phone: '01715-883210',
      ward_id: 5,
      ward_name_bn: 'ওয়ার্ড ০৫ — ব্যাংক টাউন ও পাকিজা',
      address_line: 'বাসা ১৪, রোড ২, ব্যাংক টাউন',
      landmark: '১নং গেট',
      waste_type: 'recyclable',
      slot: 'morning',
      schedule_type: 'recurring_weekly',
      preferred_day: 'monday',
      estimated_bags: 2,
      status: 'pending',
      lat: 23.847,
      lng: 90.259,
      assigned_vehicle_id: null,
      assigned_vehicle_code: null,
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    render(<PickupPage />);

    // Preferred day select stays hidden until recurring_weekly is chosen
    expect(screen.queryByLabelText(/প্রতি সপ্তাহে সংগ্রহের বার/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/সাপ্তাহিক নিয়মিত পিকআপ/));
    const daySelect = screen.getByLabelText(/প্রতি সপ্তাহে সংগ্রহের বার/);
    fireEvent.change(daySelect, { target: { value: 'monday' } });

    fireEvent.change(screen.getByLabelText(/বাসা \/ রোড ও মহল্লার ঠিকানা/), {
      target: { value: 'বাসা ১৪, রোড ২, ব্যাংক টাউন' },
    });
    fireEvent.change(screen.getByLabelText(/নিকটবর্তী পরিচিত স্থান/), {
      target: { value: '১নং গেট' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'পিকআপ বুকিং নিশ্চিত করুন' }));

    await waitFor(() => {
      expect(mockCreatePickup).toHaveBeenCalledWith(
        expect.objectContaining({
          schedule_type: 'recurring_weekly',
          preferred_day: 'monday',
          address_line: 'বাসা ১৪, রোড ২, ব্যাংক টাউন',
        }),
      );
      expect(screen.getAllByText('CS-PK-09001').length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByRole('heading', { name: /পিকআপ অনুরোধ সফলভাবে গৃহীত হয়েছে/ }),
      ).toBeInTheDocument();
    });
  });

  it('enforces partner role access and supports empty state + lot claiming', async () => {
    mockSession = buildSession('citizen');
    render(<PartnerPage />);
    expect(
      screen.getByText(/শুধুমাত্র রিসাইক্লিং পার্টনার \/ পৌর অ্যাডমিন অ্যাকাউন্টের জন্য/),
    ).toBeInTheDocument();
  });

  it('renders partner lots, empty state when filtered out, and claim workflow', async () => {
    mockSession = buildSession('partner');
    const claimedLot: RecyclableLotRecord = {
      ...LOTS_SEED[0]!,
      status: 'claimed',
      claimed_partner_name: 'সবুজ রিসাইক্লিং সাভার',
    };
    mockFetchRecyclableLots.mockResolvedValueOnce(LOTS_SEED);
    mockClaimRecyclableLot.mockResolvedValueOnce(claimedLot);

    render(<PartnerPage />);

    await waitFor(() => {
      expect(screen.getByText('CS-LOT-00401')).toBeInTheDocument();
    });

    // Empty state via search filter
    const search = screen.getByPlaceholderText(/লট কোড বা হাব খুঁজুন/);
    fireEvent.change(search, { target: { value: 'NON-EXISTENT-LOT' } });
    expect(screen.getByText('কোনো রিসাইক্লিং লট পাওয়া যায়নি')).toBeInTheDocument();

    fireEvent.change(search, { target: { value: '' } });
    const claimButtons = screen.getAllByRole('button', { name: 'লট বুক করুন' });
    fireEvent.click(claimButtons[0]!);

    const confirmBtn = await screen.findByRole('button', {
      name: 'লট বুকিং নিশ্চিত করুন',
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockClaimRecyclableLot).toHaveBeenCalledWith(
        LOTS_SEED[0]!.id,
        expect.any(String),
      );
      expect(mockAnnounce).toHaveBeenCalledWith(
        expect.stringContaining('CS-LOT-00401'),
      );
    });
  });
});
