import { useEffect, useState } from 'react';
import { CheckCircle2, CircleDot, Clock } from 'lucide-react';
import type { ActionStatus } from '@/types';
import { useTranslation } from '../LocaleProvider';

function nextActionStatus(current: ActionStatus): ActionStatus {
  if (current === 'planned') return 'incomplete';
  if (current === 'incomplete') return 'complete';
  return 'incomplete';
}

function statusIcon(status: ActionStatus) {
  if (status === 'complete') {
    return <CheckCircle2 size={15} className="text-emerald-500 shrink-0" aria-hidden="true" />;
  }
  if (status === 'planned') {
    return <CircleDot size={15} className="text-sky-500 shrink-0" aria-hidden="true" />;
  }
  return <Clock size={15} className="text-amber-500 shrink-0" aria-hidden="true" />;
}

interface InlineActionStatusToggleProps {
  status: ActionStatus;
  actionTitle: string;
  onToggle: (nextStatus: ActionStatus) => Promise<void>;
  disabled?: boolean;
}

export function InlineActionStatusToggle({
  status,
  actionTitle,
  onToggle,
  disabled = false,
}: InlineActionStatusToggleProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [localStatus, setLocalStatus] = useState(status);

  useEffect(() => {
    setLocalStatus(status);
  }, [status]);

  const handleToggle = async () => {
    const previous = localStatus;
    const next = nextActionStatus(previous);
    setLocalStatus(next);
    setSaving(true);
    try {
      await onToggle(next);
    } catch {
      setLocalStatus(previous);
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      disabled={disabled || saving}
      aria-label={t('inlineEdit.actionStatusAria', {
        title: actionTitle,
        status: t(`inlineEdit.actionStatus.${localStatus}`),
      })}
      title={t('inlineEdit.actionStatusLabel')}
      onClick={() => void handleToggle()}
      className="rounded-md p-0.5 transition hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-700"
    >
      {statusIcon(localStatus)}
    </button>
  );
}
