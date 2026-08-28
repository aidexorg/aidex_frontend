export interface BulkFailure<T> {
  item: T;
  error: unknown;
}

export interface BulkResult<T> {
  succeeded: T[];
  failed: BulkFailure<T>[];
}

interface BulkRunOptions {
  /** Max in-flight operations at once. Keeps remote-mode fan-out bounded. */
  concurrency?: number;
  /** Called after each settled item with the count completed so far. */
  onProgress?: (completed: number, total: number) => void;
}

const DEFAULT_CONCURRENCY = 4;

/**
 * Runs an async operation across items with bounded concurrency.
 * Individual failures are captured (never thrown) so partial results
 * can be reported honestly for remote providers.
 */
export async function runBulk<T>(
  items: T[],
  op: (item: T) => Promise<unknown>,
  { concurrency = DEFAULT_CONCURRENCY, onProgress }: BulkRunOptions = {}
): Promise<BulkResult<T>> {
  const result: BulkResult<T> = { succeeded: [], failed: [] };
  const total = items.length;
  if (total === 0) return result;

  const limit = Math.max(1, Math.min(concurrency, total));
  let cursor = 0;
  let completed = 0;

  const worker = async () => {
    while (cursor < total) {
      const index = cursor++;
      const item = items[index];
      try {
        await op(item);
        result.succeeded.push(item);
      } catch (error) {
        result.failed.push({ item, error });
      } finally {
        completed++;
        onProgress?.(completed, total);
      }
    }
  };

  await Promise.all(Array.from({ length: limit }, worker));
  return result;
}
