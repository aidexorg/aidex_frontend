import { Info } from 'lucide-react';
import type { FormDraftControls } from '@/lib/useFormDraft';
import { useTranslation } from './LocaleProvider';
import { ConfirmDialog } from './ui';

export function FormDraftUI({ draft }: { draft: FormDraftControls }) {
  const { t } = useTranslation();

  return (
    <>
      {draft.showRestore && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-200 animate-fade-in"
        >
          <Info size={16} className="shrink-0" aria-hidden="true" />
          <span className="flex-1 min-w-[12rem]">{t('draft.restorePrompt')}</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={draft.restoreDraft} className="btn-primary text-xs py-1.5 px-3">
              {t('draft.restore')}
            </button>
            <button type="button" onClick={draft.discardStoredDraft} className="btn-secondary text-xs py-1.5 px-3">
              {t('draft.discardStored')}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={draft.discardOpen}
        title={t('draft.discardTitle')}
        message={t('draft.discardMessage')}
        confirmLabel={t('draft.discardConfirm')}
        cancelLabel={t('draft.discardCancel')}
        onConfirm={draft.confirmDiscard}
        onCancel={draft.cancelDiscard}
      />
    </>
  );
}
