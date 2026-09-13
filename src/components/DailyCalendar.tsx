import { useState, useRef, useEffect, useCallback } from 'react';
import { Clock, User, CalendarDays, Plus } from 'lucide-react';
import { useData } from '@/data';
import { formatDate, toFaDigits } from '@/lib/format';
import { APPOINTMENT_TYPES, type Appointment, type AppointmentStatus } from '@/types';
import { AppointmentForm } from './AppointmentForm';
import { ContextMenu } from './ContextMenu';
import { LoadingState } from './ui';
import {
  CALENDAR_CHAIRS,
  STATUS_DOT,
  STATUS_BADGE,
  TYPE_BADGE,
  todayISODate,
  addDays,
  jalaliDayLabel,
  formatTimeShort,
  formatEndTime,
  appointmentStatusLabel,
  isAppointmentActive,
  isAppointmentPast,
  CalendarDateNav,
  AppointmentStatusActions,
} from './calendar';

interface DailyCalendarProps {
  onOpenProfile?: (profile: {
    id: string;
    first_name: string;
    last_name: string;
    file_number?: string | null;
    phone?: string | null;
  }) => void;
  embedded?: boolean;
  selectedDate?: string;
  onSelectedDateChange?: (date: string) => void;
}

export function DailyCalendar({
  onOpenProfile,
  embedded = false,
  selectedDate: controlledDate,
  onSelectedDateChange,
}: DailyCalendarProps) {
  const data = useData();
  const [internalDate, setInternalDate] = useState(todayISODate());
  const selectedDate = controlledDate ?? internalDate;
  const setSelectedDate = onSelectedDateChange ?? setInternalDate;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profiles, setProfiles] = useState<
    Map<string, { first_name: string; last_name: string; file_number?: string | null }>
  >(new Map());
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

  useEffect(() => {
    if (scrollRef.current && selectedDate === todayISODate()) {
      const currentHour = new Date().getHours();
      const scrollTarget = Math.max(0, (currentHour - 8) * 60 - 60);
      scrollRef.current.scrollTop = scrollTarget;
    }
  }, [selectedDate, loading]);

  const sortedAppointments = [...appointments].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  const timeSlots: { hour: string; appointments: Appointment[] }[] = [];
  for (let h = 8; h <= 18; h++) {
    const hourStr = String(h).padStart(2, '0');
    const hourAppts = sortedAppointments.filter((a) => new Date(a.start_time).getHours() === h);
    timeSlots.push({ hour: `${hourStr}:00`, appointments: hourAppts });
  }

  const chairSummary = CALENDAR_CHAIRS.map((chair) => {
    const occupied = sortedAppointments.find(
      (a) =>
        a.chair_id === chair.id &&
        a.status !== 'cancelled' &&
        a.status !== 'completed' &&
        a.status !== 'no_show' &&
        isAppointmentActive(a)
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
      status: occupied ? 'occupied' : nextUp ? 'next_up' : 'empty',
    };
  });

  const occupiedCount = chairSummary.filter((c) => c.status === 'occupied').length;
  const emptyCount = chairSummary.filter((c) => c.status === 'empty').length;

  const navigateDate = (delta: number) => setSelectedDate(addDays(selectedDate, delta));
  const goToToday = () => setSelectedDate(todayISODate());

  const handleSlotClick = (hour: string) => {
    setEditingAppt(null);
    setFormPrefill({ startTime: `${selectedDate}T${hour}:00` });
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
          title={jalaliDayLabel(selectedDate)}
          subtitle={formatDate(selectedDate)}
          showToday={selectedDate !== todayISODate()}
          onPrev={() => navigateDate(-1)}
          onNext={() => navigateDate(1)}
          onToday={goToToday}
          prevLabel="روز قبل"
          nextLabel="روز بعد"
        />
      )}

      <div className="card overflow-hidden p-2 sm:p-3 dark:border-slate-600">
        <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1.5 sm:gap-y-2 text-[10px] sm:text-xs">
          <span className="font-medium text-slate-500 dark:text-slate-400">وضعیت صندلی‌ها:</span>
          {chairSummary.map((chair) => (
            <div key={chair.id} className="flex items-center gap-1.5">
              <div
                className={`h-2 w-2 rounded-full ${
                  chair.status === 'occupied'
                    ? 'bg-teal-500'
                    : chair.status === 'next_up'
                      ? 'bg-amber-400'
                      : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
              <span className="text-slate-600 dark:text-slate-300">{chair.label}</span>
            </div>
          ))}
          <span className="mr-auto text-slate-400 dark:text-slate-500">
            {toFaDigits(occupiedCount)} اشغال · {toFaDigits(emptyCount)} خالی
          </span>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : sortedAppointments.length === 0 ? (
        <div className="card p-8 text-center dark:border-slate-600">
          <CalendarDays size={40} className="mx-auto mb-3 text-slate-200 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">نوبتی برای این روز ثبت نشده</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            روی یک بازهٔ خالی کلیک کنید یا «نوبت جدید» بزنید
          </p>
          {!embedded && (
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
          )}
        </div>
      ) : (
        <div ref={scrollRef} className="card overflow-x-auto overflow-y-auto max-h-[70vh] dark:border-slate-600">
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {timeSlots.map(({ hour, appointments: slotAppts }) => {
              const hasAppts = slotAppts.length > 0;
              const isCurrentHour =
                selectedDate === todayISODate() &&
                new Date().getHours() === parseInt(hour.split(':')[0], 10);

              return (
                <div
                  key={hour}
                  className={`flex ${isCurrentHour ? 'bg-teal-50/30 dark:bg-teal-950/20' : ''}`}
                  onClick={() => !hasAppts && handleSlotClick(hour)}
                  role={hasAppts ? undefined : 'button'}
                  tabIndex={hasAppts ? undefined : 0}
                  onKeyDown={(e) => {
                    if (!hasAppts && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleSlotClick(hour);
                    }
                  }}
                >
                  <div className="w-16 shrink-0 border-l border-slate-100 bg-slate-50/50 px-2 py-3 sm:w-20 sm:px-3 dark:border-slate-700 dark:bg-slate-800/50">
                    <span
                      className={`font-mono text-xs ${
                        isCurrentHour
                          ? 'font-bold text-teal-700 dark:text-teal-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {toFaDigits(hour)}
                    </span>
                  </div>

                  <div className="min-h-[52px] flex-1">
                    {hasAppts ? (
                      <div className="divide-y divide-slate-50 dark:divide-slate-800">
                        {slotAppts.map((appt) => {
                          const profile = profiles.get(appt.profile_id);
                          const typeCfg = APPOINTMENT_TYPES.find((t) => t.value === appt.type);
                          const active = isAppointmentActive(appt);
                          const past = isAppointmentPast(appt);

                          return (
                            <div
                              key={appt.id}
                              className={`flex flex-col gap-2 px-3 py-3 transition-colors sm:flex-row sm:items-center sm:gap-3 sm:px-4 ${
                                active
                                  ? 'border-r-2 border-teal-500 bg-teal-50/80 dark:bg-teal-950/30'
                                  : past
                                    ? 'opacity-60 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50'
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
                              <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center sm:gap-3">
                                <div
                                  className={`mt-1 h-3 w-3 shrink-0 rounded-full sm:mt-0 ${
                                    active ? 'animate-pulse bg-teal-500' : STATUS_DOT[appt.status]
                                  }`}
                                />

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                      {profile
                                        ? `${profile.first_name} ${profile.last_name}`
                                        : 'بیمار ناشناس'}
                                    </span>
                                    {typeCfg && (
                                      <span
                                        className={`rounded px-1.5 py-0.5 text-[10px] ${
                                          TYPE_BADGE[appt.type] ??
                                          'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                        }`}
                                      >
                                        {typeCfg.label}
                                      </span>
                                    )}
                                    <span
                                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                        STATUS_BADGE[appt.status]
                                      }`}
                                    >
                                      {appointmentStatusLabel(appt.status)}
                                    </span>
                                    {active && (
                                      <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-medium text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
                                        فعال
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                                    <Clock size={11} aria-hidden />
                                    <span>
                                      {toFaDigits(formatTimeShort(appt.start_time))} –{' '}
                                      {toFaDigits(
                                        formatEndTime(appt.start_time, appt.duration_minutes)
                                      )}
                                    </span>
                                    <span>·</span>
                                    <span>{toFaDigits(appt.duration_minutes)} دقیقه</span>
                                    <span className="hidden sm:inline">·</span>
                                    <span className="hidden rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 sm:inline dark:bg-slate-700 dark:text-slate-400">
                                      {CALENDAR_CHAIRS.find((c) => c.id === appt.chair_id)?.label ??
                                        '—'}
                                    </span>
                                  </div>
                                </div>

                                {onOpenProfile && profile && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenProfile({ id: appt.profile_id, ...profile });
                                    }}
                                    className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-teal-600 dark:hover:bg-slate-700"
                                    aria-label="پرونده بیمار"
                                  >
                                    <User size={15} />
                                  </button>
                                )}
                              </div>

                              <AppointmentStatusActions
                                status={appt.status}
                                onStatusChange={(status) => handleStatusChange(appt, status)}
                                className="mr-5 sm:mr-0 sm:shrink-0"
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex h-full cursor-pointer items-center px-4 py-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <span className="text-xs text-slate-300 dark:text-slate-600">+ افزودن</span>
                      </div>
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
                onOpenProfile({
                  id: appt.profile_id,
                  ...profile,
                });
              }
            }
          }}
        />
      )}
    </div>
  );
}
