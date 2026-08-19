import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastItem extends Required<Pick<ToastOptions, 'message' | 'variant'>> {
  id: number;
  durationMs: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 2800,
  error: 4500,
  info: 3000,
};

const MAX_VISIBLE = 4;

function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 z-[100] flex flex-col gap-2 md:max-w-sm pointer-events-none"
      dir="rtl"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}) {
  const styles =
    toast.variant === 'success'
      ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
      : toast.variant === 'error'
        ? 'bg-red-50 border-red-100 text-red-800'
        : 'bg-sky-50 border-sky-100 text-sky-800';

  const Icon =
    toast.variant === 'success' ? CheckCircle2 : toast.variant === 'error' ? XCircle : Info;

  return (
    <div
      className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg shadow-slate-900/10 animate-fade-in ${styles}`}
      role="status"
    >
      <Icon size={18} className="shrink-0 mt-0.5" />
      <span className="flex-1 leading-relaxed">{toast.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded-lg p-0.5 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="بستن"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ message, variant = 'success', durationMs }: ToastOptions) => {
      const id = ++nextId.current;
      const resolvedDuration = durationMs ?? DEFAULT_DURATION[variant];
      const item: ToastItem = { id, message, variant, durationMs: resolvedDuration };

      setToasts((current) => [...current.slice(-(MAX_VISIBLE - 1)), item]);

      const timer = setTimeout(() => dismiss(id), resolvedDuration);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach(clearTimeout);
      activeTimers.clear();
    };
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
