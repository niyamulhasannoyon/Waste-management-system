'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertTriangle,
  Bell,
  Check,
  Download,
  Leaf,
  LogIn,
  LogOut,
  Menu,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NativeDialog } from '@/components/ui/native-dialog';
import { RelativeTimeBn } from '@/components/ui/relative-time';
import { useCleanSavar } from '@/context/CleanSavarContext';
import { ROLE_LABELS_BN } from '@/lib/savar-data';
import { cn, toBanglaDigits } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'হোম' },
  { href: '/pickup', label: 'পিকআপ' },
  { href: '/report', label: 'ছবি দিন' },
  { href: '/track', label: 'ট্র্যাক' },
  { href: '/collector', label: 'কালেক্টর' },
  { href: '/partner', label: 'পার্টনার' },
  { href: '/admin', label: 'অ্যাডমিন' },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const {
    profile,
    openAuthModal,
    logout,
    notifications,
    unreadNotificationCount,
    markAsRead,
    refreshNotifications,
    isOfflinePreview,
    isLoadingPublic,
    refreshPublicData,
  } = useCleanSavar();

  const drawerRef = useRef<HTMLDialogElement | null>(null);
  const drawerCloseRef = useRef<HTMLButtonElement | null>(null);
  const pointerStartedOutsideRef = useRef<boolean>(false);

  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [notifOpen, setNotifOpen] = useState<boolean>(false);

  function openDrawer() {
    const dlg = drawerRef.current;
    if (!dlg || dlg.open) return;
    dlg.showModal();
    setDrawerOpen(true);
    window.requestAnimationFrame(() => {
      drawerCloseRef.current?.focus();
    });
  }

  function closeDrawer() {
    const dlg = drawerRef.current;
    if (dlg?.open) {
      dlg.close();
    }
    setDrawerOpen(false);
  }

  // Close mobile drawer automatically on route transitions
  useEffect(() => {
    closeDrawer();
  }, [pathname]);

  function handleDrawerMouseDown(e: React.MouseEvent<HTMLDialogElement>) {
    pointerStartedOutsideRef.current = e.target === drawerRef.current;
  }

  function handleDrawerClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (pointerStartedOutsideRef.current && e.target === drawerRef.current) {
      closeDrawer();
    }
    pointerStartedOutsideRef.current = false;
  }

  const user = profile?.user ?? null;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#E2E8F0] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 text-[#0F172A] hover:opacity-90"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]">
              <Leaf className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-base font-bold tracking-tight text-[#0F172A]">
                ক্লিন সাভার
              </span>
              <span lang="en" className="font-metric text-[11px] font-medium text-[#475569]">
                Clean Savar · Pourashava Ops
              </span>
            </span>
          </Link>

          <nav aria-label="প্রধান নেভিগেশন" className="hidden items-center gap-1 lg:flex">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-h-10 items-center rounded-t-md border-b-2 px-2.5 py-1.5 text-sm transition-colors whitespace-nowrap',
                    active
                      ? 'border-[#15803D] bg-[#F0FDF4] font-semibold text-[#14532D]'
                      : 'border-transparent font-medium text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <button
                type="button"
                onClick={() => {
                  void refreshNotifications();
                  setNotifOpen(true);
                }}
                aria-label={`বিজ্ঞপ্তি খুলুন (${toBanglaDigits(unreadNotificationCount)}টি অপঠিত)`}
                className="relative inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-[#CBD5E1] bg-white px-2.5 text-[#0F172A] hover:bg-[#F8FAFC]"
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                {unreadNotificationCount > 0 ? (
                  <span className="ml-1 rounded-full bg-[#15803D] px-1.5 py-0.5 text-[11px] font-bold text-white">
                    {toBanglaDigits(Math.min(unreadNotificationCount, 99))}
                  </span>
                ) : null}
              </button>
            ) : null}

            <div className="hidden items-center gap-2 sm:flex">
              {user ? (
                <div className="flex items-center gap-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1">
                  <div className="flex flex-col leading-tight">
                    <span className="max-w-[130px] truncate text-xs font-semibold text-[#0F172A]">
                      {user.full_name}
                    </span>
                    <span className="text-[11px] font-medium text-[#14532D]">
                      {ROLE_LABELS_BN[user.role]}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void logout()}
                    aria-label="লগআউট করুন"
                    className="min-h-8 px-2 text-xs text-[#475569] hover:text-[#B91C1C]"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    লগআউট
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="tint"
                  size="sm"
                  onClick={() => openAuthModal()}
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  লগইন (OTP)
                </Button>
              )}
            </div>

            <Link
              href="/download"
              aria-label="ক্লিন সাভার মোবাইল অ্যাপ ডাউনলোড করুন"
              className="hidden items-center gap-1.5 rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-2.5 py-1.5 text-xs font-semibold text-[#15803D] transition-colors hover:bg-[#DCFCE7] md:inline-flex"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>অ্যাপ ডাউনলোড</span>
            </Link>

            <button
              type="button"
              onClick={openDrawer}
              aria-label="মোবাইল নেভিগেশন মেনু খুলুন"
              aria-expanded={drawerOpen}
              aria-controls="cs-mobile-drawer"
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F8FAFC] lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {isOfflinePreview ? (
          <div className="border-t border-[#FDE68A] bg-[#FFFBEB] px-4 py-1.5 text-xs text-[#92400E] sm:px-6">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 font-medium">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                অফলাইন প্রিভিউ মোড: এপিআই সার্ভার সংযুক্ত না থাকায় কেবল নমুনা ডেটা দেখাচ্ছে। তথ্য সংরক্ষণের জন্য এপিআই সার্ভার চালু রাখুন।
              </p>
              <button
                type="button"
                disabled={isLoadingPublic}
                onClick={() => void refreshPublicData()}
                className="inline-flex items-center gap-1 rounded border border-[#F59E0B] bg-white px-2 py-0.5 font-semibold text-[#92400E] hover:bg-[#FEF3C7] disabled:opacity-50"
              >
                <RefreshCw className={cn('h-3 w-3', isLoadingPublic && 'animate-spin')} aria-hidden="true" />
                পুনঃসংযোগ
              </button>
            </div>
          </div>
        ) : null}
      </header>

      {/* Mobile Navigation Drawer rendered in top layer using native <dialog>.showModal() */}
      <dialog
        id="cs-mobile-drawer"
        ref={drawerRef}
        aria-labelledby="cs-mobile-drawer-title"
        onCancel={() => setDrawerOpen(false)}
        onClose={() => setDrawerOpen(false)}
        onMouseDown={handleDrawerMouseDown}
        onClick={handleDrawerClick}
        className="cs-drawer"
      >
        <div className="flex h-full flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3.5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]">
                  <Leaf className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p id="cs-mobile-drawer-title" className="text-sm font-bold text-[#0F172A]">
                    ক্লিন সাভার মেনু
                  </p>
                  <p lang="en" className="font-metric text-[11px] text-[#475569]">
                    Clean Savar Portal
                  </p>
                </div>
              </div>
              <button
                ref={drawerCloseRef}
                type="button"
                onClick={closeDrawer}
                aria-label="মেনু বন্ধ করুন"
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-[#CBD5E1] text-[#0F172A] hover:bg-[#F1F5F9]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <nav aria-label="মোবাইল নেভিগেশন" className="p-3">
              <ul className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const active =
                    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={closeDrawer}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex min-h-11 items-center justify-between rounded-md border-l-4 px-3 py-2 text-sm transition-colors',
                          active
                            ? 'border-[#15803D] bg-[#F0FDF4] font-semibold text-[#14532D]'
                            : 'border-transparent font-medium text-[#334155] hover:bg-[#F8FAFC] hover:text-[#0F172A]',
                        )}
                      >
                        <span>{item.label}</span>
                        {active ? (
                          <StatusBadge tone="success">বর্তমান</StatusBadge>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="px-3 pb-3">
              <Link
                href="/download"
                onClick={closeDrawer}
                className="flex min-h-10 items-center justify-center gap-2 rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-xs font-semibold text-[#15803D] hover:bg-[#DCFCE7]"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>অ্যান্ড্রয়েড অ্যাপ ডাউনলোড (APK)</span>
              </Link>
            </div>
          </div>

          <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] p-4">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-[#0F172A]">{user.full_name}</p>
                    <p className="font-metric text-xs text-[#475569]">{user.phone}</p>
                  </div>
                  <StatusBadge tone="success">{ROLE_LABELS_BN[user.role]}</StatusBadge>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    closeDrawer();
                    void logout();
                  }}
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  লগআউট করুন
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    closeDrawer();
                    openAuthModal();
                  }}
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  মোবাইল OTP দিয়ে লগইন
                </Button>
                <Link
                  href="/login"
                  onClick={closeDrawer}
                  className="block text-center text-xs font-semibold text-[#15803D] underline underline-offset-2"
                >
                  অথবা পূর্ণ লগইন পেজ দেখুন
                </Link>
              </div>
            )}
          </div>
        </div>
      </dialog>

      {/* Authenticated Notifications Dialog */}
      <NativeDialog
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        title="সাম্প্রতিক বিজ্ঞপ্তি ও আপডেট"
        description="আপনার পিকআপ, অভিযোগ ও ফিল্ড অপারেশন সংক্রান্ত সতর্কবার্তা"
      >
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="rounded-md border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-8 text-center">
              <p className="text-sm font-medium text-[#0F172A]">এখনো কোনো নতুন বিজ্ঞপ্তি নেই</p>
              <p className="mt-1 text-xs text-[#475569]">
                পিকআপ নির্ধারণ বা অভিযোগ সমাধান হলে এখানে সরাসরি আপডেট দেখতে পাবেন।
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#E2E8F0] rounded-md border border-[#E2E8F0]">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    'flex items-start justify-between gap-3 p-3',
                    !n.is_read ? 'bg-[#F0FDF4]/60' : 'bg-white',
                  )}
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-[#0F172A]">{n.title_bn}</p>
                    <p className="text-xs text-[#334155]">{n.body_bn}</p>
                    <p className="text-[11px] text-[#64748B]">
                      <RelativeTimeBn isoDate={n.created_at} />
                    </p>
                  </div>
                  {!n.is_read ? (
                    <button
                      type="button"
                      onClick={() => void markAsRead(n.id)}
                      className="inline-flex shrink-0 items-center gap-1 rounded border border-[#BBF7D0] bg-white px-2 py-1 text-xs font-medium text-[#14532D] hover:bg-[#DCFCE7]"
                    >
                      <Check className="h-3 w-3" aria-hidden="true" />
                      পঠিত
                    </button>
                  ) : (
                    <span className="text-[11px] font-medium text-[#64748B]">পঠিত</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </NativeDialog>
    </>
  );
}
