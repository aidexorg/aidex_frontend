import type { Profile } from '@/types';
import type { ProfileWrite } from '../types';
import type { WireProfile, WireProfileWrite } from './wire';

export function wireToProfile(w: WireProfile): Profile {
  return {
    id: w.id,
    first_name: w.first_name,
    last_name: w.last_name,
    birth_year: w.birth_year,
    phone: w.phone,
    address: w.address,
    clinical_notes: w.clinical_notes,
    file_number: w.file_number,
    national_id: w.national_id,
    file_description: w.file_description,
    avatar_url: w.avatar_url ?? null,
    created_at: w.created_at,
    updated_at: w.updated_at,
  };
}

export function profileWriteToWire(d: ProfileWrite): WireProfileWrite {
  return {
    first_name: d.first_name,
    last_name: d.last_name,
    birth_year: d.birth_year,
    phone: d.phone,
    address: d.address,
    clinical_notes: d.clinical_notes,
    file_number: d.file_number,
    national_id: d.national_id,
    file_description: d.file_description,
    avatar_url: d.avatar_url ?? null,
  };
}

export function partialProfileWriteToWire(d: Partial<ProfileWrite>): Partial<WireProfileWrite> {
  const out: Partial<WireProfileWrite> = {};
  if (d.first_name !== undefined) out.first_name = d.first_name;
  if (d.last_name !== undefined) out.last_name = d.last_name;
  if (d.birth_year !== undefined) out.birth_year = d.birth_year;
  if (d.phone !== undefined) out.phone = d.phone;
  if (d.address !== undefined) out.address = d.address;
  if (d.clinical_notes !== undefined) out.clinical_notes = d.clinical_notes;
  if (d.file_number !== undefined) out.file_number = d.file_number;
  if (d.national_id !== undefined) out.national_id = d.national_id;
  if (d.file_description !== undefined) out.file_description = d.file_description;
  if (d.avatar_url !== undefined) out.avatar_url = d.avatar_url;
  return out;
}
