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
import { HttpDataProvider } from './httpProvider';
import { enqueueMutation, initMutationQueueSync } from './mutationQueue';
import { isBrowserOnline } from '@/lib/connectivity';

const OFFLINE_AUTH_MESSAGE = 'اتصال اینترنت برقرار نیست. لطفاً دوباره تلاش کنید.';

function nowIso(): string {
  return new Date().toISOString();
}

function tempId(): string {
  return `pending-${crypto.randomUUID()}`;
}

function assertOnlineForAuth(): void {
  if (!isBrowserOnline()) {
    throw new DataError(OFFLINE_AUTH_MESSAGE);
  }
}

/**
 * Wraps HttpDataProvider: queues writes while offline, flushes on reconnect.
 */
export class QueuedHttpDataProvider implements DataProvider {
  readonly driver = 'remote' as const;
  private readonly inner: HttpDataProvider;
  private readonly teardownSync: () => void;

  constructor(baseUrl: string) {
    this.inner = new HttpDataProvider(baseUrl);
    this.teardownSync = initMutationQueueSync(this.inner);
  }

  dispose(): void {
    this.teardownSync();
  }

  private queueOrRun<T>(
    method: string,
    args: unknown[],
    onlineFn: () => Promise<T>,
    offlineFn: () => T,
  ): Promise<T> {
    if (isBrowserOnline()) {
      return onlineFn();
    }
    enqueueMutation({
      queueItemId: crypto.randomUUID(),
      method,
      args,
      createdAt: Date.now(),
    });
    return Promise.resolve(offlineFn());
  }

  listProfiles(): Promise<Profile[]> {
    return this.inner.listProfiles();
  }

  createProfile(data: ProfileWrite): Promise<Profile> {
    const id = tempId();
    const ts = nowIso();
    return this.queueOrRun(
      'createProfile',
      [data],
      () => this.inner.createProfile(data),
      () => ({ id, ...data, created_at: ts, updated_at: ts }),
    );
  }

  updateProfile(id: string, data: Partial<ProfileWrite>): Promise<Profile> {
    const ts = nowIso();
    return this.queueOrRun(
      'updateProfile',
      [id, data],
      () => this.inner.updateProfile(id, data),
      () => ({ id, ...data, updated_at: ts } as Profile),
    );
  }

  listPeriods(profileId?: string): Promise<Period[]> {
    return this.inner.listPeriods(profileId);
  }

  createPeriod(data: PeriodWrite): Promise<Period> {
    const id = tempId();
    const ts = nowIso();
    return this.queueOrRun(
      'createPeriod',
      [data],
      () => this.inner.createPeriod(data),
      () => ({ id, ...data, created_at: ts, updated_at: ts }),
    );
  }

  updatePeriod(
    id: string,
    data: Partial<Pick<PeriodWrite, 'teeth' | 'areas'>>,
  ): Promise<Period> {
    const ts = nowIso();
    return this.queueOrRun(
      'updatePeriod',
      [id, data],
      () => this.inner.updatePeriod(id, data),
      () => ({ id, ...data, updated_at: ts } as Period),
    );
  }

  deletePeriod(id: string): Promise<void> {
    return this.queueOrRun(
      'deletePeriod',
      [id],
      () => this.inner.deletePeriod(id),
      () => undefined,
    );
  }

  listSessions(periodIds?: string[]): Promise<Session[]> {
    return this.inner.listSessions(periodIds);
  }

  createSession(data: SessionWrite): Promise<Session> {
    const id = tempId();
    const ts = nowIso();
    return this.queueOrRun(
      'createSession',
      [data],
      () => this.inner.createSession(data),
      () => ({ id, ...data, created_at: ts, updated_at: ts }),
    );
  }

  updateSession(id: string, data: Partial<SessionWrite>): Promise<Session> {
    const ts = nowIso();
    return this.queueOrRun(
      'updateSession',
      [id, data],
      () => this.inner.updateSession(id, data),
      () => ({ id, ...data, updated_at: ts } as Session),
    );
  }

  deleteSession(id: string): Promise<void> {
    return this.queueOrRun(
      'deleteSession',
      [id],
      () => this.inner.deleteSession(id),
      () => undefined,
    );
  }

