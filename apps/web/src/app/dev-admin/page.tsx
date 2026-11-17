'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Activity,
  CheckCircle2,
  Globe,
  KeyRound,
  LogOut,
  MessageSquare,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Sliders,
  Terminal,
  Truck,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

import { DevAuthGate, useDevAuthSession } from '@/components/dev/DevAuthGate';
import { DevTrafficTab } from '@/components/dev/DevTrafficTab';
import { DevDownloadsTab } from '@/components/dev/DevDownloadsTab';
import { DevLoginsTab } from '@/components/dev/DevLoginsTab';
import { DevCitizenRequestsTab } from '@/components/dev/DevCitizenRequestsTab';
import {
  fetchAdminUsers,
  saveAdminUser,
  updateUserRoleInDb,
  type DbUserRecord,
} from '@/lib/api-client';
import {
  DevFeatureFlags,
  DevAuditEvent,
  DevVisitorLog,
  DevTrafficSummary,
  DevDownloadEvent,
  DevUserDownloadStat,
  DevDownloadSummary,
  DevLoginEvent,
  DevUserLoginStat,
  DevLoginSummary,
  approveAdminUser,
  revokeAdminUser as revokeLocalAdminUser,
  getDevFeatureFlags,
  saveDevFeatureFlags,
  generateDevSimulatedOtp,
  getDevApkConfig,
  getDevAuditLogs,
  clearDevAuditLogs,
  recordDevAudit,
  getDevVisitorLogs,
  getDevTrafficSummary,
  simulateDevTrafficVisit,
  clearDevVisitorLogs,
  getDevDownloadEvents,
  getDevUserDownloadStats,
  getDevDownloadSummary,
  simulateDevDownload,
  clearDevDownloadLogs,
  getDevLoginEvents,
  getDevUserLoginStats,
  getDevLoginSummary,
  simulateDevLogin,
  clearDevLoginLogs,
} from '@/lib/dev-store';
import { SAVAR_WARDS_SEED } from '@/lib/savar-data';
import { toBanglaDigits, normalizeBdPhone } from '@/lib/utils';

type DevTabKey = 'users' | 'overview' | 'requests' | 'analytics' | 'system';

interface TabItem {
  key: DevTabKey;
  labelBn: string;
  labelEn: string;
  icon: React.ElementType;
  badge?: string | number;
}

