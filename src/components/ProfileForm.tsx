import { useState, type FormEvent, type ReactNode } from 'react';
import {
  User,
  Phone,
  MapPin,
  FileText,
  Stethoscope,
  ClipboardList,
  ArrowRight,
} from 'lucide-react';
import { Modal } from './Modal';
import { ErrorBanner, Spinner } from './ui';
import { DataError, useData } from '@/data';
import { toFaDigits } from '@/lib/format';
import type { Profile } from '@/types';

interface ProfileFormProps {
  /** BR-UX-06: full-page create vs modal (edit until UX-07) */
  variant?: 'modal' | 'page';
  open?: boolean;
  onClose: () => void;
  onSaved: (profile: Profile) => void;
  editing?: Profile | null;
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <span className="icon-well !w-8 !h-8 rounded-xl bg-white text-teal-700 shadow-sm">
          {icon}
        </span>
        {title}
      </div>
      {children}
    </section>
  );
}

export function ProfileForm({
  variant = 'modal',
  open = true,
  onClose,
  onSaved,
  editing,
}: ProfileFormProps) {
  const data = useData();
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

  const displayName =
    [form.first_name.trim(), form.last_name.trim()].filter(Boolean).join(' ') || '—';
  const initial = form.first_name.trim().charAt(0) || '?';

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
      const row = editing
        ? await data.updateProfile(editing.id, payload)
        : await data.createProfile(payload);
      onSaved(row);
    } catch (err) {
      const anyErr = err as { code?: string; message?: string } | null;
      const msg =
        err instanceof Error ? err.message : (anyErr?.message ?? 'خطا در ذخیره‌سازی پرونده.');
      if (
        (err instanceof DataError && err.code === '23505') ||
        anyErr?.code === '23505' ||
        msg.includes('duplicate') ||
        msg.includes('unique')
      ) {
        setError('شماره پرونده تکراری است.');
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const formBody = (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 p-4 text-white flex flex-wrap items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-xl font-bold">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-teal-100">
            {editing ? 'ویرایش اطلاعات بیمار' : 'ثبت پرونده جدید'}
          </p>
          <p className="text-lg font-bold truncate">{displayName}</p>
          {form.file_number.trim() && (
            <p className="text-xs text-teal-100 mt-0.5">
              پرونده {toFaDigits(form.file_number.trim())}
            </p>
          )}
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      <Section title="اطلاعات هویتی" icon={<User size={16} />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">نام *</label>
            <input
              className="input bg-white"
              value={form.first_name}
              onChange={(e) => update('first_name', e.target.value)}
              placeholder="مثلاً: علی"
              autoFocus={variant === 'page'}
            />
          </div>
          <div>
            <label className="label">نام خانوادگی *</label>
            <input
              className="input bg-white"
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
              className="input bg-white"
              value={form.birth_year}
              onChange={(e) => update('birth_year', e.target.value)}
              placeholder="۱۳۷۰"
            />
          </div>
          <div>
            <label className="label">شماره پرونده *</label>
            <input
              className="input bg-white"
              value={form.file_number}
              onChange={(e) => update('file_number', e.target.value)}
              placeholder="۱۰۲۳"
            />
          </div>
          <div>
            <label className="label">کد ملی</label>
            <input
              className="input bg-white"
              value={form.national_id}
              onChange={(e) => update('national_id', e.target.value)}
              placeholder="———"
            />
          </div>
        </div>
      </Section>

      <Section title="تماس و نشانی" icon={<Phone size={16} />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">شماره تماس</label>
            <div className="relative">
              <Phone size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input bg-white pr-10"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="۰۹۱۲———"
                type="tel"
              />
            </div>
          </div>
          <div>
            <label className="label">نشانی</label>
            <div className="relative">
              <MapPin size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input bg-white pr-10"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder="نشانی منزل یا محل کار"
              />
            </div>
          </div>
        </div>
      </Section>

      <Section title="شرح و یادداشت بالینی" icon={<Stethoscope size={16} />}>
        <div>
          <label className="label flex items-center gap-1.5">
            <FileText size={14} className="text-slate-400" />
            شرح پرونده
          </label>
          <textarea
            className="input min-h-[80px] bg-white resize-y"
            value={form.file_description}
            onChange={(e) => update('file_description', e.target.value)}
            placeholder="شرح کلی وضعیت پرونده"
          />
        </div>
        <div>
          <label className="label flex items-center gap-1.5">
            <ClipboardList size={14} className="text-slate-400" />
            یادداشت‌های بالینی
          </label>
          <textarea
            className="input min-h-[90px] bg-white resize-y"
            value={form.clinical_notes}
            onChange={(e) => update('clinical_notes', e.target.value)}
            placeholder="یادداشت‌های بالینی، حساسیت‌ها، بیماری‌های زمینه‌ای…"
          />
        </div>
      </Section>

      <div
        className={`flex flex-wrap gap-2 justify-end pt-2 border-t border-slate-100 ${
          variant === 'modal' ? 'sticky bottom-0 bg-white pb-1' : ''
        }`}
      >
        <button type="button" onClick={onClose} className="btn-secondary">
          انصراف
        </button>
        <button type="submit" disabled={saving} className="btn-primary min-w-[140px]">
          {saving ? <Spinner /> : editing ? 'ذخیره تغییرات' : 'ایجاد پرونده'}
        </button>
      </div>
    </form>
  );

  if (variant === 'page') {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <button type="button" onClick={onClose} className="btn-ghost">
          <ArrowRight size={18} />
          بازگشت به پرونده‌ها
        </button>
        <div className="card p-6 md:p-8">
          <h1 className="page-title">پرونده جدید</h1>
          <p className="page-sub mt-1 mb-6">ثبت اطلاعات بیمار در پرونده جدید</p>
          {formBody}
        </div>
      </div>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'ویرایش پرونده' : 'پرونده جدید'}
      size="xl"
    >
      {formBody}
    </Modal>
  );
}
