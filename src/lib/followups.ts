import type { DataProvider } from '@/data/types';
import type { Action, Part, Period, Profile, Session } from '@/types';

export interface FollowupItem {
  action: Action;
  part: Part;
  session: Session;
  period: Period;
  profile: Profile;
}

/** Same join + filter rule as FollowupsView «همه» tab (BR-POL-02). */
export async function loadFollowupItems(data: DataProvider): Promise<FollowupItem[]> {
  const [actions, parts, sessions, periods, profiles] = await Promise.all([
    data.listActions(),
    data.listParts(),
    data.listSessions(),
    data.listPeriods(),
    data.listProfiles(),
  ]);

  const partMap = new Map(parts.map((p) => [p.id, p]));
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));
  const periodMap = new Map(periods.map((p) => [p.id, p]));
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const joined: FollowupItem[] = [];
  for (const action of actions) {
    const part = partMap.get(action.part_id);
    if (!part) continue;
    const session = sessionMap.get(part.session_id);
    if (!session) continue;
    const period = periodMap.get(session.period_id);
    if (!period) continue;
    const profile = profileMap.get(period.profile_id);
    if (!profile) continue;
    if (action.status === 'incomplete' || action.needs_followup) {
      joined.push({ action, part, session, period, profile });
    }
  }

  joined.sort(
    (a, b) =>
      new Date(a.session.session_date).getTime() - new Date(b.session.session_date).getTime()
  );
  return joined;
}
