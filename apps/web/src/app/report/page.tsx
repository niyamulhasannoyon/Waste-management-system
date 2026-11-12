'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Loader2,
  LocateFixed,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { useCleanSavar } from '@/context/CleanSavarContext';
import {
  ApiError,
  createDumpReport,
  resolveWardByCoords,
  uploadDumpPhoto,
} from '@/lib/api-client';
import { SAVAR_CENTER, SAVAR_WARDS_SEED, SEVERITY_OPTIONS } from '@/lib/savar-data';
import type { CreateDumpReportResponse, ReportSeverity } from '@/lib/types';
import { normalizeBdPhone, resolveMediaUrl, toBanglaDigits } from '@/lib/utils';

interface UploadedPhotoItem {
  url: string;
  previewSrc: string;
  name: string;
}

export default function ReportPage() {
  const { profile, wards, openAuthModal, announce, refreshPublicData } = useCleanSavar();
  const wardList = wards.length > 0 ? wards : SAVAR_WARDS_SEED;

  const [reporterName, setReporterName] = useState<string>('');
  const [reporterPhone, setReporterPhone] = useState<string>('');
  const [wardId, setWardId] = useState<number>(SAVAR_WARDS_SEED[2]!.id);
  const [titleBn, setTitleBn] = useState<string>('');
  const [landmark, setLandmark] = useState<string>('');
  const [descriptionBn, setDescriptionBn] = useState<string>('');
  const [severity, setSeverity] = useState<ReportSeverity>('high');

  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: SAVAR_WARDS_SEED[2]!.centroid_lat,
    lng: SAVAR_WARDS_SEED[2]!.centroid_lng,
  });
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const [photos, setPhotos] = useState<UploadedPhotoItem[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submittedAttempt, setSubmittedAttempt] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reportReceipt, setReportReceipt] = useState<CreateDumpReportResponse | null>(null);

  useEffect(() => {
    if (!profile) return;
    setReporterName((prev) => prev || profile.user.full_name);
    setReporterPhone((prev) => prev || profile.user.phone);
    if (profile.user.ward_id) {
      const matched = wardList.find((w) => w.id === profile.user.ward_id);
      if (matched) {
        setWardId(matched.id);
        setCoords({ lat: matched.centroid_lat, lng: matched.centroid_lng });
      }
    }
  }, [profile, wardList]);

  function handleWardSelect(nextWardId: number) {
    setWardId(nextWardId);
    const ward = wardList.find((w) => w.id === nextWardId);
    if (ward) {
      setCoords({ lat: ward.centroid_lat, lng: ward.centroid_lng });
    }
  }

  function handleGpsLocate() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('ব্রাউজার GPS সমর্থন করে না; এলাকার তালিকা থেকে ওয়ার্ড নির্বাচন করুন।');
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
          setGpsStatus(`GPS অবস্থান পাওয়া গেছে: ${resolved.name_bn}`);
        } catch {
          setGpsStatus('GPS কোঅর্ডিনেট যুক্ত হয়েছে।');
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        setGpsStatus('GPS পাওয়া যায়নি; নির্বাচিত ওয়ার্ডের কেন্দ্রবিন্দু ব্যবহার করা হবে।');
      },
      { enableHighAccuracy: true, timeout: 7000 },
    );
  }

  async function handlePhotoFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    if (!profile) {
      openAuthModal('ছবি আপলোড করতে অনুগ্রহ করে প্রথমে মোবাইল OTP দিয়ে লগইন করুন।');
      return;
    }

    const remainingSlots = Math.max(0, 5 - photos.length);
    const batch = files.slice(0, remainingSlots);
    if (batch.length === 0) {
      setUploadError('সর্বোচ্চ ৫টি ছবি যুক্ত করা যাবে।');
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    try {
      const uploadedItems: UploadedPhotoItem[] = [];
      for (const file of batch) {
        const res = await uploadDumpPhoto(file);
        const safePreview = resolveMediaUrl(res.url) ?? res.url;
        uploadedItems.push({ url: res.url, previewSrc: safePreview, name: file.name });
      }
      setPhotos((prev) => [...prev, ...uploadedItems]);
      announce(`${toBanglaDigits(uploadedItems.length)}টি ছবি আপলোড সম্পন্ন হয়েছে।`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        openAuthModal('ছবি আপলোডের জন্য পুনরায় মোবাইল OTP লগইন করুন।');
      } else {
        setUploadError(
          err instanceof ApiError
            ? err.messageBn
            : 'ছবি আপলোড করা যায়নি (JPEG/PNG/WebP, সর্বোচ্চ ৫ মেগাবাইট)।',
        );
      }
    } finally {
      setIsUploading(false);
    }
  }

  const showErr = (k: string) => submittedAttempt || Boolean(touched[k]);
  const titleError =
    showErr('title') && titleBn.trim().length < 4
      ? 'ময়লার স্তূপ সম্পর্কে সংক্ষিপ্ত শিরোনাম লিখুন।'
      : undefined;
  const landmarkError =
    showErr('landmark') && landmark.trim().length < 3
      ? 'সঠিক স্থান বা নিকটবর্তী পরিচিত স্থাপনা লিখুন।'
      : undefined;
  const descError =
    showErr('description') && descriptionBn.trim().length < 8
      ? 'অবস্থার সংক্ষিপ্ত বিবরণ লিখুন (কমপক্ষে ৮ অক্ষর)।'
      : undefined;
  const normalizedPhone = normalizeBdPhone(reporterPhone);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittedAttempt(true);
    setSubmitError(null);

    if (
      titleBn.trim().length < 4 ||
      landmark.trim().length < 3 ||
      descriptionBn.trim().length < 8
    ) {
      return;
    }

    if (!profile) {
      openAuthModal('অভিযোগ জমা দিতে মোবাইল OTP লগইন করুন।');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createDumpReport({
        reporter_name: reporterName.trim() || undefined,
        reporter_phone: normalizedPhone || undefined,
        ward_id: wardId,
        title_bn: titleBn.trim(),
        description_bn: descriptionBn.trim(),
        landmark: landmark.trim(),
        severity,
        lat: coords.lat || SAVAR_CENTER.lat,
        lng: coords.lng || SAVAR_CENTER.lng,
        photo_urls: photos.map((p) => p.url),
      });
      setReportReceipt(created);
      announce(`ময়লার রিপোর্ট জমা হয়েছে। কোড ${created.report.tracking_code}`);
      await refreshPublicData();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        openAuthModal('সেশন মেয়াদ শেষ — পুনরায় লগইন করুন।');
        return;
      }
      setSubmitError(
        err instanceof ApiError ? err.messageBn : 'রিপোর্ট জমা দেওয়া যায়নি।',
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
            <Camera className="h-4 w-4" aria-hidden="true" />
            জিও-ট্যাগড নাগরিক অভিযোগ
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">
            অবৈধ ময়লার স্তূপ রিপোর্ট করুন
          </h1>
          <p className="max-w-2xl text-sm text-[#475569]">
            সর্বোচ্চ ৫টি ছবি ও জিপিএস অবস্থানসহ অভিযোগ জমা দিন। আপলোডকৃত ছবির EXIF গোপনীয়তা স্বয়ংক্রিয়ভাবে মুছে ফেলা হয়।
          </p>
        </div>
        <Link
          href="/track"
          className="inline-flex min-h-10 items-center rounded-md border border-[#CBD5E1] bg-white px-4 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC]"
        >
          অভিযোগ ট্র্যাক করুন
        </Link>
      </div>

      {!profile ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm text-[#14532D]">
          <p className="flex items-center gap-2 font-medium">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#15803D]" aria-hidden="true" />
            ছবি আপলোড ও রিপোর্ট জমা দেওয়ার জন্য মোবাইল OTP লগইন প্রয়োজন।
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => openAuthModal('অভিযোগ জমা দিতে মোবাইল OTP যাচাই করুন।')}
          >
            OTP লগইন করুন
          </Button>
        </div>
      ) : null}

      {reportReceipt ? (
        <section
          aria-labelledby="report-receipt-title"
          className="cs-card max-w-2xl space-y-4 border-[#BBF7D0] bg-[#F0FDF4]/60 p-6"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[#15803D]" aria-hidden="true" />
            <div>
              <h2 id="report-receipt-title" className="text-lg font-bold text-[#0F172A]">
                অভিযোগ সফলভাবে নথিভুক্ত হয়েছে!
              </h2>
              <p className="mt-0.5 text-sm text-[#334155]">
                ট্র্যাকিং কোড:{' '}
                <strong className="font-metric rounded bg-white px-2 py-0.5 text-[#14532D]">
                  {reportReceipt.report.tracking_code}
                </strong>
              </p>
            </div>
          </div>

          {reportReceipt.is_duplicate ? (
            <div className="flex items-start gap-2 rounded-md border border-[#FDE68A] bg-[#FFFBEB] p-3 text-xs text-[#92400E]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                কাছাকাছি এলাকায় (প্রায়{' '}
                <strong className="font-metric">
                  {toBanglaDigits(Math.round(reportReceipt.duplicate_distance_meters ?? 25))}
                </strong>{' '}
                মিটারের মধ্যে) পূর্বের একটি সক্রিয় অভিযোগ রয়েছে। আপনার রিপোর্টটি অগ্রাধিকার বৃদ্ধির জন্য সেটির সাথে যুক্ত করা হয়েছে।
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/track?code=${encodeURIComponent(reportReceipt.report.tracking_code)}`}
              className="inline-flex min-h-11 items-center rounded-md bg-[#15803D] px-4 text-sm font-semibold text-white hover:bg-[#14532D]"
            >
              অভিযোগের অগ্রগতি দেখুন
            </Link>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setReportReceipt(null);
                setTitleBn('');
                setLandmark('');
                setDescriptionBn('');
                setPhotos([]);
                setSubmittedAttempt(false);
                setTouched({});
              }}
            >
              নতুন রিপোর্ট জমা দিন
            </Button>
          </div>
        </section>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="cs-card max-w-3xl space-y-5 p-5 sm:p-6">
          {submitError ? (
            <div
              role="alert"
              className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-medium text-[#B91C1C]"
            >
              {submitError}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="rep-name" label="রিপোর্টকারীর নাম">
              {(a11y) => (
                <input
                  {...a11y}
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="আপনার নাম"
                  className="cs-input"
                />
              )}
            </FormField>

            <FormField id="rep-phone" label="মোবাইল নম্বর" hint="আপডেট জানাতে ব্যবহৃত হবে">
              {(a11y) => (
                <input
                  {...a11y}
                  type="tel"
                  inputMode="tel"
                  value={reporterPhone}
                  onChange={(e) => setReporterPhone(e.target.value)}
                  placeholder="01715-883210"
                  className="cs-input font-metric"
                />
              )}
            </FormField>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="rep-ward" className="text-sm font-medium text-[#0F172A]">
                সাভার ওয়ার্ড বা ইউনিয়ন ও GPS কোঅর্ডিনেট <span className="text-[#B91C1C]">*</span>
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
                বর্তমান GPS নিন
              </Button>
            </div>
            <select
              id="rep-ward"
              value={wardId}
              onChange={(e) => handleWardSelect(Number(e.target.value))}
              className="cs-input"
            >
              {wardList.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name_bn}
                </option>
              ))}
            </select>
            <p className="font-metric text-xs text-[#475569]">
              অবস্থান: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              {gpsStatus ? ` — ${gpsStatus}` : ''}
            </p>
          </div>

          <FormField
            id="rep-title"
            label="সমস্যার শিরোনাম"
            required
            hint="সংক্ষেপে লিখুন (যেমন: থানা রোড কাঁচাবাজার মোড়ে স্তূপ)"
            error={titleError}
          >
            {(a11y) => (
              <input
                {...a11y}
                type="text"
                required
                minLength={4}
                value={titleBn}
                data-touched={touched.title ? 'true' : 'false'}
                onChange={(e) => setTitleBn(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, title: true }))}
                className="cs-input"
              />
            )}
          </FormField>

          <FormField
            id="rep-landmark"
            label="নির্দিষ্ট স্থান বা ল্যান্ডমার্ক"
            required
            hint="পরিচ্ছন্নতা টিমের খুঁজে পাওয়ার জন্য নিকটবর্তী পরিচিত জায়গা"
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

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium text-[#0F172A]">জরুরি মাত্রা</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {SEVERITY_OPTIONS.map((opt) => {
                const selected = severity === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${
                      selected
                        ? 'border-[#15803D] bg-[#F0FDF4] text-[#14532D]'
                        : 'border-[#CBD5E1] bg-white text-[#475569]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report-severity"
                      value={opt.value}
                      checked={selected}
                      onChange={() => setSeverity(opt.value)}
                      className="accent-[#15803D]"
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <FormField
            id="rep-desc"
            label="বিস্তারিত বিবরণ"
            required
            hint="কতদিন ধরে জমা আছে এবং কী ধরনের আবর্জনা (কমপক্ষে ৮ অক্ষর)"
            error={descError}
          >
            {(a11y) => (
              <textarea
                {...a11y}
                rows={3}
                required
                minLength={8}
                value={descriptionBn}
                data-touched={touched.description ? 'true' : 'false'}
                onChange={(e) => setDescriptionBn(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, description: true }))}
                className="cs-input min-h-24 py-2"
              />
            )}
          </FormField>

          {/* Multi-photo Upload (max 5 photos) */}
          <div className="space-y-2.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label htmlFor="rep-photos" className="text-sm font-semibold text-[#0F172A]">
                  ঘটনাস্থলের ছবি আপলোড ({toBanglaDigits(photos.length)}/৫)
                </label>
                <p className="text-xs text-[#475569]">
                  JPEG, PNG বা WebP · প্রতি ছবি সর্বোচ্চ ৫ মেগাবাইট
                </p>
              </div>

              <label
                htmlFor="rep-photos"
                className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-[#15803D] bg-white px-3.5 text-xs font-semibold text-[#14532D] hover:bg-[#F0FDF4] ${
                  photos.length >= 5 || isUploading ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="h-4 w-4" aria-hidden="true" />
                )}
                {isUploading ? 'আপলোড হচ্ছে...' : 'ছবি যুক্ত করুন'}
              </label>
              <input
                id="rep-photos"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handlePhotoFiles}
                className="sr-only"
              />
            </div>

            {uploadError ? (
              <p role="alert" className="text-xs font-medium text-[#B91C1C]">
                {uploadError}
              </p>
            ) : null}

            {photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-5">
                {photos.map((photo, idx) => (
                  <div
                    key={photo.url}
                    className="group relative overflow-hidden rounded-md border border-[#CBD5E1] bg-white"
                  >
                    <Image
                      src={photo.previewSrc}
                      alt={`আপলোডকৃত ময়লার ছবি ${toBanglaDigits(idx + 1)}`}
                      width={160}
                      height={96}
                      unoptimized
                      className="h-24 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPhotos((prev) => prev.filter((item) => item.url !== photo.url))
                      }
                      aria-label={`ছবি ${toBanglaDigits(idx + 1)} মুছে ফেলুন`}
                      className="absolute top-1 right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#0F172A]/80 text-white hover:bg-[#B91C1C]"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSubmitting || isUploading}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                রিপোর্ট জমা হচ্ছে...
              </>
            ) : (
              'অভিযোগ জমা দিন'
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
