import type { Part } from '@/types';
import type { PartWrite } from '../types';
import type { WirePart, WirePartWrite } from './wire';

export function wireToPart(w: WirePart): Part {
  return {
    id: w.id,
    session_id: w.session_id,
    part_number: w.part_number,
    treatment_order: w.treatment_order,
    tooth: w.tooth,
    area: w.area,
    created_at: w.created_at,
    updated_at: w.updated_at,
  };
}

export function partWriteToWire(d: PartWrite): WirePartWrite {
  return {
    session_id: d.session_id,
    part_number: d.part_number,
    treatment_order: d.treatment_order,
    tooth: d.tooth,
    area: d.area,
  };
}

export function partialPartWriteToWire(d: Partial<PartWrite>): Partial<WirePartWrite> {
  const out: Partial<WirePartWrite> = {};
  if (d.session_id !== undefined) out.session_id = d.session_id;
  if (d.part_number !== undefined) out.part_number = d.part_number;
  if (d.treatment_order !== undefined) out.treatment_order = d.treatment_order;
  if (d.tooth !== undefined) out.tooth = d.tooth;
  if (d.area !== undefined) out.area = d.area;
  return out;
}
