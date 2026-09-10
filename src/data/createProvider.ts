import { getApiBaseUrl } from './apiConfig';
import { HttpDataProvider } from './httpProvider';
import { OfflineProvider } from './offlineProvider';
import type { DataProvider } from './types';

export type DataProviderMode = 'remote' | 'offline';

const MODE_KEY = 'aidex:provider-mode';

export function getStoredMode(): DataProviderMode {
  try {
    const v = localStorage.getItem(MODE_KEY);
    if (v === 'offline' || v === 'remote') return v;
  } catch { /* ignore */ }
  return 'remote';
}

export function setStoredMode(mode: DataProviderMode): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch { /* ignore */ }
}

/** Create a DataProvider based on the stored or requested mode. */
export function createDataProvider(mode?: DataProviderMode): DataProvider {
  const effective = mode ?? getStoredMode();
  if (effective === 'offline') {
    return new OfflineProvider();
  }
  return new HttpDataProvider(getApiBaseUrl());
}
