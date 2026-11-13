'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  PackageCheck,
  Recycle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { AuthGateCard } from '@/components/AuthGateCard';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { NativeDialog } from '@/components/ui/native-dialog';
import { useCleanSavar } from '@/context/CleanSavarContext';
import {
  ApiError,
  claimRecyclableLot,
  collectRecyclableLot,
  fetchRecyclableLots,
} from '@/lib/api-client';
import { LOT_STATUS_META, MATERIAL_LABELS } from '@/lib/savar-data';
import type { LotStatus, MaterialType, RecyclableLotRecord } from '@/lib/types';
import { RelativeTimeBn } from '@/components/ui/relative-time';
import { toBanglaDigits } from '@/lib/utils';

function PartnerMarketplaceInner() {
  const { profile, announce, refreshPublicData } = useCleanSavar();

  const [lots, setLots] = useState<RecyclableLotRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | LotStatus>('all');
  const [materialFilter, setMaterialFilter] = useState<'all' | MaterialType>('all');
  const [query, setQuery] = useState<string>('');

  const [claimTarget, setClaimTarget] = useState<RecyclableLotRecord | null>(null);
  const [claimNote, setClaimNote] = useState<string>('আমাদের সংগ্রহকারী গাড়ি নির্ধারিত হুবে পৌঁছাবে');
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadLots = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const list = await fetchRecyclableLots();
      setLots(list);
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError ? err.messageBn : 'রিসাইক্লিং লট তালিকা লোড করা যায়নি।',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile && ['partner', 'admin'].includes(profile.user.role)) {
      void loadLots();
    }
  }, [profile, loadLots]);

  const filteredLots = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lots.filter((lot) => {
      if (statusFilter !== 'all' && lot.status !== statusFilter) return false;
      if (materialFilter !== 'all' && lot.material_type !== materialFilter) return false;
      if (!q) return true;
      return (
        lot.lot_code.toLowerCase().includes(q) ||
        lot.ward_name_bn.toLowerCase().includes(q) ||
        lot.pickup_hub_bn.toLowerCase().includes(q)
      );
    });
  }, [lots, statusFilter, materialFilter, query]);

  async function handleClaimSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!claimTarget) return;
    setActionBusyId(claimTarget.id);
    setActionError(null);
    try {
      const updated = await claimRecyclableLot(
        claimTarget.id,
        claimNote.trim() || 'পার্টনার কর্তৃক লট বুকিং নিশ্চিত হয়েছে',
      );
      setLots((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      setClaimTarget(null);
      announce(`লট ${updated.lot_code} সফলভাবে বুক করা হয়েছে।`);
      await refreshPublicData();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.messageBn : 'লট বুক করা যায়নি।');
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleCollectLot(lot: RecyclableLotRecord) {
    setActionBusyId(lot.id);
    setActionError(null);
    try {
      const updated = await collectRecyclableLot(lot.id);
      setLots((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      announce(`লট ${updated.lot_code} সংগ্রহ সম্পন্ন হিসেবে চিহ্নিত হয়েছে।`);
      await refreshPublicData();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.messageBn : 'সংগ্রহ নিশ্চিত করা যায়নি।');
    } finally {
      setActionBusyId(null);
    }
  }

  const openKgTotal = lots
    .filter((l) => l.status === 'open')
    .reduce((sum, l) => sum + Number(l.estimated_kg || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="cs-card p-4">
          <p className="text-xs font-medium text-[#475569]">মোট তালিকাভুক্ত লট</p>
          <p className="mt-1 font-metric text-2xl font-bold text-[#0F172A]">
            {toBanglaDigits(lots.length)}টি
          </p>
        </div>
        <div className="cs-card p-4">
          <p className="text-xs font-medium text-[#475569]">খোলা রিসাইক্লিং ওজন</p>
          <p className="mt-1 font-metric text-2xl font-bold text-[#15803D]">
            {toBanglaDigits(Math.round(openKgTotal))} কেজি
          </p>
        </div>
        <div className="cs-card p-4">
          <p className="text-xs font-medium text-[#475569]">পার্টনার প্রতিষ্ঠান</p>
          <p className="mt-1 truncate text-base font-bold text-[#0F172A]">
            {profile?.partner_name || profile?.user.full_name}
          </p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="cs-card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <label htmlFor="partner-search" className="sr-only">
              লট খুঁজুন
            </label>
            <input
              id="partner-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="লট কোড বা হাব খুঁজুন..."
              className="cs-input w-56 pl-9"
            />
            <Search
              className="pointer-events-none absolute top-3.5 left-3 h-4 w-4 text-[#64748B]"
              aria-hidden="true"
            />
          </div>

          <select
            aria-label="অবস্থা ফিল্টার"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | LotStatus)}
            className="cs-input w-40"
          >
            <option value="all">সকল অবস্থা</option>
            <option value="open">বুকিং খোলা</option>
            <option value="claimed">পার্টনার বুকড</option>
            <option value="collected">সংগ্রহ সম্পন্ন</option>
          </select>

          <select
            aria-label="উপাদান ফিল্টার"
            value={materialFilter}
            onChange={(e) => setMaterialFilter(e.target.value as 'all' | MaterialType)}
            className="cs-input w-48"
          >
            <option value="all">সকল উপাদান</option>
            {Object.entries(MATERIAL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <Button type="button" variant="secondary" size="sm" onClick={() => void loadLots()}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          রিফ্রেশ
        </Button>
      </div>

      {actionError || errorMsg ? (
        <div role="alert" className="rounded-md border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#B91C1C]">
          {actionError || errorMsg}
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <div className="cs-card h-24 animate-pulse" />
          <div className="cs-card h-24 animate-pulse" />
        </div>
      ) : filteredLots.length === 0 ? (
        <div className="cs-card border-dashed p-10 text-center">
          <p className="text-base font-bold text-[#0F172A]">কোনো রিসাইক্লিং লট পাওয়া যায়নি</p>
          <p className="mt-1 text-sm text-[#475569]">
            অনুগ্রহ করে ফিল্টার পরিবর্তন করে দেখুন।
          </p>
        </div>
      ) : (
        <div className="cs-card overflow-hidden">
          <div className="cs-table-wrapper">
            <table className="cs-table">
              <caption className="sr-only">সাভার রিসাইক্লিং লট তালিকা</caption>
              <thead>
                <tr>
                  <th scope="col">লট কোড</th>
                  <th scope="col">উপাদান ও ওজন</th>
                  <th scope="col">সংগ্রহ হাব ও ওয়ার্ড</th>
                  <th scope="col">অবস্থা</th>
                  <th scope="col">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody>
                {filteredLots.map((lot) => {
                  const meta = LOT_STATUS_META[lot.status];
                  const busy = actionBusyId === lot.id;
                  return (
                    <tr key={lot.id}>
                      <td data-label="লট কোড">
                        <span className="font-metric font-bold text-[#0F172A]">
                          {lot.lot_code}
                        </span>
                        <span className="block text-[11px] text-[#475569]">
                          <RelativeTimeBn isoDate={lot.created_at} />
                        </span>
                      </td>
                      <td data-label="উপাদান ও ওজন">
                        <span className="font-semibold text-[#0F172A]">
                          {MATERIAL_LABELS[lot.material_type]}
                        </span>
                        <span className="block font-metric text-xs font-bold text-[#15803D]">
                          {toBanglaDigits(lot.estimated_kg)} কেজি
                        </span>
                      </td>
                      <td data-label="সংগ্রহ হাব ও ওয়ার্ড">
                        <span className="font-medium text-[#0F172A]">{lot.pickup_hub_bn}</span>
                        <span className="block text-xs text-[#475569]">{lot.ward_name_bn}</span>
                      </td>
                      <td data-label="অবস্থা">
                        <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                        {lot.claimed_partner_name ? (
                          <span className="mt-1 block text-[11px] text-[#475569]">
                            {lot.claimed_partner_name}
                          </span>
                        ) : null}
                      </td>
                      <td data-label="পদক্ষেপ">
                        {lot.status === 'open' ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={busy}
                            onClick={() => {
                              setActionError(null);
                              setClaimTarget(lot);
                            }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            লট বুক করুন
                          </Button>
                        ) : lot.status === 'claimed' ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="tint"
                            disabled={busy}
                            onClick={() => void handleCollectLot(lot)}
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                              <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            সংগ্রহ সম্পন্ন
                          </Button>
                        ) : (
                          <span className="text-xs font-medium text-[#475569]">সম্পন্ন</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <NativeDialog
        open={Boolean(claimTarget)}
        onClose={() => setClaimTarget(null)}
        title="রিসাইক্লিং লট বুকিং নিশ্চিত করুন"
        description={
          claimTarget
            ? `${claimTarget.lot_code} — ${MATERIAL_LABELS[claimTarget.material_type]} (${toBanglaDigits(claimTarget.estimated_kg)} কেজি)`
            : undefined
        }
      >
        <form onSubmit={handleClaimSubmit} className="space-y-4">
          <FormField
            id="claim-note"
            label="পিকআপ নির্দেশনা বা মন্তব্য"
            required
            hint="কখন ও কোন গাড়ি দিয়ে সংগ্রহ করবেন তা উল্লেখ করুন"
          >
            {(a11y) => (
              <textarea
                {...a11y}
                rows={3}
                required
                value={claimNote}
                onChange={(e) => setClaimNote(e.target.value)}
                className="cs-input min-h-20 py-2"
              />
            )}
          </FormField>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={actionBusyId !== null}
          >
            {actionBusyId ? 'সংরক্ষণ হচ্ছে...' : 'লট বুকিং নিশ্চিত করুন'}
          </Button>
        </form>
      </NativeDialog>
    </div>
  );
}

export default function PartnerPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 border-b border-[#E2E8F0] pb-5">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D]">
          <Recycle className="h-4 w-4" aria-hidden="true" />
          সার্কুলার ইকোনমি ও রিসাইক্লিং হাব
        </div>
        <h1 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">
          রিসাইক্লিং পার্টনার লট মার্কেটপ্লেস
        </h1>
        <p className="max-w-2xl text-sm text-[#475569]">
          সাভারের সেকেন্ডারি ট্রান্সফার স্টেশনগুলোতে সংগৃহীত প্লাস্টিক, কাগজ, ধাতু ও কাচের লট বুকিং এবং সংগ্রহ ট্র্যাকিং।
        </p>
      </div>

      <AuthGateCard
        titleBn="অনুমোদিত রিসাইক্লিং পার্টনার লগইন প্রয়োজন"
        descriptionBn="লট তালিকা দেখতে এবং সংগ্রহের জন্য বুক করতে অনুমোদিত রিসাইক্লিং পার্টনার বা পৌর অ্যাডমিন মোবাইল OTP দিয়ে লগইন করুন।"
        allowedRoles={['partner', 'admin']}
      >
        <PartnerMarketplaceInner />
      </AuthGateCard>
    </div>
  );
}
