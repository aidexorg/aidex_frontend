import { HttpDataProvider } from './httpProvider';
import { LocalStorageDataProvider } from './localStorageProvider';
import type { DataProvider } from './types';

/**
 * Single switch for persistence.
 * Demo: localStorage when VITE_API_BASE is unset.
 * Remote: HTTP backend when VITE_API_BASE is configured.
 */
export function createDataProvider(): DataProvider {
  const baseUrl = import.meta.env.VITE_API_BASE?.trim();
  if (baseUrl) {
    return new HttpDataProvider(baseUrl);
  }
  return new LocalStorageDataProvider();
}
