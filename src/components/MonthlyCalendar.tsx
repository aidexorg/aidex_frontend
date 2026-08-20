import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useData } from '@/data';
import { toFaDigits } from '@/lib/format';
import type { Appointment } from '@/types';

// ── Helpers ──

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getMonthStart(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function addMonths(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setMonth(d.getMonth() + delta);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function getDaysInMonth(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00');
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
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

function jalaliDayNumber(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    const parts = new Intl.DateTimeFormat('fa-IR', { day: 'numeric' }).formatToParts(d);
    return parts.find((p) => p.type === 'day')?.value ?? dateStr.slice(8, 10);
  } catch {
    return dateStr.slice(8, 10);
  }
}

// ── Constants ──

const WEEKDAY_HEADERS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

const STATUS_COUNT_COLORS: Record<string, string> = {
  scheduled: 'bg-slate-400',
  confirmed: 'bg-sky-500',
  arrived: 'bg-amber-500',
  in_progress: 'bg-teal-500',
  completed: 'bg-emerald-500',
  no_show: 'bg-red-500',
  cancelled: 'bg-slate-300',
};

// ── Types ──

interface MonthlyCalendarProps {
  onOpenProfile?: (profile: { id: string; first_name: string; last_name: string; file_number?: string | null; phone?: string | null }) => void;
  onSelectDate?: (date: string) => void;
}

// ── Component ──

export function MonthlyCalendar({ onOpenProfile, onSelectDate }: MonthlyCalendarProps) {
  const data = useData();
  const [currentMonth, setCurrentMonth] = useState(getMonthStart(todayISODate()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const allAppts = await data.listAppointments();
      // Filter to current month view (show +/- 1 month padding for grid)
      const monthStart = new Date(currentMonth + 'T00:00:00');
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      // Include padding days
      const viewStart = addDays(currentMonth, -7);
      const viewEnd = addDays(currentMonth, 42);
      const startMs = new Date(viewStart + 'T00:00:00').getTime();
      const endMs = new Date(viewEnd + 'T23:59:59').getTime();
      const filtered = allAppts.filter((a) => {
        const t = new Date(a.start_time).getTime();
        return t >= startMs && t <= endMs;
      });
      setAppointments(filtered);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [data, currentMonth]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Compute grid ──

  const gridDates = useMemo(() => {
    // First day of month
    const firstDay = new Date(currentMonth + 'T12:00:00');
    const dayOfWeek = firstDay.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    // We want Saturday=0, Sunday=1, ..., Friday=6
    const startOffset = (dayOfWeek + 1) % 7; // Sat=0 offset

    const daysInMonth = getDaysInMonth(currentMonth);
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    
    const cells: { dateStr: string; isCurrentMonth: boolean }[] = [];
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startOffset + 1;
      const d = new Date(currentMonth + 'T12:00:00');
      d.setDate(dayNum);
      const dateStr = d.toISOString().slice(0, 10);
      cells.push({
        dateStr,
        isCurrentMonth: dayNum >= 1 && dayNum <= daysInMonth,
      });
    }
    // Pad to 6 rows = 42 cells
    while (cells.length < 42) {
      const lastDate = cells[cells.length - 1]?.dateStr ?? currentMonth;
      const nextDate = addDays(lastDate, 1);
      cells.push({ dateStr: nextDate, isCurrentMonth: false });
    }

    return cells;
  }, [currentMonth]);

  // ── Appointment count per day ──

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const cell of gridDates) {
      map.set(cell.dateStr, []);
    }
    for (const appt of appointments) {
      const dateStr = appt.start_time.slice(0, 10);
      const list = map.get(dateStr);
      if (list) list.push(appt);
    }
    return map;
  }, [appointments, gridDates]);

  // ── Handlers ──

  const navigateMonth = (delta: number) => {
    setCurrentMonth(addMonths(currentMonth, delta));
  };

  const goToToday = () => setCurrentMonth(getMonthStart(todayISODate()));

  const handleDayClick = (dateStr: string) => {
    if (onSelectDate) {
      onSelectDate(dateStr);
    }
  };

  const today = todayISODate();
  const isToday = (dateStr: string) => dateStr === today;

  // ── Status summary for current month ──

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const appt of appointments) {
      counts[appt.status] = (counts[appt.status] || 0) + 1;
    }
    return counts;
  }, [appointments]);

  const totalAppointments = appointments.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => navigateMonth(-1)} className="btn-ghost p-2">
            <ChevronRight size={18} />
          </button>
          <div className="text-center min-w-[180px]">
            <p className="text-sm font-semibold text-slate-800">
              {jalaliMonthYear(currentMonth)}
            </p>
            <p className="text-xs text-slate-400">
              {toFaDigits(totalAppointments)} نوبت در این ماه
            </p>
          </div>
          <button onClick={() => navigateMonth(1)} className="btn-ghost p-2">
            <ChevronLeft size={18} />
          </button>
          {!isToday(currentMonth) && (
            <button onClick={goToToday} className="btn-secondary text-xs">
              امروز
            </button>
          )}
        </div>

        {/* Status summary */}
        <div className="flex gap-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div
              key={status}
              className="flex items-center gap-1 text-[10px] text-slate-500"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  STATUS_COUNT_COLORS[status] ?? 'bg-slate-300'
                }`}
              />
              {toFaDigits(count)}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-400 text-sm">در حال بارگذاری...</div>
      ) : (
        <div className="card overflow-hidden">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {WEEKDAY_HEADERS.map((day, i) => (
              <div
                key={day}
                className={`py-2.5 text-center text-xs font-medium ${
                  i === 6 ? 'text-red-400' : 'text-slate-500'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-7">
            {gridDates.map((cell, idx) => {
              const dayAppts = appointmentsByDate.get(cell.dateStr) ?? [];
              const count = dayAppts.length;
              const todayHighlight = isToday(cell.dateStr);
              const isFriday = new Date(cell.dateStr + 'T12:00:00').getDay() === 5;

              return (
                <div
                  key={`${cell.dateStr}-${idx}`}
                  className={`min-h-[80px] border-b border-r border-slate-100 p-1.5 cursor-pointer transition-colors ${
                    !cell.isCurrentMonth
                      ? 'bg-slate-50/50'
                      : todayHighlight
                      ? 'bg-teal-50/50'
                      : 'hover:bg-slate-50'
                  }`}
                  onClick={() => handleDayClick(cell.dateStr)}
                >
                  {/* Date number */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-medium ${
                        todayHighlight
                          ? 'bg-teal-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                          : isFriday
                          ? 'text-red-400'
                          : cell.isCurrentMonth
                          ? 'text-slate-700'
                          : 'text-slate-300'
                      }`}
                    >
                      {toFaDigits(jalaliDayNumber(cell.dateStr))}
                    </span>
                  </div>

                  {/* Appointment indicators */}
                  {count > 0 && (
                    <div className="space-y-0.5">
                      {/* Show up to 3 appointment dots */}
                      {dayAppts.slice(0, 3).map((appt) => (
                        <div
                          key={appt.id}
                          className={`h-1.5 rounded-full ${
                            STATUS_COUNT_COLORS[appt.status] ?? 'bg-slate-300'
                          }`}
                        />
                      ))}
                      {count > 3 && (
                        <span className="text-[9px] text-slate-400">
                          +{toFaDigits(count - 3)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Count badge */}
                  {count > 0 && (
                    <div className="mt-1">
                      <span className="text-[10px] font-medium text-slate-500">
                        {toFaDigits(count)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