function DevAdminConsoleContent() {
  const { currentUser, handleSignOut } = useDevAuthSession();
  const [activeTab, setActiveTab] = useState<DevTabKey>('users');

  // Live Supabase Database Users State
  const [dbUsers, setDbUsers] = useState<DbUserRecord[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'collector' | 'citizen'>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userUpdatingId, setUserUpdatingId] = useState<string | null>(null);

  // Add User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'collector' | 'citizen' | 'partner'>('admin');
  const [newUserWard, setNewUserWard] = useState<number | ''>(1);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // System & Feature Flags
  const [flags, setFlags] = useState<DevFeatureFlags>(getDevFeatureFlags());
  const [flagSearchQuery, setFlagSearchQuery] = useState('');
  const [apkConfig] = useState(getDevApkConfig());

  // Analytics Sub-tab
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'traffic' | 'downloads' | 'logins'>('traffic');
  const [visitorLogs, setVisitorLogs] = useState<DevVisitorLog[]>(getDevVisitorLogs());
  const [trafficSummary, setTrafficSummary] = useState<DevTrafficSummary>(getDevTrafficSummary());
  const [downloadEvents, setDownloadEvents] = useState<DevDownloadEvent[]>(getDevDownloadEvents());
  const [userDownloadStats, setUserDownloadStats] = useState<DevUserDownloadStat[]>(getDevUserDownloadStats());
  const [downloadSummary, setDownloadSummary] = useState<DevDownloadSummary>(getDevDownloadSummary());
  const [loginEvents, setLoginEvents] = useState<DevLoginEvent[]>(getDevLoginEvents());
  const [userLoginStats, setUserLoginStats] = useState<DevUserLoginStat[]>(getDevUserLoginStats());
  const [loginSummary, setLoginSummary] = useState<DevLoginSummary>(getDevLoginSummary());

  // Diagnostics & Audit
  const [auditLogs, setAuditLogs] = useState<DevAuditEvent[]>(getDevAuditLogs());
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [customOtpPhone, setCustomOtpPhone] = useState('01711-240100');
  const [apiPingMs, setApiPingMs] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 4000);
  }, []);

  // Fetch Live Database Users from Supabase
  const loadDatabaseUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const records = await fetchAdminUsers();
      setDbUsers(records);

      // Record audit of data sync
      recordDevAudit({
        actor: currentUser?.email || 'Developer',
        action: 'DB_USERS_SYNC',
        category: 'security',
        details: `Loaded ${records.length} user records directly from PostgreSQL database`,
      });
    } catch (err) {
      console.error('Failed to load database users:', err);
      showToast('ডাটাবেজ থেকে ইউজার লোড করা যায়নি, পুনরায় চেষ্টা করুন।');
    } finally {
      setIsLoadingUsers(false);
    }
  }, [currentUser?.email, showToast]);

  useEffect(() => {
    loadDatabaseUsers();
  }, [loadDatabaseUsers]);

  // Role Promotion / Demotion Handler (Synced to Supabase)
  async function handleRoleChange(user: DbUserRecord, newRole: string) {
    setUserUpdatingId(user.id);
    try {
      // 1. Update in remote Supabase database
      await updateUserRoleInDb({
        id: user.id,
        phone: user.phone,
        role: newRole,
      });

      // 2. Update local state
      setDbUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole, updated_at: new Date().toISOString() } : u)),
      );

      // 3. Keep local dev approvals & RBAC in sync
      if (newRole === 'admin') {
        approveAdminUser(user.phone, user.full_name, user.email || undefined, currentUser?.email || 'Developer');
      } else if (user.role === 'admin' && newRole !== 'admin') {
        revokeLocalAdminUser(user.phone);
      }

      recordDevAudit({
        actor: currentUser?.email || 'Developer',
        action: 'USER_ROLE_UPDATED',
        category: 'auth',
        details: `Changed role of ${user.full_name} (${user.phone}) to '${newRole}' in Supabase`,
      });

      showToast(`${user.full_name}-এর ভূমিকা সফলভাবে '${newRole}'-এ পরিবর্তন করা হয়েছে।`);
    } catch (err: unknown) {
      console.error('Role update error:', err);
      const msg = err instanceof Error ? err.message : 'রোল পরিবর্তন ব্যর্থ হয়েছে।';
      showToast(msg);
    } finally {
      setUserUpdatingId(null);
    }
  }

  // Create / Approve New User or Admin in Supabase
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUserPhone.trim() || !newUserName.trim()) {
      showToast('মোবাইল নম্বর ও নাম আবশ্যক!');
      return;
    }

    setIsSubmittingUser(true);
    try {
      const wardNum = newUserWard === '' ? null : Number(newUserWard);
      const created = await saveAdminUser({
        phone: newUserPhone.trim(),
        full_name: newUserName.trim(),
        email: newUserEmail.trim() || undefined,
        role: newUserRole as 'admin' | 'collector' | 'citizen',
        ward_id: wardNum,
      });

      if (newUserRole === 'admin') {
        approveAdminUser(newUserPhone.trim(), newUserName.trim(), newUserEmail.trim() || undefined, currentUser?.email);
      }

      showToast(`সফলভাবে ${created.full_name} (${newUserRole}) ডাটাবেজে সংরক্ষিত হয়েছে!`);
      setShowAddUserModal(false);
      setNewUserName('');
      setNewUserPhone('');
      setNewUserEmail('');
      setNewUserWard(1);

      // Refresh list
      await loadDatabaseUsers();
    } catch (err: unknown) {
      console.error('Error creating user:', err);
      const msg = err instanceof Error ? err.message : 'ব্যবহারকারী তৈরি করা যায়নি।';
      showToast(msg);
    } finally {
      setIsSubmittingUser(false);
    }
  }

  // Feature Flag Toggle
  function handleToggleFlag(key: keyof DevFeatureFlags) {
    const updated = { ...flags, [key]: !flags[key] };
    setFlags(updated);
    saveDevFeatureFlags(updated);
    recordDevAudit({
      actor: currentUser?.email || 'Developer',
      action: 'FEATURE_FLAG_TOGGLE',
      category: 'flag',
      details: `Toggled flag '${key}' to ${updated[key]}`,
    });
    showToast(`ফিচার ফ্ল্যাগ '${key}' ${updated[key] ? 'চালু' : 'বন্ধ'} করা হয়েছে।`);
  }

  // Diagnostics Ping
  async function handlePingApi() {
    setIsPinging(true);
    const start = performance.now();
    try {
      const res = await fetch('/api/admin/users?limit=1', { cache: 'no-store' });
      const duration = Math.round(performance.now() - start);
      if (res.ok) {
        setApiPingMs(duration);
        showToast(`API রেসপন্স স্বাভাবিক (${duration}ms)`);
      } else {
        setApiPingMs(duration);
        showToast(`API রেসপন্স বিলম্বিত বা ত্রুটি (${res.status})`);
      }
    } catch {
      setApiPingMs(null);
      showToast('API সংযোগে ত্রুটি!');
    } finally {
      setIsPinging(false);
    }
  }

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return dbUsers.filter((u) => {
      // Role filter
      if (userRoleFilter === 'admin' && u.role !== 'admin' && u.role !== 'developer') return false;
      if (userRoleFilter === 'collector' && u.role !== 'collector') return false;
      if (userRoleFilter === 'citizen' && u.role !== 'citizen' && u.role !== 'partner') return false;

      // Search query
      if (!userSearchQuery.trim()) return true;
      const q = userSearchQuery.toLowerCase();
      return (
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.phone || '').includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.ward_id !== null && String(u.ward_id).includes(q))
      );
    });
  }, [dbUsers, userRoleFilter, userSearchQuery]);

  // Counts for tabs
  const adminCount = useMemo(() => dbUsers.filter((u) => u.role === 'admin' || u.role === 'developer').length, [dbUsers]);
  const collectorCount = useMemo(() => dbUsers.filter((u) => u.role === 'collector').length, [dbUsers]);
  const citizenCount = useMemo(() => dbUsers.filter((u) => u.role === 'citizen' || u.role === 'partner').length, [dbUsers]);

  const DEV_TABS: TabItem[] = [
    { key: 'users', labelBn: 'ইউজার ও অ্যাডমিন', labelEn: 'Users & RBAC', icon: Users, badge: dbUsers.length },
    { key: 'overview', labelBn: 'ওভারভিউ ও সুইচবোর্ড', labelEn: 'Overview & Flags', icon: Sliders },
    { key: 'requests', labelBn: 'নাগরিক রিকোয়েস্ট', labelEn: 'Citizen Stream', icon: MessageSquare, badge: 'Live' },
    { key: 'analytics', labelBn: 'অ্যানালিটিক্স ও ট্রাফিক', labelEn: 'Analytics', icon: Activity },
    { key: 'system', labelBn: 'সিস্টেম ও অডিট', labelEn: 'Diagnostics & Audit', icon: Terminal },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-slate-900 px-4 py-3 text-xs font-semibold text-emerald-300 shadow-2xl ring-1 ring-emerald-500/30 backdrop-blur animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Professional Header Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base tracking-tight">Clean Savar</span>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                  DEVELOPER CONSOLE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                সাভার পৌরসভা ডিজিটাল বর্জ্য ব্যবস্থাপনা অবকাঠামো
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Database Live Status Indicator */}
            <div
              onClick={loadDatabaseUsers}
              title="ক্লিক করে ডাটাবেজ রিফ্রেশ করুন"
              className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs text-emerald-300 cursor-pointer hover:bg-emerald-900/40 transition-colors"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[11px]">Supabase Live ({toBanglaDigits(dbUsers.length)} ইউজার)</span>
              <RefreshCw className={`h-3 w-3 ml-1 text-emerald-400 ${isLoadingUsers ? 'animate-spin' : ''}`} />
            </div>

            {/* Link to Municipal Admin (/admin) */}
            <Link
              href="/admin"
              className="hidden md:flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Users className="h-3.5 w-3.5 text-emerald-400" />
              <span>পৌর অ্যাডমিন প্যানেল</span>
            </Link>

            {/* Developer Session & Signout */}
            <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
              <div className="hidden lg:block text-right">
                <p className="text-xs font-semibold text-white truncate max-w-[150px]">
                  {currentUser?.name || 'Developer'}
                </p>
                <p className="text-[10px] font-mono text-emerald-400 truncate max-w-[150px]">
                  {currentUser?.email}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                title="লগআউট"
                className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:border-rose-900/50 hover:bg-rose-950/30 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">লগআউট</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="border-t border-slate-800/80 bg-slate-900/40 px-4 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto cs-admin-scrollbar py-2">
            {DEV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                      : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.labelBn}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`ml-0.5 rounded-full px-2 py-0.2 font-mono text-[10px] font-bold ${
                        isActive
                          ? 'bg-emerald-800 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {typeof tab.badge === 'number' ? toBanglaDigits(tab.badge) : tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* ========================================================================= */}
        {/* TAB 1: USERS & ADMIN RBAC (LIVE SUPABASE DATABASE DIRECTORY) */}
        {/* ========================================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Top Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div
                onClick={() => setUserRoleFilter('all')}
                className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                  userRoleFilter === 'all'
                    ? 'border-emerald-500/60 bg-emerald-950/20 shadow-lg shadow-emerald-950/30'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">মোট ইউজার</span>
                  <Users className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="mt-2 text-2xl font-bold font-mono text-white">
                  {toBanglaDigits(dbUsers.length)}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">PostgreSQL লাইভ ডাটাবেজ</p>
              </div>

              <div
                onClick={() => setUserRoleFilter('admin')}
                className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                  userRoleFilter === 'admin'
                    ? 'border-rose-500/60 bg-rose-950/20 shadow-lg shadow-rose-950/30'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-rose-300 font-medium">পৌর ও সিস্টেম অ্যাডমিন</span>
                  <ShieldCheck className="h-4 w-4 text-rose-400" />
                </div>
                <div className="mt-2 text-2xl font-bold font-mono text-rose-300">
                  {toBanglaDigits(adminCount)}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">অনুমোদিত অ্যাডমিন রোল</p>
              </div>

              <div
                onClick={() => setUserRoleFilter('collector')}
                className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                  userRoleFilter === 'collector'
                    ? 'border-blue-500/60 bg-blue-950/20 shadow-lg shadow-blue-950/30'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-300 font-medium">বর্জ্য সংগ্রাহক</span>
                  <Truck className="h-4 w-4 text-blue-400" />
                </div>
                <div className="mt-2 text-2xl font-bold font-mono text-blue-300">
                  {toBanglaDigits(collectorCount)}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">ড্রাইভার ও ক্লিনার স্টাফ</p>
              </div>

              <div
                onClick={() => setUserRoleFilter('citizen')}
                className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                  userRoleFilter === 'citizen'
                    ? 'border-purple-500/60 bg-purple-950/20 shadow-lg shadow-purple-950/30'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-purple-300 font-medium">নাগরিক ও পার্টনার</span>
                  <Globe className="h-4 w-4 text-purple-400" />
                </div>
                <div className="mt-2 text-2xl font-bold font-mono text-purple-300">
                  {toBanglaDigits(citizenCount)}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">পৌরবাসী ও রিসাইক্লার</p>
              </div>
            </div>

            {/* Filter and Action Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('all')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    userRoleFilter === 'all'
                      ? 'bg-slate-100 text-slate-900'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  সকল ({toBanglaDigits(dbUsers.length)})
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('admin')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    userRoleFilter === 'admin'
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  অ্যাডমিন ({toBanglaDigits(adminCount)})
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('collector')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    userRoleFilter === 'collector'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  সংগ্রাহক ({toBanglaDigits(collectorCount)})
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('citizen')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    userRoleFilter === 'citizen'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  নাগরিক ({toBanglaDigits(citizenCount)})
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={loadDatabaseUsers}
                  disabled={isLoadingUsers}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-emerald-400 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                  <span>সিঙ্ক</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddUserModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500 transition-colors cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>+ নতুন ইউজার / অ্যাডমিন</span>
                </button>
              </div>
            </div>

            {/* Live Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="নাম, ফোন নম্বর, ইমেইল বা ওয়ার্ড দিয়ে খুঁজুন (যেমন: Azad, 01733, rafi, ইত্যাদি)..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Database Users Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 shadow-xl">
              {isLoadingUsers ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <RefreshCw className="h-6 w-6 animate-spin text-emerald-400 mb-2" />
                  <p className="text-xs">PostgreSQL ডাটাবেজ থেকে ইউজার তথ্য লোড হচ্ছে...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Users className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-300">কোনো ইউজার পাওয়া যায়নি</p>
                  <p className="text-xs text-slate-500 mt-1">
                    সার্চ কুয়েরি বা ফিল্টার পরিবর্তন করুন অথবা নতুন ইউজার তৈরি করুন।
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto cs-admin-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 bg-slate-950/80 font-mono uppercase text-slate-400">
                      <tr>
                        <th className="px-4 py-3">ব্যবহারকারী</th>
                        <th className="px-4 py-3">মোবাইল নম্বর</th>
                        <th className="px-4 py-3">বর্তমান ভূমিকা (Role)</th>
                        <th className="px-4 py-3">ওয়ার্ড</th>
                        <th className="px-4 py-3">নিবন্ধন তারিখ</th>
                        <th className="px-4 py-3 text-right">১-ক্লিক ভূমিকা পরিবর্তন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                      {filteredUsers.map((user) => {
                        const isUpdating = userUpdatingId === user.id;
                        return (
                          <tr key={user.id} className="hover:bg-slate-900/60 transition-colors">
                            {/* User details */}
                            <td className="px-4 py-3">
                              <div className="font-sans font-bold text-white text-sm">
                                {user.full_name || 'নাম নেই'}
                              </div>
                              {user.email && (
                                <div className="text-[11px] font-mono text-slate-400 truncate max-w-[200px]">
                                  {user.email}
                                </div>
                              )}
                            </td>

                            {/* Phone and verification */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 font-bold text-white">
                                <span>{normalizeBdPhone(user.phone) || user.phone}</span>
                                {user.is_verified && (
                                  <span title="যাচাইকৃত">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Role Badge */}
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                  user.role === 'admin' || user.role === 'developer'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : user.role === 'collector'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    : user.role === 'partner'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                                }`}
                              >
                                {user.role === 'admin' ? (
                                  <ShieldCheck className="h-3 w-3 text-rose-400" />
                                ) : user.role === 'collector' ? (
                                  <Truck className="h-3 w-3 text-blue-400" />
                                ) : (
                                  <UserCheck className="h-3 w-3 text-slate-400" />
                                )}
                                <span className="uppercase">{user.role}</span>
                              </span>
                            </td>

                            {/* Ward */}
                            <td className="px-4 py-3 font-sans">
                              {user.ward_id ? (
                                <span className="inline-flex rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 font-mono">
                                  ওয়ার্ড {toBanglaDigits(user.ward_id)}
                                </span>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>

                            {/* Created Date */}
                            <td className="px-4 py-3 text-[11px] text-slate-400">
                              {user.created_at
                                ? new Date(user.created_at).toLocaleDateString('bn-BD', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : 'সম্প্রতি'}
                            </td>

                            {/* 1-Click Role Changer Actions */}
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {isUpdating ? (
                                  <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                    <span>আপডেট হচ্ছে...</span>
                                  </div>
                                ) : (
                                  <>
                                    {user.role !== 'admin' && (
                                      <button
                                        type="button"
                                        onClick={() => handleRoleChange(user, 'admin')}
                                        className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                                        title="পৌর অ্যাডমিন অনুমতি প্রদান করুন"
                                      >
                                        + অ্যাডমিন
                                      </button>
                                    )}

                                    {user.role !== 'collector' && (
                                      <button
                                        type="button"
                                        onClick={() => handleRoleChange(user, 'collector')}
                                        className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-300 hover:bg-blue-500/20 transition-colors cursor-pointer"
                                        title="বর্জ্য সংগ্রাহক হিসেবে নির্ধারণ করুন"
                                      >
                                        + সংগ্রাহক
                                      </button>
                                    )}

                                    {user.role !== 'citizen' && (
                                      <button
                                        type="button"
                                        onClick={() => handleRoleChange(user, 'citizen')}
                                        className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                                        title="সাধারণ নাগরিক রোল-এ ফিরিয়ে নিন"
                                      >
                                        নাগরিক
                                      </button>
                                    )}
                                  </>
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
            </div>

            {/* Add User Modal */}
            {showAddUserModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in">
                <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-emerald-400" />
                      <h3 className="font-bold text-white text-base">নতুন ইউজার / অ্যাডমিন অনুমোদন</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddUserModal(false)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        মোবাইল নম্বর <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={newUserPhone}
                        onChange={(e) => setNewUserPhone(e.target.value)}
                        placeholder="যেমন: 01711-240100"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white font-mono placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        পূর্ণ নাম <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="যেমন: মো. হাসান আলী"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        ইমেইল (ঐচ্ছিক)
                      </label>
                      <input
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="user@example.com"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white font-mono placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          ভূমিকা (Role)
                        </label>
                        <select
                          value={newUserRole}
                          onChange={(e) =>
                            setNewUserRole(
                              e.target.value as 'admin' | 'collector' | 'citizen' | 'partner',
                            )
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                        >
                          <option value="admin">পৌর অ্যাডমিন (Admin)</option>
                          <option value="collector">বর্জ্য সংগ্রাহক (Collector)</option>
                          <option value="citizen">নাগরিক (Citizen)</option>
                          <option value="partner">পার্টনার (Partner)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          ওয়ার্ড নম্বর
                        </label>
                        <select
                          value={newUserWard}
                          onChange={(e) => setNewUserWard(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                        >
                          <option value="">কোনো ওয়ার্ড নেই</option>
                          {SAVAR_WARDS_SEED.map((w) => (
                            <option key={w.id} value={w.id}>
                              ওয়ার্ড {toBanglaDigits(w.id)} - {w.name_bn}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddUserModal(false)}
                        className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white"
                      >
                        বাতিল
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingUser}
                        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 cursor-pointer"
                      >
                        {isSubmittingUser && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                        <span>ডাটাবেজে সংরক্ষণ করুন</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: OVERVIEW & MASTER SWITCHBOARD (CLEAN & PROFESSIONAL) */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* System Infrastructure Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">PostgreSQL Database</span>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <div className="mt-2 text-lg font-bold text-white font-mono">Supabase Managed</div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {toBanglaDigits(dbUsers.length)} জন নিবন্ধিত ইউজার সংরক্ষিত
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Google Cloud Auth</span>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <div className="mt-2 text-lg font-bold text-white font-mono">OAuth 2.0 Active</div>
                <p className="mt-1 text-[11px] text-slate-500">ডেভেলপার প্রিভিলেজ সুরক্ষায় চালু</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Mobile APK OTA</span>
                  <span className="flex h-2 w-2 rounded-full bg-blue-400" />
                </div>
                <div className="mt-2 text-lg font-bold text-white font-mono">v{apkConfig.versionName}</div>
                <p className="mt-1 text-[11px] text-slate-500 truncate">{apkConfig.downloadUrl}</p>
              </div>
            </div>

            {/* Feature Flags Switchboard */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-emerald-400" />
                    সুইচবোর্ড ও প্ল্যাটফর্ম ফিচার কন্ট্রোল
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    এক ক্লিকে প্ল্যাটফর্ম ফিচার, ইমার্জেন্সি মোড ও এসএমএস গেটওয়ে চালু/বন্ধ করুন।
                  </p>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={flagSearchQuery}
                    onChange={(e) => setFlagSearchQuery(e.target.value)}
                    placeholder="ফিচার খুঁজুন..."
                    className="rounded-xl border border-slate-700 bg-slate-950 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    key: 'emergencyWasteMode' as keyof DevFeatureFlags,
                    label: 'জরুরি বর্জ্য অপসারণ প্রটোকল (Emergency Waste Mode)',
                    desc: 'সাভার পৌরসভা বিশেষ ড্রাইভ চলাকালে অগ্রাধিকার ভিত্তিতে রিকোয়েস্ট অ্যাকসেপ্ট করবে।',
                  },
                  {
                    key: 'citizenAutoDispatch' as keyof DevFeatureFlags,
                    label: 'নাগরিক পিকআপ অটো-ডেসপ্যাচ (Auto-Dispatch)',
                    desc: 'নিকটস্থ সংগ্রাহককে স্বয়ংক্রিয়ভাবে নোটিফিকেশন পাঠিয়ে অ্যাসাইন করবে।',
                  },
                  {
                    key: 'smsGatewaySimulated' as keyof DevFeatureFlags,
                    label: 'এসএমএস ওটিপি সিমুলেশন মোড (SMS Gateway Simulation)',
                    desc: 'টাকা খরচ না করে ভার্চুয়াল ওটিপি দিয়ে সরাসরি লগইন ভেরিফাই করার সুবিধা।',
                  },
                  {
                    key: 'maintenanceBannerActive' as keyof DevFeatureFlags,
                    label: 'সিস্টেম মেইনটেন্যান্স ব্যানার (Maintenance Banner)',
                    desc: 'ওয়েবসাইট ও মোবাইল অ্যাপের শীর্ষে সতর্কতা বার্তা প্রদর্শন করবে।',
                  },
                  {
                    key: 'offlineSyncEnabled' as keyof DevFeatureFlags,
                    label: 'অফলাইন ডাটা সিঙ্ক (Offline Queue)',
                    desc: 'নেটওয়ার্ক ড্রপ হলেও সংগ্রাহকদের লোকাল রিপোর্ট জমা রাখবে।',
                  },
                  {
                    key: 'geoFencingEnforcement' as keyof DevFeatureFlags,
                    label: 'সাভার পৌরসীমা জিওফেন্সিং (Geofence Enforcement)',
                    desc: 'পৌর এলাকার বাইরে থেকে আসা বর্জ্যের রিপোর্ট স্বয়ংক্রিয়ভাবে ফিল্টার করবে।',
                  },
                ]
                  .filter(
                    (item) =>
                      !flagSearchQuery.trim() ||
                      item.label.toLowerCase().includes(flagSearchQuery.toLowerCase()) ||
                      item.desc.toLowerCase().includes(flagSearchQuery.toLowerCase()),
                  )
                  .map((item) => {
                    const isEnabled = Boolean(flags[item.key]);
                    return (
                      <div
                        key={item.key}
                        onClick={() => handleToggleFlag(item.key)}
                        className={`flex items-start justify-between gap-3 rounded-xl border p-4 cursor-pointer transition-all ${
                          isEnabled
                            ? 'border-emerald-500/40 bg-emerald-950/20'
                            : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-white">{item.label}</p>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                        </div>
                        <div
                          className={`h-6 w-11 rounded-full p-1 transition-colors shrink-0 ${
                            isEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                          }`}
                        >
                          <div
                            className={`h-4 w-4 rounded-full bg-white transition-transform ${
                              isEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CITIZEN INGESTION FEED */}
        {/* ========================================================================= */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            <DevCitizenRequestsTab />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: ANALYTICS & TRAFFIC */}
        {/* ========================================================================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            {/* Sub Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setAnalyticsSubTab('traffic')}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  analyticsSubTab === 'traffic'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                ভিজিটর ও ট্রাফিক
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsSubTab('downloads')}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  analyticsSubTab === 'downloads'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                মোবাইল অ্যাপ ডাউনলোড
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsSubTab('logins')}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  analyticsSubTab === 'logins'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                লগইন ও সেশন জিও
              </button>
            </div>

            {analyticsSubTab === 'traffic' && (
              <DevTrafficTab
                visitorLogs={visitorLogs}
                trafficSummary={trafficSummary}
                onSimulateVisit={() => {
                  simulateDevTrafficVisit();
                  setVisitorLogs(getDevVisitorLogs());
                  setTrafficSummary(getDevTrafficSummary());
                }}
                onClearLogs={() => {
                  clearDevVisitorLogs();
                  setVisitorLogs([]);
                  setTrafficSummary(getDevTrafficSummary());
                }}
                showToast={showToast}
              />
            )}

            {analyticsSubTab === 'downloads' && (
              <DevDownloadsTab
                downloadEvents={downloadEvents}
                userDownloadStats={userDownloadStats}
                downloadSummary={downloadSummary}
                onSimulateDownload={() => {
                  simulateDevDownload();
                  setDownloadEvents(getDevDownloadEvents());
                  setUserDownloadStats(getDevUserDownloadStats());
                  setDownloadSummary(getDevDownloadSummary());
                }}
                onClearDownloads={() => {
                  clearDevDownloadLogs();
                  setDownloadEvents([]);
                  setUserDownloadStats([]);
                  setDownloadSummary(getDevDownloadSummary());
                }}
                showToast={showToast}
              />
            )}

            {analyticsSubTab === 'logins' && (
              <DevLoginsTab
                loginEvents={loginEvents}
                userLoginStats={userLoginStats}
                loginSummary={loginSummary}
                onSimulateLogin={() => {
                  simulateDevLogin();
                  setLoginEvents(getDevLoginEvents());
                  setUserLoginStats(getDevUserLoginStats());
                  setLoginSummary(getDevLoginSummary());
                }}
                onClearLogins={() => {
                  clearDevLoginLogs();
                  setLoginEvents([]);
                  setUserLoginStats([]);
                  setLoginSummary(getDevLoginSummary());
                }}
                showToast={showToast}
              />
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: DIAGNOSTICS & SECURITY AUDIT */}
        {/* ========================================================================= */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            {/* API Ping & OTP Tester */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  API ও ডাটাবেজ লেটেন্সি টেস্ট
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Supabase PostgreSQL ও Next.js এজ রাউটের বর্তমান রেসপন্স গতি পরিমাপ করুন।
                </p>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePingApi}
                    disabled={isPinging}
                    className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-white transition cursor-pointer"
                  >
                    {isPinging ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    <span>লেটেন্সি পরিমাপ করুন</span>
                  </button>

                  {apiPingMs !== null && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 font-mono text-xs text-emerald-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span>{apiPingMs} ms</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-amber-400" />
                  OTP ও SMS টেস্ট গেটওয়ে
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  যে কোনো ফোন নম্বরের জন্য টেস্ট ওটিপি কোড তৈরি করুন।
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="tel"
                    value={customOtpPhone}
                    onChange={(e) => setCustomOtpPhone(e.target.value)}
                    placeholder="01711-240100"
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const res = generateDevSimulatedOtp(customOtpPhone);
                      showToast(`ওটিপি কোড: ${res.otp} (${res.phone})`);
                    }}
                    className="rounded-xl bg-amber-600 hover:bg-amber-500 px-3.5 py-2 text-xs font-semibold text-white transition cursor-pointer"
                  >
                    OTP জেনারেট
                  </button>
                </div>
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h4 className="font-bold text-white text-base flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-emerald-400" />
                    নিরাপত্তা অডিট ট্রেইল (Security Audit Trail)
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    কনসোলে সংঘটিত সকল অ্যাডমিন ও সিস্টেম কার্যক্রমের অপরিবর্তনযোগ্য লগ।
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    placeholder="অডিট খুঁজুন..."
                    className="rounded-xl border border-slate-700 bg-slate-950 py-1.5 px-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      clearDevAuditLogs();
                      setAuditLogs([]);
                      showToast('অডিট লগ সাফ করা হয়েছে।');
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs text-slate-300 transition"
                  >
                    সাফ করুন
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto cs-admin-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-950 font-mono uppercase text-slate-400">
                    <tr>
                      <th className="px-3.5 py-2.5">সময়</th>
                      <th className="px-3.5 py-2.5">কর্তা (Actor)</th>
                      <th className="px-3.5 py-2.5">অ্যাকশন</th>
                      <th className="px-3.5 py-2.5">বিবরণ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    {auditLogs
                      .filter(
                        (a) =>
                          !auditSearchQuery.trim() ||
                          a.action.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
                          a.actor.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
                          a.details.toLowerCase().includes(auditSearchQuery.toLowerCase()),
                      )
                      .slice(0, 30)
                      .map((log) => (
                        <tr key={log.id} className="hover:bg-slate-900/50">
                          <td className="px-3.5 py-2.5 text-slate-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString('bn-BD')}
                          </td>
                          <td className="px-3.5 py-2.5 text-emerald-400 font-bold">{log.actor}</td>
                          <td className="px-3.5 py-2.5 text-white font-bold">{log.action}</td>
                          <td className="px-3.5 py-2.5 text-slate-300 font-sans">{log.details}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DevAdminPage() {
  return (
    <DevAuthGate>
      <DevAdminConsoleContent />
    </DevAuthGate>
  );
}
