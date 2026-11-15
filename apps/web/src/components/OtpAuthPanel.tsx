'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  Phone,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { useCleanSavar } from '@/context/CleanSavarContext';
import { ApiError, loginWithFirebaseToken, loginWithGoogleAuth } from '@/lib/api-client';
import { signInWithGoogleCloud, type GoogleCloudAuthResult } from '@/lib/google-cloud-client';
import { SAVAR_WARDS_SEED } from '@/lib/savar-data';
import type { AuthSession, UserRole } from '@/lib/types';
import { normalizeBdPhone } from '@/lib/utils';

interface OtpAuthPanelProps {
  onSuccess?: (session: AuthSession) => void;
  titleId?: string;
  initialRole?: UserRole;
}

const ROLES: { role: UserRole; labelBn: string }[] = [
  { role: 'citizen', labelBn: 'সাধারণ নাগরিক' },
  { role: 'collector', labelBn: 'পরিচ্ছন্নতাকর্মী' },
  { role: 'partner', labelBn: 'রিসাইক্লিং পার্টনার' },
  { role: 'admin', labelBn: 'পৌর অ্যাডমিন' },
];

export function OtpAuthPanel({ onSuccess, titleId, initialRole }: OtpAuthPanelProps) {
  const { applyAuthSession, wards, isOfflinePreview, authPromptReason } = useCleanSavar();

  const [fullName, setFullName] = useState<string>('');
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole || 'citizen');
  const [wardId, setWardId] = useState<number | ''>(SAVAR_WARDS_SEED[2]?.id ?? 3);

  React.useEffect(() => {
    if (initialRole) {
      setSelectedRole(initialRole);
    } else if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const search = window.location.search;
      if (
        path.startsWith('/admin') ||
        path.startsWith('/dev-admin') ||
        search.includes('role=admin') ||
        authPromptReason?.includes('অ্যাডমিন')
      ) {
        setSelectedRole('admin');
      }
    }
  }, [initialRole, authPromptReason]);

  const [phoneTouched, setPhoneTouched] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const normalizedPhone = normalizeBdPhone(phoneInput);

  React.useEffect(() => {
    if (!normalizedPhone) return;
    const adminDigits = ['01711240100', '01733919156', '01712456789', '01712457889'];
    const digits = normalizedPhone.replace(/\D/g, '').replace(/^880/, '0');
    if (adminDigits.includes(digits) && selectedRole !== 'admin') {
      setSelectedRole('admin');
    }
  }, [normalizedPhone, selectedRole]);

  const phoneError =
    phoneTouched && !normalizedPhone
      ? 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01715-883210)।'
      : undefined;

  async function handleGoogleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPhoneTouched(true);
    setFormError(null);

    if (!normalizedPhone) {
      setFormError('অনুগ্রহ করে সঠিক ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর লিখুন (যেমন: 01715-883210)।');
      return;
    }

    const trimmedName = fullName.trim();
    const validWardId =
      wardId !== '' && !isNaN(Number(wardId)) && Number(wardId) > 0
        ? Number(wardId)
        : undefined;

    setIsSubmitting(true);
    try {
      let gcpResult: GoogleCloudAuthResult;
      try {
        gcpResult = await signInWithGoogleCloud();
      } catch (gcpErr: unknown) {
        console.warn('Google Cloud Sign-In note, checking preview mode:', gcpErr);
        if (isOfflinePreview) {
          gcpResult = {
            idToken: `dev_token:${normalizedPhone}:google-mock-user`,
            userName: trimmedName || 'নাগরিক',
          };
        } else {
          throw gcpErr;
        }
      }

      const finalName = trimmedName || gcpResult.userName || 'নাগরিক';

      let session: AuthSession;
      try {
        session = await loginWithGoogleAuth({
          idToken: gcpResult.idToken,
          accessToken: gcpResult.accessToken,
          phone: normalizedPhone,
          email: gcpResult.userEmail,
          fullName: finalName,
          wardId: validWardId,
          role: selectedRole,
          redirectUri:
            typeof window !== 'undefined'
              ? `${window.location.origin}/api/auth/google/callback`
              : undefined,
        });
      } catch (authErr) {
        console.warn('Google direct route note, trying fallback:', authErr);
        session = await loginWithFirebaseToken({
          idToken:
            gcpResult.idToken ||
            gcpResult.accessToken ||
            `dev_token:${normalizedPhone}:google-user`,
          phone: normalizedPhone,
          fullName: finalName,
          wardId: validWardId,
          role: selectedRole,
        });
      }

      await applyAuthSession(session);
      onSuccess?.(session);
    } catch (err: unknown) {
      console.error('Google Sign-in / session creation failed:', err);
      const errorMessage =
        err instanceof ApiError
          ? err.messageBn
          : err instanceof Error
            ? err.message
            : 'Google সাইন-ইন প্রক্রিয়া সম্পন্ন করা যায়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।';
      setFormError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  const wardList = wards.length > 0 ? wards : SAVAR_WARDS_SEED;

  return (
    <div className="space-y-4">
      {authPromptReason ? (
        <div className="rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-3.5 py-2.5 text-xs font-medium text-[#14532D]">
          {authPromptReason}
        </div>
      ) : null}

      {formError ? (
        <div
          role="alert"
          className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-xs font-medium text-[#B91C1C] flex items-start gap-2"
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{formError}</span>
        </div>
      ) : null}

      <form onSubmit={handleGoogleAuthSubmit} noValidate className="space-y-3.5">
        {/* Compact Role Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-[#15803D]" aria-hidden="true" />
            অ্যাকাউন্টের ধরন / ভূমিকা <span className="text-[#B91C1C]">*</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {ROLES.map((r) => {
              const isSelected = selectedRole === r.role;
              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => setSelectedRole(r.role)}
                  className={`flex items-center justify-center rounded-lg border py-2 px-2.5 text-xs font-semibold transition-all ${
                    isSelected
                      ? 'border-[#15803D] bg-[#F0FDF4] text-[#14532D] shadow-xs ring-1 ring-[#15803D]'
                      : 'border-[#CBD5E1] bg-white text-[#475569] hover:border-[#94A3B8] hover:bg-[#F8FAFC]'
                  }`}
                >
                  {r.labelBn}
                </button>
              );
            })}
          </div>
        </div>

        {/* Required Mobile Number */}
        <FormField
          id={titleId ? `${titleId}-phone` : 'auth-phone-input'}
          label="মোবাইল নম্বর"
          required
          error={phoneError}
        >
          {(a11y) => (
            <div className="relative">
              <input
                {...a11y}
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="01715-883210"
                value={phoneInput}
                data-touched={phoneTouched ? 'true' : 'false'}
                onChange={(e) => {
                  setPhoneInput(e.target.value);
                  setFormError(null);
                }}
                onBlur={() => setPhoneTouched(true)}
                className="cs-input pl-9 font-metric text-sm"
              />
              <Phone
                className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-[#64748B]"
                aria-hidden="true"
              />
            </div>
          )}
        </FormField>

        {/* Full Name (Optional - auto filled from Google) */}
        <FormField
          id={titleId ? `${titleId}-name` : 'auth-name-input'}
          label="আপনার পূর্ণ নাম"
        >
          {(a11y) => (
            <div className="relative">
              <input
                {...a11y}
                type="text"
                autoComplete="name"
                placeholder="যেমন: মো. রাফি আহমেদ (ঐচ্ছিক — Google থেকে নেওয়া হবে)"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setFormError(null);
                }}
                className="cs-input pl-9 text-sm"
              />
              <UserIcon
                className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-[#64748B]"
                aria-hidden="true"
              />
            </div>
          )}
        </FormField>

        {/* Ward Selector (Optional) */}
        <FormField
          id={titleId ? `${titleId}-ward` : 'auth-ward-select'}
          label="সাভার এলাকা / ওয়ার্ড (ঐচ্ছিক)"
        >
          {(a11y) => (
            <select
              {...a11y}
              value={wardId}
              onChange={(e) =>
                setWardId(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="cs-input text-xs"
            >
              <option value="">ওয়ার্ড নম্বর বা এলাকা নির্বাচন করুন (ঐচ্ছিক)</option>
              {wardList.map((ward) => (
                <option key={ward.id} value={ward.id}>
                  {ward.name_bn}
                </option>
              ))}
            </select>
          )}
        </FormField>

        {/* Google Sign-In Primary Action Button */}
        <div className="pt-1">
          <Button
            type="submit"
            size="lg"
            className="w-full bg-white text-[#0F172A] border border-[#CBD5E1] hover:bg-[#F8FAFC] hover:border-[#94A3B8] shadow-xs py-3 h-auto"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#15803D]" aria-hidden="true" />
                Google যাচাইকরণ হচ্ছে...
              </>
            ) : (
              <span className="flex items-center justify-center gap-2.5 font-semibold text-sm">
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
                Google দিয়ে সাইন-ইন করুন
                <ArrowRight className="h-4 w-4 text-[#64748B]" aria-hidden="true" />
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
