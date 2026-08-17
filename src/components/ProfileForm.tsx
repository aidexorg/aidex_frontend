import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { ErrorBanner, Spinner } from './ui';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

interface ProfileFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: (profile: Profile) => void;
  editing?: Profile | null;
}

export function ProfileForm({ open, onClose, onSaved, editing }: ProfileFormProps) {
  const [form, setForm] = useState({
    first_name: editing?.first_name ?? '',
    last_name: editing?.last_name ?? '',
    birth_year: editing?.birth_year ?? '',
    phone: editing?.phone ?? '',
    address: editing?.address ?? '',
    file_number: editing?.file_number ?? '',
    national_id: editing?.national_id ?? '',
    file_description: editing?.file_description ?? '',
    clinical_notes: editing?.clinical_notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('نام و نام خانوادگی الزامی است.');
      return;
    }
    if (!form.file_number.trim()) {
      setError('شماره پرونده الزامی است.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        birth_year: form.birth_year.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        file_number: form.file_number.trim(),
        national_id: form.national_id.trim() || null,
        file_description: form.file_description.trim() || null,
        clinical_notes: form.clinical_notes.trim() || null,
      };
      let result;
      if (editing) {
        result = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', editing.id)
          .select()
          .maybeSingle();
      } else {
        result = await supabase.from('profiles').insert(payload).select().maybeSingle();
      }
      if (result.error) throw result.error;
      if (result.data) onSaved(result.data as Profile);
    } catch (err) {
      const anyErr = err as { code?: string; message?: string } | null;
      const msg =
        err instanceof Error ? err.message : (anyErr?.message ?? 'خطا در ذخیره‌سازی پرونده.');
      if (anyErr?.code === '23505' || msg.includes('duplicate') || msg.includes('unique')) {
        setError('شماره پرونده تکراری است.');
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'ویرایش پرونده' : 'پرونده جدید'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">نام *</label>
            <input
              className="input"
              value={form.first_name}
              onChange={(e) => update('first_name', e.target.value)}
              placeholder="مثلاً: علی"
              autoFocus
            />
          </div>
          <div>
            <label className="label">نام خانوادگی *</label>
            <input
              className="input"
              value={form.last_name}
              onChange={(e) => update('last_name', e.target.value)}
              placeholder="مثلاً: رضایی"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">سال تولد</label>
            <input
              className="input"
              value={form.birth_year}
              onChange={(e) => update('birth_year', e.target.value)}
              placeholder="۱۳۷۰"
            />
          </div>
          <div>
            <label className="label">شماره پرونده *</label>
            <input
              className="input"
              value={form.file_number}
              onChange={(e) => update('file_number', e.target.value)}
              placeholder="۱۰۲۳"
            />
          </div>
          <div>
            <label className="label">کد ملی</label>
            <input
              className="input"
              value={form.national_id}
              onChange={(e) => update('national_id', e.target.value)}
              placeholder="———"
            />
          </div>
        </div>
        <div>
          <label className="label">شماره تماس</label>
          <input
            className="input"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="۰۹۱۲———"
            type="tel"
          />
        </div>
        <div>
          <label className="label">نشانی</label>
          <input
            className="input"
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            placeholder="نشانی منزل یا محل کار"
          />
        </div>
        <div>
          <label className="label">شرح پرونده</label>
          <textarea
            className="input min-h-[70px]"
            value={form.file_description}
            onChange={(e) => update('file_description', e.target.value)}
            placeholder="شرح کلی وضعیت پرونده"
          />
        </div>
        <div>
          <label className="label">یادداشت‌های بالینی</label>
          <textarea
            className="input min-h-[70px]"
            value={form.clinical_notes}
            onChange={(e) => update('clinical_notes', e.target.value)}
            placeholder="یادداشت‌های بالینی، حساسیت‌ها، بیماری‌های زمینه‌ای…"
          />
        </div>
        <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary">
            انصراف
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Spinner /> : editing ? 'ذخیره تغییرات' : 'ایجاد پرونده'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
