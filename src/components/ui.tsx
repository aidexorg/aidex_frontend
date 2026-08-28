import { useState, useEffect, type ReactNode } from 'react';
import { Loader2, CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

export function Spinner({ className = '', size = 20 }: { className?: string; size?: number }) {
  return <Loader2 className={`animate-spin ${className}`} size={size} />;
}

export function LoadingState({ label = 'در حال بارگذاری…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
      <Spinner className="text-teal-600" size={28} />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-3 px-6">
      {icon && <div className="text-slate-200">{icon}</div>}
      <div>
        <p className="text-slate-600 font-medium">{title}</p>
        {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-300">
      <XCircle size={18} className="shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition shrink-0 dark:bg-red-900/50 dark:text-red-200 dark:hover:bg-red-900/70"
        >
          تلاش مجدد
        </button>
      )}
    </div>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <div role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-300">
      <CheckCircle2 size={18} className="shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function InfoBanner({ message }: { message: string }) {
  return (
    <div role="status" className="flex items-center gap-2 rounded-xl bg-sky-50 border border-sky-100 px-4 py-3 text-sm text-sky-700 dark:bg-sky-950/40 dark:border-sky-900/50 dark:text-sky-300">
      <Info size={18} className="shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function FormSubmitButton({
  saving,
  saved,
  label,
  savedLabel = 'ذخیره شد',
  className = 'btn-primary min-w-[140px]',
  shortcutHint = true,
  disabled = false,
}: {
  saving: boolean;
  saved: boolean;
  label: string;
  savedLabel?: string;
  className?: string;
  shortcutHint?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled || saving || saved}
      className={`${className}${saved ? ' btn-save-success' : ''}`}
      aria-keyshortcuts="Control+Enter Meta+Enter"
      title="ذخیره (Ctrl+Enter)"
      aria-live="polite"
    >
      {saved ? (
        <>
          <CheckCircle2 size={16} className="animate-success-pop" aria-hidden="true" />
          {savedLabel}
        </>
      ) : saving ? (
        <Spinner />
      ) : (
        label
      )}
      {!saving && !saved && shortcutHint && (
        <kbd className="hidden sm:inline text-[10px] text-white/70">Ctrl+Enter</kbd>
      )}
    </button>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'تأیید',
  cancelLabel = 'انصراف',
  onConfirm,
  onCancel,
  danger = false,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) setConfirming(false);
  }, [open]);

  if (!open) return null;

  const handleConfirm = () => {
    setConfirming(true);
    onConfirm();
    window.setTimeout(() => setConfirming(false), 200);
  };

  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      {danger ? (
        <div className="flex items-start gap-3 mb-4 rounded-xl border border-red-100 bg-red-50/80 p-3 dark:border-red-900/50 dark:bg-red-950/40">
          <div className="icon-well bg-red-100 text-red-600 w-10 h-10 rounded-xl shrink-0 dark:bg-red-900/50 dark:text-red-400">
            <AlertTriangle size={20} aria-hidden="true" />
          </div>
          <p className="text-sm text-red-800 pt-1 dark:text-red-200">{message}</p>
        </div>
      ) : (
        <p className="text-sm text-slate-600 mb-5 dark:text-slate-300">{message}</p>
      )}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className={
            danger
              ? `btn-danger-confirm min-w-[100px]${confirming ? ' bg-red-800' : ''}`
              : 'btn-primary'
          }
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
