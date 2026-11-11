import type { Metadata } from 'next';
import React from 'react';
import { SubpageShell } from '@/components/SubpageShell';

export const metadata: Metadata = {
  title: 'কালেক্টর ওয়ার্কস্পেস',
  description: 'সাভার পৌরসভার মাঠপর্যায়ের বর্জ্য সংগ্রহকারী কর্মী ও গাড়ির লাইভ টাস্ক ও জিপিএস ড্যাশবোর্ড।',
};

export default function CollectorLayout({ children }: { children: React.ReactNode }) {
  return <SubpageShell>{children}</SubpageShell>;
}
