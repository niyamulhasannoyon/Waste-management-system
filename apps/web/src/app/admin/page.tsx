'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Download,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { isUserApprovedAdmin, requestAdminAccess } from '@/lib/dev-store';
import { AuthGateCard } from '@/components/AuthGateCard';
import {
  AdminDispatchDialog,
  type DispatchTarget,
} from '@/components/admin/AdminDispatchDialog';
import { AdminLotsSection } from '@/components/admin/AdminLotsSection';
import { AdminOverviewStats } from '@/components/admin/AdminOverviewStats';
import { SavarWardMap } from '@/components/savar-ward-map';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCleanSavar } from '@/context/CleanSavarContext';
import {
  ApiError,
  fetchAnalyticsSummary,
  fetchPickups,
  fetchRecyclableLots,
  fetchReports,
  fetchVehicles,
  updatePickupStatus,
  updateReportStatus,
} from '@/lib/api-client';
import {
  ANALYTICS_SEED,
  PICKUP_STATUS_META,
  REPORT_STATUS_META,
  VEHICLE_STATUS_META,
  VEHICLE_TYPE_LABELS,
} from '@/lib/savar-data';
import type {
  AnalyticsSummary,
  CollectorVehicleRecord,
  DumpReportRecord,
  PickupRequestRecord,
  RecyclableLotRecord,
} from '@/lib/types';
import { RelativeTimeBn } from '@/components/ui/relative-time';
import { buildSafeCsv, toBanglaDigits } from '@/lib/utils';

type AdminTab = 'overview' | 'pickups' | 'reports' | 'vehicles' | 'lots' | 'zones';

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'overview', label: 'সার্বিক ও ম্যাপ' },
  { id: 'pickups', label: 'পিকআপ কিউ' },
  { id: 'reports', label: 'ময়লার অভিযোগ' },
  { id: 'vehicles', label: 'গাড়ি ও টিম' },
  { id: 'lots', label: 'রিসাইক্লিং লট' },
  { id: 'zones', label: 'এলাকা সূচি' },
];

