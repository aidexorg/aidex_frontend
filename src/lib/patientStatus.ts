import type { DataProvider } from '@/data/types';
import type { Action, Profile } from '@/types';
import type { PatientStatus } from '@/components/design';

export interface ProfileListMeta {
  statuses: Map<string, PatientStatus>;
  lastVisits: Map<string, string | null>;
}

function profileIdForAction(
  action: Action,
  partToSession: Map<string, string>,
  sessionToPeriod: Map<string, string>,
  periodToProfile: Map<string, string>
): string | null {
  const sessionId = partToSession.get(action.part_id);
  if (!sessionId) return null;
  const periodId = sessionToPeriod.get(sessionId);
  if (!periodId) return null;
  return periodToProfile.get(periodId) ?? null;
}

/**
 * Bulk-fetch profile list metadata in O(1) round-trips (not per profile).
 * Replaces the previous N+1 loadProfileStatuses + loadProfileLastVisits pattern.
 */
export async function loadProfileListMeta(
  data: DataProvider,
  profiles: Profile[]
): Promise<ProfileListMeta> {
  const statuses = new Map<string, PatientStatus>();
  const lastVisits = new Map<string, string | null>();
  const profileIds = new Set(profiles.map((p) => p.id));

  for (const profile of profiles) {
    statuses.set(profile.id, 'active');
    lastVisits.set(profile.id, null);
  }

  if (profiles.length === 0) {
    return { statuses, lastVisits };
  }

  const [actions, parts, sessions, periods] = await Promise.all([
    data.listActions(),
    data.listParts(),
    data.listSessions(),
    data.listPeriods(),
  ]);

  const partToSession = new Map(parts.map((p) => [p.id, p.session_id]));
  const sessionToPeriod = new Map(sessions.map((s) => [s.id, s.period_id]));
  const periodToProfile = new Map(periods.map((p) => [p.id, p.profile_id]));

  const needsAppointment = new Set<string>();
  const hasIncomplete = new Set<string>();

  for (const action of actions) {
    const profileId = profileIdForAction(action, partToSession, sessionToPeriod, periodToProfile);
    if (!profileId || !profileIds.has(profileId)) continue;

    if (action.needs_followup || action.status === 'incomplete') {
      needsAppointment.add(profileId);
    }
    if (action.status === 'incomplete') {
      hasIncomplete.add(profileId);
    }
  }

  for (const session of sessions) {
    const profileId = periodToProfile.get(session.period_id);
    if (!profileId || !profileIds.has(profileId) || !session.session_date) continue;
    const current = lastVisits.get(profileId);
    if (!current || session.session_date > current) {
      lastVisits.set(profileId, session.session_date);
    }
  }

  for (const profileId of profileIds) {
    if (needsAppointment.has(profileId)) {
      statuses.set(profileId, 'appointment_needed');
    } else if (hasIncomplete.has(profileId)) {
      statuses.set(profileId, 'in_treatment');
    } else {
      statuses.set(profileId, 'active');
    }
  }

  return { statuses, lastVisits };
}

/** @deprecated Use loadProfileListMeta */
export async function loadProfileStatuses(
  data: DataProvider,
  profiles: Profile[]
): Promise<Map<string, PatientStatus>> {
  const { statuses } = await loadProfileListMeta(data, profiles);
  return statuses;
}

/** @deprecated Use loadProfileListMeta */
export async function loadProfileLastVisits(
  data: DataProvider,
  profiles: Profile[]
): Promise<Map<string, string | null>> {
  const { lastVisits } = await loadProfileListMeta(data, profiles);
  return lastVisits;
}
