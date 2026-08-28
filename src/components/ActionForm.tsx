import { useState, useEffect, useMemo, useCallback, type FormEvent } from 'react';
import { Modal } from './Modal';
import { ErrorBanner, FormSubmitButton } from './ui';
import { useToast } from './ToastProvider';
import { FormDraftUI } from './FormDraftUI';
import { useFollowupCount } from './FollowupCountProvider';
import { useData } from '@/data';
import { formSaveSuccessDelay } from '@/lib/formSaveSuccess';
import { useFormDraft } from '@/lib/useFormDraft';
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
import { handleFormSaveShortcut } from '@/lib/accessibility';

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
  const initialForm = useMemo(() => initialFromEditing(editing), [editing]);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draft = useFormDraft({
    formId: 'action',
    scopeKey: editing ? `edit:${editing.id}` : `create:${partId}`,
    enabled: open,
    initialValue: initialForm,
    value: form,
    setValue: setForm,
  });

  const handleClose = useCallback(() => draft.requestClose(onClose), [draft, onClose]);

  useEffect(() => {
    if (!open) return;
    setForm(initialFromEditing(editing));
    setError(null);
  }, [open, editing, partId]);

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
      setSaving(false);
      setSaved(true);
      await formSaveSuccessDelay();
      draft.markSaved();
      onSaved(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره‌سازی.');
    } finally {
      setSaving(false);
      setSaved(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={editing ? 'ویرایش اقدام' : 'اقدام درمانی جدید'}
      size="md"
    >
      <form
        onSubmit={handleSubmit}
        onKeyDown={(event) => handleFormSaveShortcut(event, saving || saved)}
        aria-keyshortcuts="Control+Enter Meta+Enter"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'action-form-error' : undefined}
        className="space-y-4"
      >
        <FormDraftUI draft={draft} />
        {error && <div id="action-form-error"><ErrorBanner message={error} /></div>}

        <div>
          <label htmlFor="action-family" className="label">عنوان اقدام *</label>
          <select
            id="action-family"
            className="input"
            required
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
            <label htmlFor="action-param" className="label">
              {family?.kind === 'aml' || family?.kind === 'com' ? 'کلاس ترمیم (1–6) *' : 'تعداد کانال (1–6) *'}
            </label>
            <select
              id="action-param"
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
            <label htmlFor="action-price" className="label">قیمت (تومان)</label>
            <input
              id="action-price"
              className="input"
              type="number"
              value={form.price}
              onChange={(e) => update('price', e.target.value)}
              placeholder="۰"
            />
          </div>
          <div>
            <label htmlFor="action-discount" className="label">تخفیف (تومان)</label>
            <input
              id="action-discount"
              className="input"
              type="number"
              value={form.discount}
              onChange={(e) => update('discount', e.target.value)}
              placeholder="۰"
            />
          </div>
        </div>

        <div>
          <label htmlFor="action-description" className="label">توضیحات</label>
          <textarea
            id="action-description"
            className="input min-h-[60px]"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="توضیحات اقدام درمانی…"
          />
        </div>

        <fieldset>
          <legend className="label">وضعیت</legend>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => update('status', 'incomplete')}
              aria-pressed={form.status === 'incomplete'}
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
              aria-pressed={form.status === 'complete'}
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
        </fieldset>

        {form.status === 'incomplete' && (
          <div>
            <label htmlFor="action-incomplete-reason" className="label">دلیل ناقص بودن *</label>
            <select
              id="action-incomplete-reason"
              className="input"
              required
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
          <button type="button" onClick={handleClose} className="btn-secondary">
            انصراف
          </button>
          <FormSubmitButton
            saving={saving}
            saved={saved}
            label={editing ? 'ذخیره تغییرات' : 'افزودن اقدام'}
            className="btn-primary"
          />
        </div>
      </form>
    </Modal>
  );
}
