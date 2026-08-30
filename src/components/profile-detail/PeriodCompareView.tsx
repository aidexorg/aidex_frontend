import { useEffect, useMemo, useState } from 'react';
import { Columns2 } from 'lucide-react';
import { useTranslation } from '../LocaleProvider';
import { formatPrice, toFaDigits } from '@/lib/format';
import { computePeriodProgress } from '@/lib/periodProgress';
import { PeriodProgressBar } from './PeriodProgressBar';
import type { Action, Part, Payment, Period, Session } from '@/types';

interface PeriodCompareViewProps {
  periods: Period[];
  sessions: Session[];
  parts: Part[];
  actions: Action[];
  payments: Payment[];
}

interface PeriodMetrics {
  period: Period;
  periodNumber: number;
  sessionCount: number;
  actionCount: number;
  progress: ReturnType<typeof computePeriodProgress>;
  total: number;
  paid: number;
  remaining: number;
}

function computePeriodMetrics(
  period: Period,
  periodNumber: number,
  sessions: Session[],
  parts: Part[],
  actions: Action[],
  payments: Payment[],
): PeriodMetrics {
  const periodSessions = sessions.filter((session) => session.period_id === period.id);
  const sessionIds = new Set(periodSessions.map((session) => session.id));
  const periodParts = parts.filter((part) => sessionIds.has(part.session_id));
  const partIds = new Set(periodParts.map((part) => part.id));
  const periodActions = actions.filter((action) => partIds.has(action.part_id));
  const periodPayments = payments.filter((payment) => payment.period_id === period.id);
  const total = periodActions.reduce((sum, action) => sum + (action.price - action.discount), 0);
  const paid = periodPayments.reduce((sum, payment) => sum + payment.amount, 0);

  return {
    period,
    periodNumber,
    sessionCount: periodSessions.length,
    actionCount: periodActions.length,
    progress: computePeriodProgress(periodActions),
    total,
    paid,
    remaining: total - paid,
  };
}

