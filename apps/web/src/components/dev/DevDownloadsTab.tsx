'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowDownToLine,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  FolderDown,
  Globe,
  HardDrive,
  Laptop,
  Play,
  Search,
  Smartphone,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  DevDownloadEvent,
  DevUserDownloadStat,
  DevDownloadSummary,
} from '@/lib/dev-store';
import { toBanglaDigits } from '@/lib/utils';

interface DevDownloadsTabProps {
  downloadEvents: DevDownloadEvent[];
  userDownloadStats: DevUserDownloadStat[];
  downloadSummary: DevDownloadSummary;
  onSimulateDownload: () => void;
  onClearDownloads: () => void;
  showToast: (msg: string) => void;
}

export function DevDownloadsTab({
  downloadEvents,
  userDownloadStats,
  downloadSummary,
  onSimulateDownload,
  onClearDownloads,
  showToast,
}: DevDownloadsTabProps) {
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [activeSubView, setActiveSubView] = useState<'users' | 'events'>('users');

  const filteredUserStats = useMemo(() => {
    if (!userSearchQuery.trim()) return userDownloadStats;
    const q = userSearchQuery.toLowerCase();
    return userDownloadStats.filter(
      (u) =>
        u.downloaderName.toLowerCase().includes(q) ||
        (u.downloaderPhone || '').toLowerCase().includes(q) ||
        u.downloaderRole.toLowerCase().includes(q) ||
        u.lastLocation.toLowerCase().includes(q) ||
        u.lastDevice.toLowerCase().includes(q) ||
        u.filesDownloaded.some((f) => f.toLowerCase().includes(q)),
    );
  }, [userDownloadStats, userSearchQuery]);

  const filteredEvents = useMemo(() => {
    if (!eventSearchQuery.trim()) return downloadEvents;
    const q = eventSearchQuery.toLowerCase();
    return downloadEvents.filter(
      (e) =>
        e.downloaderName.toLowerCase().includes(q) ||
        (e.downloaderPhone || '').toLowerCase().includes(q) ||
        e.fileName.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.ip.toLowerCase().includes(q) ||
        e.device.toLowerCase().includes(q),
    );
  }, [downloadEvents, eventSearchQuery]);

  const maxUserDownloads = useMemo(() => {
    if (userDownloadStats.length === 0) return 1;
    return Math.max(...userDownloadStats.map((s) => s.totalDownloads || 1));
  }, [userDownloadStats]);

  const handleExportCsv = () => {
    if (userDownloadStats.length === 0) {
      showToast('এক্সপোর্ট করার মতো কোনো ডাউনলোড ডেটা নেই!');
      return;
    }
    const headers = [
      'ডাউনলোডকারী আইডি',
      'নাম',
      'মোবাইল নম্বর',
      'ভূমিকা/রোল',
      'মোট ডাউনলোড সংখ্যা',
      'প্রথম ডাউনলোড',
      'সর্বশেষ ডাউনলোড',
      'ডাউনলোডকৃত ফাইলসমূহ',
      'সর্বশেষ অবস্থান',
      'সর্বশেষ ডিভাইস',
      'আইপি অ্যাড্রেস',
    ];
    const rows = userDownloadStats.map((s) => [
      `"${s.downloaderId}"`,
      `"${s.downloaderName}"`,
      `"${s.downloaderPhone || '-'}"`,
      `"${s.downloaderRole}"`,
      `"${s.totalDownloads}"`,
      `"${s.firstDownloadTime}"`,
      `"${s.lastDownloadTime}"`,
      `"${s.filesDownloaded.join('; ')}"`,
      `"${s.lastLocation}"`,
      `"${s.lastDevice}"`,
      `"${s.lastIp}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clean-savar-downloaders-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('ডাউনলোডকারী অডিট রিপোর্ট CSV ডাউনলোড সম্পন্ন হয়েছে!');
  };

  return (
    <div className="space-y-6">
      {/* Tab Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
            <Download className="h-4 w-4" />
            <span>DOWNLOAD AUDIT &amp; USER BREAKDOWN ENGINE</span>
          </div>
          <h2 className="mt-1 text-lg font-bold text-white">
            ডাউনলোড বিস্তারিত: মোট ডাউনলোড ও ব্যবহারকারী তালিকা
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            কারা কারা কয়বার ডাউনলোড করেছে এবং সর্বমোট কতবার অফিসিয়াল APK ও রিপোর্ট ডাউনলোড হয়েছে তার সম্পূর্ণ রিয়েল-টাইম হিসাব।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSimulateDownload}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
          >
            <Play className="h-3.5 w-3.5 text-emerald-400" />
            <span>টেস্ট ডাউনলোড সিমুলেট করুন</span>
          </button>

          <a
            href="/clean-savar.apk"
            download="clean-savar.apk"
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
          >
            <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-400" />
            <span>অফিসিয়াল APK টেস্ট</span>
          </a>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
          >
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span>CSV রিপোর্ট</span>
          </button>

          <button
            type="button"
            onClick={onClearDownloads}
            className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>রিসেট</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Downloads (MOT KOTOBAR) */}
        <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 to-slate-900/80 p-5 ring-1 ring-emerald-500/20">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 font-mono">
            <span>সর্বমোট ডাউনলোড (Total Downloads)</span>
            <Download className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-white">
            {toBanglaDigits(downloadSummary.totalDownloads)} <span className="text-sm font-normal text-emerald-300">বার</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-300">
            ক্লিন সাভার মোবাইল APK ও রিপোর্ট মিলিয়ে
          </div>
        </div>

        {/* Unique Downloaders (KARA KARA) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>অনন্য ডাউনলোডকারী (Unique Users)</span>
            <Users className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-white">
            {toBanglaDigits(downloadSummary.uniqueDownloaders)} <span className="text-sm font-normal text-slate-400">জন</span>
          </div>
          <div className="mt-1 text-[11px] text-sky-400">
            নাগরিক, পরিচ্ছন্নতাকর্মী, পার্টনার ও পৌর অ্যাডমিন
          </div>
        </div>

        {/* Registered vs Guest Breakdown */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>নিবন্ধিত বনাম গেস্ট ডাউনলোড</span>
            <UserCheck className="h-4 w-4 text-violet-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-white flex items-center justify-between">
            <span className="text-emerald-400">
              নিবন্ধিত: {toBanglaDigits(downloadSummary.registeredDownloads)} বার
            </span>
            <span className="text-slate-400 text-sm">
              গেস্ট: {toBanglaDigits(downloadSummary.guestDownloads)} বার
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{
                width: `${
                  downloadSummary.totalDownloads > 0
                    ? Math.round((downloadSummary.registeredDownloads / downloadSummary.totalDownloads) * 100)
                    : 60
                }%`,
              }}
            />
          </div>
        </div>

        {/* Today Downloads */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>আজকের মোট ডাউনলোড</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-amber-400">
            {toBanglaDigits(downloadSummary.todayDownloads)} <span className="text-sm font-normal text-slate-300">বার আজ</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            ভার্সন ১.২.০ সার্বজনীন APK সহ
          </div>
        </div>
      </div>

      {/* Sub-view Navigation Toggle: Leaderboard vs Event Stream */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveSubView('users')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-bold transition ${
              activeSubView === 'users'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>কারা কারা কয়বার ডাউনলোড করেছে (ইউজার তালিকা)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('events')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-bold transition ${
              activeSubView === 'events'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FolderDown className="h-3.5 w-3.5" />
            <span>লাইভ ডাউনলোড ইভেন্ট স্ট্রিম</span>
          </button>
        </div>

        <span className="hidden sm:inline text-xs text-slate-400 font-mono">
          মোট রেকর্ড: {toBanglaDigits(activeSubView === 'users' ? filteredUserStats.length : filteredEvents.length)} টি
        </span>
      </div>

      {/* VIEW 1: KARA KARA KOYBAR DOWNLOAD KORECHE TABLE */}
      {activeSubView === 'users' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          {/* Table Header & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" />
                <span>ডাউনলোডকারী তালিকা ও ব্যক্তিগত মোট ডাউনলোড সংখ্যা</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                কোন নাগরিক বা কর্মী কতবার APK ফাইল নামিয়েছেন তার বিস্তারিত পরিসংখ্যান।
              </p>
            </div>

            <div className="relative min-w-[220px] sm:min-w-[280px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="নাম, ফোন নম্বর, বা অবস্থান দিয়ে খুঁজুন..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-mono uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">ডাউনলোডকারী (Downloader)</th>
                  <th className="px-4 py-3">ভূমিকা (Role)</th>
                  <th className="px-4 py-3 text-center">মোট কতবার ডাউনলোড (Count)</th>
                  <th className="px-4 py-3">ডাউনলোডকৃত ফাইলসমূহ</th>
                  <th className="px-4 py-3">সর্বশেষ ডাউনলোড সময়</th>
                  <th className="px-4 py-3">সর্বশেষ অবস্থান ও আইপি</th>
                  <th className="px-4 py-3">ডিভাইস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredUserStats.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      কোনো ডাউনলোডকারী রেকর্ড পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredUserStats.map((stat, idx) => {
                    const relativeBarPercent = Math.max(15, Math.round((stat.totalDownloads / maxUserDownloads) * 100));

                    return (
                      <tr
                        key={stat.downloaderId || idx}
                        className="transition-colors hover:bg-slate-800/40"
                      >
                        {/* Downloader Name & Contact */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-white text-sm">
                              {stat.downloaderName}
                            </span>
                            {stat.downloaderPhone && (
                              <span className="text-[11px] font-mono text-emerald-400">
                                {stat.downloaderPhone}
                              </span>
                            )}
                            {stat.downloaderEmail && (
                              <span className="text-[10px] text-slate-400">
                                {stat.downloaderEmail}
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-slate-500">
                              ID: {stat.downloaderId}
                            </span>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {stat.downloaderRole === 'admin' ? (
                            <span className="rounded bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                              পৌর অ্যাডমিন
                            </span>
                          ) : stat.downloaderRole === 'collector' ? (
                            <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                              কালেক্টর / ড্রাইভার
                            </span>
                          ) : stat.downloaderRole === 'partner' ? (
                            <span className="rounded bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                              রিসাইক্লিং পার্টনার
                            </span>
                          ) : stat.downloaderRole === 'citizen' ? (
                            <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                              নাগরিক (Citizen)
                            </span>
                          ) : (
                            <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                              গেস্ট ভিজিটর
                            </span>
                          )}
                        </td>

                        {/* TOTAL DOWNLOADS (MOT KOTOBAR) */}
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-sm font-extrabold text-emerald-300 shadow-sm">
                              <Download className="h-3.5 w-3.5 text-emerald-400" />
                              <span>{toBanglaDigits(stat.totalDownloads)} বার</span>
                            </span>
                            <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${relativeBarPercent}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Files Downloaded */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {stat.filesDownloaded.map((file, fIdx) => (
                              <span
                                key={fIdx}
                                className="inline-flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-300 border border-slate-700"
                              >
                                <HardDrive className="h-2.5 w-2.5 text-emerald-400" />
                                <span className="truncate max-w-[160px]">{file}</span>
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Last Download Time */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-200">
                              {stat.lastDownloadTime}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              প্রথম: {stat.firstDownloadTime}
                            </span>
                          </div>
                        </td>

                        {/* Location & IP */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-white flex items-center gap-1">
                              <Globe className="h-3 w-3 text-emerald-400" />
                              <span>{stat.lastLocation}</span>
                            </span>
                            <span className="text-[11px] font-mono text-emerald-400">
                              {stat.lastIp}
                            </span>
                          </div>
                        </td>

                        {/* Device */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                            {stat.lastDevice.includes('Android') || stat.lastDevice.includes('Mobile') ? (
                              <Smartphone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <Laptop className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                            )}
                            <span className="truncate max-w-[150px]">{stat.lastDevice}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: LIVE DOWNLOAD EVENTS STREAM */}
      {activeSubView === 'events' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderDown className="h-4 w-4 text-emerald-400" />
                <span>রিয়েল-টাইম ডাউনলোড ইভেন্ট হিস্ট্রি (Download Activity Log)</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                প্রতিটি সিঙ্গেল ডাউনলোড শুরু ও সমাপ্তির অডিট ট্রেইল।
              </p>
            </div>

            <div className="relative min-w-[220px] sm:min-w-[280px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="ডাউনলোডকারী বা ফাইলের নাম..."
                value={eventSearchQuery}
                onChange={(e) => setEventSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-mono uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">ইভেন্ট আইডি ও স্ট্যাটাস</th>
                  <th className="px-4 py-3">ডাউনলোডকারী</th>
                  <th className="px-4 py-3">ফাইলের নাম ও সংস্করণ</th>
                  <th className="px-4 py-3">সাইজ</th>
                  <th className="px-4 py-3">অবস্থান ও আইপি</th>
                  <th className="px-4 py-3">ডিভাইস</th>
                  <th className="px-4 py-3">সময়</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      কোনো ডাউনলোড ইভেন্ট পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((evt) => (
                    <tr
                      key={evt.id}
                      className="transition-colors hover:bg-slate-800/40"
                    >
                      {/* Event ID & Status */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-mono text-[10px] text-slate-400">
                            {evt.id}
                          </span>
                          <span className="inline-flex w-fit items-center gap-1 text-[11px] font-semibold text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>সফল (Completed)</span>
                          </span>
                        </div>
                      </td>

                      {/* Downloader */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-white">
                            {evt.downloaderName}
                          </span>
                          {evt.downloaderPhone && (
                            <span className="text-[10px] font-mono text-emerald-400">
                              {evt.downloaderPhone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* File Name */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-emerald-300">
                            {evt.fileName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {evt.fileVersion}
                          </span>
                        </div>
                      </td>

                      {/* Size */}
                      <td className="px-4 py-3 font-mono text-slate-300">
                        {toBanglaDigits(evt.fileSizeMb)} MB
                      </td>

                      {/* Location & IP */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-white font-medium">{evt.location}</span>
                          <span className="text-[10px] font-mono text-slate-400">{evt.ip}</span>
                        </div>
                      </td>

                      {/* Device */}
                      <td className="px-4 py-3 text-slate-300">
                        {evt.device}
                      </td>

                      {/* Time */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-300">
                        {evt.formattedTime}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
