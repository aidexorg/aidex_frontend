/**
 * REST wire shapes — field names from aidex_docs/api-contract.md.
 * Domain types live in src/types.ts; map at the HttpDataProvider boundary.
 */

export type WireAccount = {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
};

export type WireAccountRegister = {
  email: string;
  password: string;
  display_name?: string | null;
};

export type WireAccountLogin = {
  email: string;
  password: string;
};

export type WireProfile = {
  id: string;
  first_name: string;
  last_name: string;
  birth_year: string | null;
  phone: string | null;
  address: string | null;
  clinical_notes: string | null;
  file_number: string | null;
  national_id: string | null;
  file_description: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type WireProfileWrite = {
  first_name: string;
  last_name: string;
  birth_year: string | null;
  phone: string | null;
  address: string | null;
  clinical_notes: string | null;
  file_number: string | null;
  national_id: string | null;
  file_description: string | null;
  avatar_url: string | null;
};

export type WirePeriod = {
  id: string;
  profile_id: string;
  teeth: string[];
  areas: string[];
  created_at: string;
  updated_at: string;
};

export type WirePeriodWrite = {
  profile_id: string;
  teeth: string[];
  areas: string[];
};

export type WirePeriodPatch = {
  teeth?: string[];
  areas?: string[];
};

export type WireSession = {
  id: string;
  period_id: string;
  session_number: number;
  session_date: string;
  notes: string | null;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string;
};

export type WireSessionWrite = {
  period_id: string;
  session_number: number;
  session_date: string;
  notes?: string | null;
  duration_minutes?: number | null;
};

export type WirePart = {
  id: string;
  session_id: string;
  part_number: number;
  treatment_order: number;
  tooth: string | null;
  area: string | null;
  created_at: string;
  updated_at: string;
};

export type WirePartWrite = {
  session_id: string;
  part_number: number;
  treatment_order: number;
  tooth: string | null;
  area: string | null;
};

/** api-contract: complete | incomplete; domain may also send planned (FE). */
export type WireActionStatus = 'complete' | 'incomplete' | 'planned';

export type WireAction = {
  id: string;
  part_id: string;
  title: string;
  price: number;
  discount: number;
  description: string | null;
  status: WireActionStatus;
  incomplete_reason: string | null;
  needs_followup: boolean;
  created_at: string;
  updated_at: string;
};

export type WireActionWrite = {
  part_id: string;
  title: string;
  price: number;
  discount: number;
  description: string | null;
  status: WireActionStatus;
  incomplete_reason: string | null;
  needs_followup: boolean;
};

export type WirePayment = {
  id: string;
  period_id: string;
  payment_date: string;
  tracking_code: string | null;
  amount: number;
  direct_to_dentist: boolean;
  description: string | null;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
};

export type WirePaymentWrite = {
  period_id: string;
  payment_date: string;
  tracking_code: string | null;
  amount: number;
  direct_to_dentist: boolean;
  description: string | null;
  payment_method?: string | null;
};

export type WireAppointmentType =
  | 'consultation'
  | 'treatment'
  | 'followup'
  | 'emergency'
  | 'hygiene';

export type WireAppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'no_show'
  | 'cancelled';

export type WireRecurrencePattern = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

export type WireAppointment = {
  id: string;
  profile_id: string;
  dentist_id: string | null;
  chair_id: string | null;
  start_time: string;
  duration_minutes: number;
  type: WireAppointmentType;
  status: WireAppointmentStatus;
  notes: string | null;
  series_id: string | null;
  recurrence_pattern: WireRecurrencePattern;
  series_index: number;
  created_at: string;
  updated_at: string;
};

export type WireAppointmentWrite = {
  profile_id: string;
  dentist_id: string | null;
  chair_id: string | null;
  start_time: string;
  duration_minutes: number;
  type: WireAppointmentType;
  status: WireAppointmentStatus;
  notes: string | null;
  series_id: string | null;
  recurrence_pattern: WireRecurrencePattern;
  series_index: number;
};
