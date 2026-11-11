"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useCleanSavar } from "@/context/CleanSavarContext";
import {
  PICKUP_TIME_SLOTS,
  PICKUP_WASTE_CATEGORIES,
  REPORT_WASTE_TYPES,
  SERVICE_ZONES,
  WasteRequest,
} from "@/data/savarData";
import {
  CameraIcon,
  CheckCircleIcon,
  MapPinIcon,
  UploadIcon,
} from "./Icons";

interface FormProps {
  idPrefix: string;
  onSuccessCloseModal?: () => void;
}

const SAMPLE_WASTE_SVG_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='%23E2E8F0'/%3E%3Crect x='0' y='125' width='320' height='55' fill='%23CBD5E1'/%3E%3Crect x='24' y='74' width='80' height='60' rx='4' fill='%2315803D'/%3E%3Crect x='20' y='66' width='88' height='10' rx='2' fill='%23166534'/%3E%3Cpath d='M135 135c12-26 36-30 56-16 14-12 42-8 54 16H135Z' fill='%2364748B'/%3E%3Ccircle cx='165' cy='116' r='8' fill='%2394A3B8'/%3E%3Ccircle cx='195' cy='120' r='10' fill='%23475569'/%3E%3Crect x='14' y='14' width='168' height='24' rx='4' fill='%23FFFFFF' stroke='%23CBD5E1'/%3E%3Ctext x='24' y='30' font-family='sans-serif' font-size='11' fill='%230F172A'%3ESavar Roadside Sample%3C/text%3E%3C/svg%3E";

function useFieldValidation(errorId: string) {
  const [touched, setTouched] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const ref = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null);

  const validateElement = (el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, markTouched = false) => {
    if (markTouched) setTouched(true);
    const valid = el.validity.valid;
    if (!valid) {
      if (el.validity.valueMissing) {
        setErrorMsg("এই তথ্যটি পূরণ করা আবশ্যক।");
      } else if (el.validity.patternMismatch || el.validity.tooShort) {
        setErrorMsg("সঠিক ফরম্যাটে তথ্য দিন (যেমন: ১১ ডিজিটের মোবাইল নম্বর)।");
      } else {
        setErrorMsg("অনুগ্রহ করে সঠিক তথ্য লিখুন।");
      }
      el.classList.add("user-invalid-fallback");
    } else {
      setErrorMsg("");
      el.classList.remove("user-invalid-fallback");
    }
    return valid;
  };

  const resetValidation = () => {
    setTouched(false);
    setErrorMsg("");
    ref.current?.classList.remove("user-invalid-fallback");
  };

  const showError = touched && Boolean(errorMsg);

  return {
    ref,
    errorMsg,
    showError,
    errorId,
    validateElement,
    resetValidation,
    ariaInvalid: showError ? ("true" as const) : ("false" as const),
  };
}

