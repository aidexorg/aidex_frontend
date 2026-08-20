import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createDataProvider } from './createProvider';
import type { DataProvider } from './types';

const DataContext = createContext<DataProvider | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => createDataProvider(), []);
  return <DataContext.Provider value={client}>{children}</DataContext.Provider>;
}

export function useData(): DataProvider {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData must be used inside AppDataProvider');
  }
  return ctx;
}
