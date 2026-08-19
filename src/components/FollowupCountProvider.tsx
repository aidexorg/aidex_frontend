import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useData } from '@/data';
import { loadFollowupItems } from '@/lib/followups';
import type { View } from './Layout';

interface FollowupCountContextValue {
  count: number;
  refresh: () => void;
}

const FollowupCountContext = createContext<FollowupCountContextValue | null>(null);

export function FollowupCountProvider({
  children,
  view,
}: {
  children: ReactNode;
  view: View;
}) {
  const data = useData();
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    void loadFollowupItems(data)
      .then((items) => setCount(items.length))
      .catch(() => setCount(0));
  }, [data]);

  useEffect(() => {
    refresh();
  }, [refresh, view]);

  const value = useMemo(() => ({ count, refresh }), [count, refresh]);

  return (
    <FollowupCountContext.Provider value={value}>{children}</FollowupCountContext.Provider>
  );
}

export function useFollowupCount(): FollowupCountContextValue {
  const ctx = useContext(FollowupCountContext);
  if (!ctx) {
    throw new Error('useFollowupCount must be used within FollowupCountProvider');
  }
  return ctx;
}
