import { type ReactNode, useState, useEffect, useRef, useMemo } from 'react';
import { FolderOpen, CalendarDays, LayoutDashboard, LogOut, Search, ChevronDown, Menu, X } from 'lucide-react';
import type { Account, Profile } from '@/types';
import type { MessageKey } from '@/i18n/messages';
import { AppLogo, DecorativeBg } from './design';
import { CommandPalette } from './CommandPalette';
import { ThemeToggle } from './ThemeToggle';
import { LocaleSwitcher } from './LocaleSwitcher';
import { OfflineModeToggle } from './OfflineModeToggle';
import { useTranslation } from './LocaleProvider';
import { useDialogFocus } from '@/lib/accessibility';

export type View =
  | 'dashboard'
  | 'profiles'
  | 'appointments'
  | 'register'
  | 'login';

const NAV_ITEM_DEFS: { key: View; labelKey: MessageKey; icon: typeof FolderOpen }[] = [
  { key: 'dashboard', labelKey: 'layout.nav.dashboard', icon: LayoutDashboard },
  { key: 'profiles', labelKey: 'layout.nav.profiles', icon: FolderOpen },
  { key: 'appointments', labelKey: 'layout.nav.appointments', icon: CalendarDays },
];

interface LayoutProps {
  current: View;
  onNavigate: (view: View) => void;
  children: ReactNode;
  account: Account | null;
  onLogout: () => void;
  onSelectProfile?: (profile: Profile) => void;
}

function displayName(account: Account): string {
  return account.display_name || account.email.split('@')[0];
}

function initials(account: Account): string {
  const source = (account.display_name || account.email).trim();
  return source.slice(0, 1).toUpperCase();
}

