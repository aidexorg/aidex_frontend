import { type ReactNode, type RefObject, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useDialogFocus } from '@/lib/accessibility';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  initialFocusRef?: RefObject<HTMLElement>;
}

const sizeClasses: Record<string, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  initialFocusRef,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogFocus({
    open,
    containerRef: dialogRef,
    onClose,
    initialFocusRef,
    lockScroll: true,
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto card animate-fade-in`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sticky top-0 bg-white/95 backdrop-blur-sm rounded-t-[1.25rem] z-10">
          <h2 id={titleId} className="text-base font-semibold text-brand-navy">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1 transition"
            aria-label="بستن پنجره"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
