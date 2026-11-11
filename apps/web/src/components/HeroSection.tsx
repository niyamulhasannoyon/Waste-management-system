"use client";

import React, { useMemo, useState } from "react";
import { useCleanSavar } from "@/context/CleanSavarContext";
import { toBanglaDigits, ZoneLiveStatus } from "@/data/savarData";
import { CalendarClockIcon, CameraIcon, CheckCircleIcon, ClockIcon, TruckIcon } from "./Icons";

const PREVIEW_FILTERS = [
  { id: "all", label: "সাভার পৌরসভা ওয়ার্ড ১-৯" },
  { id: "ward-5", label: "ব্যাংক টাউন" },
  { id: "ward-2", label: "রেডিও কলোনি" },
  { id: "pakija", label: "পাকিজা এলাকা" },
] as const;

const FEATURED_WARD_IDS = ["ward-5", "ward-2", "ward-3", "ward-4", "ward-8"];

function StatusBadge({ status }: { status: ZoneLiveStatus }) {
  if (status === "সম্পন্ন") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-green-300 bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-900">
        <CheckCircleIcon className="h-3 w-3 text-[#15803D]" />
        সম্পন্ন
      </span>
    );
  }
  if (status === "সংগ্রহ চলছে") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-sky-300 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-900">
        <TruckIcon className="h-3 w-3 text-sky-700" />
        সংগ্রহ চলছে
      </span>
    );
  }
  if (status === "অতিরিক্ত চাপ") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-amber-400 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-950">
        <ClockIcon className="h-3 w-3 text-amber-700" />
        অতিরিক্ত চাপ
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800">
      <ClockIcon className="h-3 w-3 text-slate-600" />
      নির্ধারিত সময়ে
    </span>
  );
}

