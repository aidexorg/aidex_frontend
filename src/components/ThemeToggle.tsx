import { Monitor, Moon, Sun } from 'lucide-react';
import { THEME_MODE_LABELS, type ThemeMode } from '@/lib/theme';
import { useTheme } from './ThemeProvider';

const MODE_ICONS: Record<ThemeMode, typeof Sun> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

export function ThemeToggle() {
  const { mode, cycleMode } = useTheme();
  const Icon = MODE_ICONS[mode];
  const label = THEME_MODE_LABELS[mode];

  return (
    <button
      type="button"
      onClick={cycleMode}
      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2 text-sm text-slate-600 hover:border-sage-300 hover:bg-white transition dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-sage-500 dark:hover:bg-slate-800"
      aria-label={`تم: ${label}. برای تغییر کلیک کنید`}
      aria-pressed={mode !== 'system'}
      title={`تم: ${label}`}
    >
      <Icon size={16} aria-hidden="true" />
      <span className="hidden sm:inline text-xs font-medium">{label}</span>
    </button>
  );
}
