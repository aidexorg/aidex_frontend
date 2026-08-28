import { type ReactNode } from 'react';
import { AppLogo, DecorativeBg } from './design';
import { LocaleSwitcher } from './LocaleSwitcher';
import { useTranslation } from './LocaleProvider';

export function AuthShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[rgb(var(--color-bg))] flex flex-col items-center justify-center px-4 py-10">
      <DecorativeBg />
      <div className="relative z-10 mb-4 flex items-center gap-3">
        <AppLogo size="lg" />
        <LocaleSwitcher />
      </div>
      <main aria-label={t('auth.shellLabel')} className="relative z-10 w-full max-w-md">
        {children}
      </main>
      <p className="relative z-10 mt-8 text-[11px] text-slate-400">{t('auth.shellVersion')}</p>
    </div>
  );
}
