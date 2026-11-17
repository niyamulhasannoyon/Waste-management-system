'use client';

import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Loader2,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Unlock,
} from 'lucide-react';
import {
  isAllowedDevEmail,
  recordDevAudit,
} from '@/lib/dev-store';
import { signInWithGoogleCloud } from '@/lib/google-cloud-client';

export interface DevUserSession {
  email: string;
  name?: string;
}

export interface DevAuthContextType {
  currentUser: DevUserSession | null;
  handleSignOut: () => void;
}

export const DevAuthContext = React.createContext<DevAuthContextType>({
  currentUser: null,
  handleSignOut: () => {},
});

export function useDevAuthSession() {
  return React.useContext(DevAuthContext);
}

const DEV_USER_STORAGE_KEY = 'cs_dev_user_gcp_session';
const CONFIGURED_MASTER_KEY =
  process.env.NEXT_PUBLIC_DEV_MASTER_KEY ||
  (process.env.NODE_ENV !== 'production' ? 'savar-dev-2026' : '');

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
          `অননুমোদিত অ্যাকাউন্ট (${email})। অনুমোদিত ডেভেলপার ইমেইল দিয়ে প্রবেশ করুন।`,
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
          : 'Google সাইন-ইন সম্পন্ন করা যায়নি।';
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
      setErrorMsg('ভুল মাস্টার পাসকি। সঠিক কী দিন অথবা Google অ্যাকাউন্টে সাইন-ইন করুন।');
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
          <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
          <span className="text-sm font-medium">নিরাপত্তা ভেরিফিকেশন হচ্ছে...</span>
        </div>
      </div>
    );
  }

  const isAuthorized = currentUser?.email && isAllowedDevEmail(currentUser.email);

  if (isAuthorized) {
    return (
      <DevAuthContext.Provider value={{ currentUser, handleSignOut }}>
        {children}
      </DevAuthContext.Provider>
    );
  }

  // If user signed in with an unauthorized Google account
  if (currentUser?.email && !isAllowedDevEmail(currentUser.email)) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
        <div className="overflow-hidden rounded-2xl border border-rose-900/40 bg-slate-950 p-6 text-slate-100 shadow-2xl ring-1 ring-rose-500/20 sm:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-lg font-bold text-white">প্রবেশাধিকার সংরক্ষিত</h1>
            <p className="mt-1 text-xs text-rose-400 font-mono">{currentUser.email}</p>
          </div>

          <div className="mt-6 rounded-xl border border-rose-900/30 bg-rose-950/20 p-4 text-center text-xs text-rose-200">
            এই অ্যাকাউন্টটি ডেভেলপার কনসোলে অনুমোদিত নয়। অনুগ্রহ করে অনুমোদিত ডেভেলপার অ্যাকাউন্ট ব্যবহার করুন।
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 py-3 text-xs font-semibold text-white transition-all cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              লগআউট করে পুনরায় চেষ্টা করুন
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Clean, Simple, Professional Login Screen
  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 text-slate-100 shadow-2xl backdrop-blur">
        {/* Brand & Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
            <Terminal className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-white">
            Clean Savar Developer
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            প্ল্যাটফর্ম ও সিস্টেম অ্যাডমিন কনসোল
          </p>
        </div>

        {errorMsg && (
          <div className="mt-5 rounded-xl border border-rose-800/40 bg-rose-950/40 p-3 text-xs text-rose-300 text-center">
            {errorMsg}
          </div>
        )}

        <div className="mt-6 space-y-4">
          {/* Primary Action: Google Cloud Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow hover:bg-slate-100 transition-all disabled:opacity-60 cursor-pointer"
          >
            {isSigningIn ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-slate-900" />
                <span>যাচাইকরণ হচ্ছে...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
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
                <span>Google দিয়ে সাইন-ইন করুন</span>
              </>
            )}
          </button>

          {/* Simple Clean Divider */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="w-full border-t border-slate-800" />
            <span className="absolute bg-slate-900 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              বা মাস্টার পাসকি
            </span>
          </div>

          {/* Fast Passkey Input */}
          <form onSubmit={handlePasskeyUnlock} className="space-y-3">
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={passkeyInput}
                onChange={(e) => setPasskeyInput(e.target.value)}
                placeholder="মাস্টার পাসকি (savar-dev-2026)"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/70 py-2.5 pl-10 pr-4 font-mono text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
            >
              <Unlock className="h-3.5 w-3.5" />
              <span>পাসকি দিয়ে আনলক করুন</span>
            </button>
          </form>
        </div>

        <div className="mt-6 border-t border-slate-800/60 pt-4 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            OAuth 2.0 & Passkey
          </span>
          <span className="font-mono text-slate-400">v2.1 Savar</span>
        </div>
      </div>
    </div>
  );
}
