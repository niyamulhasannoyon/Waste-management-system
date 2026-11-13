'use client';

import React, { useSyncExternalStore } from 'react';
import { formatRelativeTimeBn, toBanglaDigits } from '@/lib/utils';

const DHAKA_OFFSET_MS = 6 * 60 * 60_000;
const TICK_MS = 60_000;

let cachedNowMs: number | null = null;
let tickTimer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function getClientSnapshot(): number {
  if (cachedNowMs === null) {
    cachedNowMs = Date.now();
  }
  return cachedNowMs;
}

function getServerSnapshot(): number | null {
  return null;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (cachedNowMs === null) {
    cachedNowMs = Date.now();
  }
  if (tickTimer === null && typeof window !== 'undefined') {
    tickTimer = setInterval(() => {
      cachedNowMs = Date.now();
      for (const cb of listeners) cb();
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && tickTimer !== null) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  };
}

/**
 * Deterministic UTC+6 (Asia/Dhaka) short date-time label for SSR and initial hydration.
 */
export function formatDhakaDateTimeBn(isoDate: string): string {
  const parsed = new Date(isoDate).getTime();
  if (!Number.isFinite(parsed)) {
    return 'সময় অজানা';
  }
  const dhaka = new Date(parsed + DHAKA_OFFSET_MS);
  const day = String(dhaka.getUTCDate()).padStart(2, '0');
  const month = String(dhaka.getUTCMonth() + 1).padStart(2, '0');
  const hour = String(dhaka.getUTCHours()).padStart(2, '0');
  const minute = String(dhaka.getUTCMinutes()).padStart(2, '0');
  return toBanglaDigits(`${day}/${month}, ${hour}:${minute}`);
}

interface RelativeTimeBnProps {
  isoDate: string;
  className?: string;
}

/**
 * Renders deterministic Dhaka timestamp during SSR/hydration, then updates to live relative time.
 */
export function RelativeTimeBn({ isoDate, className }: RelativeTimeBnProps) {
  const nowMs = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const text =
    nowMs === null ? formatDhakaDateTimeBn(isoDate) : formatRelativeTimeBn(isoDate, nowMs);

  return (
    <time dateTime={isoDate} className={className}>
      {text}
    </time>
  );
}
