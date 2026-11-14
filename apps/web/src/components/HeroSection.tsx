'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Camera,
  CheckCircle2,
  Download,
  MapPin,
  Search,
  Truck,
  Recycle,
} from 'lucide-react';
import { SavarWardMap } from '@/components/savar-ward-map';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RelativeTimeBn } from '@/components/ui/relative-time';
import { useCleanSavar } from '@/context/CleanSavarContext';
import { REPORT_STATUS_META } from '@/lib/savar-data';
import { toBanglaDigits } from '@/lib/utils';

export function HeroSection() {
  const router = useRouter();
  const { wards, publicAnalytics, publicHotspots, isLoadingPublic, publicError, refreshPublicData } =
    useCleanSavar();
  const [selectedWardId, setSelectedWardId] = useState<number | null>(null);
  const [quickCode, setQuickCode] = useState<string>('');

  const filteredHotspots = selectedWardId
    ? publicHotspots.filter((h) => h.ward_id === selectedWardId)
    : publicHotspots;

  function handleQuickTrack(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = quickCode.trim().toUpperCase();
    if (!cleaned) {
      router.push('/track');
      return;
    }
    router.push(`/track?code=${encodeURIComponent(cleaned)}`);
  }

  return (
    <section
      aria-labelledby="hero-heading"
      className="border-b border-[#E2E8F0] bg-gradient-to-b from-[#F0FDF4]/85 via-[#F8FAFC] to-[#F8FAFC] py-8 sm:py-12"
    >
      <div className="mx-auto max-w-6xl space-y-8 px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          <div className="min-w-0 space-y-5 lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#BBF7D0] bg-white px-3 py-1 text-xs font-semibold text-[#14532D]">
              <span className="h-2 w-2 rounded-full bg-[#15803D]" aria-hidden="true" />
              সাভার পৌরসভা ও ৬ ইউনিয়ন · পোস্টজিআইএস ভিত্তিক বর্জ্য সমন্বয়
            </div>

            <h1
              id="hero-heading"
              className="text-3xl font-bold tracking-tight text-[#0F172A] sm:text-4xl sm:leading-tight"
            >
              পরিচ্ছন্ন সাভার গড়তে{' '}
              <span className="text-[#15803D]">নিয়মিত পিকআপ ও দ্রুত ময়লা অপসারণ</span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-[#475569]">
              বাড়ির দৈনন্দিন ময়লার ভ্যান বুক করুন, রাস্তার পাশের খোলা ময়লার ছবি জিপিএসসহ পাঠান এবং ট্র্যাকিং কোড দিয়ে প্রতিটি ধাপের অবস্থা সরাসরি দেখুন।
            </p>

            {/* Primary CTAs */}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/pickup"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#15803D] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#14532D]"
              >
                <Truck className="h-4 w-4" aria-hidden="true" />
                পিকআপ অনুরোধ করুন
              </Link>
              <Link
                href="/report"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#CBD5E1] bg-white px-5 py-2.5 text-sm font-semibold text-[#0F172A] shadow-xs transition-colors hover:bg-[#F8FAFC]"
              >
                <Camera className="h-4 w-4 text-[#15803D]" aria-hidden="true" />
                ময়লার স্তূপ রিপোর্ট করুন
              </Link>
              <Link
                href="/download"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-2.5 text-sm font-semibold text-[#15803D] shadow-xs transition-colors hover:bg-[#DCFCE7]"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                মোবাইল অ্যাপ (APK)
              </Link>
            </div>

            {/* Quick Tracking Lookup */}
            <form
              onSubmit={handleQuickTrack}
              aria-label="দ্রুত ট্র্যাকিং কোড খুঁজুন"
              className="cs-card p-3 sm:p-3.5"
            >
              <label
                htmlFor="hero-track-code"
                className="mb-1.5 block text-xs font-semibold text-[#475569]"
              >
                রসিদ বা অভিযোগের ট্র্যাকিং কোড থাকলে সরাসরি অবস্থা দেখুন
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="hero-track-code"
                  type="text"
                  value={quickCode}
                  onChange={(e) => setQuickCode(e.target.value)}
                  placeholder="যেমন: CS-PK-02041 বা CS-DR-01088"
                  className="cs-input flex-1 font-metric"
                />
                <Button type="submit" variant="tint" size="md" className="shrink-0">
                  <Search className="h-4 w-4" aria-hidden="true" />
                  অবস্থা দেখুন
                </Button>
              </div>
            </form>

            {/* Live Analytics KPIs */}
            {publicError ? (
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-xs text-[#B91C1C]"
              >
                <span>{publicError}</span>
                <button
                  type="button"
                  onClick={() => void refreshPublicData()}
                  className="font-semibold underline"
                >
                  আবার চেষ্টা করুন
                </button>
              </div>
            ) : isLoadingPublic ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-busy="true">
                {[1, 2, 3, 4].map((idx) => (
                  <div key={idx} className="cs-card h-20 animate-pulse bg-white p-3" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="cs-card p-3.5">
                  <p className="text-xs font-medium text-[#475569]">মোট পিকআপ</p>
                  <p className="mt-1 font-metric text-xl font-bold text-[#0F172A]">
                    {toBanglaDigits(publicAnalytics.total_pickups)}
                  </p>
                  <p className="text-[11px] text-[#14532D]">
                    {toBanglaDigits(publicAnalytics.pending_pickups)}টি চলমান
                  </p>
                </div>
                <div className="cs-card p-3.5">
                  <p className="text-xs font-medium text-[#475569]">খোলা হটস্পট</p>
                  <p className="mt-1 font-metric text-xl font-bold text-[#0F172A]">
                    {toBanglaDigits(publicAnalytics.open_reports)}
                  </p>
                  <p className="text-[11px] text-[#475569]">
                    {toBanglaDigits(publicAnalytics.cleared_reports)}টি পরিষ্কার
                  </p>
                </div>
                <div className="cs-card p-3.5">
                  <p className="text-xs font-medium text-[#475569]">সমাধান হার</p>
                  <p className="mt-1 font-metric text-xl font-bold text-[#15803D]">
                    {toBanglaDigits(Math.round(publicAnalytics.resolution_rate_percent))}%
                  </p>
                  <p className="inline-flex items-center gap-1 text-[11px] text-[#475569]">
                    <CheckCircle2 className="h-3 w-3 text-[#15803D]" aria-hidden="true" />
                    যাচাইকৃত
                  </p>
                </div>
                <div className="cs-card p-3.5">
                  <p className="text-xs font-medium text-[#475569]">সক্রিয় গাড়ি</p>
                  <p className="mt-1 font-metric text-xl font-bold text-[#0F172A]">
                    {toBanglaDigits(publicAnalytics.active_vehicles)}
                  </p>
                  <p className="inline-flex items-center gap-1 text-[11px] text-[#475569]">
                    <Recycle className="h-3 w-3 text-[#15803D]" aria-hidden="true" />
                    {toBanglaDigits(Math.round(publicAnalytics.recyclable_open_kg))} কেজি লট
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live PostGIS Ward Map & Active Hotspots Feed */}
          <div className="min-w-0 space-y-4 lg:col-span-6">
            <SavarWardMap
              wards={wards}
              reports={publicHotspots}
              selectedWardId={selectedWardId}
              onSelectWard={setSelectedWardId}
            />

            <div className="cs-card p-4">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-[#0F172A]">
                  সাম্প্রতিক সক্রিয় হটস্পট ({toBanglaDigits(filteredHotspots.length)}টি)
                </h2>
                <Link
                  href="/report"
                  className="text-xs font-semibold text-[#15803D] hover:underline"
                >
                  নতুন রিপোর্ট করুন →
                </Link>
              </div>
              {filteredHotspots.length === 0 ? (
                <p className="rounded-md bg-[#F8FAFC] px-3 py-4 text-center text-xs text-[#475569]">
                  নির্বাচিত এলাকায় এই মুহূর্তে কোনো খোলা হটস্পট নেই।
                </p>
              ) : (
                <ul className="divide-y divide-[#E2E8F0]">
                  {filteredHotspots.slice(0, 3).map((spot) => {
                    const meta = REPORT_STATUS_META[spot.status];
                    return (
                      <li
                        key={spot.id}
                        className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <Link
                            href={`/track?code=${encodeURIComponent(spot.tracking_code)}`}
                            className="block truncate text-sm font-semibold text-[#0F172A] hover:text-[#15803D]"
                          >
                            {spot.title_bn}
                          </Link>
                          <p className="flex flex-wrap items-center gap-2 text-xs text-[#475569]">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0 text-[#15803D]" aria-hidden="true" />
                              {spot.ward_name_bn}
                            </span>
                            <span className="font-metric">· {spot.tracking_code}</span>
                            <span>
                              · <RelativeTimeBn isoDate={spot.created_at} />
                            </span>
                          </p>
                        </div>
                        <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
