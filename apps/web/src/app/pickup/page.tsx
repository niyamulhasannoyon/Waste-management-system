'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, LocateFixed, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { NativeDialog } from '@/components/ui/native-dialog';
import { createPickup, resolveWardByCoords } from '@/lib/api-client';
import { SAVAR_WARDS_SEED, SLOT_OPTIONS, WASTE_TYPE_OPTIONS } from '@/lib/savar-data';
import type { PickupRequestRecord, PickupSlot, WasteType } from '@/lib/types';
import { normalizeBdPhone } from '@/lib/utils';

type FieldErrors = Partial<Record<'citizen_name' | 'citizen_phone' | 'address_line', string>>;

export default function PickupPage() {
  const formRef = useRef<HTMLFormElement>(null);

  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [wardId, setWardId] = useState<number>(3);
  const [addressLine, setAddressLine] = useState('');
  const [landmark, setLandmark] = useState('');
  const [wasteType, setWasteType] = useState<WasteType>('household');
  const [slot, setSlot] = useState<PickupSlot>('morning');
  const [estimatedBags, setEstimatedBags] = useState<number>(2);
  const [notes, setNotes] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const [createdPickup, setCreatedPickup] = useState<PickupRequestRecord | null>(null);

  const validateSingle = (field: keyof FieldErrors, value: string): string | undefined => {
    if (field === 'citizen_name' && value.trim().length < 2) {
      return 'আপনার পুরো নাম লিখুন।';
    }
    if (field === 'citizen_phone' && !normalizeBdPhone(value)) {
      return '১১ সংখ্যার সঠিক মোবাইল নম্বর দিন (যেমন: 01711000000)।';
    }
    if (field === 'address_line' && value.trim().length < 5) {
      return 'বাড়ি নম্বর ও রোডের ঠিকানা লিখুন।';
    }
    return undefined;
  };

  const handleBlur = (field: keyof FieldErrors, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateSingle(field, value);
    setErrors((prev) => ({ ...prev, [field]: err }));
    if (err) setLiveAnnouncement(err);
  };

  const handleInputClear = (field: keyof FieldErrors, value: string) => {
    if (!touched[field] && !errors[field]) return;
    const err = validateSingle(field, value);
    if (!err) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
      setLiveAnnouncement('');
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('আপনার ব্রাউজারে লোকেশন সুবিধা নেই, অনুগ্রহ করে ওয়ার্ড নির্বাচন করুন।');
      return;
    }
    setGpsStatus('লোকেশন বের করা হচ্ছে...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setCoords({ lat, lng });
        const resolved = await resolveWardByCoords(lat, lng);
        setWardId(resolved.ward_id);
        setGpsStatus(`শনাক্তকৃত এলাকা: ${resolved.name_bn} (${lat}, ${lng})`);
      },
      () => {
        setGpsStatus('লোকেশন অনুমতি পাওয়া যায়নি। তালিকা থেকে আপনার ওয়ার্ড বেছে নিন।');
      },
      { enableHighAccuracy: true, timeout: 6000 },
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);

    const nextErrors: FieldErrors = {
      citizen_name: validateSingle('citizen_name', citizenName),
      citizen_phone: validateSingle('citizen_phone', citizenPhone),
      address_line: validateSingle('address_line', addressLine),
    };

    setErrors(nextErrors);
    setTouched({ citizen_name: true, citizen_phone: true, address_line: true });

    const firstInvalidKey = (['citizen_name', 'citizen_phone', 'address_line'] as const).find(
      (k) => nextErrors[k],
    );

    if (firstInvalidKey) {
      const targetEl = formRef.current?.querySelector<HTMLElement>(`#${firstInvalidKey}`);
      targetEl?.focus();
      setLiveAnnouncement(nextErrors[firstInvalidKey] ?? 'ফর্মের তথ্যগুলো যাচাই করুন।');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createPickup({
        citizen_name: citizenName,
        citizen_phone: citizenPhone,
        ward_id: wardId,
        address_line: addressLine,
        landmark,
        waste_type: wasteType,
        slot,
        estimated_bags: estimatedBags,
        lat: coords?.lat,
        lng: coords?.lng,
        notes,
      });
      setCreatedPickup(res.data);
      setLiveAnnouncement(`রিকোয়েস্ট সফল হয়েছে। ট্র্যাকিং কোড ${res.data.tracking_code}`);
      setCitizenName('');
      setCitizenPhone('');
      setAddressLine('');
      setLandmark('');
      setNotes('');
      setTouched({});
      setErrors({});
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'রিকোয়েস্ট পাঠানো যায়নি। আবার চেষ্টা করুন।',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1.5">
        <h1 id="main-content" tabIndex={-1} className="text-2xl font-bold text-[#0F172A]">
          ময়লা নেওয়ার রিকোয়েস্ট দিন
        </h1>
        <p className="text-sm text-[#475569]">
          আপনার ওয়ার্ড ও সুবিধাজনক সময় বেছে নিন — সাভার পৌরসভার নিকটবর্তী ভ্যান গাড়ি নির্ধারিত সময়ে
          পৌঁছে যাবে।
        </p>
      </div>

      <div aria-live="polite" className="visually-hidden">
        {liveAnnouncement}
      </div>

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="cs-card space-y-6 p-5 sm:p-6">
        {submitError ? (
          <div role="alert" className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-medium text-[#B91C1C]">
            {submitError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField
            id="citizen_name"
            label="আপনার নাম"
            required
            hint="যেমন: তানভীর আহমেদ"
            error={errors.citizen_name}
          >
            {(props) => (
              <input
                {...props}
                type="text"
                name="citizen_name"
                autoComplete="name"
                enterKeyHint="next"
                required
                value={citizenName}
                onChange={(e) => {
                  setCitizenName(e.target.value);
                  handleInputClear('citizen_name', e.target.value);
                }}
                onBlur={(e) => handleBlur('citizen_name', e.target.value)}
                className="cs-input"
              />
            )}
          </FormField>

          <FormField
            id="citizen_phone"
            label="মোবাইল নম্বর"
            required
            hint="১১ সংখ্যার নম্বর, যেমন: 01711000000"
            error={errors.citizen_phone}
          >
            {(props) => (
              <input
                {...props}
                type="tel"
                name="citizen_phone"
                inputMode="tel"
                autoComplete="tel"
                enterKeyHint="next"
                required
                value={citizenPhone}
                onChange={(e) => {
                  setCitizenPhone(e.target.value);
                  handleInputClear('citizen_phone', e.target.value);
                }}
                onBlur={(e) => handleBlur('citizen_phone', e.target.value)}
                className="cs-input font-metric"
              />
            )}
          </FormField>
        </div>

        {/* Savar Ward Selector + GPS Auto-Resolve */}
        <div className="space-y-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-[#0F172A]">এলাকা ও ওয়ার্ড নির্বাচন</span>
            <Button type="button" variant="secondary" size="sm" onClick={handleDetectLocation}>
              <LocateFixed className="h-4 w-4 text-[#15803D]" aria-hidden="true" />
              <span>বর্তমান লোকেশন নিন</span>
            </Button>
          </div>
          {gpsStatus ? (
            <p className="font-mixed text-xs font-medium text-[#14532D]">{gpsStatus}</p>
          ) : null}

          <FormField id="ward_id" label="সাভার পৌরসভা ওয়ার্ড" required>
            {(props) => (
              <select
                {...props}
                name="ward_id"
                value={wardId}
                onChange={(e) => setWardId(Number(e.target.value))}
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
          id="address_line"
          label="বাড়ি ও রোডের ঠিকানা"
          required
          hint="বাসা/হোল্ডিং নম্বর, রোড ও মহল্লার নাম লিখুন"
          error={errors.address_line}
        >
          {(props) => (
            <textarea
              {...props}
              name="address_line"
              autoComplete="street-address"
              required
              value={addressLine}
              onChange={(e) => {
                setAddressLine(e.target.value);
                handleInputClear('address_line', e.target.value);
              }}
              onBlur={(e) => handleBlur('address_line', e.target.value)}
              className="cs-textarea"
            />
          )}
        </FormField>

        <FormField
          id="landmark"
          label="কাছের পরিচিত স্থান (ঐচ্ছিক)"
          hint="যেমন: ব্যাংক টাউন মসজিদের পাশে"
        >
          {(props) => (
            <input
              {...props}
              type="text"
              name="landmark"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              className="cs-input"
            />
          )}
        </FormField>

        {/* Radio Group 1: Waste Type (4 choices -> visible radios) */}
        <fieldset className="space-y-2.5">
          <legend className="text-sm font-semibold text-[#0F172A]">ময়লার ধরন</legend>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {WASTE_TYPE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex min-h-12 cursor-pointer items-start gap-3 rounded-md border border-[#E2E8F0] bg-white p-3 has-[:checked]:border-[#15803D] has-[:checked]:bg-[#F0FDF4]"
              >
                <input
                  type="radio"
                  name="waste_type"
                  value={opt.value}
                  checked={wasteType === opt.value}
                  onChange={() => setWasteType(opt.value)}
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

        {/* Radio Group 2: Pickup Slot (3 choices -> visible radios) */}
        <fieldset className="space-y-2.5">
          <legend className="text-sm font-semibold text-[#0F172A]">পিকআপের সময়</legend>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {SLOT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex min-h-12 cursor-pointer items-start gap-2.5 rounded-md border border-[#E2E8F0] bg-white p-3 has-[:checked]:border-[#15803D] has-[:checked]:bg-[#F0FDF4]"
              >
                <input
                  type="radio"
                  name="slot"
                  value={opt.value}
                  checked={slot === opt.value}
                  onChange={() => setSlot(opt.value)}
                  className="mt-1 h-4 w-4 accent-[#15803D]"
                />
                <span>
                  <span className="block text-sm font-semibold text-[#0F172A]">{opt.label}</span>
                  <span lang="en" className="font-metric block text-xs text-[#475569]">
                    {opt.timeRange}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField
            id="estimated_bags"
            label="আনুমানিক বস্তা বা ব্যাগের সংখ্যা"
            hint="১ থেকে ৫০ এর মধ্যে"
          >
            {(props) => (
              <select
                {...props}
                name="estimated_bags"
                value={estimatedBags}
                onChange={(e) => setEstimatedBags(Number(e.target.value))}
                className="cs-select font-metric"
              >
                {[1, 2, 3, 4, 5, 8, 10, 15, 20].map((num) => (
                  <option key={num} value={num}>
                    {num} ব্যাগ
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <FormField id="notes" label="অতিরিক্ত তথ্য (ঐচ্ছিক)" hint="যেমন: গেটে রাখা আছে">
            {(props) => (
              <input
                {...props}
                type="text"
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="cs-input"
              />
            )}
          </FormField>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#E2E8F0] pt-4">
          <Button type="submit" variant="primary" size="lg" disabled={submitting}>
            <Truck className="h-5 w-5" aria-hidden="true" />
            <span>{submitting ? 'পাঠানো হচ্ছে...' : 'পিকআপ রিকোয়েস্ট নিশ্চিত করুন'}</span>
          </Button>
        </div>
      </form>

      {/* Native <dialog> Confirmation Receipt */}
      <NativeDialog
        open={Boolean(createdPickup)}
        onClose={() => setCreatedPickup(null)}
        title="পিকআপ রিকোয়েস্ট জমা হয়েছে"
      >
        {createdPickup ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-[#BBF7D0] bg-[#F0FDF4] p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#15803D]" aria-hidden="true" />
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-[#14532D]">
                  আপনার রিকোয়েস্ট সফলভাবে গ্রহণ করা হয়েছে।
                </p>
                <p className="text-[#475569]">
                  ট্র্যাকিং কোড:{' '}
                  <strong lang="en" className="font-metric text-base text-[#0F172A]">
                    {createdPickup.tracking_code}
                  </strong>
                </p>
              </div>
            </div>

            <dl className="space-y-2 rounded-md border border-[#E2E8F0] p-3 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-[#475569]">ওয়ার্ড:</dt>
                <dd className="font-medium text-[#0F172A]">{createdPickup.ward_name_bn}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[#475569]">ঠিকানা:</dt>
                <dd className="text-end font-medium text-[#0F172A]">{createdPickup.address_line}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[#475569]">মোবাইল:</dt>
                <dd lang="en" className="font-metric font-medium text-[#0F172A]">
                  {createdPickup.citizen_phone}
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                autoFocus
                onClick={() => setCreatedPickup(null)}
              >
                বন্ধ করুন
              </Button>
              <Link
                href={`/track?q=${encodeURIComponent(createdPickup.tracking_code)}`}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#15803D] bg-[#15803D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#14532D]"
              >
                অবস্থা ট্র্যাক করুন
              </Link>
            </div>
          </div>
        ) : null}
      </NativeDialog>
    </div>
  );
}
