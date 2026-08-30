import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useData } from '@/data';
import { formatDate, toFaDigits } from '@/lib/format';
import { APPOINTMENT_TYPES, type Appointment, type AppointmentStatus } from '@/types';
import { AppointmentForm } from './AppointmentForm';
import { ContextMenu } from './ContextMenu';
import { LoadingState } from './ui';
import {
  STATUS_DOT,
  TYPE_BADGE,
  todayISODate,
  addDays,
  getWeekStart,
  getWeekDates,
  jalaliDayHeader,
  jalaliMonthYear,
  formatTimeShort,
  appointmentStatusLabel,
  STATUS_BADGE,
  isAppointmentActive,
  isAppointmentPast,
  CalendarDateNav,
  AppointmentStatusActions,
} from './calendar';

interface WeeklyCalendarProps {
  onOpenProfile?: (profile: {
    id: string;
    first_name: string;
    last_name: string;
    file_number?: string | null;
    phone?: string | null;
  }) => void;
  embedded?: boolean;
  weekStart?: string;
  onWeekStartChange?: (weekStart: string) => void;
}

export function WeeklyCalendar({
  onOpenProfile,
  embedded = false,
  weekStart: controlledWeekStart,
  onWeekStartChange,
}: WeeklyCalendarProps) {
  const data = useData();
  const [internalWeekStart, setInternalWeekStart] = useState(getWeekStart(todayISODate()));
  const weekStart = controlledWeekStart ?? internalWeekStart;
  const setWeekStart = onWeekStartChange ?? setInternalWeekStart;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profiles, setProfiles] = useState<
    Map<string, { first_name: string; last_name: string; file_number?: string | null }>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formPrefill, setFormPrefill] = useState<{ profileId?: string }>({});
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
      setAppointments(allAppts.filter((a) => weekSet.has(a.start_time.slice(0, 10))));
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

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const date of weekDates) map.set(date, []);
    for (const appt of appointments) {
      const list = map.get(appt.start_time.slice(0, 10));
      if (list) list.push(appt);
    }
    for (const [date, appts] of map) {
      map.set(
        date,
        appts.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      );
    }
    return map;
  }, [appointments, weekDates]);

  const dailyStats = useMemo(() => {
    const stats = new Map<string, { total: number; active: number }>();
    for (const date of weekDates) {
      const dayAppts = appointmentsByDate.get(date) ?? [];
      stats.set(date, {
        total: dayAppts.length,
        active: dayAppts.filter((a) => a.status === 'in_progress' || a.status === 'arrived')
          .length,
      });
    }
    return stats;
  }, [appointmentsByDate, weekDates]);

  const navigateWeek = (delta: number) => setWeekStart(addDays(weekStart, delta * 7));
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
      // silent
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

  if (formOpen) {
    return (
      <AppointmentForm
        variant="page"
        backLabel="بازگشت به تقویم"
        open
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
    );
  }

  return (
    <div className="space-y-4">
      {!embedded && (
        <CalendarDateNav
          title={jalaliMonthYear(weekDates[0])}
          subtitle={`${formatDate(weekDates[0])} — ${formatDate(weekDates[6])}`}
          showToday={!weekDates.some(isToday)}
          onPrev={() => navigateWeek(-1)}
          onNext={() => navigateWeek(1)}
          onToday={goToToday}
          prevLabel="هفته قبل"
          nextLabel="هفته بعد"
        />
      )}

      {loading ? (
        <LoadingState />
      ) : (
        <div className="overflow-x-auto pb-1">
          <div className="grid min-w-[640px] grid-cols-7 gap-2">
            {weekDates.map((dateStr) => {
              const { dayName, dayNum } = jalaliDayHeader(dateStr);
              const today = isToday(dateStr);
              const dayAppts = appointmentsByDate.get(dateStr) ?? [];
              const stats = dailyStats.get(dateStr);

              return (
                <div
                  key={dateStr}
                  className={`overflow-hidden rounded-xl border ${
                    today
                      ? 'border-teal-300 bg-teal-50/30 dark:border-teal-700 dark:bg-teal-950/20'
                      : 'border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800'
                  }`}
                >
                  <div
                    className={`border-b px-2 py-2 text-center ${
                      today
                        ? 'border-teal-200 bg-teal-100/80 dark:border-teal-800 dark:bg-teal-900/40'
                        : 'border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80'
                    }`}
                  >
                    <span
                      className={`text-[10px] font-medium ${
                        today ? 'text-teal-700 dark:text-teal-300' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {dayName}
                    </span>
                    <span
                      className={`mt-1 block text-lg font-bold ${
                        today
                          ? 'mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-white'
                          : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {toFaDigits(dayNum)}
                    </span>
                  </div>

                  {stats && stats.total > 0 && (
                    <div className="flex items-center justify-center gap-1 border-b border-slate-100 px-2 py-1 text-[9px] text-slate-400 dark:border-slate-700">
                      <span>{toFaDigits(stats.total)} نوبت</span>
                      {stats.active > 0 && (
                        <>
                          <span>·</span>
                          <span className="font-medium text-teal-600 dark:text-teal-400">
                            {toFaDigits(stats.active)} فعال
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  <div className="max-h-[320px] min-h-[64px] space-y-1 overflow-y-auto p-1">
                    {dayAppts.length === 0 ? (
                      <div className="py-4 text-center">
                        <span className="text-[10px] text-slate-300 dark:text-slate-600">—</span>
                      </div>
                    ) : (
                      dayAppts.map((appt) => {
                        const profile = profiles.get(appt.profile_id);
                        const typeCfg = APPOINTMENT_TYPES.find((t) => t.value === appt.type);
                        const active = isAppointmentActive(appt);
                        const past = isAppointmentPast(appt);

                        return (
                          <div
                            key={appt.id}
                            className={`cursor-pointer rounded-lg px-2 py-1.5 transition-all ${
                              active
                                ? 'border border-teal-300 bg-teal-100 dark:border-teal-700 dark:bg-teal-950/40'
                                : past
                                  ? 'bg-slate-50 opacity-50 dark:bg-slate-800/50'
                                  : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-700/50'
                            }`}
                            onClick={() => handleCardClick(appt)}
                            onContextMenu={(e) => handleContextMenu(e, appt)}
                            onTouchStart={(e) => handleTouchStart(e, appt)}
                            onTouchEnd={handleTouchEnd}
                            onTouchMove={handleTouchEnd}
                          >
                            <div className="flex items-center gap-1">
                              <span
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                  active ? 'animate-pulse bg-teal-500' : STATUS_DOT[appt.status]
                                }`}
                              />
                              <span className="shrink-0 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                {toFaDigits(formatTimeShort(appt.start_time))}
                              </span>
                              <span
                                className={`truncate text-[9px] font-medium ${STATUS_BADGE[appt.status]}`}
                              >
                                {appointmentStatusLabel(appt.status)}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-[10px] font-medium text-slate-700 dark:text-slate-200">
                              {profile ? `${profile.first_name} ${profile.last_name}` : '—'}
                            </p>
                            {typeCfg && (
                              <span
                                className={`mt-0.5 inline-block rounded px-1 py-0.5 text-[8px] ${
                                  TYPE_BADGE[appt.type] ??
                                  'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {typeCfg.label}
                              </span>
                            )}
                            <AppointmentStatusActions
                              status={appt.status}
                              onStatusChange={(status) => handleStatusChange(appt, status)}
                              className="mt-1"
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
                onOpenProfile({ id: appt.profile_id, ...profile });
              }
            }
          }}
        />
      )}
    </div>
  );
}
