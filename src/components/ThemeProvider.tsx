import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  applyResolvedTheme,
  nextThemeMode,
  readStoredThemeMode,
  resolveTheme,
  writeStoredThemeMode,
  type ResolvedTheme,
  type ThemeMode,
} from '@/lib/theme';

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredThemeMode());
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(readStoredThemeMode()));

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    writeStoredThemeMode(next);
    const resolvedNext = resolveTheme(next);
    setResolved(resolvedNext);
    applyResolvedTheme(resolvedNext);
  }, []);

  const cycleMode = useCallback(() => {
    setMode(nextThemeMode(mode));
  }, [mode, setMode]);

  useEffect(() => {
    const resolvedNext = resolveTheme(mode);
    setResolved(resolvedNext);
    applyResolvedTheme(resolvedNext);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const resolvedNext = resolveTheme('system');
      setResolved(resolvedNext);
      applyResolvedTheme(resolvedNext);
    };
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [mode]);

  const value = useMemo(
    () => ({ mode, resolved, setMode, cycleMode }),
    [mode, resolved, setMode, cycleMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
