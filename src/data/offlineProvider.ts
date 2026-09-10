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
import {
  DataError,
  type AccountLogin,
  type AccountRegister,
  type ActionWrite,
  type AppointmentWrite,
  type DataProvider,
  type PartWrite,
  type PaymentWrite,
  type PeriodWrite,
  type ProfileWrite,
  type SessionWrite,
} from './types';

// ── localStorage helpers ──

const PREFIX = 'aidex:offline:';

function loadCollection<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function saveCollection<T>(key: string, items: T[]): void {
  localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(items));
}

function loadItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveItem<T>(key: string, item: T): void {
  localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(item));
}

function removeItem(key: string): void {
  localStorage.removeItem(`${PREFIX}${key}`);
}

// ── ID generation ──

let idCounter = 0;

function generateId(): string {
  idCounter++;
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}-${idCounter}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

// ── OfflineProvider ──

/**
 * Full offline DataProvider — every CRUD operation reads/writes localStorage.
 * Auth is emulated with a single "offline doctor" account.
 */
export class OfflineProvider implements DataProvider {
  readonly driver = 'remote' as const; // keep 'remote' so callers don't branch

  constructor() {
    // Seed a default offline account if none exists
    const account = loadItem<Account>('account');
    if (!account) {
      const defaultAccount: Account = {
        id: 'offline-account',
        email: 'doctor@aidex.local',
        display_name: 'دکتر (آفلاین)',
        created_at: nowISO(),
      };
      saveItem('account', defaultAccount);
    }
  }

  // ── Profiles ──

  listProfiles(): Promise<Profile[]> {
    return Promise.resolve(loadCollection<Profile>('profiles'));
  }

  async createProfile(data: ProfileWrite): Promise<Profile> {
    const profiles = loadCollection<Profile>('profiles');
    if (profiles.some((p) => p.file_number && p.file_number === data.file_number)) {
      throw new DataError('شماره پرونده تکراری است.', '23505');
    }
    const now = nowISO();
    const profile: Profile = {
      ...data,
      id: generateId(),
      created_at: now,
      updated_at: now,
    };
    profiles.push(profile);
    saveCollection('profiles', profiles);
    return profile;
  }

  async updateProfile(id: string, data: Partial<ProfileWrite>): Promise<Profile> {
    const profiles = loadCollection<Profile>('profiles');
    const idx = profiles.findIndex((p) => p.id === id);
    if (idx === -1) throw new DataError('پرونده یافت نشد.');
    profiles[idx] = { ...profiles[idx], ...data, updated_at: nowISO() };
    saveCollection('profiles', profiles);
    return profiles[idx];
  }

  // ── Periods ──

  listPeriods(profileId?: string): Promise<Period[]> {
    const periods = loadCollection<Period>('periods');
    return Promise.resolve(profileId ? periods.filter((p) => p.profile_id === profileId) : periods);
  }

  async createPeriod(data: PeriodWrite): Promise<Period> {
    const periods = loadCollection<Period>('periods');
    const now = nowISO();
    const period: Period = { ...data, id: generateId(), created_at: now, updated_at: now };
    periods.push(period);
    saveCollection('periods', periods);
    return period;
  }

  async updatePeriod(id: string, data: Partial<Pick<PeriodWrite, 'teeth' | 'areas'>>): Promise<Period> {
    const periods = loadCollection<Period>('periods');
    const idx = periods.findIndex((p) => p.id === id);
    if (idx === -1) throw new DataError('دوره یافت نشد.');
    periods[idx] = { ...periods[idx], ...data, updated_at: nowISO() };
    saveCollection('periods', periods);
    return periods[idx];
  }

  async deletePeriod(id: string): Promise<void> {
    const periods = loadCollection<Period>('periods');
    saveCollection('periods', periods.filter((p) => p.id !== id));
    // Cascade: remove sessions → parts → actions, payments
    const sessions = loadCollection<Session>('sessions').filter((s) => s.period_id !== id);
    const sessionIds = new Set(sessions.map((s) => s.id));
    saveCollection('sessions', sessions);
    const parts = loadCollection<Part>('parts').filter((p) => sessionIds.has(p.session_id));
    const partIds = new Set(parts.map((p) => p.id));
    saveCollection('parts', parts);
    saveCollection('actions', loadCollection<Action>('actions').filter((a) => partIds.has(a.part_id)));
    saveCollection('payments', loadCollection<Payment>('payments').filter((p) => p.period_id !== id));
  }

