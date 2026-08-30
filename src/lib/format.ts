// Persian number and currency formatting helpers.

import { getActiveLocale, localeIntlTag, type AppLocale } from '@/lib/locale';
import { translate } from '@/i18n/messages';
import { formatJalaliLong, formatJalaliSlash } from '@/lib/jalaliFormat';

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toFaDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

export function formatDigits(input: string | number, locale: AppLocale = getActiveLocale()): string {
  if (locale === 'en') return String(input);
  return toFaDigits(input);
}

export function formatPrice(amount: number, locale: AppLocale = getActiveLocale()): string {
  const tag = localeIntlTag(locale);
  const formatted = new Intl.NumberFormat(tag, {
    maximumFractionDigits: 0,
  }).format(amount || 0);
  const suffix = translate(locale, 'currency.toman');
  if (locale === 'fa') {
    return `${toFaDigits(formatted)} ${suffix}`;
  }
  return `${formatted} ${suffix}`;
}

export function formatDate(iso: string | null, locale: AppLocale = getActiveLocale()): string {
  if (!iso) return translate(locale, 'common.emDash');
  if (locale === 'fa') return formatJalaliLong(iso);
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat(localeIntlTag(locale), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return iso;
  }
}

export function formatDateShort(iso: string | null, locale: AppLocale = getActiveLocale()): string {
  if (!iso) return translate(locale, 'common.emDash');
  if (locale === 'fa') return formatJalaliSlash(iso);
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat(localeIntlTag(locale), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return iso;
  }
}

export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function formatMonthYear(iso: string, locale: AppLocale = getActiveLocale()): string {
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat(localeIntlTag(locale), {
      year: 'numeric',
      month: 'long',
    }).format(date);
  } catch {
    return iso;
  }
}
