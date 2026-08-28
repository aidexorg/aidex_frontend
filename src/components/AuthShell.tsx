import { type ReactNode } from 'react';
import { AppLogo, DecorativeBg } from './design';

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F8F9FA] flex flex-col items-center justify-center px-4 py-10">
      <DecorativeBg />
      <div className="relative z-10 mb-8">
        <AppLogo size="lg" />
      </div>
      <main aria-label="ورود به AIDEX" className="relative z-10 w-full max-w-md">
        {children}
      </main>
      <p className="relative z-10 mt-8 text-[11px] text-slate-400">نسخه ۱.۰ — ورود اپراتور</p>
    </div>
  );
}
