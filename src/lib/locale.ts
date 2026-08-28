/** POL-20: client-side locale preference (CLM-033). */
export const LOCALE_STORAGE_KEY = 'aidex:locale';

export type AppLocale = 'fa' | 'en';

const LOCALES: AppLocale[] = ['fa', 'en'];

let activeLocale: AppLocale = 'fa';

export const LOCALE_LABELS: Record<AppLocale, string> = {
  fa: 'فارسی',
  en: 'English',
};

export function readStoredLocale(): AppLocale {
  try {
    const value = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (value === 'fa' || value === 'en') return value;
  } catch {
    // Storage may be unavailable in private/restricted browsing.
  }
  return 'fa';
}

export function writeStoredLocale(locale: AppLocale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Degrade gracefully — choice applies for the current session only.
  }
}

export function getActiveLocale(): AppLocale {
  return activeLocale;
}

export function setActiveLocale(locale: AppLocale): void {
  activeLocale = locale;
}

export function applyDocumentLocale(locale: AppLocale): void {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr';
}

export function nextLocale(current: AppLocale): AppLocale {
  const index = LOCALES.indexOf(current);
  return LOCALES[(index + 1) % LOCALES.length];
}

export function localeIntlTag(locale: AppLocale): string {
  return locale === 'fa' ? 'fa-IR' : 'en-US';
}

if (typeof document !== 'undefined') {
  activeLocale = readStoredLocale();
  applyDocumentLocale(activeLocale);
}
