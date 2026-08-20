import { Activity, CheckCircle2 } from 'lucide-react';
import { formatPrice, toFaDigits } from '@/lib/format';
import type { FinancialMetrics } from './types';

interface FinancialMetricsProps {
  financial: FinancialMetrics;
}

export function FinancialMetricsCard({ financial }: FinancialMetricsProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-slate-500">تولید امروز</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {formatPrice(financial.production)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <Activity size={18} className="text-teal-600" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400">ارزش کل درمان‌های تکمیل شده</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-slate-500">وصول امروز</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {formatPrice(financial.collections)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-emerald-600" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400">مبلغ واریزی دریافت شده</p>
        </div>
      </div>

      {financial.production > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-700">نرخ وصول</h3>
            <span className="text-sm font-bold text-teal-600">
              {toFaDigits(Math.round((financial.collections / financial.production) * 100))}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5">
            <div
              className="bg-teal-500 h-2.5 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (financial.collections / financial.production) * 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-slate-400">
            <span>وصول: {formatPrice(financial.collections)}</span>
            <span>تولید: {formatPrice(financial.production)}</span>
          </div>
        </div>
      )}
    </>
  );
}
