import React from 'react';
import Link from 'next/link';
import { Recycle } from 'lucide-react';
import { StatusBadge } from '@/components/ui/badge';
import { RECYCLING_GUIDE_CATEGORIES } from '@/lib/savar-data';

const CATEGORY_TONE: Record<
  'organic' | 'plastic' | 'paper' | 'hazardous',
  'success' | 'info' | 'warning' | 'danger'
> = {
  organic: 'success',
  plastic: 'info',
  paper: 'warning',
  hazardous: 'danger',
};

export function RecyclingSection() {
  return (
    <section aria-labelledby="recycling-guide-heading" className="py-10 sm:py-12">
      <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D]">
              <Recycle className="h-4 w-4" aria-hidden="true" />
              উৎসে বর্জ্য পৃথকীকরণ নির্দেশিকা
            </div>
            <h2 id="recycling-guide-heading" className="mt-1 text-2xl font-bold text-[#0F172A]">
              ৪-বিন পদ্ধতিতে আলাদা ময়লা সংগ্রহ ও রিসাইক্লিং
            </h2>
            <p className="mt-1 text-sm text-[#475569]">
              পচনশীল ও শুকনো বর্জ্য আলাদা রাখলে দ্রুত কম্পোস্ট ও রিসাইক্লিং পার্টনারের কাছে পৌঁছানো সহজ হয়।
            </p>
          </div>
          <Link
            href="/partner"
            className="inline-flex min-h-10 shrink-0 items-center rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-4 text-sm font-semibold text-[#14532D] hover:bg-[#DCFCE7]"
          >
            পার্টনার লট মার্কেটপ্লেস দেখুন →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {RECYCLING_GUIDE_CATEGORIES.map((cat) => (
            <article key={cat.id} className="cs-card space-y-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold text-[#0F172A]">{cat.title}</h3>
                <StatusBadge tone={CATEGORY_TONE[cat.id]}>{cat.binLabel}</StatusBadge>
              </div>
              <ul className="list-inside list-disc space-y-1 text-sm text-[#334155]">
                {cat.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="space-y-1 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs">
                <p className="font-medium text-[#B91C1C]">সতর্কতা: {cat.avoidText}</p>
                <p className="text-[#14532D]">প্রভাব: {cat.impactText}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
