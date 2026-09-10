import { type ReactNode } from 'react';
import { AppLogo } from './design';
import { LocaleSwitcher } from './LocaleSwitcher';
import { useTranslation } from './LocaleProvider';

export function AuthShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-[100dvh] min-h-screen overflow-hidden bg-[rgb(var(--color-bg))] flex flex-col items-center justify-center px-4 py-6 sm:py-10">
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-sage-200/30 blur-3xl dark:bg-sage-800/15 pointer-events-none" aria-hidden />
      <div className="absolute -bottom-40 left-8 w-[28rem] h-[28rem] rounded-full bg-sage-200/20 blur-3xl dark:bg-sage-800/10 pointer-events-none" aria-hidden />
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
