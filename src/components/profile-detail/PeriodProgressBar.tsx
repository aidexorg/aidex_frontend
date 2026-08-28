import { useTranslation } from '../LocaleProvider';
import { toFaDigits } from '@/lib/format';
import type { PeriodProgress } from '@/lib/periodProgress';

function progressFillClass(percentComplete: number): string {
  if (percentComplete >= 100) return 'bg-emerald-500';
  if (percentComplete >= 50) return 'bg-amber-400';
  return 'bg-red-400';
}

interface PeriodProgressBarProps {
  progress: PeriodProgress;
  /** Period number for screen-reader label (optional). */
  periodNumber?: number;
  variant?: 'default' | 'compact';
  className?: string;
}

export function PeriodProgressBar({
  progress,
  periodNumber,
  variant = 'default',
  className = '',
}: PeriodProgressBarProps) {
  const { t } = useTranslation();

  if (progress.total === 0) return null;

  const summary = t('periodProgress.summary', {
    complete: toFaDigits(progress.complete),
    total: toFaDigits(progress.total),
  });
  const ariaLabel =
    periodNumber != null
      ? t('periodProgress.ariaLabel', {
          n: toFaDigits(periodNumber),
          complete: toFaDigits(progress.complete),
          total: toFaDigits(progress.total),
        })
      : summary;

  const barHeight = variant === 'compact' ? 'h-1.5' : 'h-2';
  const textClass =
    variant === 'compact'
      ? 'text-[11px] text-slate-400 dark:text-slate-500'
      : 'text-xs text-slate-500 dark:text-slate-400';

  return (
    <div className={`${variant === 'compact' ? 'mt-1.5 max-w-xs' : 'mt-3'} ${className}`}>
      <div className={`flex flex-wrap items-center justify-between gap-2 ${textClass}`}>
        <span>{summary}</span>
        <span>{t('periodProgress.percent', { percent: toFaDigits(progress.percentComplete) })}</span>
      </div>
      <div
        className={`mt-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700 ${barHeight}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percentComplete}
        aria-label={ariaLabel}
      >
        <div
          className={`h-full rounded-full transition-all ${progressFillClass(progress.percentComplete)}`}
          style={{ width: `${progress.percentComplete}%` }}
        />
      </div>
    </div>
  );
}
