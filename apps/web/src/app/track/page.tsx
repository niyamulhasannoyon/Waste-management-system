'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock, Search, Truck } from 'lucide-react';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trackByCodeOrPhone } from '@/lib/api-client';
import { PICKUP_STATUS_META, REPORT_STATUS_META } from '@/lib/savar-data';
import type { TrackedResult } from '@/lib/types';

function TrackContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';

  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<TrackedResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const runSearch = async (target: string) => {
    const clean = target.trim();
    if (!clean) return;
    setLoading(true);
    setSearched(true);
    try {
      const found = await trackByCodeOrPhone(clean);
      setResult(found);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      void runSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void runSearch(query);
  };

  const statusMeta = result?.pickup
    ? PICKUP_STATUS_META[result.pickup.status]
    : result?.report
      ? REPORT_STATUS_META[result.report.status]
      : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1.5">
        <h1 id="main-content" tabIndex={-1} className="text-2xl font-bold text-[#0F172A]">
          রিকোয়েস্ট ও রিপোর্টের অবস্থা দেখুন
        </h1>
        <p className="text-sm text-[#475569]">
          পিকআপ বা ছবির রিপোর্টের ট্র্যাকিং কোড অথবা আপনার মোবাইল নম্বর দিয়ে সর্বশেষ আপডেট জানুন।
        </p>
      </div>

      <section className="cs-card p-5">
        <search>
          <form onSubmit={handleSubmit} className="space-y-3">
            <label htmlFor="track-query" className="block text-sm font-semibold text-[#0F172A]">
              ট্র্যাকিং কোড বা মোবাইল নম্বর
            </label>
            <span id="track-hint" className="block text-xs text-[#475569]">
              উদাহরণ: <span lang="en" className="font-metric">CS-PK-2041</span>,{' '}
              <span lang="en" className="font-metric">CS-DR-1088</span> অথবা{' '}
              <span lang="en" className="font-metric">01715883210</span>
            </span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="track-query"
                name="q"
                type="search"
                aria-describedby="track-hint"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="cs-input font-metric flex-1"
              />
              <Button type="submit" variant="primary" size="lg" disabled={loading}>
                <Search className="h-4 w-4" aria-hidden="true" />
                <span>{loading ? 'খোঁজা হচ্ছে...' : 'অবস্থা দেখুন'}</span>
              </Button>
            </div>
          </form>
        </search>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#475569]">
          <span>নমুনা কোড:</span>
          {['CS-PK-2041', 'CS-PK-2042', 'CS-DR-1088'].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setQuery(sample);
                void runSearch(sample);
              }}
              className="font-metric rounded border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 font-medium text-[#0F172A] hover:border-[#15803D] hover:bg-[#F0FDF4]"
            >
              {sample}
            </button>
          ))}
        </div>
      </section>

      {searched && !loading && !result ? (
        <div role="status" className="cs-card p-6 text-center text-sm text-[#475569]">
          এই কোড বা মোবাইল নম্বরের বিপরীতে কোনো রিকোয়েস্ট পাওয়া যায়নি। অনুগ্রহ করে কোডটি মিলিয়ে নিন।
        </div>
      ) : null}

      {result ? (
        <section aria-live="polite" className="cs-card space-y-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E2E8F0] pb-4">
            <div>
              <span lang="en" className="font-metric text-xs font-semibold text-[#475569]">
                {result.pickup?.tracking_code ?? result.report?.tracking_code}
              </span>
              <h2 className="mt-1 text-lg font-bold text-[#0F172A]">
                {result.pickup
                  ? `${result.pickup.citizen_name} — ${result.pickup.address_line}`
                  : result.report?.title_bn}
              </h2>
              <p className="text-xs text-[#475569]">
                {result.pickup?.ward_name_bn ?? result.report?.ward_name_bn}
              </p>
            </div>
            {statusMeta ? <StatusBadge tone={statusMeta.tone}>{statusMeta.label}</StatusBadge> : null}
          </div>

          {(result.pickup?.assigned_vehicle_code ?? result.report?.assigned_vehicle_code) ? (
            <div className="flex items-center gap-2.5 rounded-md border border-[#BAE6FD] bg-[#F0F9FF] px-4 py-3 text-sm text-[#0369A1]">
              <Truck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                নির্ধারিত সংগ্রহ গাড়ি:{' '}
                <strong lang="en" className="font-metric">
                  {result.pickup?.assigned_vehicle_code ?? result.report?.assigned_vehicle_code}
                </strong>
              </span>
            </div>
          ) : null}

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#0F172A]">ধাপে ধাপে অগ্রগতি</h3>
            <ol className="space-y-3">
              {result.events.map((ev, index) => {
                const isLast = index === result.events.length - 1;
                return (
                  <li
                    key={ev.id}
                    className="flex items-start gap-3 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3"
                  >
                    {isLast && (ev.to_status === 'collected' || ev.to_status === 'cleared') ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#15803D]" aria-hidden="true" />
                    ) : (
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#0284C7]" aria-hidden="true" />
                    )}
                    <div className="flex-1 text-sm">
                      <p className="font-semibold text-[#0F172A]">{ev.note_bn}</p>
                      <p className="mt-0.5 text-xs text-[#475569]">
                        {ev.actor_label} ·{' '}
                        <span lang="en" className="font-metric">
                          {new Date(ev.created_at).toLocaleString('en-GB', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl cs-card p-6 text-sm text-[#475569]">
          তথ্য লোড হচ্ছে...
        </div>
      }
    >
      <TrackContent />
    </Suspense>
  );
}
