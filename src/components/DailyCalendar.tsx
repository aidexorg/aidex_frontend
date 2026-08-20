import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
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

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Types ──

export type CalendarMode = 'chair' | 'dentist';

interface ColumnDef {
  id: string | null;
  label: string;
}

interface DailyCalendarProps {
  onOpenProfile?: (profile: { id: string; first_name: string; last_name: string; file_number?: string | null; phone?: string | null }) => void;
}

// ── Component ──

export function DailyCalendar({ onOpenProfile }: DailyCalendarProps) {
  const data = useData();
  const [selectedDate, setSelectedDate] = useState(todayISODate());
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
  const [dragOverSlot, setDragOverSlot] = useState<{ colId: string | null; slotIndex: number } | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

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

  // Current time indicator
  useEffect(() => {
    if (selectedDate !== todayISODate()) {
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
  }, [selectedDate]);

  // Scroll to 8:00 on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [selectedDate]);

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

  // ── Group appointments by column ──

  const grouped = useMemo(() => {
    const map = new Map<string | null, Appointment[]>();
    for (const col of columns) {
      map.set(col.id, []);
    }
    for (const appt of appointments) {
      const colKey = mode === 'chair' ? appt.chair_id : appt.dentist_id;
      const list = map.get(colKey);
      if (list) {
        list.push(appt);
      } else {
        // fallback to null column
        const nullList = map.get(null);
        if (nullList) nullList.push(appt);
      }
    }
    return map;
  }, [appointments, columns, mode]);

  // ── Handlers ──

  const handleSlotClick = (colId: string | null, slotIndex: number) => {
    const minutes = START_HOUR * 60 + slotIndex * SLOT_MINUTES;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const startTime = `${selectedDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
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

  const navigateDate = (delta: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const goToToday = () => setSelectedDate(todayISODate());

  // ── Drag-and-drop handlers ──

  const handleDragStart = (e: React.DragEvent, appt: Appointment) => {
    setDraggedAppt(appt);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', appt.id);
  };

  const handleDragEnd = () => {
    setDraggedAppt(null);
    setDragOverSlot(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: string | null, slotIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot({ colId, slotIndex });
    setDragOverCol(colId);
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
    setDragOverCol(null);
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

  const handleDrop = async (e: React.DragEvent, colId: string | null, slotIndex: number) => {
    e.preventDefault();
    if (!draggedAppt) return;

    const minutes = START_HOUR * 60 + slotIndex * SLOT_MINUTES;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const newStartTime = `${selectedDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    const newChairId = mode === 'chair' ? colId : draggedAppt.chair_id;

    // Check for conflicts
    if (hasOverlap(newStartTime, draggedAppt.duration_minutes, newChairId, draggedAppt.id)) {
      // Show warning - for now, proceed anyway (non-blocking)
      // In a real app, this would show a confirmation dialog
    }

    try {
      await data.updateAppointment(draggedAppt.id, {
        start_time: newStartTime,
        chair_id: newChairId,
      });
      load();
    } catch {
      // error handled silently
    }

    setDraggedAppt(null);
    setDragOverSlot(null);
    setDragOverCol(null);
  };

  // ── Render ──

  const timeSlots = Array.from({ length: TOTAL_SLOTS }, (_, i) => i);
  const columnWidth = mode === 'chair' ? 'min-w-[160px]' : 'min-w-[180px]';

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

              {/* Columns */}
              {columns.map((col) => (
                <div
                  key={col.id ?? '__null__'}
                  className={`flex-1 ${columnWidth} border-l border-slate-100`}
                >
                  {/* Column header */}
                  <div className="h-10 border-b border-slate-100 flex items-center justify-center bg-slate-50/80 sticky top-0 z-10">
                    <span className="text-xs font-medium text-slate-600 truncate px-2">
                      {col.label}
                    </span>
                  </div>

                  {/* Slots */}
                  <div className="relative">
                    {timeSlots.map((slot) => {
                      const isDragOver =
                        dragOverSlot?.colId === col.id &&
                        dragOverSlot?.slotIndex === slot;
                      return (
                        <div
                          key={slot}
                          className={`border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors ${
                            isDragOver ? 'bg-teal-100/80 border-2 border-teal-400 border-dashed' : ''
                          }`}
                          style={{ height: SLOT_PX }}
                          onClick={() => handleSlotClick(col.id, slot)}
                          onDragOver={(e) => handleDragOver(e, col.id, slot)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, col.id, slot)}
                        />
                      );
                    })}

                    {/* Appointment cards */}
                    {(grouped.get(col.id) ?? []).map((appt) => {
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
                          {height > 60 && getNextStatuses(appt.status).length > 0 && (
                            <div className="flex gap-0.5 mt-0.5">
                              {getNextStatuses(appt.status).slice(0, 2).map((trans) => (
                                <button
                                  key={trans.status}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(appt, trans.status);
                                  }}
                                  className="text-[8px] font-medium px-1 py-0.5 rounded bg-white/70 hover:bg-white text-slate-700 border border-white/50"
                                >
                                  {trans.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Now line */}
                    {nowLine !== null && (
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
              ))}
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
