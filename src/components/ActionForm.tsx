import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { ErrorBanner, Spinner } from './ui';
import { useToast } from './ToastProvider';
import { useFollowupCount } from './FollowupCountProvider';
import { useData } from '@/data';
import {
  ACTION_FAMILIES,
  ACTION_PARAM_VALUES,
  INCOMPLETE_REASONS,
  buildActionTitle,
  isValidActionTitle,
  isValidIncompleteReason,
  parseActionTitle,
  validateAction,
  type Action,
  type ActionStatus,
} from '@/types';

interface ActionFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: (action: Action) => void;
  partId: string;
  editing?: Action | null;
}

function initialFromEditing(editing?: Action | null) {
  const parsed = editing?.title ? parseActionTitle(editing.title) : null;
  return {
    familyId: parsed?.familyId ?? '',
    param: parsed?.param ?? '1',
    price: editing?.price != null ? String(editing.price) : '',
    discount: editing?.discount != null ? String(editing.discount) : '0',
    description: editing?.description ?? '',
    status: (editing?.status ?? 'incomplete') as ActionStatus,
    incomplete_reason:
      editing?.incomplete_reason && isValidIncompleteReason(editing.incomplete_reason)
        ? editing.incomplete_reason
        : '',
    needs_followup: editing?.needs_followup ?? false,
  };
}

export function ActionForm({ open, onClose, onSaved, partId, editing }: ActionFormProps) {
  const data = useData();
  const { showToast } = useToast();
  const { refresh: refreshFollowupCount } = useFollowupCount();
  const [form, setForm] = useState(() => initialFromEditing(editing));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const family = ACTION_FAMILIES.find((f) => f.id === form.familyId);
  const needsParam = family != null && family.kind !== 'fixed';

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const title = buildActionTitle(form.familyId, form.param);
    if (!title || !isValidActionTitle(title)) {
      setError('عنوان اقدام باید از فهرست استاندارد انتخاب شود.');
      return;
    }
    if (form.status === 'incomplete' && !isValidIncompleteReason(form.incomplete_reason)) {
      setError('دلیل ناقص بودن را از فهرست انتخاب کنید.');
      return;
    }
    // BR-REC-10: Validate price and discount
    const priceNum = Number(form.price) || 0;
    const discountNum = Number(form.discount) || 0;
    const validation = validateAction(priceNum, discountNum, form.status, form.incomplete_reason || null);
    if (!validation.valid) {
      setError(validation.error ?? 'داده‌های نامعتبر.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        part_id: partId,
        title,
        price: Number(form.price) || 0,
        discount: Number(form.discount) || 0,
        description: form.description.trim() || null,
        status: form.status,
        incomplete_reason: form.status === 'incomplete' ? form.incomplete_reason : null,
        needs_followup: form.needs_followup,
      };
      const row = editing
        ? await data.updateAction(editing.id, payload)
        : await data.createAction(payload);
      showToast({
        message: editing ? 'اقدام درمانی به‌روزرسانی شد.' : 'اقدام درمانی ثبت شد.',
        variant: 'success',
      });
      refreshFollowupCount();
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
      title={editing ? 'ویرایش اقدام' : 'اقدام درمانی جدید'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <div>
          <label className="label">عنوان اقدام *</label>
          <select
            className="input"
            value={form.familyId}
            onChange={(e) => update('familyId', e.target.value)}
          >
            <option value="">انتخاب کنید…</option>
            {ACTION_FAMILIES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {needsParam && (
          <div>
            <label className="label">
              {family?.kind === 'aml' || family?.kind === 'com' ? 'کلاس ترمیم (1–6) *' : 'تعداد کانال (1–6) *'}
            </label>
            <select
              className="input"
              value={form.param}
              onChange={(e) => update('param', e.target.value)}
            >
              {ACTION_PARAM_VALUES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        )}

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
              onClick={() => {
                setForm((f) => ({ ...f, status: 'complete', incomplete_reason: '' }));
              }}
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
            <label className="label">دلیل ناقص بودن *</label>
            <select
              className="input"
              value={form.incomplete_reason}
              onChange={(e) => update('incomplete_reason', e.target.value)}
            >
              <option value="">انتخاب کنید…</option>
              {INCOMPLETE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
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
