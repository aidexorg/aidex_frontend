import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CalendarDays,
  Plus,
  Clock,
  User,
  Pencil,
  Trash2,
  Phone,
  Link,
} from 'lucide-react';
import { useData } from '@/data';
import { formatDate, toFaDigits } from '@/lib/format';
import {
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUSES,
  getNextStatuses,
  getStatusLabel,
  type Appointment,
  type AppointmentStatus,
} from '@/types';
import type { Profile } from '@/types';
import { LoadingState, EmptyState, ConfirmDialog } from './ui';
import { AppointmentForm } from './AppointmentForm';
import { DailyCalendar } from './DailyCalendar';
import { ContextMenu } from './ContextMenu';

interface AppointmentRow extends Appointment {
  profile: Profile | null;
}

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled: 'bg-slate-100 text-slate-600',
  confirmed: 'bg-sky-100 text-sky-700',
  arrived: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-teal-100 text-teal-700',
  completed: 'bg-emerald-100 text-emerald-700',
  no_show: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-400 line-through',
};

const TYPE_COLORS: Record<string, string> = {
  consultation: 'bg-sky-50 text-sky-700 border-sky-200',
  treatment: 'bg-teal-50 text-teal-700 border-teal-200',
  followup: 'bg-amber-50 text-amber-700 border-amber-200',
  emergency: 'bg-red-50 text-red-700 border-red-200',
  hygiene: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '';
  }
}

interface AppointmentsViewProps {
  onOpenProfile?: (profile: Profile) => void;
}

