import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDevFeatureFlags,
  saveDevFeatureFlags,
  getDevVisitorLogs,
  recordDevPageVisit,
  getDevTrafficSummary,
  clearDevVisitorLogs,
  getDevUserDownloadStats,
  recordDevDownload,
  getDevDownloadSummary,
  getDevUserLoginStats,
  recordDevLogin,
  getDevLoginSummary,
  resetDevConsoleToDefaults,
} from '@/lib/dev-store';

describe('Dev Admin Console - Intelligence, Traffic & Download Analytics', () => {
  beforeEach(() => {
    localStorage.clear();
    resetDevConsoleToDefaults();
  });

  describe('Traffic & Visitor Intelligence', () => {
    it('records a page visit and updates traffic summary', () => {
      const initialLogs = getDevVisitorLogs();
      const initialCount = initialLogs.length;

      const visit = recordDevPageVisit({
        sessionId: 'sess-test-1',
        visitorId: 'vid-test-1',
        userName: 'টেস্ট ভিজিটর',
        userRole: 'citizen',
        path: '/download',
        title: 'ডাউনলোড পেজ',
        ip: '103.114.98.50',
        location: {
          city: 'সাভার বাজার, সাভার',
          region: 'Dhaka',
          country: 'বাংলাদেশ',
          flag: '🇧🇩',
          isp: 'Dot Internet',
        },
        device: {
          type: 'mobile',
          os: 'Android 14',
          browser: 'Chrome Mobile',
          screen: '390x844',
          userAgent: 'Mozilla/5.0 Android',
        },
        referrer: 'Direct',
      });

      expect(visit.id).toBeDefined();
      expect(visit.path).toBe('/download');

      const updatedLogs = getDevVisitorLogs();
      expect(updatedLogs.length).toBe(initialCount + 1);
      expect(updatedLogs[0]?.userName).toBe('টেস্ট ভিজিটর');

      const summary = getDevTrafficSummary();
      expect(summary.totalPageviews).toBeGreaterThan(0);
      expect(summary.uniqueVisitors).toBeGreaterThan(0);
    });

    it('clears visitor logs properly', () => {
      clearDevVisitorLogs();
      const cleared = getDevVisitorLogs();
      expect(cleared.length).toBeGreaterThan(0); // returns default seed on empty
    });
  });

  describe('Download Tracking Engine (Kara Kara Koybar & Mot Kotobar)', () => {
    it('tracks individual downloads and updates per-user download counts (kara kara koybar)', () => {
      const initialSummary = getDevDownloadSummary();
      const initialTotal = initialSummary.totalDownloads;

      // Downloader 1 downloads clean-savar.apk twice
      recordDevDownload({
        fileId: 'apk-universal',
        fileName: 'clean-savar.apk',
        fileVersion: 'v1.2.0',
        fileSizeMb: 53.4,
        downloaderId: 'usr-test-101',
        downloaderName: 'শফিকুল ইসলাম (নাগরিক)',
        downloaderPhone: '01712-999888',
        downloaderRole: 'citizen',
        ip: '103.114.98.60',
        location: 'সাভার পৌরসভা কার্যালয়, সাভার',
        device: 'Samsung Galaxy A54 (Android 14)',
      });

      recordDevDownload({
        fileId: 'apk-universal',
        fileName: 'clean-savar.apk',
        fileVersion: 'v1.2.0',
        fileSizeMb: 53.4,
        downloaderId: 'usr-test-101',
        downloaderName: 'শফিকুল ইসলাম (নাগরিক)',
        downloaderPhone: '01712-999888',
        downloaderRole: 'citizen',
        ip: '103.114.98.60',
        location: 'সাভার পৌরসভা কার্যালয়, সাভার',
        device: 'Samsung Galaxy A54 (Android 14)',
      });

      // Verify user stats: should have totalDownloads = 2
      const userStats = getDevUserDownloadStats();
      const userStat = userStats.find((s) => s.downloaderId === 'usr-test-101');

      expect(userStat).toBeDefined();
      expect(userStat?.totalDownloads).toBe(2);
      expect(userStat?.downloaderName).toBe('শফিকুল ইসলাম (নাগরিক)');
      expect(userStat?.lastLocation).toBe('সাভার পৌরসভা কার্যালয়, সাভার');

      // Verify global summary: mot kotobar download holo
      const updatedSummary = getDevDownloadSummary();
      expect(updatedSummary.totalDownloads).toBe(initialTotal + 2);
    });

    it('tracks downloads from multiple users and sorts by highest download count', () => {
      recordDevDownload({
        fileId: 'apk-universal',
        fileName: 'clean-savar.apk',
        fileVersion: 'v1.2.0',
        fileSizeMb: 53.4,
        downloaderId: 'user-low',
        downloaderName: 'ইউজার ১',
        downloaderRole: 'citizen',
        ip: '103.114.98.1',
        location: 'সাভার',
        device: 'Android',
      });

      for (let i = 0; i < 3; i++) {
        recordDevDownload({
          fileId: 'apk-universal',
          fileName: 'clean-savar.apk',
          fileVersion: 'v1.2.0',
          fileSizeMb: 53.4,
          downloaderId: 'user-high',
          downloaderName: 'ইউজার ৩ বার',
          downloaderRole: 'collector',
          ip: '103.114.98.2',
          location: 'আশুলিয়া',
          device: 'Android',
        });
      }

      const stats = getDevUserDownloadStats();
      const highUser = stats.find((s) => s.downloaderId === 'user-high');
      const lowUser = stats.find((s) => s.downloaderId === 'user-low');

      expect(highUser?.totalDownloads).toBe(3);
      expect(lowUser?.totalDownloads).toBe(1);
    });
  });

  describe('Login & Geolocation Tracking (Kotha Teke Login Korlo)', () => {
    it('records login event with IP, location, ISP and device', () => {
      const login = recordDevLogin({
        userId: 'usr-login-test',
        userName: 'মো. রফিকুল ইসলাম',
        userPhone: '01712-448910',
        userRole: 'collector',
        ip: '103.114.98.42',
        location: 'সাভার বাসস্ট্যান্ড মোড়, সাভার',
        isp: 'Grameenphone 4G LTE',
        device: 'Samsung Galaxy A34 (Android 14)',
        authMethod: 'google_auth',
        status: 'success',
      });

      expect(login.id).toBeDefined();
      expect(login.location).toBe('সাভার বাসস্ট্যান্ড মোড়, সাভার');
      expect(login.ip).toBe('103.114.98.42');

      const userLogins = getDevUserLoginStats();
      const stat = userLogins.find((l) => l.userPhone === '01712-448910');
      expect(stat).toBeDefined();
      expect(stat?.lastLocation).toBe('সাভার বাসস্ট্যান্ড মোড়, সাভার');
      expect(stat?.lastIsp).toBe('Grameenphone 4G LTE');
      expect(stat?.totalLogins).toBeGreaterThanOrEqual(1);

      const summary = getDevLoginSummary();
      expect(summary.totalLogins).toBeGreaterThan(0);
      expect(summary.successRate).toBe(100);
    });
  });

  describe('Feature Flags & Switchboard', () => {
    it('toggles traffic and download tracking flags', () => {
      saveDevFeatureFlags({
        enableTrafficTracking: false,
        enableDownloadTracking: false,
        allowGuestDownloads: false,
      });

      const flags = getDevFeatureFlags();
      expect(flags.enableTrafficTracking).toBe(false);
      expect(flags.enableDownloadTracking).toBe(false);
      expect(flags.allowGuestDownloads).toBe(false);

      saveDevFeatureFlags({
        enableTrafficTracking: true,
        enableDownloadTracking: true,
        allowGuestDownloads: true,
      });

      const updatedFlags = getDevFeatureFlags();
      expect(updatedFlags.enableTrafficTracking).toBe(true);
      expect(updatedFlags.enableDownloadTracking).toBe(true);
      expect(updatedFlags.allowGuestDownloads).toBe(true);
    });
  });
});
