'use client';

import React, { useState } from 'react';
import { Loader2, Plus, Recycle } from 'lucide-react';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { ApiError, createRecyclableLot } from '@/lib/api-client';
import { LOT_STATUS_META, MATERIAL_LABELS, SAVAR_WARDS_SEED } from '@/lib/savar-data';
import type { MaterialType, RecyclableLotRecord, WardSummary } from '@/lib/types';
import { formatRelativeTimeBn, toBanglaDigits } from '@/lib/utils';

interface AdminLotsSectionProps {
  lots: RecyclableLotRecord[];
  wards: WardSummary[];
  onCreated: (lot: RecyclableLotRecord) => void;
}

export function AdminLotsSection({ lots, wards, onCreated }: AdminLotsSectionProps) {
  const wardList = wards.length > 0 ? wards : SAVAR_WARDS_SEED;

  const [wardId, setWardId] = useState<number>(wardList[2]?.id ?? 3);
  const [materialType, setMaterialType] = useState<MaterialType>('plastic');
  const [estimatedKg, setEstimatedKg] = useState<string>('100');
  const [pickupHubBn, setPickupHubBn] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleCreateLot(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    const kg = Number(estimatedKg);
    if (!Number.isFinite(kg) || kg <= 0 || kg > 50000) {
      setErrorMsg('সঠিক ওজন (১ – ৫০০০০ কেজি) লিখুন।');
      return;
    }
    if (pickupHubBn.trim().length < 3) {
      setErrorMsg('সংগ্রহ হাব বা STS-এর নাম লিখুন।');
      return;
    }
    setIsSaving(true);
    try {
      const created = await createRecyclableLot({
        ward_id: wardId,
        material_type: materialType,
        estimated_kg: kg,
        pickup_hub_bn: pickupHubBn.trim(),
      });
      setPickupHubBn('');
      onCreated(created);
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError ? err.messageBn : 'নতুন লট তৈরি করা যায়নি।',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <section className="cs-card space-y-4 p-5 lg:col-span-4">
        <div className="flex items-center gap-2 text-base font-bold text-[#0F172A]">
          <Recycle className="h-4 w-4 text-[#15803D]" aria-hidden="true" />
          নতুন রিসাইক্লিং লট তৈরি
        </div>
        {errorMsg ? (
          <p role="alert" className="rounded-md bg-[#FEF2F2] p-3 text-xs text-[#B91C1C]">
            {errorMsg}
          </p>
        ) : null}

        <form onSubmit={handleCreateLot} className="space-y-3">
          <FormField id="lot-ward" label="ওয়ার্ড / ইউনিয়ন" required>
            {(a11y) => (
              <select
                {...a11y}
                value={wardId}
                onChange={(e) => setWardId(Number(e.target.value))}
                className="cs-input"
              >
                {wardList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name_bn}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <FormField id="lot-material" label="উপাদানের ধরন" required>
            {(a11y) => (
              <select
                {...a11y}
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value as MaterialType)}
                className="cs-input"
              >
                {Object.entries(MATERIAL_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <FormField id="lot-kg" label="পরিমাণ (কেজি)" required>
            {(a11y) => (
              <input
                {...a11y}
                type="number"
                min={1}
                step="0.5"
                value={estimatedKg}
                onChange={(e) => setEstimatedKg(e.target.value)}
                className="cs-input font-metric"
              />
            )}
          </FormField>

          <FormField id="lot-hub" label="সেকেন্ডারি ট্রান্সফার হাব" required>
            {(a11y) => (
              <input
                {...a11y}
                type="text"
                required
                value={pickupHubBn}
                onChange={(e) => setPickupHubBn(e.target.value)}
                placeholder="যেমন: ব্যাংক টাউন STS হাব"
                className="cs-input"
              />
            )}
          </FormField>

          <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                তৈরি হচ্ছে...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" aria-hidden="true" />
                লট প্রকাশ করুন
              </>
            )}
          </Button>
        </form>
      </section>

      <section className="cs-card overflow-hidden lg:col-span-8">
        <div className="border-b border-[#E2E8F0] px-5 py-3.5">
          <h3 className="text-base font-bold text-[#0F172A]">
            সকল রিসাইক্লিং লট ({toBanglaDigits(lots.length)})
          </h3>
        </div>
        {lots.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#475569]">কোনো লট পাওয়া যায়নি।</p>
        ) : (
          <div className="cs-table-wrapper">
            <table className="cs-table">
              <caption className="sr-only">রিসাইক্লিং লট ব্যবস্থাপনা সারণি</caption>
              <thead>
                <tr>
                  <th scope="col">কোড</th>
                  <th scope="col">উপাদান ও ওজন</th>
                  <th scope="col">হাব</th>
                  <th scope="col">অবস্থা</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => {
                  const meta = LOT_STATUS_META[lot.status];
                  return (
                    <tr key={lot.id}>
                      <td data-label="কোড">
                        <span className="font-metric font-bold">{lot.lot_code}</span>
                        <span className="block text-[11px] text-[#475569]">
                          {formatRelativeTimeBn(lot.created_at)}
                        </span>
                      </td>
                      <td data-label="উপাদান ও ওজন">
                        <span className="font-medium">{MATERIAL_LABELS[lot.material_type]}</span>
                        <span className="block font-metric text-xs font-semibold text-[#15803D]">
                          {toBanglaDigits(lot.estimated_kg)} কেজি
                        </span>
                      </td>
                      <td data-label="হাব">
                        <span>{lot.pickup_hub_bn}</span>
                        <span className="block text-xs text-[#475569]">{lot.ward_name_bn}</span>
                      </td>
                      <td data-label="অবস্থা">
                        <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                        {lot.claimed_partner_name ? (
                          <span className="mt-1 block text-xs text-[#475569]">
                            {lot.claimed_partner_name}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
