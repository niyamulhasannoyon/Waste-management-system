'use client';

import { useEffect, useState } from 'react';
import { PackageCheck, Recycle } from 'lucide-react';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { NativeDialog } from '@/components/ui/native-dialog';
import { claimRecyclableLot, fetchRecyclableLots } from '@/lib/api-client';
import { LOT_STATUS_META, MATERIAL_LABELS } from '@/lib/savar-data';
import type { RecyclableLotRecord } from '@/lib/types';

export default function PartnerPortalPage() {
  const [lots, setLots] = useState<RecyclableLotRecord[]>([]);
  const [claimTarget, setClaimTarget] = useState<RecyclableLotRecord | null>(null);
  const [partnerName, setPartnerName] = useState('সবুজ রিসাইক্লিং সাভার');
  const [claiming, setClaiming] = useState(false);

  const loadLots = async () => {
    const res = await fetchRecyclableLots();
    setLots(res.data);
  };

  useEffect(() => {
    void loadLots();
  }, []);

  const totalOpenKg = lots
    .filter((l) => l.status === 'open')
    .reduce((acc, l) => acc + l.estimated_kg, 0);

  const handleConfirmClaim = async () => {
    if (!claimTarget || partnerName.trim().length < 2) return;
    setClaiming(true);
    try {
      await claimRecyclableLot(claimTarget.id, partnerName);
      setClaimTarget(null);
      await loadLots();
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 id="main-content" tabIndex={-1} className="text-2xl font-bold text-[#0F172A]">
            রিসাইক্লিং ও পার্টনার পোর্টাল
          </h1>
          <p className="text-sm text-[#475569]">
            সাভারের ওয়ার্ড হাবগুলোতে আলাদা করা শুকনো রিসাইক্লেবল বর্জ্যের লট বুক করুন
          </p>
        </div>
        <StatusBadge tone="success">
          <Recycle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>বুকিং খোলা: <strong lang="en" className="font-metric">{totalOpenKg.toFixed(1)} kg</strong></span>
        </StatusBadge>
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-labelledby="partner-lots-caption"
        className="cs-table-wrapper"
      >
        <table className="cs-table">
          <caption id="partner-lots-caption" className="visually-hidden">
            সাভারের রিসাইক্লিং লটের তালিকা
          </caption>
          <thead>
            <tr>
              <th scope="col">লট কোড</th>
              <th scope="col">উপাদান</th>
              <th scope="col">পরিমাণ</th>
              <th scope="col">ওয়ার্ড ও সংগ্রহ হাব</th>
              <th scope="col">অবস্থা</th>
              <th scope="col">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((lot) => {
              const meta = LOT_STATUS_META[lot.status];
              return (
                <tr key={lot.id}>
                  <th scope="row" className="font-metric text-xs font-semibold text-[#0F172A]">
                    {lot.lot_code}
                  </th>
                  <td data-label="উপাদান" className="text-sm font-semibold text-[#0F172A]">
                    {MATERIAL_LABELS[lot.material_type]}
                  </td>
                  <td data-label="পরিমাণ" className="font-metric text-sm font-bold text-[#14532D]">
                    {lot.estimated_kg.toFixed(1)} kg
                  </td>
                  <td data-label="হাব">
                    <div className="text-sm text-[#0F172A]">{lot.pickup_hub_bn}</div>
                    <div className="text-xs text-[#475569]">{lot.ward_name_bn}</div>
                  </td>
                  <td data-label="অবস্থা">
                    <div className="space-y-1">
                      <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                      {lot.claimed_partner_name ? (
                        <div className="text-xs text-[#475569]">{lot.claimed_partner_name}</div>
                      ) : null}
                    </div>
                  </td>
                  <td data-label="অ্যাকশন">
                    {lot.status === 'open' ? (
                      <Button
                        type="button"
                        variant="tint"
                        size="sm"
                        onClick={() => setClaimTarget(lot)}
                      >
                        <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>লট বুক করুন</span>
                      </Button>
                    ) : (
                      <span className="text-xs font-medium text-[#475569]">নির্ধারিত</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <NativeDialog
        open={Boolean(claimTarget)}
        onClose={() => setClaimTarget(null)}
        title="রিসাইক্লিং লট বুকিং নিশ্চিত করুন"
      >
        {claimTarget ? (
          <div className="space-y-4">
            <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm">
              <div className="font-metric text-xs font-semibold text-[#475569]">
                {claimTarget.lot_code} · {claimTarget.estimated_kg.toFixed(1)} kg
              </div>
              <div className="mt-0.5 font-semibold text-[#0F172A]">
                {MATERIAL_LABELS[claimTarget.material_type]} — {claimTarget.pickup_hub_bn}
              </div>
            </div>

            <FormField
              id="partner_name"
              label="প্রতিষ্ঠান বা পার্টনারের নাম"
              required
              hint="লট সংগ্রহকারী নিবন্ধিত প্রতিষ্ঠানের নাম লিখুন"
            >
              {(props) => (
                <input
                  {...props}
                  type="text"
                  required
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  className="cs-input"
                />
              )}
            </FormField>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                autoFocus
                onClick={() => setClaimTarget(null)}
              >
                বাতিল
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={claiming || partnerName.trim().length < 2}
                onClick={() => void handleConfirmClaim()}
              >
                {claiming ? 'বুক হচ্ছে...' : 'লট বুক নিশ্চিত করুন'}
              </Button>
            </div>
          </div>
        ) : null}
      </NativeDialog>
    </div>
  );
}
