import type { Action, Part, Period, Session } from '@/types';

export interface ToothHistoryEntry {
  action: Action;
  part: Part;
  session: Session;
  period: Period;
  periodNumber: number;
}

interface ToothHistoryInput {
  tooth: string;
  periods: Period[];
  sessions: Session[];
  parts: Part[];
  actions: Action[];
}

function periodNumberMap(periods: Period[]): Map<string, number> {
  return new Map(periods.map((period, index) => [period.id, index + 1]));
}

function compareEntries(a: ToothHistoryEntry, b: ToothHistoryEntry): number {
  const dateComparison = a.session.session_date.localeCompare(b.session.session_date);
  if (dateComparison !== 0) return dateComparison;

  const sessionComparison = a.session.session_number - b.session.session_number;
  if (sessionComparison !== 0) return sessionComparison;

  return (
    a.part.treatment_order - b.part.treatment_order ||
    a.part.part_number - b.part.part_number ||
    a.action.created_at.localeCompare(b.action.created_at) ||
    a.action.id.localeCompare(b.action.id)
  );
}

export function buildToothHistory({
  tooth,
  periods,
  sessions,
  parts,
  actions,
}: ToothHistoryInput): ToothHistoryEntry[] {
  const periodOrder = periodNumberMap(periods);
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const periodById = new Map(periods.map((period) => [period.id, period]));
  const entries: ToothHistoryEntry[] = [];

  for (const action of actions) {
    const part = parts.find((candidate) => candidate.id === action.part_id);
    if (!part || part.tooth !== tooth) continue;

    const session = sessionById.get(part.session_id);
    if (!session) continue;

    const period = periodById.get(session.period_id);
    if (!period) continue;

    entries.push({
      action,
      part,
      session,
      period,
      periodNumber: periodOrder.get(period.id) ?? 0,
    });
  }

  return entries.sort(compareEntries);
}
