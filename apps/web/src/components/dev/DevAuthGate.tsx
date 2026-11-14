'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  KeyRound,
  Loader2,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Unlock,
} from 'lucide-react';
import {
  ALLOWED_DEV_EMAILS,
  isAllowedDevEmail,
  recordDevAudit,
} from '@/lib/dev-store';
import { signInWithGoogleCloud } from '@/lib/google-cloud-client';

interface DevUserSession {
  email: string;
  name?: string;
}

const DEV_USER_STORAGE_KEY = 'cs_dev_user_gcp_session';
const CONFIGURED_MASTER_KEY = process.env.NEXT_PUBLIC_DEV_MASTER_KEY || (process.env.NODE_ENV !== 'production' ? 'savar-dev-2026' : '');

interface DevAuthGateProps {
  children: React.ReactNode;
}

export function DevAuthGate({ children }: DevAuthGateProps) {
  const [currentUser, setCurrentUser] = useState<DevUserSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [passkeyInput, setPasskeyInput] = useState<string>('');

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(DEV_USER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as DevUserSession;
        if (parsed?.email) {
          setCurrentUser(parsed);
        }
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function handleGoogleSignIn() {
    setErrorMsg(null);
    setIsSigningIn(true);
    try {
      const gcpRes = await signInWithGoogleCloud();
      const email = gcpRes.userEmail;
      if (!email) {
        throw new Error('Google Cloud থেকে ইমেইল ভেরিফিকেশন পাওয়া যায়নি।');
      }

      if (isAllowedDevEmail(email)) {
        const session: DevUserSession = { email, name: gcpRes.userName };
        sessionStorage.setItem(DEV_USER_STORAGE_KEY, JSON.stringify(session));
        setCurrentUser(session);
        recordDevAudit({
          actor: `Developer (${email})`,
          action: 'DEV_GOOGLE_LOGIN_SUCCESS',
          category: 'auth',
          details: 'Developer console authenticated successfully via Google Cloud OAuth',
        });
      } else {
        const unauthorizedSession: DevUserSession = { email, name: gcpRes.userName };
        setCurrentUser(unauthorizedSession);
        setErrorMsg(
          `অননুমোদিত অ্যাকাউন্ট (${email})। শুধুমাত্র niyamulhasanbd@gmail.com এবং niyamulhasan1089@gmail.com দিয়ে প্রবেশ করা যাবে।`,
        );
        recordDevAudit({
          actor: `Unauthorized (${email})`,
          action: 'DEV_GOOGLE_LOGIN_REJECTED',
          category: 'security',
          details: 'Access attempt to /dev-admin rejected for unlisted Google Cloud email',
        });
      }
    } catch (err: unknown) {
      console.warn('Developer Google Cloud Sign-In error:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Google ক্লাউড সাইন-ইন প্রক্রিয়া সম্পন্ন করা যায়নি।';
      setErrorMsg(msg);
    } finally {
      setIsSigningIn(false);
    }
  }

  function handlePasskeyUnlock(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setErrorMsg(null);
    const trimmed = passkeyInput.trim();
    if (CONFIGURED_MASTER_KEY && trimmed === CONFIGURED_MASTER_KEY) {
      const devSession: DevUserSession = {
        email: 'niyamulhasan1089@gmail.com',
        name: 'Super Developer (Master Key)',
      };
      sessionStorage.setItem(DEV_USER_STORAGE_KEY, JSON.stringify(devSession));
      setCurrentUser(devSession);
      recordDevAudit({
        actor: 'MasterKeyPasscode',
        action: 'DEV_MASTER_KEY_UNLOCK',
        category: 'auth',
        details: 'Console unlocked using authorized developer master key',
      });
    } else {
      setErrorMsg('ভুল মাস্টার পাসকি। সঠিক সিক্রেট কী দিন অথবা অনুমোদিত Google অ্যাকাউন্টে সাইন-ইন করুন।');
    }
  }

  function handleSignOut() {
    try {
      sessionStorage.removeItem(DEV_USER_STORAGE_KEY);
      setCurrentUser(null);
      setErrorMsg(null);
    } catch {
      setCurrentUser(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Terminal className="h-5 w-5 animate-spin text-emerald-400" />
          <span>Google Cloud সিকিউরিটি গেট ভেরিফাই হচ্ছে...</span>
        </div>
      </div>
    );
  }

  const isAuthorized = currentUser?.email && isAllowedDevEmail(currentUser.email);

  if (isAuthorized) {
    return (
      <div>
        {/* Developer Active Session Top Bar */}
        <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-emerald-900/60 bg-slate-950/95 px-4 py-2.5 text-xs text-slate-200 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-emerald-400">Google Cloud সেশন সক্রিয়:</span>
            <span className="font-mono text-slate-300">{currentUser?.email}</span>
            <span className="rounded bg-emerald-950 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-700/50">
              Verified Developer
            </span>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-slate-300 hover:border-rose-500 hover:bg-rose-950/30 hover:text-rose-300 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            লগআউট / অ্যাকাউন্ট পরিবর্তন
          </button>
        </div>
        {children}
      </div>
    );
  }

  // If user signed in with an unauthorized Google account
  if (currentUser?.email && !isAllowedDevEmail(currentUser.email)) {
    return (
      <div className="mx-auto flex min-h-[75vh] max-w-lg flex-col justify-center px-4 py-12">
        <div className="overflow-hidden rounded-2xl border border-rose-900/60 bg-slate-950 p-6 text-slate-100 shadow-2xl ring-1 ring-rose-500/20 sm:p-8">
          <div className="flex items-center justify-between border-b border-rose-900/50 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">
                  প্রবেশাধিকার সংরক্ষিত (Access Denied)
                </h1>
                <p className="text-xs text-rose-400 font-mono">
                  Unauthorized Developer Email
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-4 text-xs text-slate-300 leading-relaxed">
            <div className="rounded-lg border border-rose-800/40 bg-rose-950/30 p-3.5 text-rose-200">
              <p className="font-semibold text-rose-300">
                আপনার বর্তমান Google অ্যাকাউন্ট:
              </p>
              <p className="mt-1 font-mono text-sm font-bold text-white">
                {currentUser.email}
              </p>
              <p className="mt-2 text-[11px] text-rose-300/90">
                এই ইমেইলটি ক্লিন সাভার ডেভেলপার সুপার-অ্যাডমিন তালিকায় অন্তর্ভুক্ত নেই। সিস্টেম নিরাপত্তা সুরক্ষায় কনসোলে প্রবেশ নিষিদ্ধ করা হলো।
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-slate-300">
              <p className="font-semibold text-slate-200 mb-1.5">
                শুধুমাত্র অনুমোদিত ডেভেলপার ইমেইলসমূহ:
              </p>
              <ul className="space-y-1 font-mono text-xs text-emerald-400">
                {ALLOWED_DEV_EMAILS.map((email) => (
                  <li key={email} className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    {email}
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningIn}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 font-semibold text-white shadow-lg shadow-rose-900/30 hover:bg-rose-500 transition-all disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                লগআউট করে অনুমোদিত অ্যাকাউন্ট দিয়ে চেষ্টা করুন
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not signed in with Google Cloud
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
                Google Cloud OAuth 2.0 Protected
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400 ring-1 ring-emerald-500/20">
            <ShieldCheck className="h-3.5 w-3.5" />
            Google Cloud Auth
          </span>
        </div>

        <div className="mt-6 space-y-4 text-xs text-slate-300">
          <p className="leading-relaxed">
            এই কনসোলটি সিস্টেম ইঞ্জিনিয়ার ও প্ল্যাটফর্ম ডেভেলপারদের সার্বিক ব্যবস্থাপনার জন্য সংরক্ষিত। এখান থেকে লাইভ ফিচার ফ্ল্যাগ, ওটিপি স্ট্যাটাস, পৌর অ্যাডমিন অনুমোদন ও টেলিমেট্রি পরিচালিত হয়।
          </p>

          <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3.5 text-slate-300">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-200">
                  নির্ধারিত সুপার-ডেভেলপার অ্যাক্সেস নীতি:
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Google Cloud কনসোলে অনুমোদিত ডেভেলপার ইমেইল দিয়ে সাইন-ইন করলে কনসোল স্বয়ংক্রিয়ভাবে আনলক হবে:
                </p>
                <div className="mt-2 space-y-1 font-mono text-[11px] text-emerald-400">
                  {ALLOWED_DEV_EMAILS.map((email) => (
                    <div key={email} className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span>{email}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-lg border border-rose-800/40 bg-rose-950/40 p-3 text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 font-semibold text-slate-900 shadow-lg shadow-white/5 hover:bg-slate-100 transition-all disabled:opacity-60 cursor-pointer"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-slate-900" />
                  Google Cloud যাচাইকরণ হচ্ছে...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Google Cloud অ্যাকাউন্ট দিয়ে লগইন করুন
                  <ArrowRight className="h-4 w-4 text-slate-500" />
                </>
              )}
            </button>
          </div>

          <div className="relative my-4 flex items-center justify-center">
            <div className="w-full border-t border-slate-800" />
            <span className="absolute bg-slate-950 px-3 text-[11px] uppercase tracking-wider text-slate-500">
              অথবা মাস্টার পাসকি দিয়ে
            </span>
          </div>

          <form onSubmit={handlePasskeyUnlock} className="space-y-3">
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={passkeyInput}
                onChange={(e) => setPasskeyInput(e.target.value)}
                placeholder="মাস্টার পাসকি (savar-dev-2026)"
                className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2.5 pl-10 pr-4 font-mono text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <Unlock className="h-4 w-4" />
              <span>পাসকি দিয়ে কনসোল আনলক করুন</span>
            </button>
          </form>
        </div>

        <div className="mt-6 rounded-lg border border-slate-800/80 bg-slate-900/40 p-3 text-[11px] font-mono text-slate-400">
          <div className="text-slate-500">GCP OAuth Authentication:</div>
          <div className="truncate text-slate-300">Configured via environment variables</div>
        </div>
      </div>
    </div>
  );
}
