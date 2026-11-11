import React from "react";
import Link from "next/link";
import { CleanSavarMark } from "./Icons";

export function Footer() {
  return (
    <footer className="bg-white py-10 text-sm text-slate-700">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 border-b border-slate-200 pb-8 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-2.5">
              <CleanSavarMark className="h-7 w-7" />
              <div>
                <p className="text-base font-bold text-slate-900">ক্লিন সাভার (Clean Savar)</p>
                <p className="text-xs text-slate-600">
                  সাভার পৌরসভা ও উপজেলা পরিচ্ছন্নতা সমন্বয় প্ল্যাটফর্ম
                </p>
              </div>
            </div>
            <p className="mt-3 max-w-md leading-relaxed text-slate-600">
              বাসাবাড়ির ময়লা সংগ্রহের সময় নির্ধারণ, রাস্তার পাশে জমে থাকা বর্জ্যের ছবি
              প্রতিবেদন এবং পুনর্ব্যবহারযোগ্য বর্জ্য ব্যবস্থাপনার সমন্বিত ডিজিটাল সেবা।
            </p>
          </div>

          <div className="md:col-span-3">
            <h3 className="text-sm font-bold text-slate-900">দ্রুত লিংক</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <a href="#services" className="hover:text-[#15803D] hover:underline">
                  সেবাসমূহ ও দ্রুত ফর্ম
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-[#15803D] hover:underline">
                  কীভাবে কাজ করে
                </a>
              </li>
              <li>
                <a href="#coverage" className="hover:text-[#15803D] hover:underline">
                  ওয়ার্ড ও ইউনিয়ন সময়সূচি
                </a>
              </li>
              <li>
                <a href="#recycling" className="hover:text-[#15803D] hover:underline">
                  রিসাইক্লিং নির্দেশিকা
                </a>
              </li>
              <li>
                <Link href="/track" className="hover:text-[#15803D] hover:underline">
                  রিকোয়েস্ট ট্র্যাক করুন
                </Link>
              </li>
              <li>
                <Link href="/partner" className="hover:text-[#15803D] hover:underline">
                  রিসাইক্লিং পার্টনার পোর্টাল
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h3 className="text-sm font-bold text-slate-900">জরুরি যোগাযোগ ও অপারেশনস</h3>
            <dl className="mt-3 space-y-1.5 text-slate-700">
              <div className="flex gap-2">
                <dt className="font-semibold text-slate-900">নাগরিক হটলাইন:</dt>
                <dd className="tabular-nums">১৬১২৪ (সকাল ৬:০০ – রাত ৯:০০)</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold text-slate-900">কার্যালয়:</dt>
                <dd>সাভার পৌরসভা ভবন, থানা রোড, সাভার, ঢাকা-১৩৪০</dd>
              </div>
            </dl>
            <div className="mt-4">
              <Link
                href="/admin"
                className="inline-flex min-h-[40px] items-center rounded-md border border-slate-700 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100"
              >
                পৌরসভা অপারেশনস ড্যাশবোর্ডে প্রবেশ করুন →
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <p>© ২০২৬ ক্লিন সাভার (Clean Savar) — সাভার নাগরিক পরিচ্ছন্নতা উদ্যোগ।</p>
          <p className="font-latin">Savar Municipality & Upazila Waste Operations</p>
        </div>
      </div>
    </footer>
  );
}
