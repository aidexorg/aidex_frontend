import { useState, useEffect, useCallback } from 'react';
import { Users, Clock, CalendarDays, User } from 'lucide-react';
import { useData } from '@/data';
import { formatDate, toFaDigits } from '@/lib/format';
import {
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUSES,
  getNextStatuses,
  type Appointment,
  type AppointmentStatus,
} from '@/types';
import type { Profile } from '@/types';
import { LoadingState, EmptyState } from './ui';
import { useToast } from './ToastProvider';

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled: 'bg-slate-400',
  confirmed: 'bg-sky-500',
  arrived: 'bg-amber-500',
  in_progress: 'bg-teal-500',
  completed: 'bg-emerald-500',
  no_show: 'bg-red-500',
  cancelled: 'bg-slate-300',
};

const STATUS_BG: Record<AppointmentStatus, string> = {
  scheduled: 'bg-slate-100 text-slate-600',
  confirmed: 'bg-sky-100 text-sky-700',
  arrived: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-teal-100 text-teal-700',
  completed: 'bg-emerald-100 text-emerald-700',
  no_show: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-400',
};

const TYPE_BADGE: Record<string, string> = {
  consultation: 'bg-sky-50 text-sky-700 border-sky-200',
  treatment: 'bg-teal-50 text-teal-700 border-teal-200',
  followup: 'bg-amber-50 text-amber-700 border-amber-200',
  emergency: 'bg-red-50 text-red-700 border-red-200',
  hygiene: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const CHAIRS: Record<string, string> = {
  chair_1: 'صندلی ۱',
  chair_2: 'صندلی ۲',
  hygiene: 'بهداشت',
  surgery: 'جراحی',
};

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '';
  }
}

interface ArrivalsViewProps {
  onOpenProfile?: (profile: Profile) => void;
}

export function ArrivalsView({ onOpenProfile }: ArrivalsViewProps) {
  const data = useData();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const today = todayISODate();
      const [allAppts, profs] = await Promise.all([
        data.listAppointments({ date: today }),
        data.listProfiles(),
      ]);
      // Sort by start_time ascending
      const sorted = allAppts.sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      setAppointments(sorted);
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

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  const handleStatusChange = async (appt: Appointment, newStatus: AppointmentStatus) => {
    try {
      await data.updateAppointment(appt.id, { status: newStatus });
      toast(`وضعیت نوبت به «${APPOINTMENT_STATUSES.find((s) => s.value === newStatus)?.label}» تغییر کرد`, 'success');
      load();
    } catch {
      toast('خطا در تغییر وضعیت', 'error');
    }
  };

  // Status counts
  const counts = {
    scheduled: appointments.filter((a) => a.status === 'scheduled').length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    arrived: appointments.filter((a) => a.status === 'arrived').length,
    in_progress: appointments.filter((a) => a.status === 'in_progress').length,
  };

  const typeLabel = (t: string) =>
    APPOINTMENT_TYPES.find((tp) => tp.value === t)?.label ?? t;

  const statusLabel = (s: AppointmentStatus) =>
    APPOINTMENT_STATUSES.find((st) => st.value === s)?.label ?? s;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="page-title">ورودی‌های امروز</h1>
        <p className="page-sub">{formatDate(todayISODate())}</p>
      </div>

      {/* Status summary bar */}
      {!loading && appointments.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <div className="card p-3 text-center">
            <div className="text-2xl font-bold text-slate-700">{toFaDigits(counts.scheduled)}</div>
            <div className="text-xs text-slate-500 mt-1">等待 تأیید</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-2xl font-bold text-sky-600">{toFaDigits(counts.confirmed)}</div>
            <div className="text-xs text-slate-500 mt-1">تأیید شده</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-2xl font-bold text-amber-600">{toFaDigits(counts.arrived)}</div>
            <div className="text-xs text-slate-500 mt-1">حاضر</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-2xl font-bold text-teal-600">{toFaDigits(counts.in_progress)}</div>
            <div className="text-xs text-slate-500 mt-1">در حال درمان</div>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : appointments.length === 0 ? (
        <div className="card">
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
            const typeCfg = APPOINTMENT_TYPES.find((t) => t.value === appt.type);
            const nextStatuses = getNextStatuses(appt.status);

            return (
              <div
                key={appt.id}
                className="card p-4 hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-4">
                  {/* Status dot */}
                  <div className={`w-3 h-3 rounded-full shrink-0 ${STATUS_COLORS[appt.status]}`} />

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900">
                        {profile
                          ? `${profile.first_name} ${profile.last_name}`
                          : 'بیمار ناشناس'}
                      </span>
                      <span className={`badge text-[10px] ${STATUS_BG[appt.status]}`}>
                        {statusLabel(appt.status)}
                      </span>
                      {typeCfg && (
                        <span className={`badge text-[10px] border ${TYPE_BADGE[appt.type] ?? ''}`}>
                          {typeCfg.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {formatTime(appt.start_time)} — {toFaDigits(appt.duration_minutes)} دقیقه
                      </span>
                      {appt.chair_id && (
                        <span>{CHAIRS[appt.chair_id] ?? appt.chair_id}</span>
                      )}
                    </div>
                  </div>

                  {/* Profile button */}
                  {profile && onOpenProfile && (
                    <button
                      onClick={() => onOpenProfile(profile)}
                      className="text-slate-400 hover:text-teal-600 p-2 rounded-lg hover:bg-slate-50"
                      title="پرونده بیمار"
                    >
                      <User size={16} />
                    </button>
                  )}
                </div>

                {/* Quick action buttons */}
                {nextStatuses.length > 0 && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                    {nextStatuses.map((trans) => (
                      <button
                        key={trans.status}
                        onClick={() => handleStatusChange(appt, trans.status)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${trans.color}`}
                      >
                        {trans.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
