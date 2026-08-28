import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  History,
  MousePointerClick,
} from 'lucide-react';
import { DentalChartDisplay } from '../DentalChart';
import { useTranslation } from '../LocaleProvider';
import { formatDate, formatPrice, toFaDigits } from '@/lib/format';
import { buildToothStatusMap } from '@/lib/profileOutput';
import { buildToothHistory, type ToothHistoryEntry } from '@/lib/toothHistory';
import type { Part, Period, Session } from '@/types';

interface ToothHistoryViewProps {
  periods: Period[];
  sessions: Session[];
  parts: Part[];
  actions: Action[];
}

function toothDisplayNumber(code: string): string {
  return toFaDigits(code.slice(2));
}

function HistoryEntryCard({ entry }: { entry: ToothHistoryEntry }) {
  const { t, locale } = useTranslation();
  const completed = entry.action.status === 'complete';
  const netPrice = entry.action.price - entry.action.discount;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {formatDate(entry.session.session_date, locale)}
          </p>
          <h5 className="mt-1 font-semibold text-slate-800 dark:text-slate-100">
            {entry.action.title}
          </h5>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              completed
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
            }`}
          >
            {completed ? t('toothHistory.statusComplete') : t('toothHistory.statusIncomplete')}
          </span>
          {entry.action.needs_followup && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
              <AlertCircle size={12} aria-hidden="true" />
              {t('toothHistory.needsFollowup')}
            </span>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {t('toothHistory.periodLabel', { n: toFaDigits(entry.periodNumber) })}
        {' · '}
        {t('toothHistory.sessionLabel', { n: toFaDigits(entry.session.session_number) })}
        {' · '}
        {t('toothHistory.partLabel', { n: toFaDigits(entry.part.part_number) })}
      </p>
      {completed && netPrice > 0 && (
        <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          {formatPrice(netPrice, locale)}
        </p>
      )}
      {entry.action.description && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{entry.action.description}</p>
      )}
    </article>
  );
}

function TimelineMarker({ entry }: { entry: ToothHistoryEntry }) {
  const completed = entry.action.status === 'complete';
  return (
    <span
      className={`flex h-9 w-9 items-center justify-center rounded-full border-4 border-white dark:border-slate-800 ${
        completed
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
      }`}
    >
      {completed ? (
        <CheckCircle2 size={16} aria-hidden="true" />
      ) : (
        <Clock size={16} aria-hidden="true" />
      )}
    </span>
  );
}

export function ToothHistoryView({
  periods,
  sessions,
  parts,
  actions,
}: ToothHistoryViewProps) {
  const { t } = useTranslation();
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const toothStatus = buildToothStatusMap(parts, actions);

  const entries = useMemo(
    () =>
      selectedTooth
        ? buildToothHistory({ tooth: selectedTooth, periods, sessions, parts, actions })
        : [],
    [selectedTooth, periods, sessions, parts, actions],
  );

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      healthy: t('toothHistory.toothStatus.healthy'),
      in_treatment: t('toothHistory.toothStatus.inTreatment'),
      treated: t('toothHistory.toothStatus.treated'),
      appointment_needed: t('toothHistory.toothStatus.appointmentNeeded'),
    };
    return map[status] ?? status;
  };

  const statusBadgeClass: Record<string, string> = {
    healthy: 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
    in_treatment: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    treated: 'bg-sage-50 text-sage-700 border-sage-100 dark:bg-sage-900/30 dark:text-sage-300 dark:border-sage-800',
    appointment_needed: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  };

  return (
    <section
      id="tooth-history-panel"
      className="space-y-4"
      aria-labelledby="tooth-history-title"
    >
      <div className="card p-4 sm:p-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 id="tooth-history-title" className="text-sm font-semibold text-brand-navy dark:text-slate-100">
              {t('toothHistory.title')}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">{t('toothHistory.subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
            <Legend dot="bg-white border border-slate-200 dark:border-slate-600" label={t('toothHistory.legend.healthy')} />
            <Legend dot="bg-blue-400" label={t('toothHistory.legend.inTreatment')} />
            <Legend dot="bg-sage-500" label={t('toothHistory.legend.treated')} />
            <Legend dot="bg-amber-400" label={t('toothHistory.legend.appointmentNeeded')} />
          </div>
        </div>
        <DentalChartDisplay
          toothStatus={toothStatus}
          selectedTooth={selectedTooth}
          onSelectTooth={(code) => setSelectedTooth(code === selectedTooth ? null : code)}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3 dark:border-slate-700 dark:bg-slate-900/50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              {selectedTooth ? (
                <>
                  <p className="text-xs text-slate-400">{selectedTooth.slice(0, 2)}</p>
                  <h4 className="text-base font-bold text-brand-navy dark:text-slate-100">
                    {t('toothHistory.selectedTooth', { n: toothDisplayNumber(selectedTooth) })}
                  </h4>
                </>
              ) : (
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t('toothHistory.timelineTitle')}
                </h4>
              )}
            </div>
            {selectedTooth && toothStatus[selectedTooth] && (
              <span
                className={`badge border ${statusBadgeClass[toothStatus[selectedTooth]] ?? statusBadgeClass.healthy}`}
              >
                {statusLabel(toothStatus[selectedTooth])}
              </span>
            )}
          </div>
          <p
            className="mt-1 text-xs text-slate-400"
            aria-live="polite"
            aria-atomic="true"
          >
            {selectedTooth
              ? t('toothHistory.entryCount', { count: toFaDigits(entries.length) })
              : t('toothHistory.selectPrompt')}
          </p>
        </div>

        {!selectedTooth ? (
          <div className="flex flex-col items-center justify-center py-10 px-5 text-center text-slate-400">
            <MousePointerClick size={36} className="text-slate-300" strokeWidth={1.5} aria-hidden="true" />
            <p className="mt-3 text-sm">{t('toothHistory.emptyNoSelection')}</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-5 text-center text-slate-400">
            <History size={36} className="text-slate-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
              {t('toothHistory.emptyNoHistoryTitle')}
            </p>
            <p className="mt-1 text-sm">{t('toothHistory.emptyNoHistoryDescription')}</p>
          </div>
        ) : (
          <div className="max-h-[min(70vh,calc(100dvh-14rem))] overflow-y-auto overscroll-contain p-4 sm:p-5">
            <ol
              className="relative mr-4 space-y-4 border-r-2 border-slate-200 dark:border-slate-600"
              aria-label={t('toothHistory.timelineTitle')}
            >
              {entries.map((entry) => (
                <li key={entry.action.id} className="relative pr-8">
                  <span className="absolute -right-[19px] top-2" aria-hidden="true">
                    <TimelineMarker entry={entry} />
                  </span>
                  <HistoryEntryCard entry={entry} />
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded-sm shrink-0 ${dot}`} />
      {label}
    </span>
  );
}
