import { CalendarDays, ChevronLeft, FolderOpen, Users, Wallet } from 'lucide-react';
import { SkeletonProfileList } from '../Skeleton';
import { useWelcomeDashboardData } from './useWelcomeDashboardData';
import { formatPrice, toFaDigits } from '@/lib/format';
import type { Profile } from '@/types';
import type { View } from '../Layout';

interface DashboardViewProps {
  onOpenProfile?: (profile: Profile) => void;
  onNavigate?: (view: View) => void;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const { loading, account, stats, arrivals, totalOutstanding } = useWelcomeDashboardData();

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonProfileList count={3} />
      </div>
    );
  }

  const doctorName = account?.display_name?.split(' ')[0] ?? 'فرهمند';

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="relative card p-8 overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-sage-100/50 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="relative flex flex-wrap items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-sage-100 border-4 border-white shadow-md flex items-center justify-center">
            <Users size={32} className="text-sage-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sage-500" />
              خوش آمدید دکتر {doctorName}
            </h1>
            <p className="text-slate-500 mt-1">مرکز مدیریت کلینیک دندانپزشکی AIDEX</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onNavigate?.('profiles')}
          className="card p-6 text-right hover:shadow-lg hover:border-sage-200 transition-all group"
        >
          <div className="icon-well bg-sage-50 text-sage-600 mb-4">
            <FolderOpen size={24} />
          </div>
          <h3 className="font-bold text-brand-navy text-lg">فهرست پرونده‌ها</h3>
          <p className="text-sm text-slate-500 mt-1">مشاهده و مدیریت پرونده‌های بیماران</p>
          <span className="inline-flex items-center gap-1 mt-4 text-sm text-sage-600 font-medium group-hover:gap-2 transition-all">
            مشاهده پرونده‌ها
            <ChevronLeft size={16} />
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.('appointments')}
          className="card p-6 text-right hover:shadow-lg hover:border-sage-200 transition-all group"
        >
          <div className="icon-well bg-sage-50 text-sage-600 mb-4">
            <CalendarDays size={24} />
          </div>
          <h3 className="font-bold text-brand-navy text-lg">تقویم نوبت‌ها</h3>
          <p className="text-sm text-slate-500 mt-1">برنامه‌ریزی و مدیریت نوبت‌های بیماران</p>
          <span className="inline-flex items-center gap-1 mt-4 text-sm text-sage-600 font-medium group-hover:gap-2 transition-all">
            مشاهده تقویم
            <ChevronLeft size={16} />
          </span>
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-x-reverse divide-slate-100">
          <div className="p-5 flex items-center gap-4">
            <div className="icon-well bg-blue-50 text-blue-600">
              <CalendarDays size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">نوبت امروز</p>
              <p className="text-xl font-bold text-brand-navy">{toFaDigits(stats.total)} نوبت</p>
            </div>
          </div>
          <div className="p-5 flex items-center gap-4">
            <div className="icon-well bg-sage-50 text-sage-600">
              <Users size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">بیمار فعال</p>
              <p className="text-xl font-bold text-brand-navy">{toFaDigits(stats.active)} بیمار</p>
            </div>
          </div>
          <div className="p-5 flex items-center gap-4">
            <div className="icon-well bg-amber-50 text-amber-600">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">مانده پرداخت نشده</p>
              <p className="text-xl font-bold text-brand-navy">{formatPrice(totalOutstanding)}</p>
            </div>
          </div>
        </div>
      </div>

      {arrivals.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-brand-navy mb-3">صف ورود امروز</h3>
          <ul className="space-y-2">
            {arrivals.slice(0, 5).map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between text-sm py-2 border-b border-slate-50 last:border-0"
              >
                <span className="font-medium">
                  {a.profile ? `${a.profile.first_name} ${a.profile.last_name}` : '—'}
                </span>
                <span className="text-slate-400">{a.start_time.slice(11, 16)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
