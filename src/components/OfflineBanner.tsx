import { WifiOff } from 'lucide-react';
import { useConnectivity } from './ConnectivityProvider';
import { useTranslation } from './LocaleProvider';

export function OfflineBanner({ offset = 'layout' }: { offset?: 'layout' | 'auth' }) {
  const { online } = useConnectivity();
  const { t } = useTranslation();

  if (online) return null;

  const topClass = offset === 'layout' ? 'top-[64px]' : 'top-3';

  return (
    <div
      role="status"
      className={`fixed ${topClass} inset-x-0 z-40 flex justify-center px-4 pointer-events-none`}
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 shadow-md dark:border-amber-800/50 dark:bg-amber-950/60 dark:text-amber-100">
        <WifiOff size={16} className="shrink-0" aria-hidden="true" />
        <span>{t('offline.generic')}</span>
      </div>
    </div>
  );
}
