import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, User, CalendarDays } from 'lucide-react';
import { useData } from '@/data';
import { formatDate, toFaDigits } from '@/lib/format';
import {
  APPOINTMENT_TYPES,
  getNextStatuses,
  type Appointment,
  type AppointmentStatus,
} from '@/types';
import { AppointmentForm } from './AppointmentForm';
import { ContextMenu } from './ContextMenu';
import { LoadingState } from './ui';

// ── Constants ──

const CHAIRS = [
  { id: 'chair_1', label: 'صندلی ۱' },
  { id: 'chair_2', label: 'صندلی ۲' },
  { id: 'hygiene', label: 'بهداشت' },
  { id: 'surgery', label: 'جراحی' },
];

const STATUS_DOT: Record<AppointmentStatus, string> = {
  scheduled: 'bg-slate-400',
  confirmed: 'bg-sky-500',
  arrived: 'bg-amber-500',
  in_progress: 'bg-teal-500',
  completed: 'bg-emerald-500',
  no_show: 'bg-red-500',
  cancelled: 'bg-slate-300',
};

const STATUS_BG: Record<AppointmentStatus, string> = {
  scheduled: 'bg-slate-50 border-slate-200',
  confirmed: 'bg-sky-50 border-sky-200',
  arrived: 'bg-amber-50 border-amber-300',
  in_progress: 'bg-teal-50 border-teal-300',
  completed: 'bg-emerald-50 border-emerald-200',
  no_show: 'bg-red-50 border-red-200',
  cancelled: 'bg-slate-50 border-slate-200',
};

const TYPE_BADGE: Record<string, string> = {
  consultation: 'bg-sky-100 text-sky-700',
  treatment: 'bg-teal-100 text-teal-700',
  followup: 'bg-amber-100 text-amber-700',
  emergency: 'bg-red-100 text-red-700',
  hygiene: 'bg-emerald-100 text-emerald-700',
};

// ── Helpers ──

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function jalaliDayLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    const parts = new Intl.DateTimeFormat('fa-IR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).formatToParts(d);
    return parts.map((p) => p.value).join(' ');
  } catch {
    return dateStr;
  }
}

