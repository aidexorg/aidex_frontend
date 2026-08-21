import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react';
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

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = (day + 1) % 7;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getWeekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function jalaliDayHeader(dateStr: string): { dayName: string; dayNum: string } {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    const parts = new Intl.DateTimeFormat('fa-IR', {
      weekday: 'short',
      day: 'numeric',
    }).formatToParts(d);
    const dayName = parts.find((p) => p.type === 'weekday')?.value ?? '';
    const dayNum = parts.find((p) => p.type === 'day')?.value ?? '';
    return { dayName, dayNum };
  } catch {
    return { dayName: '', dayNum: dateStr.slice(8, 10) };
  }
}

function jalaliMonthYear(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return new Intl.DateTimeFormat('fa-IR', {
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return '';
  }
}

function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// ── Types ──

interface WeeklyCalendarProps {
  onOpenProfile?: (profile: { id: string; first_name: string; last_name: string; file_number?: string | null; phone?: string | null }) => void;
}

// ── Component ──

export function WeeklyCalendar({ onOpenProfile }: WeeklyCalendarProps) {
  const data = useData();
  const [weekStart, setWeekStart] = useState(getWeekStart(todayISODate()));
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
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allAppts, profs] = await Promise.all([
        data.listAppointments(),
        data.listProfiles(),
      ]);
      const weekSet = new Set(weekDates);
      const appts = allAppts.filter((a) => weekSet.has(a.start_time.slice(0, 10)));
      setAppointments(appts);
      setProfiles(new Map(profs.map((p) => [p.id, p])));
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [data, weekDates]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Group appointments by date ──

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const date of weekDates) {
      map.set(date, []);
    }
    for (const appt of appointments) {
      const dateStr = appt.start_time.slice(0, 10);
      const list = map.get(dateStr);
      if (list) list.push(appt);
    }
    // Sort each day's appointments by start time
    for (const [date, appts] of map) {
      map.set(date, appts.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
    }
    return map;
  }, [appointments, weekDates]);

  // ── Daily summary stats ──

  const dailyStats = useMemo(() => {
    const stats = new Map<string, { total: number; completed: number; active: number }>();
    for (const date of weekDates) {
      const dayAppts = appointmentsByDate.get(date) ?? [];
      stats.set(date, {
        total: dayAppts.length,
        completed: dayAppts.filter((a) => a.status === 'completed').length,
        active: dayAppts.filter((a) => a.status === 'in_progress' || a.status === 'arrived').length,
      });
    }
    return stats;
  }, [appointmentsByDate, weekDates]);

  // ── Handlers ──

  const navigateWeek = (delta: number) => {
    setWeekStart(addDays(weekStart, delta * 7));
  };

  const goToToday = () => setWeekStart(getWeekStart(todayISODate()));

  const isToday = (dateStr: string) => dateStr === todayISODate();

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

  const monthLabel = jalaliMonthYear(weekDates[0]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => navigateWeek(-1)} className="btn-ghost p-2">
            <ChevronRight size={18} />
          </button>
          <div className="text-center min-w-[200px]">
            <p className="text-sm font-semibold text-slate-800">
              {monthLabel}
            </p>
            <p className="text-xs text-slate-400">
              {formatDate(weekDates[0])} — {formatDate(weekDates[6])}
            </p>
          </div>
          <button onClick={() => navigateWeek(1)} className="btn-ghost p-2">
            <ChevronLeft size={18} />
          </button>
          {!weekDates.some(isToday) && (
            <button onClick={goToToday} className="btn-secondary text-xs">
              امروز
            </button>
          )}
        </div>

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

      {loading ? (
        <LoadingState />
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((dateStr) => {
            const { dayName, dayNum } = jalaliDayHeader(dateStr);
            const today = isToday(dateStr);
            const dayAppts = appointmentsByDate.get(dateStr) ?? [];
            const stats = dailyStats.get(dateStr);

            return (
              <div
                key={dateStr}
                className={`rounded-xl border overflow-hidden ${
                  today
                    ? 'border-teal-300 bg-teal-50/30'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* Day header */}
                <div
                  className={`px-2 py-2 text-center border-b ${
                    today ? 'bg-teal-100/80 border-teal-200' : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <span
                    className={`text-[10px] font-medium ${
                      today ? 'text-teal-700' : 'text-slate-500'
                    }`}
                  >
                    {dayName}
                  </span>
                  <span
                    className={`block text-lg font-bold ${
                      today
                        ? 'bg-teal-600 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto mt-1'
                        : 'text-slate-700'
                    }`}
                  >
                    {toFaDigits(dayNum)}
                  </span>
                </div>

                {/* Stats bar */}
                {stats && stats.total > 0 && (
                  <div className="px-2 py-1 flex items-center justify-center gap-1 text-[9px] text-slate-400 border-b border-slate-100">
                    <span>{toFaDigits(stats.total)} نوبت</span>
                    {stats.active > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-teal-600 font-medium">{toFaDigits(stats.active)} فعال</span>
                      </>
                    )}
                  </div>
                )}

                {/* Appointments list */}
                <div className="p-1 space-y-1 min-h-[60px] max-h-[300px] overflow-y-auto">
                  {dayAppts.length === 0 ? (
                    <div className="text-center py-3">
                      <span className="text-[10px] text-slate-300">—</span>
                    </div>
                  ) : (
                    dayAppts.map((appt) => {
                      const profile = profiles.get(appt.profile_id);
                      const typeCfg = APPOINTMENT_TYPES.find(
                        (t) => t.value === appt.type
                      );
                      const now = Date.now();
                      const start = new Date(appt.start_time).getTime();
                      const end = start + appt.duration_minutes * 60000;
                      const isActive = now >= start && now < end;
                      const isPast = end < now;

                      return (
                        <div
                          key={appt.id}
                          className={`rounded-lg px-2 py-1.5 cursor-pointer transition-all ${
                            isActive
                              ? 'bg-teal-100 border border-teal-300'
                              : isPast
                              ? 'bg-slate-50 opacity-50'
                              : 'bg-slate-50 hover:bg-slate-100'
                          }`}
                          onClick={() => handleCardClick(appt)}
                          onContextMenu={(e) => handleContextMenu(e, appt)}
                          onTouchStart={(e) => handleTouchStart(e, appt)}
                          onTouchEnd={handleTouchEnd}
                          onTouchMove={handleTouchEnd}
                        >
                          {/* Time + Name */}
                          <div className="flex items-center gap-1">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isActive ? 'bg-teal-500 animate-pulse' : STATUS_DOT[appt.status]
                              }`}
                            />
                            <span className="text-[10px] font-mono text-slate-500 shrink-0">
                              {toFaDigits(formatTimeShort(appt.start_time))}
                            </span>
                          </div>
                          <p className="text-[10px] font-medium text-slate-700 truncate mt-0.5">
                            {profile
                              ? `${profile.first_name} ${profile.last_name}`
                              : '—'}
                          </p>

                          {/* Type badge */}
                          {typeCfg && (
                            <span
                              className={`inline-block text-[8px] px-1 py-0.5 rounded mt-0.5 ${
                                TYPE_BADGE[appt.type] ?? 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {typeCfg.label}
                            </span>
                          )}

                          {/* Quick status change */}
                          {getNextStatuses(appt.status).length > 0 && (
                            <div className="flex gap-0.5 mt-1">
                              {getNextStatuses(appt.status).slice(0, 1).map((trans) => (
                                <button
                                  key={trans.status}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(appt, trans.status);
                                  }}
                                  className={`text-[8px] font-medium px-1.5 py-0.5 rounded transition ${trans.color}`}
                                >
                                  {trans.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
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
