"use client";

import React, { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { CleanSavarMark, CloseIcon } from "@/components/Icons";

export type AdminSectionId =
  | "overview"
  | "pickups"
  | "complaints"
  | "workforce"
  | "recycling"
  | "zones";

export const ADMIN_NAV_ITEMS: {
  id: AdminSectionId;
  bn: string;
  en: string;
}[] = [
  { id: "overview", bn: "ড্যাশবোর্ড", en: "Overview" },
  { id: "pickups", bn: "পিকআপ রিকোয়েস্ট", en: "Pickups" },
  { id: "complaints", bn: "নাগরিক অভিযোগ", en: "Complaints" },
  { id: "workforce", bn: "কর্মী ও গাড়ি", en: "Workforce" },
  { id: "recycling", bn: "রিসাইক্লিং", en: "Recycling" },
  { id: "zones", bn: "এলাকা কনফিগারেশন", en: "Service Zones" },
];

interface AdminSidebarProps {
  activeSection: AdminSectionId;
  onSelectSection: (section: AdminSectionId) => void;
  pendingCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function SidebarContent({
  activeSection,
  onSelectSection,
  pendingCount,
  onAfterSelect,
}: {
  activeSection: AdminSectionId;
  onSelectSection: (section: AdminSectionId) => void;
  pendingCount: number;
  onAfterSelect?: () => void;
}) {
  return (
    <div className="flex h-full flex-col justify-between bg-white">
      <div>
        <div className="border-b border-slate-200 px-5 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <CleanSavarMark className="h-8 w-8" />
            <div>
              <span className="block text-base font-bold text-slate-900">
                ক্লিন সাভার
              </span>
              <span className="font-latin block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Operations Admin
              </span>
            </div>
          </Link>
        </div>

        <nav aria-label="অ্যাডমিন সেকশন নেভিগেশন" className="px-3 py-4">
          <ul className="space-y-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const active = activeSection === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => {
                      onSelectSection(item.id);
                      onAfterSelect?.();
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-md border px-3.5 py-2.5 text-left transition-colors ${
                      active
                        ? "border-[#15803D] bg-green-50 text-slate-900"
                        : "border-transparent bg-transparent text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div>
                      <span
                        className={`block text-sm font-semibold ${
                          active ? "text-[#15803D]" : "text-slate-900"
                        }`}
                      >
                        {item.bn}
                      </span>
                      <span className="font-latin block text-[11px] font-medium text-slate-600">
                        {item.en}
                      </span>
                    </div>
                    {item.id === "overview" && pendingCount > 0 ? (
                      <span className="font-latin rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-amber-950">
                        {pendingCount}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="border-t border-slate-200 p-4">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-900">সাভার পৌরসভা কন্ট্রোল রুম</p>
          <p className="mt-0.5 text-[11px] text-slate-600">সকাল শিফট • ওয়ার্ড ১–৯ ও ইউনিয়ন</p>
          <Link
            href="/"
            className="mt-3 inline-flex min-h-[36px] w-full items-center justify-center rounded border border-slate-400 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-100"
          >
            ← নাগরিক পোর্টালে ফিরুন
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AdminSidebar({
  activeSection,
  onSelectSection,
  pendingCount,
  mobileOpen,
  onCloseMobile,
}: AdminSidebarProps) {
  const drawerRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = drawerRef.current;
    if (!dialog) return;
    if (mobileOpen && !dialog.open) dialog.showModal();
    else if (!mobileOpen && dialog.open) dialog.close();
  }, [mobileOpen]);

  useEffect(() => {
    const dialog = drawerRef.current;
    if (!dialog) return;
    const onClose = () => {
      dialog.returnValue = "";
      onCloseMobile();
    };
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [onCloseMobile]);

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="sticky top-0 h-dvh overflow-y-auto">
          <SidebarContent
            activeSection={activeSection}
            onSelectSection={onSelectSection}
            pendingCount={pendingCount}
          />
        </div>
      </aside>

      <dialog
        id="admin-mobile-sidebar"
        ref={drawerRef}
        aria-labelledby={titleId}
        {...({ closedby: "any" } as Record<string, string>)}
        className="ml-0 mr-auto my-0 h-dvh max-h-dvh w-[min(19rem,84vw)] border-r border-slate-300 bg-white p-0 text-slate-900"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 id={titleId} className="text-sm font-bold text-slate-900">
              অ্যাডমিন মেনু
            </h2>
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="সাইডবার বন্ধ করুন"
              className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SidebarContent
              activeSection={activeSection}
              onSelectSection={onSelectSection}
              pendingCount={pendingCount}
              onAfterSelect={onCloseMobile}
            />
          </div>
        </div>
      </dialog>
    </>
  );
}
