import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarDays,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Activity,
  ArrowLeft,
  Stethoscope,
} from 'lucide-react';
import { useData } from '@/data';
import { formatDate, formatPrice, toFaDigits } from '@/lib/format';
import type { Profile, Appointment, AppointmentStatus } from '@/types';
import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from '@/types';
import { SkeletonProfileList } from './Skeleton';

// ── Types ──

interface DashboardViewProps {
  onOpenProfile?: (profile: Profile) => void;
  onNavigate?: (view: 'profiles' | 'appointments' | 'payments' | 'followups' | 'reports' | 'outputs' | 'arrivals' | 'dashboard') => void;
}

interface AppointmentWithProfile extends Appointment {
  profile: Profile | null;
}

interface FinancialMetrics {
  production: number;
  collections: number;
}

// ── Constants ──

const STATUS_CONFIG: Record<
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

const TYPE_COLORS: Record<string, string> = {
  consultation: 'bg-sky-50 text-sky-700 border-sky-200',
  treatment: 'bg-teal-50 text-teal-700 border-teal-200',
  followup: 'bg-amber-50 text-amber-700 border-amber-200',
  emergency: 'bg-red-50 text-red-700 border-red-200',
  hygiene: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const CHAIRS = [
  { id: 'chair_1', label: 'صندلی ۱' },
  { id: 'chair_2', label: 'صندلی ۲' },
];

interface ChairStatus {
  id: string;
  label: string;
  current: AppointmentWithProfile | null;
  upcoming: AppointmentWithProfile | null;
  status: 'occupied' | 'next_up' | 'empty';
}

// ── Helpers ──

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '';
  }
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'صبح بخیر';
  if (hour < 17) return 'عصر بخیر';
  return 'شب بخیر';
}

// ── Component ──

