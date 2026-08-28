import { useEffect, useId, useRef, useState } from 'react';
import { formatPrice } from '@/lib/format';
import { useTranslation } from '../LocaleProvider';

interface InlinePaymentAmountEditProps {
  value: number;
  onSave: (amount: number) => Promise<void>;
  disabled?: boolean;
}

export function InlinePaymentAmountEdit({ value, onSave, disabled = false }: InlinePaymentAmountEditProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const cancel = () => {
    setDraft(String(value));
    setEditing(false);
  };

  const commit = async () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed) || parsed < 0) {
      cancel();
      return;
    }
    if (parsed === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(parsed);
      setEditing(false);
    } catch {
      setDraft(String(value));
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        id={inputId}
        type="number"
        min={0}
        step={1000}
        value={draft}
        disabled={saving}
        aria-label={t('inlineEdit.paymentAmountAria')}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            void commit();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            cancel();
          }
        }}
        className="w-28 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
      />
    );
  }

  return (
    <button
      type="button"
      disabled={disabled || saving}
      aria-label={t('inlineEdit.paymentAmountAria')}
      title={t('inlineEdit.paymentAmountLabel')}
      onClick={() => setEditing(true)}
      className="rounded-md px-1 py-0.5 text-slate-700 transition hover:bg-emerald-100/80 hover:text-emerald-800 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-emerald-950/40"
    >
      {formatPrice(value)}
    </button>
  );
}
