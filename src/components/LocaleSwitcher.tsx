import { Languages } from 'lucide-react';
import { LOCALE_LABELS } from '@/lib/locale';
import { useTranslation } from './LocaleProvider';

export function LocaleSwitcher() {
  const { locale, cycleLocale, t } = useTranslation();
  const label = LOCALE_LABELS[locale];

  return (
    <button
      type="button"
      onClick={cycleLocale}
      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2 text-sm text-slate-600 hover:border-sage-300 hover:bg-white transition dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-sage-500 dark:hover:bg-slate-800"
      aria-label={t('locale.ariaLabel', { label })}
      aria-pressed={locale === 'en'}
      title={t('locale.title', { label })}
    >
      <Languages size={16} aria-hidden="true" />
      <span className="hidden sm:inline text-xs font-medium">
        {locale === 'fa' ? t('locale.fa') : t('locale.en')}
      </span>
    </button>
  );
}
