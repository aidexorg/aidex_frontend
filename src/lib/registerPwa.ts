import { registerSW } from 'virtual:pwa-register';

type RefreshHandler = () => void;

let refreshHandler: RefreshHandler | null = null;
let applyPwaUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null;

export function setPwaRefreshHandler(handler: RefreshHandler | null): void {
  refreshHandler = handler;
}

export function reloadForPwaUpdate(): void {
  void applyPwaUpdate?.(true);
}

/** Register service worker; call once from app entry. */
export function initPwaRegistration(): void {
  if (!('serviceWorker' in navigator)) return;

  applyPwaUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      refreshHandler?.();
    },
  });
}
