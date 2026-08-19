import type {
  Account,
  Action,
  Appointment,
  AppointmentStatus,
  Part,
  Payment,
  Period,
  Profile,
  Session,
} from '@/types';

/** Thrown by any DataProvider implementation. `code: '23505'` = unique violation (file_number / account email). */
export class DataError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'DataError';
    this.code = code;
  }
}

export type ProfileWrite = Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
export type PeriodWrite = Omit<Period, 'id' | 'created_at' | 'updated_at'>;
export type SessionWrite = Omit<Session, 'id' | 'created_at' | 'updated_at'>;
export type PartWrite = Omit<Part, 'id' | 'created_at' | 'updated_at'>;
export type ActionWrite = Omit<Action, 'id' | 'created_at' | 'updated_at'>;
export type PaymentWrite = Omit<Payment, 'id' | 'created_at' | 'updated_at'>;
export type AppointmentWrite = Omit<Appointment, 'id' | 'created_at' | 'updated_at'>;
export type AccountRegister = {
  email: string;
  password: string;
  display_name?: string | null;
};
export type AccountLogin = {
  email: string;
  password: string;
};

/**
 * App-wide persistence contract.
 * Demo: LocalStorageDataProvider.
 * Later: swap factory in `src/data/index.ts` for an HTTP/backend implementation.
 */
export interface DataProvider {
  readonly driver: 'local' | 'remote';

  listProfiles(): Promise<Profile[]>;
  createProfile(data: ProfileWrite): Promise<Profile>;
  updateProfile(id: string, data: Partial<ProfileWrite>): Promise<Profile>;

  listPeriods(profileId?: string): Promise<Period[]>;
  createPeriod(data: PeriodWrite): Promise<Period>;
  updatePeriod(id: string, data: Partial<Pick<PeriodWrite, 'teeth' | 'areas'>>): Promise<Period>;

  listSessions(periodIds?: string[]): Promise<Session[]>;
  createSession(data: SessionWrite): Promise<Session>;

  listParts(sessionIds?: string[]): Promise<Part[]>;
  createPart(data: PartWrite): Promise<Part>;

  listActions(partIds?: string[]): Promise<Action[]>;
  createAction(data: ActionWrite): Promise<Action>;
  updateAction(id: string, data: Partial<ActionWrite>): Promise<Action>;

  listPayments(periodIds?: string[]): Promise<Payment[]>;
  createPayment(data: PaymentWrite): Promise<Payment>;
  updatePayment(id: string, data: Partial<PaymentWrite>): Promise<Payment>;

  listAppointments(filters?: { profileId?: string; date?: string; status?: AppointmentStatus }): Promise<Appointment[]>;
  createAppointment(data: AppointmentWrite): Promise<Appointment>;
  updateAppointment(id: string, data: Partial<AppointmentWrite>): Promise<Appointment>;
  deleteAppointment(id: string): Promise<void>;

  deletePeriod(id: string): Promise<void>;
  deleteSession(id: string): Promise<void>;
  deletePart(id: string): Promise<void>;
  deleteAction(id: string): Promise<void>;
  deletePayment(id: string): Promise<void>;

  registerAccount(data: AccountRegister): Promise<Account>;
  loginAccount(data: AccountLogin): Promise<Account>;
  getCurrentAccount(): Promise<Account | null>;
  logoutAccount(): Promise<void>;
}
