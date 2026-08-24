export type PatientStatus = 'active' | 'in_treatment' | 'appointment_needed';

const CONFIG: Record<
  PatientStatus,
  { label: string; className: string; dot: string }
> = {
  active: {
    label: 'فعال',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    dot: 'bg-emerald-500',
  },
  in_treatment: {
    label: 'در حال درمان',
    className: 'bg-blue-50 text-blue-700 border-blue-100',
    dot: 'bg-blue-500',
  },
  appointment_needed: {
    label: 'نوبت لازم',
    className: 'bg-amber-50 text-amber-700 border-amber-100',
    dot: 'bg-amber-500',
  },
};

interface StatusPillProps {
  status: PatientStatus;
  className?: string;
}

export function StatusPill({ status, className = '' }: StatusPillProps) {
  const cfg = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${cfg.className} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} aria-hidden />
      {cfg.label}
    </span>
  );
}

export function getStatusLabel(status: PatientStatus): string {
  return CONFIG[status].label;
}
