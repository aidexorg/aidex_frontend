import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  variant?: 'default' | 'danger';
  footer?: React.ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  variant = 'default',
  footer,
  className = '',
}: StatCardProps) {
  return (
    <div className={`card p-4 flex flex-col gap-2 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 mb-1">{label}</p>
          <p
            className={`text-lg font-bold truncate ${
              variant === 'danger' ? 'text-red-600' : 'text-slate-900'
            }`}
          >
            {value}
          </p>
        </div>
        {Icon && (
          <div className="icon-well bg-sage-50 text-sage-600">
            <Icon size={20} />
          </div>
        )}
      </div>
      {footer && <div className="text-xs text-sage-600 mt-auto pt-1">{footer}</div>}
    </div>
  );
}
