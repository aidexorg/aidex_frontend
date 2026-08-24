import type { LucideIcon } from 'lucide-react';

export interface TabItem<T extends string = string> {
  key: T;
  label: string;
  icon?: LucideIcon;
}

interface TabBarProps<T extends string> {
  tabs: TabItem<T>[];
  active: T;
  onChange: (key: T) => void;
  className?: string;
}

export function TabBar<T extends string>({ tabs, active, onChange, className = '' }: TabBarProps<T>) {
  return (
    <div className={`flex items-center gap-1 border-b border-slate-200/80 ${className}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              isActive
                ? 'border-sage-600 text-sage-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {Icon && <Icon size={16} />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
