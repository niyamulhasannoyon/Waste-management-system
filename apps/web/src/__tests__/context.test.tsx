import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CleanSavarProvider, useCleanSavar } from '@/context/CleanSavarContext';
import type { AuthSession, NotificationRecord } from '@/lib/types';

const { mockMarkNotificationRead, mockFetchNotifications, mockProfile } = vi.hoisted(() => ({
  mockMarkNotificationRead: vi.fn(),
  mockFetchNotifications: vi.fn(),
  mockProfile: {
    user: {
      id: 'u-1',
      phone: '01715-883210',
      full_name: 'রাফি আহমেদ',
      role: 'citizen' as const,
      ward_id: 5,
      is_verified: true,
      created_at: '2026-11-12T01:42:00.000Z',
    },
    vehicle_id: null,
    partner_id: null,
    partner_name: null,
  },
}));

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();
  return {
    ...actual,
    fetchWards: vi.fn().mockResolvedValue({ data: [], offline: true }),
    fetchPublicAnalytics: vi.fn().mockResolvedValue({
      data: {
        total_pickups: 0,
        pending_pickups: 0,
        completed_pickups: 0,
        total_reports: 0,
        open_reports: 0,
        cleared_reports: 0,
        resolution_rate_percent: 0,
        collected_weight_today_kg: 0,
        active_vehicles: 0,
        recyclable_open_kg: 0,
      },
      offline: true,
    }),
    fetchPublicHotspots: vi.fn().mockResolvedValue({ data: [], offline: true }),
    fetchMe: vi.fn().mockResolvedValue(mockProfile),
    fetchNotifications: (...args: unknown[]) => mockFetchNotifications(...args),
    markNotificationRead: (...args: unknown[]) => mockMarkNotificationRead(...args),
    readStoredSession: (): AuthSession => ({
      accessToken: 'tok-123',
      expiresAtIso: new Date(Date.now() + 3600_000).toISOString(),
      profile: mockProfile,
    }),
  };
});

function NotificationsHarness() {
  const { notifications, unreadNotificationCount, markAsRead } = useCleanSavar();
  return (
    <div>
      <span data-testid="unread-count">{unreadNotificationCount}</span>
      <ul>
        {notifications.map((n) => (
          <li key={n.id}>
            <span>{n.title_bn}</span>
            <button type="button" onClick={() => void markAsRead(n.id)}>
              read-{n.id}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

describe('CleanSavarProvider notifications handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps notifications valid when markNotificationRead resolves with 204 (undefined)', async () => {
    const sample: NotificationRecord[] = [
      {
        id: 'notif-1',
        title_bn: 'কালেক্টর নির্ধারিত হয়েছে',
        body_bn: 'SV-CMP-01 নির্ধারণ করা হয়েছে।',
        entity_type: 'pickup',
        entity_id: 'pick-1',
        is_read: false,
        created_at: '2026-11-12T01:42:00.000Z',
      },
    ];
    mockFetchNotifications.mockResolvedValueOnce(sample);
    mockMarkNotificationRead.mockResolvedValueOnce(undefined);

    render(
      <CleanSavarProvider>
        <NotificationsHarness />
      </CleanSavarProvider>,
    );

    const btn = await screen.findByRole('button', { name: 'read-notif-1' });
    expect(screen.getByTestId('unread-count')).toHaveTextContent('1');

    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockMarkNotificationRead).toHaveBeenCalledWith('notif-1');
      expect(screen.getByTestId('unread-count')).toHaveTextContent('0');
    });
    expect(screen.getByText('কালেক্টর নির্ধারিত হয়েছে')).toBeInTheDocument();
  });
});
