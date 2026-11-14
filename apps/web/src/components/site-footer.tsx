import React from 'react';
import Link from 'next/link';
import { Leaf, PhoneCall } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="border-t border-[#E2E8F0] bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="space-y-3">
          <Link href="/" className="inline-flex items-center gap-2 text-[#0F172A]">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]">
              <Leaf className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-base font-bold">ক্লিন সাভার</span>
          </Link>
          <p className="text-sm leading-relaxed text-[#475569]">
            সাভার পৌরসভার ১–৯ নং ওয়ার্ড এবং পার্শ্ববর্তী ৬টি ইউনিয়ন (তেঁতুলঝোড়া, আশুলিয়া, বিরুলিয়া, আমিনবাজার, সাভার সদর ও পাথালিয়া) এর সমন্বিত বর্জ্য ব্যবস্থাপনা প্ল্যাটফর্ম।
          </p>
        </div>

        <div className="space-y-2.5">
          <h2 className="text-sm font-bold text-[#0F172A]">নাগরিক সেবা</h2>
          <ul className="space-y-2 text-sm text-[#475569]">
            <li>
              <Link href="/pickup" className="hover:text-[#15803D] hover:underline">
                ডোর-টু-ডোর পিকআপ বুকিং
              </Link>
            </li>
            <li>
              <Link href="/report" className="hover:text-[#15803D] hover:underline">
                অবৈধ ময়লার ছবি রিপোর্ট
              </Link>
            </li>
            <li>
              <Link href="/track" className="hover:text-[#15803D] hover:underline">
                ট্র্যাকিং কোড যাচাই
              </Link>
            </li>
            <li>
              <Link href="/download" className="hover:text-[#15803D] hover:underline">
                মোবাইল অ্যাপ ডাউনলোড (APK)
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-[#15803D] hover:underline">
                মোবাইল OTP লগইন
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-2.5">
          <h2 className="text-sm font-bold text-[#0F172A]">অপারেশনস পোর্টাল</h2>
          <ul className="space-y-2 text-sm text-[#475569]">
            <li>
              <Link href="/collector" className="hover:text-[#15803D] hover:underline">
                কালেক্টর মাঠপর্যায় পোর্টাল
              </Link>
            </li>
            <li>
              <Link href="/partner" className="hover:text-[#15803D] hover:underline">
                রিসাইক্লিং পার্টনার মার্কেটপ্লেস
              </Link>
            </li>
            <li>
              <Link href="/admin" className="hover:text-[#15803D] hover:underline">
                পৌরসভা কমান্ড ড্যাশবোর্ড
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-2.5">
          <h2 className="text-sm font-bold text-[#0F172A]">জরুরি হেল্পলাইন</h2>
          <div className="rounded-md border border-[#BBF7D0] bg-[#F0FDF4] p-3 text-sm text-[#14532D]">
            <p className="inline-flex items-center gap-1.5 font-bold">
              <PhoneCall className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span lang="en" className="font-metric">১৬১০২ / ০১৭১১-২৪০১০০</span>
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#14532D]/90">
              প্রতিদিন সকাল ৬:০০ – রাত ৯:০০ পর্যন্ত বর্জ্য পরিচ্ছন্নতা ও জরুরি রেসপন্স টিম সক্রিয়।
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-[#475569] sm:px-6">
          <p>© ২০২৬ ক্লিন সাভার (Clean Savar) — সাভার পৌরসভা ও নাগরিক উদ্যোগ</p>
          <p lang="en" className="font-metric">
            PostgreSQL/PostGIS · Rust/Axum · Next.js · MIT License
          </p>
        </div>
      </div>
    </footer>
  );
}
