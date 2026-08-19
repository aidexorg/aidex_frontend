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
  /** ◆ واریزی مستقیم به حساب دندانپزشک (text.txt §1_1) */
  direct_to_dentist: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type AppointmentType = 'consultation' | 'treatment' | 'followup' | 'emergency' | 'hygiene';

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'arrived' | 'in_progress' | 'completed' | 'no_show' | 'cancelled';

export interface Appointment {
  id: string;
  profile_id: string;
  dentist_id: string | null;
  chair_id: string | null;
  start_time: string; // ISO datetime
  duration_minutes: number;
  type: AppointmentType;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const APPOINTMENT_TYPES: { value: AppointmentType; label: string; defaultDuration: number; color: string }[] = [
  { value: 'consultation', label: 'مشاوره', defaultDuration: 20, color: 'sky' },
  { value: 'treatment', label: 'درمان', defaultDuration: 45, color: 'teal' },
  { value: 'followup', label: 'پیگیری', defaultDuration: 15, color: 'amber' },
  { value: 'emergency', label: 'اورژانس', defaultDuration: 30, color: 'red' },
  { value: 'hygiene', label: 'بهداشت', defaultDuration: 30, color: 'emerald' },
];

export const APPOINTMENT_STATUSES: { value: AppointmentStatus; label: string }[] = [
  { value: 'scheduled', label: 'برنامه‌ریزی شده' },
  { value: 'confirmed', label: 'تأیید شده' },
  { value: 'arrived', label: 'حاضر شده' },
  { value: 'in_progress', label: 'در حال درمان' },
  { value: 'completed', label: 'تکمیل شده' },
  { value: 'no_show', label: 'عدم حضور' },
  { value: 'cancelled', label: 'لغو شده' },
];

export interface StatusTransition {
  status: AppointmentStatus;
  label: string;
  color: string;
}

const STATUS_TRANSITIONS: Record<AppointmentStatus, StatusTransition[]> = {
  scheduled: [
    { status: 'confirmed', label: 'تأیید', color: 'bg-sky-600 text-white hover:bg-sky-700' },
    { status: 'cancelled', label: 'لغو', color: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' },
  ],
  confirmed: [
    { status: 'arrived', label: 'حاضر شدن', color: 'bg-amber-600 text-white hover:bg-amber-700' },
    { status: 'cancelled', label: 'لغو', color: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' },
  ],
  arrived: [
    { status: 'in_progress', label: 'شروع درمان', color: 'bg-teal-600 text-white hover:bg-teal-700' },
    { status: 'no_show', label: 'عدم حضور', color: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' },
  ],
  in_progress: [
    { status: 'completed', label: 'تکمیل', color: 'bg-emerald-600 text-white hover:bg-emerald-700' },
    { status: 'cancelled', label: 'لغو', color: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' },
  ],
  completed: [],
  no_show: [],
  cancelled: [],
};

export function getNextStatuses(current: AppointmentStatus): StatusTransition[] {
  return STATUS_TRANSITIONS[current] ?? [];
}

export function getStatusLabel(s: AppointmentStatus): string {
  return APPOINTMENT_STATUSES.find((st) => st.value === s)?.label ?? s;
}

/** Operator login account — distinct from patient `Profile` (CLM-005). Password is write-only. */
export interface Account {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
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

/** X / class n ∈ [1..6] for parameterized action titles (entities/action.md). */
export const ACTION_PARAM_VALUES = ['1', '2', '3', '4', '5', '6'] as const;

export type ActionFamilyKind = 'endo' | 'reEndo' | 'aml' | 'com' | 'fixed';

export interface ActionFamily {
  id: string;
  kind: ActionFamilyKind;
  label: string;
  /** Used when kind === 'fixed' */
  title?: string;
}

export const ACTION_FAMILIES: ActionFamily[] = [
  { id: 'endo', kind: 'endo', label: 'عصب‌کشی (Endo)' },
  { id: 'reEndo', kind: 'reEndo', label: 'عصب‌کشی مجدد (reEndo)' },
  { id: 'aml', kind: 'aml', label: 'ترمیم آمالگام' },
  { id: 'com', kind: 'com', label: 'ترمیم کامپوزیت' },
  { id: 'Crown PFZ', kind: 'fixed', label: 'روکش فلزی', title: 'Crown PFZ' },
  { id: 'Crown PFM', kind: 'fixed', label: 'روکش سرامیکی', title: 'Crown PFM' },
  { id: 'Manual SRP', kind: 'fixed', label: 'جرم‌گیری دستی', title: 'Manual SRP' },
  { id: 'Ultrsonic SRP', kind: 'fixed', label: 'جرم‌گیری اولتراسونیک', title: 'Ultrsonic SRP' },
  { id: 'Prophylaxis Polish', kind: 'fixed', label: 'بروساژ', title: 'Prophylaxis Polish' },
  { id: 'Fluoride therapy', kind: 'fixed', label: 'فلورایدتراپی', title: 'Fluoride therapy' },
  { id: 'CL.SoftTissue', kind: 'fixed', label: 'افزایش طول تاج — بافت نرم', title: 'CL.SoftTissue' },
  { id: 'CL.hardTissue', kind: 'fixed', label: 'افزایش طول تاج — بافت سخت', title: 'CL.hardTissue' },
  {
    id: 'EXT.SurgicalSoftTissue',
    kind: 'fixed',
    label: 'خارج کردن جراحی — بافت نرم',
    title: 'EXT.SurgicalSoftTissue',
  },
  {
    id: 'EXT.SurgicalHardTissue',
    kind: 'fixed',
    label: 'خارج کردن جراحی — بافت سخت',
    title: 'EXT.SurgicalHardTissue',
  },
  { id: 'EXT.NonSurgical', kind: 'fixed', label: 'خارج کردن بدون جراحی', title: 'EXT.NonSurgical' },
  { id: 'PostCore (crco)', kind: 'fixed', label: 'پست و کور کروم‌کبالت', title: 'PostCore (crco)' },
  { id: 'PostCore (npg)', kind: 'fixed', label: 'پست و کور NPG', title: 'PostCore (npg)' },
];

const FIXED_TITLES = new Set(
  ACTION_FAMILIES.filter((f) => f.kind === 'fixed' && f.title).map((f) => f.title as string),
);

export function buildActionTitle(familyId: string, param: string): string | null {
  const family = ACTION_FAMILIES.find((f) => f.id === familyId);
  if (!family) return null;
  if (family.kind === 'fixed') return family.title ?? null;
  if (!ACTION_PARAM_VALUES.includes(param as (typeof ACTION_PARAM_VALUES)[number])) return null;
  if (family.kind === 'endo') return `Endo.${param}-Canal`;
  if (family.kind === 'reEndo') return `reEndo.${param}-Canal`;
  if (family.kind === 'aml') return `Aml.Filling for Class ${param}`;
  if (family.kind === 'com') return `Com.Filling for Class ${param}`;
  return null;
}

export function parseActionTitle(title: string): { familyId: string; param: string } | null {
  const endo = title.match(/^Endo\.([1-6])-Canal$/);
  if (endo) return { familyId: 'endo', param: endo[1] };
  const reEndo = title.match(/^reEndo\.([1-6])-Canal$/);
  if (reEndo) return { familyId: 'reEndo', param: reEndo[1] };
  const aml = title.match(/^Aml\.Filling for Class ([1-6])$/);
  if (aml) return { familyId: 'aml', param: aml[1] };
  const com = title.match(/^Com\.Filling for Class ([1-6])$/);
  if (com) return { familyId: 'com', param: com[1] };
  if (FIXED_TITLES.has(title)) return { familyId: title, param: '1' };
  return null;
}

export function isValidActionTitle(title: string): boolean {
  return parseActionTitle(title) !== null;
}

export const INCOMPLETE_REASONS = [
  { value: 'contact_patient', label: 'تماس با بیمار' },
  { value: 'future_followup', label: 'نیاز به پیگیری آینده' },
  { value: 'awaiting_lab', label: 'در انتظار لابراتوار' },
  { value: 'patient_noncooperation', label: 'عدم همکاری بیمار' },
  { value: 'patient_inaction', label: 'عدم اقدام بیمار' },
] as const;

export type IncompleteReasonValue = (typeof INCOMPLETE_REASONS)[number]['value'];

export function isValidIncompleteReason(value: string): boolean {
  return INCOMPLETE_REASONS.some((r) => r.value === value);
}
