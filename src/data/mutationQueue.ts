import type { HttpDataProvider } from './httpProvider';

/**
 * Offline mutation queue for the remote DataProvider (POL-19).
 *
 * Conflict policy: last-write-wins per queueItemId — each queued entry is flushed
 * independently in FIFO order; duplicate updates to the same entity are not merged.
 */
export const MUTATION_QUEUE_KEY = 'aidex:mutation-queue:v1';
export const MAX_QUEUE_SIZE = 100;

export interface QueuedMutation {
  queueItemId: string;
  method: string;
  args: unknown[];
  createdAt: number;
  tempId?: string;
}

type FlushErrorHandler = (message: string) => void;

let flushErrorHandler: FlushErrorHandler | null = null;
let flushing = false;

export function setMutationQueueErrorHandler(handler: FlushErrorHandler | null): void {
  flushErrorHandler = handler;
}

export function loadMutationQueue(): QueuedMutation[] {
  try {
    const raw = localStorage.getItem(MUTATION_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedMutation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMutationQueue(queue: QueuedMutation[]): void {
  try {
    localStorage.setItem(MUTATION_QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE_SIZE)));
  } catch {
    // Storage unavailable — queue applies for this session only.
  }
}

export function enqueueMutation(item: QueuedMutation): void {
  const queue = loadMutationQueue();
  queue.push(item);
  saveMutationQueue(queue);
  window.dispatchEvent(new CustomEvent('aidex:mutation-queue-changed'));
}

export function pendingMutationCount(): number {
  return loadMutationQueue().length;
}

async function invokeMutation(inner: HttpDataProvider, item: QueuedMutation): Promise<void> {
  const provider = inner as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
  const fn = provider[item.method];
  if (typeof fn !== 'function') {
    throw new Error(`Unknown queued method: ${item.method}`);
  }
  await fn.apply(inner, item.args);
}

export async function flushMutationQueue(inner: HttpDataProvider): Promise<void> {
  if (flushing) return;
  const queue = loadMutationQueue();
  if (queue.length === 0) return;

  flushing = true;
  const remaining: QueuedMutation[] = [];

  try {
    for (const item of queue) {
      try {
        await invokeMutation(inner, item);
      } catch (error) {
        remaining.push(item);
        const detail = error instanceof Error ? error.message : 'خطای ناشناخته';
        flushErrorHandler?.(
          `همگام‌سازی «${item.method}» ناموفق بود — در صف باقی ماند. ${detail}`,
        );
      }
    }
    saveMutationQueue(remaining);
  } finally {
    flushing = false;
    window.dispatchEvent(new CustomEvent('aidex:mutation-queue-changed'));
  }
}

export function initMutationQueueSync(inner: HttpDataProvider): () => void {
  const tryFlush = () => {
    void flushMutationQueue(inner);
  };
  window.addEventListener('online', tryFlush);
  tryFlush();
  return () => window.removeEventListener('online', tryFlush);
}
