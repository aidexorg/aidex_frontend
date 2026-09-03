import type { Session } from '@/types';
import type { SessionWrite } from '../types';
import type { WireSession, WireSessionWrite } from './wire';

export function wireToSession(w: WireSession): Session {
  return {
    id: w.id,
    period_id: w.period_id,
    session_number: w.session_number,
    session_date: w.session_date,
    notes: w.notes ?? null,
    created_at: w.created_at,
    updated_at: w.updated_at,
  };
}

export function sessionWriteToWire(d: SessionWrite): WireSessionWrite {
  return {
    period_id: d.period_id,
    session_number: d.session_number,
    session_date: d.session_date,
    notes: d.notes ?? null,
  };
}

export function partialSessionWriteToWire(d: Partial<SessionWrite>): Partial<WireSessionWrite> {
  const out: Partial<WireSessionWrite> = {};
  if (d.period_id !== undefined) out.period_id = d.period_id;
  if (d.session_number !== undefined) out.session_number = d.session_number;
  if (d.session_date !== undefined) out.session_date = d.session_date;
  if (d.notes !== undefined) out.notes = d.notes;
  return out;
}
