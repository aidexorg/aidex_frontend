import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildDraftStorageKey,
  clearDraft,
  draftsEqual,
  readDraft,
  writeDraft,
} from '@/lib/formDraft';

const DEBOUNCE_MS = 500;

export interface UseFormDraftOptions<T> {
  formId: string;
  scopeKey?: string;
  version?: number;
  enabled: boolean;
  initialValue: T;
  value: T;
  setValue: (value: T) => void;
  equals?: (a: T, b: T) => boolean;
}

export function useFormDraft<T>({
  formId,
  scopeKey,
  version = 1,
  enabled,
  initialValue,
  value,
  setValue,
  equals = draftsEqual,
}: UseFormDraftOptions<T>) {
  const storageKey = buildDraftStorageKey(formId, scopeKey);
  const [baseline, setBaseline] = useState(initialValue);
  const [showRestore, setShowRestore] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<T | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const closeCallbackRef = useRef<(() => void) | null>(null);
  const restoreCheckedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      restoreCheckedRef.current = false;
      setShowRestore(false);
      setPendingDraft(null);
      return;
    }
    setBaseline(initialValue);
    restoreCheckedRef.current = false;
  }, [enabled, storageKey, initialValue]);

  useEffect(() => {
    if (!enabled || restoreCheckedRef.current) return;
    restoreCheckedRef.current = true;
    const stored = readDraft<T>(storageKey, version);
    if (stored && !equals(stored, initialValue)) {
      setPendingDraft(stored);
      setShowRestore(true);
    } else {
      setPendingDraft(null);
      setShowRestore(false);
    }
  }, [enabled, storageKey, version, initialValue, equals]);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => {
      if (!equals(value, baseline)) {
        writeDraft(storageKey, version, value);
      }
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, storageKey, version, value, baseline, equals]);

  const dirty = enabled && !equals(value, baseline);

  useEffect(() => {
    if (!enabled || !dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [enabled, dirty]);

  const restoreDraft = useCallback(() => {
    if (pendingDraft) {
      setValue(pendingDraft);
      setShowRestore(false);
      setPendingDraft(null);
    }
  }, [pendingDraft, setValue]);

  const discardStoredDraft = useCallback(() => {
    clearDraft(storageKey);
    setShowRestore(false);
    setPendingDraft(null);
  }, [storageKey]);

  const markSaved = useCallback(() => {
    clearDraft(storageKey);
    setBaseline(value);
    setShowRestore(false);
    setPendingDraft(null);
  }, [storageKey, value]);

  const requestClose = useCallback(
    (onClose: () => void) => {
      if (!dirty) {
        onClose();
        return;
      }
      closeCallbackRef.current = onClose;
      setDiscardOpen(true);
    },
    [dirty],
  );

  const confirmDiscard = useCallback(() => {
    clearDraft(storageKey);
    setDiscardOpen(false);
    closeCallbackRef.current?.();
    closeCallbackRef.current = null;
  }, [storageKey]);

  const cancelDiscard = useCallback(() => {
    setDiscardOpen(false);
    closeCallbackRef.current = null;
  }, []);

  return {
    dirty,
    showRestore,
    restoreDraft,
    discardStoredDraft,
    markSaved,
    requestClose,
    discardOpen,
    confirmDiscard,
    cancelDiscard,
  };
}

export type FormDraftControls = ReturnType<typeof useFormDraft>;
