import { LocalStorageDataProvider } from './localStorageProvider';
import type { DataProvider } from './types';

/**
 * Single switch for persistence.
 * Demo now: localStorage.
 * Later: return an HTTP/backend implementation that satisfies `DataProvider`.
 */
export function createDataProvider(): DataProvider {
  return new LocalStorageDataProvider();
}
