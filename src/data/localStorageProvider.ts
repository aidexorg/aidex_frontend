import type { Account, Action, Part, Payment, Period, Profile, Session } from '@/types';
import {
  DataError,
  type AccountLogin,
  type AccountRegister,
  type ActionWrite,
  type DataProvider,
  type PartWrite,
  type PaymentWrite,
  type PeriodWrite,
  type ProfileWrite,
  type SessionWrite,
} from './types';

const STORAGE_KEY = 'aidex.demo.v1';
/** Tab-scoped demo session. Do not restore from localStorage — leftover ids skipped login on every visit. */
const SESSION_KEY = 'aidex.demo.session';

/** Demo-only stored row; password must never leave the provider. */
interface StoredAccount {
  id: string;
  email: string;
  password: string;
  display_name: string | null;
  created_at: string;
}

interface Store {
  profiles: Profile[];
  periods: Period[];
  sessions: Session[];
  parts: Part[];
  actions: Action[];
  payments: Payment[];
  accounts: StoredAccount[];
  currentAccountId: string | null;
}

function emptyStore(): Store {
  return {
    profiles: [],
    periods: [],
    sessions: [],
    parts: [],
    actions: [],
    payments: [],
    accounts: [],
    currentAccountId: null,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

function readSessionId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeSessionId(id: string | null): void {
  try {
    if (id) sessionStorage.setItem(SESSION_KEY, id);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* private mode / blocked storage */
  }
}

/** Back-compat: rows saved before INC-01 lack direct_to_dentist. */
function normalizePayment(row: Payment): Payment {
  return { ...row, direct_to_dentist: row.direct_to_dentist ?? false };
}

function load(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...emptyStore(), currentAccountId: readSessionId() };
    }
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      profiles: parsed.profiles ?? [],
      periods: parsed.periods ?? [],
      sessions: parsed.sessions ?? [],
      parts: parsed.parts ?? [],
      actions: parsed.actions ?? [],
      payments: (parsed.payments ?? []).map(normalizePayment),
      accounts: parsed.accounts ?? [],
      currentAccountId: readSessionId(),
    };
  } catch {
    return emptyStore();
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toPublicAccount(row: StoredAccount): Account {
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    created_at: row.created_at,
  };
}

function save(store: Store): void {
  writeSessionId(store.currentAccountId);
  const persisted = { ...store, currentAccountId: null };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
}

function requireFound<T>(row: T | undefined, label: string): T {
  if (!row) throw new DataError(`${label} پیدا نشد.`);
  return row;
}

function inFilter<T>(rows: T[], ids: string[] | undefined, idOf: (row: T) => string): T[] {
  if (ids === undefined) return rows;
  if (ids.length === 0) return [];
  const set = new Set(ids);
  return rows.filter((r) => set.has(idOf(r)));
}

/**
 * Demo persistence: browser localStorage. Swap via `createDataProvider()`.
 * Cascades match the SQL schema (period → sessions+payments, session → parts, part → actions).
 */
export class LocalStorageDataProvider implements DataProvider {
  readonly driver = 'local' as const;

  private mutate<T>(fn: (store: Store) => T): T {
    const store = load();
    const result = fn(store);
    save(store);
    return result;
  }

