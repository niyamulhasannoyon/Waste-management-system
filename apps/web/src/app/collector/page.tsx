'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Loader2,
  LocateFixed,
  RefreshCw,
  Truck,
  UploadCloud,
} from 'lucide-react';
import { AuthGateCard } from '@/components/AuthGateCard';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { NativeDialog } from '@/components/ui/native-dialog';
import { useCleanSavar } from '@/context/CleanSavarContext';
import {
  ApiError,
  completeCollectorTask,
  fetchPickups,
  fetchReports,
  fetchVehicles,
  syncCollectorOperations,
  updateVehicleLocation,
  uploadDumpPhoto,
} from '@/lib/api-client';
import {
  PICKUP_STATUS_META,
  REPORT_STATUS_META,
  VEHICLE_STATUS_META,
  VEHICLE_TYPE_LABELS,
} from '@/lib/savar-data';
import type {
  CollectorVehicleRecord,
  DumpReportRecord,
  PickupRequestRecord,
  SyncCollectorOperation,
  VehicleStatus,
} from '@/lib/types';
import { toBanglaDigits } from '@/lib/utils';

type ActiveTask =
  | { kind: 'pickup'; record: PickupRequestRecord }
  | { kind: 'dump_report'; record: DumpReportRecord };

function CollectorWorkspaceInner() {
  const { profile, announce, refreshPublicData } = useCleanSavar();

  const [pickups, setPickups] = useState<PickupRequestRecord[]>([]);
  const [reports, setReports] = useState<DumpReportRecord[]>([]);
  const [vehicles, setVehicles] = useState<CollectorVehicleRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isPingingGps, setIsPingingGps] = useState<boolean>(false);
  const [gpsFeedback, setGpsFeedback] = useState<string | null>(null);
  const [pendingSyncQueue, setPendingSyncQueue] = useState<SyncCollectorOperation[]>([]);
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);

  const [completingTask, setCompletingTask] = useState<ActiveTask | null>(null);
  const [weightKg, setWeightKg] = useState<string>('');
  const [completionNotes, setCompletionNotes] = useState<string>('মাঠপর্যায়ে ময়লা সংগ্রহ ও পরিষ্কার সম্পন্ন');
  const [completionPhotoUrl, setCompletionPhotoUrl] = useState<string | undefined>(undefined);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [isSubmittingComplete, setIsSubmittingComplete] = useState<boolean>(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [pList, rList, vList] = await Promise.all([
        fetchPickups({ limit: 40 }),
        fetchReports({ limit: 40 }),
        fetchVehicles(),
      ]);
      setPickups(pList);
      setReports(rList);
      setVehicles(vList);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.messageBn : 'মাঠপর্যায়ের কাজের তালিকা লোড করা যায়নি।',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile && ['collector', 'admin'].includes(profile.user.role)) {
      void loadWorkspace();
    }
  }, [profile, loadWorkspace]);

  const myVehicle = useMemo(() => {
    if (!profile) return null;
    return (
      vehicles.find((v) => v.id === profile.vehicle_id) ??
      vehicles.find((v) => v.user_id === profile.user.id) ??
      vehicles[0] ??
      null
    );
  }, [vehicles, profile]);

  const actionablePickups = useMemo(
    () => pickups.filter((p) => ['assigned', 'in_progress', 'pending'].includes(p.status)),
    [pickups],
  );
  const actionableReports = useMemo(
    () => reports.filter((r) => ['verified', 'dispatched'].includes(r.status)),
    [reports],
  );

  async function handlePingLocation(nextStatus?: VehicleStatus) {
    if (!myVehicle) return;
    setIsPingingGps(true);
    setGpsFeedback(null);

    const updateTelemetry = async (lat: number, lng: number) => {
      try {
        const updated = await updateVehicleLocation(myVehicle.id, {
          lat,
          lng,
          status: nextStatus ?? myVehicle.status,
        });
        setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
        setGpsFeedback(`গাড়ি ${updated.code} অবস্থান আপডেট হয়েছে (${lat.toFixed(4)}, ${lng.toFixed(4)})।`);
        announce('গাড়ির অবস্থান সফলভাবে আপডেট হয়েছে।');
      } catch (err) {
        setGpsFeedback(
          err instanceof ApiError ? err.messageBn : 'অবস্থান আপডেট করা যায়নি।',
        );
      } finally {
        setIsPingingGps(false);
      }
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => void updateTelemetry(pos.coords.latitude, pos.coords.longitude),
        () => void updateTelemetry(myVehicle.lat, myVehicle.lng),
        { enableHighAccuracy: true, timeout: 5000 },
      );
    } else {
      await updateTelemetry(myVehicle.lat, myVehicle.lng);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploadingPhoto(true);
    setCompleteError(null);
    try {
      const res = await uploadDumpPhoto(file);
      setCompletionPhotoUrl(res.url);
    } catch (err) {
      setCompleteError(
        err instanceof ApiError ? err.messageBn : 'ছবি আপলোড করা যায়নি।',
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handleCompleteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!completingTask) return;
    setCompleteError(null);

    const parsedWeight = weightKg.trim() ? Number(weightKg) : undefined;
    if (parsedWeight !== undefined && (!Number.isFinite(parsedWeight) || parsedWeight <= 0 || parsedWeight > 5000)) {
      setCompleteError('সঠিক ওজন (০ থেকে ৫০০০ কেজি) লিখুন।');
      return;
    }

    const idempotencyKey =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    setIsSubmittingComplete(true);
    try {
      await completeCollectorTask(
        completingTask.record.id,
        {
          task_type: completingTask.kind,
          weight_kg: parsedWeight,
          completion_photo_url: completionPhotoUrl,
          notes: completionNotes.trim() || 'কাজ সম্পন্ন হয়েছে',
        },
        idempotencyKey,
      );
      setCompletingTask(null);
      setWeightKg('');
      setCompletionPhotoUrl(undefined);
      announce('কাজ সম্পন্ন হিসেবে নথিভুক্ত হয়েছে।');
      await Promise.all([loadWorkspace(), refreshPublicData()]);
    } catch (err) {
      if (err instanceof ApiError && err.isNetworkError) {
        setPendingSyncQueue((prev) => [
          ...prev,
          {
            entity_type: completingTask.kind,
            entity_id: completingTask.record.id,
            idempotency_key: idempotencyKey,
            weight_kg: parsedWeight,
            completion_photo_url: completionPhotoUrl,
            notes: completionNotes.trim() || 'অফলাইন কিউ থেকে সম্পন্ন',
          },
        ]);
        setCompletingTask(null);
        setGpsFeedback('নেটওয়ার্ক বিচ্ছিন্ন থাকায় কাজটি অফলাইন সিঙ্ক কিউতে সংরক্ষিত হয়েছে।');
      } else {
        setCompleteError(
          err instanceof ApiError ? err.messageBn : 'কাজটি সম্পন্ন করা যায়নি।',
        );
      }
    } finally {
      setIsSubmittingComplete(false);
    }
  }

  async function handleFlushOfflineQueue() {
    if (pendingSyncQueue.length === 0) return;
    setIsSyncingQueue(true);
    try {
      const res = await syncCollectorOperations(pendingSyncQueue);
      const failedKeys = new Set(res.failed_keys ?? []);
      setPendingSyncQueue((prev) =>
        failedKeys.size > 0 ? prev.filter((op) => failedKeys.has(op.idempotency_key)) : [],
      );
      setGpsFeedback(
        failedKeys.size > 0
          ? `${toBanglaDigits(res.synced_count)}টি অপারেশন সিঙ্ক হয়েছে, তবে ${toBanglaDigits(failedKeys.size)}টি পুনরায় চেষ্টা প্রয়োজন।`
          : `${toBanglaDigits(res.synced_count)}টি অফলাইন অপারেশন সার্ভারে সিঙ্ক হয়েছে।`,
      );
      await Promise.all([loadWorkspace(), refreshPublicData()]);
    } catch (err) {
      setGpsFeedback(
        err instanceof ApiError ? err.messageBn : 'অফলাইন কিউ সিঙ্ক করা যায়নি।',
      );
    } finally {
      setIsSyncingQueue(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Vehicle Telemetry Header Card */}
      <section className="cs-card space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#0F172A]">
              আমার সংগ্রহ গাড়ি ও লাইভ অবস্থান
            </h2>
            {myVehicle ? (
              <p className="text-sm text-[#475569]">
                <strong className="font-metric text-[#0F172A]">{myVehicle.code}</strong> (
                {VEHICLE_TYPE_LABELS[myVehicle.vehicle_type]}) · {myVehicle.ward_name_bn}
              </p>
            ) : (
              <p className="text-sm text-[#475569]">নির্ধারিত গাড়ির তথ্য পাওয়া যায়নি</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {myVehicle ? (
              <>
                <StatusBadge tone={VEHICLE_STATUS_META[myVehicle.status].tone}>
                  {VEHICLE_STATUS_META[myVehicle.status].label}
                </StatusBadge>
                {(['available', 'en_route', 'busy', 'offline'] as const).map((statusOpt) => (
                  <button
                    key={statusOpt}
                    type="button"
                    disabled={isPingingGps}
                    onClick={() => void handlePingLocation(statusOpt)}
                    className={`min-h-9 rounded border px-2.5 text-xs font-semibold transition-colors ${
                      myVehicle.status === statusOpt
                        ? 'border-[#15803D] bg-[#F0FDF4] text-[#14532D]'
                        : 'border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    {VEHICLE_STATUS_META[statusOpt].label}
                  </button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="tint"
                  disabled={isPingingGps}
                  onClick={() => void handlePingLocation()}
                >
                  {isPingingGps ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  GPS পিং পাঠান
                </Button>
              </>
            ) : null}

            <Button type="button" size="sm" variant="secondary" onClick={() => void loadWorkspace()}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              রিফ্রেশ
            </Button>
          </div>
        </div>

        {gpsFeedback ? (
          <p className="rounded-md bg-[#F0FDF4] px-3 py-2 text-xs font-medium text-[#14532D]">
            {gpsFeedback}
          </p>
        ) : null}

        {pendingSyncQueue.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2.5 text-xs text-[#92400E]">
            <span>
              অফলাইন সিঙ্কের অপেক্ষায়: <strong>{toBanglaDigits(pendingSyncQueue.length)}টি কাজ</strong>
            </span>
            <Button
              type="button"
              size="sm"
              disabled={isSyncingQueue}
              onClick={() => void handleFlushOfflineQueue()}
            >
              <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
              {isSyncingQueue ? 'সিঙ্ক হচ্ছে...' : 'এখনই সিঙ্ক করুন'}
            </Button>
          </div>
        ) : null}
      </section>

      {loadError ? (
        <div role="alert" className="rounded-md border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#B91C1C]">
          {loadError}
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
          <div className="cs-card h-48 animate-pulse" />
          <div className="cs-card h-48 animate-pulse" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pickup Queue */}
          <section className="cs-card space-y-3 p-5">
            <h2 className="text-base font-bold text-[#0F172A]">
              সক্রিয় পিকআপ টাস্ক ({toBanglaDigits(actionablePickups.length)})
            </h2>
            {actionablePickups.length === 0 ? (
              <p className="rounded-md border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-6 text-center text-xs text-[#475569]">
                এই মুহূর্তে নির্ধারিত পিকআপ টাস্ক নেই।
              </p>
            ) : (
              <ul className="space-y-3">
                {actionablePickups.map((p) => {
                  const meta = PICKUP_STATUS_META[p.status];
                  return (
                    <li
                      key={p.id}
                      className="flex flex-col justify-between gap-3 rounded-md border border-[#E2E8F0] p-3.5 sm:flex-row sm:items-center"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-metric text-xs font-bold text-[#15803D]">
                            {p.tracking_code}
                          </span>
                          <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                        </div>
                        <p className="text-sm font-semibold text-[#0F172A]">{p.address_line}</p>
                        <p className="text-xs text-[#475569]">
                          {p.landmark} · {p.ward_name_bn}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setCompleteError(null);
                          setCompletionPhotoUrl(undefined);
                          setCompletingTask({ kind: 'pickup', record: p });
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        সম্পন্ন করুন
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Dispatched Dump Reports Queue */}
          <section className="cs-card space-y-3 p-5">
            <h2 className="text-base font-bold text-[#0F172A]">
              ময়লা পরিষ্কার অভিযান ({toBanglaDigits(actionableReports.length)})
            </h2>
            {actionableReports.length === 0 ? (
              <p className="rounded-md border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-6 text-center text-xs text-[#475569]">
                পরিষ্কারের জন্য নির্ধারিত কোনো হটস্পট রিপোর্ট নেই।
              </p>
            ) : (
              <ul className="space-y-3">
                {actionableReports.map((r) => {
                  const meta = REPORT_STATUS_META[r.status];
                  return (
                    <li
                      key={r.id}
                      className="flex flex-col justify-between gap-3 rounded-md border border-[#E2E8F0] p-3.5 sm:flex-row sm:items-center"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-metric text-xs font-bold text-[#15803D]">
                            {r.tracking_code}
                          </span>
                          <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                        </div>
                        <p className="text-sm font-semibold text-[#0F172A]">{r.title_bn}</p>
                        <p className="text-xs text-[#475569]">
                          {r.landmark} · {r.ward_name_bn}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setCompleteError(null);
                          setCompletionPhotoUrl(undefined);
                          setCompletingTask({ kind: 'dump_report', record: r });
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        পরিষ্কার নিশ্চিত করুন
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* Idempotent Task Completion Modal */}
      <NativeDialog
        open={Boolean(completingTask)}
        onClose={() => setCompletingTask(null)}
        title="কাজ সম্পন্ন করার তথ্য জমা দিন"
        description={
          completingTask
            ? `${completingTask.record.tracking_code} — ওজন ও প্রমাণের ছবিসহ নথিভুক্তি`
            : undefined
        }
      >
        <form onSubmit={handleCompleteSubmit} className="space-y-4">
          {completeError ? (
            <div role="alert" className="rounded-md bg-[#FEF2F2] p-3 text-xs font-medium text-[#B91C1C]">
              {completeError}
            </div>
          ) : null}

          <FormField
            id="collector-weight"
            label="সংগৃহীত বর্জ্যের আনুমানিক ওজন (কেজি)"
            hint="যদি প্রযোজ্য হয় (যেমন: 12.5)"
          >
            {(a11y) => (
              <input
                {...a11y}
                type="number"
                step="0.5"
                min="0.5"
                max="5000"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="যেমন: 15"
                className="cs-input font-metric"
              />
            )}
          </FormField>

          <FormField id="collector-notes" label="মাঠপর্যায়ের নোট" required>
            {(a11y) => (
              <textarea
                {...a11y}
                rows={2}
                required
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                className="cs-input min-h-20 py-2"
              />
            )}
          </FormField>

          <div className="space-y-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3">
            <label htmlFor="collector-proof-photo" className="flex items-center gap-1.5 text-xs font-semibold text-[#0F172A]">
              <Camera className="h-4 w-4 text-[#15803D]" aria-hidden="true" />
              পরিচ্ছন্নতার প্রমাণ ছবি (ঐচ্ছিক)
            </label>
            <input
              id="collector-proof-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoUpload}
              className="block w-full text-xs text-[#475569]"
            />
            {isUploadingPhoto ? (
              <p className="text-xs text-[#15803D]">ছবি আপলোড হচ্ছে...</p>
            ) : completionPhotoUrl ? (
              <p className="text-xs font-medium text-[#14532D]">ছবি সফলভাবে যুক্ত হয়েছে।</p>
            ) : null}
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSubmittingComplete || isUploadingPhoto}
          >
            {isSubmittingComplete ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                সংরক্ষণ করা হচ্ছে...
              </>
            ) : (
              'কাজ সম্পন্ন নিশ্চিত করুন'
            )}
          </Button>
        </form>
      </NativeDialog>
    </div>
  );
}

export default function CollectorPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 border-b border-[#E2E8F0] pb-5">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D]">
          <Truck className="h-4 w-4" aria-hidden="true" />
          কালেক্টর অপারেশনস পোর্টাল
        </div>
        <h1 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">
          সংগ্রহকারী ও মাঠপর্যায়ের টাস্ক ওয়ার্কস্পেস
        </h1>
        <p className="max-w-2xl text-sm text-[#475569]">
          দৈনিক নির্ধারিত পিকআপ, ময়লার স্তূপ অপসারণ ও গাড়ির অবস্থান সরাসরি এখান থেকে পরিচালনা করুন।
        </p>
      </div>

      <AuthGateCard
        titleBn="কালেক্টর অ্যাকাউন্ট দিয়ে প্রবেশ করুন"
        descriptionBn="মাঠপর্যায়ের টাস্ক দেখা ও কাজ সম্পন্ন হিসেবে চিহ্নিত করতে অনুমোদিত সংগ্রহকারী বা অ্যাডমিন মোবাইল OTP দিয়ে লগইন করুন।"
        allowedRoles={['collector', 'admin']}
      >
        <CollectorWorkspaceInner />
      </AuthGateCard>
    </div>
  );
}
