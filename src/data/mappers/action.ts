import type { Action } from '@/types';
import type { ActionWrite } from '../types';
import type { WireAction, WireActionWrite } from './wire';

export function wireToAction(w: WireAction): Action {
  return {
    id: w.id,
    part_id: w.part_id,
    title: w.title,
    price: w.price,
    discount: w.discount,
    description: w.description,
    status: w.status,
    incomplete_reason: w.incomplete_reason,
    needs_followup: w.needs_followup,
    created_at: w.created_at,
    updated_at: w.updated_at,
  };
}

export function actionWriteToWire(d: ActionWrite): WireActionWrite {
  return {
    part_id: d.part_id,
    title: d.title,
    price: d.price,
    discount: d.discount,
    description: d.description,
    status: d.status,
    incomplete_reason: d.incomplete_reason,
    needs_followup: d.needs_followup,
  };
}

export function partialActionWriteToWire(d: Partial<ActionWrite>): Partial<WireActionWrite> {
  const out: Partial<WireActionWrite> = {};
  if (d.part_id !== undefined) out.part_id = d.part_id;
  if (d.title !== undefined) out.title = d.title;
  if (d.price !== undefined) out.price = d.price;
  if (d.discount !== undefined) out.discount = d.discount;
  if (d.description !== undefined) out.description = d.description;
  if (d.status !== undefined) out.status = d.status;
  if (d.incomplete_reason !== undefined) out.incomplete_reason = d.incomplete_reason;
  if (d.needs_followup !== undefined) out.needs_followup = d.needs_followup;
  return out;
}
