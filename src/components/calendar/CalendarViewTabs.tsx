import { CalendarDays, LayoutList, Users } from 'lucide-react';
import type { CalendarViewMode } from './shared';

const TABS: { key: CalendarViewMode; label: string; icon?: typeof CalendarDays }[] = [
  { key: 'daily', label: 'روزانه', icon: CalendarDays },
  { key: 'weekly', label: 'هفته', icon: CalendarDays },
  { key: 'monthly', label: 'ماه', icon: CalendarDays },
  { key: 'list', label: 'لیست', icon: LayoutList },
  { key: 'arrivals', label: 'ورودی‌ها', icon: Users },
];

interface CalendarViewTabsProps {
  value: CalendarViewMode;
  onChange: (mode: CalendarViewMode) => void;
}

export function CalendarViewTabs({ value, onChange }: CalendarViewTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="نوع نمایش نوبت‌ها"
      className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-600 dark:bg-slate-800"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const selected = value === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.key)}
            onKeyDown={(event) => {
              const keys = TABS.map((t) => t.key);
              const index = keys.indexOf(tab.key);
              let nextIndex: number | null = null;
              if (event.key === 'ArrowLeft') nextIndex = (index + 1) % keys.length;
              if (event.key === 'ArrowRight') nextIndex = (index - 1 + keys.length) % keys.length;
              if (event.key === 'Home') nextIndex = 0;
              if (event.key === 'End') nextIndex = keys.length - 1;
              if (nextIndex === null) return;
              event.preventDefault();
              onChange(keys[nextIndex]);
              const tabButtons =
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                  '[role="tab"]'
                );
              tabButtons?.[nextIndex]?.focus();
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
              selected
                ? 'bg-sage-600 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            {Icon && <Icon size={14} aria-hidden />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
