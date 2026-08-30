import { isoToJalali, PERSIAN_MONTH_NAMES } from '@/lib/jalali';

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

function toFaDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (digit) => FA_DIGITS[Number(digit)]);
}

export function formatJalaliLong(iso: string): string {
  const jalali = isoToJalali(iso);
  if (!jalali) return iso;
  const monthName = PERSIAN_MONTH_NAMES[jalali.jm - 1];
  return `${toFaDigits(jalali.jd)} ${monthName} ${toFaDigits(jalali.jy)}`;
}

/** Review/output style: ۱۵/فروردین/۱۴۰۳ */
export function formatJalaliSlash(iso: string): string {
  const jalali = isoToJalali(iso);
  if (!jalali) return iso;
  const monthName = PERSIAN_MONTH_NAMES[jalali.jm - 1];
  return `${toFaDigits(jalali.jd)}/${monthName}/${toFaDigits(jalali.jy)}`;
}