function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatEndTime(iso: string, durationMinutes: number): string {
  const d = new Date(new Date(iso).getTime() + durationMinutes * 60000);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function getStatusLabel(s: AppointmentStatus): string {
  const labels: Record<AppointmentStatus, string> = {
    scheduled: 'برنامه‌ریزی شده',
    confirmed: 'تأیید شده',
    arrived: 'رسیده',
    in_progress: 'در حال درمان',
    completed: 'تکمیل شده',
    no_show: 'عدم حضور',
    cancelled: 'لغو شده',
  };
  return labels[s] ?? s;
}

// ── Types ──

interface DailyCalendarProps {
  onOpenProfile?: (profile: { id: string; first_name: string; last_name: string; file_number?: string | null; phone?: string | null }) => void;
}

// ── Component ──

export function DailyCalendar({ onOpenProfile }: DailyCalendarProps) {
  const data = useData();
  const [selectedDate, setSelectedDate] = useState(todayISODate());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profiles, setProfiles] = useState<Map<string, { first_name: string; last_name: string; file_number?: string | null }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formPrefill, setFormPrefill] = useState<{
    profileId?: string;
    startTime?: string;
    chairId?: string;
    dentistId?: string;
  }>({});
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    appointment: Appointment;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [appts, profs] = await Promise.all([
        data.listAppointments({ date: selectedDate }),
        data.listProfiles(),
      ]);
      setAppointments(appts);
      setProfiles(new Map(profs.map((p) => [p.id, p])));
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [data, selectedDate]);

  useEffect(() => {
    load();
  }, [load]);

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current && selectedDate === todayISODate()) {
      const now = new Date();
      const currentHour = now.getHours();
      // Scroll to approximately the current time position
      const scrollTarget = Math.max(0, (currentHour - 8) * 60 - 60);
      scrollRef.current.scrollTop = scrollTarget;
    }
  }, [selectedDate, loading]);

  // ── Sort appointments by start time ──

  const sortedAppointments = [...appointments].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  // ── Group by time slots (hourly) ──

  const timeSlots: { hour: string; appointments: Appointment[] }[] = [];
  for (let h = 8; h <= 18; h++) {
    const hourStr = String(h).padStart(2, '0');
    const hourAppts = sortedAppointments.filter((a) => {
      const d = new Date(a.start_time);
      return d.getHours() === h;
    });
    timeSlots.push({ hour: `${hourStr}:00`, appointments: hourAppts });
  }

  // ── Chair summary ──

  const chairSummary = CHAIRS.map((chair) => {
    const occupied = sortedAppointments.find(
      (a) =>
        a.chair_id === chair.id &&
        a.status !== 'cancelled' &&
        a.status !== 'completed' &&
        a.status !== 'no_show' &&
        new Date(a.start_time).getTime() <= Date.now() &&
        new Date(a.start_time).getTime() + a.duration_minutes * 60000 > Date.now()
    );
    const nextUp = sortedAppointments.find(
      (a) =>
        a.chair_id === chair.id &&
        a.status !== 'cancelled' &&
        a.status !== 'completed' &&
        a.status !== 'no_show' &&
        new Date(a.start_time).getTime() > Date.now()
    );
    return {
      ...chair,
      occupied,
      nextUp,
      status: occupied ? 'occupied' : nextUp ? 'next_up' : 'empty',
    };
  });

  const occupiedCount = chairSummary.filter((c) => c.status === 'occupied').length;
  const emptyCount = chairSummary.filter((c) => c.status === 'empty').length;

  // ── Handlers ──

  const navigateDate = (delta: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const goToToday = () => setSelectedDate(todayISODate());

  const handleSlotClick = (hour: string) => {
    const startTime = `${selectedDate}T${hour}:00`;
    setEditingAppt(null);
    setFormPrefill({ startTime });
    setFormOpen(true);
  };

  const handleCardClick = (appt: Appointment) => {
    setEditingAppt(appt);
    setFormPrefill({});
    setFormOpen(true);
  };

  const handleStatusChange = async (appt: Appointment, newStatus: AppointmentStatus) => {
    try {
      await data.updateAppointment(appt.id, { status: newStatus });
      load();
    } catch {
      // error handled silently
    }
  };

  const handleContextMenu = (e: React.MouseEvent, appt: Appointment) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, appointment: appt });
  };

  const handleTouchStart = (e: React.TouchEvent, appt: Appointment) => {
    const touch = e.touches[0];
    longPressTimerRef.current = setTimeout(() => {
      setContextMenu({ x: touch.clientX, y: touch.clientY, appointment: appt });
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const typeLabel = (t: string) =>
    APPOINTMENT_TYPES.find((tp) => tp.value === t)?.label ?? t;

  const isNow = (appt: Appointment) => {
    const now = Date.now();
    const start = new Date(appt.start_time).getTime();
    const end = start + appt.duration_minutes * 60000;
    return now >= start && now < end;
  };

  const isPast = (appt: Appointment) => {
    return new Date(appt.start_time).getTime() + appt.duration_minutes * 60000 < Date.now();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => navigateDate(-1)} className="btn-ghost p-2">
            <ChevronRight size={18} />
          </button>
          <div className="text-center min-w-[200px]">
            <p className="text-sm font-semibold text-slate-800">
              {jalaliDayLabel(selectedDate)}
            </p>
            <p className="text-xs text-slate-400">{formatDate(selectedDate)}</p>
          </div>
          <button onClick={() => navigateDate(1)} className="btn-ghost p-2">
            <ChevronLeft size={18} />
          </button>
          {selectedDate !== todayISODate() && (
            <button onClick={goToToday} className="btn-secondary text-xs">
              امروز
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingAppt(null);
              setFormPrefill({});
              setFormOpen(true);
            }}
            className="btn-primary text-xs"
          >
            <Plus size={14} />
            نوبت جدید
          </button>
        </div>
      </div>

      {/* Chair summary bar */}
      <div className="card p-3">
        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-500 font-medium">وضعیت صندلی‌ها:</span>
          {chairSummary.map((chair) => (
            <div key={chair.id} className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  chair.status === 'occupied'
                    ? 'bg-teal-500'
                    : chair.status === 'next_up'
                    ? 'bg-amber-400'
                    : 'bg-slate-300'
                }`}
              />
              <span className="text-slate-600">{chair.label}</span>
            </div>
          ))}
          <span className="text-slate-400 mr-auto">
            {toFaDigits(occupiedCount)} اشغال · {toFaDigits(emptyCount)} خالی
          </span>
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <LoadingState />
      ) : sortedAppointments.length === 0 ? (
        <div className="card p-8 text-center">
          <CalendarDays size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-sm text-slate-500">نوبتی برای این روز ثبت نشده</p>
          <button
            onClick={() => {
              setEditingAppt(null);
              setFormPrefill({});
              setFormOpen(true);
            }}
            className="btn-primary mt-3 text-xs"
          >
            <Plus size={14} />
            ایجاد نوبت
          </button>
        </div>
      ) : (
        <div ref={scrollRef} className="card overflow-hidden">
          <div className="divide-y divide-slate-100">
            {timeSlots.map(({ hour, appointments: slotAppts }) => {
              const hasAppts = slotAppts.length > 0;
              const isCurrentHour =
                selectedDate === todayISODate() &&
                new Date().getHours() === parseInt(hour.split(':')[0]);

              return (
                <div
                  key={hour}
                  className={`flex ${isCurrentHour ? 'bg-teal-50/30' : ''}`}
                  onClick={() => !hasAppts && handleSlotClick(hour)}
                >
                  {/* Time column */}
                  <div className="w-20 shrink-0 px-3 py-3 border-l border-slate-100 bg-slate-50/50">
                    <span
                      className={`text-xs font-mono ${
                        isCurrentHour ? 'text-teal-700 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {toFaDigits(hour)}
                    </span>
                  </div>

                  {/* Appointments column */}
                  <div className="flex-1 min-h-[48px]">
                    {hasAppts ? (
                      <div className="divide-y divide-slate-50">
                        {slotAppts.map((appt) => {
                          const profile = profiles.get(appt.profile_id);
                          const typeCfg = APPOINTMENT_TYPES.find(
                            (t) => t.value === appt.type
                          );
                          const active = isNow(appt);
                          const past = isPast(appt);

                          return (
                            <div
                              key={appt.id}
                              className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${
                                active
                                  ? 'bg-teal-50/80 border-r-2 border-teal-500'
                                  : past
                                  ? 'opacity-50 hover:bg-slate-50'
                                  : 'hover:bg-slate-50'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCardClick(appt);
                              }}
                              onContextMenu={(e) => handleContextMenu(e, appt)}
                              onTouchStart={(e) => handleTouchStart(e, appt)}
                              onTouchEnd={handleTouchEnd}
                              onTouchMove={handleTouchEnd}
                            >
                              {/* Status dot */}
                              <div
                                className={`w-3 h-3 rounded-full shrink-0 ${
                                  active ? 'bg-teal-500 animate-pulse' : STATUS_DOT[appt.status]
                                }`}
                              />

                              {/* Main info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-slate-800">
                                    {profile
                                      ? `${profile.first_name} ${profile.last_name}`
                                      : 'بیمار ناشناس'}
                                  </span>
                                  {typeCfg && (
                                    <span
                                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                                        TYPE_BADGE[appt.type] ?? 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {typeCfg.label}
                                    </span>
                                  )}
                                  {active && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 font-medium">
                                      فعال
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                                  <Clock size={11} />
                                  <span>
                                    {toFaDigits(formatTimeShort(appt.start_time))} –{' '}
                                    {toFaDigits(formatEndTime(appt.start_time, appt.duration_minutes))}
                                  </span>
                                  <span>·</span>
                                  <span>{toFaDigits(appt.duration_minutes)} دقیقه</span>
                                </div>
                              </div>

                              {/* Chair label */}
                              <div className="shrink-0">
                                <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                  {CHAIRS.find((c) => c.id === appt.chair_id)?.label ?? '—'}
                                </span>
                              </div>

                              {/* Status badge */}
                              <div
                                className={`shrink-0 text-[10px] px-2 py-1 rounded font-medium ${
                                  STATUS_DOT[appt.status]
                                } text-white`}
                              >
                                {getStatusLabel(appt.status)}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1 shrink-0">
                                {getNextStatuses(appt.status).length > 0 && (
                                  <div className="flex gap-1">
                                    {getNextStatuses(appt.status).slice(0, 1).map((trans) => (
                                      <button
                                        key={trans.status}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusChange(appt, trans.status);
                                        }}
                                        className={`text-[10px] font-medium px-2 py-1 rounded transition ${trans.color}`}
                                      >
                                        {trans.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-full flex items-center px-4">
                        <span className="text-xs text-slate-300">—</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Form */}
      {formOpen && (
        <AppointmentForm
          open={formOpen}
          onClose={() => {
            setFormOpen(false);
            setEditingAppt(null);
            setFormPrefill({});
          }}
          onSaved={() => {
            setFormOpen(false);
            setEditingAppt(null);
            setFormPrefill({});
            load();
          }}
          editing={editingAppt}
          prefillProfileId={formPrefill.profileId}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          appointment={contextMenu.appointment}
          onClose={() => setContextMenu(null)}
          onStatusChange={(appt, status) =>
            handleStatusChange(appt, status as AppointmentStatus)
          }
          onEdit={(appt) => {
            setEditingAppt(appt);
            setFormPrefill({});
            setFormOpen(true);
          }}
          onOpenProfile={(appt) => {
            if (onOpenProfile) {
              const profile = profiles.get(appt.profile_id);
              if (profile) {
                onOpenProfile({ id: appt.profile_id, ...profile } as { id: string; first_name: string; last_name: string; file_number?: string | null; phone?: string | null });
              }
            }
          }}
        />
      )}
    </div>
  );
}
