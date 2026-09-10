import { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '@/data';
import { toFaDigits } from '@/lib/format';
import type { Appointment } from '@/types';
import { LoadingState } from './ui';
import {
  STATUS_DOT,
  WEEKDAY_HEADERS,
  todayISODate,
  addDays,
  getMonthStart,
  addMonths,
  jalaliMonthYear,
  isSameMonth,
  CalendarDateNav,
  CalendarLegend,
} from './calendar';

function getDaysInMonth(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00');
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
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

interface MonthlyCalendarProps {
  onOpenProfile?: (profile: {
    id: string;
    first_name: string;
    last_name: string;
    file_number?: string | null;
    phone?: string | null;
  }) => void;
  onSelectDate?: (date: string) => void;
  embedded?: boolean;
  currentMonth?: string;
  onCurrentMonthChange?: (monthStart: string) => void;
}

export function MonthlyCalendar({
  onSelectDate,
  embedded = false,
  currentMonth: controlledMonth,
  onCurrentMonthChange,
}: MonthlyCalendarProps) {
  const data = useData();
  const [internalMonth, setInternalMonth] = useState(getMonthStart(todayISODate()));
  const currentMonth = controlledMonth ?? internalMonth;
  const setCurrentMonth = onCurrentMonthChange ?? setInternalMonth;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const allAppts = await data.listAppointments();
      const viewStart = addDays(currentMonth, -7);
      const viewEnd = addDays(currentMonth, 42);
      const startMs = new Date(viewStart + 'T00:00:00').getTime();
      const endMs = new Date(viewEnd + 'T23:59:59').getTime();
      setAppointments(
        allAppts.filter((a) => {
          const t = new Date(a.start_time).getTime();
          return t >= startMs && t <= endMs;
        })
      );
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [data, currentMonth]);

  useEffect(() => {
    load();
  }, [load]);

  const gridDates = useMemo(() => {
    const firstDay = new Date(currentMonth + 'T12:00:00');
    const dayOfWeek = firstDay.getDay();
    const startOffset = (dayOfWeek + 1) % 7;
    const daysInMonth = getDaysInMonth(currentMonth);
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    const cells: { dateStr: string; isCurrentMonth: boolean }[] = [];
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startOffset + 1;
      const d = new Date(currentMonth + 'T12:00:00');
      d.setDate(dayNum);
      cells.push({
        dateStr: d.toISOString().slice(0, 10),
        isCurrentMonth: dayNum >= 1 && dayNum <= daysInMonth,
      });
    }
    while (cells.length < 42) {
      const lastDate = cells[cells.length - 1]?.dateStr ?? currentMonth;
      cells.push({ dateStr: addDays(lastDate, 1), isCurrentMonth: false });
    }
    return cells;
  }, [currentMonth]);

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const cell of gridDates) map.set(cell.dateStr, []);
    for (const appt of appointments) {
      const list = map.get(appt.start_time.slice(0, 10));
      if (list) list.push(appt);
    }
    return map;
  }, [appointments, gridDates]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const appt of appointments) {
      if (isSameMonth(appt.start_time.slice(0, 10), currentMonth)) {
        counts[appt.status] = (counts[appt.status] || 0) + 1;
      }
    }
    return counts;
  }, [appointments, currentMonth]);

  const monthTotal = useMemo(
    () =>
      appointments.filter((a) => isSameMonth(a.start_time.slice(0, 10), currentMonth)).length,
    [appointments, currentMonth]
  );

  const navigateMonth = (delta: number) => setCurrentMonth(addMonths(currentMonth, delta));
  const goToToday = () => setCurrentMonth(getMonthStart(todayISODate()));
  const today = todayISODate();
  const isToday = (dateStr: string) => dateStr === today;

  return (
    <div className="space-y-4">
      {!embedded && (
        <CalendarDateNav
          title={jalaliMonthYear(currentMonth)}
          subtitle={`${toFaDigits(monthTotal)} نوبت در این ماه`}
          showToday={!isSameMonth(today, currentMonth)}
          onPrev={() => navigateMonth(-1)}
          onNext={() => navigateMonth(1)}
          onToday={goToToday}
          prevLabel="ماه قبل"
          nextLabel="ماه بعد"
        />
      )}

      {Object.keys(statusCounts).length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
              <span
                className={`h-2 w-2 rounded-full ${STATUS_DOT[status as keyof typeof STATUS_DOT] ?? 'bg-slate-300'}`}
              />
              {toFaDigits(count)}
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : (
        <div className="card overflow-hidden dark:border-slate-600">
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700">
            {WEEKDAY_HEADERS.map((day, i) => (
              <div
                key={day}
                className={`py-2.5 text-center text-xs font-medium ${
                  i === 6 ? 'text-red-400 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {gridDates.map((cell, idx) => {
              const dayAppts = appointmentsByDate.get(cell.dateStr) ?? [];
              const count = dayAppts.length;
              const todayHighlight = isToday(cell.dateStr);
              const isFriday = new Date(cell.dateStr + 'T12:00:00').getDay() === 5;

              return (
                <button
                  type="button"
                  key={`${cell.dateStr}-${idx}`}
                  className={`min-h-[56px] sm:min-h-[72px] border-b border-r border-slate-100 p-1 sm:p-1.5 text-right transition-colors md:min-h-[88px] ${
                    !cell.isCurrentMonth
                      ? 'bg-slate-50/50 dark:bg-slate-900/30'
                      : todayHighlight
                        ? 'bg-teal-50/50 dark:bg-teal-950/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                  onClick={() => onSelectDate?.(cell.dateStr)}
                  aria-label={`${jalaliDayNumber(cell.dateStr)} — ${toFaDigits(count)} نوبت`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`text-[10px] sm:text-xs font-medium ${
                        todayHighlight
                          ? 'flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-teal-600 text-white'
                          : isFriday
                            ? 'text-red-400'
                            : cell.isCurrentMonth
                              ? 'text-slate-700 dark:text-slate-200'
                              : 'text-slate-300 dark:text-slate-600'
                      }`}
                    >
                      {toFaDigits(jalaliDayNumber(cell.dateStr))}
                    </span>
                    {count > 0 && (
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        {toFaDigits(count)}
                      </span>
                    )}
                  </div>

                  {count > 0 && (
                    <div className="space-y-0.5">
                      {dayAppts.slice(0, 3).map((appt) => (
                        <div
                          key={appt.id}
                          className={`h-1.5 rounded-full ${
                            STATUS_DOT[appt.status] ?? 'bg-slate-300'
                          }`}
                        />
                      ))}
                      {count > 3 && (
                        <span className="text-[9px] text-slate-400 dark:text-slate-500">
                          +{toFaDigits(count - 3)}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!embedded && <CalendarLegend />}
    </div>
  );
}
