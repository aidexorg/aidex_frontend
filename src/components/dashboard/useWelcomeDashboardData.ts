import { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '@/data';
import type { Profile, AppointmentStatus } from '@/types';
import type { AppointmentWithProfile, DashboardStats } from './types';
import { todayISODate } from './helpers';

/** Lightweight dashboard data — single bulk fetch, no unused report effects. */
export function useWelcomeDashboardData() {
  const data = useData();
  const [appointments, setAppointments] = useState<AppointmentWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<{ display_name: string | null } | null>(null);
  const [totalOutstanding, setTotalOutstanding] = useState(0);

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
      const todayAppts = allAppts
        .filter((a) => a.start_time.slice(0, 10) === today)
        .map((a) => ({
          ...a,
          profile: profileMap.get(a.profile_id) ?? null,
        }))
        .sort((a, b) => a.start_time.localeCompare(b.start_time));

      const partToSession = new Map(parts.map((p) => [p.id, p.session_id]));
      const sessionToPeriod = new Map(sessions.map((s) => [s.id, s.period_id]));
      const periodToProfile = new Map(periods.map((p) => [p.id, p.profile_id]));

      const balanceByProfile = new Map<string, number>();
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

      setAppointments(todayAppts);
      setAccount(currentAccount);
      setTotalOutstanding(outstanding);
    } catch {
      setAppointments([]);
      setTotalOutstanding(0);
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

  const arrivals = useMemo(
    () =>
      appointments
        .filter((a) => a.status === 'arrived')
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [appointments]
  );

  return { loading, account, stats, arrivals, totalOutstanding, refresh: load };
}
