import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus,
  Clock,
  User,
  Pencil,
  Trash2,
  Phone,
  Link,
  CalendarDays,
} from 'lucide-react';
import { useData } from '@/data';
import { formatDate, toFaDigits, formatPrice } from '@/lib/format';
import { runBulk } from '@/lib/bulkRun';
import {
  APPOINTMENT_STATUSES,
  getNextStatuses,
  type Appointment,
  type AppointmentStatus,
} from '@/types';
import type { Profile } from '@/types';
import { LoadingState, EmptyState, ConfirmDialog } from './ui';
import { BulkActionBar, PageHeader, StatCard } from './design';
import { useToast } from './ToastProvider';
import { AppointmentForm } from './AppointmentForm';
import { DailyCalendar } from './DailyCalendar';
import { WeeklyCalendar } from './WeeklyCalendar';
import { MonthlyCalendar } from './MonthlyCalendar';
import { ArrivalsView } from './ArrivalsView';
import { ContextMenu } from './ContextMenu';
import { CreditCard, Users, Wallet, TrendingUp } from 'lucide-react';
import {
  type CalendarViewMode,
  STATUS_BADGE,
  TYPE_BADGE,
  TYPE_BORDER,
  todayISODate,
  addDays,
  getWeekStart,
  getMonthStart,
  addMonths,
  jalaliDayLabel,
  jalaliMonthYear,
  getWeekDates,
  isSameMonth,
  appointmentStatusLabel,
  appointmentTypeLabel,
  CalendarViewTabs,
  CalendarDateNav,
  CalendarLegend,
  AppointmentStatusActions,
} from './calendar';

