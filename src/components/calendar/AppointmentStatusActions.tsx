import { getNextStatuses, type AppointmentStatus } from '@/types';

interface AppointmentStatusActionsProps {
  status: AppointmentStatus;
  onStatusChange: (status: AppointmentStatus) => void;
  size?: 'sm' | 'md';
  className?: string;
  stopPropagation?: boolean;
}

export function AppointmentStatusActions({
  status,
  onStatusChange,
  size = 'sm',
  className = '',
  stopPropagation = true,
}: AppointmentStatusActionsProps) {
  const transitions = getNextStatuses(status);
  if (transitions.length === 0) return null;

  const sizeClass =
    size === 'md'
      ? 'text-xs font-medium px-3 py-1.5 rounded-lg'
      : 'text-[11px] font-medium px-2.5 py-1 rounded-lg';

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {transitions.map((trans) => (
        <button
          key={trans.status}
          type="button"
          onClick={(e) => {
            if (stopPropagation) e.stopPropagation();
            onStatusChange(trans.status);
          }}
          className={`${sizeClass} transition ${trans.color}`}
        >
          {trans.label}
        </button>
      ))}
    </div>
  );
}
