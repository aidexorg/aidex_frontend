import type { Period } from '@/types';
import type { PeriodWrite } from '../types';
import type { WirePeriod, WirePeriodPatch, WirePeriodWrite } from './wire';

export function wireToPeriod(w: WirePeriod): Period {
  return {
    id: w.id,
    profile_id: w.profile_id,
    teeth: w.teeth,
    areas: w.areas,
    created_at: w.created_at,
    updated_at: w.updated_at,
  };
}

export function periodWriteToWire(d: PeriodWrite): WirePeriodWrite {
  return {
    profile_id: d.profile_id,
    teeth: d.teeth,
    areas: d.areas,
  };
}

export function periodPatchToWire(
  d: Partial<Pick<PeriodWrite, 'teeth' | 'areas'>>,
): WirePeriodPatch {
  const out: WirePeriodPatch = {};
  if (d.teeth !== undefined) out.teeth = d.teeth;
  if (d.areas !== undefined) out.areas = d.areas;
  return out;
}
