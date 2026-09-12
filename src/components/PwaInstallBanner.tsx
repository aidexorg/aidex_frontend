import { Download, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from './LocaleProvider';

/** Captures the browser's install prompt and shows a dismissible install banner. */
export function PwaInstallBanner() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    if (sessionStorage.getItem('aidex:pwa-install-dismissed')) {
      setDismissed(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    const prompt = deferredPrompt as BeforeInstallPromptEvent;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    sessionStorage.setItem('aidex:pwa-install-dismissed', '1');
  }, []);

  // Don't show if no prompt available, already dismissed, or already installed
  if (!deferredPrompt || dismissed || installed) return null;

  return (
    <div
      role="status"
      className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-6 md:right-auto md:max-w-sm z-[90]"
    >
      <div className="flex items-center gap-3 rounded-xl border border-sage-200 bg-white px-4 py-3 text-sm text-brand-navy shadow-lg dark:border-sage-800/50 dark:bg-slate-800 dark:text-sage-100">
        <div className="w-9 h-9 rounded-xl bg-sage-100 flex items-center justify-center shrink-0 dark:bg-sage-900/60">
          <Download size={18} className="text-sage-600 dark:text-sage-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-xs">{t('pwa.installTitle')}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{t('pwa.installHint')}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstall}
            className="rounded-lg bg-sage-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sage-700 transition"
          >
            {t('pwa.install')}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            aria-label={t('common.close')}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}
