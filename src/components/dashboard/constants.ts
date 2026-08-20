import {
  Clock,
  CheckCircle2,
  Users,
  Activity,
  XCircle,
} from 'lucide-react';
import type { AppointmentStatus } from '@/types';

export const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; color: string; bg: string; icon: typeof CheckCircle2 }
> = {
  scheduled: {
    label: 'برنامه‌ریزی شده',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    icon: Clock,
  },
  confirmed: {
    label: 'تأیید شده',
    color: 'text-sky-600',
    bg: 'bg-sky-100',
    icon: CheckCircle2,
  },
  arrived: {
    label: 'حاضر شده',
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    icon: Users,
  },
  in_progress: {
    label: 'در حال درمان',
    color: 'text-teal-600',
    bg: 'bg-teal-100',
    icon: Activity,
  },
  completed: {
    label: 'تکمیل شده',
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
    icon: CheckCircle2,
  },
  no_show: {
    label: 'عدم حضور',
    color: 'text-red-600',
    bg: 'bg-red-100',
    icon: XCircle,
  },
  cancelled: {
    label: 'لغو شده',
    color: 'text-slate-400',
    bg: 'bg-slate-50',
    icon: XCircle,
  },
};

export const TYPE_COLORS: Record<string, string> = {
  consultation: 'bg-sky-50 text-sky-700 border-sky-200',
  treatment: 'bg-teal-50 text-teal-700 border-teal-200',
  followup: 'bg-amber-50 text-amber-700 border-amber-200',
  emergency: 'bg-red-50 text-red-700 border-red-200',
  hygiene: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const CHAIRS = [
  { id: 'chair_1', label: 'صندلی ۱' },
  { id: 'chair_2', label: 'صندلی ۲' },
];

export const TYPE_LABELS: Record<string, string> = {
  consultation: 'مشاوره',
  treatment: 'درمان',
  followup: 'پیگیری',
  hygiene: 'بهداشت',
  emergency: 'اورژانس',
};
