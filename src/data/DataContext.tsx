import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  createDataProvider,
  getStoredMode,
  setStoredMode,
  isModeLocked,
  type DataProviderMode,
} from './createProvider';
import type { DataProvider } from './types';

interface DataContextValue {
  client: DataProvider;
  mode: DataProviderMode;
  locked: boolean;
  setMode: (mode: DataProviderMode) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<DataProviderMode>(getStoredMode);
  const [client, setClient] = useState<DataProvider>(() => createDataProvider(mode));
  const locked = isModeLocked();

  const setMode = useCallback((newMode: DataProviderMode) => {
    setStoredMode(newMode);
    setModeState(newMode);
    setClient(createDataProvider(newMode));
  }, []);

  const value = useMemo(() => ({ client, mode, locked, setMode }), [client, mode, locked, setMode]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataProvider {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData must be used inside AppDataProvider');
  }
  return ctx.client;
}

export function useDataProviderMode(): { mode: DataProviderMode; locked: boolean; setMode: (mode: DataProviderMode) => void } {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useDataProviderMode must be used inside AppDataProvider');
  }
  return { mode: ctx.mode, locked: ctx.locked, setMode: ctx.setMode };
}
