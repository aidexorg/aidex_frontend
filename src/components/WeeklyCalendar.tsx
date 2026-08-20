import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Clock, CalendarDays } from 'lucide-react';
import { useData } from '@/data';
import { formatDate, toFaDigits } from '@/lib/format';
import {
  APPOINTMENT_TYPES,
  getNextStatuses,
  type Appointment,
  type AppointmentType,
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

const START_HOUR = 8;
const END_HOUR = 18;
const SLOT_MINUTES = 30;
const SLOT_PX = 48;
const TOTAL_SLOTS = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;

const TYPE_BG: Record<string, string> = {
  sky: 'bg-sky-100 border-sky-300 text-sky-800',
  teal: 'bg-teal-100 border-teal-300 text-teal-800',
  amber: 'bg-amber-100 border-amber-300 text-amber-800',
  red: 'bg-red-100 border-red-300 text-red-800',
  emerald: 'bg-emerald-100 border-emerald-300 text-emerald-800',
};

const STATUS_DOT: Record<AppointmentStatus, string> = {
  scheduled: 'bg-slate-400',
  confirmed: 'bg-sky-500',
  arrived: 'bg-amber-500',
  in_progress: 'bg-teal-500',
  completed: 'bg-emerald-500',
  no_show: 'bg-red-500',
  cancelled: 'bg-slate-300',
};

// ── Helpers ──

function timeToMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function minutesToSlot(minutes: number): number {
  return (minutes - START_HOUR * 60) / SLOT_MINUTES;
}

function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  // Saturday = 6 in JS (Sunday=0), so we need to adjust
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = (day + 1) % 7; // Sat=0, Sun=1, ..., Fri=6
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

// ── Types ──

export type CalendarMode = 'chair' | 'dentist';

interface ColumnDef {
  id: string | null;
  label: string;
}

interface WeeklyCalendarProps {
  onOpenProfile?: (profile: { id: string; first_name: string; last_name: string; file_number?: string | null; phone?: string | null }) => void;
}

// ── Component ──

export function WeeklyCalendar({ onOpenProfile }: WeeklyCalendarProps) {
  const data = useData();
  const [weekStart, setWeekStart] = useState(getWeekStart(todayISODate()));
  const [mode, setMode] = useState<CalendarMode>('chair');
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
  const [nowLine, setNowLine] = useState<number | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Drag-and-drop state ──
  const [draggedAppt, setDraggedAppt] = useState<Appointment | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ dateStr: string; slotIndex: number } | null>(null);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allAppts, profs] = await Promise.all([
        data.listAppointments(),
        data.listProfiles(),
      ]);
      // Filter to current week
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

  // Current time indicator (only for today's column)
  useEffect(() => {
    const today = todayISODate();
    if (!weekDates.includes(today)) {
      setNowLine(null);
      return;
    }
    const update = () => {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      if (mins >= START_HOUR * 60 && mins <= END_HOUR * 60) {
        setNowLine(minutesToSlot(mins));
      } else {
        setNowLine(null);
      }
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [weekDates]);

  // Scroll to 8:00 on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [weekStart]);

  // ── Columns ──

  const columns: ColumnDef[] = useMemo(() => {
    if (mode === 'chair') {
      return CHAIRS;
    }
    // Dentist mode: derive from appointments + null column
    const dentistIds = new Set<string>();
    for (const a of appointments) {
      if (a.dentist_id) dentistIds.add(a.dentist_id);
    }
    const cols: ColumnDef[] = [...dentistIds].map((id) => ({
      id,
      label: `دندانپزشک ${id.slice(0, 4)}`,
    }));
    cols.push({ id: null, label: 'بدون دندانپزشک' });
    return cols;
  }, [mode, appointments]);

  // ── Flat list of appointments per date for rendering ──

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const date of weekDates) {
      map.set(date, []);
    }
    for (const appt of appointments) {
      const apptDate = appt.start_time.slice(0, 10);
      const list = map.get(apptDate);
      if (list) list.push(appt);
    }
    return map;
  }, [appointments, weekDates]);

  // ── Handlers ──

  const handleSlotClick = (dateStr: string, colId: string | null, slotIndex: number) => {
    const minutes = START_HOUR * 60 + slotIndex * SLOT_MINUTES;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const startTime = `${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    setEditingAppt(null);
    setFormPrefill({
      startTime,
      chairId: mode === 'chair' ? (colId ?? undefined) : undefined,
      dentistId: mode === 'dentist' ? (colId ?? undefined) : undefined,
    });
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

  const navigateWeek = (delta: number) => {
    setWeekStart(addDays(weekStart, delta * 7));
  };

  const goToToday = () => setWeekStart(getWeekStart(todayISODate()));

  const isToday = (dateStr: string) => dateStr === todayISODate();

  // ── Drag-and-drop handlers ──

  const handleDragStart = (e: React.DragEvent, appt: Appointment) => {
    setDraggedAppt(appt);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', appt.id);
  };

  const handleDragEnd = () => {
    setDraggedAppt(null);
    setDragOverSlot(null);
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string, slotIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot({ dateStr, slotIndex });
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const hasOverlap = (startTime: string, duration: number, chairId: string | null, excludeId?: string): boolean => {
    const start = new Date(startTime).getTime();
    const end = start + duration * 60000;
    return appointments.some((a) => {
      if (excludeId && a.id === excludeId) return false;
      if (a.chair_id !== chairId) return false;
      const aStart = new Date(a.start_time).getTime();
      const aEnd = aStart + a.duration_minutes * 60000;
      return start < aEnd && end > aStart;
    });
  };

  const handleDrop = async (e: React.DragEvent, dateStr: string, slotIndex: number) => {
    e.preventDefault();
    if (!draggedAppt) return;

    const minutes = START_HOUR * 60 + slotIndex * SLOT_MINUTES;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const newStartTime = `${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;

    // Check for conflicts
    if (hasOverlap(newStartTime, draggedAppt.duration_minutes, draggedAppt.chair_id, draggedAppt.id)) {
      // Non-blocking - proceed anyway for now
    }

    try {
      await data.updateAppointment(draggedAppt.id, {
        start_time: newStartTime,
      });
      load();
    } catch {
      // error handled silently
    }

    setDraggedAppt(null);
    setDragOverSlot(null);
  };

  // ── Render ──

  const timeSlots = Array.from({ length: TOTAL_SLOTS }, (_, i) => i);
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

        {/* Mode toggle */}
        <div className="flex gap-1 rounded-xl border border-slate-200 p-0.5 bg-white">
          <button
            onClick={() => setMode('chair')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              mode === 'chair'
                ? 'bg-teal-600 text-white'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            صندلی‌محور
          </button>
          <button
            onClick={() => setMode('dentist')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              mode === 'dentist'
                ? 'bg-teal-600 text-white'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            دندانپزشک‌محور
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <div className="card overflow-hidden">
          <div
            ref={scrollRef}
            className="overflow-auto max-h-[calc(100dvh-220px)]"
          >
            <div className="flex min-w-max">
              {/* Time axis */}
              <div className="w-16 shrink-0 border-l border-slate-100 bg-slate-50/80">
                <div className="h-10 border-b border-slate-100 flex items-center justify-center">
                  <Clock size={14} className="text-slate-400" />
                </div>
                {timeSlots.map((slot) => {
                  const minutes = START_HOUR * 60 + slot * SLOT_MINUTES;
                  const h = Math.floor(minutes / 60);
                  const m = minutes % 60;
                  const showLabel = m === 0;
                  return (
                    <div
                      key={slot}
                      className="border-b border-slate-100 flex items-start justify-end pr-1.5"
                      style={{ height: SLOT_PX }}
                    >
                      {showLabel && (
                        <span className="text-[10px] text-slate-400 -mt-1.5">
                          {toFaDigits(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Day columns */}
              {weekDates.map((dateStr) => {
                const { dayName, dayNum } = jalaliDayHeader(dateStr);
                const today = isToday(dateStr);

                return (
                  <div
                    key={dateStr}
                    className={`flex-1 min-w-[140px] border-l border-slate-100 ${
                      today ? 'bg-teal-50/30' : ''
                    }`}
                  >
                    {/* Column header */}
                    <div className={`h-10 border-b border-slate-100 flex flex-col items-center justify-center sticky top-0 z-10 ${
                      today ? 'bg-teal-100/80' : 'bg-slate-50/80'
                    }`}>
                      <span className={`text-[10px] font-medium ${today ? 'text-teal-700' : 'text-slate-500'}`}>
                        {dayName}
                      </span>
                      <span className={`text-sm font-bold ${today ? 'text-teal-800' : 'text-slate-700'}`}>
                        {toFaDigits(dayNum)}
                      </span>
                    </div>

                    {/* Slots */}
                    <div className="relative">
                      {timeSlots.map((slot) => {
                        const isDragOver =
                          dragOverSlot?.dateStr === dateStr &&
                          dragOverSlot?.slotIndex === slot;
                        return (
                          <div
                            key={slot}
                            className={`border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors ${
                              isDragOver ? 'bg-teal-100/80 border-2 border-teal-400 border-dashed' : ''
                            }`}
                            style={{ height: SLOT_PX }}
                            onClick={() => handleSlotClick(dateStr, null, slot)}
                            onDragOver={(e) => handleDragOver(e, dateStr, slot)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, dateStr, slot)}
                          />
                        );
                      })}

                      {/* Appointment cards */}
                      {(appointmentsByDate.get(dateStr) ?? []).map((appt) => {
                        const startMins = timeToMinutes(appt.start_time);
                        const slotIdx = minutesToSlot(startMins);
                        const durationSlots = Math.max(
                          1,
                          Math.round(appt.duration_minutes / SLOT_MINUTES)
                        );
                        const top = slotIdx * SLOT_PX;
                        const height = durationSlots * SLOT_PX - 2;
                        const typeCfg = APPOINTMENT_TYPES.find(
                          (t) => t.value === appt.type
                        );
                        const profile = profiles.get(appt.profile_id);
                        const isPast =
                          new Date(appt.start_time).getTime() < Date.now();

                        const isDragging = draggedAppt?.id === appt.id;

                        return (
                          <div
                            key={appt.id}
                            className={`absolute left-0.5 right-0.5 rounded-lg border px-1.5 py-1 cursor-grab active:cursor-grabbing hover:shadow-md transition-all overflow-hidden ${
                              TYPE_BG[typeCfg?.color ?? 'teal']
                            } ${isPast ? 'opacity-50' : ''} ${isDragging ? 'opacity-40 border-dashed' : ''}`}
                            style={{ top, height: Math.max(height, 22) }}
                            draggable={!isPast}
                            onDragStart={(e) => handleDragStart(e, appt)}
                            onDragEnd={handleDragEnd}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCardClick(appt);
                            }}
                            onContextMenu={(e) => handleContextMenu(e, appt)}
                            onTouchStart={(e) => handleTouchStart(e, appt)}
                            onTouchEnd={handleTouchEnd}
                            onTouchMove={handleTouchEnd}
                          >
                            <div className="flex items-center gap-1">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  STATUS_DOT[appt.status]
                                }`}
                              />
                              <span className="text-[10px] font-semibold truncate">
                                {profile
                                  ? `${profile.first_name} ${profile.last_name}`
                                  : '—'}
                              </span>
                            </div>
                            {height > 30 && (
                              <p className="text-[9px] opacity-70 mt-0.5">
                                {formatTimeShort(appt.start_time)} –{' '}
                                {formatTimeShort(
                                  new Date(
                                    new Date(appt.start_time).getTime() +
                                      appt.duration_minutes * 60000
                                  ).toISOString()
                                )}
                              </p>
                            )}
                            {height > 48 && typeCfg && (
                              <span className="text-[9px] opacity-60">
                                {typeCfg.label}
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {/* Now line (only for today's column) */}
                      {today && nowLine !== null && (
                        <div
                          className="absolute left-0 right-0 z-20 pointer-events-none"
                          style={{ top: nowLine * SLOT_PX }}
                        >
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                            <div className="flex-1 h-px bg-red-500" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
          onOpenProfile={onOpenProfile}
        />
      )}
    </div>
  );
}
