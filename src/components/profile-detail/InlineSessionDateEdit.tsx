import { useEffect, useId, useRef, useState } from 'react';
import { formatDate } from '@/lib/format';
import { useTranslation } from '../LocaleProvider';

interface InlineSessionDateEditProps {
  value: string;
  onSave: (date: string) => Promise<void>;
  disabled?: boolean;
}

export function InlineSessionDateEdit({ value, onSave, disabled = false }: InlineSessionDateEditProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const commit = async () => {
    if (draft === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch {
      setDraft(value);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        id={inputId}
        type="date"
        value={draft}
        disabled={saving}
        aria-label={t('inlineEdit.sessionDateAria')}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Enter') {
            event.preventDefault();
            void commit();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            cancel();
          }
        }}
        onClick={(event) => event.stopPropagation()}
        className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
      />
    );
  }

  return (
    <button
      type="button"
      disabled={disabled || saving}
      aria-label={t('inlineEdit.sessionDateAria')}
      title={t('inlineEdit.sessionDateLabel')}
      onClick={(event) => {
        event.stopPropagation();
        setEditing(true);
      }}
      className="rounded-md px-1.5 py-0.5 text-xs text-slate-400 transition hover:bg-teal-50 hover:text-teal-700 disabled:opacity-50 dark:hover:bg-teal-950/40 dark:hover:text-teal-300"
    >
      {value ? formatDate(value) : t('inlineEdit.sessionDateEmpty')}
    </button>
  );
}
