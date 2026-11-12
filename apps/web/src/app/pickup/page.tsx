'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  Loader2,
  LocateFixed,
  RefreshCw,
  Repeat,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { useCleanSavar } from '@/context/CleanSavarContext';
import {
  ApiError,
  createPickup,
  fetchPickups,
  resolveWardByCoords,
} from '@/lib/api-client';
import {
  PICKUP_STATUS_META,
  PREFERRED_DAY_OPTIONS,
  SAVAR_CENTER,
  SAVAR_WARDS_SEED,
  SCHEDULE_TYPE_OPTIONS,
  SLOT_OPTIONS,
  WASTE_TYPE_OPTIONS,
} from '@/lib/savar-data';
import type {
  PickupRequestRecord,
  PickupSlot,
  PreferredDay,
  ScheduleType,
  WasteType,
} from '@/lib/types';
import { normalizeBdPhone, toBanglaDigits } from '@/lib/utils';

function PickupPageContent() {
  const searchParams = useSearchParams();
  const { profile, wards, openAuthModal, announce, refreshPublicData } = useCleanSavar();

  const wardList = wards.length > 0 ? wards : SAVAR_WARDS_SEED;
  const initialWardParam = Number(searchParams.get('ward'));
  const validInitialWard = wardList.some((w) => w.id === initialWardParam)
    ? initialWardParam
    : SAVAR_WARDS_SEED[2]!.id;
  const initialWaste = (searchParams.get('waste') as WasteType) || 'household';

  const [citizenName, setCitizenName] = useState<string>('');
  const [citizenPhone, setCitizenPhone] = useState<string>('');
  const [wardId, setWardId] = useState<number>(validInitialWard);
  const [addressLine, setAddressLine] = useState<string>('');
  const [landmark, setLandmark] = useState<string>('');
  const [wasteType, setWasteType] = useState<WasteType>(
    ['household', 'organic', 'recyclable', 'bulky'].includes(initialWaste)
      ? initialWaste
      : 'household',
  );
  const [slot, setSlot] = useState<PickupSlot>('morning');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('one_time');
  const [preferredDay, setPreferredDay] = useState<PreferredDay>('friday');
  const [estimatedBags, setEstimatedBags] = useState<number>(2);
  const [notes, setNotes] = useState<string>('');

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submittedAttempt, setSubmittedAttempt] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdReceipt, setCreatedReceipt] = useState<PickupRequestRecord | null>(null);

  const [recentPickups, setRecentPickups] = useState<PickupRequestRecord[]>([]);
  const [loadingRecent, setLoadingRecent] = useState<boolean>(false);
  const [recentError, setRecentError] = useState<string | null>(null);

  // Sync user defaults once signed in
  useEffect(() => {
    if (!profile) return;
    setCitizenName((prev) => prev || profile.user.full_name);
    setCitizenPhone((prev) => prev || profile.user.phone);
    if (profile.user.ward_id && !searchParams.get('ward')) {
      setWardId(profile.user.ward_id);
    }
  }, [profile, searchParams]);

  useEffect(() => {
    if (!profile) {
      setRecentPickups([]);
      return;
    }
    let active = true;
    async function loadMine() {
      setLoadingRecent(true);
      setRecentError(null);
      try {
        const list = await fetchPickups({ limit: 6 });
        if (active) setRecentPickups(list);
      } catch (err) {
        if (active) {
          setRecentError(
            err instanceof ApiError ? err.messageBn : 'পিকআপ তালিকা লোড করা যায়নি।',
          );
        }
      } finally {
        if (active) setLoadingRecent(false);
      }
    }
    void loadMine();
    return () => {
      active = false;
    };
  }, [profile]);

  async function handleGpsLocate() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('আপনার ব্রাউজার GPS সমর্থন করে না; অনুগ্রহ করে তালিকা থেকে এলাকা নির্বাচন করুন।');
      return;
    }
    setIsLocating(true);
    setGpsStatus(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setCoords({ lat, lng });
        try {
          const resolved = await resolveWardByCoords(lat, lng);
          setWardId(resolved.ward_id);
          setGpsStatus(`অবস্থান শনাক্ত হয়েছে: ${resolved.name_bn}`);
        } catch {
          setGpsStatus('GPS পাওয়া গেছে, তবে ওয়ার্ড তালিকা থেকে সঠিক এলাকা যাচাই করে নিন।');
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        setGpsStatus('লোকেশন অনুমতি পাওয়া যায়নি; তালিকা থেকে ওয়ার্ড/ইউনিয়ন বেছে নিন।');
      },
      { enableHighAccuracy: true, timeout: 7000 },
    );
  }

  const normalizedPhone = normalizeBdPhone(citizenPhone);
  const showErr = (field: string) => submittedAttempt || Boolean(touched[field]);

  const addressError =
    showErr('address') && addressLine.trim().length < 4
      ? 'বাড়ির নম্বর, রাস্তা ও মহল্লার ঠিকানা লিখুন (কমপক্ষে ৪ অক্ষর)।'
      : undefined;
  const landmarkError =
    showErr('landmark') && landmark.trim().length < 3
      ? 'নিকটবর্তী পরিচিত স্থান বা ল্যান্ডমার্ক লিখুন।'
      : undefined;
  const phoneError =
    showErr('phone') && citizenPhone.trim() !== '' && !normalizedPhone
      ? 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01715-883210)।'
      : undefined;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittedAttempt(true);
    setSubmitError(null);

    if (addressLine.trim().length < 4 || landmark.trim().length < 3) {
      return;
    }
    if (citizenPhone.trim() && !normalizedPhone) {
      return;
    }

    if (!profile) {
      openAuthModal('পিকআপ বুকিং জমা দিতে মোবাইল OTP লগইন করুন।');
      return;
    }

    const selectedWard = wardList.find((w) => w.id === wardId);
    setIsSubmitting(true);
    try {
      const created = await createPickup({
        citizen_name: citizenName.trim() || undefined,
        citizen_phone: normalizedPhone || undefined,
        ward_id: wardId,
        address_line: addressLine.trim(),
        landmark: landmark.trim(),
        waste_type: wasteType,
        slot,
        schedule_type: scheduleType,
        preferred_day: scheduleType === 'recurring_weekly' ? preferredDay : null,
        estimated_bags: estimatedBags,
        lat: coords?.lat ?? selectedWard?.centroid_lat ?? SAVAR_CENTER.lat,
        lng: coords?.lng ?? selectedWard?.centroid_lng ?? SAVAR_CENTER.lng,
        notes: notes.trim(),
      });
      setCreatedReceipt(created);
      setRecentPickups((prev) => [created, ...prev]);
      announce(`পিকআপ বুকিং সম্পন্ন হয়েছে। ট্র্যাকিং কোড ${created.tracking_code}`);
      await refreshPublicData();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        openAuthModal('সেশন শেষ হয়েছে — অনুগ্রহ করে পুনরায় OTP লগইন করুন।');
        return;
      }
      setSubmitError(
        err instanceof ApiError ? err.messageBn : 'পিকআপ অনুরোধ পাঠানো যায়নি।',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[#E2E8F0] pb-5 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D]">
            <Truck className="h-4 w-4" aria-hidden="true" />
            ডোর-টু-ডোর বর্জ্য সংগ্রহ
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">
            বাড়ির ময়লা পিকআপ বুকিং
          </h1>
          <p className="max-w-2xl text-sm text-[#475569]">
            একবারের জন্য অথবা প্রতি সপ্তাহের নির্দিষ্ট বারে নিয়মিত সংগ্রহের স্লট নির্ধারণ করুন।
          </p>
        </div>
        <Link
          href="/track"
          className="inline-flex min-h-10 items-center rounded-md border border-[#CBD5E1] bg-white px-4 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC]"
        >
          আগের পিকআপ ট্র্যাক করুন
        </Link>
      </div>

      {!profile ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm text-[#14532D]">
          <p className="flex items-center gap-2 font-medium">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#15803D]" aria-hidden="true" />
            পিকআপ ফরম পূরণ করে জমা দেওয়ার আগে মোবাইল OTP দিয়ে লগইন করতে হবে।
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => openAuthModal('পিকআপ বুকিং জমা দিতে মোবাইল OTP যাচাই করুন।')}
          >
            OTP লগইন করুন
          </Button>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {createdReceipt ? (
            <section
              aria-labelledby="pickup-receipt-title"
              className="cs-card space-y-4 border-[#BBF7D0] bg-[#F0FDF4]/60 p-6"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[#15803D]" aria-hidden="true" />
                <div className="space-y-1">
                  <h2 id="pickup-receipt-title" className="text-lg font-bold text-[#0F172A]">
                    পিকআপ অনুরোধ সফলভাবে গৃহীত হয়েছে!
                  </h2>
                  <p className="text-sm text-[#334155]">
                    আপনার ট্র্যাকিং কোড:{' '}
                    <strong className="font-metric rounded bg-white px-2 py-0.5 text-[#14532D]">
                      {createdReceipt.tracking_code}
                    </strong>
                  </p>
                </div>
              </div>

              <dl className="grid gap-2 rounded-md border border-[#E2E8F0] bg-white p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-[#475569]">এলাকা</dt>
                  <dd className="font-semibold text-[#0F172A]">{createdReceipt.ward_name_bn}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#475569]">সময়সূচি</dt>
                  <dd className="font-semibold text-[#0F172A]">
                    {createdReceipt.schedule_type === 'recurring_weekly'
                      ? `সাপ্তাহিক (${PREFERRED_DAY_OPTIONS.find((d) => d.value === createdReceipt.preferred_day)?.label ?? 'নির্ধারিত বার'})`
                      : 'একবার পিকআপ'}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-[#475569]">ঠিকানা ও ল্যান্ডমার্ক</dt>
                  <dd className="font-medium text-[#0F172A]">
                    {createdReceipt.address_line} — {createdReceipt.landmark}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/track?code=${encodeURIComponent(createdReceipt.tracking_code)}`}
                  className="inline-flex min-h-11 items-center rounded-md bg-[#15803D] px-4 text-sm font-semibold text-white hover:bg-[#14532D]"
                >
                  লাইভ অবস্থা ট্র্যাক করুন
                </Link>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setCreatedReceipt(null);
                    setAddressLine('');
                    setLandmark('');
                    setNotes('');
                    setSubmittedAttempt(false);
                    setTouched({});
                  }}
                >
                  আরেকটি পিকআপ অনুরোধ করুন
                </Button>
              </div>
            </section>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="cs-card space-y-5 p-5 sm:p-6">
              {submitError ? (
                <div
                  role="alert"
                  className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-medium text-[#B91C1C]"
                >
                  {submitError}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="pk-name" label="নাগরিকের নাম" hint="লগইন করা প্রোফাইল থেকে নেওয়া হয়">
                  {(a11y) => (
                    <input
                      {...a11y}
                      type="text"
                      autoComplete="name"
                      placeholder="আপনার নাম"
                      value={citizenName}
                      onChange={(e) => setCitizenName(e.target.value)}
                      className="cs-input"
                    />
                  )}
                </FormField>

                <FormField
                  id="pk-phone"
                  label="যোগাযোগের মোবাইল নম্বর"
                  hint="প্রয়োজনে সংগ্রহকারী কল করবেন"
                  error={phoneError}
                >
                  {(a11y) => (
                    <input
                      {...a11y}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="01715-883210"
                      value={citizenPhone}
                      data-touched={touched.phone ? 'true' : 'false'}
                      onChange={(e) => setCitizenPhone(e.target.value)}
                      onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                      className="cs-input font-metric"
                    />
                  )}
                </FormField>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="pk-ward" className="text-sm font-medium text-[#0F172A]">
                    সাভার ওয়ার্ড বা ইউনিয়ন <span className="text-[#B91C1C]">*</span>
                  </label>
                  <Button
                    type="button"
                    variant="tint"
                    size="sm"
                    onClick={handleGpsLocate}
                    disabled={isLocating}
                  >
                    {isLocating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    GPS দিয়ে এলাকা ধরুন
                  </Button>
                </div>
                <select
                  id="pk-ward"
                  value={wardId}
                  onChange={(e) => setWardId(Number(e.target.value))}
                  className="cs-input"
                >
                  {wardList.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name_bn}
                    </option>
                  ))}
                </select>
                {gpsStatus ? (
                  <p className="text-xs font-medium text-[#14532D]">{gpsStatus}</p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id="pk-address"
                  label="বাসা / রোড ও মহল্লার ঠিকানা"
                  required
                  hint="যেমন: বাসা ১৪, রোড ২, ব্যাংক টাউন"
                  error={addressError}
                >
                  {(a11y) => (
                    <input
                      {...a11y}
                      type="text"
                      required
                      minLength={4}
                      value={addressLine}
                      data-touched={touched.address ? 'true' : 'false'}
                      onChange={(e) => setAddressLine(e.target.value)}
                      onBlur={() => setTouched((prev) => ({ ...prev, address: true }))}
                      className="cs-input"
                    />
                  )}
                </FormField>

                <FormField
                  id="pk-landmark"
                  label="নিকটবর্তী পরিচিত স্থান"
                  required
                  hint="সংগ্রহকারীর চেনার সুবিধার্থে"
                  error={landmarkError}
                >
                  {(a11y) => (
                    <input
                      {...a11y}
                      type="text"
                      required
                      minLength={3}
                      value={landmark}
                      data-touched={touched.landmark ? 'true' : 'false'}
                      onChange={(e) => setLandmark(e.target.value)}
                      onBlur={() => setTouched((prev) => ({ ...prev, landmark: true }))}
                      className="cs-input"
                    />
                  )}
                </FormField>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="pk-waste" label="বর্জ্যের ধরন" required>
                  {(a11y) => (
                    <select
                      {...a11y}
                      value={wasteType}
                      onChange={(e) => setWasteType(e.target.value as WasteType)}
                      className="cs-input"
                    >
                      {WASTE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label} ({opt.hint})
                        </option>
                      ))}
                    </select>
                  )}
                </FormField>

                <FormField id="pk-slot" label="পছন্দের সময় শিফট" required>
                  {(a11y) => (
                    <select
                      {...a11y}
                      value={slot}
                      onChange={(e) => setSlot(e.target.value as PickupSlot)}
                      className="cs-input"
                    >
                      {SLOT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label} ({opt.window})
                        </option>
                      ))}
                    </select>
                  )}
                </FormField>
              </div>

              {/* Recurrence Frequency & Preferred Day */}
              <div className="space-y-3 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
                  <Repeat className="h-4 w-4 text-[#15803D]" aria-hidden="true" />
                  পিকআপ সময়সূচির ধরন
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SCHEDULE_TYPE_OPTIONS.map((opt) => {
                    const selected = scheduleType === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                          selected
                            ? 'border-[#15803D] bg-[#F0FDF4] text-[#14532D]'
                            : 'border-[#CBD5E1] bg-white text-[#475569]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="pickup-schedule-type"
                          value={opt.value}
                          checked={selected}
                          onChange={() => setScheduleType(opt.value)}
                          className="accent-[#15803D]"
                        />
                        {opt.label}
                      </label>
                    );
                  })}
                </div>

                {scheduleType === 'recurring_weekly' ? (
                  <FormField
                    id="pk-preferred-day"
                    label="প্রতি সপ্তাহে সংগ্রহের বার নির্বাচন করুন"
                    required
                    hint="সাপ্তাহিক পিকআপের জন্য নির্দিষ্ট বার আবশ্যক"
                  >
                    {(a11y) => (
                      <select
                        {...a11y}
                        value={preferredDay}
                        onChange={(e) => setPreferredDay(e.target.value as PreferredDay)}
                        className="cs-input"
                      >
                        {PREFERRED_DAY_OPTIONS.map((d) => (
                          <option key={d.value} value={d.value}>
                            প্রতি {d.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </FormField>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  id="pk-bags"
                  label="ব্যাগের আনুমানিক সংখ্যা"
                  hint="১ থেকে ৫০ ব্যাগ"
                >
                  {(a11y) => (
                    <input
                      {...a11y}
                      type="number"
                      min={1}
                      max={50}
                      value={estimatedBags}
                      onChange={(e) =>
                        setEstimatedBags(Math.max(1, Math.min(50, Number(e.target.value) || 1)))
                      }
                      className="cs-input font-metric"
                    />
                  )}
                </FormField>

                <div className="sm:col-span-2">
                  <FormField
                    id="pk-notes"
                    label="অতিরিক্ত নির্দেশনা (ঐচ্ছিক)"
                    hint="গেট নম্বর বা সংগ্রহকারীর জন্য বিশেষ বার্তা"
                  >
                    {(a11y) => (
                      <input
                        {...a11y}
                        type="text"
                        maxLength={250}
                        placeholder="যেমন: মূল গেটের বাম পাশে ব্যাগ রাখা থাকবে"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="cs-input"
                      />
                    )}
                  </FormField>
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    অনুরোধ পাঠানো হচ্ছে...
                  </>
                ) : (
                  'পিকআপ বুকিং নিশ্চিত করুন'
                )}
              </Button>
            </form>
          )}
        </div>

        {/* Side Column: Recent Authenticated Pickups + Tips */}
        <aside className="space-y-4 lg:col-span-5">
          <section className="cs-card space-y-3 p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-[#0F172A]">আমার সাম্প্রতিক পিকআপ</h2>
              {profile ? (
                <button
                  type="button"
                  onClick={async () => {
                    setLoadingRecent(true);
                    setRecentError(null);
                    try {
                      setRecentPickups(await fetchPickups({ limit: 6 }));
                    } catch (err) {
                      setRecentError(
                        err instanceof ApiError
                          ? err.messageBn
                          : 'সাম্প্রতিক পিকআপ তালিকা রিফ্রেশ করা যায়নি।',
                      );
                    } finally {
                      setLoadingRecent(false);
                    }
                  }}
                  className="inline-flex min-h-9 items-center gap-1 rounded px-2 text-xs font-semibold text-[#15803D] hover:bg-[#F0FDF4] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15803D]"
                >
                  <RefreshCw className="h-3 w-3" aria-hidden="true" />
                  রিফ্রেশ
                </button>
              ) : null}
            </div>

            {!profile ? (
              <p className="rounded-md bg-[#F8FAFC] p-4 text-xs text-[#475569]">
                আপনার আগের পিকআপ অনুরোধগুলো দেখতে মোবাইল OTP দিয়ে লগইন করুন।
              </p>
            ) : loadingRecent ? (
              <div className="space-y-2">
                <div className="h-14 animate-pulse rounded bg-[#F1F5F9]" />
                <div className="h-14 animate-pulse rounded bg-[#F1F5F9]" />
              </div>
            ) : recentError ? (
              <p className="rounded-md bg-[#FEF2F2] p-3 text-xs text-[#B91C1C]">{recentError}</p>
            ) : recentPickups.length === 0 ? (
              <p className="rounded-md border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4 text-center text-xs text-[#475569]">
                এখনো কোনো পিকআপ অনুরোধ করা হয়নি।
              </p>
            ) : (
              <ul className="divide-y divide-[#E2E8F0]">
                {recentPickups.map((item) => {
                  const meta = PICKUP_STATUS_META[item.status];
                  return (
                    <li key={item.id} className="flex items-start justify-between gap-2 py-2.5">
                      <div className="min-w-0">
                        <Link
                          href={`/track?code=${encodeURIComponent(item.tracking_code)}`}
                          className="font-metric text-xs font-bold text-[#15803D] hover:underline"
                        >
                          {item.tracking_code}
                        </Link>
                        <p className="truncate text-xs font-medium text-[#0F172A]">
                          {item.address_line}
                        </p>
                        <p className="text-[11px] text-[#475569]">
                          {item.ward_name_bn} · {toBanglaDigits(item.estimated_bags)} ব্যাগ
                        </p>
                      </div>
                      <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

export default function PickupPage() {
  return (
    <Suspense
      fallback={
        <div className="cs-card p-6">
          <div className="h-6 w-48 animate-pulse rounded bg-[#E2E8F0]" />
        </div>
      }
    >
      <PickupPageContent />
    </Suspense>
  );
}
