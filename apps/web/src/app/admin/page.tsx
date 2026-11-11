"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCleanSavar } from "@/context/CleanSavarContext";
import { PICKUP_TIME_SLOTS, toBanglaDigits } from "@/data/savarData";
import { MenuIcon } from "@/components/Icons";
import {
  ADMIN_NAV_ITEMS,
  AdminSectionId,
  AdminSidebar,
} from "@/components/admin/AdminSidebar";
import { AdminKpiRow } from "@/components/admin/AdminKpiRow";
import { RequestsTable } from "@/components/admin/RequestsTable";
import { HotspotPanel } from "@/components/admin/HotspotPanel";
import {
  RecyclingAdminView,
  ServiceZonesAdminView,
  WorkforceView,
} from "@/components/admin/AdminViews";

export default function AdminDashboardPage() {
  const { requests, kpis, resetDemoData } = useCleanSavar();
  const [activeSection, setActiveSection] = useState<AdminSectionId>("overview");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const currentNav =
    ADMIN_NAV_ITEMS.find((i) => i.id === activeSection) ?? {
      id: "overview" as const,
      bn: "ড্যাশবোর্ড",
      en: "Overview",
    };

  const handleExportCsv = () => {
    const headers = ["ID", "Kind", "Area", "Address", "WasteType", "Status", "Collector"];
    const rows = requests.map((r) => [
      r.id,
      r.kind,
      r.areaTag,
      `"${r.addressOrLandmark.replace(/"/g, '""')}"`,
      `"${r.wasteType.replace(/"/g, '""')}"`,
      r.status,
      `"${(r.assignedCollectorName ?? "Unassigned").replace(/"/g, '""')}"`,
    ]);
    const csv = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clean-savar-operations.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-dvh bg-[#F8FAFC] text-[#0F172A]">
      <AdminSidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        pendingCount={kpis.pendingRequestsCount}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Workspace Header */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                aria-label="অ্যাডমিন নেভিগেশন খুলুন"
                aria-expanded={mobileSidebarOpen}
                aria-controls="admin-mobile-sidebar"
                className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 lg:hidden"
              >
                <MenuIcon className="h-5 w-5" />
              </button>
              <div>
                <div className="flex flex-wrap items-baseline gap-2">
                  <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
                    {currentNav.bn}
                  </h1>
                  <span className="font-latin text-xs font-semibold uppercase tracking-wider text-slate-500">
                    ({currentNav.en})
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  সাভার পৌরসভা ও ইউনিয়ন পরিষদ বর্জ্য অপারেশনস প্যানেল
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                className="min-h-[38px] rounded-md border border-slate-400 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-100"
              >
                CSV এক্সপোর্ট
              </button>
              <button
                type="button"
                onClick={resetDemoData}
                className="min-h-[38px] rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                ডেটা রিসেট
              </button>
              <Link
                href="/"
                className="inline-flex min-h-[38px] items-center rounded-md border border-[#15803D] bg-[#15803D] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#166534]"
              >
                পাবলিক সাইট (/)
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          {activeSection === "overview" ? (
            <>
              <AdminKpiRow />
              {/* Main Split View: Left 65% Table / Right 35% Hotspots & Collectors */}
              <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
                <RequestsTable />
                <HotspotPanel />
              </div>
            </>
          ) : null}

          {activeSection === "pickups" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {PICKUP_TIME_SLOTS.map((slot) => {
                  const count = requests.filter(
                    (r) => r.kind === "pickup" && r.timeSlot === slot
                  ).length;
                  return (
                    <div
                      key={slot}
                      className="rounded-lg border border-slate-200 bg-white p-4"
                    >
                      <p className="text-xs font-semibold text-slate-600">স্লট সময়সূচি</p>
                      <p className="mt-1 text-base font-bold text-slate-900">{slot}</p>
                      <p className="mt-1 text-xs font-semibold tabular-nums text-[#15803D]">
                        নির্ধারিত পিকআপ: {toBanglaDigits(count)}টি
                      </p>
                    </div>
                  );
                })}
              </div>
              <RequestsTable
                lockedKind="pickup"
                title="বাসাবাড়ি থেকে ময়লা সংগ্রহের পিকআপ রিকোয়েস্ট (Pickups)"
              />
            </div>
          ) : null}

          {activeSection === "complaints" ? (
            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
              <RequestsTable
                lockedKind="report"
                title="নাগরিক অভিযোগ ও রাস্তার ময়লার রিপোর্ট (Complaints)"
              />
              <HotspotPanel />
            </div>
          ) : null}

          {activeSection === "workforce" ? <WorkforceView /> : null}
          {activeSection === "recycling" ? <RecyclingAdminView /> : null}
          {activeSection === "zones" ? <ServiceZonesAdminView /> : null}
        </main>
      </div>
    </div>
  );
}
