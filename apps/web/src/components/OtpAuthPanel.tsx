'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { useCleanSavar } from '@/context/CleanSavarContext';
import { ApiError, requestOtp, verifyOtp } from '@/lib/api-client';
import { DEMO_OTP_ACCOUNTS, SAVAR_WARDS_SEED } from '@/lib/savar-data';
import type { AuthSession, OtpLoginResponse, UserRole } from '@/lib/types';
import { normalizeBdPhone, toBanglaDigits } from '@/lib/utils';
import { KeyRound, Loader2, Phone, RefreshCw, ShieldCheck } from 'lucide-react';

interface OtpAuthPanelProps {
  onSuccess?: (session: AuthSession) => void;
  titleId?: string;
}

export function OtpAuthPanel({ onSuccess, titleId }: OtpAuthPanelProps) {
  const { applyAuthSession, wards, isOfflinePreview, authPromptReason } = useCleanSavar();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [wardId, setWardId] = useState<number>(SAVAR_WARDS_SEED[2]?.id ?? 3);
  const [accountType, setAccountType] = useState<Extract<UserRole, 'citizen' | 'collector'>>('citizen');
  const [otpInput, setOtpInput] = useState<string>('');

  const [phoneTouched, setPhoneTouched] = useState<boolean>(false);
  const [otpTouched, setOtpTouched] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [otpChallenge, setOtpChallenge] = useState<OtpLoginResponse | null>(null);

  const normalizedPhone = normalizeBdPhone(phoneInput);
  const phoneError =
    phoneTouched && !normalizedPhone
      ? 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01715-883210)।'
      : undefined;

  const cleanedOtp = otpInput.replace(/\D/g, '').slice(0, 6);
  const otpError =
    otpTouched && cleanedOtp.length !== 6
      ? 'SMS-এ প্রাপ্ত ৬ সংখ্যার সঠিক OTP কোড লিখুন।'
      : undefined;

  // WebOTP API auto-fill when user is on OTP step in supported mobile browsers
  useEffect(() => {
    if (step !== 'otp' || typeof window === 'undefined' || !('OTPCredential' in window)) {
      return;
    }
    const controller = new AbortController();
    const nav = navigator as Navigator & {
      credentials?: {
        get: (options: Record<string, unknown>) => Promise<{ code?: string } | null>;
      };
    };

    nav.credentials
      ?.get({
        otp: { transport: ['sms'] },
        signal: controller.signal,
      })
      .then((cred) => {
        if (cred?.code) {
          setOtpInput(cred.code.replace(/\D/g, '').slice(0, 6));
          setOtpTouched(true);
        }
      })
      .catch(() => {
        // Ignore user cancel or timeout cleanly.
      });

    return () => {
      controller.abort();
    };
  }, [step]);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setPhoneTouched(true);
    setFormError(null);

    if (!normalizedPhone) {
      return;
    }

    setIsSubmitting(true);
    try {
      const challenge = await requestOtp({
        phone: normalizedPhone,
        full_name: fullName.trim() || undefined,
        ward_id: wardId,
        role: accountType,
      });
      setOtpChallenge(challenge);
      setOtpInput('');
      setOtpTouched(false);
      setStep('otp');
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.messageBn
          : 'OTP পাঠানো যায়নি। এপিআই সার্ভার ও নেটওয়ার্ক যাচাই করুন।',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setOtpTouched(true);
    setFormError(null);

    if (!normalizedPhone || cleanedOtp.length !== 6) {
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await verifyOtp({
        phone: normalizedPhone,
        otp: cleanedOtp,
      });
      await applyAuthSession(session);
      onSuccess?.(session);
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.messageBn
          : 'OTP যাচাই করা যায়নি। কোডটি পুনরায় পরীক্ষা করুন।',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (!normalizedPhone || isSubmitting) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      const challenge = await requestOtp({
        phone: normalizedPhone,
        full_name: fullName.trim() || undefined,
        ward_id: wardId,
        role: accountType,
      });
      setOtpChallenge(challenge);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.messageBn : 'পুনরায় OTP পাঠানো যায়নি।',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const wardList = wards.length > 0 ? wards : SAVAR_WARDS_SEED;

  return (
    <div className="space-y-4">
      {authPromptReason ? (
        <div className="rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-3.5 py-2.5 text-sm text-[#14532D]">
          {authPromptReason}
        </div>
      ) : null}

      {isOfflinePreview ? (
        <div className="rounded-md border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2.5 text-xs text-[#92400E]">
          দ্রষ্টব্য: এপিআই সার্ভার (localhost:8080) বন্ধ থাকলে OTP যাচাই সম্পন্ন হবে না। এপিআই চালু থাকলে প্রকৃত OTP চ্যালেঞ্জ সক্রিয় হবে।
        </div>
      ) : null}

      {formError ? (
        <div
          role="alert"
          className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-sm font-medium text-[#B91C1C]"
        >
          {formError}
        </div>
      ) : null}

      {step === 'phone' ? (
        <form onSubmit={handleRequestOtp} noValidate className="space-y-4">
          <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3">
            <p className="mb-2 text-xs font-semibold text-[#475569]">
              দ্রুত টেস্ট অ্যাকাউন্ট নম্বর বসান (সবাই প্রকৃত OTP দিয়েই লগইন করে):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_OTP_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => {
                    setPhoneInput(acc.phone);
                    setFullName(acc.nameBn);
                    setAccountType(acc.role === 'collector' ? 'collector' : 'citizen');
                    setPhoneTouched(false);
                    setFormError(null);
                  }}
                  className="rounded border border-[#CBD5E1] bg-white px-2.5 py-1 text-xs font-medium text-[#0F172A] transition-colors hover:border-[#15803D] hover:bg-[#F0FDF4] hover:text-[#14532D]"
                >
                  {acc.labelBn}
                </button>
              ))}
            </div>
          </div>

          <FormField
            id={titleId ? `${titleId}-phone` : 'otp-phone-input'}
            label="মোবাইল নম্বর"
            required
            hint="১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর লিখুন (যেমন: 01715-883210)"
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
                  className="cs-input pl-9 font-metric"
                />
                <Phone
                  className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-[#64748B]"
                  aria-hidden="true"
                />
              </div>
            )}
          </FormField>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              id={titleId ? `${titleId}-name` : 'otp-name-input'}
              label="পূর্ণ নাম"
              hint="নতুন অ্যাকাউন্টের জন্য প্রদর্শিত নাম"
            >
              {(a11y) => (
                <input
                  {...a11y}
                  type="text"
                  autoComplete="name"
                  placeholder="আপনার নাম"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="cs-input"
                />
              )}
            </FormField>

            <FormField
              id={titleId ? `${titleId}-ward` : 'otp-ward-select'}
              label="আপনার সাভার এলাকা"
              hint="পৌরসভা ওয়ার্ড বা ইউনিয়ন"
            >
              {(a11y) => (
                <select
                  {...a11y}
                  value={wardId}
                  onChange={(e) => setWardId(Number(e.target.value))}
                  className="cs-input"
                >
                  {wardList.map((ward) => (
                    <option key={ward.id} value={ward.id}>
                      {ward.name_bn}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium text-[#0F172A]">
              নতুন নিবন্ধনের ভূমিকা
            </legend>
            <p className="text-xs text-[#475569]">
              পূর্বনিবন্ধিত পার্টনার ও অ্যাডমিন নম্বরে স্বয়ংক্রিয়ভাবে নির্ধারিত ভূমিকা চালু থাকে।
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {(
                [
                  { id: 'citizen', label: 'নাগরিক (Citizen)' },
                  { id: 'collector', label: 'সংগ্রহকারী (Collector)' },
                ] as const
              ).map((item) => {
                const selected = accountType === item.id;
                return (
                  <label
                    key={item.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      selected
                        ? 'border-[#15803D] bg-[#F0FDF4] text-[#14532D]'
                        : 'border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="otp-register-role"
                      value={item.id}
                      checked={selected}
                      onChange={() => setAccountType(item.id)}
                      className="accent-[#15803D]"
                    />
                    {item.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                OTP পাঠানো হচ্ছে...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                মোবাইল OTP পাঠান
              </>
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} noValidate className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 text-xs">
            <span className="text-[#0F172A]">
              OTP পাঠানো হয়েছে: <strong className="font-metric">{normalizedPhone}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setFormError(null);
              }}
              className="font-semibold text-[#15803D] underline-offset-2 hover:underline"
            >
              নম্বর পরিবর্তন করুন
            </button>
          </div>

          {otpChallenge?.otp_preview ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-3.5 py-2.5 text-xs text-[#14532D]">
              <span>
                ডেভেলপমেন্ট প্রিভিউ OTP:{' '}
                <strong className="font-metric text-sm tracking-widest">
                  {otpChallenge.otp_preview}
                </strong>
                {' '}({toBanglaDigits(Math.round(otpChallenge.expires_in_seconds / 60))} মিনিট মেয়াদ)
              </span>
              <button
                type="button"
                onClick={() => {
                  setOtpInput(otpChallenge.otp_preview ?? '');
                  setOtpTouched(true);
                }}
                className="rounded border border-[#15803D] bg-white px-2 py-1 font-semibold text-[#14532D] hover:bg-[#DCFCE7]"
              >
                কোড বসান
              </button>
            </div>
          ) : null}

          <FormField
            id={titleId ? `${titleId}-code` : 'otp-code-input'}
            label="৬ সংখ্যার OTP কোড"
            required
            hint="এসএমএসে প্রাপ্ত ৬ সংখ্যার কোডটি একক ঘরে লিখুন"
            error={otpError}
          >
            {(a11y) => (
              <div className="relative">
                <input
                  {...a11y}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="123456"
                  value={otpInput}
                  data-touched={otpTouched ? 'true' : 'false'}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpInput(digits);
                    setFormError(null);
                  }}
                  onBlur={() => setOtpTouched(true)}
                  className="cs-input pl-9 text-center font-metric text-lg font-bold tracking-[0.35em]"
                />
                <KeyRound
                  className="pointer-events-none absolute top-3.5 left-3 h-4 w-4 text-[#64748B]"
                  aria-hidden="true"
                />
              </div>
            )}
          </FormField>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" size="lg" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  যাচাই হচ্ছে...
                </>
              ) : (
                'OTP যাচাই করে লগইন করুন'
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={isSubmitting}
              onClick={handleResend}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              আবার পাঠান
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
