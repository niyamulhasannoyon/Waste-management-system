'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'হোম' },
  { href: '/pickup', label: 'পিকআপ' },
  { href: '/report', label: 'ছবি দিন' },
  { href: '/track', label: 'ট্র্যাক' },
  { href: '/admin', label: 'ড্যাশবোর্ড' },
  { href: '/partner', label: 'পার্টনার' },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[#E2E8F0] bg-white shadow-xs">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[#0F172A] hover:opacity-90"
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

        <nav aria-label="প্রধান নেভিগেশন" className="flex flex-wrap items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-10 items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap',
                  active
                    ? 'border border-[#BBF7D0] bg-[#F0FDF4] text-[#14532D]'
                    : 'border border-transparent text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