export function DashboardView({ onOpenProfile, onNavigate }: DashboardViewProps) {
  const data = useData();
  const [appointments, setAppointments] = useState<AppointmentWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<{ display_name: string | null } | null>(null);
  const [financial, setFinancial] = useState<FinancialMetrics>({ production: 0, collections: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = todayISODate();
      const [allAppts, profiles, currentAccount] = await Promise.all([
        data.listAppointments(),
        data.listProfiles(),
        data.getCurrentAccount(),
      ]);

      const profileMap = new Map(profiles.map((p) => [p.id, p]));
      const todayAppts = allAppts
        .filter((a) => a.start_time.slice(0, 10) === today)
        .map((a) => ({
          ...a,
          profile: profileMap.get(a.profile_id) ?? null,
        }))
        .sort((a, b) => a.start_time.localeCompare(b.start_time));

      // Compute financial metrics
      let production = 0;
      let collections = 0;

      // Get today's payments
      const allPayments = await data.listPayments();
      const todayPayments = allPayments.filter((p) => p.payment_date === today);
      collections = todayPayments.reduce((sum, p) => sum + p.amount, 0);

      // Get production from completed actions on today's appointments
      if (todayAppts.length > 0) {
        const periods = await data.listPeriods();
        const periodIds = periods.map((p) => p.id);
        const sessions = periodIds.length > 0 ? await data.listSessions(periodIds) : [];
        const sessionIds = sessions.map((s) => s.id);
        const parts = sessionIds.length > 0 ? await data.listParts(sessionIds) : [];
        const partIds = parts.map((p) => p.id);
        const allActions = partIds.length > 0 ? await data.listActions(partIds) : [];

        // Sum completed actions
        production = allActions
          .filter((a) => a.status === 'complete')
          .reduce((sum, a) => sum + (a.price - a.discount), 0);
      }

      setAppointments(todayAppts);
      setAccount(currentAccount);
      setFinancial({ production, collections });
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Auto-refresh every 30 seconds ──
  useEffect(() => {
    const interval = setInterval(() => {
      load();
    }, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  // ── Statistics ──

  const stats = useMemo(() => {
    const counts: Record<AppointmentStatus, number> = {
      scheduled: 0,
      confirmed: 0,
      arrived: 0,
      in_progress: 0,
      completed: 0,
      no_show: 0,
      cancelled: 0,
    };

    for (const appt of appointments) {
      counts[appt.status]++;
    }

    return {
      total: appointments.length,
      ...counts,
      upcoming: counts.scheduled + counts.confirmed,
      active: counts.arrived + counts.in_progress,
    };
  }, [appointments]);

  // ── Chair status ──

  const chairStatuses = useMemo((): ChairStatus[] => {
    return CHAIRS.map((chair) => {
      const chairAppts = appointments.filter((a) => a.chair_id === chair.id);

      // Find currently active appointment (in_progress or arrived)
      const current = chairAppts.find(
        (a) => a.status === 'in_progress' || a.status === 'arrived'
      );

      // Find next upcoming appointment (scheduled or confirmed)
      const upcoming = !current
        ? chairAppts.find(
            (a) => a.status === 'scheduled' || a.status === 'confirmed'
          )
        : null;

      const status: ChairStatus['status'] = current
        ? 'occupied'
        : upcoming
          ? 'next_up'
          : 'empty';

      return {
        id: chair.id,
        label: chair.label,
        current,
        upcoming,
        status,
      };
    });
  }, [appointments]);

  // ── Arrivals queue ──

  const arrivals = useMemo(() => {
    return appointments
      .filter((a) => a.status === 'arrived')
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [appointments]);

  const handleStartTreatment = useCallback(
    async (appt: AppointmentWithProfile) => {
      try {
        await data.updateAppointment(appt.id, { status: 'in_progress' });
        load();
      } catch {
        // silent
      }  }, [data, load]);

  // ── AR aging ──

  interface ARItem {
    profile: Profile;
    balance: number;
    daysOverdue: number;
  }

  const [arItems, setArItems] = useState<ARItem[]>([]);

  useEffect(() => {
    const loadAR = async () => {
      try {
        const [profiles, periods, payments] = await Promise.all([
          data.listProfiles(),
          data.listPeriods(),
          data.listPayments(),
        ]);

        const profileMap = new Map(profiles.map((p) => [p.id, p]));
        const periodMap = new Map(periods.map((p) => [p.id, p]));
        const paymentsByPeriod = new Map<string, typeof payments>();

        for (const payment of payments) {
          const existing = paymentsByPeriod.get(payment.period_id) ?? [];
          existing.push(payment);
          paymentsByPeriod.set(payment.period_id, existing);
        }

        // Get sessions and parts for all periods
        const periodIds = periods.map((p) => p.id);
        const sessions = periodIds.length > 0 ? await data.listSessions(periodIds) : [];
        const sessionMap = new Map(sessions.map((s) => [s.id, s]));
        const sessionIds = sessions.map((s) => s.id);
        const parts = sessionIds.length > 0 ? await data.listParts(sessionIds) : [];
        const partMap = new Map(parts.map((p) => [p.id, p]));
        const partIds = parts.map((p) => p.id);
        const actions = partIds.length > 0 ? await data.listActions(partIds) : [];

        // Group actions by profile via period → session → part chain
        const balanceByProfile = new Map<string, number>();
        const lastActivityByProfile = new Map<string, string>();

        for (const action of actions) {
          const part = partMap.get(action.part_id);
          if (!part) continue;
          const session = sessionMap.get(part.session_id);
          if (!session) continue;
          const period = periodMap.get(session.period_id);
          if (!period) continue;

          const profileId = period.profile_id;
          const current = balanceByProfile.get(profileId) ?? 0;
          balanceByProfile.set(profileId, current + (action.price - action.discount));

          // Track last activity date
          const activityDate = action.updated_at ?? session.session_date;
          if (activityDate) {
            const last = lastActivityByProfile.get(profileId);
            if (!last || activityDate > last) {
              lastActivityByProfile.set(profileId, activityDate);
            }
          }
        }

        // Subtract payments
        for (const payment of payments) {
          const current = balanceByProfile.get(payment.profile_id) ?? 0;
          balanceByProfile.set(payment.profile_id, current - payment.amount);
        }

        // Build AR items
        const today = new Date();
        const items: ARItem[] = [];

        for (const [profileId, balance] of balanceByProfile) {
          if (balance <= 0) continue;
          const profile = profileMap.get(profileId);
          if (!profile) continue;

          const lastActivity = lastActivityByProfile.get(profileId);
          const daysOverdue = lastActivity
            ? Math.floor((today.getTime() - new Date(lastActivity).getTime()) / 86400000)
            : 0;

          items.push({ profile, balance, daysOverdue });
        }

        // Sort by balance descending
        items.sort((a, b) => b.balance - a.balance);
        setArItems(items);
      } catch {
        setArItems([]);
      }
    };

    void loadAR();
  }, [data]);

  // ── Monthly summary ──

  interface DailyTotal {
    date: string;
    production: number;
    collections: number;
  }

  interface MonthlySummary {
    production: number;
    collections: number;
    rate: number;
    prevProduction: number;
    prevCollections: number;
    dailyTotals: DailyTotal[];
  }

  const [monthly, setMonthly] = useState<MonthlySummary>({
    production: 0,
    collections: 0,
    rate: 0,
    prevProduction: 0,
    prevCollections: 0,
    dailyTotals: [],
  });

  useEffect(() => {
    const loadMonthly = async () => {
      try {
        const today = new Date();
        const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM
        const prevDate = new Date(today);
        prevDate.setMonth(prevDate.getMonth() - 1);
        const prevMonth = prevDate.toISOString().slice(0, 7);

        const [periods, payments] = await Promise.all([
          data.listPeriods(),
          data.listPayments(),
        ]);

        // Get sessions and parts
        const periodIds = periods.map((p) => p.id);
        const sessions = periodIds.length > 0 ? await data.listSessions(periodIds) : [];
        const sessionMap = new Map(sessions.map((s) => [s.id, s]));
        const sessionIds = sessions.map((s) => s.id);
        const parts = sessionIds.length > 0 ? await data.listParts(sessionIds) : [];
        const partMap = new Map(parts.map((p) => [p.id, p]));
        const partIds = parts.map((p) => p.id);
        const actions = partIds.length > 0 ? await data.listActions(partIds) : [];

        // Build period map for profile lookup
        const periodMap = new Map(periods.map((p) => [p.id, p]));

        // Compute current month totals
        let currentProduction = 0;
        let prevProduction = 0;
        const dailyProd = new Map<string, number>();

        for (const action of actions) {
          if (action.status !== 'complete') continue;
          const part = partMap.get(action.part_id);
          if (!part) continue;
          const session = sessionMap.get(part.session_id);
          if (!session) continue;
          const period = periodMap.get(session.period_id);
          if (!period) continue;

          const amount = action.price - action.discount;
          const actionDate = action.updated_at ?? session.session_date;
          if (!actionDate) continue;

          const month = actionDate.slice(0, 7);
          const day = actionDate.slice(0, 10);

          if (month === currentMonth) {
            currentProduction += amount;
            dailyProd.set(day, (dailyProd.get(day) ?? 0) + amount);
          } else if (month === prevMonth) {
            prevProduction += amount;
          }
        }

        // Compute collections
        let currentCollections = 0;
        let prevCollections = 0;
        const dailyColl = new Map<string, number>();

        for (const payment of payments) {
          const month = payment.payment_date.slice(0, 7);
          const day = payment.payment_date.slice(0, 10);

          if (month === currentMonth) {
            currentCollections += payment.amount;
            dailyColl.set(day, (dailyColl.get(day) ?? 0) + payment.amount);
          } else if (month === prevMonth) {
            prevCollections += payment.amount;
          }
        }

        // Build daily totals for last 7 days
        const dailyTotals: DailyTotal[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().slice(0, 10);
          dailyTotals.push({
            date: dateStr,
            production: dailyProd.get(dateStr) ?? 0,
            collections: dailyColl.get(dateStr) ?? 0,
          });
        }

        const rate = currentProduction > 0
          ? Math.round((currentCollections / currentProduction) * 100)
          : 0;

        setMonthly({
          production: currentProduction,
          collections: currentCollections,
          rate,
          prevProduction,
          prevCollections,
          dailyTotals,
        });
      } catch {
        // silent
      }
    };

    void loadMonthly();
  }, [data]);

  // ── Production by dentist ──

  interface DentistProd {
    dentistId: string;
    name: string;
    production: number;
  }

  const [dentistProd, setDentistProd] = useState<DentistProd[]>([]);

  useEffect(() => {
    const loadDentistProd = async () => {
      try {
        const today = new Date();
        const currentMonth = today.toISOString().slice(0, 7);

        const [allAppts, profiles, periods, payments] = await Promise.all([
          data.listAppointments(),
          data.listProfiles(),
          data.listPeriods(),
          data.listPayments(),
        ]);

        // Get current month appointments with a dentist
        const monthAppts = allAppts.filter(
          (a) => a.start_time.slice(0, 7) === currentMonth && a.dentist_id
        );

        // Get unique patient IDs from those appointments
        const patientIds = [...new Set(monthAppts.map((a) => a.profile_id))];
        const relevantPeriods = periods.filter((p) => patientIds.includes(p.profile_id));
        const relevantPeriodIds = relevantPeriods.map((p) => p.id);
        const sessions = relevantPeriodIds.length > 0 ? await data.listSessions(relevantPeriodIds) : [];
        const sessionMap = new Map(sessions.map((s) => [s.id, s]));
        const sessionIds = sessions.map((s) => s.id);
        const parts = sessionIds.length > 0 ? await data.listParts(sessionIds) : [];
        const partMap = new Map(parts.map((p) => [p.id, p]));
        const partIds = parts.map((p) => p.id);
        const actions = partIds.length > 0 ? await data.listActions(partIds) : [];

        // Map actions to periods
        const periodMap = new Map(relevantPeriods.map((p) => [p.id, p]));

        // For each action, find the period and get the profile_id
        // Then find the appointment(s) for that profile + dentist
        const profileToDentist = new Map<string, string>();
        for (const appt of monthAppts) {
          const key = appt.profile_id;
          if (!profileToDentist.has(key)) {
            profileToDentist.set(key, appt.dentist_id!);
          }
        }

        // Compute production per dentist
        const prodByDentist = new Map<string, number>();
        for (const action of actions) {
          if (action.status !== 'complete') continue;
          const part = partMap.get(action.part_id);
          if (!part) continue;
          const session = sessionMap.get(part.session_id);
          if (!session) continue;
          const period = periodMap.get(session.period_id);
          if (!period) continue;
          const dentistId = profileToDentist.get(period.profile_id);
          if (!dentistId) continue;
          prodByDentist.set(dentistId, (prodByDentist.get(dentistId) ?? 0) + (action.price - action.discount));
        }

        // Build dentist production list
        const profileMap = new Map(profiles.map((p) => [p.id, p]));
        const result: DentistProd[] = [];
        for (const [dentistId, production] of prodByDentist) {
          const profile = profileMap.get(dentistId);
          result.push({
            dentistId,
            name: profile ? `${profile.first_name} ${profile.last_name}` : 'ناشناس',
            production,
          });
        }
        result.sort((a, b) => b.production - a.production);
        setDentistProd(result);
      } catch {
        setDentistProd([]);
      }
    };

    void loadDentistProd();
  }, [data]);

  // ── Production by procedure type ──

  interface TypeProd {
    type: string;
    label: string;
    production: number;
  }

  const TYPE_LABELS: Record<string, string> = {
    consultation: 'مشاوره',
    treatment: 'درمان',
    followup: 'پیگیری',
    hygiene: 'بهداشت',
    emergency: 'اورژانس',
  };

  const [typeProd, setTypeProd] = useState<TypeProd[]>([]);

  useEffect(() => {
    const loadTypeProd = async () => {
      try {
        const today = new Date();
        const currentMonth = today.toISOString().slice(0, 7);

        const allAppts = await data.listAppointments();
        const monthAppts = allAppts.filter(
          (a) => a.start_time.slice(0, 7) === currentMonth
        );

        // Get periods for these appointments
        const patientIds = [...new Set(monthAppts.map((a) => a.profile_id))];
        const periods = await data.listPeriods();
        const relevantPeriods = periods.filter((p) => patientIds.includes(p.profile_id));
        const relevantPeriodIds = relevantPeriods.map((p) => p.id);
        const sessions = relevantPeriodIds.length > 0 ? await data.listSessions(relevantPeriodIds) : [];
        const sessionMap = new Map(sessions.map((s) => [s.id, s]));
        const sessionIds = sessions.map((s) => s.id);
        const parts = sessionIds.length > 0 ? await data.listParts(sessionIds) : [];
        const partMap = new Map(parts.map((p) => [p.id, p]));
        const partIds = parts.map((p) => p.id);
        const actions = partIds.length > 0 ? await data.listActions(partIds) : [];

        // Map period → profile → appointment type
        const periodMap = new Map(relevantPeriods.map((p) => [p.id, p]));
        const profileToType = new Map<string, string>();
        for (const appt of monthAppts) {
          const key = appt.profile_id;
          if (!profileToType.has(key)) {
            profileToType.set(key, appt.type);
          }
        }

        // Compute production per type
        const prodByType = new Map<string, number>();
        for (const action of actions) {
          if (action.status !== 'complete') continue;
          const part = partMap.get(action.part_id);
          if (!part) continue;
          const session = sessionMap.get(part.session_id);
          if (!session) continue;
          const period = periodMap.get(session.period_id);
          if (!period) continue;
          const type = profileToType.get(period.profile_id);
          if (!type) continue;
          prodByType.set(type, (prodByType.get(type) ?? 0) + (action.price - action.discount));
        }

        const result: TypeProd[] = [];
        for (const [type, production] of prodByType) {
          result.push({
            type,
            label: TYPE_LABELS[type] ?? type,
            production,
          });
        }
        result.sort((a, b) => b.production - a.production);
        setTypeProd(result);
      } catch {
        setTypeProd([]);
      }
    };

    void loadTypeProd();
  }, [data]);

  // ── Current time indicator ──

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonProfileList count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with greeting */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {getGreeting()} {account?.display_name ?? ''}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {formatDate(todayISODate())} — ساعت {toFaDigits(currentTime)}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <div className="icon-well bg-teal-50 text-teal-700">
            <Stethoscope size={20} />
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <CalendarDays size={18} className="text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{toFaDigits(stats.total)}</p>
              <p className="text-xs text-slate-500">کل نوبت‌ها</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
              <Clock size={18} className="text-sky-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-sky-700">{toFaDigits(stats.upcoming)}</p>
              <p className="text-xs text-slate-500">در انتظار</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <Activity size={18} className="text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-teal-700">{toFaDigits(stats.active)}</p>
              <p className="text-xs text-slate-500">فعال</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">{toFaDigits(stats.completed)}</p>
              <p className="text-xs text-slate-500">تکمیل شده</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">وضعیت نوبت‌ها</h3>
        <div className="flex flex-wrap gap-2">
          {APPOINTMENT_STATUSES.map((status) => {
            const config = STATUS_CONFIG[status.value];
            const count = stats[status.value];
            if (count === 0) return null;
            const Icon = config.icon;
            return (
              <div
                key={status.value}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bg}`}
              >
                <Icon size={14} className={config.color} />
                <span className={`text-sm font-medium ${config.color}`}>
                  {toFaDigits(count)}
                </span>
                <span className="text-xs text-slate-500">{status.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chair status board */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">وضعیت صندلی‌ها</h3>
        <div className="grid grid-cols-2 gap-3">
          {chairStatuses.map((chair) => {
            const borderColor =
              chair.status === 'occupied'
                ? 'border-teal-300 bg-teal-50'
                : chair.status === 'next_up'
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-slate-200 bg-slate-50';

            const statusLabel =
              chair.status === 'occupied'
                ? 'در حال درمان'
                : chair.status === 'next_up'
                  ? 'نوبت بعدی'
                  : 'خالی';

            const statusColor =
              chair.status === 'occupied'
                ? 'text-teal-600'
                : chair.status === 'next_up'
                  ? 'text-amber-600'
                  : 'text-slate-400';

            const activeAppt = chair.current ?? chair.upcoming;

            return (
              <div
                key={chair.id}
                className={`border-2 rounded-xl p-4 transition-all ${borderColor}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        chair.status === 'occupied'
                          ? 'bg-teal-500 animate-pulse'
                          : chair.status === 'next_up'
                            ? 'bg-amber-400'
                            : 'bg-slate-300'
                      }`}
                    />
                    <span className="text-sm font-semibold text-slate-800">
                      {chair.label}
                    </span>
                  </div>
                  <span className={`text-[10px] font-medium ${statusColor}`}>
                    {statusLabel}
                  </span>
                </div>

                {activeAppt ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm font-medium text-slate-800">
                      {activeAppt.profile
                        ? `${activeAppt.profile.first_name} ${activeAppt.profile.last_name}`
                        : 'بیمار ناشناس'}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {formatTime(activeAppt.start_time)}
                      </span>
                      {(() => {
                        const typeConfig = APPOINTMENT_TYPES.find(
                          (t) => t.value === activeAppt.type
                        );
                        if (!typeConfig) return null;
                        return (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded border ${
                              TYPE_COLORS[activeAppt.type] ??
                              'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {typeConfig.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <p className="text-xs text-slate-400">
                      نوبتی ثبت نشده
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Arrivals queue */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-700">بیماران در انتظار</h3>
            {arrivals.length > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-amber-500 rounded-full">
                {toFaDigits(arrivals.length)}
              </span>
            )}
          </div>
          {arrivals.length > 0 && onNavigate && (
            <button
              onClick={() => onNavigate('arrivals')}
              className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              مشاهده همه
              <ArrowLeft size={12} />
            </button>
          )}
        </div>

        {arrivals.length === 0 ? (
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Users size={18} className="text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">بیماری در انتظار نیست</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {arrivals.map((appt) => {
              const waitMinutes = Math.floor(
                (Date.now() - new Date(appt.start_time).getTime()) / 60000
              );
              const waitText =
                waitMinutes < 60
                  ? `${toFaDigits(waitMinutes)} دقیقه`
                  : `${toFaDigits(Math.floor(waitMinutes / 60))} ساعت ${toFaDigits(waitMinutes % 60)} دقیقه`;

              return (
                <div
                  key={appt.id}
                  className="card p-3 flex items-center gap-3 border-amber-200 bg-amber-50/50"
                >
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {appt.profile
                        ? `${appt.profile.first_name} ${appt.profile.last_name}`
                        : 'بیمار ناشناس'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">
                        {formatTime(appt.start_time)}
                      </span>
                      <span className="text-[10px] text-slate-400">•</span>
                      <span className="text-xs text-amber-600">
                        {waitText} انتظار
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStartTreatment(appt)}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg transition whitespace-nowrap"
                  >
                    شروع درمان
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Financial metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-slate-500">تولید امروز</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {formatPrice(financial.production)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <Activity size={18} className="text-teal-600" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400">ارزش کل درمان‌های تکمیل شده</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-slate-500">وصول امروز</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {formatPrice(financial.collections)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-emerald-600" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400">مبلغ واریزی دریافت شده</p>
        </div>
      </div>

      {/* Collection rate progress bar */}
      {financial.production > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-700">نرخ وصول</h3>
            <span className="text-sm font-bold text-teal-600">
              {toFaDigits(Math.round((financial.collections / financial.production) * 100))}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5">
            <div
              className="bg-teal-500 h-2.5 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (financial.collections / financial.production) * 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-slate-400">
            <span>وصول: {formatPrice(financial.collections)}</span>
            <span>تولید: {formatPrice(financial.production)}</span>
          </div>
        </div>
      )}

      {/* AR aging */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-700">بدهی معوق</h3>
            {arItems.length > 0 && (
              <span className="inline-flex items-center justify-center px-2 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                {formatPrice(arItems.reduce((sum, item) => sum + item.balance, 0))}
              </span>
            )}
          </div>
        </div>

        {arItems.length === 0 ? (
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <AlertCircle size={18} className="text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">بدهی معوقی وجود ندارد</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {arItems.slice(0, 10).map((item) => {
              const bucket =
                item.daysOverdue <= 30
                  ? 'bg-amber-50 border-amber-200'
                  : item.daysOverdue <= 60
                    ? 'bg-orange-50 border-orange-200'
                    : item.daysOverdue <= 90
                      ? 'bg-red-50 border-red-200'
                      : 'bg-red-100 border-red-300';

              const dotColor =
                item.daysOverdue <= 30
                  ? 'bg-amber-400'
                  : item.daysOverdue <= 60
                    ? 'bg-orange-400'
                    : item.daysOverdue <= 90
                      ? 'bg-red-400'
                      : 'bg-red-600';

              const daysLabel =
                item.daysOverdue <= 30
                  ? '۰–۳۰ روز'
                  : item.daysOverdue <= 60
                    ? '۳۱–۶۰ روز'
                    : item.daysOverdue <= 90
                      ? '۶۱–۹۰ روز'
                      : '+۹۰ روز';

              return (
                <div
                  key={item.profile.id}
                  className={`card p-3 flex items-center gap-3 border ${bucket}`}
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {item.profile.first_name} {item.profile.last_name}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {daysLabel} از آخرین فعالیت
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-red-600">
                      {formatPrice(item.balance)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Monthly summary */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">خلاصه مالی ماهانه</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="card p-3 text-center">
            <p className="text-[10px] text-slate-500 mb-1">تولید</p>
            <p className="text-lg font-bold text-teal-600">
              {formatPrice(monthly.production)}
            </p>
            {monthly.prevProduction > 0 && (
              <p className="text-[10px] text-slate-400 mt-1">
                {monthly.production >= monthly.prevProduction ? '↑' : '↓'}{' '}
                {toFaDigits(Math.abs(Math.round(((monthly.production - monthly.prevProduction) / monthly.prevProduction) * 100)))}%
              </p>
            )}
          </div>
          <div className="card p-3 text-center">
            <p className="text-[10px] text-slate-500 mb-1">وصول</p>
            <p className="text-lg font-bold text-emerald-600">
              {formatPrice(monthly.collections)}
            </p>
            {monthly.prevCollections > 0 && (
              <p className="text-[10px] text-slate-400 mt-1">
                {monthly.collections >= monthly.prevCollections ? '↑' : '↓'}{' '}
                {toFaDigits(Math.abs(Math.round(((monthly.collections - monthly.prevCollections) / monthly.prevCollections) * 100)))}%
              </p>
            )}
          </div>
          <div className="card p-3 text-center">
            <p className="text-[10px] text-slate-500 mb-1">نرخ وصول</p>
            <p className="text-lg font-bold text-slate-800">
              {toFaDigits(monthly.rate)}%
            </p>
            <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
              <div
                className="bg-teal-500 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, monthly.rate)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bar chart - last 7 days */}
        {monthly.dailyTotals.length > 0 && (
          <div className="card p-4">
            <h4 className="text-xs font-semibold text-slate-600 mb-3">۷ روز اخیر</h4>
            <div className="flex items-end gap-2 h-32">
              {monthly.dailyTotals.map((day) => {
                const maxVal = Math.max(
                  ...monthly.dailyTotals.map((d) => Math.max(d.production, d.collections)),
                  1
                );
                const prodHeight = (day.production / maxVal) * 100;
                const collHeight = (day.collections / maxVal) * 100;
                const dayLabel = day.date.slice(8, 10);

                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="flex items-end gap-0.5 h-24">
                      <div
                        className="w-3 bg-teal-400 rounded-t"
                        style={{ height: `${prodHeight}%` }}
                        title={`تولید: ${formatPrice(day.production)}`}
                      />
                      <div
                        className="w-3 bg-emerald-400 rounded-t"
                        style={{ height: `${collHeight}%` }}
                        title={`وصول: ${formatPrice(day.collections)}`}
                      />
                    </div>
                    <span className="text-[9px] text-slate-400">
                      {toFaDigits(parseInt(dayLabel))}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-4 mt-3">
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 bg-teal-400 rounded" />
                <span className="text-[10px] text-slate-500">تولید</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 bg-emerald-400 rounded" />
                <span className="text-[10px] text-slate-500">وصول</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Production by dentist */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">تولید به تفکیک دندانپزشک</h3>
        {dentistProd.length === 0 ? (
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Users size={18} className="text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">داده‌ای موجود نیست</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {(() => {
              const totalProd = dentistProd.reduce((s, d) => s + d.production, 0);
              return dentistProd.map((d) => {
                const pct = totalProd > 0 ? Math.round((d.production / totalProd) * 100) : 0;
                return (
                  <div key={d.dentistId} className="card p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                          <Stethoscope size={14} className="text-teal-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-800">
                          {d.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-teal-600">
                          {formatPrice(d.production)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {toFaDigits(pct)}%
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-teal-400 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Production by procedure type */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">تولید به تفکیک نوع خدمت</h3>
        {typeProd.length === 0 ? (
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <AlertCircle size={18} className="text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">داده‌ای موجود نیست</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {(() => {
              const totalProd = typeProd.reduce((s, d) => s + d.production, 0);
              const barColors: Record<string, string> = {
                consultation: 'bg-sky-400',
                treatment: 'bg-teal-400',
                followup: 'bg-amber-400',
                hygiene: 'bg-emerald-400',
                emergency: 'bg-red-400',
              };
              return typeProd.map((d) => {
                const pct = totalProd > 0 ? Math.round((d.production / totalProd) * 100) : 0;
                return (
                  <div key={d.type} className="card p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          TYPE_COLORS[d.type] ?? 'bg-slate-100'
                        }`}>
                          <span className="text-xs font-bold">
                            {d.label.charAt(0)}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-slate-800">
                          {d.label}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-teal-600">
                          {formatPrice(d.production)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {toFaDigits(pct)}%
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className={`${barColors[d.type] ?? 'bg-slate-400'} h-1.5 rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Today's appointments list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">نوبت‌های امروز</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {toFaDigits(appointments.length)} نوبت
            </p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('appointments')}
              className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              مشاهده همه
              <ArrowLeft size={12} />
            </button>
          )}
        </div>

        {appointments.length === 0 ? (
          <div className="p-8 text-center">
            <CalendarDays size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm text-slate-500">نوبتی برای امروز ثبت نشده</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {appointments.map((appt) => {
              const statusConfig = STATUS_CONFIG[appt.status];
              const typeConfig = APPOINTMENT_TYPES.find((t) => t.value === appt.type);
              const isPast = new Date(appt.start_time).getTime() < Date.now();
              const isActive = appt.status === 'in_progress' || appt.status === 'arrived';

              return (
                <div
                  key={appt.id}
                  className={`px-5 py-3 flex items-center gap-4 hover:bg-slate-50 transition ${
                    isActive ? 'bg-teal-50/50' : ''
                  } ${isPast ? 'opacity-60' : ''}`}
                >
                  {/* Time */}
                  <div className="w-16 text-center shrink-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {toFaDigits(formatTime(appt.start_time))}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {toFaDigits(appt.duration_minutes)} دقیقه
                    </p>
                  </div>

                  {/* Status dot */}
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      isActive ? 'bg-teal-500 animate-pulse' : statusConfig.bg
                    }`}
                  />

                  {/* Patient info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {appt.profile
                        ? `${appt.profile.first_name} ${appt.profile.last_name}`
                        : 'بیمار ناشناس'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {typeConfig && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${
                            TYPE_COLORS[appt.type] ?? 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {typeConfig.label}
                        </span>
                      )}
                      {appt.notes && (
                        <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                          {appt.notes}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <div
                    className={`px-2 py-1 rounded-lg text-[10px] font-medium ${statusConfig.bg} ${statusConfig.color}`}
                  >
                    {statusConfig.label}
                  </div>

                  {/* Profile link */}
                  {appt.profile && onOpenProfile && (
                    <button
                      onClick={() => onOpenProfile(appt.profile!)}
                      className="text-slate-400 hover:text-teal-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
                    >
                      <ArrowLeft size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick stats footer */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">
            {toFaDigits(stats.no_show)}
          </p>
          <p className="text-xs text-slate-500 mt-1">عدم حضور</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">
            {toFaDigits(stats.cancelled)}
          </p>
          <p className="text-xs text-slate-500 mt-1">لغو شده</p>
        </div>
        <div className="card p-4 text-center md:col-span-1 col-span-2">
          <p className="text-2xl font-bold text-teal-600">
            {stats.total > 0
              ? `${toFaDigits(Math.round((stats.completed / stats.total) * 100))}%`
              : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">نرخ تکمیل</p>
        </div>
      </div>
    </div>
  );
}
