'use client';

import React, { useState, useMemo } from 'react';
import {
  Activity,
  Download,
  Globe,
  Laptop,
  Play,
  Search,
  Smartphone,
  Trash2,
  Users,
} from 'lucide-react';
import { DevVisitorLog, DevTrafficSummary } from '@/lib/dev-store';
import { toBanglaDigits } from '@/lib/utils';

interface DevTrafficTabProps {
  visitorLogs: DevVisitorLog[];
  trafficSummary: DevTrafficSummary;
  onSimulateVisit: () => void;
  onClearLogs: () => void;
  showToast: (msg: string) => void;
}

export function DevTrafficTab({
  visitorLogs,
  trafficSummary,
  onSimulateVisit,
  onClearLogs,
  showToast,
}: DevTrafficTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'mobile' | 'desktop'>('all');

  const filteredLogs = useMemo(() => {
    return visitorLogs.filter((v) => {
      const matchDevice = deviceFilter === 'all' || v.device?.type === deviceFilter;
      if (!matchDevice) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (v.userName || '').toLowerCase().includes(q) ||
        (v.userPhone || '').toLowerCase().includes(q) ||
        (v.path || '').toLowerCase().includes(q) ||
        (v.ip || '').toLowerCase().includes(q) ||
        (v.location?.city || '').toLowerCase().includes(q) ||
        (v.device?.browser || '').toLowerCase().includes(q) ||
        (v.device?.os || '').toLowerCase().includes(q) ||
        (v.referrer || '').toLowerCase().includes(q)
      );
    });
  }, [visitorLogs, searchQuery, deviceFilter]);

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) {
      showToast('এক্সপোর্ট করার জন্য কোনো ট্রাফিক ডেটা নেই!');
      return;
    }
    const headers = [
      'লগ আইডি',
      'ভিজিটর/ইউজার',
      'ফোন',
      'রোল',
      'পেজ পাথ',
      'পেজ শিরোনাম',
      'আইপি অ্যাড্রেস',
      'শহর/অঞ্চল',
      'দেশ',
      'নেটওয়ার্ক/ISP',
      'ডিভাইস টাইপ',
      'অপারেটিং সিস্টেম',
      'ব্রাউজার',
      'স্ক্রিন সাইজ',
      'রেফারার',
      'ভিজিট সময়',
    ];
    const rows = filteredLogs.map((l) => [
      `"${l.id}"`,
      `"${l.userName || 'গেস্ট'}"`,
      `"${l.userPhone || '-'}"`,
      `"${l.userRole || 'guest'}"`,
      `"${l.path}"`,
      `"${l.title || '-'}"`,
      `"${l.ip}"`,
      `"${l.location?.city || '-'}"`,
      `"${l.location?.country || '-'}"`,
      `"${l.location?.isp || '-'}"`,
      `"${l.device?.type || '-'}"`,
      `"${l.device?.os || '-'}"`,
      `"${l.device?.browser || '-'}"`,
      `"${l.device?.screen || '-'}"`,
      `"${l.referrer || '-'}"`,
      `"${l.formattedTime} (${l.timestamp})"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clean-savar-traffic-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('ভিজিটর ট্রাফিক লগ CSV ডাউনলোড সম্পন্ন হয়েছে!');
  };

  return (
    <div className="space-y-6">
      {/* Tab Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
            <Activity className="h-4 w-4" />
            <span>REAL-TIME TRAFFIC &amp; VISITOR INTELLIGENCE</span>
          </div>
          <h2 className="mt-1 text-lg font-bold text-white">
            লাইভ ওয়েব ট্রাফিক ও ভিজিটর ইনসাইট কনসোল
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            সাভার পৌরসভা ও আশপাশের অঞ্চল থেকে কারা কোন পেজে ভিজিট করছে, কোন ডিভাইস ও আইপি থেকে আসছে তার সার্বিক ট্র্যাকিং।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSimulateVisit}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
          >
            <Play className="h-3.5 w-3.5 text-emerald-400" />
            <span>সিমুলেটেড ভিজিটর ট্রাফিক</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
          >
            <Download className="h-3.5 w-3.5 text-slate-400" />
            <span>CSV এক্সপোর্ট</span>
          </button>

          <button
            type="button"
            onClick={onClearLogs}
            className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>লগ মুছুন</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Pageviews */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>সর্বমোট পেজভিউ (Views)</span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">
            {toBanglaDigits(trafficSummary.totalPageviews)}+
          </div>
          <div className="mt-1 text-[11px] text-emerald-400">
            ↑ গত ২৪ ঘণ্টায় ১২% ট্রাফিক বৃদ্ধি
          </div>
        </div>

        {/* Unique Visitors */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>অনন্য ভিজিটর (Unique)</span>
            <Users className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">
            {toBanglaDigits(trafficSummary.uniqueVisitors)}+
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            সাভার ও ঢাকা মহানগরী থেকে প্রধান ট্রাফিক
          </div>
        </div>

        {/* Live Active Now */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
          <div className="flex items-center justify-between text-xs text-emerald-300">
            <span>বর্তমানে সক্রিয় (Active Now)</span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-400">
            {toBanglaDigits(trafficSummary.activeNow)} জন অনলাইন
          </div>
          <div className="mt-1 text-[11px] text-emerald-300/80">
            লাইভ সকেট ও ব্রাউজিং সেশন সক্রিয়
          </div>
        </div>

        {/* Device Split */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>ডিভাইস বণ্টন (Devices)</span>
            <Smartphone className="h-4 w-4 text-violet-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-white flex items-center justify-between">
            <span className="text-emerald-400">
              মোবাইল {toBanglaDigits(trafficSummary.mobilePercent)}%
            </span>
            <span className="text-slate-400 text-sm">
              পিসি {toBanglaDigits(trafficSummary.desktopPercent)}%
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${trafficSummary.mobilePercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid: Hourly Traffic Chart & Top Pages */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Hourly Traffic Bar Chart */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              <span>২৪ ঘণ্টার ট্রাফিক ট্রেন্ড (Hourly Traffic Curve)</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">সময় অনুযায়ী পেজভিউ</span>
          </div>

          <div className="mt-6 flex h-40 items-end justify-between gap-2 border-b border-slate-800 px-2 pb-2">
            {trafficSummary.hourlyTraffic.map((item) => {
              const heightPercent = Math.min(100, Math.max(15, (item.count / 100) * 100));
              return (
                <div key={item.hour} className="group relative flex flex-1 flex-col items-center">
                  {/* Tooltip */}
                  <div className="absolute -top-7 hidden rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-emerald-300 shadow group-hover:block whitespace-nowrap z-10">
                    {toBanglaDigits(item.count)} পেজভিউ
                  </div>
                  {/* Bar */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full max-w-[28px] rounded-t bg-gradient-to-t from-emerald-600/40 via-emerald-500/70 to-emerald-400 transition-all hover:brightness-125"
                  />
                  <span className="mt-2 text-[10px] text-slate-500 font-mono">{item.hour}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Visited Pages & Geographic Origin */}
        <div className="space-y-4 lg:col-span-5">
          {/* Top Pages */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              সর্বাধিক ভিজিটকৃত পেজ (Top Visited Routes)
            </h3>
            <div className="mt-3 space-y-2">
              {trafficSummary.topPages.map((page) => {
                const total = trafficSummary.totalPageviews || 1;
                const percent = Math.min(100, Math.round(((page.count * 14) / total) * 100));
                return (
                  <div key={page.path} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-emerald-300 font-semibold truncate max-w-[180px]">
                        {page.path}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {toBanglaDigits(page.count * 14)} ভিউ ({toBanglaDigits(percent)}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Locations */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>ভৌগোলিক উৎস (Visitor Geolocation)</span>
              <Globe className="h-3.5 w-3.5 text-emerald-400" />
            </h3>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {trafficSummary.topLocations.map((loc) => (
                <span
                  key={loc.city}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-300"
                >
                  <span className="text-emerald-400">🇧🇩</span>
                  <span>{loc.city}</span>
                  <span className="rounded bg-emerald-500/10 px-1 py-0.2 text-[10px] font-mono text-emerald-400">
                    {toBanglaDigits(loc.count)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filterable Live Visitor Log Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        {/* Table Control Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              <span>লাইভ ভিজিটর স্ট্রিম ({toBanglaDigits(filteredLogs.length)} টি রেকর্ড)</span>
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Device Filter Buttons */}
            <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setDeviceFilter('all')}
                className={`rounded px-2.5 py-1 font-semibold transition ${
                  deviceFilter === 'all'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                সব
              </button>
              <button
                type="button"
                onClick={() => setDeviceFilter('mobile')}
                className={`flex items-center gap-1 rounded px-2.5 py-1 font-semibold transition ${
                  deviceFilter === 'mobile'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="h-3 w-3" />
                <span>মোবাইল</span>
              </button>
              <button
                type="button"
                onClick={() => setDeviceFilter('desktop')}
                className={`flex items-center gap-1 rounded px-2.5 py-1 font-semibold transition ${
                  deviceFilter === 'desktop'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Laptop className="h-3 w-3" />
                <span>ডেস্কটপ</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px] sm:min-w-[260px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="ভিজিটর, আইপি, শহর বা পেজ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-mono uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">ভিজিটর / পরিচয়</th>
                <th className="px-4 py-3">পরিদর্শনকৃত পেজ</th>
                <th className="px-4 py-3">ভৌগোলিক অবস্থান ও আইপি</th>
                <th className="px-4 py-3">ডিভাইস ও ব্রাউজার</th>
                <th className="px-4 py-3">উৎস (Referrer)</th>
                <th className="px-4 py-3">সময়</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    কোনো ভিজিটর রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isRegistered = log.userRole && log.userRole !== 'guest';
                  return (
                    <tr
                      key={log.id}
                      className="transition-colors hover:bg-slate-800/40"
                    >
                      {/* Identity */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            {log.userName || 'গেস্ট ভিজিটর'}
                            {isRegistered ? (
                              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase text-emerald-400 border border-emerald-500/30">
                                {log.userRole}
                              </span>
                            ) : (
                              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono text-slate-400">
                                Guest
                              </span>
                            )}
                          </span>
                          {log.userPhone && (
                            <span className="text-[11px] font-mono text-slate-400">
                              {log.userPhone}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-500">
                            {log.visitorId}
                          </span>
                        </div>
                      </td>

                      {/* Visited Page */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="inline-flex w-fit items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-xs font-mono font-semibold text-emerald-300">
                            {log.path}
                          </span>
                          <span className="mt-0.5 text-[11px] text-slate-400 truncate max-w-[200px]">
                            {log.title}
                          </span>
                        </div>
                      </td>

                      {/* Location & IP */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white flex items-center gap-1">
                            <span>{log.location?.flag || '🇧🇩'}</span>
                            <span>{log.location?.city || 'সাভার'}</span>
                          </span>
                          <span className="text-[11px] font-mono text-emerald-400">
                            {log.ip}
                          </span>
                          {log.location?.isp && (
                            <span className="text-[10px] text-slate-500">
                              {log.location.isp}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Device & OS */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-200 flex items-center gap-1">
                            {log.device?.type === 'mobile' ? (
                              <Smartphone className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Laptop className="h-3 w-3 text-sky-400" />
                            )}
                            <span>{log.device?.os || 'OS'}</span>
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {log.device?.browser || 'Browser'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {log.device?.screen || '-'}
                          </span>
                        </div>
                      </td>

                      {/* Referrer */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-400">
                          {log.referrer || 'Direct'}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-slate-300">
                          {log.formattedTime}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