  listParts(sessionIds?: string[]): Promise<Part[]> {
    return this.inner.listParts(sessionIds);
  }

  createPart(data: PartWrite): Promise<Part> {
    const id = tempId();
    const ts = nowIso();
    return this.queueOrRun(
      'createPart',
      [data],
      () => this.inner.createPart(data),
      () => ({ id, ...data, created_at: ts, updated_at: ts }),
    );
  }

  updatePart(id: string, data: Partial<PartWrite>): Promise<Part> {
    const ts = nowIso();
    return this.queueOrRun(
      'updatePart',
      [id, data],
      () => this.inner.updatePart(id, data),
      () => ({ id, ...data, updated_at: ts } as Part),
    );
  }

  deletePart(id: string): Promise<void> {
    return this.queueOrRun(
      'deletePart',
      [id],
      () => this.inner.deletePart(id),
      () => undefined,
    );
  }

  listActions(partIds?: string[]): Promise<Action[]> {
    return this.inner.listActions(partIds);
  }

  createAction(data: ActionWrite): Promise<Action> {
    const id = tempId();
    const ts = nowIso();
    return this.queueOrRun(
      'createAction',
      [data],
      () => this.inner.createAction(data),
      () => ({ id, ...data, created_at: ts, updated_at: ts }),
    );
  }

  updateAction(id: string, data: Partial<ActionWrite>): Promise<Action> {
    const ts = nowIso();
    return this.queueOrRun(
      'updateAction',
      [id, data],
      () => this.inner.updateAction(id, data),
      () => ({ id, ...data, updated_at: ts } as Action),
    );
  }

  deleteAction(id: string): Promise<void> {
    return this.queueOrRun(
      'deleteAction',
      [id],
      () => this.inner.deleteAction(id),
      () => undefined,
    );
  }

  listPayments(periodIds?: string[]): Promise<Payment[]> {
    return this.inner.listPayments(periodIds);
  }

  createPayment(data: PaymentWrite): Promise<Payment> {
    const id = tempId();
    const ts = nowIso();
    return this.queueOrRun(
      'createPayment',
      [data],
      () => this.inner.createPayment(data),
      () => ({ id, ...data, created_at: ts, updated_at: ts }),
    );
  }

  updatePayment(id: string, data: Partial<PaymentWrite>): Promise<Payment> {
    const ts = nowIso();
    return this.queueOrRun(
      'updatePayment',
      [id, data],
      () => this.inner.updatePayment(id, data),
      () => ({ id, ...data, updated_at: ts } as Payment),
    );
  }

  deletePayment(id: string): Promise<void> {
    return this.queueOrRun(
      'deletePayment',
      [id],
      () => this.inner.deletePayment(id),
      () => undefined,
    );
  }

  listAppointments(filters?: {
    profileId?: string;
    date?: string;
    status?: AppointmentStatus;
  }): Promise<Appointment[]> {
    return this.inner.listAppointments(filters);
  }

  createAppointment(data: AppointmentWrite): Promise<Appointment> {
    const id = tempId();
    const ts = nowIso();
    return this.queueOrRun(
      'createAppointment',
      [data],
      () => this.inner.createAppointment(data),
      () => ({ id, ...data, created_at: ts, updated_at: ts }),
    );
  }

  updateAppointment(id: string, data: Partial<AppointmentWrite>): Promise<Appointment> {
    const ts = nowIso();
    return this.queueOrRun(
      'updateAppointment',
      [id, data],
      () => this.inner.updateAppointment(id, data),
      () => ({ id, ...data, updated_at: ts } as Appointment),
    );
  }

  deleteAppointment(id: string): Promise<void> {
    return this.queueOrRun(
      'deleteAppointment',
      [id],
      () => this.inner.deleteAppointment(id),
      () => undefined,
    );
  }

  registerAccount(data: AccountRegister): Promise<Account> {
    assertOnlineForAuth();
    return this.inner.registerAccount(data);
  }

  loginAccount(data: AccountLogin): Promise<Account> {
    assertOnlineForAuth();
    return this.inner.loginAccount(data);
  }

  getCurrentAccount(): Promise<Account | null> {
    return this.inner.getCurrentAccount();
  }

  logoutAccount(): Promise<void> {
    assertOnlineForAuth();
    return this.inner.logoutAccount();
  }
}