export function HeroSection() {
  const { zones, focusQuickAction } = useCleanSavar();
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [focusedZoneId, setFocusedZoneId] = useState<string>("ward-5");

  const municipalityWards = useMemo(
    () => zones.filter((z) => z.type === "municipality"),
    [zones]
  );

  const visibleRows = useMemo(() => {
    if (selectedFilter === "all") {
      return municipalityWards.filter((z) => FEATURED_WARD_IDS.includes(z.id));
    }
    if (selectedFilter === "pakija") {
      return municipalityWards.filter((z) => z.id === "ward-5" || z.id === "ward-3");
    }
    return municipalityWards.filter((z) => z.id === selectedFilter);
  }, [municipalityWards, selectedFilter]);

  const activeZone = useMemo(() => {
    return (
      zones.find((z) => z.id === focusedZoneId) ??
      visibleRows[0] ??
      municipalityWards[0]
    );
  }, [zones, focusedZoneId, visibleRows, municipalityWards]);

  const handleFilterClick = (filterId: string) => {
    setSelectedFilter(filterId);
    if (filterId === "ward-2") setFocusedZoneId("ward-2");
    else if (filterId === "ward-5" || filterId === "pakija") setFocusedZoneId("ward-5");
    else setFocusedZoneId("ward-5");
  };

  return (
    <section className="border-b border-slate-200 bg-[#F8FAFC] py-10 sm:py-14 lg:py-16">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8">
        {/* Left Hero Content */}
        <div className="lg:col-span-6 lg:pt-2">
          <div className="inline-flex items-center gap-2 rounded-md border border-green-300 bg-green-50 px-3 py-1 text-sm font-semibold text-green-900">
            <span className="h-2 w-2 rounded-full bg-[#15803D]" aria-hidden="true" />
            সাভারের স্মার্ট বর্জ্য ব্যবস্থাপনা
          </div>

          <h1
            className="mt-5 font-bold tracking-tight text-slate-900"
            style={{
              fontSize: "clamp(2rem, 1.45rem + 2.1vw, 3.125rem)",
              lineHeight: 1.2,
              textWrap: "balance",
            }}
          >
            পরিচ্ছন্ন সাভার গড়ি, হাতের মুঠোয় সমাধান
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-700 sm:text-lg">
            বাসাবাড়ির প্রতিদিনের ময়লা সংগ্রহের সময় ঠিক করুন কিংবা রাস্তার পাশে জমে থাকা
            আবর্জনার ছবি ও অবস্থান পাঠান। সাভার পৌরসভা ও ইউনিয়ন পরিষদের নির্ধারিত টিম
            দ্রুত ব্যবস্থা নেবে।
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => focusQuickAction("report")}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-md border border-[#15803D] bg-[#15803D] px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-[#166534]"
            >
              <CameraIcon className="h-5 w-5" />
              ময়লার ছবি তুলে জানান
            </button>

            <button
              type="button"
              onClick={() => focusQuickAction("pickup")}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-md border border-slate-700 bg-white px-5 py-3 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-100"
            >
              <CalendarClockIcon className="h-5 w-5 text-[#15803D]" />
              বাসার ময়লা দেওয়ার সময় ঠিক করুন
            </button>
          </div>

          <dl className="mt-9 grid grid-cols-3 gap-4 border-t border-slate-200 pt-6">
            <div>
              <dt className="text-xs font-medium text-slate-600 sm:text-sm">পৌরসভা কাভারেজ</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums text-slate-900 sm:text-2xl">
                {toBanglaDigits(9)}টি ওয়ার্ড
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-600 sm:text-sm">ইউনিয়ন এলাকা</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums text-slate-900 sm:text-2xl">
                {toBanglaDigits(6)}টি জোন
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-600 sm:text-sm">গড় সাড়া দেওয়ার সময়</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums text-[#15803D] sm:text-2xl">
                {toBanglaDigits("2-4")} ঘণ্টা
              </dd>
            </div>
          </dl>
        </div>

        {/* Right Interactive Live Collection Status Card */}
        <div className="lg:col-span-6">
          <div className="rounded-lg border border-slate-300 bg-white">
            {/* Card Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full bg-[#15803D]"
                  aria-hidden="true"
                />
                <h2 className="text-base font-bold text-slate-900">
                  আজকের লাইভ সংগ্রহ অবস্থা
                </h2>
              </div>
              <span className="rounded border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                সকাল শিফট • সাভার
              </span>
            </div>

            {/* Interactive Ward Filter Chips */}
            <div
              className="flex flex-wrap gap-1.5 border-b border-slate-200 bg-slate-50 px-5 py-2.5"
              role="group"
              aria-label="লাইভ এলাকা ফিল্টার"
            >
              {PREVIEW_FILTERS.map((f) => {
                const isActive = selectedFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => handleFilterClick(f.id)}
                    className={`min-h-[34px] rounded border px-2.5 py-1 text-xs font-semibold transition-colors ${
                      isActive
                        ? "border-[#15803D] bg-[#15803D] text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* Fixed-height list area to prevent layout shift */}
            <div className="divide-y divide-slate-200 min-h-[256px]">
              {visibleRows.map((zone) => {
                const isSelected = activeZone?.id === zone.id;
                const displayArea =
                  selectedFilter === "pakija" && zone.id === "ward-5"
                    ? "পাকিজা এলাকা ও ব্যাংক টাউন (ওয়ার্ড ৫)"
                    : `${zone.shortName} (${zone.code})`;

                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => setFocusedZoneId(zone.id)}
                    aria-pressed={isSelected}
                    className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors ${
                      isSelected
                        ? "bg-green-50/70"
                        : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {displayArea}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        সময়: {zone.schedule} • গাড়ি:{" "}
                        <span className="font-medium text-slate-800">{zone.vehicle}</span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <StatusBadge status={zone.liveStatus} />
                      <p className="mt-1 text-[11px] font-medium tabular-nums text-slate-600">
                        সম্পন্ন {toBanglaDigits(zone.completionPercent)}%
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Ward Telemetry Strip */}
            {activeZone ? (
              <div className="border-t border-slate-200 bg-slate-50 px-5 py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-600">
                      নির্বাচিত ওয়ার্ডের দায়িত্বপ্রাপ্ত টিম
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">
                      {activeZone.name} — সুপারভাইজার: {activeZone.supervisor}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => focusQuickAction("pickup", activeZone.id)}
                    className="inline-flex min-h-[36px] items-center rounded border border-[#15803D] bg-white px-3 py-1.5 text-xs font-semibold text-[#15803D] hover:bg-green-50"
                  >
                    এই এলাকায় পিকআপ নিন
                  </button>
                </div>

                {/* Deterministic progress bar */}
                <div className="mt-2.5">
                  <div className="h-2 w-full overflow-hidden rounded-full border border-slate-200 bg-white">
                    <div
                      className="h-full bg-[#15803D] transition-[width] duration-300"
                      style={{ width: `${activeZone.completionPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
