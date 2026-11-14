'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, LogOut, ShieldCheck, Shield } from 'lucide-react';
import { OtpAuthPanel } from '@/components/OtpAuthPanel';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCleanSavar } from '@/context/CleanSavarContext';
import { ROLE_LABELS_BN } from '@/lib/savar-data';
import { isAllowedDevEmail, isUserApprovedAdmin } from '@/lib/dev-store';

const ROLE_DEFAULT_ROUTE: Record<'citizen' | 'collector' | 'partner' | 'admin', { href: string; label: string }> = {
  citizen: { href: '/pickup', label: 'পিকআপ পোর্টালে যান' },
  collector: { href: '/collector', label: 'কালেক্টর ওয়ার্কস্পেসে যান' },
  partner: { href: '/partner', label: 'পার্টনার মার্কেটপ্লেসে যান' },
  admin: { href: '/admin', label: 'অ্যাডমিন কমান্ড ড্যাশবোর্ডে যান' },
};

export default function LoginPage() {
  const router = useRouter();
  const { profile, logout } = useCleanSavar();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D]">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          ব্যবহারকারী যাচাইকরণ ও নিরাপদ প্রবেশ
        </div>
        <h1 className="text-2xl font-bold text-[#0F172A]">ক্লিন সাভার অ্যাকাউন্ট লগইন</h1>
        <p className="text-sm text-[#475569]">
          নাম ও মোবাইল নম্বর প্রদান করে Google অ্যাকাউন্টের মাধ্যমে দ্রুত ও নিরাপদে সাইন-ইন সম্পন্ন করুন।
        </p>
      </div>

      {profile ? (
        <section className="cs-card space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#14532D]">
                <CheckCircle2 className="h-4 w-4 text-[#15803D]" aria-hidden="true" />
                বর্তমান সেশন সক্রিয়
              </div>
              <h2 className="text-lg font-bold text-[#0F172A]">{profile.user.full_name}</h2>
              <p className="font-metric text-sm text-[#475569]">{profile.user.phone}</p>
            </div>
            <StatusBadge tone="success">{ROLE_LABELS_BN[profile.user.role]}</StatusBadge>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-[#E2E8F0] pt-4">
            <Link
              href={ROLE_DEFAULT_ROUTE[profile.user.role].href}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#15803D] px-4 text-sm font-semibold text-white hover:bg-[#14532D]"
            >
              {ROLE_DEFAULT_ROUTE[profile.user.role].label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>

            {profile.user.role !== 'admin' &&
            (isAllowedDevEmail(profile.user.email) ||
              isUserApprovedAdmin(profile.user.phone, profile.user.email)) ? (
              <Link
                href="/admin"
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#15803D] bg-[#F0FDF4] px-4 text-sm font-bold text-[#14532D] hover:bg-[#DCFCE7]"
              >
                <ShieldCheck className="h-4 w-4 text-[#15803D]" />
                অ্যাডমিন কমান্ড ড্যাশবোর্ড
              </Link>
            ) : null}

            {isAllowedDevEmail(profile.user.email) || profile.user.role === 'admin' ? (
              <Link
                href="/dev-admin"
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800"
              >
                <Shield className="h-4 w-4 text-emerald-400" />
                ডেভেলপার কনসোল
              </Link>
            ) : null}

            <Button type="button" variant="secondary" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              অ্যাকাউন্ট পরিবর্তন / লগআউট
            </Button>
          </div>
        </section>
      ) : (
        <section className="cs-card p-6">
          <OtpAuthPanel
            titleId="page-otp"
            onSuccess={(session) => {
              const isAdmin =
                session.profile.user.role === 'admin' ||
                isAllowedDevEmail(session.profile.user.email) ||
                isUserApprovedAdmin(session.profile.user.phone, session.profile.user.email);
              if (isAdmin) {
                router.push('/admin');
              } else {
                router.push(ROLE_DEFAULT_ROUTE[session.profile.user.role].href);
              }
            }}
          />
        </section>
      )}
    </div>
  );
}
