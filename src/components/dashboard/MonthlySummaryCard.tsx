import { formatPrice, toFaDigits } from '@/lib/format';
import type { MonthlySummary } from './types';

interface MonthlySummaryCardProps {
  monthly: MonthlySummary;
}

export function MonthlySummaryCard({ monthly }: MonthlySummaryCardProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-3">خلاصه مالی ماهانه</h3>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card p-3 text-center">
          <p className="text-[10px] text-slate-500 mb-1">تولید</p>
          <p className="text-lg font-bold text-teal-600">
            {formatPrice(monthly.production)}
          </p>
          {monthly.prevProduction > 0 && (
            <p className="text-[10px] text-slate-400 mt-1">
              {monthly.production >= monthly.prevProduction ? '↑' : '↓'}{' '}
              {toFaDigits(Math.abs(Math.round(((monthly.production - monthly.prevProduction) / monthly.prevProduction) * 100)))}%
            </p>
          )}
        </div>
        <div className="card p-3 text-center">
          <p className="text-[10px] text-slate-500 mb-1">وصول</p>
          <p className="text-lg font-bold text-emerald-600">
            {formatPrice(monthly.collections)}
          </p>
          {monthly.prevCollections > 0 && (
            <p className="text-[10px] text-slate-400 mt-1">
              {monthly.collections >= monthly.prevCollections ? '↑' : '↓'}{' '}
              {toFaDigits(Math.abs(Math.round(((monthly.collections - monthly.prevCollections) / monthly.prevCollections) * 100)))}%
            </p>
          )}
        </div>
        <div className="card p-3 text-center">
          <p className="text-[10px] text-slate-500 mb-1">نرخ وصول</p>
          <p className="text-lg font-bold text-slate-800">
            {toFaDigits(monthly.rate)}%
          </p>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
            <div
              className="bg-teal-500 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, monthly.rate)}%` }}
            />
          </div>
        </div>
      </div>

      {monthly.dailyTotals.length > 0 && (
        <div className="card p-4">
          <h4 className="text-xs font-semibold text-slate-600 mb-3">۷ روز اخیر</h4>
          <div className="flex items-end gap-2 h-32">
            {monthly.dailyTotals.map((day) => {
              const maxVal = Math.max(
                ...monthly.dailyTotals.map((d) => Math.max(d.production, d.collections)),
                1
              );
              const prodHeight = (day.production / maxVal) * 100;
              const collHeight = (day.collections / maxVal) * 100;
              const dayLabel = day.date.slice(8, 10);

              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex items-end gap-0.5 h-24">
                    <div
                      className="w-3 bg-teal-400 rounded-t"
                      style={{ height: `${prodHeight}%` }}
                      title={`تولید: ${formatPrice(day.production)}`}
                    />
                    <div
                      className="w-3 bg-emerald-400 rounded-t"
                      style={{ height: `${collHeight}%` }}
                      title={`وصول: ${formatPrice(day.collections)}`}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400">
                    {toFaDigits(parseInt(dayLabel))}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-2 bg-teal-400 rounded" />
              <span className="text-[10px] text-slate-500">تولید</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-2 bg-emerald-400 rounded" />
              <span className="text-[10px] text-slate-500">وصول</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
