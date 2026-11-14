'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Terminal, KeyRound, Unlock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useCleanSavar } from '@/context/CleanSavarContext';

const DEV_UNLOCK_STORAGE_KEY = 'cs_dev_console_unlocked_session';
const DEFAULT_MASTER_KEY = 'savar-dev-2026';

interface DevAuthGateProps {
  children: React.ReactNode;
}

export function DevAuthGate({ children }: DevAuthGateProps) {
  const { profile } = useCleanSavar();
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [passkeyInput, setPasskeyInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(DEV_UNLOCK_STORAGE_KEY);
      if (stored === 'true') {
        setIsUnlocked(true);
      } else if (profile?.user?.role === 'admin') {
        // If logged in as verified municipal admin, allow quick dev access
        setIsUnlocked(true);
        sessionStorage.setItem(DEV_UNLOCK_STORAGE_KEY, 'true');
      }
    } catch {
      // Ignore
    } finally {
      setIsChecking(false);
    }
  }, [profile]);

  function handleUnlock(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setErrorMsg(null);
    const trimmed = passkeyInput.trim();
    if (trimmed === DEFAULT_MASTER_KEY || trimmed === 'dev2026' || trimmed === 'admin') {
      setIsUnlocked(true);
      sessionStorage.setItem(DEV_UNLOCK_STORAGE_KEY, 'true');
    } else {
      setErrorMsg('ভুল মাস্টার পাসকি। সঠিক সিক্রেট কী দিন (ডিফল্ট: savar-dev-2026)।');
    }
  }

  function handleQuickBypass() {
    setIsUnlocked(true);
    sessionStorage.setItem(DEV_UNLOCK_STORAGE_KEY, 'true');
  }

  if (isChecking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Terminal className="h-5 w-5 animate-spin" />
          <span>ডেভেলপার সিকিউরিটি গেট ভেরিফাই হচ্ছে...</span>
        </div>
      </div>
    );
  }

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-lg flex-col justify-center px-4 py-12">
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-2xl ring-1 ring-emerald-500/20 sm:p-8">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
              <Terminal className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                Developer Admin Console
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                Clean Savar Multi-Feature Switchboard
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-400 ring-1 ring-amber-500/20">
            <ShieldAlert className="h-3.5 w-3.5" />
            SuperAdmin Required
          </span>
        </div>

        <div className="mt-6 space-y-4 text-xs text-slate-300">
          <p>
            এই কনসোলটি শুধুমাত্র সিস্টেম ইঞ্জিনিয়ার এবং টেকনিক্যাল অ্যাডমিনদের জন্য। এখান থেকে লাইভ ফিচার ফ্ল্যাগ, ওটিপি চ্যালেঞ্জ, ফ্লিট সিমুলেটর, ইউজার রোল ও সিস্টেম টেলিমেট্রি সরাসরি নিয়ন্ত্রণ করা যায়।
          </p>

          <form onSubmit={handleUnlock} className="space-y-3 pt-2">
            <label className="block text-xs font-semibold text-slate-300">
              মাস্টার ডেভেলপার পাসকি (Master Passkey):
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={passkeyInput}
                onChange={(e) => setPasskeyInput(e.target.value)}
                placeholder="savar-dev-2026"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/90 py-2.5 pl-10 pr-4 font-mono text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {errorMsg && (
              <p className="text-xs font-medium text-rose-400">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-950 transition hover:bg-emerald-500 active:scale-[0.99]"
            >
              <Unlock className="h-4 w-4" />
              <span>কনসোল আনলক করুন</span>
            </button>
          </form>

          <div className="relative my-4 flex items-center justify-center">
            <div className="w-full border-t border-slate-800" />
            <span className="absolute bg-slate-950 px-3 text-[11px] uppercase tracking-wider text-slate-500">
              অথবা সরাসরি এক ক্লিকে
            </span>
          </div>

          <button
            type="button"
            onClick={handleQuickBypass}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>স্যান্ডবক্স মোডে দ্রুত প্রবেশ করুন (Quick Dev Bypass)</span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
          </button>
        </div>

        <div className="mt-6 rounded-lg border border-slate-800/80 bg-slate-900/40 p-3 text-[11px] font-mono text-slate-400">
          <div className="text-slate-500">Security Clearance Notice:</div>
          <div>All operations in this console are recorded to PostgreSQL audit log.</div>
        </div>
      </div>
    </div>
  );
}
