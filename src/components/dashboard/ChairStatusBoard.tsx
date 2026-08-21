import { APPOINTMENT_TYPES } from '@/types';
import { formatTime } from './helpers';
import { TYPE_COLORS } from './constants';
import type { ChairStatus } from './types';

interface ChairStatusBoardProps {
  chairStatuses: ChairStatus[];
}

export function ChairStatusBoard({ chairStatuses }: ChairStatusBoardProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-3">وضعیت صندلی‌ها</h3>
      <div className="flex flex-wrap gap-3">
        {chairStatuses.map((chair) => {
          const borderColor =
            chair.status === 'occupied'
              ? 'border-teal-300 bg-teal-50'
              : chair.status === 'next_up'
                ? 'border-amber-300 bg-amber-50'
                : 'border-slate-200 bg-slate-50';

          const statusLabel =
            chair.status === 'occupied'
              ? 'در حال درمان'
              : chair.status === 'next_up'
                ? 'نوبت بعدی'
                : 'خالی';

          const statusColor =
            chair.status === 'occupied'
              ? 'text-teal-600'
              : chair.status === 'next_up'
                ? 'text-amber-600'
                : 'text-slate-400';

          const activeAppt = chair.current ?? chair.upcoming;

          return (
            <div
              key={chair.id}
              className={`border-2 rounded-xl p-3 transition-all flex-1 min-w-[180px] max-w-[280px] ${borderColor}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      chair.status === 'occupied'
                        ? 'bg-teal-500 animate-pulse'
                        : chair.status === 'next_up'
                          ? 'bg-amber-400'
                          : 'bg-slate-300'
                    }`}
                  />
                  <span className="text-sm font-semibold text-slate-800">
                    {chair.label}
                  </span>
                </div>
                <span className={`text-[10px] font-medium ${statusColor}`}>
                  {statusLabel}
                </span>
              </div>

              {activeAppt ? (
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-medium text-slate-800">
                    {activeAppt.profile
                      ? `${activeAppt.profile.first_name} ${activeAppt.profile.last_name}`
                      : 'بیمار ناشناس'}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {formatTime(activeAppt.start_time)}
                    </span>
                    {(() => {
                      const typeConfig = APPOINTMENT_TYPES.find(
                        (t) => t.value === activeAppt.type
                      );
                      if (!typeConfig) return null;
                      return (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${
                            TYPE_COLORS[activeAppt.type] ??
                            'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {typeConfig.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-xs text-slate-400">
                    نوبتی ثبت نشده
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
