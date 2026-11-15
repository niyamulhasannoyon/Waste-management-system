'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, LogOut, ShieldAlert } from 'lucide-react';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCleanSavar } from '@/context/CleanSavarContext';
import { ROLE_LABELS_BN } from '@/lib/savar-data';
import type { RouteAccessResult } from '@/lib/rbac';

export function RouteAccessDeniedCard({ access }: { access: RouteAccessResult }) {
  const { profile, logout } = useCleanSavar();

  return (
    <section
      aria-labelledby="route-denied-title"
      className="cs-card border-[#FECACA] bg-[#FEF2F2]/40 p-6 sm:p-8"
    >
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-[#B91C1C]" aria-hidden="true" />
            <StatusBadge tone="danger">ভূমিকা অনুমোদিত নয়</StatusBadge>
            {profile?.user ? (
              <StatusBadge tone="neutral">
                বর্তমান অ্যাকাউন্ট: {profile.user.full_name} ({ROLE_LABELS_BN[profile.user.role] || profile.user.role})
              </StatusBadge>
            ) : null}
          </div>
          <h2 id="route-denied-title" className="text-lg font-bold text-[#0F172A]">
            {access.titleBn || 'অননুমোদিত প্রবেশাধিকার'}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-[#475569]">
            {access.reasonBn}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2.5">
          {access.redirectHref ? (
            <Link
              href={access.redirectHref}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#15803D] px-4 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#14532D]"
            >
              <span>{access.actionLabelBn || 'অনুমোদিত পেজে যান'}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}

          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-md border border-[#CBD5E1] bg-white px-4 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC]"
          >
            হোম পেজে যান
          </Link>

          {profile?.user ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => void logout()}
              aria-label="লগআউট করুন"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              লগআউট
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
