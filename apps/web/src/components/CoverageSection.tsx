"use client";

import React, { useMemo, useState } from "react";
import { useCleanSavar } from "@/context/CleanSavarContext";
import { toBanglaDigits, ZoneType } from "@/data/savarData";
import { SearchIcon } from "./Icons";

type CoverageFilter = "all" | ZoneType;

export function CoverageSection() {
  const { zones, focusQuickAction } = useCleanSavar();
  const [filter, setFilter] = useState<CoverageFilter>("all");
  const [query, setQuery] = useState("");

  const filteredZones = useMemo(() => {
    const q = query.trim().toLowerCase();
    return zones.filter((zone) => {
      if (filter !== "all" && zone.type !== filter) return false;
      if (!q) return true;
      const haystack = [
        zone.code,
        zone.name,
        zone.shortName,
        ...zone.neighborhoods,
        zone.supervisor,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [zones, filter, query]);

  const counts = useMemo(() => {
    const muni = zones.filter((z) => z.type === "municipality").length;
    const union = zones.filter((z) => z.type === "union").length;
    return { all: zones.length, municipality: muni, union };
  }, [zones]);

  return (
    <section
      id="coverage"
      className="border-b border-slate-200 bg-[#F8FAFC] py-12 sm:py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-wider text-[#15803D]">
              এলাকা ও সময়সূচি
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              সাভার পৌরসভা ও ইউনিয়ন পরিষদ সেবা অঞ্চল
            </h2>
            <p className="mt-2 text-base text-slate-600">
              আপনার ওয়ার্ড বা মহল্লার নাম লিখে খুঁজুন এবং প্রতিদিনের ময়লা সংগ্রহের সময়সূচি
              দেখে নিন।
            </p>
          </div>

          <search className="w-full lg:w-80">
            <label htmlFor="coverage-search" className="visually-hidden">
              এলাকা বা মহল্লার নাম দিয়ে খুঁজুন
            </label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="coverage-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="খুঁজুন: ব্যাংক টাউন, থানা রোড, রাজাশন..."
                className="cs-field w-full rounded-md border border-slate-500 bg-white pl-10 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-500"
              />
            </div>
          </search>
        </div>

        {/* Segmented Filter */}
        <div
          className="mt-6 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4"
          role="group"
          aria-label="অঞ্চলের ধরন অনুযায়ী ফিল্টার"
        >
          {(
            [
              { id: "all", label: `সকল এলাকা (${toBanglaDigits(counts.all)})` },
              {
                id: "municipality",
                label: `সাভার পৌরসভা ওয়ার্ড ১–৯ (${toBanglaDigits(counts.municipality)})`,
              },
              {
                id: "union",
                label: `ইউনিয়ন পরিষদ এলাকা (${toBanglaDigits(counts.union)})`,
              },
            ] as const
          ).map((btn) => {
            const active = filter === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(btn.id)}
                className={`min-h-[40px] rounded-md border px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "border-[#15803D] bg-[#15803D] text-white"
                    : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                }`}
              >
                {btn.label}
              </button>
            );
          })}
        </div>

        {/* Zone Cards Grid */}
        {filteredZones.length === 0 ? (
          <div className="mt-6 rounded-lg border border-slate-300 bg-white p-8 text-center">
            <p className="text-base font-semibold text-slate-900">
              “{query}” নামে কোনো ওয়ার্ড বা এলাকা পাওয়া যায়নি।
            </p>
            <p className="mt-1 text-sm text-slate-600">
              যেমন: রেডিও কলোনি, পাকিজা, ব্যাংক কলোনি, হেমায়েতপুর বা আশুলিয়া লিখে চেষ্টা করুন।
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
              className="mt-4 inline-flex min-h-[40px] items-center rounded-md border border-slate-700 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              সব এলাকা দেখুন
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredZones.map((zone) => (
              <article
                key={zone.id}
                className="flex flex-col justify-between rounded-lg border border-slate-300 bg-white p-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800">
                        {zone.code}
                      </span>
                      <h3 className="mt-2 text-base font-bold text-slate-900">
                        {zone.name}
                      </h3>
                    </div>
                    <span
                      className={`shrink-0 rounded border px-2 py-0.5 text-xs font-semibold ${
                        zone.active
                          ? "border-green-300 bg-green-50 text-green-900"
                          : "border-slate-300 bg-slate-100 text-slate-700"
                      }`}
                    >
                      {zone.active ? "সেবা চালু" : "সাময়িক বন্ধ"}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">আওতাভুক্ত এলাকা: </span>
                    {zone.neighborhoods.join(", ")}
                  </p>

                  <dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-700">
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-600">সংগ্রহের সময়:</dt>
                      <dd className="font-semibold text-slate-900">{zone.schedule}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-600">সাপ্তাহিক রুট:</dt>
                      <dd className="font-semibold text-slate-900">{zone.frequency}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-600">নির্ধারিত গাড়ি:</dt>
                      <dd className="font-medium text-slate-900">{zone.vehicle}</dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3.5">
                  <button
                    type="button"
                    onClick={() => focusQuickAction("pickup", zone.id)}
                    className="flex-1 min-h-[38px] rounded border border-[#15803D] bg-white px-3 py-1.5 text-xs font-semibold text-[#15803D] transition-colors hover:bg-green-50"
                  >
                    পিকআপ নিন
                  </button>
                  <button
                    type="button"
                    onClick={() => focusQuickAction("report", zone.id)}
                    className="flex-1 min-h-[38px] rounded border border-slate-400 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100"
                  >
                    রিপোর্ট করুন
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
