import { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, Calendar, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice, formatMonthYear, toFaDigits } from '@/lib/format';
import type { Payment, Action, Part, Session, Period } from '@/types';
import { LoadingState, EmptyState } from './ui';

interface MonthAgg {
  key: string;
  label: string;
  income: number;
  billed: number;
  count: number;
}

export function ReportsView() {
  const [months, setMonths] = useState<MonthAgg[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalBilled, setTotalBilled] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [payRes, aRes, pRes, sRes, perRes] = await Promise.all([
        supabase.from('payments').select('*'),
        supabase.from('actions').select('*'),
        supabase.from('parts').select('*'),
        supabase.from('sessions').select('*'),
        supabase.from('periods').select('*'),
      ]);
      if (payRes.error || aRes.error || pRes.error || sRes.error || perRes.error) {
        throw new Error('خطا');
      }
      const payments = (payRes.data ?? []) as Payment[];
      const actions = (aRes.data ?? []) as Action[];
      const parts = (pRes.data ?? []) as Part[];
      const sessions = (sRes.data ?? []) as Session[];
      const periods = (perRes.data ?? []) as Period[];

      // Income by month
      const monthMap = new Map<string, MonthAgg>();
      for (const pay of payments) {
        const key = pay.payment_date.slice(0, 7); // YYYY-MM
        if (!monthMap.has(key)) {
          monthMap.set(key, {
            key,
            label: formatMonthYear(pay.payment_date + '-01'),
            income: 0,
            billed: 0,
            count: 0,
          });
        }
        const m = monthMap.get(key)!;
        m.income += pay.amount;
        m.count += 1;
      }

      // Billed by month — derive from actions via session date
      const partMap = new Map(parts.map((p) => [p.id, p]));
      const sessionMap = new Map(sessions.map((s) => [s.id, s]));
      const periodMap = new Map(periods.map((p) => [p.id, p]));
      for (const action of actions) {
        const part = partMap.get(action.part_id);
        if (!part) continue;
        const session = sessionMap.get(part.session_id);
        if (!session) continue;
        const period = periodMap.get(session.period_id);
        if (!period) continue;
        const key = session.session_date.slice(0, 7);
        if (!monthMap.has(key)) {
          monthMap.set(key, {
            key,
            label: formatMonthYear(session.session_date + '-01'),
            income: 0,
            billed: 0,
            count: 0,
          });
        }
        monthMap.get(key)!.billed += action.price - action.discount;
      }

      const sorted = Array.from(monthMap.values()).sort((a, b) => b.key.localeCompare(a.key));
      setMonths(sorted);
      setTotalIncome(payments.reduce((s, p) => s + p.amount, 0));
      setTotalBilled(actions.reduce((s, a) => s + (a.price - a.discount), 0));
    } catch {
      setMonths([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const maxIncome = Math.max(...months.map((m) => m.income), 1);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">گزارش درآمد</h1>
        <p className="text-sm text-slate-400 mt-0.5">تحلیل درآمد و هزینه‌های صورت‌شده ماهانه</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Wallet size={14} />
            مجموع درآمد
          </div>
          <div className="text-xl font-bold text-emerald-700">{formatPrice(totalIncome)}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <TrendingUp size={14} />
            مجموع صورت‌حساب
          </div>
          <div className="text-xl font-bold text-slate-700">{formatPrice(totalBilled)}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Calendar size={14} />
            مطالبات معوق
          </div>
          <div className="text-xl font-bold text-red-600">
            {formatPrice(totalBilled - totalIncome)}
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : months.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<BarChart3 size={48} />}
            title="داده‌ای برای گزارش وجود ندارد"
            description="پس از ثبت جلسات و پرداخت‌ها، گزارش درآمد اینجا نمایش داده می‌شود."
          />
        </div>
      ) : (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">درآمد ماهانه</h3>
          <div className="space-y-3">
            {months.map((m) => (
              <div key={m.key}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-600 font-medium">{m.label}</span>
                  <span className="text-slate-500">{formatPrice(m.income)}</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-l from-teal-400 to-teal-600 rounded-full transition-all duration-500"
                    style={{ width: `${(m.income / maxIncome) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                  <span>{toFaDigits(m.count)} تراکنش</span>
                  <span>صورت‌حساب: {formatPrice(m.billed)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
