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

function csvParam(ids?: string[]): string | undefined {
  return ids?.length ? ids.join(',') : undefined;
}

function withQuery(path: string, params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

async function readErrorMessage(res: Response): Promise<DataError> {
  try {
    const body = (await res.json()) as { message?: string | string[]; code?: string };
    if (typeof body.message === 'string') {
      return new DataError(body.message, body.code);
    }
    if (Array.isArray(body.message)) {
      return new DataError(body.message.join(', '), body.code);
    }
  } catch {
    /* empty or non-JSON body */
  }
  return new DataError(`Request failed (${res.status})`);
}

export class HttpDataProvider implements DataProvider {
  readonly driver = 'remote' as const;

  constructor(private readonly baseUrl: string) {}

  private url(path: string): string {
    const base = this.baseUrl.replace(/\/+$/, '');
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private async fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(this.url(path), {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });

    if (!res.ok) {
      throw await readErrorMessage(res);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    const text = await res.text();
    if (!text) {
      return null as T;
    }

    return JSON.parse(text) as T;
  }

  private async fetchVoid(path: string, init?: RequestInit): Promise<void> {
    const res = await fetch(this.url(path), {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });

    if (!res.ok) {
      throw await readErrorMessage(res);
    }
  }

  listProfiles(): Promise<Profile[]> {
    return this.fetchJson<Profile[]>('/profiles');
  }

  createProfile(data: ProfileWrite): Promise<Profile> {
    return this.fetchJson<Profile>('/profiles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateProfile(id: string, data: Partial<ProfileWrite>): Promise<Profile> {
    return this.fetchJson<Profile>(`/profiles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  listPeriods(profileId?: string): Promise<Period[]> {
    return this.fetchJson<Period[]>(withQuery('/periods', { profile_id: profileId }));
  }

  createPeriod(data: PeriodWrite): Promise<Period> {
    return this.fetchJson<Period>('/periods', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updatePeriod(
    id: string,
    data: Partial<Pick<PeriodWrite, 'teeth' | 'areas'>>,
  ): Promise<Period> {
    return this.fetchJson<Period>(`/periods/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deletePeriod(id: string) {
    return this.fetchVoid(`/periods/${id}`, { method: 'DELETE' });
  }

  listSessions(periodIds?: string[]): Promise<Session[]> {
    return this.fetchJson<Session[]>(withQuery('/sessions', { period_ids: csvParam(periodIds) }));
  }

  createSession(data: SessionWrite): Promise<Session> {
    return this.fetchJson<Session>('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateSession(id: string, data: Partial<SessionWrite>): Promise<Session> {
    return this.fetchJson<Session>(`/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteSession(id: string) {
    return this.fetchVoid(`/sessions/${id}`, { method: 'DELETE' });
  }

  listParts(sessionIds?: string[]): Promise<Part[]> {
    return this.fetchJson<Part[]>(withQuery('/parts', { session_ids: csvParam(sessionIds) }));
  }

  createPart(data: PartWrite): Promise<Part> {
    return this.fetchJson<Part>('/parts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updatePart(id: string, data: Partial<PartWrite>): Promise<Part> {
    return this.fetchJson<Part>(`/parts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deletePart(id: string) {
    return this.fetchVoid(`/parts/${id}`, { method: 'DELETE' });
  }

  listActions(partIds?: string[]): Promise<Action[]> {
    return this.fetchJson<Action[]>(withQuery('/actions', { part_ids: csvParam(partIds) }));
  }

  createAction(data: ActionWrite): Promise<Action> {
    return this.fetchJson<Action>('/actions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateAction(id: string, data: Partial<ActionWrite>): Promise<Action> {
    return this.fetchJson<Action>(`/actions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteAction(id: string) {
    return this.fetchVoid(`/actions/${id}`, { method: 'DELETE' });
  }

  listPayments(periodIds?: string[]): Promise<Payment[]> {
    return this.fetchJson<Payment[]>(withQuery('/payments', { period_ids: csvParam(periodIds) }));
  }

  createPayment(data: PaymentWrite): Promise<Payment> {
    return this.fetchJson<Payment>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updatePayment(id: string, data: Partial<PaymentWrite>): Promise<Payment> {
    return this.fetchJson<Payment>(`/payments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deletePayment(id: string) {
    return this.fetchVoid(`/payments/${id}`, { method: 'DELETE' });
  }

  listAppointments(filters?: {
    profileId?: string;
    date?: string;
    status?: AppointmentStatus;
  }): Promise<Appointment[]> {
    return this.fetchJson<Appointment[]>(
      withQuery('/appointments', {
        profile_id: filters?.profileId,
        date: filters?.date,
        status: filters?.status,
      }),
    );
  }

  createAppointment(data: AppointmentWrite): Promise<Appointment> {
    return this.fetchJson<Appointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateAppointment(id: string, data: Partial<AppointmentWrite>): Promise<Appointment> {
    return this.fetchJson<Appointment>(`/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteAppointment(id: string) {
    return this.fetchVoid(`/appointments/${id}`, { method: 'DELETE' });
  }

  registerAccount(data: AccountRegister): Promise<Account> {
    return this.fetchJson<Account>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  loginAccount(data: AccountLogin): Promise<Account> {
    return this.fetchJson<Account>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCurrentAccount(): Promise<Account | null> {
    return this.fetchJson<Account | null>('/auth/me');
  }

  logoutAccount() {
    return this.fetchVoid('/auth/logout', { method: 'POST' });
  }
}
