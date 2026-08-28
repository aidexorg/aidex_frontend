import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { runBulk } from '@/lib/bulkRun';
import {
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUSES,
  getNextStatuses,
  type Appointment,
  type AppointmentStatus,
} from '@/types';
import type { Profile } from '@/types';
import { LoadingState, EmptyState, ConfirmDialog } from './ui';
import { BulkActionBar } from './design';
import { useToast } from './ToastProvider';
import { AppointmentForm } from './AppointmentForm';
import { DailyCalendar } from './DailyCalendar';
import { WeeklyCalendar } from './WeeklyCalendar';
import { MonthlyCalendar } from './MonthlyCalendar';
import { ContextMenu } from './ContextMenu';
import { PageHeader, StatCard } from './design';
import { formatPrice } from '@/lib/format';
import { CreditCard, Users, Wallet, CalendarDays as CalIcon, TrendingUp } from 'lucide-react';

interface AppointmentRow extends Appointment {
  profile: Profile | null;
}

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  confirmed: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  arrived: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  in_progress: 'bg-sage-100 text-sage-700 dark:bg-sage-950/50 dark:text-sage-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  no_show: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  cancelled: 'bg-slate-100 text-slate-400 line-through dark:bg-slate-800 dark:text-slate-500',
};

const TYPE_COLORS: Record<string, string> = {
  consultation: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/50',
  treatment: 'bg-sage-50 text-sage-700 border-sage-200 dark:bg-sage-950/40 dark:text-sage-300 dark:border-sage-800/50',
  followup: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50',
  emergency: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/50',
  hygiene: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50',
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
  const { showToast } = useToast();
  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | AppointmentStatus>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AppointmentRow | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'weekly' | 'monthly'>('calendar');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    appointment: Appointment;
  } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [financialStats, setFinancialStats] = useState({
    totalReceived: 0,
    appointmentCount: 0,
    avgPerAppointment: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [appointments, profiles, payments] = await Promise.all([
        data.listAppointments(),
        data.listProfiles(),
        data.listPayments(),
      ]);
      const profileMap = new Map(profiles.map((p) => [p.id, p]));
      const joined: AppointmentRow[] = appointments.map((a) => ({
        ...a,
        profile: profileMap.get(a.profile_id) ?? null,
      }));
      setRows(joined);
      const totalReceived = payments.reduce((s, p) => s + p.amount, 0);
      const appointmentCount = appointments.length;
      setFinancialStats({
        totalReceived,
        appointmentCount,
        avgPerAppointment: appointmentCount > 0 ? Math.round(totalReceived / appointmentCount) : 0,
      });
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

  useEffect(() => {
    setSelectedIds(new Set());
  }, [filter]);

  useEffect(() => {
    if (viewMode !== 'list') setSelectedIds(new Set());
  }, [viewMode]);

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.has(r.id)),
    [rows, selectedIds]
  );

  /** Next statuses valid for EVERY selected appointment (never jump lifecycle). */
  const sharedNextStatuses = useMemo(() => {
    if (selectedRows.length === 0) return [];
    const perRow = selectedRows.map(
      (r) => new Map(getNextStatuses(r.status).map((t) => [t.status, t]))
    );
    const [first, ...rest] = perRow;
    return [...first.values()].filter((t) => rest.every((m) => m.has(t.status)));
  }, [selectedRows]);

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkStatus = async (status: AppointmentStatus) => {
    if (selectedRows.length === 0) return;
    setBulkBusy(true);
    const result = await runBulk(
      selectedRows,
      (row) => data.updateAppointment(row.id, { status }),
      { concurrency: 4 }
    );
    setBulkBusy(false);
    await load();
    if (result.failed.length === 0) {
      showToast({
        message: `${toFaDigits(result.succeeded.length)} نوبت به‌روزرسانی شد.`,
        variant: 'success',
      });
      setSelectedIds(new Set());
    } else {
      showToast({
        message: `${toFaDigits(result.succeeded.length)} نوبت به‌روزرسانی شد، ${toFaDigits(
          result.failed.length
        )} مورد ناموفق بود.`,
        variant: 'error',
      });
      setSelectedIds(new Set(result.failed.map((f) => f.item.id)));
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleteConfirm(false);
    if (selectedRows.length === 0) return;
    setBulkBusy(true);
    const result = await runBulk(
      selectedRows,
      (row) => data.deleteAppointment(row.id),
      { concurrency: 4 }
    );
    setBulkBusy(false);
    await load();
    if (result.failed.length === 0) {
      showToast({
        message: `${toFaDigits(result.succeeded.length)} نوبت حذف شد.`,
        variant: 'success',
      });
      setSelectedIds(new Set());
    } else {
      showToast({
        message: `${toFaDigits(result.succeeded.length)} نوبت حذف شد، ${toFaDigits(
          result.failed.length
        )} مورد ناموفق بود.`,
        variant: 'error',
      });
      setSelectedIds(new Set(result.failed.map((f) => f.item.id)));
    }
  };

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

  const handleOpenProfileFromPartial = useCallback(
    (partial: { id: string }) => {
      if (!onOpenProfile) return;
      const row = rows.find((r) => r.profile_id === partial.id);
      if (row?.profile) onOpenProfile(row.profile);
    },
    [onOpenProfile, rows]
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="تقویم نوبت‌ها"
        subtitle="مدیریت و برنامه‌ریزی نوبت‌های بیماران"
        action={
          <button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="btn-sage"
          >
            <Plus size={16} />
            نوبت جدید
          </button>
        }
      />

      {/* View toggle */}
      <div
        role="tablist"
        aria-label="نوع نمایش نوبت‌ها"
        className="flex gap-1 rounded-xl border border-slate-200 p-0.5 bg-white w-fit dark:border-slate-600 dark:bg-slate-800"
      >
        {(
          [
            { key: 'calendar' as const, label: 'روزانه' },
            { key: 'weekly' as const, label: 'هفته' },
            { key: 'monthly' as const, label: 'ماه' },
            { key: 'list' as const, label: 'لیست' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={viewMode === tab.key}
            tabIndex={viewMode === tab.key ? 0 : -1}
            onClick={() => setViewMode(tab.key)}
            onKeyDown={(event) => {
              const modes = ['calendar', 'weekly', 'monthly', 'list'] as const;
              const index = modes.indexOf(tab.key);
              let nextIndex: number | null = null;
              if (event.key === 'ArrowLeft') nextIndex = (index + 1) % modes.length;
              if (event.key === 'ArrowRight') {
                nextIndex = (index - 1 + modes.length) % modes.length;
              }
              if (event.key === 'Home') nextIndex = 0;
              if (event.key === 'End') nextIndex = modes.length - 1;
              if (nextIndex === null) return;
              event.preventDefault();
              setViewMode(modes[nextIndex]);
              const tabButtons =
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                  '[role="tab"]'
                );
              tabButtons?.[nextIndex]?.focus();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              viewMode === tab.key ? 'bg-sage-600 text-white' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            {tab.key !== 'list' && <CalendarDays size={14} />}
            {tab.label}
          </button>
        ))}
      </div>

      {viewMode === 'calendar' ? (
        <DailyCalendar onOpenProfile={handleOpenProfileFromPartial} />
      ) : viewMode === 'weekly' ? (
        <WeeklyCalendar onOpenProfile={handleOpenProfileFromPartial} />
      ) : viewMode === 'monthly' ? (
        <MonthlyCalendar
          onOpenProfile={handleOpenProfileFromPartial}
          onSelectDate={() => {
            // Store the selected date and switch to daily view
            // The DailyCalendar doesn't accept a date prop, so we navigate via state
            setViewMode('calendar');
          }}
        />
      ) : (
      <>
      {/* Filter chips */}
      <div role="group" aria-label="فیلتر وضعیت نوبت‌ها" className="flex flex-wrap gap-2">
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
              type="button"
              onClick={() => setFilter(tab.key)}
              aria-pressed={filter === tab.key}
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
          <BulkActionBar
            count={selectedIds.size}
            busy={bulkBusy}
            status={bulkBusy ? 'در حال اجرا…' : null}
            onClear={() => setSelectedIds(new Set())}
            actions={[
              ...sharedNextStatuses.map((trans) => ({
                key: `status-${trans.status}`,
                label: trans.label,
                onClick: () => void handleBulkStatus(trans.status),
              })),
              {
                key: 'delete',
                label: 'حذف',
                danger: true,
                onClick: () => setBulkDeleteConfirm(true),
              },
            ]}
          />
          {filtered.map((row) => (
            <div
              key={row.id}
              className={`card p-4 flex items-center gap-3 hover:shadow-lg transition-all ${
                selectedIds.has(row.id) ? 'ring-2 ring-sage-300' : ''
              }`}
              onContextMenu={(e) => handleContextMenu(e, row)}
              onTouchStart={(e) => handleTouchStart(e, row)}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchEnd}
            >
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-sage-600"
                checked={selectedIds.has(row.id)}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleSelected(row.id)}
                aria-label={`انتخاب نوبت ${
                  row.profile
                    ? `${row.profile.first_name} ${row.profile.last_name}`
                    : ''
                } در ${formatDate(row.start_time)}`}
              />

              {/* Type icon */}
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  TYPE_COLORS[row.type] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                <CalendarDays size={18} />
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-900 dark:text-slate-100">
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
                    aria-label={`باز کردن پرونده ${row.profile.first_name} ${row.profile.last_name}`}
                  >
                    <User size={15} />
                  </button>
                )}
                {row.profile?.phone && (
                  <a
                    href={`tel:${row.profile.phone}`}
                    className="text-slate-400 hover:text-teal-600 p-1.5 rounded-lg hover:bg-slate-50"
                    title="تماس"
                    aria-label={`تماس با ${row.profile.first_name} ${row.profile.last_name}`}
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
                  aria-label="ویرایش نوبت"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setConfirmDelete(row)}
                  className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50"
                  title="حذف"
                  aria-label="حذف نوبت"
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

      {/* Financial summary footer */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="جمع دریافتی" value={formatPrice(financialStats.totalReceived)} icon={CreditCard} />
        <StatCard label="تعداد نوبت" value={toFaDigits(financialStats.appointmentCount)} icon={CalIcon} />
        <StatCard label="میانگین هر نوبت" value={formatPrice(financialStats.avgPerAppointment)} icon={TrendingUp} />
        <StatCard label="تکمیل شده" value={toFaDigits(rows.filter((r) => r.status === 'completed').length)} icon={Users} />
        <StatCard label="در انتظار" value={toFaDigits(rows.filter((r) => r.status === 'scheduled' || r.status === 'confirmed').length)} icon={Wallet} />
        <StatCard
          label="نرخ تکمیل"
          value={
            rows.length > 0
              ? `${toFaDigits(Math.round((rows.filter((r) => r.status === 'completed').length / rows.length) * 100))}%`
              : '—'
          }
          icon={TrendingUp}
        />
      </div>

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

      {/* Bulk delete confirm */}
      <ConfirmDialog
        open={bulkDeleteConfirm}
        title="حذف گروهی نوبت‌ها"
        message={`آیا از حذف ${toFaDigits(selectedIds.size)} نوبت انتخاب‌شده مطمئن هستید؟`}
        confirmLabel="حذف"
        danger
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteConfirm(false)}
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
          onOpenProfile={
            onOpenProfile
              ? (appt) => {
                  const row = rows.find((r) => r.id === appt.id);
                  if (row?.profile) onOpenProfile(row.profile);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
