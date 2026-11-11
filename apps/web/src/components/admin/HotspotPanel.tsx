"use client";

import React, { useMemo, useState } from "react";
import { useCleanSavar } from "@/context/CleanSavarContext";
import { Hotspot, toBanglaDigits } from "@/data/savarData";
import { AlertIcon, CheckCircleIcon } from "@/components/Icons";
import { ModalDialog } from "@/components/ModalDialog";

function SeverityBadge({ severity }: { severity: Hotspot["severity"] }) {
  if (severity === "অতি জরুরি") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-rose-300 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-900">
        <AlertIcon className="h-3 w-3 text-rose-700" />
        অতি জরুরি
      </span>
    );
  }
  if (severity === "জরুরি") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-amber-400 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-950">
        <AlertIcon className="h-3 w-3 text-amber-700" />
        জরুরি
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-800">
      পর্যবেক্ষণে
    </span>
  );
}

export function HotspotPanel() {
  const { hotspots, collectors, dispatchToHotspot, markHotspotCleared } = useCleanSavar();
  const [collectorFilter, setCollectorFilter] = useState<"সকল" | "মাঠে কর্মরত" | "সক্রিয়">(
    "সকল"
  );
  const [dispatchHotspot, setDispatchHotspot] = useState<Hotspot | null>(null);
  const [selectedCollectorId, setSelectedCollectorId] = useState<string>(
    collectors[collectors.length - 1]?.id ?? "col-6"
  );

  const visibleCollectors = useMemo(() => {
    if (collectorFilter === "সকল") return collectors;
    return collectors.filter((c) => c.status === collectorFilter);
  }, [collectors, collectorFilter]);

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchHotspot || !selectedCollectorId) return;
    dispatchToHotspot(dispatchHotspot.id, selectedCollectorId);
    setDispatchHotspot(null);
  };

  return (
    <div className="space-y-6">
      {/* High-Priority Garbage Hotspots */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              হটস্পট ও জরুরি এলাকা
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              অগ্রাধিকার ভিত্তিতে বর্জ্য জমার স্পট মনিটরিং
            </p>
          </div>
          <span className="rounded border border-rose-300 bg-rose-50 px-2 py-0.5 text-xs font-bold tabular-nums text-rose-900">
            {toBanglaDigits(hotspots.filter((h) => !h.clearedToday).length)}টি সক্রিয়
          </span>
        </div>

        <ul className="divide-y divide-slate-200">
          {hotspots.map((spot) => (
            <li key={spot.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">{spot.title}</p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {spot.wardLabel} • অনুমান: {spot.estimatedLoad}
                  </p>
                </div>
                {spot.clearedToday ? (
                  <span className="inline-flex items-center gap-1 rounded border border-green-300 bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-900">
                    <CheckCircleIcon className="h-3 w-3 text-[#15803D]" />
                    পরিষ্কার হয়েছে
                  </span>
                ) : (
                  <SeverityBadge severity={spot.severity} />
                )}
              </div>

              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-600">
                  {spot.dispatchedTeam
                    ? `টিম: ${spot.dispatchedTeam}`
                    : `সর্বশেষ পরিষ্কার: ${spot.lastCleared}`}
                </span>

                <div className="flex gap-1.5">
                  {!spot.clearedToday ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setDispatchHotspot(spot);
                          setSelectedCollectorId(collectors[5]?.id ?? collectors[0]?.id ?? "col-6");
                        }}
                        className="min-h-[30px] rounded border border-slate-400 bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 hover:bg-slate-100"
                      >
                        {spot.dispatchedTeam ? "টিম বদলান" : "টিম পাঠান"}
                      </button>
                      <button
                        type="button"
                        onClick={() => markHotspotCleared(spot.id)}
                        className="min-h-[30px] rounded border border-[#15803D] bg-white px-2.5 py-1 text-xs font-semibold text-[#15803D] hover:bg-green-50"
                      >
                        সম্পন্ন
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Active Collectors on Duty */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900">
              দায়িত্বরত কর্মী ও গাড়ি
            </h2>
            <span className="text-xs font-semibold tabular-nums text-[#15803D]">
              {toBanglaDigits(collectors.filter((c) => c.status !== "বিরতিতে").length)} জন ডিউটিতে
            </span>
          </div>

          <div
            className="mt-3 flex flex-wrap gap-1.5"
            role="group"
            aria-label="কর্মীর অবস্থা ফিল্টার"
          >
            {(["সকল", "মাঠে কর্মরত", "সক্রিয়"] as const).map((status) => {
              const active = collectorFilter === status;
              return (
                <button
                  key={status}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCollectorFilter(status)}
                  className={`min-h-[30px] rounded border px-2.5 py-1 text-xs font-semibold transition-colors ${
                    active
                      ? "border-[#15803D] bg-[#15803D] text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {status}
                </button>
              );
            })}
          </div>
        </div>

        <ul className="divide-y divide-slate-200">
          {visibleCollectors.map((col) => (
            <li key={col.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">{col.name}</p>
                <p className="mt-0.5 truncate text-xs text-slate-600">{col.assignedZone}</p>
                <p className="mt-1 text-[11px] font-medium text-slate-700">
                  গাড়ি: {col.vehicle} • চলমান: {toBanglaDigits(col.activeTasks)}টি
                </p>
              </div>
              <span
                className={`shrink-0 rounded border px-2 py-0.5 text-[11px] font-semibold ${
                  col.status === "মাঠে কর্মরত"
                    ? "border-sky-300 bg-sky-50 text-sky-900"
                    : col.status === "সক্রিয়"
                      ? "border-green-300 bg-green-50 text-green-900"
                      : "border-slate-300 bg-slate-100 text-slate-700"
                }`}
              >
                {col.status}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Hotspot Team Dispatch Modal */}
      <ModalDialog
        open={dispatchHotspot !== null}
        onClose={() => setDispatchHotspot(null)}
        title="হটস্পটে জরুরি টিম পাঠান"
        subtitle={
          dispatchHotspot
            ? `${dispatchHotspot.title} (${dispatchHotspot.wardLabel})`
            : undefined
        }
      >
        {dispatchHotspot ? (
          <form onSubmit={handleDispatchSubmit} className="space-y-4">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-slate-900">
                টিম বা গাড়ি নির্বাচন করুন
              </legend>
              <div className="space-y-2">
                {collectors.map((col) => (
                  <label
                    key={col.id}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-md border p-3 ${
                      selectedCollectorId === col.id
                        ? "border-[#15803D] bg-green-50 ring-1 ring-[#15803D]"
                        : "border-slate-300 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="hotspot-collector"
                        value={col.id}
                        checked={selectedCollectorId === col.id}
                        onChange={() => setSelectedCollectorId(col.id)}
                        className="h-4 w-4 accent-[#15803D]"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-900">{col.name}</p>
                        <p className="text-xs text-slate-600">
                          {col.vehicle} • {col.assignedZone}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-700">{col.status}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => setDispatchHotspot(null)}
                className="min-h-[40px] rounded-md border border-slate-400 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="min-h-[40px] rounded-md border border-[#15803D] bg-[#15803D] px-5 py-2 text-sm font-semibold text-white hover:bg-[#166534]"
              >
                টিম পাঠান
              </button>
            </div>
          </form>
        ) : null}
      </ModalDialog>
    </div>
  );
}
