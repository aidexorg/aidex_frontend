/** POL-22: client-side form draft storage (CLM-035). */

export const DRAFT_KEY_PREFIX = 'aidex:draft';

export interface DraftEnvelope<T> {
  v: number;
  data: T;
  savedAt: string;
}

const memoryStore = new Map<string, string>();

export function buildDraftStorageKey(formId: string, scopeKey?: string): string {
  return scopeKey ? `${DRAFT_KEY_PREFIX}:${formId}:${scopeKey}` : `${DRAFT_KEY_PREFIX}:${formId}`;
}

export function readDraftRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

export function writeDraftRaw(key: string, raw: string): void {
  try {
    localStorage.setItem(key, raw);
  } catch {
    memoryStore.set(key, raw);
  }
}

export function clearDraftRaw(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
  memoryStore.delete(key);
}

export function readDraft<T>(key: string, version: number): T | null {
  const raw = readDraftRaw(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DraftEnvelope<T>;
    if (parsed.v !== version || parsed.data === undefined) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeDraft<T>(key: string, version: number, data: T): void {
  const envelope: DraftEnvelope<T> = {
    v: version,
    data,
    savedAt: new Date().toISOString(),
  };
  writeDraftRaw(key, JSON.stringify(envelope));
}

export function clearDraft(key: string): void {
  clearDraftRaw(key);
}

export function draftsEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
