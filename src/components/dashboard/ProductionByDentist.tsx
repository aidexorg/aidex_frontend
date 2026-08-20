import { Users, Stethoscope } from 'lucide-react';
import { formatPrice, toFaDigits } from '@/lib/format';
import type { DentistProd } from './types';

interface ProductionByDentistProps {
  dentistProd: DentistProd[];
}

export function ProductionByDentist({ dentistProd }: ProductionByDentistProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-3">تولید به تفکیک دندانپزشک</h3>
      {dentistProd.length === 0 ? (
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Users size={18} className="text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">داده‌ای موجود نیست</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {(() => {
            const totalProd = dentistProd.reduce((s, d) => s + d.production, 0);
            return dentistProd.map((d) => {
              const pct = totalProd > 0 ? Math.round((d.production / totalProd) * 100) : 0;
              return (
                <div key={d.dentistId} className="card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                        <Stethoscope size={14} className="text-teal-600" />
                      </div>
                      <span className="text-sm font-medium text-slate-800">
                        {d.name}
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
                      className="bg-teal-400 h-1.5 rounded-full transition-all duration-500"
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
