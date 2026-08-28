/** POL-17: client-side theme preference (CLM-029). */
export const THEME_STORAGE_KEY = 'aidex:theme';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const MODES: ThemeMode[] = ['system', 'light', 'dark'];

export const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  system: 'سیستم',
  light: 'روشن',
  dark: 'تاریک',
};

export function readStoredThemeMode(): ThemeMode {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') return value;
  } catch {
    // Storage may be unavailable in private/restricted browsing.
  }
  return 'system';
}

export function writeStoredThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Degrade gracefully — choice applies for the current session only.
  }
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'light') return 'light';
  if (mode === 'dark') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyResolvedTheme(resolved: ResolvedTheme): void {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export function nextThemeMode(current: ThemeMode): ThemeMode {
  const index = MODES.indexOf(current);
  return MODES[(index + 1) % MODES.length];
}
