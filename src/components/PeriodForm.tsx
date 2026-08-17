import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { ErrorBanner, Spinner } from './ui';
import { supabase } from '@/lib/supabase';
import { TOOTH_QUADRANTS, TOOTH_NUMBERS, AREA_OPTIONS } from '@/types';
import type { Period } from '@/types';

interface PeriodFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: (period: Period) => void;
  profileId: string;
  existingTeeth?: string[];
  existingAreas?: string[];
  editing?: Period | null;
}

export function PeriodForm({
  open,
  onClose,
  onSaved,
  profileId,
  existingTeeth = [],
  existingAreas = [],
  editing,
}: PeriodFormProps) {
  const [teeth, setTeeth] = useState<string[]>(existingTeeth);
  const [areas, setAreas] = useState<string[]>(existingAreas);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTooth = (t: string) =>
    setTeeth((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const toggleArea = (a: string) =>
    setAreas((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (teeth.length === 0 && areas.length === 0) {
      setError('حداقل یک دندان یا ناحیه انتخاب کنید.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { profile_id: profileId, teeth, areas };
      let result;
      if (editing) {
        result = await supabase
          .from('periods')
          .update({ teeth, areas })
          .eq('id', editing.id)
          .select()
          .maybeSingle();
      } else {
        result = await supabase.from('periods').insert(payload).select().maybeSingle();
      }
      if (result.error) throw result.error;
      if (result.data) onSaved(result.data as Period);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره‌سازی.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'ویرایش دوره درمان' : 'دوره درمان جدید'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <ErrorBanner message={error} />}

        <div>
          <label className="label">دندان‌های درگیر</label>
          <p className="text-xs text-slate-400 mb-3">
            برای هر دندان، quadrant و شماره را انتخاب کنید.
          </p>
          <div className="space-y-2">
            {TOOTH_QUADRANTS.map((q) => (
              <div key={q.value} className="flex items-start gap-2">
                <div className="w-28 shrink-0 text-xs text-slate-500 pt-1.5">{q.label}</div>
                <div className="flex flex-wrap gap-1.5">
                  {TOOTH_NUMBERS.map((n) => {
                    const code = `${q.value}${n}`;
                    const selected = teeth.includes(code);
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => toggleTooth(code)}
                        className={`w-9 h-9 rounded-lg text-xs font-medium border transition ${
                          selected
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-teal-400'
                        }`}
                      >
                        {code}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {teeth.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {teeth.map((t) => (
                <span
                  key={t}
                  className="badge bg-teal-50 text-teal-700 border border-teal-200"
                >
                  {t}
                  <button type="button" onClick={() => toggleTooth(t)} className="mr-0.5">
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 pt-4">
          <label className="label">نواحی درمان</label>
          <div className="flex flex-wrap gap-2">
            {AREA_OPTIONS.map((a) => {
              const selected = areas.includes(a.value);
              return (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => toggleArea(a.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                    selected
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-teal-400'
                  }`}
                >
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary">
            انصراف
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Spinner /> : editing ? 'ذخیره تغییرات' : 'ایجاد دوره'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
