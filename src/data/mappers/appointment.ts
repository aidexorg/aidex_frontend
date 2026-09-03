import type { Appointment } from '@/types';
import type { AppointmentWrite } from '../types';
import type { WireAppointment, WireAppointmentWrite } from './wire';

export function wireToAppointment(w: WireAppointment): Appointment {
  return {
    id: w.id,
    profile_id: w.profile_id,
    dentist_id: w.dentist_id,
    chair_id: w.chair_id,
    start_time: w.start_time,
    duration_minutes: w.duration_minutes,
    type: w.type,
    status: w.status,
    notes: w.notes,
    series_id: w.series_id,
    recurrence_pattern: w.recurrence_pattern,
    series_index: w.series_index,
    created_at: w.created_at,
    updated_at: w.updated_at,
  };
}

export function appointmentWriteToWire(d: AppointmentWrite): WireAppointmentWrite {
  return {
    profile_id: d.profile_id,
    dentist_id: d.dentist_id,
    chair_id: d.chair_id,
    start_time: d.start_time,
    duration_minutes: d.duration_minutes,
    type: d.type,
    status: d.status,
    notes: d.notes,
    series_id: d.series_id,
    recurrence_pattern: d.recurrence_pattern,
    series_index: d.series_index,
  };
}

export function partialAppointmentWriteToWire(
  d: Partial<AppointmentWrite>,
): Partial<WireAppointmentWrite> {
  const out: Partial<WireAppointmentWrite> = {};
  if (d.profile_id !== undefined) out.profile_id = d.profile_id;
  if (d.dentist_id !== undefined) out.dentist_id = d.dentist_id;
  if (d.chair_id !== undefined) out.chair_id = d.chair_id;
  if (d.start_time !== undefined) out.start_time = d.start_time;
  if (d.duration_minutes !== undefined) out.duration_minutes = d.duration_minutes;
  if (d.type !== undefined) out.type = d.type;
  if (d.status !== undefined) out.status = d.status;
  if (d.notes !== undefined) out.notes = d.notes;
  if (d.series_id !== undefined) out.series_id = d.series_id;
  if (d.recurrence_pattern !== undefined) out.recurrence_pattern = d.recurrence_pattern;
  if (d.series_index !== undefined) out.series_index = d.series_index;
  return out;
}
