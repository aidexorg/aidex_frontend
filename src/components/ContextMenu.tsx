import { useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Pencil,
  Phone,
  User,
  XCircle,
} from 'lucide-react';
import type { Appointment } from '@/types';
import { getNextStatuses } from '@/types';

export interface ContextMenuItem {
  label: string;
  icon: typeof CheckCircle2;
  color: string;
  action: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  appointment: Appointment;
  onClose: () => void;
  onStatusChange: (appt: Appointment, status: string) => void;
  onEdit: (appt: Appointment) => void;
  onOpenProfile?: (appt: Appointment) => void;
}

export function ContextMenu({
  x,
  y,
  appointment,
  onClose,
  onStatusChange,
  onEdit,
  onOpenProfile,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Build menu items
  const items: ContextMenuItem[] = [];

  // Status transitions
  for (const trans of getNextStatuses(appointment.status)) {
    items.push({
      label: trans.label,
      icon: CheckCircle2,
      color: trans.status === 'cancelled' || trans.status === 'no_show'
        ? 'text-red-600 hover:bg-red-50'
        : 'text-teal-600 hover:bg-teal-50',
      action: () => {
        onStatusChange(appointment, trans.status);
        onClose();
      },
    });
  }

  // Edit
  items.push({
    label: 'ویرایش',
    icon: Pencil,
    color: 'text-slate-600 hover:bg-slate-50',
    action: () => {
      onEdit(appointment);
      onClose();
    },
  });

  // Clamp position to viewport
  const menuWidth = 200;
  const menuHeight = items.length * 40 + 16;
  const clampedX = Math.min(x, window.innerWidth - menuWidth - 8);
  const clampedY = Math.min(y, window.innerHeight - menuHeight - 8);

  return (
    <div
      ref={ref}
      className="fixed z-[70] bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 min-w-[180px] animate-fade-in"
      style={{ left: clampedX, top: clampedY }}
    >
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <button
            key={i}
            type="button"
            onClick={item.action}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition ${item.color}`}
          >
            <Icon size={15} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
