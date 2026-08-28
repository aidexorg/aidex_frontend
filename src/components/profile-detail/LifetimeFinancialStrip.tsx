import { CreditCard, Receipt, Wallet } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import type { computeFinancialSummary } from '@/lib/profileOutput';
import { useTranslation } from '../LocaleProvider';

type FinancialSummary = ReturnType<typeof computeFinancialSummary>;

interface LifetimeFinancialStripProps {
  summary: FinancialSummary;
}

export function LifetimeFinancialStrip({ summary }: LifetimeFinancialStripProps) {
  const { t } = useTranslation();
  const remaining = Math.max(0, summary.debt);

  const metrics = [
    {
      key: 'billed',
      labelKey: 'lifetimeFinancial.totalBilled' as const,
      value: formatPrice(summary.totalCosts),
      icon: Receipt,
      variant: 'default' as const,
    },
    {
      key: 'paid',
      labelKey: 'lifetimeFinancial.totalPaid' as const,
      value: formatPrice(summary.paid),
      icon: CreditCard,
      variant: 'default' as const,
    },
    {
      key: 'remaining',
      labelKey: 'lifetimeFinancial.remaining' as const,
      value: formatPrice(remaining),
      icon: Wallet,
      variant: remaining > 0 ? ('danger' as const) : ('default' as const),
    },
  ];

  return (
    <section
      aria-labelledby="lifetime-financial-heading"
      className="sticky top-16 z-20 rounded-xl border border-slate-200/80 bg-white/95 p-3 shadow-sm backdrop-blur-sm sm:p-4 dark:border-slate-700 dark:bg-slate-900/95"
    >
      <h3 id="lifetime-financial-heading" className="sr-only">
        {t('lifetimeFinancial.regionLabel')}
      </h3>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {metrics.map(({ key, labelKey, value, icon: Icon, variant }) => (
          <div key={key} className="flex min-w-0 items-center gap-3">
            <div
              className={`icon-well shrink-0 ${
                variant === 'danger'
                  ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                  : 'bg-sage-50 text-sage-600 dark:bg-sage-900/40 dark:text-sage-400'
              }`}
              aria-hidden="true"
            >
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-slate-500 dark:text-slate-400">{t(labelKey)}</dt>
              <dd
                className={`truncate text-base font-semibold ${
                  variant === 'danger'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {value}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
