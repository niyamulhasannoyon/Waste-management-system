import { describe, expect, it } from 'vitest';
import { formatDhakaDateTimeBn } from '@/components/ui/relative-time';
import { HOTSPOTS_SEED, LOTS_SEED, PICKUPS_SEED, VEHICLES_SEED } from '@/lib/savar-data';
import {
  buildSafeCsv,
  isSafeImageUrl,
  maskBdPhone,
  normalizeBdPhone,
  resolveMediaUrl,
  sanitizeCsvCell,
  toBanglaDigits,
} from '@/lib/utils';

describe('Bangladeshi phone, digits & media guards', () => {
  it('normalizes valid 013-019 numbers and +880 international forms', () => {
    expect(normalizeBdPhone('01715883210')).toBe('01715-883210');
    expect(normalizeBdPhone('+8801819-653241')).toBe('01819-653241');
    expect(normalizeBdPhone('8801911904522')).toBe('01911-904522');
    expect(normalizeBdPhone('01211000111')).toBeNull();
    expect(normalizeBdPhone('01715')).toBeNull();
  });

  it('converts ASCII digits to Bangla numerals and masks phone numbers', () => {
    expect(toBanglaDigits('CS-PK-02041')).toBe('CS-PK-০২০৪১');
    expect(toBanglaDigits(2026)).toBe('২০২৬');
    expect(maskBdPhone('01715-883210')).toBe('01715-••••10');
  });

  it('rejects javascript, html data URIs, and path traversal in image URLs', () => {
    expect(isSafeImageUrl('/uploads/report-123.webp')).toBe(true);
    expect(isSafeImageUrl('https://cdn.example.com/photo.jpg')).toBe(true);
    expect(isSafeImageUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeImageUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeImageUrl('data:image/svg+xml;utf8,<svg onload=alert(1)></svg>')).toBe(false);
    expect(isSafeImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(isSafeImageUrl('/uploads/../secret.png')).toBe(false);

    expect(resolveMediaUrl('/uploads/a.webp', 'http://localhost:8080/api/v1')).toBe(
      'http://localhost:8080/uploads/a.webp',
    );
    expect(resolveMediaUrl('javascript:alert(1)')).toBeNull();
  });
});

describe('CSV formula injection neutralization', () => {
  it('prefixes dangerous spreadsheet leading characters cleanly', () => {
    expect(sanitizeCsvCell('=CMD("calc")')).toBe('"\'=CMD(""calc"")"');
    expect(sanitizeCsvCell('+1+2')).toBe('"\'+1+2"');
    expect(sanitizeCsvCell('-100')).toBe('"\'-100"');
    expect(sanitizeCsvCell('@SUM(A1:A2)')).toBe('"\'@SUM(A1:A2)"');
    expect(sanitizeCsvCell('\t=2+3')).toBe('"\'\t=2+3"');
    expect(sanitizeCsvCell('\r=2+3')).toBe('"\'\r=2+3"');
    expect(sanitizeCsvCell('Normal Savar Text')).toBe('"Normal Savar Text"');
  });

  it('builds UTF-8 BOM CSV output escaping quotes safely', () => {
    const csv = buildSafeCsv(
      ['Code', 'Address'],
      [['CS-PK-1', '=HYPERLINK("http://evil")']],
    );
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"\'=HYPERLINK(""http://evil"")"');
  });
});

describe('SSR-safe Dhaka formatting and deterministic seed timestamps', () => {
  it('formats UTC+6 Dhaka timestamps identically regardless of host timezone', () => {
    expect(formatDhakaDateTimeBn('2026-11-12T01:42:00.000Z')).toBe('১২/১১, ০৭:৪২');
    expect(formatDhakaDateTimeBn('invalid-iso')).toBe('সময় অজানা');
  });

  it('uses fixed deterministic ISO timestamps in seed datasets (no Date.now drift)', () => {
    expect(PICKUPS_SEED[0]?.created_at).toBe('2026-11-12T01:42:00.000Z');
    expect(HOTSPOTS_SEED[0]?.created_at).toBe('2026-11-12T00:45:00.000Z');
    expect(VEHICLES_SEED[0]?.last_ping_at).toBe('2026-11-12T01:56:00.000Z');
    expect(LOTS_SEED[0]?.created_at).toBe('2026-11-11T23:00:00.000Z');
  });
});
