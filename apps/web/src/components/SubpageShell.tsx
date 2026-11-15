'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useCleanSavar } from '@/context/CleanSavarContext';
import { checkRouteAccess } from '@/lib/rbac';
import { RouteAccessDeniedCard } from '@/components/RouteAccessDeniedCard';

export function SubpageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, authReady } = useCleanSavar();

  if (!authReady) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="cs-card p-6 sm:p-8">
          <div className="h-6 w-52 animate-pulse rounded bg-[#E2E8F0]" />
          <div className="mt-3 h-4 w-80 animate-pulse rounded bg-[#F1F5F9]" />
        </div>
      </div>
    );
  }

  const access = checkRouteAccess(pathname || '/', profile?.user);

  if (!access.allowed) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <RouteAccessDeniedCard access={access} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {children}
    </div>
  );
}
