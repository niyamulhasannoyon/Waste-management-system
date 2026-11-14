import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'ডেভেলপার অ্যাডমিন কনসোল — ক্লিন সাভার',
  description: 'Clean Savar SuperAdmin Developer Operations and Feature Control Center',
};

export default function DevAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-slate-950 text-slate-100">{children}</div>;
}
