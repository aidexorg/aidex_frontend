import { AlertCircle } from 'lucide-react';
import { formatPrice, toFaDigits } from '@/lib/format';
import { TYPE_COLORS } from './constants';
import type { TypeProd } from './types';

interface ProductionByTypeProps {
  typeProd: TypeProd[];
}

const BAR_COLORS: Record<string, string> = {
  consultation: 'bg-sky-400',
  treatment: 'bg-teal-400',
  followup: 'bg-amber-400',
  hygiene: 'bg-emerald-400',
  emergency: 'bg-red-400',
};

export function ProductionByType({ typeProd }: ProductionByTypeProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-3">تولید به تفکیک نوع خدمت</h3>
      {typeProd.length === 0 ? (
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <AlertCircle size={18} className="text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">داده‌ای موجود نیست</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {(() => {
            const totalProd = typeProd.reduce((s, d) => s + d.production, 0);
            return typeProd.map((d) => {
              const pct = totalProd > 0 ? Math.round((d.production / totalProd) * 100) : 0;
              return (
                <div key={d.type} className="card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        TYPE_COLORS[d.type] ?? 'bg-slate-100'
                      }`}>
                        <span className="text-xs font-bold">
                          {d.label.charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-slate-800">
                        {d.label}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-teal-600">
                        {formatPrice(d.production)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {toFaDigits(pct)}%
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className={`${BAR_COLORS[d.type] ?? 'bg-slate-400'} h-1.5 rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
