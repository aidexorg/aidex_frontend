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
import {
  accountLoginToWire,
  accountRegisterToWire,
  actionWriteToWire,
  appointmentWriteToWire,
  partialActionWriteToWire,
  partialAppointmentWriteToWire,
  partialPartWriteToWire,
  partialPaymentWriteToWire,
  partialProfileWriteToWire,
  partialSessionWriteToWire,
  partWriteToWire,
  paymentWriteToWire,
  periodPatchToWire,
  periodWriteToWire,
  profileWriteToWire,
  sessionWriteToWire,
  wireToAccount,
  wireToAction,
  wireToAppointment,
  wireToPart,
  wireToPayment,
  wireToPeriod,
  wireToProfile,
  wireToSession,
  type WireAccount,
  type WireAction,
  type WireAppointment,
  type WirePart,
  type WirePayment,
  type WirePeriod,
  type WireProfile,
  type WireSession,
} from './mappers';

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

  async listProfiles(): Promise<Profile[]> {
    const wire = await this.fetchJson<WireProfile[]>('/profiles');
    return wire.map(wireToProfile);
  }

  async createProfile(data: ProfileWrite): Promise<Profile> {
    const wire = await this.fetchJson<WireProfile>('/profiles', {
      method: 'POST',
      body: JSON.stringify(profileWriteToWire(data)),
    });
    return wireToProfile(wire);
  }

  async updateProfile(id: string, data: Partial<ProfileWrite>): Promise<Profile> {
    const wire = await this.fetchJson<WireProfile>(`/profiles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(partialProfileWriteToWire(data)),
    });
    return wireToProfile(wire);
  }

  async listPeriods(profileId?: string): Promise<Period[]> {
    const wire = await this.fetchJson<WirePeriod[]>(
      withQuery('/periods', { profile_id: profileId }),
    );
    return wire.map(wireToPeriod);
  }

  async createPeriod(data: PeriodWrite): Promise<Period> {
    const wire = await this.fetchJson<WirePeriod>('/periods', {
      method: 'POST',
      body: JSON.stringify(periodWriteToWire(data)),
    });
    return wireToPeriod(wire);
  }

  async updatePeriod(
    id: string,
    data: Partial<Pick<PeriodWrite, 'teeth' | 'areas'>>,
  ): Promise<Period> {
    const wire = await this.fetchJson<WirePeriod>(`/periods/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(periodPatchToWire(data)),
    });
    return wireToPeriod(wire);
  }

  deletePeriod(id: string) {
    return this.fetchVoid(`/periods/${id}`, { method: 'DELETE' });
  }

  async listSessions(periodIds?: string[]): Promise<Session[]> {
    const wire = await this.fetchJson<WireSession[]>(
      withQuery('/sessions', { period_ids: csvParam(periodIds) }),
    );
    return wire.map(wireToSession);
  }

  async createSession(data: SessionWrite): Promise<Session> {
    const wire = await this.fetchJson<WireSession>('/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionWriteToWire(data)),
    });
    return wireToSession(wire);
  }

  async updateSession(id: string, data: Partial<SessionWrite>): Promise<Session> {
    const wire = await this.fetchJson<WireSession>(`/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(partialSessionWriteToWire(data)),
    });
    return wireToSession(wire);
  }

  deleteSession(id: string) {
    return this.fetchVoid(`/sessions/${id}`, { method: 'DELETE' });
  }

  async listParts(sessionIds?: string[]): Promise<Part[]> {
    const wire = await this.fetchJson<WirePart[]>(
      withQuery('/parts', { session_ids: csvParam(sessionIds) }),
    );
    return wire.map(wireToPart);
  }

  async createPart(data: PartWrite): Promise<Part> {
    const wire = await this.fetchJson<WirePart>('/parts', {
      method: 'POST',
      body: JSON.stringify(partWriteToWire(data)),
    });
    return wireToPart(wire);
  }

  async updatePart(id: string, data: Partial<PartWrite>): Promise<Part> {
    const wire = await this.fetchJson<WirePart>(`/parts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(partialPartWriteToWire(data)),
    });
    return wireToPart(wire);
  }

  deletePart(id: string) {
    return this.fetchVoid(`/parts/${id}`, { method: 'DELETE' });
  }

  async listActions(partIds?: string[]): Promise<Action[]> {
    const wire = await this.fetchJson<WireAction[]>(
      withQuery('/actions', { part_ids: csvParam(partIds) }),
    );
    return wire.map(wireToAction);
  }

  async createAction(data: ActionWrite): Promise<Action> {
    // Remote API may reject status=planned until paired SUR-02 migration ships.
    const wire = await this.fetchJson<WireAction>('/actions', {
      method: 'POST',
      body: JSON.stringify(actionWriteToWire(data)),
    });
    return wireToAction(wire);
  }

  async updateAction(id: string, data: Partial<ActionWrite>): Promise<Action> {
    const wire = await this.fetchJson<WireAction>(`/actions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(partialActionWriteToWire(data)),
    });
    return wireToAction(wire);
  }

  deleteAction(id: string) {
    return this.fetchVoid(`/actions/${id}`, { method: 'DELETE' });
  }

  async listPayments(periodIds?: string[]): Promise<Payment[]> {
    const wire = await this.fetchJson<WirePayment[]>(
      withQuery('/payments', { period_ids: csvParam(periodIds) }),
    );
    return wire.map(wireToPayment);
  }

  async createPayment(data: PaymentWrite): Promise<Payment> {
    const wire = await this.fetchJson<WirePayment>('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentWriteToWire(data)),
    });
    return wireToPayment(wire);
  }

  async updatePayment(id: string, data: Partial<PaymentWrite>): Promise<Payment> {
    const wire = await this.fetchJson<WirePayment>(`/payments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(partialPaymentWriteToWire(data)),
    });
    return wireToPayment(wire);
  }

  deletePayment(id: string) {
    return this.fetchVoid(`/payments/${id}`, { method: 'DELETE' });
  }

  async listAppointments(filters?: {
    profileId?: string;
    date?: string;
    status?: AppointmentStatus;
  }): Promise<Appointment[]> {
    const wire = await this.fetchJson<WireAppointment[]>(
      withQuery('/appointments', {
        profile_id: filters?.profileId,
        date: filters?.date,
        status: filters?.status,
      }),
    );
    return wire.map(wireToAppointment);
  }

  async createAppointment(data: AppointmentWrite): Promise<Appointment> {
    const wire = await this.fetchJson<WireAppointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentWriteToWire(data)),
    });
    return wireToAppointment(wire);
  }

  async updateAppointment(id: string, data: Partial<AppointmentWrite>): Promise<Appointment> {
    const wire = await this.fetchJson<WireAppointment>(`/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(partialAppointmentWriteToWire(data)),
    });
    return wireToAppointment(wire);
  }

  deleteAppointment(id: string) {
    return this.fetchVoid(`/appointments/${id}`, { method: 'DELETE' });
  }

  async registerAccount(data: AccountRegister): Promise<Account> {
    const wire = await this.fetchJson<WireAccount>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(accountRegisterToWire(data)),
    });
    return wireToAccount(wire);
  }

  async loginAccount(data: AccountLogin): Promise<Account> {
    const wire = await this.fetchJson<WireAccount>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(accountLoginToWire(data)),
    });
    return wireToAccount(wire);
  }

  async getCurrentAccount(): Promise<Account | null> {
    const wire = await this.fetchJson<WireAccount | null>('/auth/me');
    return wire ? wireToAccount(wire) : null;
  }

  logoutAccount() {
    return this.fetchVoid('/auth/logout', { method: 'POST' });
  }
}
