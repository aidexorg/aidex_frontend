import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from '@/types';
import { STATUS_DOT, TYPE_BADGE } from './shared';

export function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-[10px] dark:border-slate-600 dark:bg-slate-800/50">
      <span className="font-medium text-slate-500 dark:text-slate-400">راهنما:</span>
      {APPOINTMENT_STATUSES.filter((s) => s.value !== 'cancelled').map((s) => (
        <span key={s.value} className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
          <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s.value]}`} aria-hidden />
          {s.label}
        </span>
      ))}
      <span className="hidden h-3 w-px bg-slate-200 sm:inline dark:bg-slate-600" aria-hidden />
      {APPOINTMENT_TYPES.slice(0, 3).map((t) => (
        <span
          key={t.value}
          className={`rounded px-1.5 py-0.5 ${TYPE_BADGE[t.value] ?? ''}`}
        >
          {t.label}
        </span>
      ))}
    </div>
  );
}
