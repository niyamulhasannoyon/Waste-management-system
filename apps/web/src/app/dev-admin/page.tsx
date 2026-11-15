'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  Download,
  Flame,
  Globe,
  KeyRound,
  Lock,
  LogOut,
  Menu,
  MessageSquare,
  Play,
  Plus,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sliders,
  Sparkles,
  Terminal,
  Trash2,
  Truck,
  Users,
  X,
  Zap,
} from 'lucide-react';

import { DevAuthGate, useDevAuthSession } from '@/components/dev/DevAuthGate';
import { DevTrafficTab } from '@/components/dev/DevTrafficTab';
import { DevDownloadsTab } from '@/components/dev/DevDownloadsTab';
import { DevLoginsTab } from '@/components/dev/DevLoginsTab';
import { DevCitizenRequestsTab } from '@/components/dev/DevCitizenRequestsTab';
import {
  DevFeatureFlags,
  DevUserAccount,
  DevOtpRecord,
  DevVehicleSim,
  DevMarketRate,
  DevAuditEvent,
  DevVisitorLog,
  DevTrafficSummary,
  DevDownloadEvent,
  DevUserDownloadStat,
  DevDownloadSummary,
  DevLoginEvent,
  DevUserLoginStat,
  DevLoginSummary,
  ExtendedRole,
  ApprovedAdminRecord,
  getApprovedAdminRecords,
  approveAdminUser,
  revokeAdminUser,
  getDevFeatureFlags,
  saveDevFeatureFlags,
  getDevUsers,
  updateDevUserRole,
  addNewDevUser,
  getDevOtps,
  generateDevSimulatedOtp,
  getDevVehicles,
  updateDevVehicle,
  tickSimulateVehicleMovements,
  getDevMarketRates,
  updateDevMarketRate,
  getDevApkConfig,
  getDevAuditLogs,
  clearDevAuditLogs,
  recordDevAudit,
  resetDevConsoleToDefaults,
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
import { toBanglaDigits } from '@/lib/utils';

type DevTabKey =
  | 'switchboard'
  | 'citizen_requests'
  | 'traffic'
  | 'downloads'
  | 'logins'
  | 'users'
  | 'apk'
  | 'telemetry'
  | 'fleet'
  | 'otp'
  | 'pricing'
  | 'wards'
  | 'sandbox'
  | 'audit';

interface TabItem {
  key: DevTabKey;
  labelBn: string;
  labelEn: string;
  icon: React.ElementType;
  badge?: string;
}

const DEV_TABS: TabItem[] = [
  { key: 'switchboard', labelBn: 'সুইচবোর্ড ও কন্ট্রোল', labelEn: 'Master Switchboard', icon: Sliders },
  { key: 'citizen_requests', labelBn: 'নাগরিক রিকোয়েস্ট ও রেসপন্স', labelEn: 'Citizen Ingestion Feed', icon: MessageSquare, badge: 'Live Stream' },
  { key: 'traffic', labelBn: 'ভিজিটর ও ট্রাফিক', labelEn: 'Traffic & Visitors', icon: Activity, badge: 'Live' },
  { key: 'downloads', labelBn: 'ডাউনলোড ট্র্যাকার', labelEn: 'Download Analytics', icon: Download, badge: 'Hot' },
  { key: 'logins', labelBn: 'লগইন ও সেশন জিও', labelEn: 'Login Geolocation', icon: ShieldCheck },
  { key: 'users', labelBn: 'ইউজার ও রোল (RBAC)', labelEn: 'User RBAC Matrix', icon: Users },
  { key: 'apk', labelBn: 'মোবাইল APK ও রিলিজ', labelEn: 'Mobile App & OTA', icon: Smartphone },
  { key: 'telemetry', labelBn: 'ইনফ্রাস্ট্রাকচার হেলথ', labelEn: 'Telemetry & Cloud', icon: Server },
  { key: 'fleet', labelBn: 'ফ্লিট ও GPS সিমুলেটর', labelEn: 'Fleet GPS Simulator', icon: Truck },
  { key: 'otp', labelBn: 'OTP ও SMS ডিবাগার', labelEn: 'OTP & Rate Limits', icon: KeyRound },
  { key: 'pricing', labelBn: 'বর্জ্য মার্কেট ও অকশন', labelEn: 'Marketplace Pricing', icon: Zap },
  { key: 'wards', labelBn: 'ওয়ার্ড জিওফেন্স ইন্সপেক্টর', labelEn: 'Wards & Geofencing', icon: Globe },
  { key: 'sandbox', labelBn: 'স্যান্ডবক্স সিডার ও ক্লিন', labelEn: 'Data Seeder & Purge', icon: Database },
  { key: 'audit', labelBn: 'লাইভ অডিট ট্রেইল', labelEn: 'Security Audit Log', icon: Terminal },
];

const CORE_TABS: DevTabKey[] = [
  'switchboard',
  'citizen_requests',
  'traffic',
  'downloads',
  'logins',
];

const SYSTEM_TABS: DevTabKey[] = [
  'telemetry',
  'users',
  'otp',
  'fleet',
  'pricing',
  'wards',
  'sandbox',
  'apk',
  'audit',
];

export default function DevAdminPage() {
  return (
    <DevAuthGate>
      <DevAdminConsoleContent />
    </DevAuthGate>
  );
}

function DevAdminConsoleContent() {
  const { currentUser, handleSignOut } = useDevAuthSession();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [flagSearchQuery, setFlagSearchQuery] = useState('');
  const [flagFilterStatus, setFlagFilterStatus] = useState<'all' | 'active' | 'paused'>('all');

  const [activeTab, setActiveTab] = useState<DevTabKey>('switchboard');
  const [flags, setFlags] = useState<DevFeatureFlags>(getDevFeatureFlags());
  const [users, setUsers] = useState<DevUserAccount[]>(getDevUsers());
  const [otps, setOtps] = useState<DevOtpRecord[]>(getDevOtps());
  const [vehicles, setVehicles] = useState<DevVehicleSim[]>(getDevVehicles());
  const [marketRates, setMarketRates] = useState<DevMarketRate[]>(getDevMarketRates());
  const [apkConfig] = useState(getDevApkConfig());
  const [auditLogs, setAuditLogs] = useState<DevAuditEvent[]>(getDevAuditLogs());

  // Real-time Traffic, Download and Login States
  const [visitorLogs, setVisitorLogs] = useState<DevVisitorLog[]>(getDevVisitorLogs());
  const [trafficSummary, setTrafficSummary] = useState<DevTrafficSummary>(getDevTrafficSummary());
  const [downloadEvents, setDownloadEvents] = useState<DevDownloadEvent[]>(getDevDownloadEvents());
  const [userDownloadStats, setUserDownloadStats] = useState<DevUserDownloadStat[]>(getDevUserDownloadStats());
  const [downloadSummary, setDownloadSummary] = useState<DevDownloadSummary>(getDevDownloadSummary());
  const [loginEvents, setLoginEvents] = useState<DevLoginEvent[]>(getDevLoginEvents());
  const [userLoginStats, setUserLoginStats] = useState<DevUserLoginStat[]>(getDevUserLoginStats());
  const [loginSummary, setLoginSummary] = useState<DevLoginSummary>(getDevLoginSummary());

  // Notification Toast / Flash message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search states
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  // OTP generator state
  const [customOtpPhone, setCustomOtpPhone] = useState('01715-883210');
  const [rateLimitBusterPhone, setRateLimitBusterPhone] = useState('01715-883210');

  // Real-time API ping state
  const [apiPingMs, setApiPingMs] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  // New User Dialog State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<ExtendedRole>('citizen');

  const [adminApprovals, setAdminApprovals] = useState<ApprovedAdminRecord[]>(getApprovedAdminRecords());
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminName, setNewAdminName] = useState('');

  useEffect(() => {
    const handleApprovalsChanged = () => {
      setAdminApprovals(getApprovedAdminRecords());
    };
    window.addEventListener('cs:admin-approvals-changed', handleApprovalsChanged);
    return () => {
      window.removeEventListener('cs:admin-approvals-changed', handleApprovalsChanged);
    };
  }, []);

  useEffect(() => {
    const handleTrafficChanged = () => {
      setVisitorLogs(getDevVisitorLogs());
      setTrafficSummary(getDevTrafficSummary());
    };
    const handleDownloadsChanged = () => {
      setDownloadEvents(getDevDownloadEvents());
      setUserDownloadStats(getDevUserDownloadStats());
      setDownloadSummary(getDevDownloadSummary());
    };
    const handleLoginsChanged = () => {
      setLoginEvents(getDevLoginEvents());
      setUserLoginStats(getDevUserLoginStats());
      setLoginSummary(getDevLoginSummary());
    };

    window.addEventListener('cs:dev-traffic-changed', handleTrafficChanged);
    window.addEventListener('cs:dev-downloads-changed', handleDownloadsChanged);
    window.addEventListener('cs:dev-logins-changed', handleLoginsChanged);

    return () => {
      window.removeEventListener('cs:dev-traffic-changed', handleTrafficChanged);
      window.removeEventListener('cs:dev-downloads-changed', handleDownloadsChanged);
      window.removeEventListener('cs:dev-logins-changed', handleLoginsChanged);
    };
  }, []);

  const handleSimulateTrafficVisit = () => {
    const v = simulateDevTrafficVisit();
    showToast(`সিমুলেটেড ভিজিটর যুক্ত করা হয়েছে: ${v.userName} (${v.path})`);
  };

  const handleClearTrafficLogs = () => {
    if (confirm('আপনি কি নিশ্চিত যে সমস্ত ভিজিটর ট্রাফিক লগ মুছে ফেলতে চান?')) {
      clearDevVisitorLogs();
      setVisitorLogs([]);
      setTrafficSummary(getDevTrafficSummary());
      showToast('ভিজিটর ট্রাফিক লগ মুছে ফেলা হয়েছে!');
    }
  };

  const handleSimulateDownload = () => {
    const d = simulateDevDownload();
    showToast(`টেস্ট ডাউনলোড রেকর্ড সম্পন্ন: ${d.downloaderName} (${d.fileName})`);
  };

  const handleClearDownloads = () => {
    if (confirm('আপনি কি নিশ্চিত যে সমস্ত ডাউনলোড হিস্ট্রি ও কাউন্টার রিসেট করতে চান?')) {
      clearDevDownloadLogs();
      setDownloadEvents([]);
      setUserDownloadStats([]);
      setDownloadSummary(getDevDownloadSummary());
      showToast('ডাউনলোড অডিট হিস্ট্রি রিসেট করা হয়েছে!');
    }
  };

  const handleSimulateLogin = () => {
    const l = simulateDevLogin();
    showToast(`টেস্ট লগইন রেকর্ড সম্পন্ন: ${l.userName} (${l.location})`);
  };

  const handleClearLogins = () => {
    if (confirm('আপনি কি নিশ্চিত যে সমস্ত লগইন অডিট রেকর্ড মুছে ফেলতে চান?')) {
      clearDevLoginLogs();
      setLoginEvents([]);
      setUserLoginStats([]);
      setLoginSummary(getDevLoginSummary());
      showToast('লগইন অডিট রেকর্ড মুছে ফেলা হয়েছে!');
    }
  };

  const handleApproveAdmin = (phone: string, name?: string, email?: string) => {
    const updated = approveAdminUser(phone, name, email);
    setAdminApprovals([...updated]);
    showToast(`পৌর অ্যাডমিন অনুমোদন নিশ্চিত করা হয়েছে: ${phone}`);
  };

  const handleRevokeAdmin = (phone: string) => {
    const updated = revokeAdminUser(phone);
    setAdminApprovals([...updated]);
    showToast(`পৌর অ্যাডমিন অনুমোদন প্রত্যাহার করা হয়েছে: ${phone}`);
  };

  const handleAddDirectAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPhone.trim()) return;
    const updated = approveAdminUser(newAdminPhone.trim(), newAdminName.trim() || undefined);
    setAdminApprovals([...updated]);
    setNewAdminPhone('');
    setNewAdminName('');
    showToast(`নতুন পৌর অ্যাডমিন অনুমোদন যোগ করা হয়েছে!`);
  };

  // Periodic GPS simulation tick if enabled
  useEffect(() => {
    if (!flags.simulateGpsMovement) return;
    const interval = setInterval(() => {
      const moved = tickSimulateVehicleMovements();
      setVehicles([...moved]);
    }, 4000);
    return () => clearInterval(interval);
  }, [flags.simulateGpsMovement]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Ping backend API
  const pingBackend = useCallback(async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      const res = await fetch('https://clean-savar-api.onrender.com/api/v1/wards', {
        method: 'GET',
        cache: 'no-store',
      });
      const end = performance.now();
      if (res.ok) {
        setApiPingMs(Math.round(end - start));
        showToast(`Render API রেসপন্স সাকসেসফুল (${Math.round(end - start)}ms)`);
      } else {
        setApiPingMs(999);
      }
    } catch {
      setApiPingMs(null);
      showToast('Render API অফলাইন বা কানেকশন এরর!');
    } finally {
      setIsPinging(false);
    }
  }, [showToast]);

  useEffect(() => {
    pingBackend();
  }, [pingBackend]);

  // Lock Console Handler
  function handleLockConsole() {
    try {
      sessionStorage.removeItem('cs_dev_console_unlocked_session');
      window.location.reload();
    } catch {
      window.location.reload();
    }
  }

  // Toggle Feature Flag
  function handleToggleFlag(key: keyof DevFeatureFlags) {
    const newVal = !flags[key];
    const updated = saveDevFeatureFlags({ [key]: newVal });
    setFlags(updated);
    showToast(`ফ্ল্যাগ আপডেট: ${String(key)} ➔ ${newVal ? 'ON' : 'OFF'}`);
  }

  // Role Promotion Handler
  function handleRoleChange(userId: string, role: ExtendedRole) {
    const updated = updateDevUserRole(userId, role);
    setUsers([...updated]);
    setAuditLogs(getDevAuditLogs());
    showToast(`ইউজার রোল সফলভাবে '${role}'-এ পরিবর্তিত হয়েছে।`);
  }

  // Generate Simulated OTP
  function handleGenerateOtp() {
    if (!customOtpPhone.trim()) return;
    const rec = generateDevSimulatedOtp(customOtpPhone.trim());
    setOtps(getDevOtps());
    setAuditLogs(getDevAuditLogs());
    showToast(`ইনস্ট্যান্ট OTP তৈরি হয়েছে: ${rec.otp} (${rec.phone})`);
  }

  // Rate Limit Reset
  function handleResetRateLimit() {
    recordDevAudit({
      actor: 'SuperDeveloper (Console)',
      action: 'CLEAR_RATE_LIMITS',
      category: 'security',
      details: `Reset throttles for target: ${rateLimitBusterPhone}`,
    });
    setAuditLogs(getDevAuditLogs());
    showToast(`টেলিফোন ${rateLimitBusterPhone}-এর জন্য রেট লিমিট কুলডাউন ক্লিয়ার করা হয়েছে।`);
  }

  // Add User
  function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUserPhone.trim()) return;
    const updated = addNewDevUser({
      fullName: newUserName.trim() || 'নতুন ব্যবহারকারী',
      phone: newUserPhone.trim(),
      role: newUserRole,
      wardId: 1,
      isVerified: true,
    });
    setUsers([...updated]);
    setAuditLogs(getDevAuditLogs());
    setShowAddUserModal(false);
    setNewUserName('');
    setNewUserPhone('');
    showToast(`নতুন ব্যবহারকারী তৈরি হয়েছে (${newUserPhone})`);
  }

  // Seed sample data
  function handleInjectSampleData() {
    recordDevAudit({
      actor: 'SuperDeveloper (Console)',
      action: 'INJECT_SANDBOX_SEED',
      category: 'seeder',
      details: 'Injected 5 synthetic dump hotspots & 5 citizen pickup requests to test database',
    });
    setAuditLogs(getDevAuditLogs());
    showToast('৫টি সিন্থেটিক ডাম্প রিপোর্ট এবং ৫টি পিকআপ স্যান্ডবক্সে ইনজেক্ট করা হয়েছে!');
  }

  // Trigger PII Purge
  function handleTriggerPurge() {
    recordDevAudit({
      actor: 'SuperDeveloper (Console)',
      action: 'TRIGGER_RETENTION_PURGE',
      category: 'purge',
      details: 'Invoked POST /admin/retention/purge on completed tasks older than 90 days',
    });
    setAuditLogs(getDevAuditLogs());
    showToast('ডাটাবেস PII রিটেনশন পার্জ কমান্ড সফলভাবে রান হয়েছে।');
  }

  // Reset Console
  function handleResetAll() {
    if (confirm('আপনি কি নিশ্চিত যে সমস্ত ডেভ-কনসোল ও ফ্ল্যাগ ডিফল্ট অবস্থায় ফিরিয়ে নিতে চান?')) {
      resetDevConsoleToDefaults();
      setFlags(getDevFeatureFlags());
      setUsers(getDevUsers());
      setOtps(getDevOtps());
      setVehicles(getDevVehicles());
      setMarketRates(getDevMarketRates());
      setAuditLogs(getDevAuditLogs());
      setVisitorLogs(getDevVisitorLogs());
      setTrafficSummary(getDevTrafficSummary());
      setDownloadEvents(getDevDownloadEvents());
      setUserDownloadStats(getDevUserDownloadStats());
      setDownloadSummary(getDevDownloadSummary());
      setLoginEvents(getDevLoginEvents());
      setUserLoginStats(getDevUserLoginStats());
      setLoginSummary(getDevLoginSummary());
      showToast('ডেভেলপার কনসোল সম্পূর্ণ রিসেট করা হয়েছে!');
    }
  }

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return users;
    const q = userSearchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.phone.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    );
  }, [users, userSearchQuery]);

  const filteredAudits = useMemo(() => {
    if (!auditSearchQuery.trim()) return auditLogs;
    const q = auditSearchQuery.toLowerCase();
    return auditLogs.filter(
      (a) =>
        a.action.toLowerCase().includes(q) ||
        a.details.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    );
  }, [auditLogs, auditSearchQuery]);

  const GRID_FLAGS = useMemo(
    () => [
      {
        key: 'enableDemoMode' as const,
        flagName: 'FLAG: ENABLE_DEMO_MODE',
        title: 'অফলাইন ডেমো প্রিভিউ (Citizen & Staff Demo)',
        desc: "লগইন স্ক্রিনে 'নাগরিক ডেমো' ও 'কর্মী ডেমো' বাটন দৃশ্যমান রাখবে যাতে সার্ভারহীন টেস্ট করা যায়।",
        active: flags.enableDemoMode,
        statusText: flags.enableDemoMode ? 'STATUS: ENABLED (সক্রিয়)' : 'STATUS: DISABLED (বন্ধ)',
        badgeColor: flags.enableDemoMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400',
        activeColor: 'bg-emerald-500',
      },
      {
        key: 'strictOtp' as const,
        flagName: 'FLAG: STRICT_OTP_ENFORCEMENT',
        title: 'কঠোর লাইভ OTP যাচাই',
        desc: 'অন থাকলে কোনো টেস্ট বাইপাস অনুমোদন করবে না। শুধুমাত্র প্রকৃত এসএমএস ভেরিফিকেশন ছাড়া লগইন হবে না।',
        active: flags.strictOtp,
        statusText: flags.strictOtp ? 'STATUS: STRICT MODE' : 'STATUS: PERMISSIVE / DEV BYPASS',
        badgeColor: flags.strictOtp ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400',
        activeColor: 'bg-emerald-500',
      },
      {
        key: 'maintenanceMode' as const,
        flagName: 'FLAG: MAINTENANCE_MODE',
        title: 'সিস্টেম রক্ষণাবেক্ষণ মোড',
        desc: 'সাধারণ ব্যবহারকারীদের জন্য রক্ষণাবেক্ষণ নোটিশ দেখাবে এবং নতুন রিকোয়েস্ট সাময়িক স্থগিত রাখবে।',
        active: flags.maintenanceMode,
        statusText: flags.maintenanceMode ? 'STATUS: ACTIVE (সার্ভার লকড)' : 'STATUS: NORMAL OPERATIONAL',
        badgeColor: flags.maintenanceMode ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300',
        activeColor: 'bg-rose-500',
      },
      {
        key: 'emergencyAlertActive' as const,
        flagName: 'FLAG: EMERGENCY_BROADCAST',
        title: 'জরুরি ব্রডকাস্ট ব্যানার',
        desc: 'ভারী বৃষ্টি, জলাবদ্ধতা বা বিশেষ পরিচ্ছন্নতা সতর্কবার্তা সকল পেজে লাল ব্যানারে ফ্ল্যাশ করবে।',
        active: flags.emergencyAlertActive,
        statusText: flags.emergencyAlertActive ? 'STATUS: BROADCASTING' : 'STATUS: OFF AIR',
        badgeColor: flags.emergencyAlertActive ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400',
        activeColor: 'bg-amber-500',
      },
      {
        key: 'requireDumpPhoto' as const,
        flagName: 'FLAG: REQUIRE_DUMP_PHOTO',
        title: 'অভিযোগে ছবি বাধ্যতামূলক',
        desc: 'নাগরিক যখন ময়লার স্তূপ রিপোর্ট করবে তখন ছবি তোলা বাধ্যতামূলক রাখা হবে নাকি ঐচ্ছিক।',
        active: flags.requireDumpPhoto,
        statusText: flags.requireDumpPhoto ? 'STATUS: PHOTO REQUIRED' : 'STATUS: PHOTO OPTIONAL',
        badgeColor: flags.requireDumpPhoto ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400',
        activeColor: 'bg-emerald-500',
      },
      {
        key: 'autoDispatchNearest' as const,
        flagName: 'FLAG: AUTO_DISPATCH_NEAREST',
        title: 'অটো-ডিসপ্যাচ অ্যালগরিদম',
        desc: 'নতুন অভিযোগ বা পিকআপ কিউ আসলে PostGIS জিও-ডিস্টেন্স দিয়ে নিকটবর্তী খালি গাড়িকে স্বয়ংক্রিয় অ্যাসাইন করা।',
        active: flags.autoDispatchNearest,
        statusText: flags.autoDispatchNearest ? 'STATUS: AUTOMATIC (AI/GIS)' : 'STATUS: MANUAL DISPATCH',
        badgeColor: flags.autoDispatchNearest ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400',
        activeColor: 'bg-emerald-500',
      },
      {
        key: 'enableTrafficTracking' as const,
        flagName: 'FLAG: REALTIME_TRAFFIC_TRACKING',
        title: 'রিয়েল-টাইম ট্রাফিক ও ভিজিটর ট্র্যাকিং',
        desc: 'ওয়েবসাইট ও পোর্টালের সকল পেজে ভিজিটরের আইপি, ভৌগোলিক অবস্থান ও ডিভাইস অডিট সক্রিয় রাখা।',
        active: flags.enableTrafficTracking,
        statusText: flags.enableTrafficTracking ? 'STATUS: ACTIVE (MONITORING)' : 'STATUS: PAUSED',
        badgeColor: flags.enableTrafficTracking ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400',
        activeColor: 'bg-emerald-500',
      },
      {
        key: 'enableDownloadTracking' as const,
        flagName: 'FLAG: REALTIME_DOWNLOAD_TRACKING',
        title: 'ডাউনলোড ট্র্যাকিং ও অডিট ইঞ্জিন',
        desc: 'কারা কারা কতবার এবং কোন লোকেশন থেকে APK ও রিপোর্ট ফাইল ডাউনলোড করছে তার রিয়েল-টাইম কাউন্টার।',
        active: flags.enableDownloadTracking,
        statusText: flags.enableDownloadTracking ? 'STATUS: COUNTING ACTIVE' : 'STATUS: PAUSED',
        badgeColor: flags.enableDownloadTracking ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400',
        activeColor: 'bg-emerald-500',
      },
      {
        key: 'allowGuestDownloads' as const,
        flagName: 'FLAG: ALLOW_GUEST_DOWNLOADS',
        title: 'গেস্ট ভিজিটরদের APK ডাউনলোড অনুমোদন',
        desc: 'লগইন না করা সাধারণ নাগরিকদেরও অফিসিয়াল মোবাইল অ্যাপ নামানোর অনুমতি দেওয়া হবে।',
        active: flags.allowGuestDownloads,
        statusText: flags.allowGuestDownloads ? 'STATUS: OPEN TO PUBLIC' : 'STATUS: REQUIRE AUTH',
        badgeColor: flags.allowGuestDownloads ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-400',
        activeColor: 'bg-sky-500',
      },
      {
        key: 'strictGeofence' as const,
        flagName: 'FLAG: STRICT_SAVAR_GEOFENCE',
        title: 'কঠোর সাভার জিওফেন্সিং ফিল্টার',
        desc: 'সাভার পৌরসভার ভৌগোলিক সীমানার বাইরের কোঅর্ডিনেট থেকে আসা রিকোয়েস্ট স্বয়ংক্রিয় ফিল্টার আউট করা।',
        active: flags.strictGeofence,
        statusText: flags.strictGeofence ? 'STATUS: STRICT GEOFENCE' : 'STATUS: PERMISSIVE',
        badgeColor: flags.strictGeofence ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400',
        activeColor: 'bg-emerald-500',
      },
      {
        key: 'simulateGpsMovement' as const,
        flagName: 'FLAG: SIMULATE_GPS_MOVEMENT',
        title: 'লাইভ GPS মুভমেন্ট সিমুলেশন',
        desc: 'ম্যাপ ভিউতে ময়লার গাড়িগুলোর রিয়েল-টাইম মুভমেন্ট সিমুলেট করবে।',
        active: flags.simulateGpsMovement,
        statusText: flags.simulateGpsMovement ? 'STATUS: SIMULATING' : 'STATUS: STATIC',
        badgeColor: flags.simulateGpsMovement ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400',
        activeColor: 'bg-emerald-500',
      },
    ],
    [flags],
  );

  const filteredGridFlags = useMemo(() => {
    return GRID_FLAGS.filter((f) => {
      if (flagFilterStatus === 'active' && !f.active) return false;
      if (flagFilterStatus === 'paused' && f.active) return false;
      if (flagSearchQuery.trim()) {
        const q = flagSearchQuery.toLowerCase();
        return (
          f.flagName.toLowerCase().includes(q) ||
          f.title.toLowerCase().includes(q) ||
          f.desc.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [GRID_FLAGS, flagFilterStatus, flagSearchQuery]);

  return (
    <div
      className="min-h-screen bg-[#070a13] font-sans text-slate-100 antialiased selection:bg-emerald-500 selection:text-black flex flex-col"
      style={{ colorScheme: 'dark' }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-slate-900/95 px-5 py-3.5 text-sm font-medium text-emerald-300 shadow-2xl backdrop-blur ring-1 ring-emerald-500/30 animate-in fade-in slide-in-from-bottom-3">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main SaaS Shell (Sidebar + Main Area) */}
      <div className="flex flex-1 min-h-screen">
        {/* Mobile Backdrop */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* LEFT SIDEBAR */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#090e1a] border-r border-slate-800/90 flex flex-col justify-between shrink-0 select-none transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Top Section */}
          <div className="overflow-y-auto flex-1 cs-admin-scrollbar">
            {/* Sidebar Branding */}
            <div className="p-5 border-b border-slate-800/80">
              <div className="flex items-center justify-between mb-3.5">
                <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  SUPERADMIN • v2.1.0-dev
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="lg:hidden text-slate-400 hover:text-white p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-mono font-extrabold text-base shadow-lg">
                  [&nbsp;&gt;_&nbsp;]
                </div>
                <div>
                  <h1 className="font-extrabold text-white text-base leading-tight tracking-tight">
                    Clean Savar
                  </h1>
                  <p className="text-xs text-slate-400 font-medium">Developer Console</p>
                </div>
              </div>
            </div>

            {/* Vertical Navigation Links */}
            <div className="px-3 py-5 space-y-4">
              {/* Group 1: কোর মডিউল ও কন্ট্রোল */}
              <div>
                <div className="px-3 pb-2 text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                  কোর মডিউল ও কন্ট্রোল
                </div>
                <div className="space-y-1">
                  {DEV_TABS.filter((t) => CORE_TABS.includes(t.key)).map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                          setActiveTab(tab.key);
                          setMobileSidebarOpen(false);
                        }}
                        className={`w-full relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all group ${
                          isActive
                            ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-emerald-400 rounded-r-full shadow-[0_0_10px_#10b981]" />
                        )}
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                        <span className="truncate">{tab.labelBn}</span>
                        {isActive ? (
                          <span className="ml-auto text-[10px] font-mono bg-emerald-400/20 text-emerald-300 px-1.5 py-0.5 rounded">
                            Active
                          </span>
                        ) : tab.badge ? (
                          <span className="ml-auto text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700/60">
                            {tab.badge}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Group 2: সিস্টেম ও ইনফ্রাস্ট্রাকচার */}
              <div>
                <div className="px-3 pb-2 text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                  সিস্টেম ও ইনফ্রাস্ট্রাকচার
                </div>
                <div className="space-y-1">
                  {DEV_TABS.filter((t) => SYSTEM_TABS.includes(t.key)).map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                          setActiveTab(tab.key);
                          setMobileSidebarOpen(false);
                        }}
                        className={`w-full relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all group ${
                          isActive
                            ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-emerald-400 rounded-r-full shadow-[0_0_10px_#10b981]" />
                        )}
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                        <span className="truncate">{tab.labelBn}</span>
                        {isActive && (
                          <span className="ml-auto text-[10px] font-mono bg-emerald-400/20 text-emerald-300 px-1.5 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Bottom Footer */}
          <div className="p-4 border-t border-slate-800/80 bg-[#070a13] shrink-0">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>DEPLOYED REGION:</span>
                <span className="text-emerald-400 font-bold">asia-south1 (Dhaka)</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>SAVAR WARDS:</span>
                <span className="text-slate-200">১-৯ সক্রিয় ওয়ার্ড</span>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-slate-300 font-medium font-mono truncate max-w-[130px]">
                    {currentUser?.email || 'dev-root@internal'}
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                  HMAC-256
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#070a13]">
          {/* TOP HEADER */}
          <header className="h-16 border-b border-slate-800/90 bg-[#090e1a]/95 backdrop-blur px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 sticky top-0 z-30">
            {/* Left: Mobile Toggle & Google Cloud Session Badge */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white"
                aria-label="টগল মেনু"
              >
                {mobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700/80 bg-slate-900/90 shadow-sm text-xs font-medium text-slate-200">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z"/>
                </svg>
                <span className="hidden sm:inline">Google Cloud সেশন সক্রিয়:</span>
                <span className="font-mono text-emerald-400 font-semibold truncate max-w-[180px] sm:max-w-none">
                  {currentUser?.email || 'Verified Developer'}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              </div>
            </div>

            {/* Center-Right: System Telemetry Status Chips & Quick Actions */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#0e1526] px-3 py-1.5 text-xs font-mono text-slate-300 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="hidden sm:inline">API:</span>
                <button
                  type="button"
                  onClick={pingBackend}
                  disabled={isPinging}
                  className="font-semibold text-emerald-400 hover:underline"
                >
                  {isPinging ? '...' : apiPingMs ? `${apiPingMs}ms` : 'Check'}
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-800 bg-[#0e1526] px-3 py-1.5 text-xs font-mono text-slate-300">
                <Database className="h-3.5 w-3.5 text-sky-400" />
                <span>DB:</span>
                <span className="font-semibold text-sky-400">Supabase PostGIS</span>
              </div>

              <div className="hidden md:flex items-center gap-2 rounded-lg border border-slate-800 bg-[#0e1526] px-3 py-1.5 text-xs font-mono text-slate-300">
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                <span>Auth:</span>
                <span className="font-semibold text-amber-400">Firebase + HMAC</span>
              </div>

              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-white"
              >
                <span className="hidden sm:inline">পৌর অ্যাডমিন ভিউ</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>

              <button
                type="button"
                onClick={handleLockConsole}
                title="লক কনসোল"
                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>লক</span>
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                title="লগআউট / পরিবর্তন"
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:border-rose-500/50 hover:bg-rose-950/30 hover:text-rose-300 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden md:inline">লগআউট / পরিবর্তন</span>
              </button>
            </div>
          </header>

          {/* MAIN SCROLLABLE DASHBOARD */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
            {/* TAB 1: FEATURE FLAGS & SYSTEM SWITCHBOARD */}
            {activeTab === 'switchboard' && (
              <div className="space-y-6">
                {/* Title & Control Bar Row */}
                <div className="rounded-2xl border border-slate-800/90 bg-[#0d1424] p-5 sm:p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        সিস্টেম ফিচার ফ্ল্যাগ সুইচবোর্ড (Runtime Feature Flags)
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        এই সুইচগুলোর পরিবর্তন তাৎক্ষণিকভাবে সিস্টেমের ওয়েব ও অ্যাপ্লিকেশনের আচরণ নিয়ন্ত্রণ করে।
                      </p>
                    </div>
                  </div>

                  {/* Search, Filter & Default Button */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Search Bar */}
                    <div className="relative w-48 sm:w-60">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={flagSearchQuery}
                        onChange={(e) => setFlagSearchQuery(e.target.value)}
                        placeholder="ফ্ল্যাগ খুঁজুন..."
                        className="w-full bg-[#080d19] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
                      />
                      {flagSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setFlagSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filter Selector */}
                    <div className="flex items-center gap-1 bg-[#080d19] border border-slate-700/80 rounded-xl p-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setFlagFilterStatus('all')}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                          flagFilterStatus === 'all'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        সব ({GRID_FLAGS.length + 1})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFlagFilterStatus('active')}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                          flagFilterStatus === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        সক্রিয় ({GRID_FLAGS.filter((f) => f.active).length + (flags.otpPaused ? 1 : 0)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFlagFilterStatus('paused')}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                          flagFilterStatus === 'paused'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        স্থগিত ({GRID_FLAGS.filter((f) => !f.active).length + (flags.otpPaused ? 0 : 1)})
                      </button>
                    </div>

                    {/* Reset to Defaults Button */}
                    <button
                      type="button"
                      onClick={handleResetAll}
                      className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 shadow-sm transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-300" />
                      <span>সব ফ্ল্যাগ ডিফল্ট করুন</span>
                    </button>
                  </div>
                </div>

                {/* MAIN WARN BANNER: OTP_VERIFICATION_PAUSED */}
                {(flagFilterStatus !== 'paused' || !flags.otpPaused) && (
                  <div className="rounded-2xl border-2 border-amber-500/60 bg-gradient-to-r from-amber-950/40 via-amber-950/20 to-slate-900/60 p-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex items-start justify-between gap-6 relative z-10">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg">
                          <AlertTriangle className="w-6 h-6" />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs font-mono uppercase font-bold tracking-wider text-amber-400">
                              FLAG: OTP_VERIFICATION_PAUSED (যান্ত্রিক ত্রুটির কারণে OTP স্থগিত)
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 text-[11px] font-mono font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              STATUS: {flags.otpPaused ? 'PAUSED (স্থগিত - Google Sign-in Enforced)' : 'NORMAL (স্বাভাবিক OTP সক্রিয়)'}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-white flex items-center gap-2">
                            SMS OTP যাচাইকরণ স্থগিত &amp; নাম + মোবাইল + Google সাইন-ইন সক্রিয়
                          </h3>

                          <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
                            টেলিকম এসএমএস গেটওয়ে যান্ত্রিক সমস্যার কারণে পাবলিক OTP চ্যালেঞ্জ সাময়িক স্থগিত রয়েছে।
                            ব্যবহারকারীরা নাম এবং ১১ সংখ্যার মোবাইল নম্বর প্রদান করে Google সাইন-ইনের মাধ্যমে লগইন করতে পারবেন।
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleFlag('otpPaused')}
                          className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none ${
                            flags.otpPaused
                              ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                              : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                              flags.otpPaused ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span className="text-[11px] font-mono font-semibold text-amber-400">
                          {flags.otpPaused ? 'ACTIVE OVERRIDE' : 'NORMAL MODE'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3-COLUMN GRID: OTHER FEATURE FLAGS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredGridFlags.map((card) => (
                    <div
                      key={card.key}
                      className="rounded-2xl border border-slate-800 bg-[#0d1424] hover:border-slate-700/80 p-5 shadow-lg transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-slate-400">
                              {card.flagName}
                            </span>
                            <h3 className="text-sm font-bold text-white mt-1">
                              {card.title}
                            </h3>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleFlag(card.key)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              card.active ? card.activeColor : 'bg-slate-700'
                            }`}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                                card.active ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                        <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                          {card.desc}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center gap-2 text-[11px] font-mono">
                        <span className={`inline-flex rounded px-1.5 py-0.5 font-bold ${card.badgeColor}`}>
                          {card.statusText}
                        </span>
                      </div>
                    </div>
                  ))}

                  {filteredGridFlags.length === 0 && (
                    <div className="col-span-full rounded-2xl border border-slate-800 bg-[#0d1424] p-8 text-center">
                      <p className="text-slate-400 text-sm">কোনো ফিচার ফ্ল্যাগ পাওয়া যায়নি।</p>
                      <button
                        type="button"
                        onClick={() => {
                          setFlagSearchQuery('');
                          setFlagFilterStatus('all');
                        }}
                        className="mt-3 text-xs text-emerald-400 hover:underline"
                      >
                        সার্চ ও ফিল্টার রিসেট করুন
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

        {/* TAB: CITIZEN REQUESTS & RESPONSES LIVE STREAM */}
        {activeTab === 'citizen_requests' && (
          <DevCitizenRequestsTab />
        )}

        {/* TAB 2: TRAFFIC & VISITOR INTELLIGENCE */}
        {activeTab === 'traffic' && (
          <DevTrafficTab
            visitorLogs={visitorLogs}
            trafficSummary={trafficSummary}
            onSimulateVisit={handleSimulateTrafficVisit}
            onClearLogs={handleClearTrafficLogs}
            showToast={showToast}
          />
        )}

        {/* TAB 3: DOWNLOAD ANALYTICS & USER BREAKDOWN */}
        {activeTab === 'downloads' && (
          <DevDownloadsTab
            downloadEvents={downloadEvents}
            userDownloadStats={userDownloadStats}
            downloadSummary={downloadSummary}
            onSimulateDownload={handleSimulateDownload}
            onClearDownloads={handleClearDownloads}
            showToast={showToast}
          />
        )}

        {/* TAB 4: LOGIN AUDIT & GEOLOCATION */}
        {activeTab === 'logins' && (
          <DevLoginsTab
            loginEvents={loginEvents}
            userLoginStats={userLoginStats}
            loginSummary={loginSummary}
            onSimulateLogin={handleSimulateLogin}
            onClearLogins={handleClearLogins}
            showToast={showToast}
          />
        )}

        {/* TAB 5: MULTI-CLOUD INFRASTRUCTURE & HEALTH MONITOR */}
        {activeTab === 'telemetry' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Server className="h-5 w-5 text-sky-400" />
                মাল্টি-ক্লাউড ইনফ্রাস্ট্রাকচার ও সার্ভিস স্টেটাস (Infrastructure Telemetry)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                সাভার সিস্টেমের বিভিন্ন ক্লাউড নোড, ডাটাবেস ক্লাস্টার এবং মাইক্রোসার্ভিসের লাইভ মেট্রিক্স।
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Rust Axum API (Render) */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-500">BACKEND ENGINE</span>
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
                    LIVE
                  </span>
                </div>
                <h3 className="mt-2 text-base font-bold text-white">Rust Axum REST API</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">clean-savar-api.onrender.com</p>
                <div className="mt-4 space-y-1.5 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">লেটেন্সি:</span>
                    <span className="font-mono text-emerald-400">{apiPingMs ? `${apiPingMs} ms` : 'Evaluating...'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">পোর্ট / বাইন্ড:</span>
                    <span className="font-mono text-slate-400">0.0.0.0:8080 (Docker)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">প্ল্যাটফর্ম:</span>
                    <span className="font-mono text-slate-400">Render (Singapore)</span>
                  </div>
                </div>
              </div>

              {/* PostgreSQL & PostGIS (Supabase) */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-500">PRIMARY DATABASE</span>
                  <span className="rounded bg-sky-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-sky-400">
                    CONNECTED
                  </span>
                </div>
                <h3 className="mt-2 text-base font-bold text-white">PostgreSQL 15 + PostGIS</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Supabase AWS (ap-southeast-1)</p>
                <div className="mt-4 space-y-1.5 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">কানেকশন পুল:</span>
                    <span className="font-mono text-sky-400">pgBouncer (Port 5432)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">স্পেশিয়াল ইন্ডেক্স:</span>
                    <span className="font-mono text-slate-400">GIST (Location Coordinates)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">টেবিল সংখ্যা:</span>
                    <span className="font-mono text-slate-400">১৪টি অ্যাক্টিভ টেবিল</span>
                  </div>
                </div>
              </div>

              {/* Firebase Authentication */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-500">IDENTITY SERVICE</span>
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-400">
                    ACTIVE
                  </span>
                </div>
                <h3 className="mt-2 text-base font-bold text-white">Google Cloud OAuth 2.0</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">Client ID: 969714135854...</p>
                <div className="mt-4 space-y-1.5 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">প্রোভাইডার:</span>
                    <span className="font-mono text-emerald-400">Google Cloud (GCP)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">টোকেন ভেরিফায়ার:</span>
                    <span className="font-mono text-amber-400">Google TokenInfo V3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">আর্কিটেকচার:</span>
                    <span className="font-mono text-sky-400">Pure GCP Web Client</span>
                  </div>
                </div>
              </div>

              {/* Web Client & Storage */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-500">WEB APPLICATION</span>
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
                    V15.3.0
                  </span>
                </div>
                <h3 className="mt-2 text-base font-bold text-white">Next.js App Router</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Node 22 / Turbopack</p>
                <div className="mt-4 space-y-1.5 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">আপলোড লিমিট:</span>
                    <span className="font-mono text-slate-400">5 MB (Multipart/Form)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">সার্ভার এনভায়রনমেন্ট:</span>
                    <span className="font-mono text-slate-400">Standalone SSR / Edge</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">অ্যাক্সেসিবিলিটি:</span>
                    <span className="font-mono text-emerald-400">WCAG 2.1 AA Compliant</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: USER RBAC MATRIX & 1-CLICK ROLE PROMOTION */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Municipal & Management Admin Approval Control Card */}
            <div className="rounded-xl border border-emerald-500/30 bg-slate-900/80 p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                    <h2 className="text-base font-bold text-white">
                      পৌর ও ম্যানেজমেন্ট অ্যাডমিন অনুমোদন নিয়ন্ত্রণ (Municipal Admin Approvals)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    সাভার পৌরসভা অপারেশনস ও ম্যানেজমেন্ট অ্যাডমিন প্যানেল (/admin) ব্যবহারের জন্য ডেভেলপার সুপার-অ্যাডমিনের অনুমোদন বাধ্যতামূলক।
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  SuperAdmin Enforcement Active
                </span>
              </div>

              {/* Direct Add Admin Form */}
              <form onSubmit={handleAddDirectAdmin} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs font-semibold text-slate-300 mb-2">
                  + সরাসরি নতুন পৌর / ম্যানেজমেন্ট অ্যাডমিন অনুমোদন দিন:
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    type="tel"
                    value={newAdminPhone}
                    onChange={(e) => setNewAdminPhone(e.target.value)}
                    placeholder="মোবাইল নম্বর (যেমন: 01711-240100)"
                    className="flex-1 min-w-[200px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:border-emerald-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    placeholder="নাম / পদবী (ঐচ্ছিক)"
                    className="flex-1 min-w-[180px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>অনুমোদন যোগ করুন</span>
                  </button>
                </div>
              </form>

              {/* Pending Approval Requests */}
              {adminApprovals.some((a) => a.status === 'pending') && (
                <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-950/20 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <ShieldAlert className="h-4 w-4" />
                    <span>অপেক্ষমাণ পৌর অ্যাডমিন আবেদন (Pending Requests):</span>
                  </div>
                  <div className="space-y-2">
                    {adminApprovals
                      .filter((a) => a.status === 'pending')
                      .map((req) => (
                        <div
                          key={req.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-slate-900/90 p-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{req.fullName}</span>
                              <span className="font-mono text-amber-300">({req.phone})</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {req.note} • আবেদন সময়: {req.requestedAt || 'আজ'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleApproveAdmin(req.phone, req.fullName, req.email)}
                            className="flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>অনুমোদন দিন</span>
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Approved Municipal Admins Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-800 cs-admin-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-950 font-mono uppercase text-slate-400">
                    <tr>
                      <th className="px-3.5 py-2.5">অ্যাডমিন মোবাইল</th>
                      <th className="px-3.5 py-2.5">নাম / পদবী</th>
                      <th className="px-3.5 py-2.5">অনুমোদনকারী</th>
                      <th className="px-3.5 py-2.5">অনুমোদনের তারিখ</th>
                      <th className="px-3.5 py-2.5">স্ট্যাটাস</th>
                      <th className="px-3.5 py-2.5 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    {adminApprovals.map((adm) => (
                      <tr key={adm.id} className="hover:bg-slate-900/50">
                        <td className="px-3.5 py-2.5 font-bold text-white">{adm.phone}</td>
                        <td className="px-3.5 py-2.5 font-sans text-slate-200">{adm.fullName}</td>
                        <td className="px-3.5 py-2.5 text-slate-400">{adm.approvedBy || 'Developer'}</td>
                        <td className="px-3.5 py-2.5 text-slate-500">{adm.approvedAt || 'পূর্বনির্ধারিত'}</td>
                        <td className="px-3.5 py-2.5">
                          <span
                            className={`inline-flex rounded px-2 py-0.5 text-[11px] font-bold ${
                              adm.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : adm.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {adm.status === 'approved' ? 'APPROVED' : adm.status === 'pending' ? 'PENDING' : 'REVOKED'}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          {adm.status === 'approved' ? (
                            <button
                              type="button"
                              onClick={() => handleRevokeAdmin(adm.phone)}
                              className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-500/20 transition-colors"
                            >
                              প্রত্যাহার করুন
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleApproveAdmin(adm.phone, adm.fullName, adm.email)}
                              className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                            >
                              অনুমোদন দিন
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-400" />
                  ইউজার অ্যাকাউন্ট ও রোল পারমিশন মেট্রিক্স (User RBAC)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  যে কোনো ব্যবহারকারীর ভূমিকা (Role) এক ক্লিকে পরিবর্তন ও তাৎক্ষণিক পারমিশন নিয়ন্ত্রণ করুন।
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(true)}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-500"
              >
                <Plus className="h-4 w-4" />
                <span>নতুন ইউজার তৈরি করুন</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="ফোন নম্বর, নাম বা রোল দিয়ে খুঁজুন (যেমন: 01711, admin, collector)..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/30 cs-admin-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-900/80 font-mono uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">ফোন নম্বর</th>
                    <th className="px-4 py-3">ব্যবহারকারীর নাম</th>
                    <th className="px-4 py-3">বর্তমান ভূমিকা (Role)</th>
                    <th className="px-4 py-3">এলাকা / ওয়ার্ড</th>
                    <th className="px-4 py-3 text-center">লগইন সংখ্যা</th>
                    <th className="px-4 py-3 text-center">ডাউনলোড</th>
                    <th className="px-4 py-3">সর্বশেষ সক্রিয়</th>
                    <th className="px-4 py-3 text-right">১-ক্লিক রোল পরিবর্তন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-900/50">
                      <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                        <span>{user.phone}</span>
                        {user.isVerified && (
                          <span title="যাচাইকৃত">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-sans text-slate-200">{user.fullName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-[11px] font-bold ${
                            user.role === 'developer'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : user.role === 'admin'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : user.role === 'collector'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : user.role === 'partner'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {user.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {user.wardId ? `ওয়ার্ড ${toBanglaDigits(user.wardId)}` : 'সকল অঞ্চল'}
                      </td>

                      {/* Login count */}
                      <td className="px-4 py-3 text-center font-mono">
                        {(() => {
                          const userLog = userLoginStats.find((l) => l.userPhone === user.phone || l.userId === user.id);
                          return (
                            <span className="rounded bg-sky-500/10 px-2 py-0.5 text-xs text-sky-400 font-bold border border-sky-500/20">
                              {toBanglaDigits(userLog?.totalLogins || 1)} বার
                            </span>
                          );
                        })()}
                      </td>

                      {/* Download count */}
                      <td className="px-4 py-3 text-center font-mono">
                        {(() => {
                          const userDl = userDownloadStats.find((d) => d.downloaderPhone === user.phone || d.downloaderId === user.id);
                          return (
                            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400 font-bold border border-emerald-500/20">
                              {toBanglaDigits(userDl?.totalDownloads || 0)} বার
                            </span>
                          );
                        })()}
                      </td>

                      <td className="px-4 py-3 text-slate-500 font-sans">{user.lastActive}</td>
                      <td className="px-4 py-3 text-right">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as ExtendedRole)}
                          className="rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-white focus:border-emerald-500 focus:outline-none"
                        >
                          <option value="citizen">নাগরিক (Citizen)</option>
                          <option value="collector">কর্মী (Collector)</option>
                          <option value="partner">রিসাইক্লিং পার্টনার</option>
                          <option value="admin">পৌর অ্যাডমিন</option>
                          <option value="developer">সুপার ডেভেলপার</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add User Modal */}
            {showAddUserModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <h3 className="text-base font-bold text-white">নতুন টেস্ট ইউজার যুক্ত করুন</h3>
                    <button
                      type="button"
                      onClick={() => setShowAddUserModal(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateUser} className="mt-4 space-y-4 text-xs">
                    <div>
                      <label className="block font-medium text-slate-300 mb-1">নাম (Full Name):</label>
                      <input
                        type="text"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="যেমন: মো. তারেক রহমান"
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-300 mb-1">মোবাইল নম্বর (Phone):</label>
                      <input
                        type="text"
                        value={newUserPhone}
                        onChange={(e) => setNewUserPhone(e.target.value)}
                        placeholder="01711-000000"
                        required
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-300 mb-1">ভূমিকা (Role):</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as ExtendedRole)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="citizen">নাগরিক (Citizen)</option>
                        <option value="collector">পরিচ্ছন্নতাকর্মী (Collector)</option>
                        <option value="partner">রিসাইক্লিং পার্টনার (Partner)</option>
                        <option value="admin">পৌর অ্যাডমিন (Municipal Admin)</option>
                        <option value="developer">সুপার ডেভেলপার (SuperAdmin)</option>
                      </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddUserModal(false)}
                        className="rounded-lg border border-slate-700 px-4 py-2 font-semibold text-slate-300 hover:bg-slate-800"
                      >
                        বাতিল
                      </button>
                      <button
                        type="submit"
                        className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500"
                      >
                        তৈরি করুন
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: OTP & SMS DEBUGGER & RATE LIMIT BUSTER */}
        {activeTab === 'otp' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-amber-400" />
                OTP জেনারেটর, SMS ডিবাগার ও রেট লিমিট বাস্টার (OTP Console)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                কোনো এসএমএস খরচ না করে যেকোনো ফোন নম্বরের জন্য লাইভ ৬ সংখ্যার কোড তৈরি করুন এবং ব্লক হওয়া আইপি/ফোন আনলক করুন।
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Box 1: Instant OTP Generator */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-400" />
                  ইনস্ট্যান্ট সিমুলেটেড OTP তৈরি করুন
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  অ্যাপ বা ওয়েবে লগইন টেস্ট করার জন্য নম্বর দিলে তাৎক্ষণিক একটি ভ্যালিড কোড প্রদান করা হবে।
                </p>

                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={customOtpPhone}
                    onChange={(e) => setCustomOtpPhone(e.target.value)}
                    placeholder="01715-883210"
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateOtp}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>জেনারেট OTP</span>
                  </button>
                </div>

                <div className="mt-4 rounded-lg border border-slate-800/80 bg-slate-950 p-3 text-xs">
                  <div className="text-slate-400 font-mono text-[11px] mb-2">সর্বশেষ তৈরি হওয়া OTP কোডসমূহ:</div>
                  {otps.length === 0 ? (
                    <div className="text-slate-600 font-mono">এখনো কোনো টেস্ট ওটিপি তৈরি করা হয়নি।</div>
                  ) : (
                    <div className="space-y-1.5 font-mono">
                      {otps.slice(0, 5).map((o) => (
                        <div key={o.id} className="flex items-center justify-between border-b border-slate-900 pb-1">
                          <span className="text-slate-300">{o.phone}</span>
                          <span className="font-bold text-amber-400 text-sm tracking-widest">{o.otp}</span>
                          <span className="text-[10px] text-slate-500">{o.expiresAt} পর্যন্ত</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Box 2: Rate Limit Buster */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-400" />
                  Rate Limit Buster (৪২৯ আনব্লকার)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  বারবার ভুল চেষ্টা বা স্প্যাম সুরক্ষার কারণে আটকে যাওয়া ফোন নম্বর বা আইপির মেমরি লিমিট ক্লিয়ার করুন।
                </p>

                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={rateLimitBusterPhone}
                    onChange={(e) => setRateLimitBusterPhone(e.target.value)}
                    placeholder="01715-883210 বা Client IP"
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-xs text-white focus:border-rose-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleResetRateLimit}
                    className="flex items-center gap-1.5 rounded-lg bg-rose-600/90 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>কুলডাউন মুছুন</span>
                  </button>
                </div>

                <div className="mt-4 rounded-lg border border-slate-800/80 bg-slate-950 p-3 text-xs text-slate-400 space-y-1">
                  <div className="text-slate-300 font-semibold">প্রোডাকশন থ্রোটলিং পলিসি:</div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-400">
                    <li>আইপি প্রতি সর্বোচ্চ ২০টি রিকোয়েস্ট / ১৫ মিনিট</li>
                    <li>মোবাইল নম্বর প্রতি সর্বোচ্চ ৫টি OTP চ্যালেঞ্জ / ১৫ মিনিট</li>
                    <li>পরপর ২টি ওটিপির মধ্যে নূন্যতম ৩০ সেকেন্ডের কুলডাউন</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: FLEET & LIVE GPS SIMULATOR */}
        {activeTab === 'fleet' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Truck className="h-5 w-5 text-sky-400" />
                  ফ্লিট ও লাইভ GPS ভেহিকল সিমুলেটর (Fleet Simulator)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  সাভারের বিভিন্ন ওয়ার্ডে ভার্চুয়াল ট্রাক মুভমেন্ট সিমুলেট করুন, ওজন লোড আপডেট করুন এবং ট্র্যাকিং টেস্ট করুন।
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleFlag('simulateGpsMovement')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white transition ${
                  flags.simulateGpsMovement ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {flags.simulateGpsMovement ? (
                  <>
                    <Activity className="h-4 w-4 animate-spin" />
                    <span>জিপিএস অটো-টিক বন্ধ করুন</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>জিপিএস অটো-টিক চালু করুন (4s Interval)</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {vehicles.map((v) => (
                <div key={v.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-sky-400">{v.code}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                        v.status === 'available'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : v.status === 'en_route'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {v.status}
                    </span>
                  </div>

                  <div className="mt-3 text-xs space-y-1">
                    <div className="font-bold text-white">{v.driverName}</div>
                    <div className="text-slate-400 font-mono">{v.driverPhone}</div>
                    <div className="text-slate-400">ওয়ার্ড: {toBanglaDigits(v.wardId)}</div>
                  </div>

                  <div className="mt-3 border-t border-slate-800 pt-3 text-[11px] font-mono space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Coordinates:</span>
                      <span className="text-slate-300">{v.lat}, {v.lng}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Load (বর্জ্য):</span>
                      <span className="text-slate-300">{toBanglaDigits(v.currentLoadKg)} / {toBanglaDigits(v.capacityKg)} kg</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Fuel / Battery:</span>
                      <span className="text-emerald-400">{toBanglaDigits(v.fuelPercent)}%</span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-1.5 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        updateDevVehicle(v.id, {
                          status: v.status === 'available' ? 'en_route' : 'available',
                        });
                        setVehicles(getDevVehicles());
                        showToast(`${v.code} স্টেটাস টগল করা হয়েছে`);
                      }}
                      className="flex-1 rounded border border-slate-700 bg-slate-800 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700"
                    >
                      Toggle Status
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateDevVehicle(v.id, {
                          currentLoadKg: Math.min(v.capacityKg, v.currentLoadKg + 200),
                        });
                        setVehicles(getDevVehicles());
                        showToast(`${v.code}-এ +২০০ কেজি লোড যোগ করা হয়েছে`);
                      }}
                      className="rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-emerald-400 hover:bg-slate-700"
                    >
                      +200kg
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: RECYCLING MARKETPLACE PRICING */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-400" />
                রিসাইক্লিং বর্জ্য মার্কেটপ্লেস ও বেস প্রাইসিং ইঞ্জিন
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                বিভিন্ন প্রকার পুনর্ব্যবহারযোগ্য বর্জ্যের প্রতি কেজির ন্যূনতম দর (Floor Price) ও নিলাম নীতিমালা নির্ধারণ করুন।
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/30 cs-admin-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-900/80 font-mono uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">উপাদান (Material Type)</th>
                    <th className="px-4 py-3">ইংরেজি নাম</th>
                    <th className="px-4 py-3">বেস দর (৳/কেজি)</th>
                    <th className="px-4 py-3">মার্কেট ট্রেন্ড</th>
                    <th className="px-4 py-3">ন্যূনতম লট সাইজ</th>
                    <th className="px-4 py-3 text-right">দর আপডেট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                  {marketRates.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-900/50">
                      <td className="px-4 py-3 font-sans font-bold text-white">{m.nameBn}</td>
                      <td className="px-4 py-3 text-slate-400">{m.nameEn}</td>
                      <td className="px-4 py-3 text-emerald-400 font-bold text-sm">৳ {toBanglaDigits(m.basePricePerKg)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            m.marketTrend === 'up'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : m.marketTrend === 'down'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {m.marketTrend}
                        </span>
                      </td>
                      <td className="px-4 py-3">{toBanglaDigits(m.minLotSizeKg)} কেজি</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = updateDevMarketRate(m.id, Math.max(1, m.basePricePerKg - 2));
                              setMarketRates([...updated]);
                              showToast(`দর কমানো হয়েছে: ৳${m.basePricePerKg - 2}/কেজি`);
                            }}
                            className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-rose-300 hover:bg-slate-700"
                          >
                            -৳২
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = updateDevMarketRate(m.id, m.basePricePerKg + 2);
                              setMarketRates([...updated]);
                              showToast(`দর বাড়ানো হয়েছে: ৳${m.basePricePerKg + 2}/কেজি`);
                            }}
                            className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-emerald-300 hover:bg-slate-700"
                          >
                            +৳২
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: WARDS & GEOFENCE INSPECTOR */}
        {activeTab === 'wards' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Globe className="h-5 w-5 text-emerald-400" />
                ওয়ার্ড জিওফেন্স ও পোস্টজিআইএস বাউন্ডারি ইন্সপেক্টর (15 Municipal & Union Zones)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                সাভার পৌরসভার ৯টি ওয়ার্ড এবং ৬টি ইউনিয়নের কোঅর্ডিনেটস, সেন্ট্রয়েড ও সুপারভাইজার ফোন ডিরেক্টরি।
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SAVAR_WARDS_SEED.map((w) => (
                <div key={w.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-emerald-400">{w.code}</span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                      ID: {w.id}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-sm font-bold text-white">{w.name_bn}</h3>
                  <p className="text-xs text-slate-400">{w.zone_label_bn}</p>

                  <div className="mt-3 border-t border-slate-800/80 pt-2 text-[11px] font-mono space-y-1 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Centroid:</span>
                      <span className="text-slate-300">{w.centroid_lat}, {w.centroid_lng}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">সুপারভাইজার:</span>
                      <span className="text-slate-200">{w.supervisor_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">যোগাযোগ:</span>
                      <span className="text-emerald-400">{w.supervisor_phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">শিডিউল:</span>
                      <span className="text-slate-300 font-sans">{w.schedule_bn}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: SANDBOX SEEDER & PURGE */}
        {activeTab === 'sandbox' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-400" />
                স্যান্ডবক্স ডাটা সিডার ও রিটেনশন পার্জ টুলস (Data Seeder & Sanitizer)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                টেস্টিংয়ের জন্য র্যান্ডম ডাম্প অভিযোগ ও পিকআপ কিউ ইনজেক্ট করুন অথবা পুরাতন সম্পন্ন ডাটা ক্লিন করুন।
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Plus className="h-4 w-4 text-emerald-400" />
                  সিন্থেটিক টেস্ট ডাটা জেনারেটর
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  সাভারের বিভিন্ন কোঅর্ডিনেটসে স্বয়ংক্রিয়ভাবে ৫টি নতুন ডাম্প হটস্পট এবং ৫টি নাগরিক পিকআপ যোগ করুন।
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleInjectSampleData}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    <Plus className="h-4 w-4" />
                    <span>১০টি সিন্থেটিক রেকর্ড ইনজেক্ট করুন</span>
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-rose-400" />
                  PII রিটেনশন ও পুরানো লগ পার্জ
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  ৯০ দিনের পুরানো সম্পন্ন পিকআপ এবং অভিযোগের ব্যক্তিগত সংবেদনশীল তথ্য (PII) মুছে ফেলতে API কল করুন।
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleTriggerPurge}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-600/40 bg-rose-600/20 px-4 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-600/30"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>রান রিটেনশন পার্জ (Run Purge)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: MOBILE APK & RELEASE MANAGER */}
        {activeTab === 'apk' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-emerald-400" />
                মোবাইল APK বিল্ড ও OTA রিলিজ ম্যানেজার (App Distribution Console)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                সর্বশেষ রিলিজকৃত APK ফাইলের ভার্সন, সাইজ, ডাউনলোড লিংক এবং ফায়ারবেস কনসোলের SHA-256 ফিঙ্গারপ্রিন্ট কন্ট্রোল।
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Build Info */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                <h3 className="text-sm font-bold text-white">বর্তমান রিলিজ বিল্ড তথ্য:</h3>
                <div className="mt-4 space-y-2 text-xs font-mono">
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-500">Version Name:</span>
                    <span className="font-bold text-emerald-400">v{apkConfig.versionName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-500">Version Code:</span>
                    <span className="text-white">{apkConfig.versionCode}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-500">File Size:</span>
                    <span className="text-white">{apkConfig.apkSizeMb} MB</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-500">ডাউনলোড ফাইল:</span>
                    <a href={apkConfig.downloadUrl} download className="text-sky-400 hover:underline">
                      {apkConfig.downloadUrl}
                    </a>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-500">মোট ডাউনলোড সংখ্যা:</span>
                    <span className="font-bold text-emerald-400 font-sans">
                      {toBanglaDigits(downloadSummary.totalDownloads)} বার ({toBanglaDigits(downloadSummary.uniqueDownloaders)} জন অনন্য)
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex flex-col sm:flex-row gap-2">
                  <a
                    href={apkConfig.downloadUrl}
                    download
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow"
                  >
                    <Download className="h-4 w-4" />
                    <span>সরাসরি APK ফাইল ডাউনলোড করুন</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setActiveTab('downloads')}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
                  >
                    <span>ডাউনলোড বিস্তারিত →</span>
                  </button>
                </div>
              </div>

              {/* Firebase SHA-256 Certificate Fingerprint */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                <h3 className="text-sm font-bold text-white">Firebase Phone Auth SHA-256 সার্টিফিকেট:</h3>
                <p className="text-xs text-slate-400 mt-1">
                  মোবাইল ডিভাইসে Firebase SMS OTP চালু করতে Firebase Console-এ এই ফিঙ্গারপ্রিন্টটি দিতে হবে:
                </p>

                <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-emerald-300 break-all select-all">
                  {apkConfig.sha256DebugCert}
                </div>

                <div className="mt-4 rounded-lg border border-slate-800/60 bg-slate-900/50 p-3 text-[11px] text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-300">Firebase Console করণীয়:</div>
                  <div>1. Firebase Console &gt; Project Settings &gt; Android App (`bd.gov.savar.clean_savar_mobile`)</div>
                  <div>2. &apos;Add fingerprint&apos; এ গিয়ে ওপরের SHA-256 পেস্ট করে সেভ করুন।</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 10: REAL-TIME AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-emerald-400" />
                  সিস্টেম অডিট লগ ও সিকিউরিটি ইভেন্ট ট্রেইল (Audit Trail)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  কনসোলে নেওয়া প্রতিটি অ্যাকশন, রোল পরিবর্তন ও সিকিউরিটি ইভেন্টের বিস্তারিত লগ।
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearDevAuditLogs();
                  setAuditLogs([]);
                  showToast('অডিট লগ পরিষ্কার করা হয়েছে।');
                }}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>লগ ক্লিয়ার করুন</span>
              </button>
            </div>

            {/* Audit Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={auditSearchQuery}
                onChange={(e) => setAuditSearchQuery(e.target.value)}
                placeholder="অ্যাকশন বা বিবরণ দিয়ে অডিট লগ ফিল্টার করুন..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Audit Log Stream */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 font-mono text-xs">
              {filteredAudits.length === 0 ? (
                <div className="py-8 text-center text-slate-600">কোনো অডিট রেকর্ড পাওয়া যায়নি।</div>
              ) : (
                <div className="space-y-2">
                  {filteredAudits.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-800/80 bg-slate-950/70 p-3 hover:border-slate-700"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-400">[{item.action}]</span>
                          <span
                            className={`rounded px-1.5 py-0.2 text-[10px] uppercase font-bold ${
                              item.category === 'auth'
                                ? 'bg-blue-500/20 text-blue-300'
                                : item.category === 'flag'
                                ? 'bg-amber-500/20 text-amber-300'
                                : item.category === 'security'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {item.category}
                          </span>
                          <span className="text-slate-400 font-sans text-xs">{item.details}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Actor: {item.actor} • IP: {item.ip}
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-500 shrink-0">{item.timestamp}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
        </div>
      </div>
    </div>
  );
}
