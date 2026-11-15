'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, PlusCircle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { NativeDialog } from '@/components/ui/native-dialog';
import {
  ApiError,
  createCollectorVehicle,
  updateCollectorVehicle,
} from '@/lib/api-client';
import { SAVAR_WARDS_SEED } from '@/lib/savar-data';
import type {
  CollectorVehicleRecord,
  VehicleStatus,
  VehicleType,
  WardSummary,
} from '@/lib/types';
import { normalizeBdPhone } from '@/lib/utils';

interface AdminCollectorManagementModalProps {
  open: boolean;
  editingVehicle?: CollectorVehicleRecord | null;
  wards?: WardSummary[];
  onClose: () => void;
  onSaved: (saved: CollectorVehicleRecord, isNew: boolean) => void;
}

export function AdminCollectorManagementModal({
  open,
  editingVehicle,
  wards = SAVAR_WARDS_SEED,
  onClose,
  onSaved,
}: AdminCollectorManagementModalProps) {
  const isEditing = Boolean(editingVehicle);

  const [code, setCode] = useState<string>('');
  const [driverNameBn, setDriverNameBn] = useState<string>('');
  const [driverPhone, setDriverPhone] = useState<string>('');
  const [wardId, setWardId] = useState<number>(1);
  const [vehicleType, setVehicleType] = useState<VehicleType>('rickshaw_van');
  const [status, setStatus] = useState<VehicleStatus>('available');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (editingVehicle) {
      setCode(editingVehicle.code);
      setDriverNameBn(editingVehicle.driver_name_bn);
      setDriverPhone(editingVehicle.driver_phone);
      setWardId(editingVehicle.ward_id);
      setVehicleType(editingVehicle.vehicle_type);
      setStatus(editingVehicle.status === 'active' ? 'available' : editingVehicle.status);
    } else {
      setCode('');
      setDriverNameBn('');
      setDriverPhone('');
      setWardId(1);
      setVehicleType('rickshaw_van');
      setStatus('available');
    }
    setErrorMsg(null);
  }, [editingVehicle, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCode = code.trim().toUpperCase();
    const cleanName = driverNameBn.trim();
    const cleanPhone = normalizeBdPhone(driverPhone) ?? driverPhone.trim();

    if (!cleanCode) {
      setErrorMsg('গাড়ির কোড দিন (যেমন: SV-VAN-05, SV-TRK-03)।');
      return;
    }
    if (!cleanName) {
      setErrorMsg('কালেক্টরের নাম লিখুন।');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 11) {
      setErrorMsg('সঠিক ১১ ডিজিটের মোবাইল নম্বর প্রদান করুন (যেমন: 01712-345678)।');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && editingVehicle) {
        const updated = await updateCollectorVehicle(editingVehicle.id, {
          code: cleanCode,
          driver_name_bn: cleanName,
          driver_phone: cleanPhone,
          ward_id: wardId,
          vehicle_type: vehicleType,
          status,
        });
        onSaved(updated, false);
      } else {
        const created = await createCollectorVehicle({
          code: cleanCode,
          driver_name_bn: cleanName,
          driver_phone: cleanPhone,
          ward_id: wardId,
          vehicle_type: vehicleType,
          status,
        });
        onSaved(created, true);
      }
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError
          ? err.messageBn
          : 'কালেক্টর ও গাড়ি তথ্য সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title={isEditing ? 'ওয়ার্ড কালেক্টর ও গাড়ি সম্পাদনা' : 'নতুন ওয়ার্ড কালেক্টর ও গাড়ি যোগ করুন'}
      description="সাভার পৌরসভা ও ইউনিয়নের বর্জ্য সংগ্রহে নিয়োজিত কালেক্টর, মোবাইল নম্বর ও গাড়ির বিস্তারিত নির্ধারণ করুন।"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg ? (
          <div role="alert" className="rounded-md bg-[#FEF2F2] p-3 text-xs text-[#B91C1C]">
            {errorMsg}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            id="collector-code"
            label="গাড়ির কোড / ট্র্যাকিং আইডি"
            required
            hint="যেমন: SV-VAN-05, SV-DMP-01"
          >
            {(a11y) => (
              <input
                {...a11y}
                type="text"
                required
                placeholder="SV-VAN-05"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="cs-input font-metric uppercase"
              />
            )}
          </FormField>

          <FormField
            id="collector-type"
            label="গাড়ির ধরন"
            required
          >
            {(a11y) => (
              <select
                {...a11y}
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                className="cs-input"
              >
                <option value="rickshaw_van">রিকশা ভ্যান</option>
                <option value="cng_dumper">সিএনজি ডাম্পার</option>
                <option value="mini_truck">মিনি ট্রাক</option>
                <option value="compactor">কম্প্যাক্টর ট্রাক</option>
                <option value="other">অন্যান্য পরিচ্ছন্নতা গাড়ি</option>
              </select>
            )}
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            id="collector-name"
            label="কালেক্টরের নাম"
            required
            hint="কালেক্টর বা চালকের পূর্ণ নাম"
          >
            {(a11y) => (
              <input
                {...a11y}
                type="text"
                required
                placeholder="যেমন: মো. রফিকুল ইসলাম"
                value={driverNameBn}
                onChange={(e) => setDriverNameBn(e.target.value)}
                className="cs-input"
              />
            )}
          </FormField>

          <FormField
            id="collector-phone"
            label="মোবাইল নম্বর"
            required
            hint="যোগাযোগের সচল নম্বর"
          >
            {(a11y) => (
              <input
                {...a11y}
                type="tel"
                required
                placeholder="01712-345678"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                className="cs-input font-metric"
              />
            )}
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            id="collector-ward"
            label="নির্ধারিত ওয়ার্ড / ইউনিয়ন"
            required
            hint="যে এলাকায় এই গাড়ি দায়িত্ব পালন করবে"
          >
            {(a11y) => (
              <select
                {...a11y}
                value={wardId}
                onChange={(e) => setWardId(Number(e.target.value))}
                className="cs-input"
              >
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name_bn}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <FormField
            id="collector-status"
            label="বর্তমান অবস্থা (Status)"
            required
          >
            {(a11y) => (
              <select
                {...a11y}
                value={status}
                onChange={(e) => setStatus(e.target.value as VehicleStatus)}
                className="cs-input"
              >
                <option value="available">সক্রিয় / প্রস্তুত (Active/Available)</option>
                <option value="en_route">পথে রয়েছে (En Route)</option>
                <option value="busy">কাজে ব্যস্ত (Busy)</option>
                <option value="offline">অফলাইন / বিরতিতে (Offline)</option>
              </select>
            )}
          </FormField>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            size="lg"
            className="w-full gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                সংরক্ষণ হচ্ছে...
              </>
            ) : isEditing ? (
              <>
                <Save className="h-4 w-4" aria-hidden="true" />
                কালেক্টর তথ্য হালনাগাদ করুন
              </>
            ) : (
              <>
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                কালেক্টর ও গাড়ি যোগ নিশ্চিত করুন
              </>
            )}
          </Button>
        </div>
      </form>
    </NativeDialog>
  );
}
