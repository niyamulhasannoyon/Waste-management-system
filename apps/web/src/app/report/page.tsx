'use client';

import Link from 'next/link';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Camera, CheckCircle2, LocateFixed, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { NativeDialog } from '@/components/ui/native-dialog';
import { createDumpReport, resolveWardByCoords, uploadDumpPhoto } from '@/lib/api-client';
import { SAVAR_WARDS_SEED, SEVERITY_OPTIONS } from '@/lib/savar-data';
import type { DumpReportRecord, ReportSeverity } from '@/lib/types';
import { normalizeBdPhone } from '@/lib/utils';

type ReportErrors = Partial<Record<'title_bn' | 'landmark' | 'reporter_phone' | 'photo', string>>;

export default function ReportDumpPage() {
  const formRef = useRef<HTMLFormElement>(null);

  const [titleBn, setTitleBn] = useState('');
  const [landmark, setLandmark] = useState('');
  const [descriptionBn, setDescriptionBn] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [wardId, setWardId] = useState<number>(2);
  const [severity, setSeverity] = useState<ReportSeverity>('high');
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 23.855,
    lng: 90.255,
  });
  const [gpsNotice, setGpsNotice] = useState<string>('সাভার বাজার পিন (ডিফল্ট) — GPS দিয়ে সঠিক করুন');

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<ReportErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [createdReport, setCreatedReport] = useState<DumpReportRecord | null>(null);

  const validateField = (field: keyof ReportErrors, value: string): string | undefined => {
    if (field === 'title_bn' && value.trim().length < 4) {
      return 'জায়গা ও ময়লার ধরন সম্পর্কে সংক্ষেপে লিখুন।';
    }
    if (field === 'landmark' && value.trim().length < 3) {
      return 'কাছাকাছি পরিচিত কোনো মোড় বা দোকানের নাম লিখুন।';
    }
    if (field === 'reporter_phone' && !normalizeBdPhone(value)) {
      return '১১ সংখ্যার সঠিক মোবাইল নম্বর দিন (যেমন: 01711000000)।';
    }
    return undefined;
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrors((prev) => ({ ...prev, photo: 'শুধুমাত্র JPG, PNG বা WebP ছবি নির্বাচন করুন।' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, photo: 'ছবির সাইজ ৫ মেগাবাইটের কম হতে হবে।' }));
      return;
    }
    setPhotoFile(file);
    setErrors((prev) => ({ ...prev, photo: undefined }));
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setPhotoPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleGpsPin = () => {
    if (!navigator.geolocation) {
      setGpsNotice('ব্রাউজারে GPS পাওয়া যায়নি; তালিকা থেকে ওয়ার্ড বেছে নিন।');
      return;
    }
    setGpsNotice('আপনার অবস্থান বের করা হচ্ছে...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setCoords({ lat, lng });
        const ward = await resolveWardByCoords(lat, lng);
        setWardId(ward.ward_id);
        setGpsNotice(`শনাক্তকৃত এলাকা: ${ward.name_bn} (${lat}, ${lng})`);
      },
      () => {
        setGpsNotice('লোকেশন অনুমতি মেলেনি; ওয়ার্ড তালিকা থেকে এলাকা বেছে নিন।');
      },
      { enableHighAccuracy: true, timeout: 6000 },
    );
  };

  const handleWardSelect = (nextWardId: number) => {
    setWardId(nextWardId);
    const matched = SAVAR_WARDS_SEED.find((w) => w.id === nextWardId);
    if (matched) {
      setCoords({ lat: matched.centroid_lat, lng: matched.centroid_lng });
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextErrors: ReportErrors = {
      title_bn: validateField('title_bn', titleBn),
      landmark: validateField('landmark', landmark),
      reporter_phone: validateField('reporter_phone', reporterPhone),
    };
    setErrors(nextErrors);
    setTouched({ title_bn: true, landmark: true, reporter_phone: true });

    const firstBad = (['title_bn', 'landmark', 'reporter_phone'] as const).find(
      (k) => nextErrors[k],
    );
    if (firstBad) {
      formRef.current?.querySelector<HTMLElement>(`#${firstBad}`)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const uploadedUrls: string[] = [];
      if (photoFile) {
        const url = await uploadDumpPhoto(photoFile);
        if (url) uploadedUrls.push(url);
      }

      const res = await createDumpReport({
        reporter_name: reporterName,
        reporter_phone: reporterPhone,
        ward_id: wardId,
        title_bn: titleBn,
        description_bn: descriptionBn,
        landmark,
        severity,
        lat: coords.lat,
        lng: coords.lng,
        photo_urls: uploadedUrls,
      });

      setCreatedReport(res.data);
      setTitleBn('');
      setLandmark('');
      setDescriptionBn('');
      setPhotoFile(null);
      setPhotoPreviewUrl(null);
      setTouched({});
      setErrors({});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1.5">
        <h1 id="main-content" tabIndex={-1} className="text-2xl font-bold text-[#0F172A]">
          ময়লার ছবি তুলে জানান
        </h1>
        <p className="text-sm text-[#475569]">
          রাস্তার পাশে, ড্রেনের মুখে বা খোলা জায়গায় জমে থাকা ময়লার ছবি ও লোকেশন পাঠালে দ্রুত
          পরিচ্ছন্নতা টিম পাঠানো হবে।
        </p>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="cs-card space-y-6 p-5 sm:p-6">
        {/* Photo Capture Input */}
        <div className="space-y-2">
          <label htmlFor="dump-photo" className="block text-sm font-semibold text-[#0F172A]">
            ময়লার স্তূপের ছবি (ক্যামেরা বা গ্যালারি)
          </label>
          <p className="text-xs text-[#475569]">
            সর্বোচ্চ ৫ মেগাবাইট (JPG, PNG বা WebP) — ফোনের ক্যামেরা দিয়ে সরাসরি তুলতে পারেন
          </p>

          <label
            htmlFor="dump-photo"
            className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[#94A3B8] bg-[#F8FAFC] p-4 text-center hover:border-[#15803D] hover:bg-[#F0FDF4]"
          >
            {photoPreviewUrl ? (
              <div className="w-full space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreviewUrl}
                  alt="আপলোড করা ময়লার স্তূপের প্রিভিউ"
                  className="mx-auto max-h-52 rounded border border-[#E2E8F0] object-cover"
                />
                <span className="font-metric block text-xs text-[#14532D]">
                  {photoFile?.name} ({Math.round((photoFile?.size ?? 0) / 1024)} KB)
                </span>
              </div>
            ) : (
              <>
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#BBF7D0] bg-white text-[#15803D]">
                  <Upload className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-[#0F172A]">
                  ছবি তুলুন বা ফাইল বেছে নিন
                </span>
              </>
            )}
          </label>
          <input
            id="dump-photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={handlePhotoChange}
            className="visually-hidden"
          />
          {errors.photo ? (
            <p className="text-xs font-medium text-[#DC2626]">{errors.photo}</p>
          ) : null}
        </div>

        {/* GPS Pin + Ward */}
        <div className="space-y-3 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="block text-sm font-semibold text-[#0F172A]">জিপিএস লোকেশন ও ওয়ার্ড</span>
              <span className="font-mixed text-xs text-[#475569]">{gpsNotice}</span>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={handleGpsPin}>
              <LocateFixed className="h-4 w-4 text-[#15803D]" aria-hidden="true" />
              <span>জিপিএস পিন নিন</span>
            </Button>
          </div>

          <FormField id="report-ward" label="সাভার পৌরসভা ওয়ার্ড" required>
            {(props) => (
              <select
                {...props}
                value={wardId}
                onChange={(e) => handleWardSelect(Number(e.target.value))}
                className="cs-select bg-white"
              >
                {SAVAR_WARDS_SEED.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name_bn}
                  </option>
                ))}
              </select>
            )}
          </FormField>
        </div>

        <FormField
          id="title_bn"
          label="সংক্ষিপ্ত শিরোনাম"
          required
          hint="যেমন: নয়া বাজার গলির মুখে খোলা ময়লার স্তূপ"
          error={errors.title_bn}
        >
          {(props) => (
            <input
              {...props}
              type="text"
              required
              value={titleBn}
              onChange={(e) => {
                setTitleBn(e.target.value);
                if (touched.title_bn) {
                  setErrors((prev) => ({
                    ...prev,
                    title_bn: validateField('title_bn', e.target.value),
                  }));
                }
              }}
              onBlur={(e) => {
                setTouched((prev) => ({ ...prev, title_bn: true }));
                setErrors((prev) => ({
                  ...prev,
                  title_bn: validateField('title_bn', e.target.value),
                }));
              }}
              className="cs-input"
            />
          )}
        </FormField>

        <FormField
          id="landmark"
          label="কাছাকাছি পরিচিত জায়গা"
          required
          hint="যেমন: সাভার বাজার ওভারব্রিজের উত্তর পাশ"
          error={errors.landmark}
        >
          {(props) => (
            <input
              {...props}
              type="text"
              required
              value={landmark}
              onChange={(e) => {
                setLandmark(e.target.value);
                if (touched.landmark) {
                  setErrors((prev) => ({
                    ...prev,
                    landmark: validateField('landmark', e.target.value),
                  }));
                }
              }}
              onBlur={(e) => {
                setTouched((prev) => ({ ...prev, landmark: true }));
                setErrors((prev) => ({
                  ...prev,
                  landmark: validateField('landmark', e.target.value),
                }));
              }}
              className="cs-input"
            />
          )}
        </FormField>

        {/* Severity Radios */}
        <fieldset className="space-y-2.5">
          <legend className="text-sm font-semibold text-[#0F172A]">জরুরি মাত্রা</legend>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {SEVERITY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex min-h-12 cursor-pointer items-start gap-2.5 rounded-md border border-[#E2E8F0] bg-white p-3 has-[:checked]:border-[#15803D] has-[:checked]:bg-[#F0FDF4]"
              >
                <input
                  type="radio"
                  name="severity"
                  value={opt.value}
                  checked={severity === opt.value}
                  onChange={() => setSeverity(opt.value)}
                  className="mt-1 h-4 w-4 accent-[#15803D]"
                />
                <span>
                  <span className="block text-sm font-semibold text-[#0F172A]">{opt.label}</span>
                  <span className="block text-xs text-[#475569]">{opt.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <FormField id="description_bn" label="বিস্তারিত বিবরণ (ঐচ্ছিক)" hint="কতদিন ধরে জমে আছে বা কী ধরনের আবর্জনা">
          {(props) => (
            <textarea
              {...props}
              value={descriptionBn}
              onChange={(e) => setDescriptionBn(e.target.value)}
              className="cs-textarea"
            />
          )}
        </FormField>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField id="reporter_name" label="আপনার নাম (ঐচ্ছিক)">
            {(props) => (
              <input
                {...props}
                type="text"
                autoComplete="name"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className="cs-input"
              />
            )}
          </FormField>

          <FormField
            id="reporter_phone"
            label="মোবাইল নম্বর"
            required
            hint="সমাধান হলে আপডেট জানাতে, যেমন: 01711000000"
            error={errors.reporter_phone}
          >
            {(props) => (
              <input
                {...props}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                value={reporterPhone}
                onChange={(e) => {
                  setReporterPhone(e.target.value);
                  if (touched.reporter_phone) {
                    setErrors((prev) => ({
                      ...prev,
                      reporter_phone: validateField('reporter_phone', e.target.value),
                    }));
                  }
                }}
                onBlur={(e) => {
                  setTouched((prev) => ({ ...prev, reporter_phone: true }));
                  setErrors((prev) => ({
                    ...prev,
                    reporter_phone: validateField('reporter_phone', e.target.value),
                  }));
                }}
                className="cs-input font-metric"
              />
            )}
          </FormField>
        </div>

        <div className="flex justify-end border-t border-[#E2E8F0] pt-4">
          <Button type="submit" variant="primary" size="lg" disabled={submitting}>
            <Camera className="h-5 w-5" aria-hidden="true" />
            <span>{submitting ? 'জমা হচ্ছে...' : 'রিপোর্ট পাঠান'}</span>
          </Button>
        </div>
      </form>

      <NativeDialog
        open={Boolean(createdReport)}
        onClose={() => setCreatedReport(null)}
        title="ময়লার রিপোর্ট জমা হয়েছে"
      >
        {createdReport ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-[#BBF7D0] bg-[#F0FDF4] p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#15803D]" aria-hidden="true" />
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-[#14532D]">
                  ধন্যবাদ! আপনার রিপোর্টটি সাভার পৌরসভা টিমের কাছে পৌঁছে গেছে।
                </p>
                <p className="text-[#475569]">
                  রিপোর্ট কোড:{' '}
                  <strong lang="en" className="font-metric text-base text-[#0F172A]">
                    {createdReport.tracking_code}
                  </strong>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                autoFocus
                onClick={() => setCreatedReport(null)}
              >
                বন্ধ করুন
              </Button>
              <Link
                href={`/track?q=${encodeURIComponent(createdReport.tracking_code)}`}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#15803D] bg-[#15803D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#14532D]"
              >
                অগ্রগতি দেখুন
              </Link>
            </div>
          </div>
        ) : null}
      </NativeDialog>
    </div>
  );
}
