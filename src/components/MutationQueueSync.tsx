import { useEffect } from 'react';
import { useToast } from './ToastProvider';
import { setMutationQueueErrorHandler } from '@/data/mutationQueue';

/** Wires mutation-queue flush errors to toasts. */
export function MutationQueueSync() {
  const { showToast } = useToast();

  useEffect(() => {
    setMutationQueueErrorHandler((message) => {
      showToast({ message, variant: 'error', durationMs: 6000 });
    });
    return () => setMutationQueueErrorHandler(null);
  }, [showToast]);

  return null;
}
