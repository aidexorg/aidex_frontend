import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/format';
import { DatePicker } from '@/components/DatePicker';
import { useTranslation } from '../LocaleProvider';

interface InlineSessionDateEditProps {
  value: string;
  onSave: (date: string) => Promise<void>;
  disabled?: boolean;
}

export function InlineSessionDateEdit({ value, onSave, disabled = false }: InlineSessionDateEditProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const commit = async (nextDate: string) => {
    if (nextDate === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(nextDate);
      setEditing(false);
    } catch {
      setDraft(value);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div
        className="inline-flex items-center gap-1"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            event.preventDefault();
            cancel();
          }
        }}
      >
        <DatePicker
          aria-label={t('inlineEdit.sessionDateAria')}
          value={draft}
          disabled={saving}
          onChange={(date) => {
            setDraft(date);
            void commit(date);
          }}
          className="min-w-[9rem] text-xs"
        />
      </div>
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
