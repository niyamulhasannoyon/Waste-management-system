'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { NativeDialog } from '@/components/ui/native-dialog';
import {
  fetchAdminUsers,
  saveAdminUser,
  revokeAdminUser,
  type DbUserRecord,
} from '@/lib/api-client';
import {
  getApprovedAdminRecords,
  approveAdminUser,
  revokeAdminUser as revokeDevAdmin,
  type ApprovedAdminRecord,
} from '@/lib/dev-store';
import { SAVAR_WARDS_SEED } from '@/lib/savar-data';
import type { WardSummary } from '@/lib/types';
import { normalizeBdPhone, toBanglaDigits } from '@/lib/utils';

interface AdminPouroAdminSectionProps {
  wards?: WardSummary[];
  currentAdminPhone?: string;
  onNotice?: (msg: string) => void;
}

export function AdminPouroAdminSection({
  wards = SAVAR_WARDS_SEED,
  currentAdminPhone,
  onNotice,
}: AdminPouroAdminSectionProps) {
  const [dbAdmins, setDbAdmins] = useState<DbUserRecord[]>([]);
  const [localApprovals, setLocalApprovals] = useState<ApprovedAdminRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Form states
  const [newPhone, setNewPhone] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newWardId, setNewWardId] = useState<number | ''>('');
  const [newNote, setNewNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadAllAdmins = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch remote PostgreSQL users with role 'admin'
      const remote = await fetchAdminUsers('admin');
      setDbAdmins(remote);

      // 2. Fetch local dev-store approvals
      const local = getApprovedAdminRecords();
      setLocalApprovals(local);
    } catch (err) {
      console.warn('Admin load note:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAllAdmins();
  }, [loadAllAdmins]);

  // Merge database admins and local approval records cleanly
  const mergedAdmins = useMemo(() => {
    const map = new Map<string, {
      id: string;
      phone: string;
      fullName: string;
      email?: string | null;
      wardId?: number | null;
      status: 'approved' | 'pending' | 'revoked';
      source: 'database' | 'local_store';
      createdAt?: string;
    }>();

    // Add local records first
    for (const rec of localApprovals) {
      const key = rec.phone.replace(/\D/g, '');
      map.set(key, {
        id: rec.id,
        phone: rec.phone,
        fullName: rec.fullName,
        email: rec.email,
        status: rec.status,
        source: 'local_store',
        createdAt: rec.approvedAt || rec.requestedAt,
      });
    }

    // Overlay database records (authoritative)
    for (const u of dbAdmins) {
      const key = u.phone.replace(/\D/g, '');
      const existing = map.get(key);
      map.set(key, {
        id: u.id,
        phone: u.phone,
        fullName: u.full_name || existing?.fullName || 'পৌর অ্যাডমিন',
        email: u.email || existing?.email,
        wardId: u.ward_id,
        status: 'approved',
        source: 'database',
        createdAt: u.created_at,
      });
    }

    return Array.from(map.values());
  }, [dbAdmins, localApprovals]);

  const filteredAdmins = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mergedAdmins;
    return mergedAdmins.filter(
      (a) =>
        a.fullName.toLowerCase().includes(q) ||
        a.phone.includes(q) ||
        (a.email && a.email.toLowerCase().includes(q)),
    );
  }, [mergedAdmins, searchQuery]);

  const pendingRequests = useMemo(() => {
    return mergedAdmins.filter((a) => a.status === 'pending');
  }, [mergedAdmins]);

  const activeAdmins = useMemo(() => {
    return filteredAdmins.filter((a) => a.status === 'approved');
  }, [filteredAdmins]);

  const handleApprovePending = async (item: { phone: string; fullName: string; email?: string | null }) => {
    try {
      // Save permanently to PostgreSQL users table
      await saveAdminUser({
        phone: item.phone,
        full_name: item.fullName,
        email: item.email || undefined,
        role: 'admin',
      });

      // Also sync dev-store
      approveAdminUser(item.phone, item.fullName, item.email || undefined);

      onNotice?.(`পৌর অ্যাডমিন [${item.fullName}] সফলভাবে অনুমোদিত হয়েছে।`);
      await loadAllAdmins();
    } catch {
      onNotice?.('অনুমোদন সংরক্ষণ করা যায়নি।');
    }
  };

  const handleRevoke = async (item: { id: string; phone: string; fullName: string }) => {
    if (confirm(`আপনি কি নিশ্চিত যে [${item.fullName}]-এর পৌর অ্যাডমিন অ্যাক্সেস প্রত্যাহার করতে চান?`)) {
      try {
        await revokeAdminUser({ id: item.id, phone: item.phone });
        revokeDevAdmin(item.phone);
        onNotice?.(`[${item.fullName}]-এর পৌর অ্যাডমিন অ্যাক্সেস প্রত্যাহার করা হয়েছে।`);
        await loadAllAdmins();
      } catch {
        onNotice?.('অ্যাক্সেস প্রত্যাহার ব্যর্থ হয়েছে।');
      }
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = newName.trim();
    const cleanPhone = normalizeBdPhone(newPhone) ?? newPhone.trim();
    const cleanEmail = newEmail.trim() || undefined;

    if (!cleanName) {
      setFormError('পৌর অ্যাডমিনের পূর্ণ নাম লিখুন।');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 11) {
      setFormError('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01712-345678)।');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Persist permanently to PostgreSQL users table
      await saveAdminUser({
        phone: cleanPhone,
        full_name: cleanName,
        email: cleanEmail,
        role: 'admin',
        ward_id: newWardId !== '' ? Number(newWardId) : null,
      });

      // 2. Also register in local dev-store approvals for instant offline resilience
      approveAdminUser(cleanPhone, cleanName, cleanEmail, 'সাভার পৌর প্রশাসন');

      onNotice?.(`নতুন পৌর অ্যাডমিন [${cleanName}] সফলভাবে যুক্ত হয়েছে এবং ডেটাবেজে সংরক্ষিত হয়েছে।`);
      setIsAddModalOpen(false);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewWardId('');
      setNewNote('');
      await loadAllAdmins();
    } catch (err: unknown) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'অ্যাডমিন সংরক্ষণ করা যায়নি। সার্ভার কানেকশন চেক করুন।',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <section className="cs-card p-5 border-l-4 border-l-emerald-600 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
              <KeyRound className="h-4 w-4" />
              পৌর অ্যাডমিন রোল ও অ্যাক্সেস ডিরেক্টরি
            </div>
            <h2 className="text-lg font-bold text-[#0F172A]">
              সাভার পৌরসভা অ্যাডমিন ও স্টাফ অ্যাক্সেস নিয়ন্ত্রণ
            </h2>
            <p className="text-xs text-[#475569] max-w-2xl">
              পৌর অ্যাডমিনদের তালিকা, নতুন অ্যাডমিন নিয়োগ, এবং অনুমতি প্রদান। এই প্যানেল থেকে যেকোনো অ্যাডমিন যোগ করলে তা সরাসরি সার্ভার ডেটাবেজে স্থায়ীভাবে সংরক্ষিত হয়।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setFormError(null);
                setIsAddModalOpen(true);
              }}
              className="gap-1.5 shadow-sm bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              <UserPlus className="h-4 w-4" />
              + নতুন পৌর অ্যাডমিন নিয়োগ করুন
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void loadAllAdmins()}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              রিফ্রেশ
            </Button>
          </div>
        </div>

        {/* Quick KPI stats */}
        <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="text-[11px] font-semibold text-slate-500">মোট পৌর অ্যাডমিন</span>
            <p className="font-metric text-xl font-bold text-slate-900 mt-0.5">
              {toBanglaDigits(activeAdmins.length)}
            </p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
            <span className="text-[11px] font-semibold text-emerald-800">সক্রিয় ডেটাবেজ অ্যাকাউন্ট</span>
            <p className="font-metric text-xl font-bold text-emerald-700 mt-0.5">
              {toBanglaDigits(dbAdmins.length)}
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
            <span className="text-[11px] font-semibold text-amber-800">অনুমোদনের অপেক্ষমাণ</span>
            <p className="font-metric text-xl font-bold text-amber-700 mt-0.5">
              {toBanglaDigits(pendingRequests.length)}
            </p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3">
            <span className="text-[11px] font-semibold text-blue-800">তথ্য সংরক্ষণ মোড</span>
            <p className="text-xs font-bold text-blue-900 mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
              PostgreSQL স্থায়ী ক্লাউড
            </p>
          </div>
        </div>
      </section>

      {/* Pending Access Requests Banner (if any) */}
      {pendingRequests.length > 0 ? (
        <section className="cs-card border-amber-300 bg-amber-50/50 p-4 space-y-3 animate-fadeIn">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <ShieldAlert className="h-4 w-4 text-amber-700" />
            অনুমোদনের অপেক্ষায় থাকা অ্যাডমিন রিকোয়েস্ট ({toBanglaDigits(pendingRequests.length)}টি)
          </div>
          <div className="divide-y divide-amber-200 border rounded-lg border-amber-200 bg-white">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="p-3.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0F172A] text-sm">{req.fullName}</span>
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      অপেক্ষমাণ
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-[#475569]">
                    <span className="font-metric font-semibold text-emerald-800">{req.phone}</span>
                    {req.email ? <span>{req.email}</span> : null}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={() => void handleApprovePending(req)}
                    className="gap-1 bg-emerald-700 hover:bg-emerald-800 text-white"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    পৌর অ্যাডমিন অনুমোদন দিন
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Active Admins Directory Table */}
      <section className="cs-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[#E2E8F0] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">
              অনুমোদিত পৌর অ্যাডমিন তালিকা ({toBanglaDigits(activeAdmins.length)} জন)
            </h3>
            <p className="text-xs text-[#475569] mt-0.5">
              সাভার পৌরসভার সেন্ট্রাল কমান্ড, হটস্পট ভেরিফিকেশন ও ডিসপ্যাচ অ্যাক্সেসপ্রাপ্ত কর্মকর্তাগণ
            </p>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-[#64748B]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="নাম, ফোন বা ইমেইল খুঁজুন..."
              className="cs-input w-64 pl-9 text-xs"
            />
          </div>
        </div>

        {activeAdmins.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#64748B]">
            কোনো পৌর অ্যাডমিন পাওয়া যায়নি। নতুন অ্যাডমিন যোগ করতে উপরের বাটনে ক্লিক করুন।
          </div>
        ) : (
          <div className="cs-table-wrapper">
            <table className="cs-table">
              <caption className="sr-only">অনুমোদিত পৌর অ্যাডমিন তালিকা</caption>
              <thead>
                <tr>
                  <th scope="col">অ্যাডমিনের নাম ও পদবী</th>
                  <th scope="col">যোগাযোগ (মোবাইল ও ইমেইল)</th>
                  <th scope="col">দায়িত্বপ্রাপ্ত এলাকা / ওয়ার্ড</th>
                  <th scope="col">সংরক্ষণ স্ট্যাটাস</th>
                  <th scope="col">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody>
                {activeAdmins.map((admin) => {
                  const ward = wards.find((w) => w.id === admin.wardId);
                  const isCurrent = currentAdminPhone && admin.phone.includes(currentAdminPhone);
                  return (
                    <tr key={admin.id}>
                      <td data-label="অ্যাডমিনের নাম">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                            <Shield className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-bold text-[#0F172A] block">{admin.fullName}</span>
                            <span className="text-[11px] text-[#64748B]">পৌর অপারেশনস অ্যাডমিন</span>
                          </div>
                        </div>
                      </td>
                      <td data-label="যোগাযোগ">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 font-metric font-semibold text-emerald-800">
                            <Phone className="h-3 w-3 shrink-0 text-slate-400" />
                            <span>{admin.phone}</span>
                          </div>
                          {admin.email ? (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500">
                              <Mail className="h-3 w-3 shrink-0 text-slate-400" />
                              <span className="truncate max-w-[180px]">{admin.email}</span>
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td data-label="এলাকা">
                        <div className="flex items-center gap-1 text-xs text-[#0F172A]">
                          <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span>{ward ? ward.name_bn : 'সার্বিক সাভার পৌরসভা'}</span>
                        </div>
                      </td>
                      <td data-label="স্ট্যাটাস">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" />
                          সক্রিয় ও সংরক্ষিত
                        </span>
                      </td>
                      <td data-label="পদক্ষেপ">
                        {isCurrent ? (
                          <span className="text-[11px] text-slate-400 font-medium">বর্তমান অ্যাকাউন্ট</span>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => void handleRevoke(admin)}
                            className="h-7 text-xs px-2 gap-1 text-rose-700 hover:bg-rose-50 hover:border-rose-300"
                          >
                            <Trash2 className="h-3 w-3" />
                            অ্যাক্সেস প্রত্যাহার
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal: Add New Pouro Admin */}
      <NativeDialog
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="নতুন পৌর অ্যাডমিন নিয়োগ ও অ্যাক্সেস প্রদান"
        description="সাভার পৌরসভা অপারেশনস ও কন্ট্রোল প্যানেলে পূর্ণ প্রবেশাধিকারের জন্য নতুন কর্মকর্তার তথ্য দিন। ডেটা সরাসরি কেন্দ্রীয় সার্ভারে সংরক্ষিত হবে।"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {formError ? (
            <div role="alert" className="rounded-md bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{formError}</span>
            </div>
          ) : null}

          <FormField
            id="admin-name"
            label="পৌর অ্যাডমিনের পূর্ণ নাম"
            required
            hint="যেমন: মোহাম্মদ রফিকুল ইসলাম (সহকারী প্রকৌশলী)"
          >
            {(a11y) => (
              <input
                {...a11y}
                type="text"
                required
                placeholder="পূর্ণ নাম লিখুন..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="cs-input"
              />
            )}
          </FormField>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField
              id="admin-phone"
              label="মোবাইল নম্বর"
              required
              hint="যেমন: 01712-345678"
            >
              {(a11y) => (
                <input
                  {...a11y}
                  type="tel"
                  required
                  placeholder="017XX-XXXXXX"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="cs-input"
                />
              )}
            </FormField>

            <FormField
              id="admin-email"
              label="অফিশিয়াল ইমেইল (ঐচ্ছিক)"
              hint="Google সাইন-ইনের জন্য"
            >
              {(a11y) => (
                <input
                  {...a11y}
                  type="email"
                  placeholder="officer@savar.gov.bd"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="cs-input"
                />
              )}
            </FormField>
          </div>

          <FormField
            id="admin-ward"
            label="দায়িত্বপ্রাপ্ত এলাকা / ওয়ার্ড"
            hint="নির্দিষ্ট ওয়ার্ড বা সার্বিক সাভার এলাকা নির্ধারণ করুন"
          >
            {(a11y) => (
              <select
                {...a11y}
                value={newWardId}
                onChange={(e) => setNewWardId(e.target.value ? Number(e.target.value) : '')}
                className="cs-input"
              >
                <option value="">সার্বিক সাভার পৌরসভা (সকল ওয়ার্ড)</option>
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name_bn}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <FormField
            id="admin-note"
            label="শাখা / পদবী নোট"
            hint="যেমন: পরিচ্ছন্নতা পরিদর্শক, বর্জ্য ব্যবস্থাপনা শাখা"
          >
            {(a11y) => (
              <input
                {...a11y}
                type="text"
                placeholder="শাখা বা পদবী..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="cs-input"
              />
            )}
          </FormField>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
            >
              বাতিল
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'পৌর অ্যাডমিন নিশ্চিত করুন'}
            </Button>
          </div>
        </form>
      </NativeDialog>
    </div>
  );
}
