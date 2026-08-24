import { useState } from 'react';
import { DentalChartDisplay } from '../DentalChart';
import { buildToothStatusMap } from '@/lib/profileOutput';
import { formatDate, toFaDigits } from '@/lib/format';
import type { Part, Action } from '@/types';
import { MousePointerClick } from 'lucide-react';

interface TreatmentChartPanelProps {
  parts: Part[];
  actions: Action[];
}

export function TreatmentChartPanel({ parts, actions }: TreatmentChartPanelProps) {
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const toothStatus = buildToothStatusMap(parts, actions);

  const toothActions = selectedTooth
    ? actions.filter((a) => {
        const part = parts.find((p) => p.id === a.part_id);
        return part?.tooth === selectedTooth;
      })
    : [];

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      healthy: 'سالم',
      in_treatment: 'در حال درمان',
      treated: 'درمان شده',
      appointment_needed: 'نیاز به نوبت',
    };
    return map[status] ?? status;
  };

  const statusBadgeClass: Record<string, string> = {
    healthy: 'bg-slate-50 text-slate-600 border-slate-100',
    in_treatment: 'bg-blue-50 text-blue-700 border-blue-100',
    treated: 'bg-sage-50 text-sage-700 border-sage-100',
    appointment_needed: 'bg-amber-50 text-amber-700 border-amber-100',
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Chart — full width so teeth never overflow the card */}
      <div className="card p-4 sm:p-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="text-sm font-semibold text-brand-navy">نمودار دندان</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
            <Legend dot="bg-white border border-slate-200" label="سالم" />
            <Legend dot="bg-blue-400" label="در حال درمان" />
            <Legend dot="bg-sage-500" label="درمان شده" />
            <Legend dot="bg-amber-400" label="نوبت لازم" />
          </div>
        </div>
        <DentalChartDisplay
          toothStatus={toothStatus}
          selectedTooth={selectedTooth}
          onSelectTooth={(code) => setSelectedTooth(code === selectedTooth ? null : code)}
        />
      </div>

      {/* Tooth detail — below chart */}
      <div className="card p-5 min-h-[140px]">
        {selectedTooth ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">{selectedTooth.slice(0, 2)}</p>
                <h3 className="text-lg font-bold text-brand-navy">
                  دندان {toFaDigits(selectedTooth.slice(2))}
                </h3>
              </div>
              {toothStatus[selectedTooth] && (
                <span
                  className={`badge border ${statusBadgeClass[toothStatus[selectedTooth]] ?? statusBadgeClass.healthy}`}
                >
                  {statusLabel(toothStatus[selectedTooth])}
                </span>
              )}
            </div>
            {toothActions.length === 0 ? (
              <p className="text-sm text-slate-400">اقدام درمانی ثبت نشده.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {toothActions.map((action) => (
                  <li
                    key={action.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 border-r-[3px] border-r-sage-400"
                  >
                    <p className="text-xs text-slate-400">{formatDate(action.updated_at ?? '')}</p>
                    <p className="text-sm font-medium text-slate-700 mt-0.5">{action.title}</p>
                    {action.description && (
                      <p className="text-xs text-slate-500 mt-1">{action.description}</p>
                    )}
                    {action.needs_followup && (
                      <span className="inline-block mt-2 text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                        نیاز به پیگیری
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-slate-400 text-sm gap-2">
            <MousePointerClick size={28} className="text-slate-300" strokeWidth={1.5} />
            <p>روی هر دندان کلیک کنید تا جزئیات را ببینید.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded-sm shrink-0 ${dot}`} />
      {label}
    </span>
  );
}
