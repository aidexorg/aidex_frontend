import { Users, ArrowLeft } from 'lucide-react';
import { toFaDigits } from '@/lib/format';
import { formatTime } from './helpers';
import type { AppointmentWithProfile } from './types';

interface ArrivalsQueueProps {
  arrivals: AppointmentWithProfile[];
  onStartTreatment: (appt: AppointmentWithProfile) => void;
  onNavigate?: () => void;
}

export function ArrivalsQueue({ arrivals, onStartTreatment, onNavigate }: ArrivalsQueueProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-700">بیماران در انتظار</h3>
          {arrivals.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-amber-500 rounded-full">
              {toFaDigits(arrivals.length)}
            </span>
          )}
        </div>
        {arrivals.length > 0 && onNavigate && (
          <button
            onClick={onNavigate}
            className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            مشاهده همه
            <ArrowLeft size={12} />
          </button>
        )}
      </div>

      {arrivals.length === 0 ? (
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Users size={18} className="text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">بیماری در انتظار نیست</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {arrivals.map((appt) => {
            const waitMinutes = Math.floor(
              (Date.now() - new Date(appt.start_time).getTime()) / 60000
            );
            const waitText =
              waitMinutes < 60
                ? `${toFaDigits(waitMinutes)} دقیقه`
                : `${toFaDigits(Math.floor(waitMinutes / 60))} ساعت ${toFaDigits(waitMinutes % 60)} دقیقه`;

            return (
              <div
                key={appt.id}
                className="card p-3 flex items-center gap-3 border-amber-200 bg-amber-50/50"
              >
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    {appt.profile
                      ? `${appt.profile.first_name} ${appt.profile.last_name}`
                      : 'بیمار ناشناس'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">
                      {formatTime(appt.start_time)}
                    </span>
                    <span className="text-[10px] text-slate-400">•</span>
                    <span className="text-xs text-amber-600">
                      {waitText} انتظار
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onStartTreatment(appt)}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg transition whitespace-nowrap"
                >
                  شروع درمان
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