export function AppointmentsView({ onOpenProfile }: AppointmentsViewProps) {
  const data = useData();
  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | AppointmentStatus>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AppointmentRow | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    appointment: Appointment;
  } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [appointments, profiles] = await Promise.all([
        data.listAppointments(),
        data.listProfiles(),
      ]);
      const profileMap = new Map(profiles.map((p) => [p.id, p]));
      const joined: AppointmentRow[] = appointments.map((a) => ({
        ...a,
        profile: profileMap.get(a.profile_id) ?? null,
      }));
      setRows(joined);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = rows.filter(
    (r) => filter === 'all' || r.status === filter
  );

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await data.deleteAppointment(confirmDelete.id);
      setConfirmDelete(null);
      load();
    } catch {
      setConfirmDelete(null);
    }
  };

  const handleStatusChange = async (id: string, newStatus: AppointmentStatus) => {
    try {
      await data.updateAppointment(id, { status: newStatus });
      load();
    } catch {
      // toast error would go here
    }
  };

  const handleContextMenu = (e: React.MouseEvent, appt: Appointment) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, appointment: appt });
  };

  const handleTouchStart = (e: React.TouchEvent, appt: Appointment) => {
    const touch = e.touches[0];
    longPressTimerRef.current = setTimeout(() => {
      setContextMenu({ x: touch.clientX, y: touch.clientY, appointment: appt });
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const statusLabel = (s: AppointmentStatus) =>
    APPOINTMENT_STATUSES.find((st) => st.value === s)?.label ?? s;

  const typeLabel = (t: string) =>
    APPOINTMENT_TYPES.find((tp) => tp.value === t)?.label ?? t;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-title">نوبت‌ها</h1>
          <p className="page-sub">مدیریت نوبت‌های بیماران</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="btn-primary"
        >
          <Plus size={16} />
          نوبت جدید
        </button>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 rounded-xl border border-slate-200 p-0.5 bg-white w-fit">
        <button
          onClick={() => setViewMode('calendar')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
            viewMode === 'calendar'
              ? 'bg-teal-600 text-white'
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <CalendarDays size={14} />
          تقویم
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            viewMode === 'list'
              ? 'bg-teal-600 text-white'
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          لیست
        </button>
      </div>

      {viewMode === 'calendar' ? (
        <DailyCalendar onOpenProfile={onOpenProfile} />
      ) : (
      <>
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all' as const, label: 'همه', count: rows.length },
          ...APPOINTMENT_STATUSES.map((s) => ({
            key: s.value as AppointmentStatus,
            label: s.label,
            count: rows.filter((r) => r.status === s.value).length,
          })),
        ]
          .filter((tab) => tab.count > 0 || tab.key === 'all')
          .map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={filter === tab.key ? 'chip-active' : 'chip'}
            >
              {tab.label} ({toFaDigits(tab.count)})
            </button>
          ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<CalendarDays size={48} />}
            title={
              filter === 'all'
                ? 'هنوز نوبتی ثبت نشده'
                : 'نوبتی با این وضعیت وجود ندارد'
            }
            description={
              filter === 'all'
                ? 'برای شروع، اولین نوبت بیمار را ایجاد کنید.'
                : 'فیلتر را تغییر دهید یا نوبت جدید ایجاد کنید.'
            }
            action={
              filter === 'all' && (
                <button
                  onClick={() => setFormOpen(true)}
                  className="btn-primary mt-2"
                >
                  <Plus size={16} />
                  ایجاد نوبت
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => (
            <div
              key={row.id}
              className="card p-4 flex items-center gap-3 hover:shadow-lg transition-all"
              onContextMenu={(e) => handleContextMenu(e, row)}
              onTouchStart={(e) => handleTouchStart(e, row)}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchEnd}
            >
              {/* Type icon */}
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  TYPE_COLORS[row.type] ?? 'bg-slate-100 text-slate-600'
                }`}
              >
                <CalendarDays size={18} />
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-900">
                    {row.profile
                      ? `${row.profile.first_name} ${row.profile.last_name}`
                      : 'بیمار ناشناس'}
                  </span>
                  <span
                    className={`badge text-[10px] ${
                      TYPE_COLORS[row.type] ?? ''
                    } border`}
                  >
                    {typeLabel(row.type)}
                  </span>
                  <span
                    className={`badge text-[10px] ${
                      STATUS_COLORS[row.status] ?? ''
                    }`}
                  >
                    {statusLabel(row.status)}
                  </span>
                  {row.series_id && (
                    <span className="badge text-[10px] bg-purple-50 text-purple-600 border border-purple-200">
                      <Link size={10} />
                      تکراری
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {formatDate(row.start_time)} — {formatTime(row.start_time)}
                  </span>
                  <span>{toFaDigits(row.duration_minutes)} دقیقه</span>
                  {row.notes && (
                    <span className="truncate max-w-[200px]">{row.notes}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {row.profile && onOpenProfile && (
                  <button
                    onClick={() => onOpenProfile(row.profile!)}
                    className="text-slate-400 hover:text-teal-600 p-1.5 rounded-lg hover:bg-slate-50"
                    title="پرونده بیمار"
                  >
                    <User size={15} />
                  </button>
                )}
                {row.profile?.phone && (
                  <a
                    href={`tel:${row.profile.phone}`}
                    className="text-slate-400 hover:text-teal-600 p-1.5 rounded-lg hover:bg-slate-50"
                    title="تماس"
                  >
                    <Phone size={15} />
                  </a>
                )}
                <button
                  onClick={() => {
                    setEditing(row);
                    setFormOpen(true);
                  }}
                  className="text-slate-400 hover:text-teal-600 p-1.5 rounded-lg hover:bg-slate-50"
                  title="ویرایش"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setConfirmDelete(row)}
                  className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50"
                  title="حذف"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Status action buttons */}
              {getNextStatuses(row.status).length > 0 && (
                <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-100">
                  {getNextStatuses(row.status).map((trans) => (
                    <button
                      key={trans.status}
                      onClick={() => handleStatusChange(row.id, trans.status)}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition ${trans.color}`}
                    >
                      {trans.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </>
      )}

      {/* Form */}
      {formOpen && (
        <AppointmentForm
          open={formOpen}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSaved={() => {
            setFormOpen(false);
            setEditing(null);
            load();
          }}
          editing={editing}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={confirmDelete !== null}
        title="حذف نوبت"
        message={`آیا از حذف نوبت ${
          confirmDelete?.profile
            ? `${confirmDelete.profile.first_name} ${confirmDelete.profile.last_name}`
            : ''
        } در ${formatDate(confirmDelete?.start_time ?? '')} مطمئن هستید؟`}
        confirmLabel="حذف"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          appointment={contextMenu.appointment}
          onClose={() => setContextMenu(null)}
          onStatusChange={(appt, status) =>
            handleStatusChange(appt.id, status as AppointmentStatus)
          }
          onEdit={(appt) => {
            setEditing(appt);
            setFormOpen(true);
          }}
          onOpenProfile={onOpenProfile}
        />
      )}
    </div>
  );
}
