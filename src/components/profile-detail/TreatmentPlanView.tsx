import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, MapPin, PlayCircle, Plus } from 'lucide-react';
import { useTranslation } from '../LocaleProvider';
import { formatPrice, toFaDigits } from '@/lib/format';
import { computePeriodProgress } from '@/lib/periodProgress';
import { PeriodProgressBar } from './PeriodProgressBar';
import { AREA_OPTIONS, type Action, type Part, type Period, type Session } from '@/types';

interface TreatmentPlanViewProps {
  periods: Period[];
  sessions: Session[];
  parts: Part[];
  actions: Action[];
  onAddPlanned: (partId: string) => void;
  onExecuteAction: (action: Action) => void;
}

function areaLabel(code: string): string {
  return AREA_OPTIONS.find((option) => option.value === code)?.label ?? code;
}

function partLocationLabel(part: Part): string {
  if (part.tooth) return `دندان ${toFaDigits(part.tooth.slice(2))}`;
  if (part.area) return areaLabel(part.area);
  return '';
}

function PeriodPlanCard({
  period,
  periodNumber,
  periodParts,
  plannedActions,
  progress,
  onAddPlanned,
  onExecuteAction,
}: {
  period: Period;
  periodNumber: number;
  periodParts: Part[];
  plannedActions: Action[];
  progress: ReturnType<typeof computePeriodProgress>;
  onAddPlanned: (partId: string) => void;
  onExecuteAction: (action: Action) => void;
}) {
  const { t, locale } = useTranslation();
  const [partId, setPartId] = useState(periodParts[0]?.id ?? '');

  useEffect(() => {
    if (!periodParts.some((part) => part.id === partId)) {
      setPartId(periodParts[0]?.id ?? '');
    }
  }, [periodParts, partId]);

  return (
    <article
      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800"
      aria-labelledby={`plan-period-${period.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4
            id={`plan-period-${period.id}`}
            className="font-semibold text-slate-800 dark:text-slate-100"
          >
            {t('planMode.periodLabel', { n: toFaDigits(periodNumber) })}
          </h4>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {t('planMode.plannedCount', { count: toFaDigits(plannedActions.length) })}
          </p>
        </div>
        {periodParts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor={`plan-part-${period.id}`}>
              {t('planMode.selectPart')}
            </label>
            <select
              id={`plan-part-${period.id}`}
              className="input py-1.5 text-xs min-w-[8rem]"
              value={partId}
              onChange={(event) => setPartId(event.target.value)}
            >
              {periodParts.map((part) => (
                <option key={part.id} value={part.id}>
                  {t('planMode.partOption', {
                    n: toFaDigits(part.part_number),
                    location: partLocationLabel(part) || t('planMode.partNoLocation'),
                  })}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-sky-700 transition"
              onClick={() => partId && onAddPlanned(partId)}
            >
              <Plus size={14} aria-hidden="true" />
              {t('planMode.addPlanned')}
            </button>
          </div>
        )}
      </div>

      <PeriodProgressBar progress={progress} periodNumber={periodNumber} />

      {plannedActions.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">{t('planMode.emptyNoPlanned')}</p>
      ) : (
        <ol className="mt-4 space-y-2" aria-label={t('planMode.plannedListLabel')}>
          {plannedActions.map((action) => {
            const part = periodParts.find((candidate) => candidate.id === action.part_id);
            const location = part ? partLocationLabel(part) : '';
            const netPrice = action.price - action.discount;

            return (
              <li
                key={action.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-100 bg-sky-50/50 px-3 py-2.5 dark:border-sky-900/40 dark:bg-sky-950/20"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">
                      {t('planMode.statusPlanned')}
                    </span>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                      {action.title}
                    </p>
                  </div>
                  {location && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <MapPin size={12} aria-hidden="true" />
                      {location}
                    </p>
                  )}
                  {netPrice > 0 && (
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                      {formatPrice(netPrice, locale)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-white px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50 transition dark:border-sky-800 dark:bg-slate-800 dark:text-sky-300"
                  onClick={() => onExecuteAction(action)}
                >
                  <PlayCircle size={14} aria-hidden="true" />
                  {t('planMode.execute')}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </article>
  );
}

export function TreatmentPlanView({
  periods,
  sessions,
  parts,
  actions,
  onAddPlanned,
  onExecuteAction,
}: TreatmentPlanViewProps) {
  const { t } = useTranslation();

  const periodRows = useMemo(() => {
    return periods.map((period, index) => {
      const periodSessions = sessions.filter((session) => session.period_id === period.id);
      const sessionIds = new Set(periodSessions.map((session) => session.id));
      const periodParts = parts.filter((part) => sessionIds.has(part.session_id));
      const partIds = new Set(periodParts.map((part) => part.id));
      const periodActions = actions.filter((action) => partIds.has(action.part_id));
      const plannedActions = periodActions.filter((action) => action.status === 'planned');
      const progress = computePeriodProgress(periodActions);

      return {
        period,
        periodNumber: index + 1,
        periodParts,
        plannedActions,
        progress,
      };
    });
  }, [periods, sessions, parts, actions]);

  const hasAnyParts = periodRows.some((row) => row.periodParts.length > 0);
  const hasAnyPlanned = periodRows.some((row) => row.plannedActions.length > 0);

  if (periods.length === 0) {
    return (
      <div className="card p-8 text-center" role="region" aria-label={t('planMode.title')}>
        <ClipboardList size={42} className="mx-auto text-slate-300" aria-hidden="true" />
        <h3 className="mt-3 font-semibold text-slate-700 dark:text-slate-200">{t('planMode.emptyNoPeriodsTitle')}</h3>
        <p className="mt-1 text-sm text-slate-400">{t('planMode.emptyNoPeriodsDescription')}</p>
      </div>
    );
  }

  return (
    <section
      id="treatment-plan-panel"
      className="card overflow-hidden"
      aria-labelledby="treatment-plan-title"
    >
      <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3 dark:border-slate-700 dark:bg-slate-900/50">
        <h3 id="treatment-plan-title" className="text-sm font-semibold text-brand-navy dark:text-slate-100">
          {t('planMode.title')}
        </h3>
        <p className="mt-0.5 text-xs text-slate-400">{t('planMode.subtitle')}</p>
      </div>

      <div className="max-h-[min(70vh,calc(100dvh-14rem))] overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-5">
        {!hasAnyParts && (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('planMode.emptyNoParts')}</p>
        )}

        {periodRows.map(({ period, periodNumber, periodParts, plannedActions, progress }) => (
          <PeriodPlanCard
            key={period.id}
            period={period}
            periodNumber={periodNumber}
            periodParts={periodParts}
            plannedActions={plannedActions}
            progress={progress}
            onAddPlanned={onAddPlanned}
            onExecuteAction={onExecuteAction}
          />
        ))}

        {!hasAnyPlanned && hasAnyParts && (
          <p className="text-center text-sm text-slate-400">{t('planMode.emptyNoPlannedGlobal')}</p>
        )}
      </div>
    </section>
  );
}
