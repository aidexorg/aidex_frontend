import { X } from 'lucide-react';
import { toFaDigits } from '@/lib/format';

export interface BulkAction {
  key: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface BulkActionBarProps {
  count: number;
  actions: BulkAction[];
  onClear: () => void;
  busy?: boolean;
  /** Polite status line shown while running or after completion. */
  status?: string | null;
}

export function BulkActionBar({
  count,
  actions,
  onClear,
  busy = false,
  status,
}: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div
      role="region"
      aria-label="عملیات گروهی"
      className="sticky top-2 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-sage-200 bg-sage-50/90 px-4 py-2.5 shadow-sm backdrop-blur"
    >
      <span className="text-sm font-medium text-sage-800" aria-live="polite">
        {toFaDigits(count)} مورد انتخاب شده
      </span>

      <div className="flex flex-wrap items-center gap-2">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={action.onClick}
            disabled={busy}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${
              action.danger
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>

      {status && (
        <span className="text-xs text-slate-500" role="status" aria-live="polite">
          {status}
        </span>
      )}

      <button
        type="button"
        onClick={onClear}
        disabled={busy}
        className="ms-auto inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50"
        aria-label="پاک کردن انتخاب"
      >
        <X size={14} aria-hidden="true" />
        پاک کردن
      </button>
    </div>
  );
}
