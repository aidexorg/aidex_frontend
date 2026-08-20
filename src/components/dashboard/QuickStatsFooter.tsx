import { toFaDigits } from '@/lib/format';
import type { DashboardStats } from './types';

interface QuickStatsFooterProps {
  stats: DashboardStats;
}

export function QuickStatsFooter({ stats }: QuickStatsFooterProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <div className="card p-4 text-center">
        <p className="text-2xl font-bold text-slate-900">
          {toFaDigits(stats.no_show)}
        </p>
        <p className="text-xs text-slate-500 mt-1">عدم حضور</p>
      </div>
      <div className="card p-4 text-center">
        <p className="text-2xl font-bold text-slate-900">
          {toFaDigits(stats.cancelled)}
        </p>
        <p className="text-xs text-slate-500 mt-1">لغو شده</p>
      </div>
      <div className="card p-4 text-center md:col-span-1 col-span-2">
        <p className="text-2xl font-bold text-teal-600">
          {stats.total > 0
            ? `${toFaDigits(Math.round((stats.completed / stats.total) * 100))}%`
            : '—'}
        </p>
        <p className="text-xs text-slate-500 mt-1">نرخ تکمیل</p>
      </div>
    </div>
  );
}
