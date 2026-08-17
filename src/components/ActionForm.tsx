import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { ErrorBanner, Spinner } from './ui';
import { supabase } from '@/lib/supabase';
import { ACTION_TITLES, INCOMPLETE_REASONS, type Action, type ActionStatus } from '@/types';

interface ActionFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: (action: Action) => void;
  partId: string;
  editing?: Action | null;
}

export function ActionForm({ open, onClose, onSaved, partId, editing }: ActionFormProps) {
  const [form, setForm] = useState({
    title: editing?.title ?? '',
    price: editing?.price != null ? String(editing.price) : '',
    discount: editing?.discount != null ? String(editing.discount) : '0',
    description: editing?.description ?? '',
    status: (editing?.status ?? 'incomplete') as ActionStatus,
    incomplete_reason: editing?.incomplete_reason ?? '',
    needs_followup: editing?.needs_followup ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('عنوان اقدام الزامی است.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        part_id: partId,
        title: form.title.trim(),
        price: Number(form.price) || 0,
        discount: Number(form.discount) || 0,
        description: form.description.trim() || null,
        status: form.status,
        incomplete_reason:
          form.status === 'incomplete' ? form.incomplete_reason.trim() || null : null,
        needs_followup: form.needs_followup,
      };
      let result;
      if (editing) {
        result = await supabase
          .from('actions')
          .update(payload)
          .eq('id', editing.id)
          .select()
          .maybeSingle();
      } else {
        result = await supabase.from('actions').insert(payload).select().maybeSingle();
      }
      if (result.error) throw result.error;
      if (result.data) onSaved(result.data as Action);
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
      title={editing ? 'ویرایش اقدام' : 'اقدام درمانی جدید'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <div>
          <label className="label">عنوان اقدام *</label>
          <select
            className="input"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
          >
            <option value="">انتخاب کنید…</option>
            {ACTION_TITLES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">قیمت (تومان)</label>
            <input
              className="input"
              type="number"
              value={form.price}
              onChange={(e) => update('price', e.target.value)}
              placeholder="۰"
            />
          </div>
          <div>
            <label className="label">تخفیف (تومان)</label>
            <input
              className="input"
              type="number"
              value={form.discount}
              onChange={(e) => update('discount', e.target.value)}
              placeholder="۰"
            />
          </div>
        </div>

        <div>
          <label className="label">توضیحات</label>
          <textarea
            className="input min-h-[60px]"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="توضیحات اقدام درمانی…"
          />
        </div>

        <div>
          <label className="label">وضعیت</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => update('status', 'incomplete')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition ${
                form.status === 'incomplete'
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-white text-slate-500 border-slate-200'
              }`}
            >
              ناقص
            </button>
            <button
              type="button"
              onClick={() => update('status', 'complete')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition ${
                form.status === 'complete'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-white text-slate-500 border-slate-200'
              }`}
            >
              کامل
            </button>
          </div>
        </div>

        {form.status === 'incomplete' && (
          <div>
            <label className="label">دلیل ناقص بودن</label>
            <select
              className="input"
              value={form.incomplete_reason}
              onChange={(e) => update('incomplete_reason', e.target.value)}
            >
              <option value="">انتخاب کنید…</option>
              {INCOMPLETE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.needs_followup}
            onChange={(e) => update('needs_followup', e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-slate-700">نیازمند پیگیری</span>
        </label>

        <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary">
            انصراف
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Spinner /> : editing ? 'ذخیره تغییرات' : 'افزودن اقدام'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
