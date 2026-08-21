import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Modal } from './Modal';
import { ErrorBanner, Spinner } from './ui';
import { useToast } from './ToastProvider';
import { DentalChart } from './DentalChart';
import { useData } from '@/data';
import { AREA_OPTIONS, validatePeriodTeethAreas } from '@/types';
import type { Period } from '@/types';
import { CheckCircle2, Circle } from 'lucide-react';

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
  const { showToast } = useToast();
  const [teeth, setTeeth] = useState<string[]>(existingTeeth);
  const [areas, setAreas] = useState<string[]>(existingAreas);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const prevOpenRef = useRef(false);

  /** BR-UX-02: re-sync chart ONLY when modal opens (not on every parent re-render) */
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      // Modal just opened — initialize state
      if (editing) {
        setTeeth([...editing.teeth]);
        setAreas([...editing.areas]);
      } else {
        setTeeth([...existingTeeth]);
        setAreas([...existingAreas]);
      }
      setStep(1);
      setError(null);
    }
    prevOpenRef.current = open;
  }, [open, editing, existingTeeth, existingAreas]);

  const toggleTooth = (t: string) =>
    setTeeth((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const toggleArea = (a: string) =>
    setAreas((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // BR-REC-02, BR-REC-03, BR-REC-04: Validate teeth and areas
    const validation = validatePeriodTeethAreas(teeth, areas);
    if (!validation.valid) {
      setError(validation.error ?? 'داده‌های نامعتبر.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { profile_id: profileId, teeth, areas };
      const row = editing
        ? await data.updatePeriod(editing.id, { teeth, areas })
        : await data.createPeriod(payload);
      showToast({
        message: editing ? 'دوره درمان به‌روزرسانی شد.' : 'دوره درمان جدید ثبت شد.',
        variant: 'success',
      });
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

        {/* Step indicator */}
        {!editing && (
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5">
              {step >= 1 ? (
                <CheckCircle2 size={18} className="text-teal-600" />
              ) : (
                <Circle size={18} className="text-slate-300" />
              )}
              <span className={step >= 1 ? 'text-teal-700 font-medium' : 'text-slate-400'}>
                دندان‌ها
              </span>
            </div>
            <div className="h-px flex-1 bg-slate-200" />
            <div className="flex items-center gap-1.5">
              {step >= 2 ? (
                <CheckCircle2 size={18} className="text-teal-600" />
              ) : (
                <Circle size={18} className="text-slate-300" />
              )}
              <span className={step >= 2 ? 'text-teal-700 font-medium' : 'text-slate-400'}>
                نواحی درمان
              </span>
            </div>
          </div>
        )}

        {/* Step 1: Teeth selection */}
        <div className={`space-y-3 ${!editing && step > 1 ? 'hidden' : ''}`}>
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <label className="label mb-0 text-base font-semibold">
                ۱. دندان‌های درگیر
              </label>
              <p className="text-xs text-slate-400 mt-1">
                روی هر دندان در نمودار کلیک کنید
              </p>
            </div>
            {teeth.length > 0 && (
              <span className="badge bg-teal-50 text-teal-700 border border-teal-200 text-sm">
                {teeth.length} دندان
              </span>
            )}
          </div>
          
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <DentalChart selected={teeth} onToggle={toggleTooth} />
          </div>

          {teeth.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {teeth.map((t) => (
                <span
                  key={t}
                  className="badge bg-teal-50 text-teal-700 border border-teal-200 cursor-pointer hover:bg-teal-100"
                  onClick={() => toggleTooth(t)}
                >
                  {t}
                  <span className="mr-1 text-teal-400">×</span>
                </span>
              ))}
            </div>
          )}

          {!editing && (
            <button
              type="button"
              onClick={() => {
                if (teeth.length === 0) {
                  setError('حداقل یک دندان انتخاب کنید.');
                  return;
                }
                setError(null);
                setStep(2);
              }}
              className="btn-primary w-full"
            >
              مرحله بعد: انتخاب نواحی
            </button>
          )}
        </div>

        {/* Step 2: Area selection */}
        <div className={`space-y-3 ${!editing && step < 2 ? 'hidden' : ''}`}>
          <div>
            <label className="label mb-0 text-base font-semibold">
              {editing ? '۱. نواحی درمان' : '۲. نواحی درمان'}
            </label>
            <p className="text-xs text-slate-400 mt-1">
              ناحیه‌ای که درمان در آن انجام می‌شود را انتخاب کنید
            </p>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {AREA_OPTIONS.map((a) => {
              const selected = areas.includes(a.value);
              return (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => toggleArea(a.value)}
                  className={`rounded-xl border-2 p-4 text-center transition-all ${
                    selected
                      ? 'border-teal-500 bg-teal-50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="text-sm font-medium text-slate-800">{a.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary & actions */}
        {(editing || step === 2) && (
          <div className="border-t border-slate-100 pt-4 space-y-3">
            {/* Preview */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="text-xs text-slate-400 mb-2">خلاصه دوره درمان:</div>
              <div className="flex flex-wrap gap-3 text-sm">
                <div>
                  <span className="text-slate-500">دندان‌ها: </span>
                  <span className="font-medium text-slate-800">
                    {teeth.length > 0 ? teeth.join('، ') : '—'}
                  </span>
                </div>
                <div className="text-slate-300">|</div>
                <div>
                  <span className="text-slate-500">نواحی: </span>
                  <span className="font-medium text-slate-800">
                    {areas.length > 0
                      ? areas.map((a) => AREA_OPTIONS.find((o) => o.value === a)?.label ?? a).join('، ')
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              {!editing && (
                <button type="button" onClick={() => setStep(1)} className="btn-secondary">
                  بازگشت
                </button>
              )}
              <button type="button" onClick={onClose} className="btn-secondary">
                انصراف
              </button>
              <button
                type="submit"
                disabled={saving || teeth.length === 0 || areas.length === 0}
                className="btn-primary min-w-[140px]"
              >
                {saving ? <Spinner /> : editing ? 'ذخیره تغییرات' : 'ایجاد دوره'}
              </button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