  async listProfiles(): Promise<Profile[]> {
    return [...load().profiles].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async createProfile(data: ProfileWrite): Promise<Profile> {
    return this.mutate((store) => {
      if (store.profiles.some((p) => p.file_number === data.file_number && data.file_number)) {
        throw new DataError('شماره پرونده تکراری است.', '23505');
      }
      const ts = nowIso();
      const row: Profile = { ...data, id: newId(), created_at: ts, updated_at: ts };
      store.profiles.push(row);
      return row;
    });
  }

  async updateProfile(id: string, data: Partial<ProfileWrite>): Promise<Profile> {
    return this.mutate((store) => {
      const idx = store.profiles.findIndex((p) => p.id === id);
      const current = requireFound(store.profiles[idx], 'پرونده');
      const nextNumber = data.file_number ?? current.file_number;
      if (
        nextNumber &&
        store.profiles.some((p) => p.id !== id && p.file_number === nextNumber)
      ) {
        throw new DataError('شماره پرونده تکراری است.', '23505');
      }
      const row: Profile = { ...current, ...data, id, updated_at: nowIso() };
      store.profiles[idx] = row;
      return row;
    });
  }

  async listPeriods(profileId?: string): Promise<Period[]> {
    const rows = load().periods.filter((p) => !profileId || p.profile_id === profileId);
    return rows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  async createPeriod(data: PeriodWrite): Promise<Period> {
    return this.mutate((store) => {
      const ts = nowIso();
      const row: Period = { ...data, id: newId(), created_at: ts, updated_at: ts };
      store.periods.push(row);
      return row;
    });
  }

  async updatePeriod(
    id: string,
    data: Partial<Pick<PeriodWrite, 'teeth' | 'areas'>>
  ): Promise<Period> {
    return this.mutate((store) => {
      const idx = store.periods.findIndex((p) => p.id === id);
      const current = requireFound(store.periods[idx], 'دوره');
      const row: Period = { ...current, ...data, id, updated_at: nowIso() };
      store.periods[idx] = row;
      return row;
    });
  }

  async listSessions(periodIds?: string[]): Promise<Session[]> {
    const rows = inFilter(load().sessions, periodIds, (s) => s.period_id);
    return rows.sort((a, b) => a.session_number - b.session_number);
  }

  async createSession(data: SessionWrite): Promise<Session> {
    return this.mutate((store) => {
      const ts = nowIso();
      const row: Session = { ...data, id: newId(), created_at: ts, updated_at: ts };
      store.sessions.push(row);
      return row;
    });
  }

  async listParts(sessionIds?: string[]): Promise<Part[]> {
    const rows = inFilter(load().parts, sessionIds, (p) => p.session_id);
    return rows.sort((a, b) => a.part_number - b.part_number);
  }

  async createPart(data: PartWrite): Promise<Part> {
    return this.mutate((store) => {
      const ts = nowIso();
      const row: Part = {
        ...data,
        tooth: data.tooth ?? null,
        area: data.area ?? null,
        id: newId(),
        created_at: ts,
        updated_at: ts,
      };
      store.parts.push(row);
      return row;
    });
  }

  async listActions(partIds?: string[]): Promise<Action[]> {
    const rows = inFilter(load().actions, partIds, (a) => a.part_id);
    return rows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  async createAction(data: ActionWrite): Promise<Action> {
    return this.mutate((store) => {
      const ts = nowIso();
      const row: Action = { ...data, id: newId(), created_at: ts, updated_at: ts };
      store.actions.push(row);
      return row;
    });
  }

  async updateAction(id: string, data: Partial<ActionWrite>): Promise<Action> {
    return this.mutate((store) => {
      const idx = store.actions.findIndex((a) => a.id === id);
      const current = requireFound(store.actions[idx], 'اقدام');
      const row: Action = { ...current, ...data, id, updated_at: nowIso() };
      store.actions[idx] = row;
      return row;
    });
  }

  async listPayments(periodIds?: string[]): Promise<Payment[]> {
    const rows = inFilter(load().payments, periodIds, (p) => p.period_id);
    return rows.sort(
      (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
    );
  }

  async createPayment(data: PaymentWrite): Promise<Payment> {
    return this.mutate((store) => {
      const ts = nowIso();
      const row: Payment = normalizePayment({
        ...data,
        direct_to_dentist: data.direct_to_dentist ?? false,
        id: newId(),
        created_at: ts,
        updated_at: ts,
      });
      store.payments.push(row);
      return row;
    });
  }

  async updatePayment(id: string, data: Partial<PaymentWrite>): Promise<Payment> {
    return this.mutate((store) => {
      const idx = store.payments.findIndex((p) => p.id === id);
      const current = requireFound(store.payments[idx], 'پرداخت');
      const row: Payment = { ...current, ...data, id, updated_at: nowIso() };
      store.payments[idx] = row;
      return row;
    });
  }

  async deletePeriod(id: string): Promise<void> {
    this.mutate((store) => {
      const sessionIds = store.sessions.filter((s) => s.period_id === id).map((s) => s.id);
      this.dropSessions(store, sessionIds);
      store.payments = store.payments.filter((p) => p.period_id !== id);
      store.periods = store.periods.filter((p) => p.id !== id);
    });
  }

  async deleteSession(id: string): Promise<void> {
    this.mutate((store) => {
      this.dropSessions(store, [id]);
    });
  }

  async deletePart(id: string): Promise<void> {
    this.mutate((store) => {
      this.dropParts(store, [id]);
    });
  }

  async deleteAction(id: string): Promise<void> {
    this.mutate((store) => {
      store.actions = store.actions.filter((a) => a.id !== id);
    });
  }

  async deletePayment(id: string): Promise<void> {
    this.mutate((store) => {
      store.payments = store.payments.filter((p) => p.id !== id);
    });
  }

  async registerAccount(data: AccountRegister): Promise<Account> {
    const email = normalizeEmail(data.email);
    const password = data.password;
    const displayName = data.display_name?.trim() || null;

    if (!email) throw new DataError('ایمیل الزامی است.');
    if (!password || password.length < 8) {
      throw new DataError('رمز عبور باید حداقل ۸ نویسه باشد.');
    }

    return this.mutate((store) => {
      if (store.accounts.some((a) => a.email === email)) {
        throw new DataError('این ایمیل قبلاً ثبت شده است.', '23505');
      }
      const row: StoredAccount = {
        id: newId(),
        email,
        password,
        display_name: displayName,
        created_at: nowIso(),
      };
      store.accounts.push(row);
      store.currentAccountId = row.id;
      return toPublicAccount(row);
    });
  }

  async loginAccount(data: AccountLogin): Promise<Account> {
    const email = normalizeEmail(data.email);
    const password = data.password;
    const fail = (): never => {
      throw new DataError('ایمیل یا رمز عبور نادرست است.');
    };

    if (!email || !password) return fail();

    return this.mutate((store) => {
      const row = store.accounts.find((a) => a.email === email);
      if (!row || row.password !== password) return fail();
      store.currentAccountId = row.id;
      return toPublicAccount(row);
    });
  }

  async getCurrentAccount(): Promise<Account | null> {
    const store = load();
    if (!store.currentAccountId) return null;
    const row = store.accounts.find((a) => a.id === store.currentAccountId);
    return row ? toPublicAccount(row) : null;
  }

  async logoutAccount(): Promise<void> {
    this.mutate((store) => {
      store.currentAccountId = null;
    });
  }

  private dropSessions(store: Store, sessionIds: string[]): void {
    const idSet = new Set(sessionIds);
    const partIds = store.parts.filter((p) => idSet.has(p.session_id)).map((p) => p.id);
    this.dropParts(store, partIds);
    store.sessions = store.sessions.filter((s) => !idSet.has(s.id));
  }

  private dropParts(store: Store, partIds: string[]): void {
    const idSet = new Set(partIds);
    store.actions = store.actions.filter((a) => !idSet.has(a.part_id));
    store.parts = store.parts.filter((p) => !idSet.has(p.id));
  }
}
