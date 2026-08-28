import { LocalStorageDataProvider } from './localStorageProvider';
import { QueuedHttpDataProvider } from './queuedHttpProvider';
import type { DataProvider } from './types';

/**
 * Single switch for persistence.
 * Demo: localStorage when VITE_API_BASE is unset.
 * Remote: HTTP backend when VITE_API_BASE is configured (with offline write queue).
 */
export function createDataProvider(): DataProvider {
  const baseUrl = import.meta.env.VITE_API_BASE?.trim();
  if (baseUrl) {
    return new QueuedHttpDataProvider(baseUrl);
  }
  return new LocalStorageDataProvider();
}
