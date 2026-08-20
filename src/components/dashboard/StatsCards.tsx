import { CalendarDays, Clock, Activity, CheckCircle2 } from 'lucide-react';
import { toFaDigits } from '@/lib/format';
import type { DashboardStats } from './types';

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      icon: CalendarDays,
      value: stats.total,
      label: 'کل نوبت‌ها',
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      valueColor: 'text-slate-900',
    },
    {
      icon: Clock,
      value: stats.upcoming,
      label: 'در انتظار',
      iconBg: 'bg-sky-100',
      iconColor: 'text-sky-600',
      valueColor: 'text-sky-700',
    },
    {
      icon: Activity,
      value: stats.active,
      label: 'فعال',
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
      valueColor: 'text-teal-700',
    },
    {
      icon: CheckCircle2,
      value: stats.completed,
      label: 'تکمیل شده',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-700',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="card p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center`}>
              <card.icon size={18} className={card.iconColor} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${card.valueColor}`}>
                {toFaDigits(card.value)}
              </p>
              <p className="text-xs text-slate-500">{card.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
