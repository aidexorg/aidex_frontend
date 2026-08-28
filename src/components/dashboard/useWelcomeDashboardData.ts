import { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '@/data';
import type { Profile, AppointmentStatus } from '@/types';
import type {
  AppointmentWithProfile,
  DashboardStats,
  ARItem,
  BalanceAlert,
  MonthlySummary,
} from './types';
import type { FollowupItem } from '@/lib/followups';
import { todayISODate } from './helpers';

const EMPTY_MONTHLY: MonthlySummary = {
  production: 0,
  collections: 0,
  rate: 0,
  prevProduction: 0,
  prevCollections: 0,
  dailyTotals: [],
};

/**
 * Single coordinated dashboard load. One `Promise.all` fetches every entity the
 * dashboard needs; all KPIs (balances, AR aging, monthly trend, follow-ups,
 * needs-attention, weekly appointments) are derived from that one read — no
 * per-widget refetch.
 */
export function useWelcomeDashboardData() {
  const data = useData();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<{ display_name: string | null } | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<AppointmentWithProfile[]>([]);
  const [weekCount, setWeekCount] = useState(0);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [balanceByProfileId, setBalanceByProfileId] = useState<Map<string, number>>(new Map());
  const [arItems, setArItems] = useState<ARItem[]>([]);
  const [balanceAlerts, setBalanceAlerts] = useState<BalanceAlert[]>([]);
  const [monthly, setMonthly] = useState<MonthlySummary>(EMPTY_MONTHLY);
  const [followups, setFollowups] = useState<FollowupItem[]>([]);
  const [needsAttention, setNeedsAttention] = useState<Profile[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = todayISODate();
      const [allAppts, profiles, currentAccount, periods, payments, actions, parts, sessions] =
        await Promise.all([
          data.listAppointments(),
          data.listProfiles(),
          data.getCurrentAccount(),
          data.listPeriods(),
          data.listPayments(),
          data.listActions(),
          data.listParts(),
          data.listSessions(),
        ]);

      const profileMap = new Map(profiles.map((p) => [p.id, p]));
      const partMap = new Map(parts.map((p) => [p.id, p]));
      const sessionMap = new Map(sessions.map((s) => [s.id, s]));
      const periodMap = new Map(periods.map((p) => [p.id, p]));
      const partToSession = new Map(parts.map((p) => [p.id, p.session_id]));
      const sessionToPeriod = new Map(sessions.map((s) => [s.id, s.period_id]));
      const periodToProfile = new Map(periods.map((p) => [p.id, p.profile_id]));

      const todayAppts: AppointmentWithProfile[] = allAppts
        .filter((a) => a.start_time.slice(0, 10) === today)
        .map((a) => ({ ...a, profile: profileMap.get(a.profile_id) ?? null }))
        .sort((a, b) => a.start_time.localeCompare(b.start_time));

      // ── Weekly appointments (Saturday–Friday window, non-cancelled) ──
      const nowDate = new Date();
      const daysSinceSaturday = (nowDate.getDay() + 1) % 7;
      const weekStart = new Date(nowDate);
      weekStart.setDate(nowDate.getDate() - daysSinceSaturday);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const weekStartStr = weekStart.toISOString().slice(0, 10);
      const weekEndStr = weekEnd.toISOString().slice(0, 10);
      const weekAppts = allAppts.filter((a) => {
        const d = a.start_time.slice(0, 10);
        return d >= weekStartStr && d <= weekEndStr && a.status !== 'cancelled';
      });

      // ── Per-profile balance + last activity (single pass over actions/payments) ──
      const balanceByProfile = new Map<string, number>();
      const lastActivityByProfile = new Map<string, string>();
      for (const action of actions) {
        const sessionId = partToSession.get(action.part_id);
        if (!sessionId) continue;
        const periodId = sessionToPeriod.get(sessionId);
        if (!periodId) continue;
        const profileId = periodToProfile.get(periodId);
        if (!profileId) continue;

        balanceByProfile.set(
          profileId,
          (balanceByProfile.get(profileId) ?? 0) + (action.price - action.discount)
        );

        const activityDate = action.updated_at ?? sessionMap.get(sessionId)?.session_date;
        if (activityDate) {
          const last = lastActivityByProfile.get(profileId);
          if (!last || activityDate > last) lastActivityByProfile.set(profileId, activityDate);
        }
      }
      for (const payment of payments) {
        const profileId = periodToProfile.get(payment.period_id);
        if (!profileId) continue;
        balanceByProfile.set(profileId, (balanceByProfile.get(profileId) ?? 0) - payment.amount);
      }

      let outstanding = 0;
      for (const balance of balanceByProfile.values()) {
        if (balance > 0) outstanding += balance;
      }

      const nowMs = Date.now();
      const daysOverdueFor = (profileId: string): number => {
        const last = lastActivityByProfile.get(profileId);
        return last ? Math.floor((nowMs - new Date(last).getTime()) / 86_400_000) : 0;
      };

      // ── AR aging (all profiles with a positive balance) ──
      const ar: ARItem[] = [];
      for (const [profileId, balance] of balanceByProfile) {
        if (balance <= 0) continue;
        const profile = profileMap.get(profileId);
        if (!profile) continue;
        ar.push({ profile, balance, daysOverdue: daysOverdueFor(profileId) });
      }
      ar.sort((a, b) => b.balance - a.balance);

      // ── Overdue balances among today's patients ──
      const alerts: BalanceAlert[] = [];
      for (const appt of todayAppts) {
        const balance = balanceByProfile.get(appt.profile_id) ?? 0;
        if (balance <= 0) continue;
        alerts.push({ appointment: appt, balance, daysOverdue: daysOverdueFor(appt.profile_id) });
      }
      alerts.sort((a, b) => b.balance - a.balance);

      // ── Monthly production/collections + 7-day trend ──
      const currentMonth = nowDate.toISOString().slice(0, 7);
      const prevMonthDate = new Date(nowDate);
      prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
      const prevMonth = prevMonthDate.toISOString().slice(0, 7);

      let currentProduction = 0;
      let prevProduction = 0;
      const dailyProd = new Map<string, number>();
      for (const action of actions) {
        if (action.status !== 'complete') continue;
        const sessionId = partToSession.get(action.part_id);
        if (!sessionId) continue;
        const amount = action.price - action.discount;
        const actionDate = action.updated_at ?? sessionMap.get(sessionId)?.session_date;
        if (!actionDate) continue;
        const month = actionDate.slice(0, 7);
        if (month === currentMonth) {
          currentProduction += amount;
          const day = actionDate.slice(0, 10);
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
        if (month === currentMonth) {
          currentCollections += payment.amount;
          const day = payment.payment_date.slice(0, 10);
          dailyColl.set(day, (dailyColl.get(day) ?? 0) + payment.amount);
        } else if (month === prevMonth) {
          prevCollections += payment.amount;
        }
      }

      const dailyTotals: MonthlySummary['dailyTotals'] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(nowDate);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        dailyTotals.push({
          date: dateStr,
          production: dailyProd.get(dateStr) ?? 0,
          collections: dailyColl.get(dateStr) ?? 0,
        });
      }

      const rate =
        currentProduction > 0 ? Math.round((currentCollections / currentProduction) * 100) : 0;

      // ── Follow-ups + needs-attention (same rule as loadFollowupItems / patientStatus) ──
      const fups: FollowupItem[] = [];
      const needSeen = new Set<string>();
      const needList: Profile[] = [];
      for (const action of actions) {
        if (!(action.status === 'incomplete' || action.needs_followup)) continue;
        const part = partMap.get(action.part_id);
        if (!part) continue;
        const session = sessionMap.get(part.session_id);
        if (!session) continue;
        const period = periodMap.get(session.period_id);
        if (!period) continue;
        const profile = profileMap.get(period.profile_id);
        if (!profile) continue;

        fups.push({ action, part, session, period, profile });
        if (!needSeen.has(profile.id)) {
          needSeen.add(profile.id);
          needList.push(profile);
        }
      }
      fups.sort(
        (a, b) =>
          new Date(a.session.session_date).getTime() - new Date(b.session.session_date).getTime()
      );

      setAccount(currentAccount);
      setTodayAppointments(todayAppts);
      setWeekCount(weekAppts.length);
      setTotalOutstanding(outstanding);
      setBalanceByProfileId(balanceByProfile);
      setArItems(ar);
      setBalanceAlerts(alerts);
      setMonthly({
        production: currentProduction,
        collections: currentCollections,
        rate,
        prevProduction,
        prevCollections,
        dailyTotals,
      });
      setFollowups(fups);
      setNeedsAttention(needList);
    } catch {
      setAccount(null);
      setTodayAppointments([]);
      setWeekCount(0);
      setTotalOutstanding(0);
      setBalanceByProfileId(new Map());
      setArItems([]);
      setBalanceAlerts([]);
      setMonthly(EMPTY_MONTHLY);
      setFollowups([]);
      setNeedsAttention([]);
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    void load();
  }, [load]);

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
    for (const appt of todayAppointments) {
      counts[appt.status]++;
    }
    return {
      total: todayAppointments.length,
      ...counts,
      upcoming: counts.scheduled + counts.confirmed,
      active: counts.arrived + counts.in_progress,
    };
  }, [todayAppointments]);

  const arrivals = useMemo(
    () =>
      todayAppointments
        .filter((a) => a.status === 'arrived')
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [todayAppointments]
  );

  const handleStartTreatment = useCallback(
    async (appt: AppointmentWithProfile) => {
      try {
        await data.updateAppointment(appt.id, { status: 'in_progress' });
        await load();
      } catch {
        // silent — a failed status flip should not break the dashboard
      }
    },
    [data, load]
  );

  return {
    loading,
    account,
    stats,
    arrivals,
    todayAppointments,
    weekCount,
    totalOutstanding,
    balanceByProfileId,
    arItems,
    balanceAlerts,
    monthly,
    followups,
    needsAttention,
    handleStartTreatment,
    refresh: load,
  };
}
