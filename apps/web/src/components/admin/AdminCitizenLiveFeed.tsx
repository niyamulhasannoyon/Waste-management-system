'use client';

import React, { useState, useMemo } from 'react';
import {
  Clock,
  Flame,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Send,
  Truck,
  User,
} from 'lucide-react';
import { DevCitizenRequest, appendDevCitizenResponse } from '@/lib/dev-store';
import { SAVAR_CENTER } from '@/lib/savar-data';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toBanglaDigits } from '@/lib/utils';
import type { DispatchTarget } from '@/components/admin/AdminDispatchDialog';

interface AdminCitizenLiveFeedProps {
  requests: DevCitizenRequest[];
  onRefresh: () => void;
  onDispatch: (target: DispatchTarget) => void;
  onStatusNotice: (msg: string) => void;
}

export function AdminCitizenLiveFeed({
  requests,
  onRefresh,
  onDispatch,
  onStatusNotice,
}: AdminCitizenLiveFeedProps) {
  const [filterType, setFilterType] = useState<'all' | 'pickup' | 'dump_report' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [responseModalTarget, setResponseModalTarget] = useState<DevCitizenRequest | null>(null);
  const [replyMessage, setReplyMessage] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests.filter((r) => {
      if (filterType === 'pickup' && r.type !== 'pickup') return false;
      if (filterType === 'dump_report' && r.type !== 'dump_report') return false;
      if (filterType === 'pending' && r.status !== 'pending' && r.status !== 'reported') return false;
      if (!q) return true;
      return (
        r.trackingCode.toLowerCase().includes(q) ||
        r.citizenName.toLowerCase().includes(q) ||
        r.citizenPhone.includes(q) ||
        r.addressOrLandmark.toLowerCase().includes(q) ||
        r.details.toLowerCase().includes(q)
      );
    });
  }, [requests, filterType, searchQuery]);

  const stats = useMemo(() => {
    const total = requests.length;
    const pickups = requests.filter((r) => r.type === 'pickup').length;
    const reports = requests.filter((r) => r.type === 'dump_report').length;
    const pending = requests.filter((r) => r.status === 'pending' || r.status === 'reported').length;
    const responded = requests.filter((r) => r.responseNotes && r.responseNotes.length > 0).length;
    return { total, pickups, reports, pending, responded };
  }, [requests]);

  const handleSendResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseModalTarget || !replyMessage.trim()) return;

    setIsSending(true);
    try {
      appendDevCitizenResponse(responseModalTarget.trackingCode, {
        senderName: 'সাভার পৌরসভা অপারেশনস ও কন্ট্রোল',
        senderRole: 'admin',
        message: replyMessage.trim(),
      });

      onStatusNotice(`নাগরিক [${responseModalTarget.citizenName}]-কে অফিশিয়াল বার্তা পাঠানো সম্পন্ন হয়েছে।`);
      setReplyMessage('');
      setResponseModalTarget(null);
      onRefresh();
    } catch {
      // Ignored
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="cs-card p-3.5 border-l-4 border-l-[#15803D]">
          <p className="text-xs font-semibold text-[#475569]">মোট নাগরিক রিকোয়েস্ট</p>
          <p className="mt-1 font-metric text-xl font-bold text-[#0F172A]">
            {toBanglaDigits(stats.total)}
          </p>
          <p className="text-[11px] text-[#15803D] font-medium">লাইভ পোস্টজিআইএস ফিড</p>
        </div>
        <div className="cs-card p-3.5 border-l-4 border-l-emerald-500">
          <p className="text-xs font-semibold text-[#475569]">বর্জ্য পিকআপ কিউ</p>
          <p className="mt-1 font-metric text-xl font-bold text-emerald-700">
            {toBanglaDigits(stats.pickups)}
          </p>
          <p className="text-[11px] text-[#475569]">ডোর-টু-ডোর বুকিং</p>
        </div>
        <div className="cs-card p-3.5 border-l-4 border-l-amber-500">
          <p className="text-xs font-semibold text-[#475569]">ময়লার অভিযোগ</p>
          <p className="mt-1 font-metric text-xl font-bold text-amber-700">
            {toBanglaDigits(stats.reports)}
          </p>
          <p className="text-[11px] text-[#475569]">হটস্পট জিও-ট্যাগ</p>
        </div>
        <div className="cs-card p-3.5 border-l-4 border-l-rose-500">
          <p className="text-xs font-semibold text-[#475569]">পদক্ষেপ বাকি (Pending)</p>
          <p className="mt-1 font-metric text-xl font-bold text-rose-700">
            {toBanglaDigits(stats.pending)}
          </p>
          <p className="text-[11px] text-rose-600 font-medium">জরুরি ডিসপ্যাচ প্রয়োজন</p>
        </div>
        <div className="cs-card p-3.5 border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold text-[#475569]">প্রদত্ত রেসপন্স</p>
          <p className="mt-1 font-metric text-xl font-bold text-blue-700">
            {toBanglaDigits(stats.responded)}
          </p>
          <p className="text-[11px] text-blue-600 font-medium">নাগরিককে পাঠানো উত্তর</p>
        </div>
      </div>

      {/* Toolbar: Filters & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2E8F0] pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`min-h-9 rounded-md px-3 text-xs font-semibold transition-colors ${
              filterType === 'all'
                ? 'border border-[#15803D] bg-[#F0FDF4] text-[#14532D]'
                : 'border border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC]'
            }`}
          >
            সকল রিকোয়েস্ট ({toBanglaDigits(requests.length)})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('pending')}
            className={`min-h-9 rounded-md px-3 text-xs font-semibold transition-colors ${
              filterType === 'pending'
                ? 'border border-rose-500 bg-rose-50 text-rose-800'
                : 'border border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC]'
            }`}
          >
            অমীমাংসিত ({toBanglaDigits(stats.pending)})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('pickup')}
            className={`min-h-9 rounded-md px-3 text-xs font-semibold transition-colors ${
              filterType === 'pickup'
                ? 'border border-emerald-600 bg-emerald-50 text-emerald-800'
                : 'border border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC]'
            }`}
          >
            পিকআপ ({toBanglaDigits(stats.pickups)})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('dump_report')}
            className={`min-h-9 rounded-md px-3 text-xs font-semibold transition-colors ${
              filterType === 'dump_report'
                ? 'border border-amber-500 bg-amber-50 text-amber-800'
                : 'border border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC]'
            }`}
          >
            ময়লার অভিযোগ ({toBanglaDigits(stats.reports)})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-[#64748B]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ট্র্যাকিং কোড, নাম, এলাকা বা মোবাইল..."
              className="cs-input w-64 pl-9 text-xs"
            />
          </div>
          <Button type="button" size="sm" variant="tint" onClick={onRefresh} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            রিফ্রেশ
          </Button>
        </div>
      </div>

      {/* Main Request Stream List */}
      <section className="cs-card overflow-hidden">
        <div className="border-b border-[#E2E8F0] px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#0F172A]">
              নাগরিক ইনজেশন স্ট্রিম ও রেসপন্স কিউ ({toBanglaDigits(filtered.length)}টি)
            </h2>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <span className="text-xs text-[#64748B]">
            রিয়েল-টাইম অ্যাডমিন ও ডিসপ্যাচ সমন্বয়
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#64748B] space-y-1">
            <p className="font-semibold text-sm text-[#0F172A]">কোনো নাগরিক রিকোয়েস্ট মেলেনি।</p>
            <p>নাগরিক বা ক্লায়েন্ট সাইট থেকে পিকআপ বুকিং বা রিপোর্ট পাঠানো হলে তা সরাসরি এই তালিকায় ভেসে উঠবে।</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 transition-colors hover:bg-[#F8FAFC] space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-bold font-metric ${
                        item.type === 'pickup'
                          ? 'border border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]'
                          : 'border border-amber-200 bg-amber-50 text-amber-800'
                      }`}
                    >
                      {item.type === 'pickup' ? (
                        <Truck className="h-3.5 w-3.5" />
                      ) : (
                        <Flame className="h-3.5 w-3.5" />
                      )}
                      {item.trackingCode}
                    </span>
                    <span className="text-xs font-semibold text-[#0F172A]">
                      {item.type === 'pickup' ? 'বর্জ্য পিকআপ অনুরোধ' : 'অবৈধ ময়লার স্তূপ অভিযোগ'}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-xs text-[#64748B] flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {item.formattedTime}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      tone={
                        item.status === 'collected' || item.status === 'cleared'
                          ? 'success'
                          : item.status === 'pending' || item.status === 'reported'
                            ? 'warning'
                            : 'neutral'
                      }
                    >
                      {item.status}
                    </StatusBadge>

                    {item.type === 'dump_report' || item.type === 'pickup' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          onDispatch({
                            entityType: item.type === 'pickup' ? 'pickup' : 'dump_report',
                            entityId: item.id,
                            trackingCode: item.trackingCode,
                            title: item.details,
                            lat: SAVAR_CENTER.lat,
                            lng: SAVAR_CENTER.lng,
                          })
                        }
                        className="gap-1 min-h-8 text-xs"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        গাড়ি দিন
                      </Button>
                    ) : null}

                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setResponseModalTarget(item);
                        setReplyMessage('');
                      }}
                      className="gap-1 min-h-8 text-xs"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      নাগরিককে রেসপন্স পাঠান
                    </Button>
                  </div>
                </div>

                {/* Citizen Meta & Address */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-[#0F172A]">
                    <User className="h-3.5 w-3.5 text-[#64748B] shrink-0" />
                    <span className="font-bold">{item.citizenName}</span>
                    {item.citizenEmail ? (
                      <span className="text-[#64748B] text-[11px]">({item.citizenEmail})</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5 font-metric text-[#0F172A]">
                    <Phone className="h-3.5 w-3.5 text-[#64748B] shrink-0" />
                    <a
                      href={`tel:${item.citizenPhone}`}
                      className="hover:underline font-bold text-[#15803D]"
                    >
                      {item.citizenPhone}
                    </a>
                  </div>
                  <div className="text-[#475569] truncate">
                    <span className="font-semibold text-[#0F172A]">{item.wardNameBn || 'সাভার এলাকা'}</span>
                    {' — '}
                    {item.addressOrLandmark}
                  </div>
                </div>

                {/* Details Banner */}
                <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs text-[#0F172A] flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-[#475569] mr-2">অনুরোধের বিবরণ:</span>
                    <span>{item.details}</span>
                  </div>
                  {item.wasteTypeOrSeverity ? (
                    <span className="rounded bg-white border border-[#CBD5E1] px-2 py-0.5 text-[11px] font-semibold text-[#15803D]">
                      {item.wasteTypeOrSeverity}
                    </span>
                  ) : null}
                </div>

                {/* Response History Thread */}
                {item.responseNotes && item.responseNotes.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-bold text-[#15803D] flex items-center gap-1">
                      <Send className="h-3 w-3" />
                      প্রদত্ত অফিশিয়াল রেসপন্স থ্রেড ({toBanglaDigits(item.responseNotes.length)}টি বার্তা):
                    </p>
                    <div className="space-y-1.5 pl-3 border-l-2 border-[#15803D]/40">
                      {item.responseNotes.map((n) => (
                        <div
                          key={n.id}
                          className="text-xs text-[#0F172A] bg-[#F0FDF4] p-2.5 rounded border border-[#BBF7D0]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#14532D]">{n.senderName}</span>
                            <span className="text-[10px] text-[#64748B]">{n.sentAt}</span>
                          </div>
                          <p className="mt-0.5 text-[#334155]">&ldquo;{n.message}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reply Modal */}
      {responseModalTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-[#CBD5E1] bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                  <Send className="h-4 w-4 text-[#15803D]" />
                  নাগরিককে অফিশিয়াল আপডেট ও রেসপন্স পাঠান
                </h3>
                <p className="text-xs text-[#475569]">
                  ট্র্যাকিং কোড: <span className="font-metric font-bold text-[#15803D]">{responseModalTarget.trackingCode}</span> · নাগরিক:{' '}
                  <span className="font-semibold text-[#0F172A]">{responseModalTarget.citizenName}</span> ({responseModalTarget.citizenPhone})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResponseModalTarget(null)}
                className="text-[#64748B] hover:text-[#0F172A] p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendResponse} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  পৌরসভা থেকে নাগরিকের কাছে বার্তা / পরামর্শ:
                </label>
                <textarea
                  rows={3}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="যেমন: আপনার অনুরোধটি পৌর কমান্ড কর্তৃক অনুমোদিত হয়েছে। কালেক্টর ভ্যান কিছুক্ষণের মধ্যে পৌঁছাবে।"
                  className="cs-input text-xs"
                  required
                />
              </div>

              {/* Quick Presets */}
              <div className="space-y-1">
                <span className="text-[11px] text-[#475569] font-semibold">কুইক মেসেজ টেমপ্লেট:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'আপনার পিকআপ অনুরোধ গৃহীত হয়েছে, পরিচ্ছন্নতা ভ্যান রওয়ানা দিয়েছে।',
                    'অভিযোগের এলাকাটি পৌর পরিচ্ছন্নতাকর্মী দ্বারা পরিষ্কার সম্পন্ন হয়েছে।',
                    'অনুগ্রহ করে বর্জ্য নির্দিষ্ট বস্তায় বেঁধে মূল দরজার কাছে রাখুন।',
                    'জরুরি হটস্পট বিবেচনায় ডিসপ্যাচ টিম পাঠানো হয়েছে।',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReplyMessage(preset)}
                      className="rounded border border-[#CBD5E1] bg-[#F8FAFC] px-2 py-1 text-[11px] text-[#475569] hover:border-[#15803D] hover:bg-[#F0FDF4] hover:text-[#14532D] transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setResponseModalTarget(null)}
                >
                  বাতিল
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!replyMessage.trim() || isSending}
                  className="gap-2"
                >
                  <Send className="h-3.5 w-3.5" />
                  {isSending ? 'পাঠানো হচ্ছে...' : 'রেসপন্স নিশ্চিত করুন'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
