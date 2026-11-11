import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeBdPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  let normalized = '';

  if (digits.startsWith('8801') && digits.length === 13) {
    normalized = `0${digits.slice(3)}`;
  } else if (digits.startsWith('01') && digits.length === 11) {
    normalized = digits;
  } else {
    return null;
  }

  return `${normalized.slice(0, 5)}-${normalized.slice(5)}`;
}

export function formatRelativeTimeBn(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins} মিনিট আগে`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ঘণ্টা আগে`;
  const days = Math.floor(hours / 24);
  return `${days} দিন আগে`;
}

export function formatDistanceLabel(meters: number | null): string {
  if (meters === null || Number.isNaN(meters)) return 'দূরত্ব গণনা হচ্ছে';
  if (meters < 1000) return `${Math.round(meters)} মিটার দূরে`;
  return `${(meters / 1000).toFixed(1)} কিমি দূরে`;
}
