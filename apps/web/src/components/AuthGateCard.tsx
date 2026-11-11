'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { useCleanSavar } from '@/context/CleanSavarContext';
import { ROLE_LABELS_BN } from '@/lib/savar-data';
import type { UserRole } from '@/lib/types';

interface AuthGateCardProps {
  titleBn: string;
  descriptionBn: string;
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}

export function AuthGateCard({
  titleBn,
  descriptionBn,
  allowedRoles,
  children,
}: AuthGateCardProps) {
  const { authReady, profile, openAuthModal } = useCleanSavar();

  if (!authReady) {
    return (
      <div className="cs-card p-6 sm:p-8">
        <div className="h-5 w-48 animate-pulse rounded bg-[#E2E8F0]" />
        <div className="mt-3 h-4 w-72 animate-pulse rounded bg-[#F1F5F9]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <section aria-labelledby="auth-gate-title" className="cs-card p-6 sm:p-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#14532D]">
              <ShieldCheck className="h-5 w-5 text-[#15803D]" aria-hidden="true" />
              মোবাইল OTP যাচাই প্রয়োজন
            </div>
            <h2 id="auth-gate-title" className="text-lg font-bold text-[#0F172A]">
              {titleBn}
            </h2>
            <p className="max-w-2xl text-sm text-[#475569]">{descriptionBn}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button type="button" onClick={() => openAuthModal(descriptionBn)}>
              মোবাইল OTP দিয়ে লগইন করুন
            </Button>
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center rounded-md border border-[#CBD5E1] bg-white px-4 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC]"
            >
              লগইন পেজ
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const currentRole = profile.user.role;
  if (allowedRoles && !allowedRoles.includes(currentRole)) {
    const allowedText = allowedRoles.map((r) => ROLE_LABELS_BN[r]).join(' / ');
    return (
      <section aria-labelledby="role-gate-title" className="cs-card border-[#FECACA] bg-[#FEF2F2]/40 p-6 sm:p-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-[#B91C1C]" aria-hidden="true" />
              <StatusBadge tone="danger">ভূমিকা অনুমোদিত নয়</StatusBadge>
              <StatusBadge tone="neutral">বর্তমান: {ROLE_LABELS_BN[currentRole]}</StatusBadge>
            </div>
            <h2 id="role-gate-title" className="text-lg font-bold text-[#0F172A]">
              এই অংশটি শুধুমাত্র {allowedText} অ্যাকাউন্টের জন্য নির্ধারিত
            </h2>
            <p className="max-w-2xl text-sm text-[#475569]">
              আপনি বর্তমানে <strong>{profile.user.full_name}</strong> ({ROLE_LABELS_BN[currentRole]}) হিসেবে সাইন ইন আছেন। অনুমোদিত মোবাইল নম্বর দিয়ে OTP লগইন করুন অথবা আপনার নিজস্ব সেবা পোর্টালে ফিরে যান।
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => openAuthModal(`${allowedText} অ্যাকাউন্টে স্যুইচ করতে OTP দিয়ে লগইন করুন।`)}
            >
              অন্য অ্যাকাউন্টে লগইন
            </Button>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-md bg-[#15803D] px-4 text-sm font-medium text-white hover:bg-[#14532D]"
            >
              হোমে ফিরে যান
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
