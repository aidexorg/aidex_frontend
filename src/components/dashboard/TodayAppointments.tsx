import { CalendarDays, ArrowLeft } from 'lucide-react';
import { APPOINTMENT_TYPES } from '@/types';
import { formatPrice, toFaDigits } from '@/lib/format';
import { formatTime } from './helpers';
import { STATUS_CONFIG, TYPE_COLORS } from './constants';
import type { AppointmentWithProfile } from './types';
import type { Profile } from '@/types';

interface TodayAppointmentsProps {
  appointments: AppointmentWithProfile[];
  balanceByProfileId: Map<string, number>;
  onOpenProfile?: (profile: Profile) => void;
  onNavigate?: () => void;
  maxItems?: number;
}

export function TodayAppointments({
  appointments,
  balanceByProfileId,
  onOpenProfile,
  onNavigate,
  maxItems,
}: TodayAppointmentsProps) {
  const displayed = maxItems ? appointments.slice(0, maxItems) : appointments;
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">نوبت‌های امروز</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {toFaDigits(appointments.length)} نوبت
          </p>
        </div>
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            مشاهده همه
            <ArrowLeft size={12} />
          </button>
        )}
      </div>

      {appointments.length === 0 ? (
        <div className="p-8 text-center">
          <CalendarDays size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-sm text-slate-500">نوبتی برای امروز ثبت نشده</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {displayed.map((appt) => {
            const statusConfig = STATUS_CONFIG[appt.status];
            const typeConfig = APPOINTMENT_TYPES.find((t) => t.value === appt.type);
            const isPast = new Date(appt.start_time).getTime() < Date.now();
            const isActive = appt.status === 'in_progress' || appt.status === 'arrived';

            return (
              <div
                key={appt.id}
                className={`px-5 py-3 flex items-center gap-4 hover:bg-slate-50 transition ${
                  isActive ? 'bg-teal-50/50' : ''
                } ${isPast ? 'opacity-60' : ''}`}
              >
                <div className="w-16 text-center shrink-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {toFaDigits(formatTime(appt.start_time))}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {toFaDigits(appt.duration_minutes)} دقیقه
                  </p>
                </div>

                <div
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    isActive ? 'bg-teal-500 animate-pulse' : statusConfig.bg
                  }`}
                />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {appt.profile
                      ? `${appt.profile.first_name} ${appt.profile.last_name}`
                      : 'بیمار ناشناس'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {typeConfig && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          TYPE_COLORS[appt.type] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {typeConfig.label}
                      </span>
                    )}
                    {appt.notes && (
                      <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                        {appt.notes}
                      </span>
                    )}
                  </div>
                </div>

                {(() => {
                  const balance = balanceByProfileId.get(appt.profile_id);
                  if (!balance || balance <= 0) return null;
                  return (
                    <div className="px-2 py-1 rounded-lg text-[10px] font-bold text-white bg-red-500">
                      {formatPrice(balance)}
                    </div>
                  );
                })()}

                <div
                  className={`px-2 py-1 rounded-lg text-[10px] font-medium ${statusConfig.bg} ${statusConfig.color}`}
                >
                  {statusConfig.label}
                </div>

                {appt.profile && onOpenProfile && (
                  <button
                    onClick={() => onOpenProfile(appt.profile!)}
                    className="text-slate-400 hover:text-teal-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
                  >
                    <ArrowLeft size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
