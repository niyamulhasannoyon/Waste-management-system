'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowDownToLine,
  Camera,
  CheckCircle2,
  MapPin,
  QrCode,
  ShieldCheck,
  Smartphone,
  Truck,
} from 'lucide-react';

const APP_FEATURES = [
  {
    icon: Camera,
    title: 'তাৎক্ষণিক ছবি ও জিপিএস রিপোর্ট',
    description: 'রাস্তা বা ড্রেনের ময়লার স্তূপের ছবি তুললেই স্বয়ংক্রিয়ভাবে সাভারের ওয়ার্ড ও ভৌগোলিক স্থানাঙ্ক যুক্ত হয়ে যায়।',
  },
  {
    icon: Truck,
    title: 'ডোর-টু-ডোর পিকআপ বুকিং',
    description: 'বাসাবাড়ির জৈব, অজৈব বা ভারী আসবাবপত্রের বর্জ্য অপসারণের জন্য মাত্র এক ট্যাপে পৌর ভ্যান রিকুয়েস্ট করুন।',
  },
  {
    icon: MapPin,
    title: 'রিয়েল-টাইম ভ্যান ট্র্যাকিং',
    description: 'আপনার ওয়ার্ডের দায়িত্বে থাকা পরিচ্ছন্নতাকর্মী বা পিকআপ গাড়ির আগমন ও অগ্রগতি লাইভ মানচিত্রে দেখুন।',
  },
  {
    icon: QrCode,
    title: 'কালেক্টর কিউআর স্ক্যানিং',
    description: 'কালেক্টর ও রিসাইক্লিং পার্টনারদের জন্য স্পট ভেরিফিকেশন ও লট হস্তান্তরের ডিজিটাল স্ক্যান সুবিধা।',
  },
];

const INSTALL_STEPS = [
  {
    step: '১',
    title: 'APK ফাইল ডাউনলোড করুন',
    desc: 'নিচের বাটনে চাপ দিয়ে Clean Savar এর অফিশিয়াল রিলিজ APK ডাউনলোড করুন।',
  },
  {
    step: '২',
    title: 'ইনস্টলেশন অনুমতি দিন',
    desc: 'ব্রাউজার বা ফাইল ম্যানেজারে "Install unknown apps" চাইলে Clean Savar ইনস্টলেশন অনুমোদন দিন।',
  },
  {
    step: '৩',
    title: 'ইনস্টল ও শুরু করুন',
    desc: 'ইনস্টল সম্পন্ন হলে অ্যাপটি খুলুন এবং আপনার মোবাইল নম্বর দিয়ে বিনামূল্যে লগইন করুন।',
  },
];