function PeriodCompareColumn({
  metrics,
  slotLabel,
}: {
  metrics: PeriodMetrics;
  slotLabel: string;
}) {
  const { t, locale } = useTranslation();

  return (
    <article
      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800"
      aria-labelledby={`compare-period-${metrics.period.id}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {slotLabel}
      </p>
      <h4
        id={`compare-period-${metrics.period.id}`}
        className="mt-1 font-semibold text-slate-800 dark:text-slate-100"
      >
        {t('periodCompare.periodLabel', { n: toFaDigits(metrics.periodNumber) })}
      </h4>

      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500 dark:text-slate-400">{t('periodCompare.sessionCount')}</dt>
          <dd className="font-medium text-slate-800 dark:text-slate-100">
            {toFaDigits(metrics.sessionCount)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500 dark:text-slate-400">{t('periodCompare.actionCount')}</dt>
          <dd className="font-medium text-slate-800 dark:text-slate-100">
            {toFaDigits(metrics.actionCount)}
          </dd>
        </div>
      </dl>

      {metrics.actionCount > 0 && (
        <PeriodProgressBar
          progress={metrics.progress}
          periodNumber={metrics.periodNumber}
          variant="default"
          className="mt-3"
        />
      )}

      <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm dark:border-slate-700">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500 dark:text-slate-400">{t('periodCompare.totalBilled')}</dt>
          <dd className="font-medium text-slate-800 dark:text-slate-100">
            {formatPrice(metrics.total, locale)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500 dark:text-slate-400">{t('periodCompare.totalPaid')}</dt>
          <dd className="font-medium text-emerald-700 dark:text-emerald-400">
            {formatPrice(metrics.paid, locale)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500 dark:text-slate-400">{t('periodCompare.remaining')}</dt>
          <dd
            className={`font-medium ${
              metrics.remaining > 0
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {formatPrice(metrics.remaining, locale)}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export function PeriodCompareView({
  periods,
  sessions,
  parts,
  actions,
  payments,
}: PeriodCompareViewProps) {
  const { t } = useTranslation();

  const metricsById = useMemo(() => {
    const map = new Map<string, PeriodMetrics>();
    periods.forEach((period, index) => {
      map.set(
        period.id,
        computePeriodMetrics(period, index + 1, sessions, parts, actions, payments),
      );
    });
    return map;
  }, [periods, sessions, parts, actions, payments]);

  const [periodAId, setPeriodAId] = useState('');
  const [periodBId, setPeriodBId] = useState('');

  useEffect(() => {
    if (periods.length === 0) {
      setPeriodAId('');
      setPeriodBId('');
      return;
    }
    if (periods.length === 1) {
      setPeriodAId(periods[0].id);
      setPeriodBId('');
      return;
    }
    const previous = periods[periods.length - 2].id;
    const latest = periods[periods.length - 1].id;
    setPeriodAId((current) =>
      current && periods.some((period) => period.id === current) ? current : previous,
    );
    setPeriodBId((current) =>
      current && periods.some((period) => period.id === current) ? current : latest,
    );
  }, [periods]);

  useEffect(() => {
    if (periodAId && periodBId && periodAId === periodBId && periods.length >= 2) {
      const alternative = periods.find((period) => period.id !== periodAId);
      if (alternative) setPeriodBId(alternative.id);
    }
  }, [periodAId, periodBId, periods]);

  if (periods.length === 0) {
    return (
      <div className="card p-8 text-center" role="region" aria-label={t('periodCompare.title')}>
        <Columns2 size={42} className="mx-auto text-slate-300" aria-hidden="true" />
        <h3 className="mt-3 font-semibold text-slate-700 dark:text-slate-200">
          {t('periodCompare.emptyNoPeriodsTitle')}
        </h3>
        <p className="mt-1 text-sm text-slate-400">{t('periodCompare.emptyNoPeriodsDescription')}</p>
      </div>
    );
  }

  if (periods.length === 1) {
    const metrics = metricsById.get(periods[0].id)!;
    return (
      <section
        className="card overflow-hidden"
        aria-labelledby="period-compare-title"
        role="region"
      >
        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3 dark:border-slate-700 dark:bg-slate-900/50">
          <h3 id="period-compare-title" className="text-sm font-semibold text-brand-navy dark:text-slate-100">
            {t('periodCompare.title')}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('periodCompare.subtitle')}</p>
        </div>
        <div className="p-5">
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            {t('periodCompare.needTwoPeriods')}
          </p>
          <PeriodCompareColumn metrics={metrics} slotLabel={t('periodCompare.onlyPeriod')} />
        </div>
      </section>
    );
  }

  const metricsA = periodAId ? metricsById.get(periodAId) : undefined;
  const metricsB = periodBId ? metricsById.get(periodBId) : undefined;

  return (
    <section
      className="card overflow-hidden"
      aria-labelledby="period-compare-title"
      role="region"
    >
      <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3 dark:border-slate-700 dark:bg-slate-900/50">
        <h3 id="period-compare-title" className="text-sm font-semibold text-brand-navy dark:text-slate-100">
          {t('periodCompare.title')}
        </h3>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('periodCompare.subtitle')}</p>
      </div>

      <div className="p-5 space-y-4">
        <div
          className="grid gap-4 sm:grid-cols-2"
          role="group"
          aria-label={t('periodCompare.pickerGroupLabel')}
        >
          <div>
            <label htmlFor="period-compare-a" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              {t('periodCompare.periodA')}
            </label>
            <select
              id="period-compare-a"
              className="input mt-1 w-full"
              value={periodAId}
              onChange={(event) => {
                const next = event.target.value;
                setPeriodAId(next);
                if (next === periodBId) {
                  const alternative = periods.find((period) => period.id !== next);
                  if (alternative) setPeriodBId(alternative.id);
                }
              }}
            >
              {periods.map((period, index) => (
                <option key={period.id} value={period.id}>
                  {t('periodCompare.periodOption', { n: toFaDigits(index + 1) })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="period-compare-b" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              {t('periodCompare.periodB')}
            </label>
            <select
              id="period-compare-b"
              className="input mt-1 w-full"
              value={periodBId}
              onChange={(event) => {
                const next = event.target.value;
                setPeriodBId(next);
                if (next === periodAId) {
                  const alternative = periods.find((period) => period.id !== next);
                  if (alternative) setPeriodAId(alternative.id);
                }
              }}
            >
              {periods.map((period, index) => (
                <option key={period.id} value={period.id} disabled={period.id === periodAId}>
                  {t('periodCompare.periodOption', { n: toFaDigits(index + 1) })}
                </option>
              ))}
            </select>
          </div>
        </div>

        {metricsA && metricsB && (
          <div
            className="grid gap-4 md:grid-cols-2"
            aria-label={t('periodCompare.comparisonRegionLabel')}
          >
            <PeriodCompareColumn metrics={metricsA} slotLabel={t('periodCompare.periodA')} />
            <PeriodCompareColumn metrics={metricsB} slotLabel={t('periodCompare.periodB')} />
          </div>
        )}
      </div>
    </section>
  );
}