  // ── Sessions ──

  listSessions(periodIds?: string[]): Promise<Session[]> {
    const sessions = loadCollection<Session>('sessions');
    if (!periodIds || periodIds.length === 0) return Promise.resolve(sessions);
    const set = new Set(periodIds);
    return Promise.resolve(sessions.filter((s) => set.has(s.period_id)));
  }

  async createSession(data: SessionWrite): Promise<Session> {
    const sessions = loadCollection<Session>('sessions');
    const now = nowISO();
    const session: Session = { ...data, id: generateId(), created_at: now, updated_at: now };
    sessions.push(session);
    saveCollection('sessions', sessions);
    return session;
  }

  async updateSession(id: string, data: Partial<SessionWrite>): Promise<Session> {
    const sessions = loadCollection<Session>('sessions');
    const idx = sessions.findIndex((s) => s.id === id);
    if (idx === -1) throw new DataError('جلسه یافت نشد.');
    sessions[idx] = { ...sessions[idx], ...data, updated_at: nowISO() };
    saveCollection('sessions', sessions);
    return sessions[idx];
  }

  async deleteSession(id: string): Promise<void> {
    const sessions = loadCollection<Session>('sessions').filter((s) => s.id !== id);
    saveCollection('sessions', sessions);
    const parts = loadCollection<Part>('parts').filter((p) => p.session_id !== id);
    const partIds = new Set(parts.map((p) => p.id));
    saveCollection('parts', parts);
    saveCollection('actions', loadCollection<Action>('actions').filter((a) => partIds.has(a.part_id)));
  }

  // ── Parts ──

  listParts(sessionIds?: string[]): Promise<Part[]> {
    const parts = loadCollection<Part>('parts');
    if (!sessionIds || sessionIds.length === 0) return Promise.resolve(parts);
    const set = new Set(sessionIds);
    return Promise.resolve(parts.filter((p) => set.has(p.session_id)));
  }

  async createPart(data: PartWrite): Promise<Part> {
    const parts = loadCollection<Part>('parts');
    const now = nowISO();
    const part: Part = { ...data, id: generateId(), created_at: now, updated_at: now };
    parts.push(part);
    saveCollection('parts', parts);
    return part;
  }

  async updatePart(id: string, data: Partial<PartWrite>): Promise<Part> {
    const parts = loadCollection<Part>('parts');
    const idx = parts.findIndex((p) => p.id === id);
    if (idx === -1) throw new DataError('بخش یافت نشد.');
    parts[idx] = { ...parts[idx], ...data, updated_at: nowISO() };
    saveCollection('parts', parts);
    return parts[idx];
  }

  async deletePart(id: string): Promise<void> {
    saveCollection('parts', loadCollection<Part>('parts').filter((p) => p.id !== id));
    saveCollection('actions', loadCollection<Action>('actions').filter((a) => a.part_id !== id));
  }

  // ── Actions ──

  listActions(partIds?: string[]): Promise<Action[]> {
    const actions = loadCollection<Action>('actions');
    if (!partIds || partIds.length === 0) return Promise.resolve(actions);
    const set = new Set(partIds);
    return Promise.resolve(actions.filter((a) => set.has(a.part_id)));
  }

  async createAction(data: ActionWrite): Promise<Action> {
    const actions = loadCollection<Action>('actions');
    const now = nowISO();
    const action: Action = { ...data, id: generateId(), created_at: now, updated_at: now };
    actions.push(action);
    saveCollection('actions', actions);
    return action;
  }

  async updateAction(id: string, data: Partial<ActionWrite>): Promise<Action> {
    const actions = loadCollection<Action>('actions');
    const idx = actions.findIndex((a) => a.id === id);
    if (idx === -1) throw new DataError('اقدام یافت نشد.');
    actions[idx] = { ...actions[idx], ...data, updated_at: nowISO() };
    saveCollection('actions', actions);
    return actions[idx];
  }

  async deleteAction(id: string): Promise<void> {
    saveCollection('actions', loadCollection<Action>('actions').filter((a) => a.id !== id));
  }

  // ── Payments ──

  listPayments(periodIds?: string[]): Promise<Payment[]> {
    const payments = loadCollection<Payment>('payments');
    if (!periodIds || periodIds.length === 0) return Promise.resolve(payments);
    const set = new Set(periodIds);
    return Promise.resolve(payments.filter((p) => set.has(p.period_id)));
  }