export default function DownloadPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">
      {/* Hero Header */}
      <div className="rounded-2xl border border-[#BBF7D0] bg-gradient-to-br from-[#F0FDF4] via-white to-[#F8FAFC] p-6 shadow-xs sm:p-10">
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-12">
          <div className="space-y-4 md:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#BBF7D0] bg-white px-3 py-1 text-xs font-semibold text-[#14532D]">
              <span className="h-2 w-2 rounded-full bg-[#15803D]" aria-hidden="true" />
              অফিশিয়াল রিলিজ · সংস্করণ ১.০.০
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">
              ক্লিন সাভার মোবাইল অ্যাপ{' '}
              <span className="text-[#15803D]">ডাউনলোড করুন</span>
            </h1>

            <p className="text-sm leading-relaxed text-[#475569] sm:text-base">
              আপনার হাতের মুঠোয় পরিচ্ছন্ন সাভারের সকল সেবা। দ্রুত বর্জ্য রিপোর্ট, পিকআপ শিডিউলিং এবং ওয়ার্ড ভিত্তিক লাইভ নোটিফিকেশন পান যেকোনো সময়।
            </p>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
              <a
                href="/clean-savar.apk"
                download="clean-savar.apk"
                className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-lg bg-[#15803D] px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-[#14532D] hover:shadow-lg focus:outline-hidden focus:ring-2 focus:ring-[#15803D] focus:ring-offset-2"
              >
                <ArrowDownToLine className="h-5 w-5" aria-hidden="true" />
                <span>সরাসরি APK ডাউনলোড (১৯.৭ MB)</span>
              </a>

              <span className="text-xs text-[#64748B] sm:text-left">
                অ্যান্ড্রয়েড ৮.০+ সমর্থিত · সম্পূর্ণ ফ্রি
              </span>
            </div>
          </div>

          <div className="flex justify-center md:col-span-5">
            <div className="relative flex flex-col items-center rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] shadow-xs">
                <Smartphone className="h-12 w-12 text-[#15803D]" aria-hidden="true" />
              </div>
              <p className="mt-4 text-base font-bold text-[#0F172A]">Clean Savar Mobile</p>
              <p className="font-metric text-xs text-[#64748B]">v1.0.0 · Production</p>
              <div className="mt-3 flex items-center gap-1.5 rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-semibold text-[#14532D]">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                ম্যালওয়্যার ও ভাইরাস মুক্ত
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* App Highlights */}
      <section aria-labelledby="features-heading" className="space-y-4">
        <div className="text-center sm:text-left">
          <h2 id="features-heading" className="text-xl font-bold text-[#0F172A]">
            অ্যাপের প্রধান সুবিধাসমূহ
          </h2>
          <p className="text-sm text-[#64748B]">
            নাগরিক এবং মাঠপর্যায়ের কর্মীদের কাজের গতি ও সুবিধার কথা ভেবে তৈরি
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {APP_FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="flex gap-4 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#0F172A]">{feat.title}</h3>
                  <p className="text-xs leading-relaxed text-[#64748B]">{feat.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Installation Guide */}
      <section
        aria-labelledby="install-heading"
        className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xs sm:p-8"
      >
        <h2 id="install-heading" className="text-lg font-bold text-[#0F172A]">
          সহজ ৩ ধাপে কীভাবে ইনস্টল করবেন
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {INSTALL_STEPS.map((step) => (
            <div key={step.step} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#15803D] text-sm font-bold text-white">
                {step.step}
              </span>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#0F172A]">{step.title}</h3>
                <p className="text-xs leading-relaxed text-[#64748B]">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Alternative downloads */}
        <div className="mt-8 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-xs text-[#475569]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-[#0F172A]">বিকল্প ডাউনলোড লিংকসমূহ:</p>
              <p className="text-[11px] text-[#64748B]">
                আপনার ফোনের আর্কিটেকচার অনুযায়ী নির্দিষ্ট সংস্করণ বেছে নিতে পারেন
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="/downloads/clean-savar-arm64.apk"
                download="clean-savar-arm64.apk"
                className="rounded border border-[#CBD5E1] bg-white px-2.5 py-1 text-xs font-semibold text-[#0F172A] hover:bg-[#F1F5F9]"
              >
                ARM64 (আধুনিক ফোন)
              </a>
              <a
                href="/downloads/clean-savar-armeabi-v7a.apk"
                download="clean-savar-armeabi-v7a.apk"
                className="rounded border border-[#CBD5E1] bg-white px-2.5 py-1 text-xs font-semibold text-[#0F172A] hover:bg-[#F1F5F9]"
              >
                ARMv7 (পুরোনো ৩২-বিট)
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Safety & Municipal Seal */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E2E8F0] bg-white p-4 text-xs text-[#475569]">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#15803D]" aria-hidden="true" />
          <span>সাভার পৌরসভা ও নাগরিকদের যৌথ ডিজিটাল উদ্যোগ</span>
        </div>
        <Link href="/" className="font-semibold text-[#15803D] hover:underline">
          হোম পেজে ফিরুন →
        </Link>
      </div>
    </div>
  );
}
