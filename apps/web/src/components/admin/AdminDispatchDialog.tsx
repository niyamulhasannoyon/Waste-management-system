'use client';

import React, { useEffect, useState } from 'react';
import { Camera, ExternalLink, Loader2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { NativeDialog } from '@/components/ui/native-dialog';
import {
  ApiError,
  assignVehicleToTask,
  fetchNearbyWorkers,
  fetchVehicles,
} from '@/lib/api-client';
import {
  appendDevCitizenResponse,
  updateDevCitizenRequestStatus,
} from '@/lib/dev-store';
import { VEHICLE_TYPE_LABELS } from '@/lib/savar-data';
import type { CollectorVehicleRecord } from '@/lib/types';
import { formatDistanceLabel, resolveAllMediaUrls, toBanglaDigits } from '@/lib/utils';

export interface DispatchTarget {
  entityType: 'pickup' | 'dump_report';
  entityId: string;
  trackingCode: string;
  title: string;
  lat: number;
  lng: number;
  photoUrls?: string[];
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
        const [nearbyList, allVehicles] = await Promise.all([
          fetchNearbyWorkers(target!.lat, target!.lng).catch(() => []),
          fetchVehicles().catch(() => fallbackVehicles),
        ]);
        if (active) {
          // Combine nearby workers and all active database vehicles
          const combinedMap = new Map<string, CollectorVehicleRecord>();
          for (const v of nearbyList) {
            combinedMap.set(v.id, v);
          }
          for (const v of allVehicles) {
            if (!combinedMap.has(v.id)) {
              combinedMap.set(v.id, v);
            }
          }
          for (const v of fallbackVehicles) {
            if (!combinedMap.has(v.id)) {
              combinedMap.set(v.id, v);
            }
          }
          const usable = Array.from(combinedMap.values()).sort((a, b) => {
            const aAvail = a.status === 'available' || a.status === 'active' ? 0 : 1;
            const bAvail = b.status === 'available' || b.status === 'active' ? 0 : 1;
            if (aAvail !== bAvail) return aAvail - bAvail;
            return (a.distance_meters ?? 999999) - (b.distance_meters ?? 999999);
          });
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
        tracking_code: target.trackingCode,
        vehicle_id: selectedVehicleId || undefined,
        note_bn: noteBn.trim() || 'গাড়ি নির্ধারিত হয়েছে',
      });

      // Synchronize local dev-store immediately
      try {
        updateDevCitizenRequestStatus(
          target.trackingCode,
          target.entityType === 'pickup' ? 'assigned' : 'dispatched',
        );
        appendDevCitizenResponse(target.trackingCode, {
          senderName: 'সাভার পৌর ডিসপ্যাচ ও কন্ট্রোল',
          senderRole: 'admin',
          message: noteBn.trim() || 'গাড়ি নির্ধারিত হয়েছে',
        });
      } catch {
        // Safe fallback
      }

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

        {target?.photoUrls && target.photoUrls.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2.5 space-y-1.5">
            <span className="flex items-center gap-1 text-xs font-bold text-amber-900">
              <Camera className="h-3.5 w-3.5 text-amber-700" />
              অভিযোগের সাথে সংযুক্ত ময়লার ছবি ({toBanglaDigits(target.photoUrls.length)}টি):
            </span>
            <div className="flex flex-wrap gap-2">
              {resolveAllMediaUrls(target.photoUrls).map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative h-16 w-20 overflow-hidden rounded-md border border-amber-300 hover:border-emerald-600 transition-all shadow-xs"
                  title="ছবি বড় করে দেখুন (নতুন ট্যাবে খুলবে)"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`ময়লার ছবি ${i + 1}`} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 flex items-center justify-center transition-colors">
                    <ExternalLink className="h-3.5 w-3.5 text-white opacity-0 group-hover:opacity-100 drop-shadow" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        ) : null}

        <FormField
          id="dispatch-vehicle-select"
          label="নিকটবর্তী সংগ্রহ গাড়ি নির্বাচন করুন"
          required
          hint="ওয়ার্ড ও দূরত্ব অনুযায়ী নিকটতম গাড়িগুলো প্রথমে দেখাচ্ছে"
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
