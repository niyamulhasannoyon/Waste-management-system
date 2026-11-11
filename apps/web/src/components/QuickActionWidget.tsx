"use client";

import React, { useId, useRef } from "react";
import { useCleanSavar } from "@/context/CleanSavarContext";
import { RequestKind } from "@/data/savarData";
import { PickupRequestForm, ReportWasteForm } from "./ActionForms";

const TABS: { id: RequestKind; label: string; hint: string }[] = [
  {
    id: "report",
    label: "ময়লার রিপোর্ট করুন",
    hint: "রাস্তা, ড্রেন বা বাজারের খোলা ময়লার ছবি ও জিপিএস পিন পাঠান",
  },
  {
    id: "pickup",
    label: "বাসা থেকে ময়লা সংগ্রহ",
    hint: "বাসার ঠিকানা, বর্জ্যের ধরন ও সুবিধাজনক পিকআপ সময় নির্ধারণ করুন",
  },
];

export function QuickActionWidget() {
  const { activeActionTab, setActiveActionTab } = useCleanSavar();
  const reportTabId = useId();
  const pickupTabId = useId();
  const reportBtnRef = useRef<HTMLButtonElement>(null);
  const pickupBtnRef = useRef<HTMLButtonElement>(null);

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      nextIndex = currentIndex === 0 ? 1 : 0;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const nextTab = TABS[nextIndex];
      if (!nextTab) return;
      setActiveActionTab(nextTab.id);
      const targetRef = nextIndex === 0 ? reportBtnRef : pickupBtnRef;
      targetRef.current?.focus();
    }
  };

  return (
    <section
      id="services"
      className="border-b border-slate-200 bg-[#F8FAFC] py-10 sm:py-12"
    >
      <div id="quick-action" className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#15803D]">
              দ্রুত নাগরিক সেবা
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              রিপোর্ট পাঠান বা বাসার পিকআপ সময় ঠিক করুন
            </h2>
          </div>
          <p className="text-sm text-slate-600">
            কোনো অ্যাপ ডাউনলোড বা লগইন ছাড়াই সরাসরি ফর্ম জমা দিন
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
          {/* Accessible single-row tablist */}
          <div
            role="tablist"
            aria-label="সেবার ধরন নির্বাচন"
            className="flex overflow-x-auto border-b border-slate-200 bg-slate-50"
          >
            {TABS.map((tab, idx) => {
              const selected = activeActionTab === tab.id;
              const tabDomId = tab.id === "report" ? reportTabId : pickupTabId;
              const tabRef = tab.id === "report" ? reportBtnRef : pickupBtnRef;

              return (
                <button
                  key={tab.id}
                  ref={tabRef}
                  id={tabDomId}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveActionTab(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, idx)}
                  className={`relative flex-none px-5 py-4 text-left transition-colors sm:flex-1 sm:px-6 ${
                    selected
                      ? "bg-white text-slate-900"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span className="block text-base font-bold">{tab.label}</span>
                  <span className="mt-0.5 block text-xs font-normal text-slate-600">
                    {tab.hint}
                  </span>
                  {selected ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 border-b-[3px] border-[#15803D]"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Tab panels: inner wrapper holds padding so hidden attribute stays clean */}
          <div
            role="tabpanel"
            aria-labelledby={reportTabId}
            hidden={activeActionTab !== "report"}
          >
            <div className="p-5 sm:p-6">
              <ReportWasteForm idPrefix="inline" />
            </div>
          </div>

          <div
            role="tabpanel"
            aria-labelledby={pickupTabId}
            hidden={activeActionTab !== "pickup"}
          >
            <div className="p-5 sm:p-6">
              <PickupRequestForm idPrefix="inline" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
