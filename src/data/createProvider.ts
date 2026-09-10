import { getApiBaseUrl } from './apiConfig';
import { HttpDataProvider } from './httpProvider';
import { OfflineProvider } from './offlineProvider';
import type { DataProvider } from './types';

export type DataProviderMode = 'remote' | 'offline';

/**
 * Resolved mode priority:
 * 1. VITE_APP_MODE env var (build-time: 'offline' | 'remote')
 * 2. localStorage override (runtime toggle)
 * 3. default 'remote'
 *
 * When VITE_APP_MODE is set, the toggle is locked and env var wins.
 */
export function getEnvMode(): DataProviderMode | null {
  const v = import.meta.env.VITE_APP_MODE?.trim().toLowerCase();
  if (v === 'offline' || v === 'remote') return v;
  return null;
}

const MODE_KEY = 'aidex:provider-mode';

export function getStoredMode(): DataProviderMode {
  // If env var is set, it overrides everything
  const envMode = getEnvMode();
  if (envMode) return envMode;
  try {
    const v = localStorage.getItem(MODE_KEY);
    if (v === 'offline' || v === 'remote') return v;
  } catch { /* ignore */ }
  return 'remote';
}

export function isModeLocked(): boolean {
  return getEnvMode() !== null;
}

export function setStoredMode(mode: DataProviderMode): void {
  // Don't write localStorage if env var locks the mode
  if (isModeLocked()) return;
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch { /* ignore */ }
}

/** Create a DataProvider based on env var, stored override, or default. */
export function createDataProvider(mode?: DataProviderMode): DataProvider {
  const effective = mode ?? getStoredMode();
  if (effective === 'offline') {
    return new OfflineProvider();
  }
  return new HttpDataProvider(getApiBaseUrl());
}
