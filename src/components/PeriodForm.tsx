import { useState, useEffect, type FormEvent } from 'react';
import { Modal } from './Modal';
import { ErrorBanner, Spinner } from './ui';
import { DentalChart } from './DentalChart';
import { useData } from '@/data';
import { AREA_OPTIONS } from '@/types';
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
  const data = useData();
  const [teeth, setTeeth] = useState<string[]>(existingTeeth);
  const [areas, setAreas] = useState<string[]>(existingAreas);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** BR-UX-02: re-sync chart when opening create vs edit */
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTeeth([...editing.teeth]);
      setAreas([...editing.areas]);
    } else {
      setTeeth([...existingTeeth]);
      setAreas([...existingAreas]);
    }
    setError(null);
  }, [open, editing, existingTeeth, existingAreas]);

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
      const row = editing
        ? await data.updatePeriod(editing.id, { teeth, areas })
        : await data.createPeriod(payload);
      onSaved(row);
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
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <ErrorBanner message={error} />}

        <div>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <label className="label mb-0">دندان‌های درگیر</label>
            {teeth.length > 0 && (
              <span className="text-xs text-teal-700">
                {teeth.length.toLocaleString('fa-IR')} دندان انتخاب شد
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-3">
            روی هر دندان در نمودار کلیک کنید. شمارهٔ ۱ تا ۸ همان شمارهٔ دندان در هر ربع است.
          </p>
          <DentalChart selected={teeth} onToggle={toggleTooth} />
          {teeth.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {teeth.map((t) => (
                <span
                  key={t}
                  className="badge bg-teal-50 text-teal-700 border border-teal-100"
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
                  className={selected ? 'chip-active' : 'chip'}
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
