"use client";

import React from "react";
import { useCleanSavar } from "@/context/CleanSavarContext";
import { toBanglaDigits } from "@/data/savarData";

export function AdminKpiRow() {
  const { kpis } = useCleanSavar();

  const cards = [
    {
      label: "আজকের মোট সংগ্রহ",
      en: "Total Collected Today",
      value: `${toBanglaDigits(kpis.totalCollectedTons.toFixed(1))} টন`,
      note: "গতকাল থেকে +০.৪ টন বেশি • ৯ ওয়ার্ড ও ইউনিয়ন",
      highlight: false,
    },
    {
      label: "পেন্ডিং রিকোয়েস্ট",
      en: "Pending Requests",
      value: `${toBanglaDigits(kpis.pendingRequestsCount)}টি`,
      note: "পিকআপ ও রাস্তার অভিযোগ সমন্বিত",
      highlight: kpis.pendingRequestsCount > 0,
    },
    {
      label: "সমাধানকৃত অভিযোগ",
      en: "Complaints Resolved",
      value: `${toBanglaDigits(kpis.resolvedComplaintsPercent)}%`,
      note: "গড় নিষ্পত্তি সময় ২ ঘণ্টা ৪০ মিনিট",
      highlight: false,
    },
    {
      label: "সক্রিয় কর্মী",
      en: "Active Field Staff",
      value: `${toBanglaDigits(kpis.activeWorkersCount)} জন`,
      note: "কম্প্যাক্টর, ভ্যান ও র‍্যাপিড টিম মাঠে",
      highlight: false,
    },
  ];

  return (
    <section aria-label="আজকের মূল পরিসংখ্যান">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-slate-200 bg-white p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-slate-700">{card.label}</p>
              <span className="font-latin text-[11px] font-medium text-slate-500">
                {card.en}
              </span>
            </div>
            <p
              className={`mt-2 text-3xl font-bold tabular-nums tracking-tight ${
                card.highlight ? "text-amber-800" : "text-slate-900"
              }`}
            >
              {card.value}
            </p>
            <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-600">
              {card.note}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
