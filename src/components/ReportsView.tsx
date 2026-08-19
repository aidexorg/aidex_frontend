import { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, Calendar, Wallet } from 'lucide-react';
import { useData } from '@/data';
import { formatPrice, formatMonthYear, toFaDigits } from '@/lib/format';
import { LoadingState, EmptyState } from './ui';

/** text.txt §1_2 — English amount with one decimal */
function formatIncomeAmount(amount: number): string {
  return (amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
};

function toSuperscriptCount(n: number): string {
  return String(n)
    .split('')
    .map((d) => SUPERSCRIPT_DIGITS[d] ?? d)
    .join('');
}

/** `[month]/[year]` for income template header */
function formatIncomeMonthYear(monthKey: string): string {
  const date = new Date(`${monthKey}-01T12:00:00`);
  const parts = new Intl.DateTimeFormat('fa-IR', {
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(date);
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  return `${month}/${year}`;
}

function avgIncomePerUnit(total: number, count: number): string {
  if (count <= 0) return '0.0';
  return (total / count).toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

interface MonthAgg {
  key: string;
  label: string;
  monthYear: string;
  income: number;
  billed: number;
  paymentCount: number;
  directSum: number;
  share: number;
  claim: number;
  /** نوبت (درآمد) = actions by session date; `[ ]` payment-only rows deferred */
  appointmentCount: number;
  /** distinct session dates with ≥1 action in month */
  dayCount: number;
}

function emptyMonth(key: string, label: string): MonthAgg {
  return {
    key,
    label,
    monthYear: formatIncomeMonthYear(key),
    income: 0,
    billed: 0,
    paymentCount: 0,
    directSum: 0,
    share: 0,
    claim: 0,
    appointmentCount: 0,
    dayCount: 0,
  };
}

function ensureMonth(map: Map<string, MonthAgg>, key: string, labelSource: string): MonthAgg {
  if (!map.has(key)) {
    map.set(key, emptyMonth(key, formatMonthYear(`${labelSource}-01`)));
  }
  return map.get(key)!;
}

export function ReportsView() {
  const data = useData();
  const [months, setMonths] = useState<MonthAgg[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalBilled, setTotalBilled] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [payments, actions, parts, sessions] = await Promise.all([
        data.listPayments(),
        data.listActions(),
        data.listParts(),
        data.listSessions(),
        data.listPeriods(),
      ]);

      const monthMap = new Map<string, MonthAgg>();
      const daysByMonth = new Map<string, Set<string>>();

      for (const pay of payments) {
        const key = pay.payment_date.slice(0, 7);
        const m = ensureMonth(monthMap, key, pay.payment_date);
        m.income += pay.amount;
        m.paymentCount += 1;
        if (pay.direct_to_dentist) m.directSum += pay.amount;
      }

      const partMap = new Map(parts.map((p) => [p.id, p]));
      const sessionMap = new Map(sessions.map((s) => [s.id, s]));

      for (const action of actions) {
        const part = partMap.get(action.part_id);
        if (!part) continue;
        const session = sessionMap.get(part.session_id);
        if (!session) continue;

        const key = session.session_date.slice(0, 7);
        const m = ensureMonth(monthMap, key, session.session_date);
        m.billed += action.price - action.discount;
        m.appointmentCount += 1;

        if (!daysByMonth.has(key)) daysByMonth.set(key, new Set());
        daysByMonth.get(key)!.add(session.session_date);
      }

      for (const [key, days] of daysByMonth) {
        const m = monthMap.get(key);
        if (m) m.dayCount = days.size;
      }

      for (const m of monthMap.values()) {
        m.share = m.income * 0.45;
        m.claim = m.share - m.directSum;
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
  }, [data]);

  useEffect(() => {
    load();
  }, [load]);

  const maxIncome = Math.max(...months.map((m) => m.income), 1);

  const hasReportData = (m: MonthAgg) =>
    m.income > 0 || m.appointmentCount > 0 || m.billed > 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">گزارش درآمد</h1>
        <p className="page-sub">تحلیل درآمد و هزینه‌های صورت‌شده ماهانه</p>
      </div>

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
        <>
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
                    <span>{toFaDigits(m.paymentCount)} تراکنش</span>
                    <span>صورت‌حساب: {formatPrice(m.billed)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5 space-y-6">
            <h3 className="text-sm font-semibold text-slate-700">ارزیابی درآمد (text.txt §۱_۲)</h3>
            {months.filter(hasReportData).map((m) => (
              <div
                key={`tpl-${m.key}`}
                className="font-mono text-sm text-slate-700 border border-slate-100 rounded-lg p-4 bg-slate-50/80 space-y-1"
              >
                <div className="border-t border-b border-slate-200 py-2 my-1 text-center text-xs text-slate-400 tracking-widest">
                  ─────────────────
                </div>
                <p className="font-bold text-center">
                  [{m.monthYear}] = {formatIncomeAmount(m.income)}
                </p>
                <div className="border-t border-b border-slate-200 py-2 my-1 text-center text-xs text-slate-400 tracking-widest">
                  ─────────────────
                </div>
                <p>• سهم دندانپزشک = {formatIncomeAmount(m.share)}</p>
                <p>• مستقیماً از بیمار = {formatIncomeAmount(m.directSum)}</p>
                <p>• مطالبه باقیمانده = {formatIncomeAmount(m.claim)}</p>
                <p className="pt-1">
                  {toSuperscriptCount(m.appointmentCount)}نوبت/
                  {avgIncomePerUnit(m.income, m.appointmentCount)}
                  {'  '}
                  {toSuperscriptCount(m.dayCount)}روز/{avgIncomePerUnit(m.income, m.dayCount)}
                </p>
                <div className="border-t border-slate-200 pt-2 mt-2 text-center text-xs text-slate-400 tracking-widest">
                  ─────────────────
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
