import { Stethoscope } from 'lucide-react';
import { formatDate, toFaDigits } from '@/lib/format';
import { todayISODate, getGreeting } from './helpers';

interface DashboardHeaderProps {
  displayName: string | null;
}

export function DashboardHeader({ displayName }: DashboardHeaderProps) {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {getGreeting()} {displayName ?? ''}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {formatDate(todayISODate())} — ساعت {toFaDigits(currentTime)}
        </p>
      </div>
      <div className="hidden sm:flex items-center gap-2">
        <div className="icon-well bg-teal-50 text-teal-700">
          <Stethoscope size={20} />
        </div>
      </div>
    </div>
  );
}
