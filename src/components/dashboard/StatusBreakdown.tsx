import { APPOINTMENT_STATUSES } from '@/types';
import { toFaDigits } from '@/lib/format';
import { STATUS_CONFIG } from './constants';
import type { DashboardStats } from './types';

interface StatusBreakdownProps {
  stats: DashboardStats;
}

export function StatusBreakdown({ stats }: StatusBreakdownProps) {
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">وضعیت نوبت‌ها</h3>
      <div className="flex flex-wrap gap-2">
        {APPOINTMENT_STATUSES.map((status) => {
          const config = STATUS_CONFIG[status.value];
          const count = stats[status.value];
          if (count === 0) return null;
          const Icon = config.icon;
          return (
            <div
              key={status.value}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bg}`}
            >
              <Icon size={14} className={config.color} />
              <span className={`text-sm font-medium ${config.color}`}>
                {toFaDigits(count)}
              </span>
              <span className="text-xs text-slate-500">{status.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
