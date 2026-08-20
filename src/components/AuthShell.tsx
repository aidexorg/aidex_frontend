import { type ReactNode } from 'react';
import { Stethoscope } from 'lucide-react';

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#101820] flex flex-col items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/5 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative z-10 flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-teal-900/50">
          <Stethoscope size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white leading-tight">ایدکس</h1>
          <p className="text-[11px] text-slate-400">مدیریت کلینیک دندان‌پزشکی</p>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md">{children}</div>
      <p className="relative z-10 mt-8 text-[11px] text-slate-500">نسخه ۱.۰ — ورود اپراتور</p>
    </div>
  );
}
