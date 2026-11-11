'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Clock, MapPin, Phone, Search } from 'lucide-react';
import { StatusBadge } from '@/components/ui/badge';
import { useCleanSavar } from '@/context/CleanSavarContext';
import type { ZoneType } from '@/lib/types';
import { toBanglaDigits } from '@/lib/utils';

export function CoverageSection() {
  const { wards, isLoadingPublic } = useCleanSavar();
  const [zoneFilter, setZoneFilter] = useState<'all' | ZoneType>('all');
  const [query, setQuery] = useState<string>('');

  const filteredWards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return wards.filter((w) => {
      if (zoneFilter !== 'all' && w.zone_type !== zoneFilter) return false;
      if (!q) return true;
      return (
        w.name_bn.toLowerCase().includes(q) ||
        w.name_en.toLowerCase().includes(q) ||
        w.zone_label_bn.toLowerCase().includes(q) ||
        w.neighborhoods.some((n) => n.toLowerCase().includes(q))
      );
    });
  }, [wards, zoneFilter, query]);

  return (
    <section
      aria-labelledby="coverage-heading"
      className="border-y border-[#E2E8F0] bg-white py-10 sm:py-12"
    >
      <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 id="coverage-heading" className="text-2xl font-bold text-[#0F172A]">
              সাভার ওয়ার্ড ও ইউনিয়ন কভারেজ ({toBanglaDigits(wards.length)}টি এলাকা)
            </h2>
            <p className="mt-1 text-sm text-[#475569]">
              পৌরসভার ১–৯ নং ওয়ার্ড এবং ৬টি ইউনিয়নের দৈনিক সংগ্রহ সময়সূচি ও সুপারভাইজার তথ্য
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <label htmlFor="coverage-search" className="sr-only">
                মহল্লা বা ওয়ার্ড খুঁজুন
              </label>
              <input
                id="coverage-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="মহল্লা বা ওয়ার্ড খুঁজুন..."
                className="cs-input w-full pl-9 sm:w-60"
              />
              <Search
                className="pointer-events-none absolute top-3.5 left-3 h-4 w-4 text-[#64748B]"
                aria-hidden="true"
              />
            </div>

            <div role="group" aria-label="এলাকার ধরন ফিল্টার" className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'all', label: 'সকল এলাকা' },
                  { id: 'municipality_ward', label: 'ওয়ার্ড (১–৯)' },
                  { id: 'union', label: 'ইউনিয়ন (৬টি)' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={zoneFilter === tab.id}
                  onClick={() => setZoneFilter(tab.id)}
                  className={`min-h-10 rounded-md border px-3 text-xs font-semibold transition-colors ${
                    zoneFilter === tab.id
                      ? 'border-[#15803D] bg-[#F0FDF4] text-[#14532D]'
                      : 'border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoadingPublic ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div key={idx} className="cs-card h-44 animate-pulse p-4" />
            ))}
          </div>
        ) : filteredWards.length === 0 ? (
          <div className="rounded-md border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center">
            <p className="text-sm font-semibold text-[#0F172A]">কোনো ওয়ার্ড বা মহল্লা পাওয়া যায়নি</p>
            <p className="mt-1 text-xs text-[#475569]">
              অনুগ্রহ করে অনুসন্ধান শব্দ পরিবর্তন করুন বা ফিল্টার রিসেট করুন।
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredWards.map((ward) => (
              <article key={ward.id} className="cs-card flex flex-col justify-between p-4">
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-metric text-[11px] font-semibold uppercase tracking-wide text-[#475569]">
                        {ward.code}
                      </span>
                      <h3 className="text-base font-bold text-[#0F172A]">{ward.name_bn}</h3>
                    </div>
                    <StatusBadge
                      tone={ward.zone_type === 'municipality_ward' ? 'success' : 'info'}
                    >
                      {ward.zone_type === 'municipality_ward' ? 'পৌর ওয়ার্ড' : 'ইউনিয়ন'}
                    </StatusBadge>
                  </div>

                  <p className="flex items-start gap-1.5 text-xs text-[#475569]">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#15803D]" aria-hidden="true" />
                    <span>{ward.neighborhoods.join(' · ')}</span>
                  </p>

                  <div className="grid grid-cols-2 gap-2 rounded-md bg-[#F8FAFC] p-2.5 text-xs">
                    <div>
                      <span className="flex items-center gap-1 text-[#475569]">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        সময়সূচি
                      </span>
                      <p className="mt-0.5 font-semibold text-[#0F172A]">{ward.schedule_bn}</p>
                    </div>
                    <div>
                      <span className="text-[#475569]">ফ্রিকোয়েন্সি</span>
                      <p className="mt-0.5 font-semibold text-[#0F172A]">{ward.frequency_bn}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E2E8F0] pt-3 text-xs">
                  <span className="inline-flex items-center gap-1 text-[#475569]">
                    <Phone className="h-3.5 w-3.5 text-[#15803D]" aria-hidden="true" />
                    <span className="font-metric">{ward.supervisor_phone}</span>
                  </span>
                  <Link
                    href={`/pickup?ward=${ward.id}`}
                    className="font-semibold text-[#15803D] hover:underline"
                  >
                    পিকআপ বুকিং →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