export function ReportWasteForm({ idPrefix, onSuccessCloseModal }: FormProps) {
  const { zones, selectedZoneForForm, setSelectedZoneForForm, submitRequest } =
    useCleanSavar();

  const zoneId = selectedZoneForForm || zones[0]?.id || "ward-5";
  const [wasteType, setWasteType] = useState<string>(REPORT_WASTE_TYPES[0]);
  const [landmark, setLandmark] = useState("");
  const [phone, setPhone] = useState("");
  const [gpsStatus, setGpsStatus] = useState<{
    status: "idle" | "locating" | "pinned";
    coords?: string;
    label?: string;
  }>({ status: "idle" });
  const [photo, setPhoto] = useState<{ preview: string; name: string; sizeText: string } | null>(
    null
  );
  const [submittedRequest, setSubmittedRequest] = useState<WasteRequest | null>(null);
  const [liveStatusText, setLiveStatusText] = useState("");

  const headingId = useId();
  const landmarkHintId = useId();
  const phoneHintId = useId();
  const landmarkField = useFieldValidation(`${idPrefix}-report-landmark-err`);
  const phoneField = useFieldValidation(`${idPrefix}-report-phone-err`);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedZone = useMemo(
    () => zones.find((z) => z.id === zoneId) ?? zones[0] ?? SERVICE_ZONES[0]!,
    [zones, zoneId]
  );

  useEffect(() => {
    return () => {
      if (photo?.preview.startsWith("blob:")) {
        URL.revokeObjectURL(photo.preview);
      }
    };
  }, [photo]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photo?.preview.startsWith("blob:")) {
      URL.revokeObjectURL(photo.preview);
    }
    const objectUrl = URL.createObjectURL(file);
    const kb = Math.max(1, Math.round(file.size / 1024));
    setPhoto({
      preview: objectUrl,
      name: file.name,
      sizeText: `${kb} KB`,
    });
    setLiveStatusText(`ছবি যুক্ত হয়েছে: ${file.name}`);
  };

  const handleAttachSamplePhoto = () => {
    if (photo?.preview.startsWith("blob:")) {
      URL.revokeObjectURL(photo.preview);
    }
    setPhoto({
      preview: SAMPLE_WASTE_SVG_DATA_URI,
      name: "savar-roadside-waste-sample.jpg",
      sizeText: "নমুনা ছবি",
    });
    setLiveStatusText("নমুনা ছবি যুক্ত হয়েছে।");
  };

  const handleClearPhoto = () => {
    if (photo?.preview.startsWith("blob:")) {
      URL.revokeObjectURL(photo.preview);
    }
    setPhoto(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setLiveStatusText("ছবি সরানো হয়েছে।");
  };

  const handleGpsPin = () => {
    setGpsStatus({ status: "locating" });
    const fallbackPin = () => {
      const coords = `${selectedZone.coordinates.lat}, ${selectedZone.coordinates.lng}`;
      setGpsStatus({
        status: "pinned",
        coords,
        label: `${selectedZone.coordinates.landmark} (${selectedZone.code})`,
      });
      setLiveStatusText(`জিপিএস পিন নির্ধারিত হয়েছে: ${selectedZone.coordinates.landmark}`);
    };

    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = `${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E`;
          setGpsStatus({
            status: "pinned",
            coords,
            label: `লাইভ ডিভাইস অবস্থান (${selectedZone.shortName})`,
          });
          setLiveStatusText("আপনার বর্তমান জিপিএস অবস্থান যুক্ত হয়েছে।");
        },
        () => {
          fallbackPin();
        },
        { timeout: 2200, maximumAge: 60000 }
      );
    } else {
      fallbackPin();
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const landmarkOk = landmarkField.ref.current
      ? landmarkField.validateElement(landmarkField.ref.current, true)
      : Boolean(landmark.trim());
    const phoneOk = phoneField.ref.current
      ? phoneField.validateElement(phoneField.ref.current, true)
      : true;

    if (!landmarkOk) {
      landmarkField.ref.current?.focus();
      setLiveStatusText("অনুগ্রহ করে রাস্তার অবস্থান বা ল্যান্ডমার্ক লিখুন।");
      return;
    }
    if (!phoneOk) {
      phoneField.ref.current?.focus();
      setLiveStatusText("সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন অথবা ঘরটি খালি রাখুন।");
      return;
    }

    const created = submitRequest({
      kind: "report",
      zoneId,
      addressOrLandmark: landmark,
      wasteType,
      reporterPhone: phone,
      gpsLabel: gpsStatus.coords,
      photoPreview: photo?.preview,
      photoName: photo?.name,
      notes: gpsStatus.label ? `পিনকৃত অবস্থান: ${gpsStatus.label}` : undefined,
    });

    setSubmittedRequest(created);
    setLiveStatusText(`অভিযোগ সফলভাবে জমা হয়েছে। ট্র্যাকিং নম্বর ${created.id}`);
  };

  const handleReset = () => {
    setSubmittedRequest(null);
    setLandmark("");
    setPhone("");
    setGpsStatus({ status: "idle" });
    handleClearPhoto();
    landmarkField.resetValidation();
    phoneField.resetValidation();
  };

  if (submittedRequest) {
    return (
      <div className="rounded-md border border-green-300 bg-green-50 p-5" role="status">
        <div className="flex items-start gap-3">
          <CheckCircleIcon className="mt-0.5 h-6 w-6 shrink-0 text-[#15803D]" />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-slate-900">
              অভিযোগ সফলভাবে নথিভুক্ত হয়েছে
            </h3>
            <p className="mt-1 text-sm text-slate-700">
              আপনার রিপোর্টটি সাভার পৌরসভা অপারেশনস ড্যাশবোর্ডে পাঠানো হয়েছে। দ্রুতই
              নিকটস্থ পরিচ্ছন্নতা টিম অ্যাসাইন করা হবে।
            </p>
            <dl className="mt-4 grid grid-cols-1 gap-3 rounded-md border border-green-200 bg-white p-3.5 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium text-slate-600">ট্র্যাকিং আইডি</dt>
                <dd className="font-latin mt-0.5 text-sm font-bold text-slate-900">
                  {submittedRequest.id}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-600">এলাকা / ওয়ার্ড</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                  {selectedZone.name}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-600">বর্জ্যের ধরন</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                  {submittedRequest.wasteType}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex min-h-[40px] items-center rounded-md border border-slate-700 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                নতুন রিপোর্ট করুন
              </button>
              <Link
                href="/admin"
                onClick={() => onSuccessCloseModal?.()}
                className="inline-flex min-h-[40px] items-center rounded-md border border-[#15803D] bg-[#15803D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#166534]"
              >
                অ্যাডমিন ড্যাশবোর্ডে দেখুন →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby={headingId} className="space-y-5">
      <h3 id={headingId} className="visually-hidden">
        রাস্তার ময়লার রিপোর্ট ফর্ম
      </h3>

      <div aria-live="polite" className="visually-hidden">
        {liveStatusText}
      </div>

      {/* Area / Ward + GPS Pin */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${idPrefix}-report-zone`}
            className="mb-1.5 block text-sm font-semibold text-slate-900"
          >
            এলাকা বা ওয়ার্ড নির্বাচন করুন <span className="text-[#b91c1c]">*</span>
          </label>
          <select
            id={`${idPrefix}-report-zone`}
            name="zoneId"
            value={zoneId}
            onChange={(e) => {
              setSelectedZoneForForm(e.target.value);
              if (gpsStatus.status === "pinned") {
                setGpsStatus({ status: "idle" });
              }
            }}
            required
            className="cs-field w-full rounded-md border border-slate-500 bg-white px-3 py-2 text-slate-900"
          >
            <optgroup label="সাভার পৌরসভা (ওয়ার্ড ১–৯)">
              {zones
                .filter((z) => z.type === "municipality")
                .map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.code} — {z.shortName}
                  </option>
                ))}
            </optgroup>
            <optgroup label="সাভার ইউনিয়ন পরিষদ এলাকা">
              {zones
                .filter((z) => z.type === "union")
                .map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} ({z.shortName})
                  </option>
                ))}
            </optgroup>
          </select>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-semibold text-slate-900">
            জিপিএস অবস্থান পিন
          </span>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={handleGpsPin}
              className={`inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md border px-3.5 py-2 text-sm font-semibold transition-colors ${
                gpsStatus.status === "pinned"
                  ? "border-[#15803D] bg-green-50 text-[#15803D]"
                  : "border-slate-500 bg-white text-slate-900 hover:bg-slate-100"
              }`}
            >
              <MapPinIcon className="h-4 w-4 shrink-0" />
              {gpsStatus.status === "locating"
                ? "অবস্থান নেওয়া হচ্ছে..."
                : gpsStatus.status === "pinned"
                  ? "জিপিএস পিন যুক্ত হয়েছে"
                  : "বর্তমান জিপিএস পিন নিন"}
            </button>
            {gpsStatus.status === "pinned" && gpsStatus.coords ? (
              <p className="text-xs font-medium text-green-900">
                <span className="font-latin">{gpsStatus.coords}</span> — {gpsStatus.label}
              </p>
            ) : (
              <p className="text-xs text-slate-600">
                লোকেশন পিন করলে টিম দ্রুত স্পট খুঁজে পাবে
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Waste type chips (radio group inside fieldset/legend) */}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-900">
          ময়লা বা সমস্যার ধরন বেছে নিন <span className="text-[#b91c1c]">*</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {REPORT_WASTE_TYPES.map((typeOption) => {
            const checked = wasteType === typeOption;
            return (
              <label
                key={typeOption}
                className={`inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-md border px-3.5 py-2 text-sm font-medium transition-colors ${
                  checked
                    ? "border-[#15803D] bg-[#15803D] text-white"
                    : "border-slate-400 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name={`${idPrefix}-waste-type`}
                  value={typeOption}
                  checked={checked}
                  onChange={() => setWasteType(typeOption)}
                  className="visually-hidden"
                />
                <span>{typeOption}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Photo upload box */}
      <div>
        <span className="mb-1.5 block text-sm font-semibold text-slate-900">
          ময়লার ছবি যুক্ত করুন (ঐচ্ছিক তবে সহায়ক)
        </span>
        <div className="rounded-md border border-dashed border-slate-400 bg-slate-50 p-4">
          {photo ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.preview}
                  alt="আপলোড করা ময়লার ছবির প্রিভিউ"
                  width={96}
                  height={64}
                  className="h-16 w-24 shrink-0 rounded border border-slate-300 object-cover bg-white"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {photo.name}
                  </p>
                  <p className="text-xs text-slate-600">{photo.sizeText}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearPhoto}
                className="inline-flex min-h-[38px] items-center justify-center rounded border border-slate-400 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
              >
                ছবি সরান
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700">
                  <UploadIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    স্পটের ছবি আপলোড করুন (JPG বা PNG)
                  </p>
                  <p className="text-xs text-slate-600">
                    মোবাইল ক্যামেরা থেকে সরাসরি ছবি তুলে দিতে পারেন
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <label
                  htmlFor={`${idPrefix}-photo-upload`}
                  className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-md border border-slate-700 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100"
                >
                  <CameraIcon className="h-4 w-4" />
                  ছবি বাছাই করুন
                </label>
                <input
                  ref={fileInputRef}
                  id={`${idPrefix}-photo-upload`}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="visually-hidden"
                />
                <button
                  type="button"
                  onClick={handleAttachSamplePhoto}
                  className="inline-flex min-h-[40px] items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  নমুনা ছবি যুক্ত করুন
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Landmark & Phone */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${idPrefix}-report-landmark`}
            className="mb-1 block text-sm font-semibold text-slate-900"
          >
            নির্দিষ্ট স্থান বা ল্যান্ডমার্ক <span className="text-[#b91c1c]">*</span>
          </label>
          <p id={landmarkHintId} className="mb-1.5 text-xs text-slate-600">
            যেমন: থানা রোড কাঁচাবাজার মোড়ের পশ্চিম পাশে
          </p>
          <input
            ref={landmarkField.ref as React.RefObject<HTMLInputElement>}
            id={`${idPrefix}-report-landmark`}
            name="landmark"
            type="text"
            required
            minLength={4}
            value={landmark}
            onChange={(e) => {
              setLandmark(e.target.value);
              if (landmarkField.showError) landmarkField.validateElement(e.target);
            }}
            onBlur={(e) => landmarkField.validateElement(e.target, true)}
            aria-invalid={landmarkField.ariaInvalid}
            aria-describedby={
              landmarkField.showError
                ? `${landmarkHintId} ${landmarkField.errorId}`
                : landmarkHintId
            }
            placeholder="রাস্তার নাম বা পরিচিত স্থানের পাশে লিখুন"
            className="cs-field w-full rounded-md border border-slate-500 bg-white px-3.5 py-2.5 text-slate-900 placeholder:text-slate-500"
          />
          {landmarkField.showError ? (
            <p id={landmarkField.errorId} className="mt-1 text-xs font-semibold text-[#b91c1c]">
              {landmarkField.errorMsg}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor={`${idPrefix}-report-phone`}
            className="mb-1 block text-sm font-semibold text-slate-900"
          >
            মোবাইল নম্বর (আপডেট পেতে চাইলে)
          </label>
          <p id={phoneHintId} className="mb-1.5 text-xs text-slate-600">
            ফরম্যাট: ১১ ডিজিট, যেমন 017XXXXXXXX
          </p>
          <input
            ref={phoneField.ref as React.RefObject<HTMLInputElement>}
            id={`${idPrefix}-report-phone`}
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            pattern="^01[3-9]\d{8}$"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (phoneField.showError) phoneField.validateElement(e.target);
            }}
            onBlur={(e) => {
              if (e.target.value.trim()) phoneField.validateElement(e.target, true);
              else phoneField.resetValidation();
            }}
            aria-invalid={phoneField.ariaInvalid}
            aria-describedby={
              phoneField.showError ? `${phoneHintId} ${phoneField.errorId}` : phoneHintId
            }
            placeholder="017XXXXXXXX"
            className="cs-field font-latin w-full rounded-md border border-slate-500 bg-white px-3.5 py-2.5 text-slate-900 placeholder:text-slate-500"
          />
          {phoneField.showError ? (
            <p id={phoneField.errorId} className="mt-1 text-xs font-semibold text-[#b91c1c]">
              {phoneField.errorMsg}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <p className="text-xs text-slate-600">
          অভিযোগ পাঠালে {selectedZone.code}-এর সুপারভাইজার {selectedZone.supervisor}-এর কাছে
          তৎক্ষণাৎ নোটিফিকেশন যাবে।
        </p>
        <button
          type="submit"
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-md border border-[#15803D] bg-[#15803D] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#166534] sm:w-auto"
        >
          অভিযোগ জমা দিন
        </button>
      </div>
    </form>
  );
}

export function PickupRequestForm({ idPrefix, onSuccessCloseModal }: FormProps) {
  const { zones, selectedZoneForForm, setSelectedZoneForForm, submitRequest } =
    useCleanSavar();

  const zoneId = selectedZoneForForm || zones[0]?.id || "ward-5";
  const [address, setAddress] = useState("");
  const [wasteCategory, setWasteCategory] = useState<string>(
    PICKUP_WASTE_CATEGORIES[0].value
  );
  const [timeSlot, setTimeSlot] = useState<string>(PICKUP_TIME_SLOTS[0]);
  const [quantity, setQuantity] = useState("১–২টি মাঝারি ব্যাগ");
  const [phone, setPhone] = useState("");
  const [submittedRequest, setSubmittedRequest] = useState<WasteRequest | null>(null);
  const [liveStatusText, setLiveStatusText] = useState("");

  const headingId = useId();
  const addrHintId = useId();
  const phoneHintId = useId();
  const addrField = useFieldValidation(`${idPrefix}-pickup-addr-err`);
  const phoneField = useFieldValidation(`${idPrefix}-pickup-phone-err`);

  const selectedZone = useMemo(
    () => zones.find((z) => z.id === zoneId) ?? zones[0] ?? SERVICE_ZONES[0]!,
    [zones, zoneId]
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const addrOk = addrField.ref.current
      ? addrField.validateElement(addrField.ref.current, true)
      : Boolean(address.trim());
    const phoneOk = phoneField.ref.current
      ? phoneField.validateElement(phoneField.ref.current, true)
      : Boolean(phone.trim());

    if (!addrOk) {
      addrField.ref.current?.focus();
      setLiveStatusText("অনুগ্রহ করে বাসার পূর্ণ ঠিকানা লিখুন।");
      return;
    }
    if (!phoneOk) {
      phoneField.ref.current?.focus();
      setLiveStatusText("অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।");
      return;
    }

    const created = submitRequest({
      kind: "pickup",
      zoneId,
      addressOrLandmark: address,
      wasteType: wasteCategory,
      timeSlot,
      quantity,
      reporterPhone: phone,
    });

    setSubmittedRequest(created);
    setLiveStatusText(`পিকআপ রিকোয়েস্ট নিশ্চিত হয়েছে। টোকেন নম্বর ${created.id}`);
  };

  const handleReset = () => {
    setSubmittedRequest(null);
    setAddress("");
    setPhone("");
    addrField.resetValidation();
    phoneField.resetValidation();
  };

  if (submittedRequest) {
    return (
      <div className="rounded-md border border-green-300 bg-green-50 p-5" role="status">
        <div className="flex items-start gap-3">
          <CheckCircleIcon className="mt-0.5 h-6 w-6 shrink-0 text-[#15803D]" />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-slate-900">
              বাসা থেকে ময়লা সংগ্রহের সময় নির্ধারিত হয়েছে
            </h3>
            <p className="mt-1 text-sm text-slate-700">
              নির্ধারিত সময়ের ১৫ মিনিট আগে আমাদের পরিচ্ছন্নতা ভ্যান আপনার গলিতে পৌঁছাবে।
            </p>
            <dl className="mt-4 grid grid-cols-1 gap-3 rounded-md border border-green-200 bg-white p-3.5 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium text-slate-600">পিকআপ টোকেন</dt>
                <dd className="font-latin mt-0.5 text-sm font-bold text-slate-900">
                  {submittedRequest.id}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-600">সময়</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                  {submittedRequest.timeSlot}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-600">বর্জ্যের ধরন</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                  {submittedRequest.wasteType}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex min-h-[40px] items-center rounded-md border border-slate-700 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                আরেকটি পিকআপ বুক করুন
              </button>
              <Link
                href="/admin"
                onClick={() => onSuccessCloseModal?.()}
                className="inline-flex min-h-[40px] items-center rounded-md border border-[#15803D] bg-[#15803D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#166534]"
              >
                অ্যাডমিন ড্যাশবোর্ডে দেখুন →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby={headingId} className="space-y-5">
      <h3 id={headingId} className="visually-hidden">
        বাসা থেকে ময়লা সংগ্রহ বুকিং ফর্ম
      </h3>

      <div aria-live="polite" className="visually-hidden">
        {liveStatusText}
      </div>

      {/* Ward + Full Address */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
        <div className="sm:col-span-5">
          <label
            htmlFor={`${idPrefix}-pickup-zone`}
            className="mb-1.5 block text-sm font-semibold text-slate-900"
          >
            ওয়ার্ড বা ইউনিয়ন <span className="text-[#b91c1c]">*</span>
          </label>
          <select
            id={`${idPrefix}-pickup-zone`}
            name="zoneId"
            value={zoneId}
            onChange={(e) => setSelectedZoneForForm(e.target.value)}
            required
            className="cs-field w-full rounded-md border border-slate-500 bg-white px-3 py-2 text-slate-900"
          >
            <optgroup label="সাভার পৌরসভা (ওয়ার্ড ১–৯)">
              {zones
                .filter((z) => z.type === "municipality")
                .map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.code} — {z.shortName}
                  </option>
                ))}
            </optgroup>
            <optgroup label="সাভার ইউনিয়ন পরিষদ এলাকা">
              {zones
                .filter((z) => z.type === "union")
                .map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} ({z.shortName})
                  </option>
                ))}
            </optgroup>
          </select>
        </div>

        <div className="sm:col-span-7">
          <label
            htmlFor={`${idPrefix}-pickup-address`}
            className="mb-1 block text-sm font-semibold text-slate-900"
          >
            বাসার বিস্তারিত ঠিকানা <span className="text-[#b91c1c]">*</span>
          </label>
          <p id={addrHintId} className="mb-1.5 text-xs text-slate-600">
            বাসা/হোল্ডিং নং, রোড ও মহল্লা (যেমন: বাসা ১৪, রোড ৩, ব্যাংক কলোনি)
          </p>
          <input
            ref={addrField.ref as React.RefObject<HTMLInputElement>}
            id={`${idPrefix}-pickup-address`}
            name="address"
            type="text"
            required
            minLength={5}
            autoComplete="street-address"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              if (addrField.showError) addrField.validateElement(e.target);
            }}
            onBlur={(e) => addrField.validateElement(e.target, true)}
            aria-invalid={addrField.ariaInvalid}
            aria-describedby={
              addrField.showError ? `${addrHintId} ${addrField.errorId}` : addrHintId
            }
            placeholder="বাসা/হোল্ডিং নম্বর, রোড ও ফ্লোর লিখুন"
            className="cs-field w-full rounded-md border border-slate-500 bg-white px-3.5 py-2.5 text-slate-900 placeholder:text-slate-500"
          />
          {addrField.showError ? (
            <p id={addrField.errorId} className="mt-1 text-xs font-semibold text-[#b91c1c]">
              {addrField.errorMsg}
            </p>
          ) : null}
        </div>
      </div>

      {/* Waste Category (3 options -> radio cards inside fieldset) */}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-900">
          বর্জ্যের ধরন নির্বাচন করুন <span className="text-[#b91c1c]">*</span>
        </legend>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {PICKUP_WASTE_CATEGORIES.map((cat) => {
            const checked = wasteCategory === cat.value;
            return (
              <label
                key={cat.value}
                className={`flex cursor-pointer flex-col justify-between rounded-md border p-3.5 transition-colors ${
                  checked
                    ? "border-[#15803D] bg-green-50 ring-1 ring-[#15803D]"
                    : "border-slate-400 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900">{cat.value}</span>
                  <input
                    type="radio"
                    name={`${idPrefix}-pickup-category`}
                    value={cat.value}
                    checked={checked}
                    onChange={() => setWasteCategory(cat.value)}
                    className="h-4 w-4 accent-[#15803D]"
                  />
                </div>
                <span className="mt-1 text-xs text-slate-600">{cat.hint}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Preferred Time Slot (3 options -> radio cards) + Phone & Quantity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <fieldset className="lg:col-span-7">
          <legend className="mb-2 text-sm font-semibold text-slate-900">
            পছন্দের সময়সূচি বেছে নিন <span className="text-[#b91c1c]">*</span>
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PICKUP_TIME_SLOTS.map((slot) => {
              const checked = timeSlot === slot;
              return (
                <label
                  key={slot}
                  className={`flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-center text-sm font-semibold transition-colors ${
                    checked
                      ? "border-[#15803D] bg-[#15803D] text-white"
                      : "border-slate-400 bg-white text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name={`${idPrefix}-pickup-slot`}
                    value={slot}
                    checked={checked}
                    onChange={() => setTimeSlot(slot)}
                    className="visually-hidden"
                  />
                  <span>{slot}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-5">
          <div>
            <label
              htmlFor={`${idPrefix}-pickup-qty`}
              className="mb-1.5 block text-sm font-semibold text-slate-900"
            >
              আনুমানিক পরিমাণ
            </label>
            <select
              id={`${idPrefix}-pickup-qty`}
              name="quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="cs-field w-full rounded-md border border-slate-500 bg-white px-3 py-2 text-slate-900"
            >
              <option value="১–২টি মাঝারি ব্যাগ">১–২টি মাঝারি ব্যাগ</option>
              <option value="১টি বড় বালতি / ঝুড়ি">১টি বড় বালতি / ঝুড়ি</option>
              <option value="৩+ ব্যাগ বা বস্তা">৩+ ব্যাগ বা বস্তা</option>
            </select>
          </div>

          <div>
            <label
              htmlFor={`${idPrefix}-pickup-phone`}
              className="mb-1 block text-sm font-semibold text-slate-900"
            >
              মোবাইল নম্বর <span className="text-[#b91c1c]">*</span>
            </label>
            <p id={phoneHintId} className="mb-1 text-xs text-slate-600">
              যেমন: 017XXXXXXXX
            </p>
            <input
              ref={phoneField.ref as React.RefObject<HTMLInputElement>}
              id={`${idPrefix}-pickup-phone`}
              name="phone"
              type="tel"
              required
              inputMode="numeric"
              autoComplete="tel-national"
              pattern="^01[3-9]\d{8}$"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (phoneField.showError) phoneField.validateElement(e.target);
              }}
              onBlur={(e) => phoneField.validateElement(e.target, true)}
              aria-invalid={phoneField.ariaInvalid}
              aria-describedby={
                phoneField.showError
                  ? `${phoneHintId} ${phoneField.errorId}`
                  : phoneHintId
              }
              placeholder="017XXXXXXXX"
              className="cs-field font-latin w-full rounded-md border border-slate-500 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-500"
            />
            {phoneField.showError ? (
              <p id={phoneField.errorId} className="mt-1 text-xs font-semibold text-[#b91c1c]">
                {phoneField.errorMsg}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <p className="text-xs text-slate-600">
          {selectedZone.code} নির্ধারিত গাড়ি: <span className="font-semibold text-slate-800">{selectedZone.vehicle}</span>
        </p>
        <button
          type="submit"
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-md border border-[#15803D] bg-[#15803D] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#166534] sm:w-auto"
        >
          পিকআপ নিশ্চিত করুন
        </button>
      </div>
    </form>
  );
}
