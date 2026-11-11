"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useCleanSavar } from "@/context/CleanSavarContext";
import { CleanSavarMark, CloseIcon, MenuIcon } from "./Icons";

const NAV_LINKS = [
  { href: "#services", label: "সেবাসমূহ" },
  { href: "#how-it-works", label: "কীভাবে কাজ করে" },
  { href: "#coverage", label: "এলাকা" },
  { href: "#recycling", label: "রিসাইক্লিং" },
] as const;

export function Navbar() {
  const { openActionModal } = useCleanSavar();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const drawerTitleId = useId();

  useEffect(() => {
    const dialog = drawerRef.current;
    if (!dialog) return;
    if (drawerOpen && !dialog.open) {
      dialog.showModal();
    } else if (!drawerOpen && dialog.open) {
      dialog.close();
    }
  }, [drawerOpen]);

  useEffect(() => {
    const dialog = drawerRef.current;
    if (!dialog) return;
    const onClose = () => {
      dialog.returnValue = "";
      setDrawerOpen(false);
    };
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  return (
    <>
      <a
        href="#main-content"
        className="visually-hidden fixed left-3 top-3 z-50 rounded-md border border-slate-900 bg-white px-4 py-2 text-sm font-semibold text-slate-900"
      >
        মূল বিষয়ে যান
      </a>

      {/* Top civic utility bar */}
      <div className="border-b border-slate-200 bg-white text-xs text-slate-700">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-1.5 sm:px-6 lg:px-8">
          <p className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[#15803D]" aria-hidden="true" />
            <span>সাভার পৌরসভা ও উপজেলা বর্জ্য ব্যবস্থাপনা সেবা • নাগরিক হটলাইন: ১৬১২৪</span>
          </p>
          <Link
            href="/admin"
            className="font-semibold text-[#15803D] underline-offset-4 hover:underline"
          >
            অপারেশনস ও অ্যাডমিন পোর্টাল →
          </Link>
        </div>
      </div>

      {/* Main Sticky Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <CleanSavarMark className="h-8 w-8" />
            <div className="leading-tight">
              <span className="block text-lg font-bold tracking-tight text-slate-900">
                ক্লিন সাভার
              </span>
              <span className="font-latin block text-[11px] font-medium uppercase tracking-wider text-slate-600">
                Clean Savar
              </span>
            </div>
          </Link>

          <nav aria-label="প্রাথমিক নেভিগেশন" className="hidden lg:block">
            <ul className="flex items-center gap-7 text-[15px] font-medium text-slate-700">
              {NAV_LINKS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="py-2 text-slate-700 transition-colors hover:text-[#15803D]"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hidden items-center gap-2.5 sm:flex">
            <button
              type="button"
              onClick={() => openActionModal("report")}
              className="inline-flex min-h-[42px] items-center justify-center rounded-md border border-[#15803D] bg-white px-4 py-2 text-sm font-semibold text-[#15803D] transition-colors hover:bg-green-50"
            >
              অভিযোগ জানান
            </button>
            <button
              type="button"
              onClick={() => openActionModal("pickup")}
              className="inline-flex min-h-[42px] items-center justify-center rounded-md border border-[#15803D] bg-[#15803D] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#166534]"
            >
              পিকআপ রিকোয়েস্ট
            </button>
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="মোবাইল মেনু খুলুন"
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav-drawer"
            className="inline-flex min-h-[42px] min-w-[42px] items-center justify-center rounded-md border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 lg:hidden"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Accessible native <dialog> mobile navigation drawer */}
      <dialog
        id="mobile-nav-drawer"
        ref={drawerRef}
        aria-labelledby={drawerTitleId}
        {...({ closedby: "any" } as Record<string, string>)}
        className="ml-auto mr-0 my-0 h-dvh max-h-dvh w-[min(20rem,86vw)] border-l border-slate-300 bg-white p-0 text-slate-900"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5">
            <div className="flex items-center gap-2">
              <CleanSavarMark className="h-7 w-7" />
              <h2 id={drawerTitleId} className="text-base font-bold text-slate-900">
                ক্লিন সাভার মেনু
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="মেনু বন্ধ করুন"
              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          <nav aria-label="মোবাইল নেভিগেশন" className="flex-1 overflow-y-auto px-4 py-4">
            <ul className="space-y-1">
              {NAV_LINKS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className="block rounded-md px-3 py-3 text-base font-medium text-slate-800 hover:bg-slate-100"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              <li className="pt-2 border-t border-slate-200">
                <Link
                  href="/admin"
                  onClick={() => setDrawerOpen(false)}
                  className="block rounded-md px-3 py-3 text-base font-semibold text-[#15803D] hover:bg-green-50"
                >
                  অপারেশনস ড্যাশবোর্ড (/admin)
                </Link>
              </li>
            </ul>

            <div className="mt-6 space-y-2.5 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  openActionModal("report");
                }}
                className="w-full min-h-[44px] rounded-md border border-[#15803D] bg-white px-4 py-2.5 text-sm font-semibold text-[#15803D] hover:bg-green-50"
              >
                অভিযোগ জানান
              </button>
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  openActionModal("pickup");
                }}
                className="w-full min-h-[44px] rounded-md border border-[#15803D] bg-[#15803D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#166534]"
              >
                পিকআপ রিকোয়েস্ট
              </button>
            </div>
          </nav>
        </div>
      </dialog>
    </>
  );
}
