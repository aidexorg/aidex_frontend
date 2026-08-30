import { useState, useEffect, useCallback } from 'react';
import { Clock, CalendarDays, User } from 'lucide-react';
import { useData } from '@/data';
import { formatDate, toFaDigits } from '@/lib/format';
import {
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUSES,
  type Appointment,
  type AppointmentStatus,
} from '@/types';
import type { Profile } from '@/types';
import { LoadingState, EmptyState } from './ui';
import { useToast } from './ToastProvider';
import {
  STATUS_DOT,
  STATUS_BADGE,
  TYPE_BADGE,
  CHAIR_LABELS,
  todayISODate,
  formatTimeShort,
  appointmentStatusLabel,
  appointmentTypeLabel,
  AppointmentStatusActions,
} from './calendar';

interface ArrivalsViewProps {
  onOpenProfile?: (profile: Profile) => void;
  embedded?: boolean;
}

export function ArrivalsView({ onOpenProfile, embedded = false }: ArrivalsViewProps) {
  const data = useData();
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = todayISODate();
      const [allAppts, profs] = await Promise.all([
        data.listAppointments({ date: today }),
        data.listProfiles(),
      ]);
      setAppointments(
        allAppts.sort(
          (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        )
      );
      setProfiles(new Map(profs.map((p) => [p.id, p])));
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  const handleStatusChange = async (appt: Appointment, newStatus: AppointmentStatus) => {
    try {
      await data.updateAppointment(appt.id, { status: newStatus });
      showToast({
        message: `وضعیت نوبت به «${APPOINTMENT_STATUSES.find((s) => s.value === newStatus)?.label}» تغییر کرد`,
        variant: 'success',
      });
      load();
    } catch {
      showToast({ message: 'خطا در تغییر وضعیت', variant: 'error' });
    }
  };

  const counts = {
    scheduled: appointments.filter((a) => a.status === 'scheduled').length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    arrived: appointments.filter((a) => a.status === 'arrived').length,
    in_progress: appointments.filter((a) => a.status === 'in_progress').length,
  };

  return (
    <div className="space-y-4">
      {!embedded && (
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">ورودی‌های امروز</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500">{formatDate(todayISODate())}</p>
        </div>
      )}

      {!loading && appointments.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <div className="card p-3 text-center dark:border-slate-600">
            <div className="text-xl font-bold text-slate-700 dark:text-slate-200 sm:text-2xl">
              {toFaDigits(counts.scheduled)}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">در انتظار تأیید</div>
          </div>
          <div className="card p-3 text-center dark:border-slate-600">
            <div className="text-xl font-bold text-sky-600 sm:text-2xl">{toFaDigits(counts.confirmed)}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">تأیید شده</div>
          </div>
          <div className="card p-3 text-center dark:border-slate-600">
            <div className="text-xl font-bold text-amber-600 sm:text-2xl">{toFaDigits(counts.arrived)}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">حاضر</div>
          </div>
          <div className="card p-3 text-center dark:border-slate-600">
            <div className="text-xl font-bold text-teal-600 sm:text-2xl">
              {toFaDigits(counts.in_progress)}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">در حال درمان</div>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : appointments.length === 0 ? (
        <div className="card dark:border-slate-600">
          <EmptyState
            icon={<CalendarDays size={48} />}
            title="نوبتی برای امروز ثبت نشده"
            description="هنوز نوبتی برای امروز ایجاد نشده است."
          />
        </div>
      ) : (
        <div className="space-y-2">
          {appointments.map((appt) => {
            const profile = profiles.get(appt.profile_id);

            return (
              <div
                key={appt.id}
                className="card p-4 transition-all hover:shadow-md dark:border-slate-600"
              >
                <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                  <div
                    className={`mt-1 h-3 w-3 shrink-0 rounded-full sm:mt-0 ${STATUS_DOT[appt.status]}`}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {profile
                          ? `${profile.first_name} ${profile.last_name}`
                          : 'بیمار ناشناس'}
                      </span>
                      <span className={`badge text-[10px] ${STATUS_BADGE[appt.status]}`}>
                        {appointmentStatusLabel(appt.status)}
                      </span>
                      <span
                        className={`badge border text-[10px] ${TYPE_BADGE[appt.type] ?? ''}`}
                      >
                        {appointmentTypeLabel(appt.type)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock size={11} aria-hidden />
                        {toFaDigits(formatTimeShort(appt.start_time))} —{' '}
                        {toFaDigits(appt.duration_minutes)} دقیقه
                      </span>
                      {appt.chair_id && (
                        <span>{CHAIR_LABELS[appt.chair_id] ?? appt.chair_id}</span>
                      )}
                    </div>
                  </div>

                  {profile && onOpenProfile && (
                    <button
                      type="button"
                      onClick={() => onOpenProfile(profile)}
                      className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-teal-600 dark:hover:bg-slate-700"
                      title="پرونده بیمار"
                      aria-label="پرونده بیمار"
                    >
                      <User size={16} />
                    </button>
                  )}
                </div>

                <AppointmentStatusActions
                  status={appt.status}
                  onStatusChange={(status) => handleStatusChange(appt, status)}
                  size="md"
                  className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700"
                  stopPropagation={false}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
