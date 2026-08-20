import { CalendarDays, Users, CheckCircle2, Activity, Stethoscope } from 'lucide-react';

interface QuickActionsProps {
  onNavigate?: (view: string) => void;
}

export function QuickActions({ onNavigate }: QuickActionsProps) {
  const actions = [
    { label: 'نوبت جدید', icon: CalendarDays, action: () => onNavigate?.('appointments'), bg: 'bg-teal-50 hover:bg-teal-100', iconColor: 'text-teal-600' },
    { label: 'بیمار جدید', icon: Users, action: () => onNavigate?.('profiles'), bg: 'bg-sky-50 hover:bg-sky-100', iconColor: 'text-sky-600' },
    { label: 'ثبت پرداخت', icon: CheckCircle2, action: () => onNavigate?.('payments'), bg: 'bg-emerald-50 hover:bg-emerald-100', iconColor: 'text-emerald-600' },
    { label: 'جستجو', icon: Stethoscope, action: () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })), bg: 'bg-amber-50 hover:bg-amber-100', iconColor: 'text-amber-600' },
    { label: 'گزارش روزانه', icon: Activity, action: () => onNavigate?.('reports'), bg: 'bg-purple-50 hover:bg-purple-100', iconColor: 'text-purple-600' },
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-3">دسترسی سریع</h3>
      <div className="grid grid-cols-5 gap-2">
        {actions.map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition ${item.bg}`}
          >
            <item.icon size={20} className={item.iconColor} />
            <span className="text-[10px] font-medium text-slate-700">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