function AdminCommandInner() {
  const { profile, wards, announce, refreshPublicData } = useCleanSavar();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [selectedWardId, setSelectedWardId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [summary, setSummary] = useState<AnalyticsSummary>(ANALYTICS_SEED);
  const [pickups, setPickups] = useState<PickupRequestRecord[]>([]);
  const [reports, setReports] = useState<DumpReportRecord[]>([]);
  const [vehicles, setVehicles] = useState<CollectorVehicleRecord[]>([]);
  const [lots, setLots] = useState<RecyclableLotRecord[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [dispatchTarget, setDispatchTarget] = useState<DispatchTarget | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAdminData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [sum, pList, rList, vList, lList] = await Promise.all([
        fetchAnalyticsSummary(),
        fetchPickups({ limit: 80 }),
        fetchReports({ limit: 80 }),
        fetchVehicles(),
        fetchRecyclableLots(),
      ]);
      setSummary(sum);
      setPickups(pList);
      setReports(rList);
      setVehicles(vList);
      setLots(lList);
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError ? err.messageBn : 'অ্যাডমিন ড্যাশবোর্ড ডেটা লোড করা যায়নি।',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile?.user.role === 'admin') {
      void loadAdminData();
    }
  }, [profile, loadAdminData]);

  const filteredPickups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return pickups.filter((p) => {
      if (selectedWardId && p.ward_id !== selectedWardId) return false;
      if (!q) return true;
      return (
        p.tracking_code.toLowerCase().includes(q) ||
        p.citizen_name.toLowerCase().includes(q) ||
        p.address_line.toLowerCase().includes(q)
      );
    });
  }, [pickups, selectedWardId, searchQuery]);

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reports.filter((r) => {
      if (selectedWardId && r.ward_id !== selectedWardId) return false;
      if (!q) return true;
      return (
        r.tracking_code.toLowerCase().includes(q) ||
        r.title_bn.toLowerCase().includes(q) ||
        r.landmark.toLowerCase().includes(q)
      );
    });
  }, [reports, selectedWardId, searchQuery]);

  async function handlePickupAction(id: string, status: 'collected' | 'cancelled') {
    setBusyId(id);
    try {
      await updatePickupStatus(id, {
        status,
        note_bn: status === 'collected' ? 'অ্যাডমিন যাচাইক্রমে সংগ্রহ সম্পন্ন' : 'অ্যাডমিন কর্তৃক বাতিল',
      });
      announce('পিকআপের অবস্থা হালনাগাদ হয়েছে।');
      await Promise.all([loadAdminData(), refreshPublicData()]);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.messageBn : 'অবস্থা হালনাগাদ করা যায়নি।');
    } finally {
      setBusyId(null);
    }
  }

  async function handleReportAction(
    id: string,
    status: 'verified' | 'cleared' | 'rejected',
  ) {
    setBusyId(id);
    try {
      await updateReportStatus(id, {
        status,
        note_bn:
          status === 'verified'
            ? 'পৌরসভা অপস কর্তৃক অভিযোগ যাচাই সম্পন্ন'
            : status === 'cleared'
              ? 'এলাকাটি পরিষ্কার সম্পন্ন হিসেবে অনুমোদিত'
              : 'অভিযোগটি অগ্রহণযোগ্য হিসেবে চিহ্নিত',
      });
      announce('অভিযোগের অবস্থা হালনাগাদ হয়েছে।');
      await Promise.all([loadAdminData(), refreshPublicData()]);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.messageBn : 'অবস্থা হালনাগাদ করা যায়নি।');
    } finally {
      setBusyId(null);
    }
  }

  function handleExportSafeCsv() {
    const headers = [
      'Type',
      'Tracking Code',
      'Ward',
      'Subject',
      'Landmark',
      'Status',
      'Vehicle',
      'Created At',
    ];
    const rows: (string | number | null | undefined)[][] = [
      ...filteredPickups.map((p) => [
        'Pickup',
        p.tracking_code,
        p.ward_name_bn,
        `${p.citizen_name} — ${p.address_line}`,
        p.landmark,
        p.status,
        p.assigned_vehicle_code ?? '',
        p.created_at,
      ]),
      ...filteredReports.map((r) => [
        'DumpReport',
        r.tracking_code,
        r.ward_name_bn,
        r.title_bn,
        r.landmark,
        r.status,
        r.assigned_vehicle_code ?? '',
        r.created_at,
      ]),
    ];

    const csv = buildSafeCsv(headers, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clean-savar-ops-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    announce('নিরাপদ CSV ফাইল ডাউনলোড সম্পন্ন হয়েছে।');
  }

  return (
    <div className="space-y-6">
      {/* Toolbar & Tab Bar */}
      <div className="flex flex-col gap-4 border-b border-[#E2E8F0] pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="অ্যাডমিন বিভাগসমূহ" className="flex flex-wrap gap-1.5">
            {TABS.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setTab(item.id)}
                  className={`min-h-11 rounded-md border px-3 text-xs font-semibold transition-colors ${
                    active
                      ? 'border-[#15803D] bg-[#F0FDF4] text-[#14532D]'
                      : 'border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={handleExportSafeCsv}>
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              CSV রপ্তানি
            </Button>
            <Button type="button" size="sm" variant="tint" onClick={() => void loadAdminData()}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              রিফ্রেশ
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <label htmlFor="admin-search" className="sr-only">
              কোড, নাম বা ঠিকানা খুঁজুন
            </label>
            <input
              id="admin-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ট্র্যাকিং কোড বা এলাকা খুঁজুন..."
              className="cs-input w-64 pl-9"
            />
            <Search
              className="pointer-events-none absolute top-3.5 left-3 h-4 w-4 text-[#64748B]"
              aria-hidden="true"
            />
          </div>

          <select
            aria-label="ওয়ার্ড অনুযায়ী ফিল্টার"
            value={selectedWardId ?? ''}
            onChange={(e) =>
              setSelectedWardId(e.target.value ? Number(e.target.value) : null)
            }
            className="cs-input w-60"
          >
            <option value="">সকল সাভার এলাকা</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name_bn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {statusNotice ? (
        <div className="rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-2.5 text-sm font-medium text-[#14532D]">
          {statusNotice}
        </div>
      ) : null}

      {errorMsg ? (
        <div role="alert" className="rounded-md border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#B91C1C]">
          {errorMsg}
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-4" aria-busy="true">
          <div className="grid gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="cs-card h-24 animate-pulse" />
            ))}
          </div>
          <div className="cs-card h-72 animate-pulse" />
        </div>
      ) : (
        <>
          <AdminOverviewStats summary={summary} />

          {tab === 'overview' ? (
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <SavarWardMap
                  wards={wards}
                  pickups={filteredPickups}
                  reports={filteredReports}
                  vehicles={vehicles}
                  selectedWardId={selectedWardId}
                  onSelectWard={setSelectedWardId}
                />
              </div>

              <section className="cs-card space-y-3 p-5 lg:col-span-5">
                <h2 className="text-base font-bold text-[#0F172A]">
                  অগ্রাধিকার হটস্পট ও দ্রুত ডিসপ্যাচ
                </h2>
                {filteredReports.filter((r) => r.status !== 'cleared' && r.status !== 'rejected').length === 0 ? (
                  <p className="rounded-md bg-[#F8FAFC] p-6 text-center text-xs text-[#475569]">
                    নির্বাচিত এলাকায় কোনো অমীমাংসিত হটস্পট নেই।
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {filteredReports
                      .filter((r) => r.status !== 'cleared' && r.status !== 'rejected')
                      .slice(0, 5)
                      .map((r) => (
                        <li
                          key={r.id}
                          className="space-y-2 rounded-md border border-[#E2E8F0] p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-metric text-xs font-bold text-[#15803D]">
                                {r.tracking_code}
                              </span>
                              <p className="text-sm font-semibold text-[#0F172A]">{r.title_bn}</p>
                              <p className="text-xs text-[#475569]">{r.ward_name_bn}</p>
                            </div>
                            <StatusBadge tone={REPORT_STATUS_META[r.status].tone}>
                              {REPORT_STATUS_META[r.status].label}
                            </StatusBadge>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {r.status === 'reported' ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                disabled={busyId === r.id}
                                onClick={() => void handleReportAction(r.id, 'verified')}
                              >
                                যাচাই করুন
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                setDispatchTarget({
                                  entityType: 'dump_report',
                                  entityId: r.id,
                                  trackingCode: r.tracking_code,
                                  title: r.title_bn,
                                  lat: r.lat,
                                  lng: r.lng,
                                })
                              }
                            >
                              <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                              গাড়ি দিন
                            </Button>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </section>
            </div>
          ) : null}

          {tab === 'pickups' ? (
            <section className="cs-card overflow-hidden">
              <div className="border-b border-[#E2E8F0] px-5 py-3.5">
                <h2 className="text-base font-bold text-[#0F172A]">
                  পিকআপ অনুরোধ ({toBanglaDigits(filteredPickups.length)})
                </h2>
              </div>
              {filteredPickups.length === 0 ? (
                <p className="p-8 text-center text-sm text-[#475569]">কোনো পিকআপ অনুরোধ পাওয়া যায়নি।</p>
              ) : (
                <div className="cs-table-wrapper">
                  <table className="cs-table">
                    <caption className="sr-only">পিকআপ অনুরোধ ব্যবস্থাপনা</caption>
                    <thead>
                      <tr>
                        <th scope="col">কোড</th>
                        <th scope="col">নাগরিক ও ঠিকানা</th>
                        <th scope="col">এলাকা</th>
                        <th scope="col">অবস্থা</th>
                        <th scope="col">পদক্ষেপ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPickups.map((p) => {
                        const meta = PICKUP_STATUS_META[p.status];
                        return (
                          <tr key={p.id}>
                            <td data-label="কোড">
                              <span className="font-metric font-bold">{p.tracking_code}</span>
                              <span className="block text-[11px] text-[#475569]">
                                <RelativeTimeBn isoDate={p.created_at} />
                              </span>
                            </td>
                            <td data-label="নাগরিক ও ঠিকানা">
                              <span className="font-semibold">{p.citizen_name}</span>
                              <span className="block text-xs text-[#475569]">{p.address_line}</span>
                            </td>
                            <td data-label="এলাকা">{p.ward_name_bn}</td>
                            <td data-label="অবস্থা">
                              <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                              {p.assigned_vehicle_code ? (
                                <span className="mt-1 block font-metric text-xs text-[#14532D]">
                                  {p.assigned_vehicle_code}
                                </span>
                              ) : null}
                            </td>
                            <td data-label="পদক্ষেপ">
                              <div className="flex flex-wrap gap-1.5">
                                {['pending', 'assigned', 'in_progress'].includes(p.status) ? (
                                  <>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="tint"
                                      onClick={() =>
                                        setDispatchTarget({
                                          entityType: 'pickup',
                                          entityId: p.id,
                                          trackingCode: p.tracking_code,
                                          title: p.address_line,
                                          lat: p.lat,
                                          lng: p.lng,
                                        })
                                      }
                                    >
                                      গাড়ি নির্ধারণ
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={busyId === p.id}
                                      onClick={() => void handlePickupAction(p.id, 'collected')}
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                      সংগৃহীত
                                    </Button>
                                  </>
                                ) : (
                                  <span className="text-xs text-[#475569]">নিষ্পন্ন</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}

          {tab === 'reports' ? (
            <section className="cs-card overflow-hidden">
              <div className="border-b border-[#E2E8F0] px-5 py-3.5">
                <h2 className="text-base font-bold text-[#0F172A]">
                  ময়লার স্তূপ অভিযোগ ({toBanglaDigits(filteredReports.length)})
                </h2>
              </div>
              {filteredReports.length === 0 ? (
                <p className="p-8 text-center text-sm text-[#475569]">কোনো অভিযোগ পাওয়া যায়নি।</p>
              ) : (
                <div className="cs-table-wrapper">
                  <table className="cs-table">
                    <caption className="sr-only">ময়লার অভিযোগ তালিকা</caption>
                    <thead>
                      <tr>
                        <th scope="col">কোড</th>
                        <th scope="col">অভিযোগ ও স্থান</th>
                        <th scope="col">ওয়ার্ড</th>
                        <th scope="col">অবস্থা</th>
                        <th scope="col">পদক্ষেপ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReports.map((r) => {
                        const meta = REPORT_STATUS_META[r.status];
                        return (
                          <tr key={r.id}>
                            <td data-label="কোড">
                              <span className="font-metric font-bold">{r.tracking_code}</span>
                              <span className="block text-[11px] text-[#475569]">
                                <RelativeTimeBn isoDate={r.created_at} />
                              </span>
                            </td>
                            <td data-label="অভিযোগ ও স্থান">
                              <span className="font-semibold">{r.title_bn}</span>
                              <span className="block text-xs text-[#475569]">{r.landmark}</span>
                            </td>
                            <td data-label="ওয়ার্ড">{r.ward_name_bn}</td>
                            <td data-label="অবস্থা">
                              <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                            </td>
                            <td data-label="পদক্ষেপ">
                              <div className="flex flex-wrap gap-1.5">
                                {r.status === 'reported' ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    disabled={busyId === r.id}
                                    onClick={() => void handleReportAction(r.id, 'verified')}
                                  >
                                    যাচাই
                                  </Button>
                                ) : null}
                                {['reported', 'verified', 'dispatched'].includes(r.status) ? (
                                  <>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="tint"
                                      onClick={() =>
                                        setDispatchTarget({
                                          entityType: 'dump_report',
                                          entityId: r.id,
                                          trackingCode: r.tracking_code,
                                          title: r.title_bn,
                                          lat: r.lat,
                                          lng: r.lng,
                                        })
                                      }
                                    >
                                      ডিসপ্যাচ
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={busyId === r.id}
                                      onClick={() => void handleReportAction(r.id, 'cleared')}
                                    >
                                      পরিষ্কার সম্পন্ন
                                    </Button>
                                  </>
                                ) : (
                                  <span className="text-xs text-[#475569]">নিষ্পন্ন</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}

          {tab === 'vehicles' ? (
            <section className="cs-card overflow-hidden">
              <div className="border-b border-[#E2E8F0] px-5 py-3.5">
                <h2 className="text-base font-bold text-[#0F172A]">
                  সক্রিয় গাড়ি ও চালক ({toBanglaDigits(vehicles.length)})
                </h2>
              </div>
              <div className="cs-table-wrapper">
                <table className="cs-table">
                  <caption className="sr-only">সংগ্রহ গাড়ির তালিকা</caption>
                  <thead>
                    <tr>
                      <th scope="col">গাড়ি কোড</th>
                      <th scope="col">চালক</th>
                      <th scope="col">এলাকা</th>
                      <th scope="col">অবস্থা</th>
                      <th scope="col">শেষ পিং</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map((v) => {
                      const meta = VEHICLE_STATUS_META[v.status];
                      return (
                        <tr key={v.id}>
                          <td data-label="গাড়ি কোড">
                            <span className="font-metric font-bold">{v.code}</span>
                            <span className="block text-xs text-[#475569]">
                              {VEHICLE_TYPE_LABELS[v.vehicle_type]}
                            </span>
                          </td>
                          <td data-label="চালক">
                            <span className="font-semibold">{v.driver_name_bn}</span>
                            <span className="block font-metric text-xs text-[#475569]">
                              {v.driver_phone}
                            </span>
                          </td>
                          <td data-label="এলাকা">{v.ward_name_bn}</td>
                          <td data-label="অবস্থা">
                            <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                          </td>
                          <td data-label="শেষ পিং">
                            <RelativeTimeBn isoDate={v.last_ping_at} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {tab === 'lots' ? (
            <AdminLotsSection
              lots={lots}
              wards={wards}
              onCreated={(created) => {
                setLots((prev) => [created, ...prev]);
                setStatusNotice(`নতুন লট ${created.lot_code} তৈরি হয়েছে।`);
                void refreshPublicData();
              }}
            />
          ) : null}

          {tab === 'zones' ? (
            <section className="cs-card overflow-hidden">
              <div className="border-b border-[#E2E8F0] px-5 py-3.5">
                <h2 className="text-base font-bold text-[#0F172A]">
                  সাভার ওয়ার্ড ও ইউনিয়ন ডিরেক্টরি ({toBanglaDigits(wards.length)}টি)
                </h2>
              </div>
              <div className="cs-table-wrapper">
                <table className="cs-table">
                  <caption className="sr-only">সাভার এলাকা ও সুপারভাইজার তথ্য</caption>
                  <thead>
                    <tr>
                      <th scope="col">কোড</th>
                      <th scope="col">এলাকার নাম</th>
                      <th scope="col">সংগ্রহ সময়সূচি</th>
                      <th scope="col">সুপারভাইজার</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wards.map((w) => (
                      <tr key={w.id}>
                        <td data-label="কোড" className="font-metric font-bold">
                          {w.code}
                        </td>
                        <td data-label="এলাকার নাম">
                          <span className="font-semibold">{w.name_bn}</span>
                          <span className="block text-xs text-[#475569]">
                            {w.neighborhoods.join(' · ')}
                          </span>
                        </td>
                        <td data-label="সংগ্রহ সময়সূচি">
                          <span>{w.schedule_bn}</span>
                          <span className="block text-xs text-[#475569]">{w.frequency_bn}</span>
                        </td>
                        <td data-label="সুপারভাইজার">
                          <span>{w.supervisor_name}</span>
                          <span className="block font-metric text-xs text-[#475569]">
                            {w.supervisor_phone}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      )}

      <AdminDispatchDialog
        target={dispatchTarget}
        fallbackVehicles={vehicles}
        onClose={() => setDispatchTarget(null)}
        onDispatched={(msg) => {
          setStatusNotice(msg);
          announce(msg);
          void Promise.all([loadAdminData(), refreshPublicData()]);
        }}
      />
    </div>
  );
}

function AdminApprovalGate({ children }: { children: React.ReactNode }) {
  const { profile, logout } = useCleanSavar();
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    if (!profile?.user) {
      setIsApproved(false);
      setChecked(true);
      return;
    }
    const approved = isUserApprovedAdmin(profile.user.phone);
    setIsApproved(approved);
    setChecked(true);

    if (!approved) {
      // Automatically register pending access request for the developer admin to see & approve
      requestAdminAccess(profile.user.phone, profile.user.full_name);
    }

    const handleApprovalsChanged = () => {
      if (profile?.user?.phone) {
        setIsApproved(isUserApprovedAdmin(profile.user.phone));
      }
    };
    window.addEventListener('cs:admin-approvals-changed', handleApprovalsChanged);
    return () => {
      window.removeEventListener('cs:admin-approvals-changed', handleApprovalsChanged);
    };
  }, [profile, refreshKey]);

  if (!checked) {
    return (
      <div className="cs-card p-6 sm:p-8">
        <div className="h-5 w-48 animate-pulse rounded bg-[#E2E8F0]" />
        <div className="mt-3 h-4 w-72 animate-pulse rounded bg-[#F1F5F9]" />
      </div>
    );
  }

  if (!isApproved && profile?.user) {
    return (
      <section className="cs-card border-amber-300 bg-amber-50/50 p-6 sm:p-8">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-700" aria-hidden="true" />
            <StatusBadge tone="warning">অনুমোদনের অপেক্ষায়</StatusBadge>
            <span className="text-xs font-semibold text-amber-900">
              Developer SuperAdmin Approval Required
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[#0F172A]">
              পৌর বা ব্যবস্থাপনা অ্যাডমিন অনুমোদনের প্রয়োজন
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-[#475569]">
              সাভার পৌরসভা অপারেশনস ও ডিসপ্যাচ কমান্ড প্যানেলে প্রবেশের জন্য প্রধান ডেভেলপার অ্যাডমিন প্যানেল অথবা মূল ব্যবস্থাপনা প্রধানের অনুমোদনের প্রয়োজন। আপনার অ্যাকাউন্টের অনুমোদন অনুরোধটি সিস্টেমে নথিবদ্ধ রয়েছে।
            </p>
          </div>

          <div className="rounded-lg border border-amber-200 bg-white p-4 text-xs space-y-2 max-w-lg">
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-500">আপনার নাম:</span>
              <span className="font-semibold text-slate-900">{profile.user.full_name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-500">নিবন্ধিত মোবাইল:</span>
              <span className="font-metric font-semibold text-slate-900">{profile.user.phone}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-500">আবেদনের স্ট্যাটাস:</span>
              <span className="font-semibold text-amber-700">বিবেচনাধীন (Pending Approval)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">অনুমোদন কর্তৃপক্ষ:</span>
              <span className="font-mono text-slate-700">niyamulhasanbd@gmail.com</span>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            ডেভেলপার অ্যাডমিন কনসোল (<Link href="/dev-admin" className="text-emerald-700 underline font-medium">/dev-admin</Link>) থেকে আপনার অ্যাকাউন্ট অনুমোদন করা মাত্রই এই ড্যাশবোর্ড সরাসরি উন্মুক্ত হবে।
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              variant="primary"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              অনুমোদনের স্ট্যাটাস রিফ্রেশ করুন
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void logout()}
            >
              লগআউট / অন্য অ্যাকাউন্ট
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 border-b border-[#E2E8F0] pb-5">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D]">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          সাভার পৌরসভা অপারেশনস কমান্ড
        </div>
        <h1 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">
          পৌর অ্যাডমিন ও ডিসপ্যাচ ড্যাশবোর্ড
        </h1>
        <p className="max-w-2xl text-sm text-[#475569]">
          PostGIS ম্যাপ, রিয়েল-টাইম সংগ্রহ অনুরোধ, হটস্পট যাচাই, গাড়ি ডিসপ্যাচ ও নিরাপদ CSV রিপোর্ট।
        </p>
      </div>

      <AuthGateCard
        titleBn="পৌর অ্যাডমিন অ্যাকাউন্ট দিয়ে লগইন করুন"
        descriptionBn="অপারেশনস কমান্ড ড্যাশবোর্ড দেখতে অনুমোদিত পৌর অ্যাডমিন মোবাইল নম্বর বা Google অ্যাকাউন্ট দিয়ে সাইন-ইন করুন।"
        allowedRoles={['admin']}
      >
        <AdminApprovalGate>
          <AdminCommandInner />
        </AdminApprovalGate>
      </AuthGateCard>
    </div>
  );
}
