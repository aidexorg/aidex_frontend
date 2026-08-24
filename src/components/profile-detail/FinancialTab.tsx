import { formatPrice } from '@/lib/format';
import { computeFinancialSummary } from '@/lib/profileOutput';
import type { Action, Payment } from '@/types';
import { StatCard } from '../design';
import { Wallet, Tag, Shield, Receipt, CreditCard } from 'lucide-react';

interface FinancialTabProps {
  actions: Action[];
  payments: Payment[];
}

function CapsuleBar({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-16 h-48 rounded-full border-2 border-slate-100 overflow-hidden flex flex-col-reverse bg-slate-50">
        {segments.map((seg) => {
          const pct = (seg.value / total) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={seg.label}
              className={`w-full transition-all ${seg.color}`}
              style={{ height: `${pct}%` }}
              title={`${seg.label}: ${formatPrice(seg.value)}`}
            />
          );
        })}
      </div>
      <ul className="space-y-2 text-xs w-full">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${seg.color}`} />
            <span className="text-slate-500 flex-1">{seg.label}</span>
            <span className="font-medium text-slate-700">{formatPrice(seg.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FinancialTab({ actions, payments }: FinancialTabProps) {
  const fin = computeFinancialSummary(actions, payments);

  const costSegments = [
    { label: 'درمان‌های انجام شده', value: fin.performed, color: 'bg-sage-400' },
    { label: 'درمان‌های برنامه‌ریزی', value: fin.planned, color: 'bg-blue-300' },
    { label: 'سایر هزینه‌ها', value: fin.otherCosts, color: 'bg-amber-300' },
  ];

  const paySegments = [
    { label: 'پرداخت‌های انجام شده', value: fin.paid, color: 'bg-sage-400' },
    { label: 'تخفیف‌ها', value: fin.discounts, color: 'bg-blue-200' },
    { label: 'چک / بیمه', value: fin.insurance, color: 'bg-purple-300' },
  ];

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div>
            <h4 className="text-sm font-semibold text-brand-navy mb-4 text-center">هزینه‌ها</h4>
            <CapsuleBar segments={costSegments} />
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="card border-2 border-red-200 p-4 text-center min-w-[160px]">
              <p className="text-xs text-red-500 mb-1">بدهی بیمار</p>
              <p className="text-xl font-bold text-red-600">{formatPrice(Math.max(0, fin.debt))}</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-brand-navy mb-4 text-center">پرداخت‌ها و تخفیف‌ها</h4>
            <CapsuleBar segments={paySegments} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="جمع کل هزینه‌ها" value={formatPrice(fin.totalCosts)} icon={Receipt} />
        <StatCard label="جمع کل پرداخت‌ها" value={formatPrice(fin.paid)} icon={CreditCard} />
        <StatCard label="تخفیف‌ها" value={formatPrice(fin.discounts)} icon={Tag} />
        <StatCard label="چک / بیمه" value={formatPrice(fin.insurance)} icon={Shield} />
        <StatCard label="بدهی بیمار" value={formatPrice(Math.max(0, fin.debt))} icon={Wallet} variant="danger" />
      </div>
    </div>
  );
}
