'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Camera,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Search,
  Truck,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { useCleanSavar } from '@/context/CleanSavarContext';
import {
  ApiError,
  fetchPickups,
  fetchReports,
  trackByCode,
} from '@/lib/api-client';
import {
  PICKUP_STATUS_META,
  REPORT_STATUS_META,
  WASTE_TYPE_OPTIONS,
} from '@/lib/savar-data';
import type {
  DumpReportRecord,
  PickupRequestRecord,
  TrackedResult,
} from '@/lib/types';
import {
  formatRelativeTimeBn,
  normalizeBdPhone,
  resolveMediaUrl,
  toBanglaDigits,
} from '@/lib/utils';

const DEMO_CODES = ['CS-PK-02041', 'CS-PK-02042', 'CS-DR-01088', 'CS-DR-01089'];

function TrackPageContent() {
  const searchParams = useSearchParams();
  const { profile, announce } = useCleanSavar();

  const initialCode = searchParams.get('code') ?? '';
  const initialPhone = searchParams.get('phone') ?? '';

  const [codeInput, setCodeInput] = useState<string>(initialCode);
  const [phoneInput, setPhoneInput] = useState<string>(initialPhone);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<TrackedResult | null>(null);
  const [offlineNote, setOfflineNote] = useState<boolean>(false);

  const [myPickups, setMyPickups] = useState<PickupRequestRecord[]>([]);
  const [myReports, setMyReports] = useState<DumpReportRecord[]>([]);
  const [loadingMine, setLoadingMine] = useState<boolean>(false);

  const performLookup = useCallback(
    async (code: string, phone?: string) => {
      const cleaned = code.trim().toUpperCase();
      if (!cleaned) {
        setErrorMsg('অনুগ্রহ করে ট্র্যাকিং কোড লিখুন (যেমন: CS-PK-02041)।');
        return;
      }

      const normPhone = phone?.trim() ? normalizeBdPhone(phone) ?? phone.trim() : undefined;
      setIsSearching(true);
      setHasSearched(true);
      setErrorMsg(null);
      setOfflineNote(false);

      try {
        const res = await trackByCode(cleaned, normPhone);
        setResult(res.data);
        setOfflineNote(res.offline);
        if (res.data) {
          announce(`ট্র্যাকিং তথ্য পাওয়া গেছে: ${cleaned}`);
        }
      } catch (err) {
        setResult(null);
        setErrorMsg(
          err instanceof ApiError ? err.messageBn : 'ট্র্যাকিং তথ্য অনুসন্ধান করা যায়নি।',
        );
      } finally {
        setIsSearching(false);
      }
    },
    [announce],
  );

  useEffect(() => {
    if (initialCode) {
      void performLookup(initialCode, initialPhone);
    }
  }, [initialCode, initialPhone, performLookup]);

  useEffect(() => {
    if (!profile) {
      setMyPickups([]);
      setMyReports([]);
      return;
    }
    let active = true;
    async function loadUserActivity() {
      setLoadingMine(true);
      try {
        const [pickups, reports] = await Promise.all([
          fetchPickups({ limit: 5 }),
          fetchReports({ limit: 5 }),
        ]);
        if (active) {
          setMyPickups(pickups);
          setMyReports(reports);
        }
      } catch {
        // Ignore silent fetch errors here; lookup box remains operational.
      } finally {
        if (active) setLoadingMine(false);
      }
    }
    void loadUserActivity();
    return () => {
      active = false;
    };
  }, [profile]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void performLookup(codeInput, phoneInput);
  }

  const activePickup = result?.kind === 'pickup' ? result.pickup : null;
  const activeReport = result?.kind === 'dump_report' ? result.report : null;

  return (
    <div className="space-y-8">
      <div className="space-y-1 border-b border-[#E2E8F0] pb-5">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D]">
          <Search className="h-4 w-4" aria-hidden="true" />
          রিয়েল-টাইম অগ্রগতি যাচাই
        </div>
        <h1 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">
          পিকআপ ও ময়লার অভিযোগ ট্র্যাক করুন
        </h1>
        <p className="max-w-2xl text-sm text-[#475569]">
          রসিদে পাওয়া ট্র্যাকিং কোড (CS-PK-... অথবা CS-DR-...) দিয়ে প্রতিটি ধাপের সময়ভিত্তিক আপডেট দেখুন।
        </p>
      </div>

      {/* Lookup Form */}
      <section aria-labelledby="track-lookup-heading" className="cs-card p-5 sm:p-6">
        <h2 id="track-lookup-heading" className="mb-3 text-base font-bold text-[#0F172A]">
          ট্র্যাকিং কোড দিয়ে খুঁজুন
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
          <div className="min-w-0 md:col-span-5">
            <FormField
              id="track-code-input"
              label="ট্র্যাকিং কোড"
              required
              hint="যেমন: CS-PK-02041 বা CS-DR-01088"
            >
              {(a11y) => (
                <input
                  {...a11y}
                  type="text"
                  required
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="CS-PK-02041"
                  className="cs-input font-metric uppercase"
                />
              )}
            </FormField>
          </div>

          <div className="min-w-0 md:col-span-4">
            <FormField
              id="track-phone-input"
              label="মোবাইল নম্বর (ঐচ্ছিক)"
              hint="লগইন ছাড়া পূর্ণ ঠিকানা যাচাইয়ের জন্য"
            >
              {(a11y) => (
                <input
                  {...a11y}
                  type="tel"
                  inputMode="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="01715-883210"
                  className="cs-input font-metric"
                />
              )}
            </FormField>
          </div>

          <div className="min-w-0 md:col-span-3">
            <Button type="submit" size="md" className="w-full" disabled={isSearching}>
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  খোঁজা হচ্ছে...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" aria-hidden="true" />
                  অবস্থা দেখুন
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-[#475569]">নমুনা কোড:</span>
          {DEMO_CODES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                setCodeInput(code);
                void performLookup(code, phoneInput);
              }}
              className="rounded border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-1 font-metric font-semibold text-[#0F172A] hover:border-[#15803D] hover:bg-[#F0FDF4]"
            >
              {code}
            </button>
          ))}
        </div>
      </section>

      {/* Error / Empty / Result States */}
      {errorMsg ? (
        <div
          role="alert"
          className="rounded-md border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm font-medium text-[#B91C1C]"
        >
          {errorMsg}
        </div>
      ) : null}

      {isSearching ? (
        <div className="cs-card space-y-3 p-6" aria-busy="true">
          <div className="h-6 w-56 animate-pulse rounded bg-[#E2E8F0]" />
          <div className="h-24 animate-pulse rounded bg-[#F1F5F9]" />
        </div>
      ) : hasSearched && !result && !errorMsg ? (
        <div className="cs-card border-dashed p-8 text-center">
          <p className="text-base font-bold text-[#0F172A]">কোনো মিল পাওয়া যায়নি</p>
          <p className="mt-1 text-sm text-[#475569]">
            প্রদত্ত কোডটি সঠিক কিনা পুনরায় পরীক্ষা করুন অথবা নতুন পিকআপ/রিপোর্ট জমা দিন।
          </p>
        </div>
      ) : null}

      {result && (activePickup || activeReport) ? (
        <section aria-labelledby="tracked-entity-title" className="cs-card space-y-6 p-5 sm:p-6">
          {offlineNote ? (
            <div className="rounded-md border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-xs text-[#92400E]">
              অফলাইন নমুনা প্রিভিউ থেকে ফলাফল দেখানো হচ্ছে।
            </div>
          ) : null}

          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E2E8F0] pb-4">
            <div className="space-y-1">
              <span className="font-metric text-xs font-bold text-[#15803D]">
                {activePickup ? activePickup.tracking_code : activeReport?.tracking_code}
              </span>
              <h2 id="tracked-entity-title" className="text-xl font-bold text-[#0F172A]">
                {activePickup ? activePickup.address_line : activeReport?.title_bn}
              </h2>
              <p className="flex flex-wrap items-center gap-3 text-xs text-[#475569]">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-[#15803D]" aria-hidden="true" />
                  {activePickup ? activePickup.ward_name_bn : activeReport?.ward_name_bn}
                </span>
                <span>· ল্যান্ডমার্ক: {activePickup ? activePickup.landmark : activeReport?.landmark}</span>
              </p>
            </div>

            <div>
              {activePickup ? (
                <StatusBadge tone={PICKUP_STATUS_META[activePickup.status].tone}>
                  {PICKUP_STATUS_META[activePickup.status].label}
                </StatusBadge>
              ) : activeReport ? (
                <StatusBadge tone={REPORT_STATUS_META[activeReport.status].tone}>
                  {REPORT_STATUS_META[activeReport.status].label}
                </StatusBadge>
              ) : null}
            </div>
          </div>

          <dl className="grid gap-4 rounded-md bg-[#F8FAFC] p-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-[#475569]">আবেদনকারী / রিপোর্টার</dt>
              <dd className="font-semibold text-[#0F172A]">
                {activePickup ? activePickup.citizen_name : activeReport?.reporter_name}
              </dd>
              <dd className="font-metric text-xs text-[#475569]">
                {activePickup ? activePickup.citizen_phone : activeReport?.reporter_phone}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#475569]">নির্ধারিত সংগ্রহ গাড়ি</dt>
              <dd className="inline-flex items-center gap-1.5 font-metric font-semibold text-[#0F172A]">
                <Truck className="h-4 w-4 text-[#15803D]" aria-hidden="true" />
                {(activePickup
                  ? activePickup.assigned_vehicle_code
                  : activeReport?.assigned_vehicle_code) ?? 'অপেক্ষমাণ'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#475569]">বিবরণ / ধরন</dt>
              <dd className="font-medium text-[#0F172A]">
                {activePickup
                  ? `${WASTE_TYPE_OPTIONS.find((w) => w.value === activePickup.waste_type)?.label ?? activePickup.waste_type} (${toBanglaDigits(activePickup.estimated_bags)} ব্যাগ)`
                  : activeReport?.description_bn}
              </dd>
            </div>
          </dl>

          {/* Uploaded Photos / Proof of Resolution */}
          {activeReport && (activeReport.photo_urls.length > 0 || activeReport.resolved_photo_url) ? (
            <div className="space-y-2">
              <h3 className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0F172A]">
                <Camera className="h-4 w-4 text-[#15803D]" aria-hidden="true" />
                সংযুক্ত ছবি ও পরিচ্ছন্নতার প্রমাণ
              </h3>
              <div className="flex flex-wrap gap-3">
                {activeReport.photo_urls.map((rawUrl, i) => {
                  const src = resolveMediaUrl(rawUrl);
                  if (!src) return null;
                  return (
                    <Image
                      key={`${rawUrl}-${i}`}
                      src={src}
                      alt={`রিপোর্ট ছবি ${toBanglaDigits(i + 1)}`}
                      width={144}
                      height={112}
                      unoptimized
                      className="h-28 w-36 rounded-md border border-[#CBD5E1] object-cover"
                    />
                  );
                })}
                {activeReport.resolved_photo_url ? (
                  (() => {
                    const src = resolveMediaUrl(activeReport.resolved_photo_url);
                    return src ? (
                      <div className="space-y-1">
                        <Image
                          src={src}
                          alt="পরিষ্কার পরবর্তী প্রমাণ ছবি"
                          width={144}
                          height={112}
                          unoptimized
                          className="h-28 w-36 rounded-md border-2 border-[#15803D] object-cover"
                        />
                        <span className="block text-[11px] font-semibold text-[#14532D]">
                          পরিষ্কার পরবর্তী ছবি
                        </span>
                      </div>
                    ) : null;
                  })()
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Audit Status Timeline */}
          <div className="space-y-3">
            <h3 className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0F172A]">
              <Clock className="h-4 w-4 text-[#15803D]" aria-hidden="true" />
              অগ্রগতির ধাপসমূহ (Timeline)
            </h3>
            <ol className="space-y-3 border-l-2 border-[#BBF7D0] pl-4">
              {result.events.map((ev) => (
                <li key={ev.id} className="relative space-y-0.5">
                  <span
                    className="absolute -left-[23px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#15803D] text-white"
                    aria-hidden="true"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                  </span>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#0F172A]">{ev.note_bn}</span>
                    <span className="text-xs text-[#475569]">
                      {formatRelativeTimeBn(ev.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-[#475569]">
                    সম্পাদক: {ev.actor_label} · অবস্থা:{' '}
                    <span className="font-metric font-semibold">{ev.to_status}</span>
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {/* Logged-in User Activity Shortcut */}
      {profile ? (
        <section aria-labelledby="my-activity-heading" className="space-y-3">
          <h2 id="my-activity-heading" className="text-lg font-bold text-[#0F172A]">
            আপনার সাম্প্রতিক পিকআপ ও অভিযোগ
          </h2>
          {loadingMine ? (
            <div className="h-24 animate-pulse rounded-md bg-[#E2E8F0]" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="cs-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#0F172A]">পিকআপ অনুরোধ</h3>
                  <Link href="/pickup" className="text-xs font-semibold text-[#15803D]">
                    + নতুন
                  </Link>
                </div>
                {myPickups.length === 0 ? (
                  <p className="text-xs text-[#475569]">কোনো পিকআপ অনুরোধ নেই।</p>
                ) : (
                  <ul className="divide-y divide-[#E2E8F0] text-xs">
                    {myPickups.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCodeInput(p.tracking_code);
                            void performLookup(p.tracking_code);
                          }}
                          className="text-left hover:text-[#15803D]"
                        >
                          <span className="block font-metric font-bold">{p.tracking_code}</span>
                          <span className="text-[#475569]">{p.address_line}</span>
                        </button>
                        <StatusBadge tone={PICKUP_STATUS_META[p.status].tone}>
                          {PICKUP_STATUS_META[p.status].label}
                        </StatusBadge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="cs-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#0F172A]">ময়লার অভিযোগ</h3>
                  <Link href="/report" className="text-xs font-semibold text-[#15803D]">
                    + নতুন
                  </Link>
                </div>
                {myReports.length === 0 ? (
                  <p className="text-xs text-[#475569]">কোনো অভিযোগ নেই।</p>
                ) : (
                  <ul className="divide-y divide-[#E2E8F0] text-xs">
                    {myReports.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCodeInput(r.tracking_code);
                            void performLookup(r.tracking_code);
                          }}
                          className="text-left hover:text-[#15803D]"
                        >
                          <span className="block font-metric font-bold">{r.tracking_code}</span>
                          <span className="text-[#475569]">{r.title_bn}</span>
                        </button>
                        <StatusBadge tone={REPORT_STATUS_META[r.status].tone}>
                          {REPORT_STATUS_META[r.status].label}
                        </StatusBadge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="cs-card p-6">
          <div className="h-6 w-48 animate-pulse rounded bg-[#E2E8F0]" />
        </div>
      }
    >
      <TrackPageContent />
    </Suspense>
  );
}
