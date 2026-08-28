import type { Action, Part, Payment, Period, Session } from '@/types';

export type TreatmentTimelineItem =
  | {
      kind: 'session';
      id: string;
      date: string;
      period: Period;
      periodNumber: number;
      session: Session;
    }
  | {
      kind: 'action';
      id: string;
      date: string;
      period: Period;
      periodNumber: number;
      session: Session;
      part: Part;
      action: Action;
    }
  | {
      kind: 'payment';
      id: string;
      date: string;
      period: Period;
      periodNumber: number;
      payment: Payment;
    };

interface TreatmentTimelineInput {
  periods: Period[];
  sessions: Session[];
  parts: Part[];
  actions: Action[];
  payments: Payment[];
}

const KIND_ORDER: Record<TreatmentTimelineItem['kind'], number> = {
  session: 0,
  action: 1,
  payment: 2,
};

function effectiveDate(primary: string | null | undefined, fallback: string): string {
  return primary?.trim() || fallback;
}

function calendarDay(value: string): string {
  return value.slice(0, 10);
}

function compareTimelineItems(a: TreatmentTimelineItem, b: TreatmentTimelineItem): number {
  const dayComparison = calendarDay(a.date).localeCompare(calendarDay(b.date));
  if (dayComparison !== 0) return dayComparison;

  const kindComparison = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
  if (kindComparison !== 0) return kindComparison;

  if (a.kind === 'session' && b.kind === 'session') {
    return a.session.session_number - b.session.session_number || a.id.localeCompare(b.id);
  }

  if (a.kind === 'action' && b.kind === 'action') {
    return (
      a.part.treatment_order - b.part.treatment_order ||
      a.part.part_number - b.part.part_number ||
      a.action.created_at.localeCompare(b.action.created_at) ||
      a.id.localeCompare(b.id)
    );
  }

  if (a.kind === 'payment' && b.kind === 'payment') {
    return (
      a.payment.created_at.localeCompare(b.payment.created_at) ||
      a.id.localeCompare(b.id)
    );
  }

  return a.id.localeCompare(b.id);
}

/**
 * Builds a read-only chronology from existing treatment entities.
 * Orphaned records are intentionally omitted because their hierarchy context
 * cannot be represented safely.
 */
export function buildTreatmentTimeline({
  periods,
  sessions,
  parts,
  actions,
  payments,
}: TreatmentTimelineInput): TreatmentTimelineItem[] {
  const periodContext = new Map(
    periods.map((period, index) => [
      period.id,
      { period, periodNumber: index + 1 },
    ])
  );
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const partById = new Map(parts.map((part) => [part.id, part]));
  const items: TreatmentTimelineItem[] = [];

  for (const session of sessions) {
    const context = periodContext.get(session.period_id);
    if (!context) continue;
    items.push({
      kind: 'session',
      id: `session-${session.id}`,
      date: effectiveDate(session.session_date, session.created_at),
      session,
      ...context,
    });
  }

  for (const action of actions) {
    const part = partById.get(action.part_id);
    const session = part ? sessionById.get(part.session_id) : undefined;
    const context = session ? periodContext.get(session.period_id) : undefined;
    if (!part || !session || !context) continue;
    items.push({
      kind: 'action',
      id: `action-${action.id}`,
      date: effectiveDate(session.session_date, action.created_at),
      action,
      part,
      session,
      ...context,
    });
  }

  for (const payment of payments) {
    const context = periodContext.get(payment.period_id);
    if (!context) continue;
    items.push({
      kind: 'payment',
      id: `payment-${payment.id}`,
      date: effectiveDate(payment.payment_date, payment.created_at),
      payment,
      ...context,
    });
  }

  return items.sort(compareTimelineItems);
}

export function timelineCalendarDay(item: TreatmentTimelineItem): string {
  return calendarDay(item.date);
}
