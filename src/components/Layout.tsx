import { type ReactNode, useState, useEffect, useCallback } from 'react';
import {
  Users,
  Wallet,
  AlertCircle,
  FileText,
  BarChart3,
  CalendarDays,
  Stethoscope,
  LogOut,
  Search,
  LayoutDashboard,
} from 'lucide-react';
import type { Account, Profile } from '@/types';
import { toFaDigits } from '@/lib/format';
import { useFollowupCount } from './FollowupCountProvider';
import { CommandPalette } from './CommandPalette';

export type View =
  | 'dashboard'
  | 'profiles'
  | 'followups'
  | 'payments'
  | 'reports'
  | 'outputs'
  | 'appointments'
  | 'arrivals'
  | 'register'
  | 'login';

interface NavItem {
  key: View;
  label: string;
  icon: typeof Users;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { key: 'profiles', label: 'پرونده‌ها', icon: Users },
  { key: 'appointments', label: 'نوبت‌ها', icon: CalendarDays },
  { key: 'arrivals', label: 'ورودی‌ها', icon: Users },
  { key: 'followups', label: 'پیگیری‌ها', icon: AlertCircle },
  { key: 'payments', label: 'پرداخت‌ها', icon: Wallet },
  { key: 'reports', label: 'گزارش درآمد', icon: BarChart3 },
  { key: 'outputs', label: 'خروجی قالب', icon: FileText },
];

interface LayoutProps {
  current: View;
  onNavigate: (view: View) => void;
  children: ReactNode;
  account: Account | null;
  onLogout: () => void;
  onSelectProfile?: (profile: Profile) => void;
}

function initials(account: Account): string {
  const source = (account.display_name || account.email).trim();
  return source.slice(0, 1).toUpperCase();
}

function NavFollowupBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? `${toFaDigits(99)}+` : toFaDigits(count);
  return (
    <span className="absolute -top-1.5 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none flex items-center justify-center shadow-sm">
      {label}
    </span>
  );
}

export function Layout({ current, onNavigate, children, account, onLogout, onSelectProfile }: LayoutProps) {
  const authed = account !== null;
  const { count: followupCount } = useFollowupCount();
  const pageLabel = NAV_ITEMS.find((item) => item.key === current)?.label ?? 'ایدکس';
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (authed) {
          setPaletteOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authed]);

  return (
    <div className="min-h-screen bg-[#F3F5F8] flex flex-col md:flex-row">
      <aside className="hidden md:flex w-[260px] flex-col bg-[#101820] text-white sticky top-0 h-screen shrink-0">
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-teal-900/40">
            <Stethoscope size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">ایدکس</h1>
            <p className="text-[11px] text-slate-400">مدیریت کلینیک دندان‌پزشکی</p>
          </div>
        </div>

        {authed && (
          <nav className="flex-1 px-3 py-2 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = current === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onNavigate(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-teal-500/15 text-teal-300 shadow-[inset_0_0_0_1px_rgba(45,212,191,0.25)]'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <span className="relative shrink-0">
                    <Icon size={18} className={active ? 'text-teal-300' : 'text-slate-500'} />
                    {item.key === 'followups' && <NavFollowupBadge count={followupCount} />}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </nav>
        )}
        {!authed && <div className="flex-1" />}

        <div className="px-4 py-4 border-t border-white/10 space-y-3">
          {authed && (
            <div className="flex items-center gap-3 px-1">
              <div className="w-9 h-9 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center text-sm font-bold">
                {initials(account)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white truncate" title={account.email}>
                  {account.display_name || account.email}
                </p>
                <p className="text-[10px] text-slate-500 truncate">اپراتور</p>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition"
                title="خروج"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
          <p className="text-[10px] text-slate-600 px-1">نسخه ۱.۰ — دمو</p>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="hidden md:flex items-center gap-4 px-6 lg:px-8 h-[72px] sticky top-0 z-30 bg-white/75 backdrop-blur-xl border-b border-white/60">
          <div>
            <p className="text-[11px] text-slate-400">ایدکس</p>
            <h2 className="text-base font-semibold text-slate-900 leading-tight">{pageLabel}</h2>
          </div>
          <div className="flex-1" />
          {authed && (
            <div className="flex items-center gap-3">
              {/* Search button */}
              <button
                onClick={() => setPaletteOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-400 hover:text-slate-600 hover:border-slate-300 transition"
              >
                <Search size={14} />
                <span className="hidden lg:inline">جستجو...</span>
                <kbd className="hidden lg:inline px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono">
                  Ctrl+K
                </kbd>
              </button>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-800 truncate max-w-[180px]">
                  {account.display_name || account.email}
                </p>
                <p className="text-[11px] text-slate-400">اپراتور کلینیک</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-700 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-teal-700/20">
                {initials(account)}
              </div>
            </div>
          )}
        </header>

        <header className="md:hidden bg-[#101820] text-white sticky top-0 z-30">
          <div className="flex items-center gap-2.5 px-4 py-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-teal-700 flex items-center justify-center">
              <Stethoscope size={18} />
            </div>
            <h1 className="text-base font-bold flex-1">ایدکس</h1>
            {authed && (
              <button
                type="button"
                onClick={onLogout}
                className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/10 text-teal-200"
              >
                خروج
              </button>
            )}
          </div>
        </header>

        <main className={`flex-1 min-w-0 ${authed ? 'pb-24 md:pb-0' : 'pb-0'}`}>
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {authed && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[#101820] border-t border-white/10 z-30 grid grid-cols-5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = current === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                className={`relative flex flex-col items-center justify-center gap-0.5 py-2.5 transition ${
                  active ? 'text-teal-300' : 'text-slate-500'
                }`}
              >
                <span className="relative">
                  <Icon size={20} />
                  {item.key === 'followups' && <NavFollowupBadge count={followupCount} />}
                </span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}
      {/* Command Palette */}
      {authed && (
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          onSelectProfile={(profile) => {
            if (onSelectProfile) {
              onSelectProfile(profile);
            }
          }}
        />
      )}
    </div>
  );
}
