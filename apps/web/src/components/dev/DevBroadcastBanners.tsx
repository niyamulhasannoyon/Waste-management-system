'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Wrench, X } from 'lucide-react';
import { DevFeatureFlags, getDevFeatureFlags } from '@/lib/dev-store';

export function DevBroadcastBanners() {
  const [flags, setFlags] = useState<DevFeatureFlags | null>(null);
  const [dismissEmergency, setDismissEmergency] = useState(false);

  useEffect(() => {
    // Initial fetch
    setFlags(getDevFeatureFlags());

    // Listen to real-time custom event triggered by Dev Switchboard
    function handleFlagsChanged(e: Event) {
      const customEvent = e as CustomEvent<DevFeatureFlags>;
      if (customEvent.detail) {
        setFlags(customEvent.detail);
      }
    }

    window.addEventListener('cs:dev-flags-changed', handleFlagsChanged);
    return () => window.removeEventListener('cs:dev-flags-changed', handleFlagsChanged);
  }, []);

  if (!flags) return null;

  return (
    <>
      {/* Maintenance Mode Banner */}
      {flags.maintenanceMode && (
        <aside
          aria-label="সিস্টেম রক্ষণাবেক্ষণ বিজ্ঞপ্তি"
          className="relative z-50 border-b border-rose-600 bg-rose-700 px-4 py-2 text-center text-xs font-semibold text-white shadow-md"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-center gap-2">
            <Wrench className="h-4 w-4 animate-bounce" />
            <span>
              [রক্ষণাবেক্ষণ মোড সক্রিয়]: {flags.maintenanceMessage}
            </span>
          </div>
        </aside>
      )}

      {/* Emergency Broadcast Alert Banner */}
      {flags.emergencyAlertActive && !dismissEmergency && (
        <aside
          aria-label="জরুরি নোটিশ"
          className="relative z-40 border-b border-amber-500 bg-amber-500/95 px-4 py-2.5 text-center text-xs font-bold text-slate-950 shadow-lg"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-left">
              <AlertTriangle className="h-4 w-4 shrink-0 text-slate-950" />
              <span>{flags.emergencyAlertText}</span>
            </div>
            <button
              type="button"
              onClick={() => setDismissEmergency(true)}
              className="rounded p-1 hover:bg-amber-600/30 text-slate-950"
              title="বন্ধ করুন"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
