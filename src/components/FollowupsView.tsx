import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Clock, User, ArrowLeft } from 'lucide-react';
import { useData } from '@/data';
import { loadFollowupItems, type FollowupItem } from '@/lib/followups';
import { formatPrice, formatDate, toFaDigits } from '@/lib/format';
import { INCOMPLETE_REASONS } from '@/types';
import type { Profile } from '@/types';
import { LoadingState, EmptyState } from './ui';

interface FollowupsViewProps {
  onOpenProfile: (profile: Profile) => void;
}

export function FollowupsView({ onOpenProfile }: FollowupsViewProps) {
  const data = useData();
  const [items, setItems] = useState<FollowupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'incomplete' | 'followup'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await loadFollowupItems(data));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = items.filter((item) => {
    if (filter === 'incomplete') return item.action.status === 'incomplete';
    if (filter === 'followup') return item.action.needs_followup;
    return true;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">پیگیری‌ها</h1>
        <p className="page-sub">
          اقدامات ناقص یا نیازمند پیگیری
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all' as const, label: 'همه', count: items.length },
          {
            key: 'incomplete' as const,
            label: 'ناقص',
            count: items.filter((i) => i.action.status === 'incomplete').length,
          },
          {
            key: 'followup' as const,
            label: 'نیازمند پیگیری',
            count: items.filter((i) => i.action.needs_followup).length,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={filter === tab.key ? 'chip-active' : 'chip'}
          >
            {tab.label} ({toFaDigits(tab.count)})
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<AlertCircle size={48} />}
            title="موردی برای پیگیری وجود ندارد"
            description="همه‌ی اقدامات کامل شده‌اند و پیگیری‌ای باقی نمانده."
          />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(({ action, part, session, period, profile }) => (
            <button
              key={action.id}
              onClick={() => onOpenProfile(profile)}
              className="card p-4 w-full text-right hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-3"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  action.status === 'incomplete'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-red-50 text-red-600'
                }`}
              >
                {action.status === 'incomplete' ? <Clock size={20} /> : <AlertCircle size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">{action.title}</span>
                  {action.status === 'incomplete' && (
                    <span className="badge bg-amber-100 text-amber-700">ناقص</span>
                  )}
                  {action.needs_followup && (
                    <span className="badge bg-red-100 text-red-700">پیگیری</span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-3">
                  <span className="flex items-center gap-1">
                    <User size={11} />
                    {profile.first_name} {profile.last_name}
                  </span>
                  <span>جلسه {toFaDigits(session.session_number)}</span>
                  <span>بخش {toFaDigits(part.part_number)}</span>
                  <span>{formatDate(session.session_date)}</span>
                </div>
                {action.incomplete_reason && (
                  <div className="text-xs text-amber-600 mt-1">
                    دلیل: {INCOMPLETE_REASONS.find(r => r.value === action.incomplete_reason)?.label ?? action.incomplete_reason}
                  </div>
                )}
              </div>
              <div className="text-left shrink-0">
                <div className="text-sm font-medium text-slate-600">
                  {formatPrice(action.price - action.discount)}
                </div>
                <ArrowLeft size={16} className="text-slate-300 mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
