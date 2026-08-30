import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES, type AppointmentStatus } from '@/types';

export const CALENDAR_CHAIRS = [
  { id: 'chair_1', label: 'صندلی ۱' },
  { id: 'chair_2', label: 'صندلی ۲' },
  { id: 'hygiene', label: 'بهداشت' },
  { id: 'surgery', label: 'جراحی' },
] as const;

export const CHAIR_LABELS: Record<string, string> = Object.fromEntries(
  CALENDAR_CHAIRS.map((c) => [c.id, c.label])
);

export const STATUS_DOT: Record<AppointmentStatus, string> = {
  scheduled: 'bg-slate-400',
  confirmed: 'bg-sky-500',
  arrived: 'bg-amber-500',
  in_progress: 'bg-teal-500',
  completed: 'bg-emerald-500',
  no_show: 'bg-red-500',
  cancelled: 'bg-slate-300',
};

export const STATUS_BADGE: Record<AppointmentStatus, string> = {
  scheduled: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  confirmed: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  arrived: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  in_progress: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  no_show: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  cancelled: 'bg-slate-100 text-slate-400 line-through dark:bg-slate-800 dark:text-slate-500',
};

export const STATUS_SOLID: Record<AppointmentStatus, string> = {
  scheduled: 'bg-slate-500',
  confirmed: 'bg-sky-500',
  arrived: 'bg-amber-500',
  in_progress: 'bg-teal-500',
  completed: 'bg-emerald-500',
  no_show: 'bg-red-500',
  cancelled: 'bg-slate-400',
};

export const TYPE_BADGE: Record<string, string> = {
  consultation: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  treatment: 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
  followup: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  emergency: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  hygiene: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
};

export const TYPE_BORDER: Record<string, string> = {
  consultation: 'border-sky-200 dark:border-sky-800/50',
  treatment: 'border-teal-200 dark:border-teal-800/50',
  followup: 'border-amber-200 dark:border-amber-800/50',
  emergency: 'border-red-200 dark:border-red-800/50',
  hygiene: 'border-emerald-200 dark:border-emerald-800/50',
};

export const WEEKDAY_HEADERS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

export type CalendarViewMode = 'daily' | 'weekly' | 'monthly' | 'list' | 'arrivals';

export function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function getMonthStart(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export function addMonths(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setMonth(d.getMonth() + delta);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export function isSameMonth(dateStr: string, ref: string): boolean {
  return dateStr.slice(0, 7) === ref.slice(0, 7);
}

export function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = (day + 1) % 7;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

export function getWeekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function jalaliDayLabel(dateStr: string): string {
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

export function jalaliDayHeader(dateStr: string): { dayName: string; dayNum: string } {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    const parts = new Intl.DateTimeFormat('fa-IR', {
      weekday: 'short',
      day: 'numeric',
    }).formatToParts(d);
    return {
      dayName: parts.find((p) => p.type === 'weekday')?.value ?? '',
      dayNum: parts.find((p) => p.type === 'day')?.value ?? '',
    };
  } catch {
    return { dayName: '', dayNum: dateStr.slice(8, 10) };
  }
}

export function jalaliMonthYear(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return new Intl.DateTimeFormat('fa-IR', { month: 'long', year: 'numeric' }).format(d);
  } catch {
    return '';
  }
}

export function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function formatEndTime(iso: string, durationMinutes: number): string {
  const d = new Date(new Date(iso).getTime() + durationMinutes * 60000);
  return formatTimeShort(d.toISOString());
}

export function appointmentStatusLabel(s: AppointmentStatus): string {
  return APPOINTMENT_STATUSES.find((st) => st.value === s)?.label ?? s;
}

export function appointmentTypeLabel(t: string): string {
  return APPOINTMENT_TYPES.find((tp) => tp.value === t)?.label ?? t;
}

export function isAppointmentActive(appt: { start_time: string; duration_minutes: number }): boolean {
  const now = Date.now();
  const start = new Date(appt.start_time).getTime();
  const end = start + appt.duration_minutes * 60000;
  return now >= start && now < end;
}

export function isAppointmentPast(appt: { start_time: string; duration_minutes: number }): boolean {
  return new Date(appt.start_time).getTime() + appt.duration_minutes * 60000 < Date.now();
}
