import {
  useEffect,
  useLayoutEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

let scrollLockCount = 0;
let savedBodyOverflow = '';

function acquireBodyScrollLock(): () => void {
  if (scrollLockCount === 0) {
    savedBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLockCount += 1;

  return () => {
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount === 0) document.body.style.overflow = savedBodyOverflow;
  };
}

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      element.getClientRects().length > 0 &&
      element.getAttribute('aria-hidden') !== 'true'
  );
}

interface DialogFocusOptions {
  open: boolean;
  containerRef: RefObject<HTMLElement>;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement>;
  lockScroll?: boolean;
}

export function useDialogFocus({
  open,
  containerRef,
  onClose,
  initialFocusRef,
  lockScroll = true,
}: DialogFocusOptions): void {
  const onCloseRef = useRef(onClose);

  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const opener =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const releaseScrollLock = lockScroll ? acquireBodyScrollLock() : () => undefined;
    const container = containerRef.current;

    const initialFocus =
      initialFocusRef?.current ??
      container?.querySelector<HTMLElement>('[autofocus]') ??
      container?.querySelector<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [data-dialog-primary], button:not([disabled]):not([aria-label="بستن پنجره"])'
      ) ??
      (container ? focusableElements(container)[0] : null) ??
      container;
    initialFocus?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !containerRef.current) return;

      const focusable = focusableElements(containerRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        containerRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !containerRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !containerRef.current.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      releaseScrollLock();
      if (opener?.isConnected) opener.focus();
    };
  }, [containerRef, initialFocusRef, lockScroll, open]);
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

export function shouldIgnoreShortcut(event: KeyboardEvent): boolean {
  return event.defaultPrevented || event.repeat || event.isComposing || isEditableTarget(event.target);
}

export function handleFormSaveShortcut(
  event: ReactKeyboardEvent<HTMLFormElement>,
  disabled = false
): void {
  if (
    disabled ||
    event.defaultPrevented ||
    event.repeat ||
    event.nativeEvent.isComposing ||
    !(event.ctrlKey || event.metaKey) ||
    event.key !== 'Enter'
  ) {
    return;
  }
  event.preventDefault();
  event.currentTarget.requestSubmit();
}
