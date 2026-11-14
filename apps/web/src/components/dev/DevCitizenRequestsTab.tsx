'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  Flame,
  MessageSquare,
  Phone,
  Play,
  Search,
  Send,
  Trash2,
  Truck,
  User,
} from 'lucide-react';
import {
  DevCitizenRequest,
  getDevCitizenRequests,
  appendDevCitizenResponse,
  simulateDevCitizenRequest,
  clearDevCitizenRequests,
} from '@/lib/dev-store';
import { Button } from '@/components/ui/button';
import { toBanglaDigits } from '@/lib/utils';

export function DevCitizenRequestsTab() {
  const [requests, setRequests] = useState<DevCitizenRequest[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'pickup' | 'dump_report'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeRequest, setActiveRequest] = useState<DevCitizenRequest | null>(null);
  const [replyMessage, setReplyMessage] = useState<string>('');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const loadRequests = () => {
    setRequests(getDevCitizenRequests());
  };

  useEffect(() => {
    loadRequests();

    const handleNew = () => loadRequests();
    window.addEventListener('cs:new-citizen-request', handleNew);
    window.addEventListener('cs:citizen-response-updated', handleNew);
    window.addEventListener('cs:citizen-request-status-changed', handleNew);
    window.addEventListener('cs:dev-citizen-requests-changed', handleNew);

    return () => {
      window.removeEventListener('cs:new-citizen-request', handleNew);
      window.removeEventListener('cs:citizen-response-updated', handleNew);
      window.removeEventListener('cs:citizen-request-status-changed', handleNew);
      window.removeEventListener('cs:dev-citizen-requests-changed', handleNew);
    };
  }, []);

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests.filter((r) => {
      if (filterType !== 'all' && r.type !== filterType) return false;
      if (!q) return true;
      return (
        r.trackingCode.toLowerCase().includes(q) ||
        r.citizenName.toLowerCase().includes(q) ||
        r.citizenPhone.includes(q) ||
        r.addressOrLandmark.toLowerCase().includes(q)
      );
    });
  }, [requests, filterType, searchQuery]);

  const summary = useMemo(() => {
    const total = requests.length;
    const pickups = requests.filter((r) => r.type === 'pickup').length;
    const reports = requests.filter((r) => r.type === 'dump_report').length;
    const pending = requests.filter((r) => r.status === 'pending' || r.status === 'reported').length;
    const responded = requests.filter((r) => r.responseNotes && r.responseNotes.length > 0).length;
    return { total, pickups, reports, pending, responded };
  }, [requests]);

  const handleSimulate = (type: 'pickup' | 'dump_report') => {
    const sim = simulateDevCitizenRequest(type);
    loadRequests();
    setStatusNotice(`সিমুলেটেড ${type === 'pickup' ? 'পিকআপ' : 'অভিযোগ'} [${sim.trackingCode}] তৈরি ও অ্যাডমিন চ্যানেলে প্রেরণ সম্পন্ন!`);
    setTimeout(() => setStatusNotice(null), 5000);
  };

  const handleSendResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest || !replyMessage.trim()) return;

    appendDevCitizenResponse(activeRequest.trackingCode, {
      senderName: 'সুপার ডেভেলপার / সিস্টেম কন্ট্রোল',
      senderRole: 'developer_admin',
      message: replyMessage.trim(),
    });

    setReplyMessage('');
    loadRequests();
    setStatusNotice(`নাগরিক [${activeRequest.citizenName}]-কে সফলভাবে রেসপন্স বার্তা পাঠানো হয়েছে!`);
    setTimeout(() => setStatusNotice(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      {statusNotice ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 p-4 text-xs font-semibold text-emerald-300 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            {statusNotice}
          </span>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      ) : null}

      {/* Header and Summary KPIs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-emerald-400" />
            নাগরিক রিকোয়েস্ট ও রেসপন্স লাইভ স্ট্রিম (Citizen Ingestion Stream)
          </h2>
          <p className="text-xs text-slate-400">
            নাগরিক বা ক্লায়েন্টের পাঠানো প্রতিটি পিকআপ বুকিং, ময়লার স্তূপ রিপোর্ট এবং রেসপন্স সরাসরি এখানে মনিটর ও রিয়েল-টাইম টেস্ট করুন।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="tint"
            size="sm"
            onClick={() => handleSimulate('pickup')}
            className="gap-1.5"
          >
            <Play className="h-3.5 w-3.5 text-emerald-400" />
            টেস্ট পিকআপ সিমুলেট
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handleSimulate('dump_report')}
            className="gap-1.5"
          >
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            টেস্ট অভিযোগ সিমুলেট
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              clearDevCitizenRequests();
              loadRequests();
            }}
            className="text-rose-400 hover:text-rose-300 gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            ক্লিয়ার
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
          <p className="text-[11px] font-medium text-slate-400">মোট রিকোয়েস্ট</p>
          <p className="mt-1 font-mono text-xl font-bold text-white">
            {toBanglaDigits(summary.total)}
          </p>
          <p className="text-[10px] text-emerald-400">লাইভ ইনজেশন স্ট্রিম</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
          <p className="text-[11px] font-medium text-slate-400">পিকআপ বুকিং</p>
          <p className="mt-1 font-mono text-xl font-bold text-emerald-400">
            {toBanglaDigits(summary.pickups)}
          </p>
          <p className="text-[10px] text-slate-400">ডোর-টু-ডোর সেবা</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
          <p className="text-[11px] font-medium text-slate-400">ময়লার অভিযোগ</p>
          <p className="mt-1 font-mono text-xl font-bold text-amber-400">
            {toBanglaDigits(summary.reports)}
          </p>
          <p className="text-[10px] text-slate-400">হটস্পট জিও-ট্যাগ</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
          <p className="text-[11px] font-medium text-slate-400">অমীমাংসিত কিউ</p>
          <p className="mt-1 font-mono text-xl font-bold text-rose-400">
            {toBanglaDigits(summary.pending)}
          </p>
          <p className="text-[10px] text-rose-400/80">পদক্ষেপ বাকি</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
          <p className="text-[11px] font-medium text-slate-400">প্রদত্ত রেসপন্স</p>
          <p className="mt-1 font-mono text-xl font-bold text-blue-400">
            {toBanglaDigits(summary.responded)}
          </p>
          <p className="text-[10px] text-blue-400/80">অ্যাডমিন উত্তর পাঠানো হয়েছে</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`min-h-9 rounded-md px-3 text-xs font-semibold transition-colors ${
              filterType === 'all'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            সকল রিকোয়েস্ট ({toBanglaDigits(requests.length)})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('pickup')}
            className={`min-h-9 rounded-md px-3 text-xs font-semibold transition-colors ${
              filterType === 'pickup'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            পিকআপ ({toBanglaDigits(summary.pickups)})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('dump_report')}
            className={`min-h-9 rounded-md px-3 text-xs font-semibold transition-colors ${
              filterType === 'dump_report'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            ময়লার অভিযোগ ({toBanglaDigits(summary.reports)})
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-500" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="কোড, নাম, মোবাইল বা এলাকা খুঁজুন..."
            className="w-full sm:w-64 rounded-md border border-slate-800 bg-slate-900/80 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Request Stream List */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <p>কোনো নাগরিক রিকোয়েস্ট রেকর্ড পাওয়া যায়নি।</p>
            <p>উপরের &ldquo;টেস্ট পিকআপ সিমুলেট&rdquo; বাটনে ক্লিক করে লাইভ স্ট্রিম পরীক্ষা করুন।</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 transition-colors hover:bg-slate-800/40 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold font-mono ${
                        req.type === 'pickup'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                          : 'bg-amber-950/80 text-amber-400 border border-amber-800/40'
                      }`}
                    >
                      {req.type === 'pickup' ? <Truck className="h-3 w-3" /> : <Flame className="h-3 w-3" />}
                      {req.trackingCode}
                    </span>
                    <span className="text-xs text-slate-400">
                      {req.type === 'pickup' ? 'বর্জ্য পিকআপ' : 'ময়লার স্তূপ রিপোর্ট'}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {req.formattedTime}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        req.status === 'pending' || req.status === 'reported'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : req.status === 'collected' || req.status === 'cleared'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {req.status}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setActiveRequest(req);
                        setReplyMessage('');
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300 gap-1 min-h-7 px-2"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      রেসপন্স পাঠান
                    </Button>
                  </div>
                </div>

                {/* Citizen Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <User className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span className="font-semibold text-white">{req.citizenName}</span>
                    {req.citizenEmail ? (
                      <span className="text-slate-400 text-[11px]">({req.citizenEmail})</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300 font-mono">
                    <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <a href={`tel:${req.citizenPhone}`} className="hover:underline text-emerald-400">
                      {req.citizenPhone}
                    </a>
                  </div>
                  <div className="text-slate-400 truncate">
                    {req.wardNameBn || `সাভার এলাকা`} — {req.addressOrLandmark}
                  </div>
                </div>

                {/* Payload & Details */}
                <div className="rounded-md bg-slate-950/70 p-2.5 text-xs text-slate-300 border border-slate-800/80">
                  <span className="font-semibold text-slate-400 mr-2">অনুরোধের বিবরণ:</span>
                  <span>{req.details}</span>
                  {req.wasteTypeOrSeverity ? (
                    <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 font-mono">
                      {req.wasteTypeOrSeverity}
                    </span>
                  ) : null}
                </div>

                {/* Previous Responses History */}
                {req.responseNotes && req.responseNotes.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-semibold text-blue-400 flex items-center gap-1">
                      <Send className="h-3 w-3" />
                      প্রদত্ত অফিশিয়াল রেসপন্স ({toBanglaDigits(req.responseNotes.length)}টি):
                    </p>
                    <div className="space-y-1 pl-4 border-l-2 border-blue-500/40">
                      {req.responseNotes.map((n) => (
                        <div key={n.id} className="text-xs text-slate-300 bg-blue-950/30 p-2 rounded border border-blue-900/30">
                          <span className="font-semibold text-blue-300">{n.senderName}: </span>
                          <span>&ldquo;{n.message}&rdquo;</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">{n.sentAt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Response Modal */}
      {activeRequest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Send className="h-4 w-4 text-emerald-400" />
                  নাগরিককে অফিশিয়াল রেসপন্স পাঠান
                </h3>
                <p className="text-xs text-slate-400">
                  কোড: <span className="font-mono text-emerald-400">{activeRequest.trackingCode}</span> · প্রাপক:{' '}
                  <span className="text-white font-medium">{activeRequest.citizenName}</span> ({activeRequest.citizenPhone})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveRequest(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendResponse} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  বার্তা / নির্দেশিকা লিখুন:
                </label>
                <textarea
                  rows={3}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="যেমন: আপনার অনুরোধটি প্রশাসন কর্তৃক গ্রহণ করা হয়েছে। পরিচ্ছন্নতা কর্মী এলাকা পরিদর্শন করবে।"
                  className="w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              {/* Quick Presets */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-semibold">কুইক টেমপ্লেট:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'আপনার পিকআপ অনুরোধ গৃহীত হয়েছে, গাড়ি রওয়ানা দিয়েছে।',
                    'অভিযোগের স্থানটি পৌর পরিচ্ছন্নতাকর্মী দ্বারা পরিষ্কার সম্পন্ন হয়েছে।',
                    'অনুগ্রহ করে বর্জ্য নির্দিষ্ট বস্তায় বেঁধে রাখুন।',
                    'জরুরি ভিত্তিতে ডিসপ্যাচ টিম পাঠানো হচ্ছে।',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReplyMessage(preset)}
                      className="rounded border border-slate-700 bg-slate-800/80 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveRequest(null)}
                >
                  বাতিল
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!replyMessage.trim()}
                  className="gap-2"
                >
                  <Send className="h-3.5 w-3.5" />
                  রেসপন্স প্রেরণ করুন
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
