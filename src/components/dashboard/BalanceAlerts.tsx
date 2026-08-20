import { CheckCircle2 } from 'lucide-react';
import { formatPrice, toFaDigits } from '@/lib/format';
import { formatTime } from './helpers';
import type { BalanceAlert } from './types';

interface BalanceAlertsProps {
  alerts: BalanceAlert[];
  onNavigate?: () => void;
}

export function BalanceAlerts({ alerts, onNavigate }: BalanceAlertsProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-700">بدهی‌های امروز</h3>
          {alerts.length > 0 && (
            <span className="inline-flex items-center justify-center px-2 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full">
              {toFaDigits(alerts.length)}
            </span>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-emerald-400" />
            </div>
            <p className="text-sm text-slate-500">بیمار امروز با بدهی معوق وجود ندارد</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.appointment.id}
              className="card p-3 flex items-center gap-3 border border-red-200 bg-red-50/50"
            >
              <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">
                  {alert.appointment.profile
                    ? `${alert.appointment.profile.first_name} ${alert.appointment.profile.last_name}`
                    : 'بیمار ناشناس'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500">
                    {formatTime(alert.appointment.start_time)}
                  </span>
                  {alert.daysOverdue > 0 && (
                    <>
                      <span className="text-[10px] text-slate-400">•</span>
                      <span className="text-[10px] text-red-500">
                        {toFaDigits(alert.daysOverdue)} روز معوق
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-red-600">
                  {formatPrice(alert.balance)}
                </span>
                {onNavigate && (
                  <button
                    onClick={onNavigate}
                    className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-medium rounded-lg transition"
                  >
                    ثبت پرداخت
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
