import { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '@/data';
import type { Profile, AppointmentStatus } from '@/types';
import type {
  AppointmentWithProfile,
  FinancialMetrics,
  ChairStatus,
  ARItem,
  MonthlySummary,
  DentistProd,
  TypeProd,
  BalanceAlert,
  DashboardStats,
} from './types';
import { CHAIRS, TYPE_LABELS } from './constants';
import { todayISODate } from './helpers';

export function useDashboardData() {
  const data = useData();
  const [appointments, setAppointments] = useState<AppointmentWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<{ display_name: string | null } | null>(null);
  const [financial, setFinancial] = useState<FinancialMetrics>({ production: 0, collections: 0 });
  const [arItems, setArItems] = useState<ARItem[]>([]);
  const [monthly, setMonthly] = useState<MonthlySummary>({
    production: 0,
    collections: 0,
    rate: 0,
    prevProduction: 0,
    prevCollections: 0,
    dailyTotals: [],
  });
  const [dentistProd, setDentistProd] = useState<DentistProd[]>([]);
  const [typeProd, setTypeProd] = useState<TypeProd[]>([]);
  const [balanceAlerts, setBalanceAlerts] = useState<BalanceAlert[]>([]);

  // ── Main data load ──
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

      const allPayments = await data.listPayments();
      const todayPayments = allPayments.filter((p) => p.payment_date === today);
      collections = todayPayments.reduce((sum, p) => sum + p.amount, 0);

      if (todayAppts.length > 0) {
        const periods = await data.listPeriods();
        const periodIds = periods.map((p) => p.id);
        const sessions = periodIds.length > 0 ? await data.listSessions(periodIds) : [];
        const sessionIds = sessions.map((s) => s.id);
        const parts = sessionIds.length > 0 ? await data.listParts(sessionIds) : [];
        const partIds = parts.map((p) => p.id);
        const allActions = partIds.length > 0 ? await data.listActions(partIds) : [];

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

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      load();
    }, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  // ── Statistics ──
  const stats = useMemo((): DashboardStats => {
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

      const current = chairAppts.find(
        (a) => a.status === 'in_progress' || a.status === 'arrived'
      ) ?? null;

      const upcoming = !current
        ? chairAppts.find(
            (a) => a.status === 'scheduled' || a.status === 'confirmed'
          ) ?? null
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

  // ── Start treatment handler ──
  const handleStartTreatment = useCallback(
    async (appt: AppointmentWithProfile) => {
      try {
        await data.updateAppointment(appt.id, { status: 'in_progress' });
        load();
      } catch {
        // silent
      }
    },
    [data, load]
  );

  // ── AR aging ──
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

        const periodIds = periods.map((p) => p.id);
        const sessions = periodIds.length > 0 ? await data.listSessions(periodIds) : [];
        const sessionMap = new Map(sessions.map((s) => [s.id, s]));
        const sessionIds = sessions.map((s) => s.id);
        const parts = sessionIds.length > 0 ? await data.listParts(sessionIds) : [];
        const partMap = new Map(parts.map((p) => [p.id, p]));
        const partIds = parts.map((p) => p.id);
        const actions = partIds.length > 0 ? await data.listActions(partIds) : [];

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

          const activityDate = action.updated_at ?? session.session_date;
          if (activityDate) {
            const last = lastActivityByProfile.get(profileId);
            if (!last || activityDate > last) {
              lastActivityByProfile.set(profileId, activityDate);
            }
          }
        }

        for (const payment of payments) {
          const period = periodMap.get(payment.period_id);
          if (!period) continue;
          const current = balanceByProfile.get(period.profile_id) ?? 0;
          balanceByProfile.set(period.profile_id, current - payment.amount);
        }

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

        items.sort((a, b) => b.balance - a.balance);
        setArItems(items);
      } catch {
        setArItems([]);
      }
    };

    void loadAR();
  }, [data]);

  // ── Monthly summary ──
  useEffect(() => {
    const loadMonthly = async () => {
      try {
        const today = new Date();
        const currentMonth = today.toISOString().slice(0, 7);
        const prevDate = new Date(today);
        prevDate.setMonth(prevDate.getMonth() - 1);
        const prevMonth = prevDate.toISOString().slice(0, 7);

        const [periods, payments] = await Promise.all([
          data.listPeriods(),
          data.listPayments(),
        ]);

        const periodIds = periods.map((p) => p.id);
        const sessions = periodIds.length > 0 ? await data.listSessions(periodIds) : [];
        const sessionMap = new Map(sessions.map((s) => [s.id, s]));
        const sessionIds = sessions.map((s) => s.id);
        const parts = sessionIds.length > 0 ? await data.listParts(sessionIds) : [];
        const partMap = new Map(parts.map((p) => [p.id, p]));
        const partIds = parts.map((p) => p.id);
        const actions = partIds.length > 0 ? await data.listActions(partIds) : [];
        const periodMap = new Map(periods.map((p) => [p.id, p]));

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

        const dailyTotals: { date: string; production: number; collections: number }[] = [];
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
  useEffect(() => {
    const loadDentistProd = async () => {
      try {
        const today = new Date();
        const currentMonth = today.toISOString().slice(0, 7);

        const [allAppts, profiles, periods] = await Promise.all([
          data.listAppointments(),
          data.listProfiles(),
          data.listPeriods(),
        ]);

        const monthAppts = allAppts.filter(
          (a) => a.start_time.slice(0, 7) === currentMonth && a.dentist_id
        );

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

        const periodMap = new Map(relevantPeriods.map((p) => [p.id, p]));

        const profileToDentist = new Map<string, string>();
        for (const appt of monthAppts) {
          if (!profileToDentist.has(appt.profile_id)) {
            profileToDentist.set(appt.profile_id, appt.dentist_id!);
          }
        }

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
  useEffect(() => {
    const loadTypeProd = async () => {
      try {
        const today = new Date();
        const currentMonth = today.toISOString().slice(0, 7);

        const allAppts = await data.listAppointments();
        const monthAppts = allAppts.filter(
          (a) => a.start_time.slice(0, 7) === currentMonth
        );

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

        const periodMap = new Map(relevantPeriods.map((p) => [p.id, p]));
        const profileToType = new Map<string, string>();
        for (const appt of monthAppts) {
          if (!profileToType.has(appt.profile_id)) {
            profileToType.set(appt.profile_id, appt.type);
          }
        }

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

  // ── Balance alerts ──
  useEffect(() => {
    const loadBalanceAlerts = async () => {
      try {
        const today = todayISODate();
        const [allAppts, profiles, periods, payments] = await Promise.all([
          data.listAppointments(),
          data.listProfiles(),
          data.listPeriods(),
          data.listPayments(),
        ]);

        const profileMap = new Map(profiles.map((p) => [p.id, p]));
        const todayAppts = allAppts
          .filter((a) => a.start_time.slice(0, 10) === today)
          .map((a) => ({
            ...a,
            profile: profileMap.get(a.profile_id) ?? null,
          }));

        const patientIds = [...new Set(todayAppts.map((a) => a.profile_id))];
        const relevantPeriods = periods.filter((p) => patientIds.includes(p.profile_id));
        const relevantPeriodIds = relevantPeriods.map((p) => p.id);
        const sessions = relevantPeriodIds.length > 0 ? await data.listSessions(relevantPeriodIds) : [];
        const sessionMap = new Map(sessions.map((s) => [s.id, s]));
        const sessionIds = sessions.map((s) => s.id);
        const parts = sessionIds.length > 0 ? await data.listParts(sessionIds) : [];
        const partMap = new Map(parts.map((p) => [p.id, p]));
        const partIds = parts.map((p) => p.id);
        const actions = partIds.length > 0 ? await data.listActions(partIds) : [];

        const balanceByProfile = new Map<string, number>();
        const lastActivityByProfile = new Map<string, string>();

        for (const action of actions) {
          const part = partMap.get(action.part_id);
          if (!part) continue;
          const session = sessionMap.get(part.session_id);
          if (!session) continue;
          const period = sessionMap.has(part.session_id) ? periods.find((p) => p.id === session.period_id) : null;
          if (!period) continue;

          const profileId = period.profile_id;
          const current = balanceByProfile.get(profileId) ?? 0;
          balanceByProfile.set(profileId, current + (action.price - action.discount));

          const activityDate = action.updated_at ?? session.session_date;
          if (activityDate) {
            const last = lastActivityByProfile.get(profileId);
            if (!last || activityDate > last) {
              lastActivityByProfile.set(profileId, activityDate);
            }
          }
        }

        for (const payment of payments) {
          const period = periods.find((p) => p.id === payment.period_id);
          if (!period) continue;
          const current = balanceByProfile.get(period.profile_id) ?? 0;
          balanceByProfile.set(period.profile_id, current - payment.amount);
        }

        const now = new Date();
        const alerts: BalanceAlert[] = [];

        for (const appt of todayAppts) {
          const balance = balanceByProfile.get(appt.profile_id) ?? 0;
          if (balance <= 0) continue;

          const lastActivity = lastActivityByProfile.get(appt.profile_id);
          const daysOverdue = lastActivity
            ? Math.floor((now.getTime() - new Date(lastActivity).getTime()) / 86400000)
            : 0;

          alerts.push({ appointment: appt, balance, daysOverdue });
        }

        alerts.sort((a, b) => b.balance - a.balance);
        setBalanceAlerts(alerts);
      } catch {
        setBalanceAlerts([]);
      }
    };

    void loadBalanceAlerts();
  }, [data]);

  // Build balance lookup map
  const balanceByProfileId = useMemo(() => {
    const map = new Map<string, number>();
    for (const alert of balanceAlerts) {
      map.set(alert.appointment.profile_id, alert.balance);
    }
    return map;
  }, [balanceAlerts]);

  return {
    appointments,
    loading,
    account,
    financial,
    arItems,
    monthly,
    dentistProd,
    typeProd,
    balanceAlerts,
    stats,
    chairStatuses,
    arrivals,
    balanceByProfileId,
    handleStartTreatment,
  };
}
