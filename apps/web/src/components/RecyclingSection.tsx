"use client";

import React, { useMemo, useState } from "react";
import { RECYCLING_GUIDE_CATEGORIES, toBanglaDigits } from "@/data/savarData";
import { useCleanSavar } from "@/context/CleanSavarContext";
import { CheckCircleIcon } from "./Icons";

export function RecyclingSection() {
  const { focusQuickAction } = useCleanSavar();
  const [selectedId, setSelectedId] = useState<string>(RECYCLING_GUIDE_CATEGORIES[0].id);
  const [plasticKg, setPlasticKg] = useState<number>(6);
  const [paperKg, setPaperKg] = useState<number>(8);
  const [organicKg, setOrganicKg] = useState<number>(20);

  const selectedGuide = useMemo(
    () =>
      RECYCLING_GUIDE_CATEGORIES.find((c) => c.id === selectedId) ??
      RECYCLING_GUIDE_CATEGORIES[0],
    [selectedId]
  );

  const estimatedMonthlyValue = useMemo(() => {
    return plasticKg * 22 + paperKg * 14 + organicKg * 4;
  }, [plasticKg, paperKg, organicKg]);

  const totalSortedKg = plasticKg + paperKg + organicKg;

  return (
    <section
      id="recycling"
      className="border-b border-slate-200 bg-white py-12 sm:py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-wider text-[#15803D]">
            বর্জ্য পৃথকীকরণ ও রিসাইক্লিং
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            আলাদা করা ময়লায় গড়ে উঠুক সম্পদ ও জৈব সার
          </h2>
          <p className="mt-2 text-base text-slate-600">
            পচনশীল রান্নাঘরের ময়লা ও শুকনো প্লাস্টিক-কাগজ আলাদা রাখলে ল্যান্ডফিলের চাপ কমে
            এবং সাভারের কম্পোস্ট ও রিসাইক্লিং হাবগুলোতে পুনর্ব্যবহার সহজ হয়।
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Interactive Sorting Guide */}
          <div className="rounded-lg border border-slate-300 bg-[#F8FAFC] p-5 sm:p-6 lg:col-span-7">
            <div
              className="flex flex-wrap gap-2 border-b border-slate-200 pb-4"
              role="group"
              aria-label="বর্জ্য শ্রেণি নির্বাচন"
            >
              {RECYCLING_GUIDE_CATEGORIES.map((cat) => {
                const active = cat.id === selectedGuide.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedId(cat.id)}
                    className={`min-h-[40px] rounded-md border px-3.5 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? "border-[#15803D] bg-[#15803D] text-white"
                        : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    {cat.title}
                  </button>
                );
              })}
            </div>

            <div className="mt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedGuide.title}
                </h3>
                <span className="rounded border border-green-300 bg-green-50 px-2.5 py-1 text-xs font-bold text-green-900">
                  নির্ধারিত: {selectedGuide.binLabel}
                </span>
              </div>

              <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {selectedGuide.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 rounded-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800"
                  >
                    <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#15803D]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-slate-200 bg-white p-3.5">
                  <p className="text-xs font-bold text-slate-600">সতর্কতা</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {selectedGuide.avoid}
                  </p>
                </div>
                <div className="rounded-md border border-slate-200 bg-white p-3.5">
                  <p className="text-xs font-bold text-slate-600">কোথায় প্রক্রিয়াজাত হয়</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {selectedGuide.destination}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Household Monthly Recycling Estimator */}
          <div className="flex flex-col justify-between rounded-lg border border-slate-300 bg-white p-5 sm:p-6 lg:col-span-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                মাসিক রিসাইক্লিং ও কম্পোস্ট ক্রেডিট হিসাব
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                আপনার বাসায় মাসে কত কেজি বর্জ্য আলাদা করেন তা দিয়ে আনুমানিক হাব ক্রেডিট
                দেখুন।
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                    <label htmlFor="calc-organic">রান্নাঘরের জৈব বর্জ্য (কেজি/মাস)</label>
                    <span className="tabular-nums text-[#15803D]">
                      {toBanglaDigits(organicKg)} কেজি
                    </span>
                  </div>
                  <input
                    id="calc-organic"
                    type="range"
                    min={0}
                    max={60}
                    value={organicKg}
                    onChange={(e) => setOrganicKg(Number(e.target.value))}
                    className="mt-2 w-full accent-[#15803D]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                    <label htmlFor="calc-plastic">প্লাস্টিক ও বোতল (কেজি/মাস)</label>
                    <span className="tabular-nums text-[#15803D]">
                      {toBanglaDigits(plasticKg)} কেজি
                    </span>
                  </div>
                  <input
                    id="calc-plastic"
                    type="range"
                    min={0}
                    max={30}
                    value={plasticKg}
                    onChange={(e) => setPlasticKg(Number(e.target.value))}
                    className="mt-2 w-full accent-[#15803D]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                    <label htmlFor="calc-paper">কাগজ ও কার্ডবোর্ড (কেজি/মাস)</label>
                    <span className="tabular-nums text-[#15803D]">
                      {toBanglaDigits(paperKg)} কেজি
                    </span>
                  </div>
                  <input
                    id="calc-paper"
                    type="range"
                    min={0}
                    max={30}
                    value={paperKg}
                    onChange={(e) => setPaperKg(Number(e.target.value))}
                    className="mt-2 w-full accent-[#15803D]"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-md border border-green-300 bg-green-50 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-slate-800">
                  মোট পৃথকীকৃত বর্জ্য:
                </span>
                <span className="text-base font-bold tabular-nums text-slate-900">
                  {toBanglaDigits(totalSortedKg)} কেজি / মাস
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-2 border-t border-green-200 pt-2">
                <span className="text-sm font-semibold text-slate-800">
                  আনুমানিক রিসাইক্লিং মূল্য:
                </span>
                <span className="text-2xl font-bold tabular-nums text-[#15803D]">
                  ৳ {toBanglaDigits(estimatedMonthlyValue)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => focusQuickAction("pickup")}
                className="mt-4 inline-flex min-h-[42px] w-full items-center justify-center rounded-md border border-[#15803D] bg-[#15803D] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#166534]"
              >
                আলাদা করা ময়লার পিকআপ শিডিউল করুন
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
