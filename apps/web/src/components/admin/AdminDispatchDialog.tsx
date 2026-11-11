'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { NativeDialog } from '@/components/ui/native-dialog';
import { ApiError, assignVehicleToTask, fetchNearbyWorkers } from '@/lib/api-client';
import { VEHICLE_TYPE_LABELS } from '@/lib/savar-data';
import type { CollectorVehicleRecord } from '@/lib/types';
import { formatDistanceLabel } from '@/lib/utils';

export interface DispatchTarget {
  entityType: 'pickup' | 'dump_report';
  entityId: string;
  trackingCode: string;
  title: string;
  lat: number;
  lng: number;
}

interface AdminDispatchDialogProps {
  target: DispatchTarget | null;
  fallbackVehicles: CollectorVehicleRecord[];
  onClose: () => void;
  onDispatched: (messageBn: string) => void;
}

export function AdminDispatchDialog({
  target,
  fallbackVehicles,
  onClose,
  onDispatched,
}: AdminDispatchDialogProps) {
  const [candidates, setCandidates] = useState<CollectorVehicleRecord[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [noteBn, setNoteBn] = useState<string>('সাভার কমান্ড রুম থেকে নিকটবর্তী গাড়ি নির্ধারিত হয়েছে');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    let active = true;
    setErrorMsg(null);

    async function loadNearby() {
      setLoadingCandidates(true);
      try {
        const list = await fetchNearbyWorkers(target!.lat, target!.lng);
        if (active) {
          const usable = list.length > 0 ? list : fallbackVehicles;
          setCandidates(usable);
          setSelectedVehicleId(usable[0]?.id ?? '');
        }
      } catch {
        if (active) {
          setCandidates(fallbackVehicles);
          setSelectedVehicleId(fallbackVehicles[0]?.id ?? '');
        }
      } finally {
        if (active) setLoadingCandidates(false);
      }
    }
    void loadNearby();
    return () => {
      active = false;
    };
  }, [target, fallbackVehicles]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const res = await assignVehicleToTask({
        entity_type: target.entityType,
        entity_id: target.entityId,
        vehicle_id: selectedVehicleId || undefined,
        note_bn: noteBn.trim() || 'গাড়ি নির্ধারিত হয়েছে',
      });
      onDispatched(
        `${target.trackingCode} এর জন্য গাড়ি ${res.assigned_vehicle_code ?? ''} নির্ধারিত হয়েছে।`,
      );
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError ? err.messageBn : 'গাড়ি নির্ধারণ করা যায়নি।',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <NativeDialog
      open={Boolean(target)}
      onClose={onClose}
      title="কালেক্টর গাড়ি ডিসপ্যাচ করুন"
      description={target ? `${target.trackingCode} — ${target.title}` : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg ? (
          <div role="alert" className="rounded-md bg-[#FEF2F2] p-3 text-xs text-[#B91C1C]">
            {errorMsg}
          </div>
        ) : null}

        <FormField
          id="dispatch-vehicle-select"
          label="নিকটবর্তী সংগ্রহ গাড়ি নির্বাচন করুন"
          required
          hint="PostGIS দূরত্ব অনুযায়ী নিকটতম গাড়িগুলো প্রথমে দেখাচ্ছে"
        >
          {(a11y) =>
            loadingCandidates ? (
              <div className="h-11 animate-pulse rounded bg-[#F1F5F9]" />
            ) : (
              <select
                {...a11y}
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="cs-input"
              >
                {candidates.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.code} · {v.driver_name_bn} ({VEHICLE_TYPE_LABELS[v.vehicle_type]}) —{' '}
                    {formatDistanceLabel(v.distance_meters)}
                  </option>
                ))}
              </select>
            )
          }
        </FormField>

        <FormField id="dispatch-note" label="নির্দেশনা নোট" required>
          {(a11y) => (
            <textarea
              {...a11y}
              rows={2}
              required
              value={noteBn}
              onChange={(e) => setNoteBn(e.target.value)}
              className="cs-input min-h-20 py-2"
            />
          )}
        </FormField>

        <Button type="submit" size="lg" className="w-full" disabled={isSaving || loadingCandidates}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              নির্ধারণ হচ্ছে...
            </>
          ) : (
            <>
              <Truck className="h-4 w-4" aria-hidden="true" />
              ডিসপ্যাচ নিশ্চিত করুন
            </>
          )}
        </Button>
      </form>
    </NativeDialog>
  );
}
