import React from 'react';
import Link from 'next/link';
import { CalendarClock, Camera, ClipboardCheck } from 'lucide-react';

const STEPS = [
  {
    number: '০১',
    title: 'পিকআপ বা ছবি দিন',
    description:
      'একবার বা সাপ্তাহিক পিকআপ স্লট নির্বাচন করুন, অথবা রাস্তার ময়লার ছবি ও জিপিএস অবস্থান জমা দিন।',
    href: '/pickup',
    cta: 'পিকআপ ফরম খুলুন',
    icon: CalendarClock,
  },
  {
    number: '০২',
    title: 'অবস্থান ও ডুপ্লিকেট যাচাই',
    description:
      'PostGIS স্বয়ংক্রিয়ভাবে সাভারের সঠিক ওয়ার্ড/ইউনিয়ন শনাক্ত করে এবং নিকটবর্তী সংগ্রহ গাড়ি নির্ধারণ করে।',
    href: '/report',
    cta: 'ছবিসহ রিপোর্ট করুন',
    icon: Camera,
  },
  {
    number: '০৩',
    title: 'সরাসরি ট্র্যাক ও প্রমাণ',
    description:
      'CS-PK বা CS-DR ট্র্যাকিং কোড দিয়ে প্রতিটি ধাপের অগ্রগতি ও মাঠপর্যায়ের পরিচ্ছন্নতার প্রমাণ দেখুন।',
    href: '/track',
    cta: 'ট্র্যাকিং দেখুন',
    icon: ClipboardCheck,
  },
] as const;

export function HowItWorksSection() {
  return (
    <section aria-labelledby="how-it-works-heading" className="py-10 sm:py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="how-it-works-heading" className="text-2xl font-bold text-[#0F172A]">
              কীভাবে ক্লিন সাভার কাজ করে
            </h2>
            <p className="mt-1 text-sm text-[#475569]">
              নাগরিক, মাঠপর্যায়ের কালেক্টর ও পৌরসভা কন্ট্রোল রুমের স্বচ্ছ ডিজিটাল কর্মপ্রবাহ
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <article key={step.number} className="cs-card flex flex-col justify-between p-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md border border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="font-metric text-xs font-bold tracking-wider text-[#14532D]">
                      ধাপ {step.number}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#0F172A]">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-[#475569]">{step.description}</p>
                </div>

                <div className="mt-4 border-t border-[#E2E8F0] pt-3">
                  <Link
                    href={step.href}
                    className="text-sm font-semibold text-[#15803D] hover:text-[#14532D] hover:underline"
                  >
                    {step.cta} →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
