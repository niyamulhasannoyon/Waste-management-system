"use client";

import React, { useId, useMemo, useState } from "react";
import { useCleanSavar } from "@/context/CleanSavarContext";
import { RecyclingBatch, toBanglaDigits } from "@/data/savarData";
import { ModalDialog } from "@/components/ModalDialog";

export function WorkforceView() {
  const { collectors, toggleCollectorStatus } = useCleanSavar();
  const tableTitleId = useId();

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id={tableTitleId} className="text-base font-bold text-slate-900">
              মাঠ পর্যায়ের পরিচ্ছন্নতা কর্মী ও গাড়ি তালিকা
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              প্রতিটি কর্মীর শিফট অবস্থা পরিবর্তন করলে সক্রিয় কর্মীর সংখ্যা সাথে সাথে হালনাগাদ হয়
            </p>
          </div>
          <span className="rounded border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-800">
            মোট নিবন্ধিত টিম: {toBanglaDigits(collectors.length)}টি
          </span>
        </div>

        <div tabIndex={0} role="region" aria-labelledby={tableTitleId} className="cs-table-wrapper">
          <table className="cs-table text-left text-sm">
            <caption className="visually-hidden">কর্মী ও গাড়ির তালিকা</caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-700">
                <th scope="col" className="border-b border-slate-200 px-4 py-3">
                  কর্মীর নাম ও পদবি
                </th>
                <th scope="col" className="border-b border-slate-200 px-4 py-3">
                  গাড়ি / ভ্যান
                </th>
                <th scope="col" className="border-b border-slate-200 px-4 py-3">
                  নির্ধারিত এলাকা
                </th>
                <th scope="col" className="border-b border-slate-200 px-4 py-3">
                  কাজের হিসাব
                </th>
                <th scope="col" className="border-b border-slate-200 px-4 py-3">
                  অবস্থা ও পরিবর্তন
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {collectors.map((col) => (
                <tr key={col.id} className="bg-white">
                  <th scope="row" data-label="কর্মী" className="px-4 py-3.5 text-left font-normal">
                    <span className="block font-bold text-slate-900">{col.name}</span>
                    <span className="block text-xs text-slate-600">{col.role}</span>
                    <span className="font-latin mt-0.5 block text-xs text-slate-600">
                      {col.phone}
                    </span>
                  </th>
                  <td data-label="গাড়ি" className="px-4 py-3.5 font-medium text-slate-900">
                    {col.vehicle}
                  </td>
                  <td data-label="এলাকা" className="px-4 py-3.5 text-xs text-slate-700">
                    {col.assignedZone}
                  </td>
                  <td data-label="কাজ" className="px-4 py-3.5 tabular-nums text-xs text-slate-700">
                    চলমান: <strong className="text-slate-900">{toBanglaDigits(col.activeTasks)}</strong> •
                    সম্পন্ন: <strong className="text-[#15803D]">{toBanglaDigits(col.completedToday)}</strong>
                  </td>
                  <td data-label="অবস্থা" className="px-4 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded border px-2 py-0.5 text-xs font-semibold ${
                          col.status === "মাঠে কর্মরত"
                            ? "border-sky-300 bg-sky-50 text-sky-900"
                            : col.status === "সক্রিয়"
                              ? "border-green-300 bg-green-50 text-green-900"
                              : "border-slate-300 bg-slate-100 text-slate-700"
                        }`}
                      >
                        {col.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleCollectorStatus(col.id)}
                        className="min-h-[32px] rounded border border-slate-400 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                      >
                        শিফট বদলান
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function RecyclingAdminView() {
  const { recyclingBatches, addRecyclingBatch } = useCleanSavar();
  const [modalOpen, setModalOpen] = useState(false);
  const [hubName, setHubName] = useState("সাভার কম্পোস্ট প্ল্যান্ট (গেন্ডা)");
  const [category, setCategory] =
    useState<RecyclingBatch["category"]>("জৈব ও কম্পোস্ট");
  const [weightKg, setWeightKg] = useState("350");
  const [sourceZone, setSourceZone] = useState("ব্যাংক টাউন ও পাকিজা এলাকা");

  const totals = useMemo(() => {
    const byCategory: Record<string, number> = {};
    let total = 0;
    for (const batch of recyclingBatches) {
      byCategory[batch.category] = (byCategory[batch.category] ?? 0) + batch.weightKg;
      total += batch.weightKg;
    }
    return { byCategory, total };
  }, [recyclingBatches]);

  const handleAddBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const kg = Math.max(10, Number(weightKg) || 100);
    addRecyclingBatch({
      hubName,
      category,
      weightKg: kg,
      sourceZone,
    });
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            "জৈব ও কম্পোস্ট",
            "প্লাস্টিক ও পিইটি",
            "কাগজ ও কার্ডবোর্ড",
            "ধাতু ও কাচ",
          ] as const
        ).map((cat) => {
          const kg = totals.byCategory[cat] ?? 0;
          const pct = totals.total > 0 ? Math.round((kg / totals.total) * 100) : 0;
          return (
            <div key={cat} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-600">{cat}</p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900">
                {toBanglaDigits((kg / 1000).toFixed(2))} টন
              </p>
              <p className="mt-1 text-xs tabular-nums text-slate-600">
                মোটের {toBanglaDigits(pct)}% ({toBanglaDigits(kg)} কেজি)
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              রিসাইক্লিং ও কম্পোস্ট হাব ব্যাচ লগ
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              সাভারের রিসোর্স রিকভারি কেন্দ্রগুলোতে আজকের গৃহীত বর্জ্যের হিসাব
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="min-h-[40px] rounded-md border border-[#15803D] bg-[#15803D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#166534]"
          >
            + নতুন ব্যাচ এন্ট্রি করুন
          </button>
        </div>

        <ul className="divide-y divide-slate-200">
          {recyclingBatches.map((batch) => (
            <li
              key={batch.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
            >
              <div>
                <p className="text-sm font-bold text-slate-900">
                  <span className="font-latin mr-2 text-xs text-slate-600">{batch.id}</span>
                  {batch.hubName}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  উৎস: {batch.sourceZone} • {batch.loggedAt}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded border border-green-300 bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-900">
                  {batch.category}
                </span>
                <span className="text-sm font-bold tabular-nums text-slate-900">
                  {toBanglaDigits(batch.weightKg)} কেজি
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <ModalDialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="নতুন রিসাইক্লিং ব্যাচ যুক্ত করুন"
      >
        <form onSubmit={handleAddBatch} className="space-y-4">
          <div>
            <label htmlFor="rc-hub" className="mb-1 block text-sm font-semibold text-slate-900">
              রিসাইক্লিং হাব / প্ল্যান্ট
            </label>
            <select
              id="rc-hub"
              value={hubName}
              onChange={(e) => setHubName(e.target.value)}
              className="cs-field w-full rounded-md border border-slate-500 bg-white px-3 py-2 text-slate-900"
            >
              <option value="সাভার কম্পোস্ট প্ল্যান্ট (গেন্ডা)">সাভার কম্পোস্ট প্ল্যান্ট (গেন্ডা)</option>
              <option value="ব্যাংক টাউন রিসাইক্লিং হাব">ব্যাংক টাউন রিসাইক্লিং হাব</option>
              <option value="থানা রোড রিসোর্স কালেকশন পয়েন্ট">থানা রোড রিসোর্স কালেকশন পয়েন্ট</option>
              <option value="আমিনবাজার রিসোর্স হাব">আমিনবাজার রিসোর্স হাব</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="rc-cat" className="mb-1 block text-sm font-semibold text-slate-900">
                বর্জ্যের শ্রেণি
              </label>
              <select
                id="rc-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as RecyclingBatch["category"])}
                className="cs-field w-full rounded-md border border-slate-500 bg-white px-3 py-2 text-slate-900"
              >
                <option value="জৈব ও কম্পোস্ট">জৈব ও কম্পোস্ট</option>
                <option value="প্লাস্টিক ও পিইটি">প্লাস্টিক ও পিইটি</option>
                <option value="কাগজ ও কার্ডবোর্ড">কাগজ ও কার্ডবোর্ড</option>
                <option value="ধাতু ও কাচ">ধাতু ও কাচ</option>
              </select>
            </div>
            <div>
              <label htmlFor="rc-weight" className="mb-1 block text-sm font-semibold text-slate-900">
                ওজন (কেজি)
              </label>
              <input
                id="rc-weight"
                type="number"
                min={10}
                max={10000}
                required
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="cs-field font-latin w-full rounded-md border border-slate-500 bg-white px-3 py-2 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label htmlFor="rc-source" className="mb-1 block text-sm font-semibold text-slate-900">
              উৎস এলাকা / ওয়ার্ড
            </label>
            <input
              id="rc-source"
              type="text"
              required
              value={sourceZone}
              onChange={(e) => setSourceZone(e.target.value)}
              className="cs-field w-full rounded-md border border-slate-500 bg-white px-3 py-2 text-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="min-h-[40px] rounded-md border border-slate-400 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="min-h-[40px] rounded-md border border-[#15803D] bg-[#15803D] px-5 py-2 text-sm font-semibold text-white hover:bg-[#166534]"
            >
              সংরক্ষণ করুন
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}

export function ServiceZonesAdminView() {
  const { zones, toggleZoneActive, updateZoneSchedule } = useCleanSavar();
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState("");
  const tableTitleId = useId();

  const startEditing = (id: string, current: string) => {
    setEditingZoneId(id);
    setScheduleDraft(current);
  };

  const saveEditing = (id: string) => {
    if (scheduleDraft.trim()) {
      updateZoneSchedule(id, scheduleDraft.trim());
    }
    setEditingZoneId(null);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 id={tableTitleId} className="text-base font-bold text-slate-900">
          সাভার ওয়ার্ড ও ইউনিয়ন সার্ভিস জোন কনফিগারেশন
        </h2>
        <p className="mt-0.5 text-xs text-slate-600">
          এখান থেকে করা পরিবর্তন সরাসরি পাবলিক ল্যান্ডিং পেজের এলাকা তালিকায় প্রতিফলিত হয়
        </p>
      </div>

      <div tabIndex={0} role="region" aria-labelledby={tableTitleId} className="cs-table-wrapper">
        <table className="cs-table text-left text-sm">
          <caption className="visually-hidden">এলাকা কনফিগারেশন</caption>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-700">
              <th scope="col" className="border-b border-slate-200 px-4 py-3">
                কোড ও এলাকা
              </th>
              <th scope="col" className="border-b border-slate-200 px-4 py-3">
                মহল্লা সমূহ
              </th>
              <th scope="col" className="border-b border-slate-200 px-4 py-3">
                সংগ্রহের সময়সূচি
              </th>
              <th scope="col" className="border-b border-slate-200 px-4 py-3">
                গাড়ি ও সুপারভাইজার
              </th>
              <th scope="col" className="border-b border-slate-200 px-4 py-3">
                অবস্থা
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {zones.map((zone) => (
              <tr key={zone.id} className="bg-white">
                <th scope="row" data-label="এলাকা" className="px-4 py-3.5 text-left font-normal">
                  <span className="inline-block rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-800">
                    {zone.code}
                  </span>
                  <span className="mt-1 block font-bold text-slate-900">{zone.name}</span>
                </th>
                <td data-label="মহল্লা" className="px-4 py-3.5 text-xs text-slate-700">
                  {zone.neighborhoods.join(", ")}
                </td>
                <td data-label="সময়সূচি" className="px-4 py-3.5">
                  {editingZoneId === zone.id ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <input
                        type="text"
                        aria-label={`${zone.name} সময়সূচি`}
                        value={scheduleDraft}
                        onChange={(e) => setScheduleDraft(e.target.value)}
                        className="min-h-[34px] rounded border border-slate-500 px-2.5 py-1 text-xs text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => saveEditing(zone.id)}
                        className="min-h-[34px] rounded border border-[#15803D] bg-[#15803D] px-2.5 py-1 text-xs font-semibold text-white"
                      >
                        সেভ
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900">
                        {zone.schedule}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEditing(zone.id, zone.schedule)}
                        className="text-xs font-semibold text-[#15803D] hover:underline"
                      >
                        সম্পাদনা
                      </button>
                    </div>
                  )}
                </td>
                <td data-label="টিম" className="px-4 py-3.5 text-xs text-slate-700">
                  <span className="block font-semibold text-slate-900">{zone.supervisor}</span>
                  <span>{zone.vehicle}</span>
                </td>
                <td data-label="অবস্থা" className="px-4 py-3.5">
                  <button
                    type="button"
                    aria-pressed={zone.active}
                    onClick={() => toggleZoneActive(zone.id)}
                    className={`min-h-[34px] rounded border px-3 py-1 text-xs font-semibold transition-colors ${
                      zone.active
                        ? "border-green-300 bg-green-50 text-green-900 hover:bg-green-100"
                        : "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {zone.active ? "সেবা চালু" : "বন্ধ আছে"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
