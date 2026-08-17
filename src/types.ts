// Domain types for AIDEX — mirror the database schema.

export interface Profile {
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
  created_at: string;
  updated_at: string;
}

export interface Period {
  id: string;
  profile_id: string;
  teeth: string[];
  areas: string[];
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  period_id: string;
  session_number: number;
  session_date: string; // ISO date
  created_at: string;
  updated_at: string;
}

export interface Part {
  id: string;
  session_id: string;
  part_number: number;
  treatment_order: number;
  tooth: string | null;
  area: string | null;
  created_at: string;
  updated_at: string;
}

export type ActionStatus = 'complete' | 'incomplete';

export interface Action {
  id: string;
  part_id: string;
  title: string;
  price: number;
  discount: number;
  description: string | null;
  status: ActionStatus;
  incomplete_reason: string | null;
  needs_followup: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  period_id: string;
  payment_date: string; // ISO date
  tracking_code: string | null;
  amount: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  profile_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Tooth notation: quadrant + number, e.g. UR1, UL8, LR3, LL7
export const TOOTH_QUADRANTS = [
  { value: 'UR', label: 'فکی بالا - راست' },
  { value: 'UL', label: 'فکی بالا - چپ' },
  { value: 'LR', label: 'فکی پایین - راست' },
  { value: 'LL', label: 'فکی پایین - چپ' },
] as const;

export const TOOTH_NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

export const AREA_OPTIONS = [
  { value: 'LJ', label: 'فک پایین' },
  { value: 'UJ', label: 'فک بالا' },
  { value: 'Full Mouth', label: 'کل دهان' },
] as const;

export const ACTION_TITLES = [
  'معاینه و تشخیص',
  'جرم‌گیری',
  'پر کردن',
  'عصب‌کشی',
  'کشیدن دندان',
  'روکش',
  'ایمپلنت',
  'ارتودنسی',
  'بلیچینگ',
  'سایر',
] as const;

export const INCOMPLETE_REASONS = [
  'درد بیمار',
  'زمان ناکافی',
  'نیاز به مراجعه مجدد',
  'نقص تجهیزات',
  'سایر',
] as const;
