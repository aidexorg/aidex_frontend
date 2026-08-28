import { useEffect, useId, useRef, useState } from 'react';
import { CalendarPlus, FileOutput, MoreVertical, Wallet } from 'lucide-react';
import { useTranslation } from './LocaleProvider';

export type ProfileQuickAction = 'payment' | 'newSession' | 'output';

interface ProfileQuickActionsMenuProps {
  profileLabel: string;
  onAction: (action: ProfileQuickAction) => void;
}

export function ProfileQuickActionsMenu({ profileLabel, onAction }: ProfileQuickActionsMenuProps) {
  const { t } = useTranslation();
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const runAction = (action: ProfileQuickAction) => {
    onAction(action);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const items: { action: ProfileQuickAction; icon: typeof Wallet; labelKey: 'profileQuickActions.payment' | 'profileQuickActions.newSession' | 'profileQuickActions.output' }[] = [
    { action: 'payment', icon: Wallet, labelKey: 'profileQuickActions.payment' },
    { action: 'newSession', icon: CalendarPlus, labelKey: 'profileQuickActions.newSession' },
    { action: 'output', icon: FileOutput, labelKey: 'profileQuickActions.output' },
  ];

  return (
    <div ref={containerRef} className="relative inline-flex" onClick={(event) => event.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={t('profileQuickActions.menuLabel', { name: profileLabel })}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
      >
        <MoreVertical size={16} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute end-0 top-full z-30 mt-1 min-w-[11rem] rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg dark:border-slate-600 dark:bg-slate-800"
        >
          {items.map(({ action, icon: Icon, labelKey }) => (
            <button
              key={action}
              type="button"
              role="menuitem"
              onClick={(event) => {
                event.stopPropagation();
                runAction(action);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 transition hover:bg-sage-50 dark:text-slate-200 dark:hover:bg-sage-950/40"
            >
              <Icon size={15} aria-hidden="true" />
              {t(labelKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
