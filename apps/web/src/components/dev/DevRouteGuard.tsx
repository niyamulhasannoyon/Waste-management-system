'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert, Terminal } from 'lucide-react';
import { useCleanSavar } from '@/context/CleanSavarContext';
import { isDeveloperUser, isPouroAdminUser } from '@/lib/rbac';
import { ROLE_LABELS_BN } from '@/lib/savar-data';

export function DevRouteGuard({ children }: { children: React.ReactNode }) {
  const { profile, authReady } = useCleanSavar();

  if (!authReady) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Terminal className="h-5 w-5 animate-spin text-emerald-400" />
          <span>ডেভেলপার সিকিউরিটি রুলস যাচাই হচ্ছে...</span>
        </div>
      </div>
    );
  }

  const user = profile?.user;

  // If a non-developer is logged in, strictly block them from Dev Console
  if (user && !isDeveloperUser(user)) {
    const isPouro = isPouroAdminUser(user);

    return (
      <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col justify-center px-4 py-12">
        <div className="rounded-2xl border border-rose-900/60 bg-slate-950 p-6 text-slate-100 shadow-2xl ring-1 ring-rose-500/20 sm:p-8">
          <div className="flex items-center gap-3 border-b border-rose-900/50 pb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-rose-800 bg-rose-950/70 text-rose-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 rounded bg-rose-950 px-2 py-0.5 text-xs font-semibold text-rose-300 ring-1 ring-rose-700/50">
                নিরাপত্তা নীতি লঙ্ঘিত (Access Denied)
              </span>
              <h2 className="mt-1 text-lg font-bold text-white">
                প্রবেশাধিকার সংরক্ষিত — দেব কনসোল
              </h2>
            </div>
          </div>

          <div className="space-y-3 py-6 text-sm text-slate-300">
            <p>
              {isPouro ? (
                <>
                  <strong className="text-white">পৌর অ্যাডমিনদের জন্য নোটিশ:</strong> দেব কনসোল
                  (Dev Console) শুধুমাত্র সিস্টেম ইঞ্জিনিয়ার ও প্ল্যাটফর্ম ডেভেলপারদের জন্য নির্ধারিত।
                  সাভার পৌরসভার দৈনন্দিন বর্জ্য সমন্বয়, কর্মী নিয়োগ ও হটস্পট মনিটরিংয়ের জন্য আপনার নিজস্ব
                  পৌর অ্যাডমিন প্যানেল ব্যবহার করুন।
                </>
              ) : (
                <>
                  দেব কনসোল (Dev Console) শুধুমাত্র সিস্টেম ইঞ্জিনিয়ার ও অনুমোদিত ডেভেলপারদের
                  জন্য সংরক্ষিত।
                </>
              )}
            </p>

            <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3.5 text-xs space-y-1">
              <p className="text-slate-400">
                বর্তমান অ্যাকাউন্ট: <span className="font-semibold text-white">{user.full_name}</span> ({user.phone})
              </p>
              <p className="text-slate-400">
                বর্তমান ভূমিকা: <span className="font-semibold text-rose-400">{ROLE_LABELS_BN[user.role] || user.role}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-slate-800 pt-5">
            {isPouro ? (
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                পৌর অ্যাডমিন প্যানেলে ফিরে যান
              </Link>
            ) : null}

            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
            >
              হোম পেজে যান
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
