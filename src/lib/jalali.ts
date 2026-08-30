/**
 * Single conversion source between Jalali calendar parts and ISO Gregorian dates.
 * Uses jalaali-js (Borkowski algorithm).
 *
 * Verified boundary conversions (jy/jm/jd → ISO):
 * - 1395/12/30 → 2017-03-20 (leap Esfand)
 * - 1400/01/01 → 2021-03-21 (Nowruz)
 * - 1402/12/29 → 2024-03-19 (common Esfand end)
 * - 1403/01/01 → 2024-03-20 (Nowruz)
 */
import {
  toJalaali,
  toGregorian,
  jalaaliMonthLength as monthLength,
} from 'jalaali-js';

export const PERSIAN_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface JalaliParts {
  jy: number;
  jm: number;
  jd: number;
}

export function parseIsoDate(iso: string): { gy: number; gm: number; gd: number } | null {
  const match = ISO_DATE_RE.exec(iso);
  if (!match) return null;
  const gy = Number(match[1]);
  const gm = Number(match[2]);
  const gd = Number(match[3]);
  if (gm < 1 || gm > 12 || gd < 1 || gd > 31) return null;
  return { gy, gm, gd };
}

export function isoToJalali(iso: string): JalaliParts | null {
  const gregorian = parseIsoDate(iso);
  if (!gregorian) return null;
  const { jy, jm, jd } = toJalaali(gregorian.gy, gregorian.gm, gregorian.gd);
  return { jy, jm, jd };
}

export function jalaliToIso(jy: number, jm: number, jd: number): string {
  const { gy, gm, gd } = toGregorian(jy, jm, jd);
  return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
}

export function jalaaliMonthLength(jy: number, jm: number): number {
  return monthLength(jy, jm);
}

/** Saturday = 0 … Friday = 6 for the first day of a Jalali month. */
export function jalaliFirstWeekday(jy: number, jm: number): number {
  const { gy, gm, gd } = toGregorian(jy, jm, 1);
  const day = new Date(gy, gm - 1, gd).getDay();
  return (day + 6) % 7;
}

export function addJalaliDays(parts: JalaliParts, delta: number): JalaliParts {
  const iso = jalaliToIso(parts.jy, parts.jm, parts.jd);
  const gregorian = parseIsoDate(iso);
  if (!gregorian) return parts;
  const date = new Date(gregorian.gy, gregorian.gm - 1, gregorian.gd + delta);
  const { jy, jm, jd } = toJalaali(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
  return { jy, jm, jd };
}

export function compareJalali(a: JalaliParts, b: JalaliParts): number {
  if (a.jy !== b.jy) return a.jy - b.jy;
  if (a.jm !== b.jm) return a.jm - b.jm;
  return a.jd - b.jd;
}
