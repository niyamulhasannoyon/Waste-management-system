import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'] as const;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toBanglaDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => BANGLA_DIGITS[Number(digit)] ?? digit);
}

/**
 * Validate and format Bangladeshi mobile numbers (`013`..`019`).
 * Returns formatted `01XXX-XXXXXX` or `null` when invalid.
 */
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

  const third = normalized[2];
  if (!third || third < '3' || third > '9') {
    return null;
  }

  return `${normalized.slice(0, 5)}-${normalized.slice(5)}`;
}

export function maskBdPhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.length >= 11) {
    return `${trimmed.slice(0, 6)}••••${trimmed.slice(-2)}`;
  }
  return '••••••';
}

export function formatRelativeTimeBn(isoDate: string, nowMs: number = Date.now()): string {
  const parsed = new Date(isoDate).getTime();
  if (!Number.isFinite(parsed)) {
    return 'সময় অজানা';
  }

  const diffMs = nowMs - parsed;
  if (diffMs < 60_000) {
    return 'এইমাত্র';
  }

  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) {
    return `${toBanglaDigits(mins)} মিনিট আগে`;
  }

  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${toBanglaDigits(hours)} ঘণ্টা আগে`;
  }

  const days = Math.floor(hours / 24);
  return `${toBanglaDigits(days)} দিন আগে`;
}

export function formatDistanceLabel(meters: number | null): string {
  if (meters === null || !Number.isFinite(meters)) {
    return 'দূরত্ব গণনা হচ্ছে';
  }
  if (meters < 1000) {
    return `${toBanglaDigits(Math.round(meters))} মিটার দূরে`;
  }
  return `${toBanglaDigits((meters / 1000).toFixed(1))} কিমি দূরে`;
}

/**
 * Guard uploaded/external image URLs before rendering to block script/unsafe URIs.
 */
export function isSafeImageUrl(raw: string | null | undefined): raw is string {
  if (!raw) return false;
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/uploads/')) return !trimmed.includes('..');
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^data:image\/(png|jpeg|webp)[;,]/i.test(trimmed)) return true;
  return false;
}

/**
 * Downscale and JPEG-compress oversized camera photos on the client when Canvas is available.
 * Reduces cellular data usage across Bangladesh 3G/4G connections while falling back safely in SSR/tests.
 */
export async function compressImageForUpload(
  file: File,
  maxDimension = 1400,
  quality = 0.78,
): Promise<File> {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof createImageBitmap !== 'function' ||
    file.size <= 350 * 1024
  ) {
    return file;
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const targetW = Math.max(1, Math.round(bitmap.width * scale));
    const targetH = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (!blob || blob.size >= file.size) {
      return file;
    }

    const baseName = file.name.replace(/\.[^/.]+$/, '') || 'photo';
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}

export function resolveMediaUrl(
  raw: string | null | undefined,
  apiBase: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1',
): string | null {
  if (!isSafeImageUrl(raw)) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith('/uploads/')) {
    const origin = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
    return `${origin}${trimmed}`;
  }
  return trimmed;
}

/**
 * Neutralize spreadsheet formula prefixes (`=`, `+`, `-`, `@`, tab, CR) before RFC-4180 quoting.
 */
export function sanitizeCsvCell(value: string | number | null | undefined): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function buildSafeCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const headerLine = headers.map((h) => sanitizeCsvCell(h)).join(',');
  const dataLines = rows.map((row) => row.map((cell) => sanitizeCsvCell(cell)).join(','));
  return `\uFEFF${[headerLine, ...dataLines].join('\n')}`;
}
