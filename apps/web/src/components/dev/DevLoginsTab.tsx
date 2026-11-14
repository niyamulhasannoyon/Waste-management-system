'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  KeyRound,
  Laptop,
  MapPin,
  Play,
  Search,
  ShieldCheck,
  Smartphone,
  Trash2,
  Users,
  Wifi,
} from 'lucide-react';
import {
  DevLoginEvent,
  DevUserLoginStat,
  DevLoginSummary,
} from '@/lib/dev-store';
import { toBanglaDigits } from '@/lib/utils';

interface DevLoginsTabProps {
  loginEvents: DevLoginEvent[];
  userLoginStats: DevUserLoginStat[];
  loginSummary: DevLoginSummary;
  onSimulateLogin: () => void;
  onClearLogins: () => void;
  showToast: (msg: string) => void;
}

export function DevLoginsTab({
  loginEvents,
  userLoginStats,
  loginSummary,
  onSimulateLogin,
  onClearLogins,
  showToast,
}: DevLoginsTabProps) {
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [activeSubView, setActiveSubView] = useState<'leaderboard' | 'stream'>('leaderboard');

  const filteredUserStats = useMemo(() => {
    if (!userSearchQuery.trim()) return userLoginStats;
    const q = userSearchQuery.toLowerCase();
    return userLoginStats.filter(
      (l) =>
        l.userName.toLowerCase().includes(q) ||
        l.userPhone.toLowerCase().includes(q) ||
        l.userRole.toLowerCase().includes(q) ||
        l.lastLocation.toLowerCase().includes(q) ||
        l.lastIp.toLowerCase().includes(q) ||
        (l.lastIsp || '').toLowerCase().includes(q) ||
        l.lastDevice.toLowerCase().includes(q) ||
        l.authMethod.toLowerCase().includes(q),
    );
  }, [userLoginStats, userSearchQuery]);

  const filteredEvents = useMemo(() => {
    if (!eventSearchQuery.trim()) return loginEvents;
    const q = eventSearchQuery.toLowerCase();
    return loginEvents.filter(
      (e) =>
        e.userName.toLowerCase().includes(q) ||
        e.userPhone.toLowerCase().includes(q) ||
        e.userRole.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.ip.toLowerCase().includes(q) ||
        (e.isp || '').toLowerCase().includes(q) ||
        e.device.toLowerCase().includes(q) ||
        e.authMethod.toLowerCase().includes(q),
    );
  }, [loginEvents, eventSearchQuery]);

  const maxLogins = useMemo(() => {
    if (userLoginStats.length === 0) return 1;
    return Math.max(...userLoginStats.map((s) => s.totalLogins || 1));
  }, [userLoginStats]);

  const handleExportCsv = () => {
    if (userLoginStats.length === 0) {
      showToast('এক্সপোর্ট করার জন্য কোনো লগইন ডেটা নেই!');
      return;
    }
    const headers = [
      'ইউজার আইডি',
      'নাম',
      'ফোন',
      'ইমেইল',
      'রোল',
      'মোট কতবার লগইন',
      'সর্বশেষ অবস্থান (কোথা থেকে)',
      'আইপি অ্যাড্রেস',
      'ইন্টারনেট প্রোভাইডার (ISP)',
      'ডিভাইস ও ব্রাউজার',
      'সাইন-ইন মাধ্যম',
      'সর্বশেষ সক্রিয় সময়',
    ];
    const rows = userLoginStats.map((s) => [
      `"${s.userId}"`,
      `"${s.userName}"`,
      `"${s.userPhone}"`,
      `"${s.userEmail || '-'}"`,
      `"${s.userRole}"`,
      `"${s.totalLogins}"`,
      `"${s.lastLocation}"`,
      `"${s.lastIp}"`,
      `"${s.lastIsp || '-'}"`,
      `"${s.lastDevice}"`,
      `"${s.authMethod}"`,
      `"${s.lastLoginTime}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clean-savar-login-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('লগইন অডিট রিপোর্ট CSV ডাউনলোড সম্পন্ন হয়েছে!');
  };

  return (
    <div className="space-y-6">
      {/* Tab Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span>LOGIN AUDIT &amp; GEOLOCATION INTELLIGENCE</span>
          </div>
          <h2 className="mt-1 text-lg font-bold text-white">
            ব্যবহারকারী লগইন ও সেশন জিওলোকেশন ট্র্যাকার
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            কোথা থেকে কে কে লগইন করলো, কোন ডিভাইসে এবং মোট কতবার সাইন-ইন সম্পন্ন করেছে তার পূর্ণাঙ্গ অডিট ট্রেইল।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSimulateLogin}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
          >
            <Play className="h-3.5 w-3.5 text-emerald-400" />
            <span>সিমুলেটেড লগইন টেস্ট</span>
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
            onClick={onClearLogins}
            className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>লগ মুছুন</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Logins */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>সর্বমোট সফল লগইন (Total Logins)</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-white">
            {toBanglaDigits(loginSummary.totalLogins)} <span className="text-sm font-normal text-emerald-400">বার</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-400">
            Google Auth, Firebase ও পৌর ওটিপি মিলিয়ে
          </div>
        </div>

        {/* Unique Users Logged In */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>অনন্য ব্যবহারকারী (Unique Users)</span>
            <Users className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-white">
            {toBanglaDigits(loginSummary.uniqueUsers)} <span className="text-sm font-normal text-slate-400">জন</span>
          </div>
          <div className="mt-1 text-[11px] text-sky-400">
            সক্রিয় নাগরিক ও পৌরসভার মাঠপর্যায়ের দল
          </div>
        </div>

        {/* Success Rate */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>অথেন্টিকেশন সফলতার হার</span>
            <KeyRound className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-white">
            {toBanglaDigits(loginSummary.successRate)}%
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            ০টি সন্দেহজনক বা ব্যর্থ সাইন-ইন প্রচেষ্টা
          </div>
        </div>

        {/* Top Location */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>সর্বাধিক লগইন অঞ্চল (Top Area)</span>
            <MapPin className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-amber-300 truncate">
            {loginSummary.topLocation}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            সাভার পৌরসভার ওয়ার্ড ১-৯ থেকে ৮০% সেশন
          </div>
        </div>
      </div>

      {/* Sub-view Navigation Toggle */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveSubView('leaderboard')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-bold transition ${
              activeSubView === 'leaderboard'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>কে কতবার ও কোথা থেকে লগইন করেছে (ইউজার তালিকা)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('stream')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-bold transition ${
              activeSubView === 'stream'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>রিয়েল-টাইম লগইন ইভেন্ট হিস্ট্রি</span>
          </button>
        </div>

        <span className="hidden sm:inline text-xs text-slate-400 font-mono">
          মোট রেকর্ড: {toBanglaDigits(activeSubView === 'leaderboard' ? filteredUserStats.length : filteredEvents.length)} টি
        </span>
      </div>

      {/* VIEW 1: USER LOGIN LEADERBOARD TABLE */}
      {activeSubView === 'leaderboard' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-400" />
                <span>কোথা থেকে কে কে কতবার লগইন সম্পন্ন করলো</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                ব্যবহারকারীর অবস্থান, নেটওয়ার্ক ও ডিভাইসের সার্বিক ভৌগোলিক ট্র্যাকিং।
              </p>
            </div>

            <div className="relative min-w-[220px] sm:min-w-[280px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="ব্যবহারকারী, ফোন বা অবস্থান দিয়ে খুঁজুন..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-mono uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">ব্যবহারকারী ও যোগাযোগ</th>
                  <th className="px-4 py-3">ভূমিকা (Role)</th>
                  <th className="px-4 py-3 text-center">কতবার লগইন (Logins)</th>
                  <th className="px-4 py-3">কোথা থেকে লগইন হলো (Last Location)</th>
                  <th className="px-4 py-3">আইপি ও নেটওয়ার্ক (ISP)</th>
                  <th className="px-4 py-3">ব্যবহৃত ডিভাইস ও ব্রাউজার</th>
                  <th className="px-4 py-3">সাইন-ইন মেথড</th>
                  <th className="px-4 py-3">সর্বশেষ সক্রিয়</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredUserStats.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      কোনো লগইন রেকর্ড পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredUserStats.map((stat, idx) => {
                    const relativePercent = Math.max(15, Math.round((stat.totalLogins / maxLogins) * 100));

                    return (
                      <tr
                        key={stat.userId || idx}
                        className="transition-colors hover:bg-slate-800/40"
                      >
                        {/* User Identity */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-white text-sm">
                              {stat.userName}
                            </span>
                            <span className="text-[11px] font-mono text-emerald-400">
                              {stat.userPhone}
                            </span>
                            {stat.userEmail && (
                              <span className="text-[10px] text-slate-400">
                                {stat.userEmail}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {stat.userRole === 'admin' ? (
                            <span className="rounded bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                              পৌর অ্যাডমিন
                            </span>
                          ) : stat.userRole === 'collector' ? (
                            <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                              কালেক্টর / ড্রাইভার
                            </span>
                          ) : stat.userRole === 'partner' ? (
                            <span className="rounded bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                              রিসাইক্লিং পার্টনার
                            </span>
                          ) : stat.userRole === 'developer' ? (
                            <span className="rounded bg-violet-500/15 border border-violet-500/30 px-2 py-0.5 text-[10px] font-bold text-violet-300">
                              সুপার ডেভেলপার
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                              নাগরিক (Citizen)
                            </span>
                          )}
                        </td>

                        {/* LOGIN COUNT (KOTOBAR LOGIN KORLO) */}
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-500/15 px-3 py-1 text-xs font-extrabold text-sky-300 shadow-sm">
                              <ShieldCheck className="h-3 w-3 text-sky-400" />
                              <span>{toBanglaDigits(stat.totalLogins)} বার</span>
                            </span>
                            <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full bg-sky-500 rounded-full"
                                style={{ width: `${relativePercent}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* KOTHA THEKE (LAST LOCATION) */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-white flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                              <span>{stat.lastLocation}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 ml-4.5">
                              বাংলাদেশ (BD)
                            </span>
                          </div>
                        </td>

                        {/* IP & ISP */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-mono text-emerald-400 font-semibold">
                              {stat.lastIp}
                            </span>
                            {stat.lastIsp && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Wifi className="h-2.5 w-2.5 text-slate-500" />
                                <span>{stat.lastIsp}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Device & Browser */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                            {stat.lastDevice.includes('Android') || stat.lastDevice.includes('Mobile') ? (
                              <Smartphone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <Laptop className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                            )}
                            <span className="truncate max-w-[160px]">{stat.lastDevice}</span>
                          </div>
                        </td>

                        {/* Auth Method */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-slate-700">
                            {stat.authMethod}
                          </span>
                        </td>

                        {/* Last Active Time */}
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-300">
                          {stat.lastLoginTime}
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

      {/* VIEW 2: LIVE LOGIN EVENTS STREAM */}
      {activeSubView === 'stream' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-400" />
                <span>সাম্প্রতিক লগইন ইভেন্ট অডিট স্ট্রিম (Recent Login Events)</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                প্রতিটি সিঙ্গেল লগইন ও সেশনের সময়, অবস্থান ও ফলাফল।
              </p>
            </div>

            <div className="relative min-w-[220px] sm:min-w-[280px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="নাম, ফোন বা অবস্থান দিয়ে খুঁজুন..."
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
                  <th className="px-4 py-3">ইভেন্ট ও ফলাফল</th>
                  <th className="px-4 py-3">ব্যবহারকারী</th>
                  <th className="px-4 py-3">কোথা থেকে লগইন হলো (Location)</th>
                  <th className="px-4 py-3">আইপি ও নেটওয়ার্ক</th>
                  <th className="px-4 py-3">ডিভাইস</th>
                  <th className="px-4 py-3">মেথড</th>
                  <th className="px-4 py-3">সময়</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      কোনো লগইন ইভেন্ট পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((evt) => (
                    <tr
                      key={evt.id}
                      className="transition-colors hover:bg-slate-800/40"
                    >
                      {/* Status */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-mono text-[10px] text-slate-400">
                            {evt.id}
                          </span>
                          <span className="inline-flex w-fit items-center gap-1 text-[11px] font-semibold text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>সফল (Success)</span>
                          </span>
                        </div>
                      </td>

                      {/* User */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-white">
                            {evt.userName}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400">
                            {evt.userPhone}
                          </span>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-white font-medium">
                          <MapPin className="h-3 w-3 text-rose-400 shrink-0" />
                          <span>{evt.location}</span>
                        </div>
                      </td>

                      {/* IP & ISP */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-mono text-emerald-400">{evt.ip}</span>
                          {evt.isp && <span className="text-[10px] text-slate-400">{evt.isp}</span>}
                        </div>
                      </td>

                      {/* Device */}
                      <td className="px-4 py-3 text-slate-300">
                        {evt.device}
                      </td>

                      {/* Method */}
                      <td className="px-4 py-3 font-mono text-slate-400">
                        {evt.authMethod}
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
