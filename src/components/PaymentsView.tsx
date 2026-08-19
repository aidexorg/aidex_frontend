import { useState, useEffect, useCallback } from 'react';
import { Wallet, ArrowLeft, User, Search } from 'lucide-react';
import { useData } from '@/data';
import { formatPrice, formatDate, toFaDigits } from '@/lib/format';
import type { Payment, Period, Profile } from '@/types';
import { LoadingState, EmptyState } from './ui';

interface PaymentRow extends Payment {
  profile: Profile | null;
  period: Period | null;
}

interface PaymentsViewProps {
  onOpenProfile: (profile: Profile) => void;
}

export function PaymentsView({ onOpenProfile }: PaymentsViewProps) {
  const data = useData();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [paymentsAsc, periods, profiles] = await Promise.all([
        data.listPayments(),
        data.listPeriods(),
        data.listProfiles(),
      ]);
      const payments = [...paymentsAsc].sort(
        (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      );
      const periodMap = new Map(periods.map((p) => [p.id, p]));
      const profileMap = new Map(profiles.map((p) => [p.id, p]));

      const joined: PaymentRow[] = payments.map((pay) => {
        const period = periodMap.get(pay.period_id) ?? null;
        const profile = period ? (profileMap.get(period.profile_id) ?? null) : null;
        return { ...pay, period, profile };
      });
      setRows(joined);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const name = r.profile ? `${r.profile.first_name} ${r.profile.last_name}` : '';
    return (
      name.toLowerCase().includes(q) ||
      (r.tracking_code ?? '').toLowerCase().includes(q) ||
      (r.description ?? '').toLowerCase().includes(q)
    );
  });

  const totalAmount = filtered.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">پرداخت‌ها</h1>
        <p className="page-sub">لیست تمام پرداخت‌های ثبت‌شده</p>
      </div>

      {/* Summary card */}
      <div className="card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="icon-well bg-emerald-50 text-emerald-600">
            <Wallet size={22} />
          </div>
          <div>
            <div className="text-xs text-slate-400">مجموع پرداخت‌ها</div>
            <div className="text-lg font-bold text-emerald-700">
              {formatPrice(totalAmount)}
            </div>
          </div>
        </div>
        <div className="text-sm text-slate-400">
          {toFaDigits(filtered.length)} تراکنش
        </div>
      </div>

      <div className="relative">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pr-10"
          placeholder="جستجو بر اساس نام بیمار، کد رهگیری یا توضیحات…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Wallet size={48} />}
            title="پرداختی ثبت نشده"
            description="پرداخت‌ها از داخل پرونده بیمار و دوره درمان ثبت می‌شوند."
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map((row) => (
              <button
                key={row.id}
                onClick={() => row.profile && onOpenProfile(row.profile)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-right"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 text-sm font-bold">
                  {toFaDigits(formatDate(row.payment_date).slice(-2) || '—')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">
                      {formatPrice(row.amount)}
                    </span>
                    {row.profile && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <User size={11} />
                        {row.profile.first_name} {row.profile.last_name}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap gap-x-3">
                    <span>{formatDate(row.payment_date)}</span>
                    {row.tracking_code && (
                      <span>کد: {toFaDigits(row.tracking_code)}</span>
                    )}
                    {row.description && <span>{row.description}</span>}
                  </div>
                </div>
                <ArrowLeft size={16} className="text-slate-300 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
