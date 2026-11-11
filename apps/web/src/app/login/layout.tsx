import type { Metadata } from 'next';
import React from 'react';
import { SubpageShell } from '@/components/SubpageShell';

export const metadata: Metadata = {
  title: 'মোবাইল OTP লগইন',
  description: 'সাভার পৌরসভার নাগরিক, সংগ্রহকারী, রিসাইক্লিং পার্টনার ও অ্যাডমিন অ্যাকাউন্টে নিরাপদ OTP লগইন।',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <SubpageShell>{children}</SubpageShell>;
}
