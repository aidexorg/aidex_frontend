import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useConnectivity } from './ConnectivityProvider';
import { useData } from '@/data';
import { pendingMutationCount } from '@/data/mutationQueue';

export function OfflineBanner({ offset = 'layout' }: { offset?: 'layout' | 'auth' }) {
  const { online } = useConnectivity();
  const data = useData();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const sync = () => setPending(pendingMutationCount());
    sync();
    window.addEventListener('aidex:mutation-queue-changed', sync);
    return () => window.removeEventListener('aidex:mutation-queue-changed', sync);
  }, []);

  if (online) return null;

  const message =
    data.driver === 'local'
      ? 'حالت آفلاین — داده محلی'
      : pending > 0
        ? `آفلاین — ${pending} تغییر در صف همگام‌سازی`
        : 'اتصال اینترنت قطع است — تغییرات ذخیره می‌شوند و پس از اتصال ارسال می‌شوند';

  const topClass = offset === 'layout' ? 'top-[64px]' : 'top-3';

  return (
    <div
      role="status"
      className={`fixed ${topClass} inset-x-0 z-40 flex justify-center px-4 pointer-events-none`}
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 shadow-md dark:border-amber-800/50 dark:bg-amber-950/60 dark:text-amber-100">
        <WifiOff size={16} className="shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </div>
    </div>
  );
}
