import { AlertCircle } from 'lucide-react';
import { formatPrice, toFaDigits } from '@/lib/format';
import type { ARItem } from './types';

interface ARAgingProps {
  arItems: ARItem[];
}

export function ARAging({ arItems }: ARAgingProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-700">بدهی معوق</h3>
          {arItems.length > 0 && (
            <span className="inline-flex items-center justify-center px-2 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full">
              {formatPrice(arItems.reduce((sum, item) => sum + item.balance, 0))}
            </span>
          )}
        </div>
      </div>

      {arItems.length === 0 ? (
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <AlertCircle size={18} className="text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">بدهی معوقی وجود ندارد</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {arItems.slice(0, 10).map((item) => {
            const bucket =
              item.daysOverdue <= 30
                ? 'bg-amber-50 border-amber-200'
                : item.daysOverdue <= 60
                  ? 'bg-orange-50 border-orange-200'
                  : item.daysOverdue <= 90
                    ? 'bg-red-50 border-red-200'
                    : 'bg-red-100 border-red-300';

            const dotColor =
              item.daysOverdue <= 30
                ? 'bg-amber-400'
                : item.daysOverdue <= 60
                  ? 'bg-orange-400'
                  : item.daysOverdue <= 90
                    ? 'bg-red-400'
                    : 'bg-red-600';

            const daysLabel =
              item.daysOverdue <= 30
                ? '۰–۳۰ روز'
                : item.daysOverdue <= 60
                  ? '۳۱–۶۰ روز'
                  : item.daysOverdue <= 90
                    ? '۶۱–۹۰ روز'
                    : '+۹۰ روز';

            return (
              <div
                key={item.profile.id}
                className={`card p-3 flex items-center gap-3 border ${bucket}`}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    {item.profile.first_name} {item.profile.last_name}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {daysLabel} از آخرین فعالیت
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-red-600">
                    {formatPrice(item.balance)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