export function Layout({ current, onNavigate, children, account, onLogout, onSelectProfile }: LayoutProps) {
  const { t } = useTranslation();
  const authed = account !== null;
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLElement>(null);

  const navItems = useMemo(
    () =>
      NAV_ITEM_DEFS.map((item) => ({
        ...item,
        label: t(item.labelKey),
      })),
    [t],
  );

  useDialogFocus({
    open: mobileMenuOpen,
    containerRef: mobileMenuRef,
    onClose: () => setMobileMenuOpen(false),
    lockScroll: true,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        !e.defaultPrevented &&
        !e.repeat &&
        !e.isComposing &&
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === 'k'
      ) {
        e.preventDefault();
        if (authed) {
          setMobileMenuOpen(false);
          setPaletteOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authed]);

  const navButton = (item: (typeof navItems)[number], mobile = false) => {
    const Icon = item.icon;
    const active = current === item.key;
    return (
      <button
        key={item.key}
        type="button"
        onClick={() => {
          onNavigate(item.key);
          setMobileMenuOpen(false);
        }}
        aria-current={active ? 'page' : undefined}
        className={active ? 'nav-item-active w-full' : `nav-item w-full ${mobile ? '' : ''}`}
      >
        <Icon size={18} className={active ? 'text-sage-600' : 'text-slate-400'} />
        {item.label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--color-bg))] flex flex-col md:flex-row relative">
      <a
        href="#main-content"
        className="fixed start-4 top-3 z-[100] -translate-y-20 rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white shadow-lg transition-transform focus:translate-y-0"
      >
        {t('layout.skipToContent')}
      </a>
      <DecorativeBg />

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[240px] flex-col bg-white/80 backdrop-blur-sm border-s border-slate-100 sticky top-0 h-screen shrink-0 z-20 dark:bg-slate-900/80 dark:border-slate-800">
        <div className="px-5 py-6">
          <AppLogo size="md" />
        </div>
        {authed && (
          <nav aria-label={t('layout.nav.main')} className="flex-1 px-3 py-2 space-y-1">
            {navItems.map((item) => navButton(item))}
          </nav>
        )}
        {!authed && <div className="flex-1" />}
        <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[10px] text-slate-400 px-1 dark:text-slate-500">{t('layout.version')}</p>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100 dark:bg-slate-900/80 dark:border-slate-800">
          <div className="flex items-center gap-3 px-4 md:px-6 lg:px-8 h-[64px]">
            <button
              type="button"
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setMobileMenuOpen(true)}
              aria-label={t('layout.menu')}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
            >
              <Menu size={20} />
            </button>

            <div className="hidden md:block md:flex-1" />

            {authed && (
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                aria-label={t('layout.searchOpen')}
                aria-keyshortcuts="Control+K Meta+K"
                aria-expanded={paletteOpen}
                aria-controls="command-palette-dialog"
                className="flex-1 md:max-w-xl flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50/80 text-sm text-slate-400 hover:border-sage-300 hover:bg-white transition dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-500 dark:hover:border-sage-500 dark:hover:bg-slate-800"
              >
                <Search size={16} className="shrink-0" />
                <span className="flex-1 text-start truncate">
                  {t('layout.searchPlaceholder')}
                </span>
                <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-400 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-500">
                  Ctrl+K
                </kbd>
              </button>
            )}

            {authed && account && (
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <OfflineModeToggle />
                <LocaleSwitcher />
                <ThemeToggle />
                <div className="hidden sm:block text-start">
                  <p className="text-sm font-semibold text-brand-navy truncate max-w-[140px] dark:text-slate-100">
                    {t('layout.doctorGreeting', { name: displayName(account) })}
                  </p>
                  <p className="text-[11px] text-slate-400">{t('layout.doctorRole')}</p>
                </div>
                <div className="relative group">
                  <button
                    type="button"
                    className="flex items-center gap-1"
                    onClick={onLogout}
                    title={t('layout.logout')}
                    aria-label={t('layout.logoutAccount')}
                  >
                    <div className="w-10 h-10 rounded-full bg-sage-100 text-sage-700 flex items-center justify-center text-sm font-bold border-2 border-white shadow-sm dark:bg-sage-900/60 dark:text-sage-300 dark:border-slate-700">
                      {initials(account)}
                    </div>
                    <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30" onClick={() => setMobileMenuOpen(false)} />
            <aside
              ref={mobileMenuRef}
              id="mobile-navigation-drawer"
              role="dialog"
              aria-modal="true"
              aria-label={t('layout.menuDialog')}
              tabIndex={-1}
              className="absolute end-0 top-0 bottom-0 w-[280px] bg-white shadow-xl flex flex-col dark:bg-slate-900 dark:shadow-black/40"
            >
              <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 dark:border-slate-800">
                <AppLogo size="sm" />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label={t('layout.menuClose')}
                >
                  <X size={20} />
                </button>
              </div>
              <nav aria-label={t('layout.nav.mobile')} className="flex-1 px-3 py-4 space-y-1">
                {navItems.map((item) => navButton(item, true))}
              </nav>
              <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
                <LocaleSwitcher />
                <ThemeToggle />
              </div>
              {account && (
                <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={onLogout} className="nav-item w-full text-red-600">
                    <LogOut size={18} />
                    {t('layout.logout')}
                  </button>
                </div>
              )}
            </aside>
          </div>
        )}

        <main
          id="main-content"
          tabIndex={-1}
          className={`flex-1 min-w-0 ${authed ? 'pb-20 md:pb-0' : ''}`}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      {authed && (
        <nav aria-label={t('layout.nav.bottom')} className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-100 z-30 grid grid-cols-3 shadow-[0_-4px_20px_rgb(0_0_0_/_0.06)] dark:bg-slate-900 dark:border-slate-800 dark:shadow-[0_-4px_20px_rgb(0_0_0_/_0.25)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = current === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] py-2 transition ${
                  active ? 'text-sage-600' : 'text-slate-400'
                }`}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {authed && (
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          onSelectProfile={(profile) => onSelectProfile?.(profile)}
        />
      )}
    </div>
  );
}
