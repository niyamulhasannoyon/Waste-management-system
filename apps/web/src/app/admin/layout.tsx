import type { Metadata } from 'next';
import React from 'react';
import { SubpageShell } from '@/components/SubpageShell';

export const metadata: Metadata = {
  title: 'পৌর অ্যাডমিন কমান্ড ড্যাশবোর্ড',
  description:
    'সাভার পৌরসভা ও ইউনিয়ন পরিষদ বর্জ্য সংগ্রহ, নাগরিক অভিযোগ, কর্মী অ্যাসাইনমেন্ট এবং হটস্পট মনিটরিং ড্যাশবোর্ড।',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <SubpageShell>{children}</SubpageShell>;
}