  async createPayment(data: PaymentWrite): Promise<Payment> {
    const payments = loadCollection<Payment>('payments');
    const now = nowISO();
    const payment: Payment = { ...data, id: generateId(), created_at: now, updated_at: now };
    payments.push(payment);
    saveCollection('payments', payments);
    return payment;
  }

  async updatePayment(id: string, data: Partial<PaymentWrite>): Promise<Payment> {
    const payments = loadCollection<Payment>('payments');
    const idx = payments.findIndex((p) => p.id === id);
    if (idx === -1) throw new DataError('پرداخت یافت نشد.');
    payments[idx] = { ...payments[idx], ...data, updated_at: nowISO() };
    saveCollection('payments', payments);
    return payments[idx];
  }

  async deletePayment(id: string): Promise<void> {
    saveCollection('payments', loadCollection<Payment>('payments').filter((p) => p.id !== id));
  }

  // ── Appointments ──

  async listAppointments(filters?: {
    profileId?: string;
    date?: string;
    status?: AppointmentStatus;
  }): Promise<Appointment[]> {
    let appts = loadCollection<Appointment>('appointments');
    if (filters?.profileId) appts = appts.filter((a) => a.profile_id === filters.profileId);
    if (filters?.date) appts = appts.filter((a) => a.start_time.slice(0, 10) === filters.date);
    if (filters?.status) appts = appts.filter((a) => a.status === filters.status);
    return appts;
  }

  async createAppointment(data: AppointmentWrite): Promise<Appointment> {
    const appts = loadCollection<Appointment>('appointments');
    const now = nowISO();
    const appt: Appointment = { ...data, id: generateId(), created_at: now, updated_at: now };
    appts.push(appt);
    saveCollection('appointments', appts);
    return appt;
  }

  async updateAppointment(id: string, data: Partial<AppointmentWrite>): Promise<Appointment> {
    const appts = loadCollection<Appointment>('appointments');
    const idx = appts.findIndex((a) => a.id === id);
    if (idx === -1) throw new DataError('نوبت یافت نشد.');
    appts[idx] = { ...appts[idx], ...data, updated_at: nowISO() };
    saveCollection('appointments', appts);
    return appts[idx];
  }

  async deleteAppointment(id: string): Promise<void> {
    saveCollection('appointments', loadCollection<Appointment>('appointments').filter((a) => a.id !== id));
  }

  // ── Auth (emulated) ──

  async registerAccount(data: AccountRegister): Promise<Account> {
    const existing = loadItem<Account>('account');
    if (existing && existing.email === data.email) {
      throw new DataError('این ایمیل قبلاً ثبت شده.', '23505');
    }
    const account: Account = {
      id: generateId(),
      email: data.email,
      display_name: data.display_name ?? null,
      created_at: nowISO(),
    };
    saveItem('account', account);
    return account;
  }

  async loginAccount(data: AccountLogin): Promise<Account> {
    const existing = loadItem<Account>('account');
    if (existing && existing.email === data.email) {
      return existing;
    }
    // Auto-create account on first login in offline mode
    const account: Account = {
      id: 'offline-account',
      email: data.email,
      display_name: data.email.split('@')[0],
      created_at: nowISO(),
    };
    saveItem('account', account);
    return account;
  }

  async getCurrentAccount(): Promise<Account | null> {
    return loadItem<Account>('account');
  }

  async logoutAccount(): Promise<void> {
    // Don't remove the account — just clear the session marker
    removeItem('account');
  }
}

// ── Storage helpers for export ──

export interface OfflineStorageSnapshot {
  profiles: Profile[];
  periods: Period[];
  sessions: Session[];
  parts: Part[];
  actions: Action[];
  payments: Payment[];
  appointments: Appointment[];
  account: Account | null;
}

export function getOfflineSnapshot(): OfflineStorageSnapshot {
  return {
    profiles: loadCollection<Profile>('profiles'),
    periods: loadCollection<Period>('periods'),
    sessions: loadCollection<Session>('sessions'),
    parts: loadCollection<Part>('parts'),
    actions: loadCollection<Action>('actions'),
    payments: loadCollection<Payment>('payments'),
    appointments: loadCollection<Appointment>('appointments'),
    account: loadItem<Account>('account'),
  };
}

export function getOfflineStorageSize(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) {
      total += (localStorage.getItem(key) ?? '').length;
    }
  }
  return total;
}
