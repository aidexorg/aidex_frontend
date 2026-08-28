import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { reloadForPwaUpdate, setPwaRefreshHandler } from '@/lib/registerPwa';

export function PwaUpdateNotice() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    setPwaRefreshHandler(() => setUpdateReady(true));
    return () => setPwaRefreshHandler(null);
  }, []);

  if (!updateReady) return null;

  return (
    <div
      role="status"
      className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-6 md:right-auto md:max-w-sm z-[90]"
    >
      <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 shadow-lg dark:border-sky-800/50 dark:bg-sky-950/60 dark:text-sky-100">
        <RefreshCw size={16} className="shrink-0" aria-hidden="true" />
        <span className="flex-1">نسخه جدید اپلیکیشن آماده است</span>
        <button
          type="button"
          onClick={() => reloadForPwaUpdate()}
          className="shrink-0 rounded-lg bg-sky-600 px-3 py-1 text-xs font-medium text-white hover:bg-sky-700 transition"
        >
          بارگذاری مجدد
        </button>
      </div>
    </div>
  );
}