interface AppointmentRow extends Appointment {
  profile: Profile | null;
}

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
  const [viewMode, setViewMode] = useState<CalendarViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState(todayISODate());
  const [weekStart, setWeekStart] = useState(getWeekStart(todayISODate()));
  const [currentMonth, setCurrentMonth] = useState(getMonthStart(todayISODate()));
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
      setRows(
        appointments.map((a) => ({
          ...a,
          profile: profileMap.get(a.profile_id) ?? null,
        }))
      );
      const totalReceived = payments.reduce((s, p) => s + p.amount, 0);
      const appointmentCount = appointments.length;
      setFinancialStats({
        totalReceived,
        appointmentCount,
        avgPerAppointment:
          appointmentCount > 0 ? Math.round(totalReceived / appointmentCount) : 0,
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

  const filtered = rows.filter((r) => filter === 'all' || r.status === filter);

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
      // silent
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

  const handleOpenProfileFromPartial = useCallback(
    (partial: { id: string }) => {
      if (!onOpenProfile) return;
      const row = rows.find((r) => r.profile_id === partial.id);
      if (row?.profile) onOpenProfile(row.profile);
    },
    [onOpenProfile, rows]
  );

  const openNewAppointment = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleGoToToday = () => {
    const today = todayISODate();
    setSelectedDate(today);
    setWeekStart(getWeekStart(today));
    setCurrentMonth(getMonthStart(today));
  };

  const weekDates = getWeekDates(weekStart);
  const monthAppointmentCount = rows.filter((r) =>
    isSameMonth(r.start_time.slice(0, 10), currentMonth)
  ).length;

  const dateNavConfig = useMemo(() => {
    switch (viewMode) {
      case 'daily':
        return {
          title: jalaliDayLabel(selectedDate),
          subtitle: formatDate(selectedDate),
          showToday: selectedDate !== todayISODate(),
          onPrev: () => setSelectedDate(addDays(selectedDate, -1)),
          onNext: () => setSelectedDate(addDays(selectedDate, 1)),
          prevLabel: 'روز قبل',
          nextLabel: 'روز بعد',
        };
      case 'weekly':
        return {
          title: jalaliMonthYear(weekDates[0]),
          subtitle: `${formatDate(weekDates[0])} — ${formatDate(weekDates[6])}`,
          showToday: !weekDates.includes(todayISODate()),
          onPrev: () => setWeekStart(addDays(weekStart, -7)),
          onNext: () => setWeekStart(addDays(weekStart, 7)),
          prevLabel: 'هفته قبل',
          nextLabel: 'هفته بعد',
        };
      case 'monthly':
        return {
          title: jalaliMonthYear(currentMonth),
          subtitle: `${toFaDigits(monthAppointmentCount)} نوبت در این ماه`,
          showToday: !isSameMonth(todayISODate(), currentMonth),
          onPrev: () => setCurrentMonth(addMonths(currentMonth, -1)),
          onNext: () => setCurrentMonth(addMonths(currentMonth, 1)),
          prevLabel: 'ماه قبل',
          nextLabel: 'ماه بعد',
        };
      default:
        return null;
    }
  }, [
    viewMode,
    selectedDate,
    weekStart,
    weekDates,
    currentMonth,
    monthAppointmentCount,
  ]);

  const isCalendarView = viewMode === 'daily' || viewMode === 'weekly' || viewMode === 'monthly';

  if (formOpen) {
    return (
      <AppointmentForm
        variant="page"
        backLabel="بازگشت به نوبت‌ها"
        open
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
    );
  }

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="تقویم نوبت‌ها"
        subtitle="مدیریت و برنامه‌ریزی نوبت‌های بیماران"
        action={
          <button type="button" onClick={openNewAppointment} className="btn-sage">
            <Plus size={16} />
            نوبت جدید
          </button>
        }
      />

      <div className="card space-y-3 p-2 sm:p-3 dark:border-slate-600 sm:p-4">
        <CalendarViewTabs value={viewMode} onChange={setViewMode} />
        {dateNavConfig && (
          <CalendarDateNav {...dateNavConfig} onToday={handleGoToToday} />
        )}
        {isCalendarView && <CalendarLegend />}
      </div>

      {viewMode === 'daily' && (
        <DailyCalendar
          embedded
          selectedDate={selectedDate}
          onSelectedDateChange={setSelectedDate}
          onOpenProfile={handleOpenProfileFromPartial}
        />
      )}

      {viewMode === 'weekly' && (
        <WeeklyCalendar
          embedded
          weekStart={weekStart}
          onWeekStartChange={setWeekStart}
          onOpenProfile={handleOpenProfileFromPartial}
        />
      )}

      {viewMode === 'monthly' && (
        <MonthlyCalendar
          embedded
          currentMonth={currentMonth}
          onCurrentMonthChange={setCurrentMonth}
          onOpenProfile={handleOpenProfileFromPartial}
          onSelectDate={(date) => {
            setSelectedDate(date);
            setViewMode('daily');
          }}
        />
      )}

      {viewMode === 'arrivals' && (
        <ArrivalsView embedded onOpenProfile={onOpenProfile} />
      )}

      {viewMode === 'list' && (
        <>
          <div
            role="group"
            aria-label="فیلتر وضعیت نوبت‌ها"
            className="flex flex-wrap gap-2"
          >
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
            <div className="card dark:border-slate-600">
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
                    <button type="button" onClick={openNewAppointment} className="btn-primary mt-2">
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
                  className={`card p-4 transition-all hover:shadow-md dark:border-slate-600 ${
                    selectedIds.has(row.id) ? 'ring-2 ring-sage-300 dark:ring-sage-600' : ''
                  }`}
                  onContextMenu={(e) => handleContextMenu(e, row)}
                  onTouchStart={(e) => handleTouchStart(e, row)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchEnd}
                >
                  <div className="flex items-start gap-3 sm:items-center">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-sage-600 sm:mt-0"
                      checked={selectedIds.has(row.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleSelected(row.id)}
                      aria-label={`انتخاب نوبت ${
                        row.profile
                          ? `${row.profile.first_name} ${row.profile.last_name}`
                          : ''
                      } در ${formatDate(row.start_time)}`}
                    />

                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                        TYPE_BORDER[row.type] ?? 'border-slate-200 dark:border-slate-600'
                      } ${TYPE_BADGE[row.type] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}
                    >
                      <CalendarDays size={18} aria-hidden />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {row.profile
                            ? `${row.profile.first_name} ${row.profile.last_name}`
                            : 'بیمار ناشناس'}
                        </span>
                        <span className={`badge text-[10px] ${TYPE_BADGE[row.type] ?? ''}`}>
                          {appointmentTypeLabel(row.type)}
                        </span>
                        <span className={`badge text-[10px] ${STATUS_BADGE[row.status] ?? ''}`}>
                          {appointmentStatusLabel(row.status)}
                        </span>
                        {row.series_id && (
                          <span className="badge border border-purple-200 bg-purple-50 text-[10px] text-purple-600 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
                            <Link size={10} aria-hidden />
                            تکراری
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock size={11} aria-hidden />
                          {formatDate(row.start_time)} — {formatTime(row.start_time)}
                        </span>
                        <span>{toFaDigits(row.duration_minutes)} دقیقه</span>
                        {row.notes && (
                          <span className="max-w-[200px] truncate">{row.notes}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {row.profile && onOpenProfile && (
                        <button
                          type="button"
                          onClick={() => onOpenProfile(row.profile!)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-teal-600 dark:hover:bg-slate-700"
                          title="پرونده بیمار"
                          aria-label={`باز کردن پرونده ${row.profile.first_name} ${row.profile.last_name}`}
                        >
                          <User size={15} />
                        </button>
                      )}
                      {row.profile?.phone && (
                        <a
                          href={`tel:${row.profile.phone}`}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-teal-600 dark:hover:bg-slate-700"
                          title="تماس"
                          aria-label={`تماس با ${row.profile.first_name} ${row.profile.last_name}`}
                        >
                          <Phone size={15} />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(row);
                          setFormOpen(true);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-teal-600 dark:hover:bg-slate-700"
                        title="ویرایش"
                        aria-label="ویرایش نوبت"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(row)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                        title="حذف"
                        aria-label="حذف نوبت"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <AppointmentStatusActions
                    status={row.status}
                    onStatusChange={(status) => handleStatusChange(row.id, status)}
                    className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700"
                    stopPropagation={false}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {(viewMode === 'list' || viewMode === 'arrivals') && (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatCard
            label="جمع دریافتی"
            value={formatPrice(financialStats.totalReceived)}
            icon={CreditCard}
          />
          <StatCard
            label="تعداد نوبت"
            value={toFaDigits(financialStats.appointmentCount)}
            icon={CalendarDays}
          />
          <StatCard
            label="میانگین هر نوبت"
            value={formatPrice(financialStats.avgPerAppointment)}
            icon={TrendingUp}
          />
          <StatCard
            label="تکمیل شده"
            value={toFaDigits(rows.filter((r) => r.status === 'completed').length)}
            icon={Users}
          />
          <StatCard
            label="در انتظار"
            value={toFaDigits(
              rows.filter((r) => r.status === 'scheduled' || r.status === 'confirmed').length
            )}
            icon={Wallet}
          />
          <StatCard
            label="نرخ تکمیل"
            value={
              rows.length > 0
                ? `${toFaDigits(
                    Math.round(
                      (rows.filter((r) => r.status === 'completed').length / rows.length) * 100
                    )
                  )}%`
                : '—'
            }
            icon={TrendingUp}
          />
        </div>
      )}

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
