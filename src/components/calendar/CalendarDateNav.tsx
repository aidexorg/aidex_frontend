import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarDateNavProps {
  title: string;
  subtitle?: string;
  showToday?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday?: () => void;
  prevLabel: string;
  nextLabel: string;
}

export function CalendarDateNav({
  title,
  subtitle,
  showToday = false,
  onPrev,
  onNext,
  onToday,
  prevLabel,
  nextLabel,
}: CalendarDateNavProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1">
        <button type="button" onClick={onPrev} className="btn-ghost p-2" aria-label={prevLabel}>
          <ChevronRight size={18} />
        </button>
        <div className="min-w-[180px] px-2 text-center sm:min-w-[220px]">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
          {subtitle && (
            <p className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
          )}
        </div>
        <button type="button" onClick={onNext} className="btn-ghost p-2" aria-label={nextLabel}>
          <ChevronLeft size={18} />
        </button>
        {showToday && onToday && (
          <button type="button" onClick={onToday} className="btn-secondary text-xs">
            امروز
          </button>
        )}
      </div>
    </div>
  );
}
