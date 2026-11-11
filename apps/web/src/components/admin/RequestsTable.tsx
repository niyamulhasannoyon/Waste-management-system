"use client";

import React, { useId, useMemo, useState } from "react";
import { useCleanSavar } from "@/context/CleanSavarContext";
import { RequestKind, RequestStatus, toBanglaDigits, WasteRequest } from "@/data/savarData";
import {
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  SearchIcon,
  TruckIcon,
} from "@/components/Icons";
import { ModalDialog } from "@/components/ModalDialog";

interface RequestsTableProps {
  lockedKind?: RequestKind;
  title?: string;
}

const STATUS_OPTIONS: ("সকল" | RequestStatus)[] = [
  "সকল",
  "পেন্ডিং",
  "কালেক্টর পথে আছেন",
  "সংগ্রহ সম্পন্ন",
];

function RequestStatusBadge({ status }: { status: RequestStatus }) {
  if (status === "সংগ্রহ সম্পন্ন") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-green-300 bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-900">
        <CheckCircleIcon className="h-3.5 w-3.5 text-[#15803D]" />
        সংগ্রহ সম্পন্ন
      </span>
    );
  }
  if (status === "কালেক্টর পথে আছেন") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-sky-300 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-900">
        <TruckIcon className="h-3.5 w-3.5 text-sky-700" />
        কালেক্টর পথে আছেন
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded border border-amber-400 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-950">
      <ClockIcon className="h-3.5 w-3.5 text-amber-700" />
      পেন্ডিং
    </span>
  );
}

