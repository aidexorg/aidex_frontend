import { Pencil, ChevronLeft, Calendar, Layers } from 'lucide-react';
import { formatDate, formatPrice, toFaDigits } from '@/lib/format';
import type { Profile, Period, Session, Part, Action } from '@/types';

interface ProfileTabProps {
  profile: Profile;
  periods: Period[];
  sessions: Session[];
  parts: Part[];
  actions: Action[];
  onEditProfile: () => void;
  onGoReview: () => void;
}

export function ProfileTab({
  profile,
  periods,
  sessions,
  parts,
  actions,
  onEditProfile,
  onGoReview,
}: ProfileTabProps) {
  const recentActions = [...actions]
    .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
    .slice(0, 3);

  const recentSessions = [...sessions]
    .sort((a, b) => b.session_date.localeCompare(a.session_date))
    .slice(0, 3);

  const actionLabel = (action: Action) => {
    const part = parts.find((p) => p.id === action.part_id);
    const tooth = part?.tooth ? part.tooth.slice(2) : '—';
    return `${tooth} | ${action.title}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-7 card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-brand-navy">اطلاعات بیمار</h3>
          <button type="button" onClick={onEditProfile} className="btn-secondary text-xs">
            <Pencil size={14} />
            ویرایش
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <InfoRow label="شماره پرونده" value={profile.file_number ? toFaDigits(profile.file_number) : '—'} />
          <InfoRow label="نام" value={`${profile.first_name} ${profile.last_name}`} />
          <InfoRow label="سال تولد" value={profile.birth_year ? toFaDigits(profile.birth_year) : '—'} />
          <InfoRow label="تلفن" value={profile.phone ? toFaDigits(profile.phone) : '—'} />
          <InfoRow label="کد ملی" value={profile.national_id ? toFaDigits(profile.national_id) : '—'} />
          <InfoRow label="نشانی" value={profile.address || '—'} className="sm:col-span-2" />
          {profile.clinical_notes && (
            <InfoRow label="سابقه پزشکی" value={profile.clinical_notes} className="sm:col-span-2" />
          )}
        </div>

        {recentActions.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h4 className="text-sm font-semibold text-brand-navy mb-3 flex items-center gap-2">
              <Layers size={16} className="text-sage-500" />
              دوره اول درمان
            </h4>
            <ul className="space-y-2">
              {recentActions.map((action) => (
                <li key={action.id} className="flex items-center gap-2 text-sm text-slate-600 py-2 border-b border-slate-50 last:border-0">
                  <span className="text-slate-400 text-xs">{formatDate(action.updated_at ?? '')}</span>
                  <span className="flex-1">{actionLabel(action)}</span>
                  <span className="font-medium">{formatPrice(action.price - action.discount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="lg:col-span-5 card p-6">
        <h3 className="font-semibold text-brand-navy mb-4">جلسات اخیر</h3>
        {recentSessions.length === 0 ? (
          <p className="text-sm text-slate-400">{periods.length === 0 ? 'دوره درمانی ثبت نشده.' : 'جلسه‌ای ثبت نشده.'}</p>
        ) : (
          <ul className="space-y-3">
            {recentSessions.map((session) => (
              <li key={session.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar size={14} className="text-sage-500" />
                  <span className="font-medium">{formatDate(session.session_date)}</span>
                </div>
                <button type="button" onClick={onGoReview} className="btn-secondary w-full mt-2 text-xs py-1.5">
                  مشاهده ریویو
                  <ChevronLeft size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-slate-700">{value}</p>
    </div>
  );
}
