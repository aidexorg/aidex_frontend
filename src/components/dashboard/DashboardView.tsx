import {
  ArrowLeft,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SkeletonProfileList } from '../Skeleton';
import { useWelcomeDashboardData } from './useWelcomeDashboardData';
import { formatDate, formatPrice, toFaDigits } from '@/lib/format';
import { StatCard } from '@/components/design';
import { TodayAppointments } from './TodayAppointments';
import { ArrivalsQueue } from './ArrivalsQueue';
import { BalanceAlerts } from './BalanceAlerts';
import { ARAging } from './ARAging';
import { MonthlySummaryCard } from './MonthlySummaryCard';
import type { FollowupItem } from '@/lib/followups';
import type { Profile } from '@/types';
import type { View } from '../Layout';

interface DashboardViewProps {
  onOpenProfile?: (profile: Profile) => void;
  onNavigate?: (view: View) => void;
}

interface ActionStatProps {
  label: string;
  value: string;
  icon: LucideIcon;
  hint: string;
  ariaLabel: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

function ActionStat({ label, value, icon, hint, ariaLabel, onClick, variant }: ActionStatProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="block w-full text-right rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
    >
      <StatCard
        label={label}
        value={value}
        icon={icon}
        variant={variant}
        className="h-full transition-shadow hover:shadow-md"
        footer={
          <span className="inline-flex items-center gap-1">
            {hint}
            <ArrowLeft size={12} aria-hidden="true" />
          </span>
        }
      />
    </button>
  );
}