export function RequestsTable({
  lockedKind,
  title = "সাম্প্রতিক ময়লার রিপোর্ট ও পিকআপ রিকোয়েস্ট",
}: RequestsTableProps) {
  const { requests, collectors, assignCollector, markRequestCompleted } = useCleanSavar();

  const [statusFilter, setStatusFilter] = useState<"সকল" | RequestStatus>("সকল");
  const [kindFilter, setKindFilter] = useState<"all" | RequestKind>(lockedKind ?? "all");
  const [areaFilter, setAreaFilter] = useState<string>("সব এলাকা");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [assignModalReq, setAssignModalReq] = useState<WasteRequest | null>(null);
  const [selectedCollectorId, setSelectedCollectorId] = useState<string>(
    collectors[0]?.id ?? "col-1"
  );
  const [detailReq, setDetailReq] = useState<WasteRequest | null>(null);
  const [statusAnnouncement, setStatusAnnouncement] = useState<string>("");

  const titleId = useId();
  const effectiveKind = lockedKind ?? kindFilter;

  const areaTags = useMemo(() => {
    const unique = Array.from(new Set(requests.map((r) => r.areaTag)));
    return ["সব এলাকা", ...unique];
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests.filter((req) => {
      if (effectiveKind !== "all" && req.kind !== effectiveKind) return false;
      if (statusFilter !== "সকল" && req.status !== statusFilter) return false;
      if (areaFilter !== "সব এলাকা" && req.areaTag !== areaFilter) return false;
      if (!q) return true;
      return [
        req.id,
        req.areaTag,
        req.addressOrLandmark,
        req.wasteType,
        req.assignedCollectorName ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [requests, effectiveKind, statusFilter, areaFilter, searchQuery]);

  const openAssignModal = (req: WasteRequest) => {
    setAssignModalReq(req);
    const matchingCollector =
      collectors.find((c) => c.assignedZone.includes(req.areaTag)) ??
      collectors.find((c) => c.status !== "বিরতিতে") ??
      collectors[0];
    if (matchingCollector) setSelectedCollectorId(matchingCollector.id);
  };

  const handleConfirmAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalReq || !selectedCollectorId) return;
    const collector = collectors.find((c) => c.id === selectedCollectorId);
    assignCollector(assignModalReq.id, selectedCollectorId);
    setStatusAnnouncement(
      `${assignModalReq.id} রিকোয়েস্টে ${collector?.name ?? "কর্মী"} অ্যাসাইন করা হয়েছে।`
    );
    setAssignModalReq(null);
  };

  const handleComplete = (req: WasteRequest) => {
    markRequestCompleted(req.id);
    setStatusAnnouncement(`${req.id} সংগ্রহ সম্পন্ন হিসেবে চিহ্নিত হয়েছে।`);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div aria-live="polite" className="visually-hidden">
        {statusAnnouncement}
      </div>

      {/* Header & Search */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <h2 id={titleId} className="text-base font-bold text-slate-900">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">
            মোট {toBanglaDigits(filteredRequests.length)}টি রেকর্ড প্রদর্শিত হচ্ছে
          </p>
        </div>

        <search className="w-full sm:w-64">
          <label htmlFor="admin-table-search" className="visually-hidden">
            আইডি, এলাকা বা ঠিকানা খুঁজুন
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="admin-table-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="আইডি বা এলাকা খুঁজুন..."
              className="w-full min-h-[40px] rounded-md border border-slate-400 bg-white pl-9 pr-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-500"
            />
          </div>
        </search>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="অবস্থা ফিল্টার">
          {STATUS_OPTIONS.map((status) => {
            const active = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                aria-pressed={active}
                onClick={() => setStatusFilter(status)}
                className={`min-h-[34px] rounded border px-2.5 py-1 text-xs font-semibold transition-colors ${
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

        <div className="flex flex-wrap items-center gap-2">
          {!lockedKind ? (
            <div>
              <label htmlFor="admin-kind-filter" className="visually-hidden">
                রিকোয়েস্টের ধরন
              </label>
              <select
                id="admin-kind-filter"
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value as "all" | RequestKind)}
                className="min-h-[34px] rounded border border-slate-400 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
              >
                <option value="all">সব ধরন</option>
                <option value="report">নাগরিক অভিযোগ</option>
                <option value="pickup">বাসা পিকআপ</option>
              </select>
            </div>
          ) : null}

          <div>
            <label htmlFor="admin-area-filter" className="visually-hidden">
              এলাকা ফিল্টার
            </label>
            <select
              id="admin-area-filter"
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="min-h-[34px] rounded border border-slate-400 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
            >
              {areaTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Responsive Table */}
      {filteredRequests.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm font-semibold text-slate-900">
            নির্বাচিত ফিল্টারে কোনো রিপোর্ট বা পিকআপ পাওয়া যায়নি।
          </p>
          <button
            type="button"
            onClick={() => {
              setStatusFilter("সকল");
              setAreaFilter("সব এলাকা");
              setSearchQuery("");
              if (!lockedKind) setKindFilter("all");
            }}
            className="mt-3 inline-flex min-h-[36px] items-center rounded border border-slate-400 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
          >
            ফিল্টার রিসেট করুন
          </button>
        </div>
      ) : (
      <div
        tabIndex={0}
        role="region"
        aria-labelledby={titleId}
        className="cs-table-wrapper border-0 rounded-none"
      >
        <table className="cs-table text-left text-sm">
            <caption className="visually-hidden">{title}</caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-700">
                <th scope="col" className="border-b border-slate-200 px-3.5 py-3">
                  আইডি ও সময়
                </th>
                <th scope="col" className="border-b border-slate-200 px-3.5 py-3">
                  বিবরণ ও ধরন
                </th>
                <th scope="col" className="border-b border-slate-200 px-3.5 py-3">
                  এলাকা
                </th>
                <th scope="col" className="border-b border-slate-200 px-3.5 py-3">
                  অবস্থা
                </th>
                <th scope="col" className="border-b border-slate-200 px-3.5 py-3">
                  দায়িত্ব ও অ্যাকশন
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="bg-white hover:bg-slate-50/70">
                  <th
                    scope="row"
                    data-label="আইডি ও সময়"
                    className="whitespace-nowrap px-3.5 py-3.5 align-top font-normal"
                  >
                    <span className="font-latin block text-sm font-bold text-slate-900">
                      {req.id}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-600">
                      {req.createdAtLabel}
                    </span>
                    <span
                      className={`mt-1 inline-block rounded border px-1.5 py-0.5 text-[11px] font-semibold ${
                        req.kind === "report"
                          ? "border-rose-300 bg-rose-50 text-rose-900"
                          : "border-slate-300 bg-slate-100 text-slate-800"
                      }`}
                    >
                      {req.kind === "report" ? "অভিযোগ" : "পিকআপ"}
                    </span>
                  </th>

                  <td data-label="বিবরণ ও ধরন" className="px-3.5 py-3.5 align-top">
                    <p className="font-semibold text-slate-900">{req.wasteType}</p>
                    <p className="mt-0.5 max-w-xs text-xs text-slate-700">
                      {req.addressOrLandmark}
                    </p>
                    {req.timeSlot ? (
                      <p className="mt-1 text-[11px] font-medium text-slate-600">
                        সময়সূচি: {req.timeSlot}
                      </p>
                    ) : null}
                  </td>

                  <td data-label="এলাকা" className="whitespace-nowrap px-3.5 py-3.5 align-top">
                    <span className="inline-block rounded border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-900">
                      {req.areaTag}
                    </span>
                  </td>

                  <td data-label="অবস্থা" className="whitespace-nowrap px-3.5 py-3.5 align-top">
                    <RequestStatusBadge status={req.status} />
                    {req.assignedCollectorName ? (
                      <p className="mt-1 text-xs text-slate-700">
                        কর্মী: {req.assignedCollectorName}
                      </p>
                    ) : null}
                  </td>

                  <td data-label="অ্যাকশন" className="whitespace-nowrap px-3.5 py-3.5 align-top">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {req.status === "পেন্ডিং" ? (
                        <button
                          type="button"
                          onClick={() => openAssignModal(req)}
                          className="min-h-[34px] whitespace-nowrap rounded border border-[#15803D] bg-[#15803D] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#166534]"
                        >
                          কর্মী অ্যাসাইন করুন
                        </button>
                      ) : req.status === "কালেক্টর পথে আছেন" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleComplete(req)}
                            className="min-h-[34px] whitespace-nowrap rounded border border-[#15803D] bg-white px-2.5 py-1 text-xs font-semibold text-[#15803D] hover:bg-green-50"
                          >
                            সংগ্রহ সম্পন্ন
                          </button>
                          <button
                            type="button"
                            onClick={() => openAssignModal(req)}
                            className="min-h-[34px] whitespace-nowrap rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            পরিবর্তন
                          </button>
                        </>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => setDetailReq(req)}
                        className="min-h-[34px] whitespace-nowrap rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        বিস্তারিত
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>
      )}

      {/* Assign Collector Native Modal */}
      <ModalDialog
        open={assignModalReq !== null}
        onClose={() => setAssignModalReq(null)}
        title="কর্মী ও গাড়ি অ্যাসাইন করুন"
        subtitle={
          assignModalReq
            ? `${assignModalReq.id} • ${assignModalReq.areaTag} — ${assignModalReq.addressOrLandmark}`
            : undefined
        }
      >
        {assignModalReq ? (
          <form onSubmit={handleConfirmAssign} className="space-y-4">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-slate-900">
                সাভারের দায়িত্বরত কর্মী নির্বাচন করুন
              </legend>
              <div className="space-y-2">
                {collectors.map((col) => {
                  const checked = selectedCollectorId === col.id;
                  return (
                    <label
                      key={col.id}
                      className={`flex cursor-pointer items-start justify-between gap-3 rounded-md border p-3 ${
                        checked
                          ? "border-[#15803D] bg-green-50 ring-1 ring-[#15803D]"
                          : "border-slate-300 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="radio"
                          name="assign-collector"
                          value={col.id}
                          checked={checked}
                          onChange={() => setSelectedCollectorId(col.id)}
                          className="mt-1 h-4 w-4 accent-[#15803D]"
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{col.name}</p>
                          <p className="text-xs text-slate-600">
                            {col.role} • {col.vehicle}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-700">
                            দায়িত্বাধীন এলাকা: {col.assignedZone}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="inline-block rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-800">
                          {col.status}
                        </span>
                        <p className="mt-1 text-[11px] tabular-nums text-slate-600">
                          চলমান কাজ: {toBanglaDigits(col.activeTasks)}টি
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setAssignModalReq(null)}
                className="min-h-[40px] rounded-md border border-slate-400 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="min-h-[40px] rounded-md border border-[#15803D] bg-[#15803D] px-5 py-2 text-sm font-semibold text-white hover:bg-[#166534]"
              >
                অ্যাসাইন নিশ্চিত করুন
              </button>
            </div>
          </form>
        ) : null}
      </ModalDialog>

      {/* Request Detail Modal */}
      <ModalDialog
        open={detailReq !== null}
        onClose={() => setDetailReq(null)}
        title={detailReq ? `রিকোয়েস্ট বিস্তারিত — ${detailReq.id}` : "বিস্তারিত"}
        subtitle={detailReq ? `${detailReq.areaTag} • ${detailReq.createdAtLabel}` : undefined}
      >
        {detailReq ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 p-3.5">
              <RequestStatusBadge status={detailReq.status} />
              <span className="text-xs font-semibold text-slate-700">
                অগ্রাধিকার: {detailReq.priority}
              </span>
            </div>

            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="rounded border border-slate-200 p-3">
                <dt className="text-xs font-semibold text-slate-600">ধরন ও বর্জ্য</dt>
                <dd className="mt-1 font-bold text-slate-900">{detailReq.wasteType}</dd>
              </div>
              <div className="rounded border border-slate-200 p-3">
                <dt className="text-xs font-semibold text-slate-600">অবস্থান / ঠিকানা</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {detailReq.addressOrLandmark}
                </dd>
              </div>
              {detailReq.gpsLabel ? (
                <div className="rounded border border-slate-200 p-3">
                  <dt className="text-xs font-semibold text-slate-600">জিপিএস কোঅর্ডিনেট</dt>
                  <dd className="font-latin mt-1 flex items-center gap-1 font-medium text-slate-900">
                    <MapPinIcon className="h-3.5 w-3.5 text-[#15803D]" />
                    {detailReq.gpsLabel}
                  </dd>
                </div>
              ) : null}
              {detailReq.reporterPhone ? (
                <div className="rounded border border-slate-200 p-3">
                  <dt className="text-xs font-semibold text-slate-600">নাগরিকের মোবাইল</dt>
                  <dd className="font-latin mt-1 font-semibold text-slate-900">
                    {detailReq.reporterPhone}
                  </dd>
                </div>
              ) : null}
            </dl>

            {detailReq.notes ? (
              <div className="rounded border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-600">অতিরিক্ত নোট</p>
                <p className="mt-1 text-sm text-slate-800">{detailReq.notes}</p>
              </div>
            ) : null}

            {detailReq.photoPreview ? (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-600">
                  সংযুক্ত ছবি ({detailReq.photoName ?? "ছবি"})
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={detailReq.photoPreview}
                  alt="নাগরিকের পাঠানো ময়লার ছবি"
                  className="max-h-56 w-full rounded-md border border-slate-300 object-cover"
                />
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-3">
              {detailReq.status === "পেন্ডিং" ? (
                <button
                  type="button"
                  onClick={() => {
                    const target = detailReq;
                    setDetailReq(null);
                    openAssignModal(target);
                  }}
                  className="min-h-[40px] rounded-md border border-[#15803D] bg-[#15803D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#166534]"
                >
                  কর্মী অ্যাসাইন করুন
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setDetailReq(null)}
                className="min-h-[40px] rounded-md border border-slate-400 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        ) : null}
      </ModalDialog>
    </div>
  );
}
