import type { Metadata } from 'next';
import React from 'react';
import { SubpageShell } from '@/components/SubpageShell';

export const metadata: Metadata = {
  title: 'অ্যান্ড্রয়েড অ্যাপ ডাউনলোড | ক্লিন সাভার',
  description: 'ক্লিন সাভার মোবাইল অ্যাপ ডাউনলোড করুন। দ্রুত ময়লার ভ্যান বুকিং, লাইভ ট্র্যাকিং এবং জিপিএস রিপোর্ট সুবিধা।',
};

export default function DownloadLayout({ children }: { children: React.ReactNode }) {
  return <SubpageShell>{children}</SubpageShell>;
}
