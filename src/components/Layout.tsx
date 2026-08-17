import { type ReactNode } from 'react';
import {
  Users,
  CalendarClock,
  ClipboardList,
  Wallet,
  AlertCircle,
  FileText,
  BarChart3,
  Stethoscope,
} from 'lucide-react';

export type View =
  | 'profiles'
  | 'followups'
  | 'payments'
  | 'reports'
  | 'outputs';

interface NavItem {
  key: View;
  label: string;
  icon: typeof Users;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'profiles', label: 'پرونده‌ها', icon: Users },
  { key: 'followups', label: 'پیگیری‌ها', icon: AlertCircle },
  { key: 'payments', label: 'پرداخت‌ها', icon: Wallet },
  { key: 'reports', label: 'گزارش درآمد', icon: BarChart3 },
  { key: 'outputs', label: 'خروجی قالب', icon: FileText },
];

interface LayoutProps {
  current: View;
  onNavigate: (view: View) => void;
  children: ReactNode;
}

export function Layout({ current, onNavigate, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-l border-slate-200 sticky top-0 h-screen">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white shadow-sm">
            <Stethoscope size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">ایدکس</h1>
            <p className="text-[11px] text-slate-400">مدیریت کلینیک دندان‌پزشکی</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = current === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={18} className={active ? 'text-teal-600' : 'text-slate-400'} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-slate-200 text-[11px] text-slate-400">
          نسخه ۱.۰ — سامانه مدیریت کلینیک
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="flex items-center gap-2.5 px-4 py-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white">
            <Stethoscope size={20} />
          </div>
          <h1 className="text-base font-bold text-slate-900">ایدکس</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 animate-fade-in">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-30 grid grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = current === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 transition ${
                active ? 'text-teal-600' : 'text-slate-400'
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
