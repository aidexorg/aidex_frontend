import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { ErrorBanner, Spinner } from './ui';
import { useData } from '@/data';
import { todayISO } from '@/lib/format';
import type { Payment } from '@/types';

interface PaymentFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: (payment: Payment) => void;
  periodId: string;
  editing?: Payment | null;
}

export function PaymentForm({ open, onClose, onSaved, periodId, editing }: PaymentFormProps) {
  const data = useData();
  const [form, setForm] = useState({
    payment_date: editing?.payment_date ?? todayISO(),
    tracking_code: editing?.tracking_code ?? '',
    amount: editing?.amount != null ? String(editing.amount) : '',
    description: editing?.description ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!periodId) {
      setError('پرداخت باید به یک دوره درمان متصل باشد.');
      return;
    }
    if (!form.payment_date) {
      setError('تاریخ پرداخت الزامی است.');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setError('مبلغ پرداخت باید بزرگتر از صفر باشد.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        period_id: periodId,
        payment_date: form.payment_date,
        tracking_code: form.tracking_code.trim() || null,
        amount: Number(form.amount),
        description: form.description.trim() || null,
      };
      const row = editing
        ? await data.updatePayment(editing.id, payload)
        : await data.createPayment(payload);
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
      title={editing ? 'ویرایش پرداخت' : 'ثبت پرداخت جدید'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">تاریخ پرداخت</label>
            <input
              className="input"
              type="date"
              required
              value={form.payment_date}
              onChange={(e) => update('payment_date', e.target.value)}
            />
          </div>
          <div>
            <label className="label">مبلغ (تومان) *</label>
            <input
              className="input"
              type="number"
              value={form.amount}
              onChange={(e) => update('amount', e.target.value)}
              placeholder="۰"
            />
          </div>
        </div>

        <div>
          <label className="label">کد رهگیری</label>
          <input
            className="input"
            value={form.tracking_code}
            onChange={(e) => update('tracking_code', e.target.value)}
            placeholder="کد رهگیری تراکنش"
          />
        </div>

        <div>
          <label className="label">توضیحات</label>
          <textarea
            className="input min-h-[60px]"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="توضیحات پرداخت…"
          />
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary">
            انصراف
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Spinner /> : editing ? 'ذخیره تغییرات' : 'ثبت پرداخت'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