function FollowupsPanel({
  items,
  onOpenProfile,
}: {
  items: FollowupItem[];
  onOpenProfile?: (profile: Profile) => void;
}) {
  return (
    <section aria-label="نیازمند پیگیری">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">نیازمند پیگیری</h3>
        {items.length > 0 && (
          <span className="inline-flex items-center justify-center px-2 h-5 text-[10px] font-bold text-white bg-amber-500 rounded-full">
            {toFaDigits(items.length)}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center dark:bg-slate-700">
            <ClipboardList size={18} className="text-slate-400" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">اقدام درمانی معوقی وجود ندارد</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 6).map((item) => (
            <li key={item.action.id}>
              <button
                type="button"
                onClick={() => onOpenProfile?.(item.profile)}
                aria-label={`باز کردن پرونده ${item.profile.first_name} ${item.profile.last_name}`}
                className="w-full text-right card p-3 flex items-center gap-3 hover:bg-slate-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-400 dark:hover:bg-slate-700/50"
              >
                <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate dark:text-slate-100">
                    {item.profile.first_name} {item.profile.last_name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50">
                      {item.action.needs_followup ? 'پیگیری' : 'ناقص'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDate(item.session.session_date)}
                    </span>
                  </div>
                </div>
                <ArrowLeft size={14} className="text-slate-400 shrink-0" aria-hidden="true" />
              </button>
            </li>
          ))}
          {items.length > 6 && (
            <li className="text-center text-xs text-slate-400 pt-1">
              و {toFaDigits(items.length - 6)} مورد دیگر
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

function NeedsAttentionPanel({
  profiles,
  onOpenProfile,
}: {
  profiles: Profile[];
  onOpenProfile?: (profile: Profile) => void;
}) {
  return (
    <section aria-label="بیماران نیازمند زمان‌بندی نوبت">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">نیازمند نوبت</h3>
        {profiles.length > 0 && (
          <span className="inline-flex items-center justify-center px-2 h-5 text-[10px] font-bold text-white bg-sky-500 rounded-full">
            {toFaDigits(profiles.length)}
          </span>
        )}
      </div>

      {profiles.length === 0 ? (
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center dark:bg-slate-700">
            <UserPlus size={18} className="text-slate-400" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">بیماری نیازمند زمان‌بندی نیست</p>
        </div>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {profiles.slice(0, 8).map((profile) => (
            <li key={profile.id}>
              <button
                type="button"
                onClick={() => onOpenProfile?.(profile)}
                aria-label={`باز کردن پرونده ${profile.first_name} ${profile.last_name}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-sky-200 bg-sky-50 text-sky-700 text-xs font-medium hover:bg-sky-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-sky-800/50 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-950/60"
              >
                <UserPlus size={12} aria-hidden="true" />
                {profile.first_name} {profile.last_name}
              </button>
            </li>
          ))}
          {profiles.length > 8 && (
            <li className="self-center text-xs text-slate-400">
              و {toFaDigits(profiles.length - 8)} بیمار دیگر
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

export function DashboardView({ onOpenProfile, onNavigate }: DashboardViewProps) {
  const {
    loading,
    account,
    stats,
    arrivals,
    todayAppointments,
    weekCount,
    totalOutstanding,
    balanceByProfileId,
    arItems,
    balanceAlerts,
    monthly,
    followups,
    needsAttention,
    handleStartTreatment,
  } = useWelcomeDashboardData();

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonProfileList count={3} />
      </div>
    );
  }

  const doctorName = account?.display_name?.split(' ')[0] ?? 'فرهمند';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative card p-6 overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-sage-100/50 rounded-full -translate-x-1/2 -translate-y-1/2 dark:bg-sage-800/30" />
        <div className="relative flex flex-wrap items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-sage-100 border-4 border-white shadow-md flex items-center justify-center dark:bg-sage-900/50 dark:border-slate-700">
            <Users size={28} className="text-sage-500 dark:text-sage-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-brand-navy flex items-center gap-2 dark:text-slate-100">
              <span className="w-2 h-2 rounded-full bg-sage-500" />
              خوش آمدید دکتر {doctorName}
            </h1>
            <p className="text-slate-500 mt-1 text-sm dark:text-slate-400">مرکز مدیریت کلینیک دندانپزشکی AIDEX</p>
          </div>
        </div>
      </div>

      <section aria-label="شاخص‌های کلیدی" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ActionStat
          label="نوبت امروز"
          value={`${toFaDigits(stats.total)} نوبت`}
          icon={CalendarDays}
          hint="مشاهده تقویم"
          ariaLabel={`${toFaDigits(stats.total)} نوبت امروز — مشاهده تقویم نوبت‌ها`}
          onClick={() => onNavigate?.('appointments')}
        />
        <ActionStat
          label="نوبت این هفته"
          value={`${toFaDigits(weekCount)} نوبت`}
          icon={CalendarRange}
          hint="مشاهده تقویم"
          ariaLabel={`${toFaDigits(weekCount)} نوبت این هفته — مشاهده تقویم نوبت‌ها`}
          onClick={() => onNavigate?.('appointments')}
        />
        <ActionStat
          label="بیمار فعال امروز"
          value={`${toFaDigits(stats.active)} بیمار`}
          icon={Users}
          hint="مشاهده تقویم"
          ariaLabel={`${toFaDigits(stats.active)} بیمار فعال امروز — مشاهده تقویم نوبت‌ها`}
          onClick={() => onNavigate?.('appointments')}
        />
        <ActionStat
          label="مانده پرداخت‌نشده"
          value={formatPrice(totalOutstanding)}
          icon={Wallet}
          variant="danger"
          hint="مشاهده پرونده‌ها"
          ariaLabel={`مانده پرداخت‌نشده ${formatPrice(totalOutstanding)} — مشاهده پرونده‌ها`}
          onClick={() => onNavigate?.('profiles')}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TodayAppointments
            appointments={todayAppointments}
            balanceByProfileId={balanceByProfileId}
            onOpenProfile={onOpenProfile}
            onNavigate={() => onNavigate?.('appointments')}
            maxItems={6}
          />
          <section aria-label="خلاصه مالی ماهانه">
            <MonthlySummaryCard monthly={monthly} />
          </section>
          <section aria-label="بدهی معوق بیماران">
            <ARAging arItems={arItems} />
          </section>
        </div>

        <div className="space-y-6">
          <section aria-label="بیماران در انتظار">
            <ArrivalsQueue
              arrivals={arrivals}
              onStartTreatment={handleStartTreatment}
              onNavigate={() => onNavigate?.('appointments')}
            />
          </section>
          <section aria-label="بدهی‌های امروز">
            <BalanceAlerts alerts={balanceAlerts} onNavigate={() => onNavigate?.('profiles')} />
          </section>
          <FollowupsPanel items={followups} onOpenProfile={onOpenProfile} />
          <NeedsAttentionPanel profiles={needsAttention} onOpenProfile={onOpenProfile} />
        </div>
      </div>
    </div>
  );
}
