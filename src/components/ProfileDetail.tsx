import { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import {
  ArrowRight,
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronLeft,
  Wallet,
  CalendarDays,
  Layers,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  CircleDot,
  Search,
  ChevronRight,
} from 'lucide-react';
import { useData } from '@/data';
import { formatPrice, formatDate, toFaDigits, todayISO } from '@/lib/format';
import type { Profile, Period, Session, Part, Action, Payment, Appointment } from '@/types';
import { APPOINTMENT_TYPES, getStatusLabel } from '@/types';
import { AREA_OPTIONS } from '@/types';
import { LoadingState, EmptyState, ErrorBanner, ConfirmDialog } from './ui';
import { useToast } from './ToastProvider';
import { useFollowupCount } from './FollowupCountProvider';
import { PeriodForm } from './PeriodForm';
import { ActionForm } from './ActionForm';
import { PaymentForm } from './PaymentForm';
import { AppointmentForm } from './AppointmentForm';

interface ProfileDetailProps {
  profile: Profile;
  onBack: () => void;
  onEditProfile: () => void;
}

/** BR-UX-05: bounded periods per page (accordion-heavy) */
const PERIOD_PAGE_SIZE = 6;

/** BR-POL-03: deferred delete undo window (ms) */
const DELETE_UNDO_MS = 30_000;

export function ProfileDetail({ profile, onBack, onEditProfile }: ProfileDetailProps) {
  const data = useData();
  const { showToast, showUndoToast } = useToast();
  const { refresh: refreshFollowupCount } = useFollowupCount();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [periodFormOpen, setPeriodFormOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  const [actionFormOpen, setActionFormOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [actionPartId, setActionPartId] = useState<string | null>(null);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentPeriodId, setPaymentPeriodId] = useState<string | null>(null);
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'period' | 'session' | 'part' | 'action' | 'payment';
    id: string;
    label: string;
  } | null>(null);
  const [appointmentFormOpen, setAppointmentFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [periodSearch, setPeriodSearch] = useState('');
  const [periodPage, setPeriodPage] = useState(1);
  /** BR-POL-03: hide until undo window expires */
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(() => new Set());
  const deleteTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = deleteTimersRef.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  /** BR-UX-01: keep viewport stable when accordion height changes */
  const periodsScrollRef = useRef<HTMLDivElement>(null);
  const scrollSnapshotRef = useRef<{ windowY: number; containerY: number } | null>(null);

  const captureScrollSnapshot = () => {
    scrollSnapshotRef.current = {
      windowY: window.scrollY,
      containerY: periodsScrollRef.current?.scrollTop ?? 0,
    };
  };

  const togglePeriod = (periodId: string) => {
    captureScrollSnapshot();
    if (expandedPeriod === periodId) {
      setExpandedSession(null);
      setExpandedPeriod(null);
    } else {
      setExpandedPeriod(periodId);
    }
  };

  const toggleSession = (sessionId: string) => {
    captureScrollSnapshot();
    setExpandedSession((current) => (current === sessionId ? null : sessionId));
  };

  useLayoutEffect(() => {
    const snap = scrollSnapshotRef.current;
    if (!snap) return;
    if (periodsScrollRef.current) {
      periodsScrollRef.current.scrollTop = snap.containerY;
    }
    window.scrollTo({ top: snap.windowY, left: 0, behavior: 'instant' });
    scrollSnapshotRef.current = null;
  }, [expandedPeriod, expandedSession]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const periodList = await data.listPeriods(profile.id);
      setPeriods(periodList);

      if (periodList.length > 0) {
        const periodIds = periodList.map((p) => p.id);
        setPayments(await data.listPayments(periodIds));

        const sessionList = await data.listSessions(periodIds);
        setSessions(sessionList);

        if (sessionList.length > 0) {
          const sessionIds = sessionList.map((s) => s.id);
          const partList = await data.listParts(sessionIds);
          setParts(partList);

          if (partList.length > 0) {
            const partIds = partList.map((p) => p.id);
            setActions(await data.listActions(partIds));
          } else {
            setActions([]);
          }
        } else {
          setParts([]);
          setActions([]);
        }
      } else {
        setSessions([]);
        setParts([]);
        setActions([]);
        setPayments([]);
      }

      // Load appointments for this patient
      setAppointments(await data.listAppointments({ profileId: profile.id }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری داده‌ها.');
    } finally {
      setLoading(false);
    }
  }, [profile.id, data]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Derived totals (exclude pending deletes from UI)
  const periodActions = (periodId: string) => {
    const sessionIds = sessions
      .filter((s) => s.period_id === periodId && !pendingDeleteIds.has(s.id))
      .map((s) => s.id);
    const partIds = parts
      .filter((p) => sessionIds.includes(p.session_id) && !pendingDeleteIds.has(p.id))
      .map((p) => p.id);
    return actions.filter((a) => partIds.includes(a.part_id) && !pendingDeleteIds.has(a.id));
  };
  const periodPayments = (periodId: string) =>
    payments.filter((p) => p.period_id === periodId && !pendingDeleteIds.has(p.id));
  const periodTotal = (periodId: string) => {
    const acts = periodActions(periodId);
    return acts.reduce((sum, a) => sum + (a.price - a.discount), 0);
  };
  const periodPaid = (periodId: string) =>
    periodPayments(periodId).reduce((sum, p) => sum + p.amount, 0);
  const periodRemaining = (periodId: string) => periodTotal(periodId) - periodPaid(periodId);

  const periodDisplayNum = (periodId: string) =>
    periods.findIndex((p) => p.id === periodId) + 1;

  const areaLabel = (code: string) =>
    AREA_OPTIONS.find((a) => a.value === code)?.label ?? code;

  const periodMatchesSearch = (period: Period) => {
    const q = periodSearch.trim().toLowerCase();
    if (!q) return true;
    const num = periodDisplayNum(period.id);
    const periodSessions = sessions.filter((s) => s.period_id === period.id);
    const haystack = [
      String(num),
      toFaDigits(num),
      ...period.teeth,
      ...period.areas,
      ...period.areas.map(areaLabel),
      ...periodSessions.map((s) => s.session_date),
      ...periodSessions.map((s) => formatDate(s.session_date)),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  };

  const filteredPeriods = periods.filter(
    (period) => !pendingDeleteIds.has(period.id) && periodMatchesSearch(period)
  );
  const periodTotalPages = Math.max(1, Math.ceil(filteredPeriods.length / PERIOD_PAGE_SIZE));
  const safePeriodPage = Math.min(periodPage, periodTotalPages);
  const periodPageStart = (safePeriodPage - 1) * PERIOD_PAGE_SIZE;
  const paginatedPeriods = filteredPeriods.slice(
    periodPageStart,
    periodPageStart + PERIOD_PAGE_SIZE
  );

  useEffect(() => {
    setPeriodPage(1);
  }, [periodSearch]);

  useEffect(() => {
    if (periodPage !== safePeriodPage) setPeriodPage(safePeriodPage);
  }, [periodPage, safePeriodPage]);

  useEffect(() => {
    if (!expandedPeriod) return;
    const start = (safePeriodPage - 1) * PERIOD_PAGE_SIZE;
    const onPage = filteredPeriods
      .slice(start, start + PERIOD_PAGE_SIZE)
      .some((p) => p.id === expandedPeriod);
    if (!onPage) {
      setExpandedPeriod(null);
      setExpandedSession(null);
    }
  }, [safePeriodPage, filteredPeriods, expandedPeriod]);

  const deleteSuccessMessage: Record<
    NonNullable<typeof confirmDelete>['type'],
    string
  > = {
    period: 'دوره درمان حذف شد.',
    session: 'جلسه حذف شد.',
    part: 'بخش درمان حذف شد.',
    action: 'اقدام درمانی حذف شد.',
    payment: 'پرداخت حذف شد.',
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    const { type, id, label } = confirmDelete;
    setConfirmDelete(null);

    setPendingDeleteIds((prev) => new Set(prev).add(id));

    const commitDelete = async () => {
      deleteTimersRef.current.delete(id);
      setPendingDeleteIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      try {
        if (type === 'period') await data.deletePeriod(id);
        else if (type === 'session') await data.deleteSession(id);
        else if (type === 'part') await data.deletePart(id);
        else if (type === 'action') await data.deleteAction(id);
        else await data.deletePayment(id);
        showToast({ message: deleteSuccessMessage[type], variant: 'success' });
        refreshFollowupCount();
        await loadAll();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'خطا در حذف.');
      }
    };

    const timer = setTimeout(() => {
      void commitDelete();
    }, DELETE_UNDO_MS);
    deleteTimersRef.current.set(id, timer);

    showUndoToast({
      message: `«${label}» حذف شد. تا ۳۰ ثانیه می‌توانید بازگردانی کنید.`,
      onUndo: () => {
        const pendingTimer = deleteTimersRef.current.get(id);
        if (pendingTimer) clearTimeout(pendingTimer);
        deleteTimersRef.current.delete(id);
        setPendingDeleteIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        showToast({ message: 'حذف لغو شد.', variant: 'info' });
      },
      durationMs: DELETE_UNDO_MS,
    });
  };

  const addSession = async (periodId: string) => {
    const existing = sessions.filter((s) => s.period_id === periodId);
    const nextNum = existing.length > 0 ? Math.max(...existing.map((s) => s.session_number)) + 1 : 1;
    try {
      await data.createSession({
        period_id: periodId,
        session_number: nextNum,
        session_date: todayISO(),
      });
      loadAll();
      setExpandedSession(null);
      setExpandedPeriod(periodId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ایجاد جلسه.');
    }
  };

  const addPart = async (sessionId: string) => {
    const existing = parts.filter((p) => p.session_id === sessionId);
    const nextNum = existing.length > 0 ? Math.max(...existing.map((p) => p.part_number)) + 1 : 1;
    const treatmentOrder = nextNum;
    try {
      await data.createPart({
        session_id: sessionId,
        part_number: nextNum,
        treatment_order: treatmentOrder,
        tooth: null,
        area: null,
      });
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ایجاد بخش.');
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="btn-ghost">
          <ArrowRight size={18} />
          بازگشت به پرونده‌ها
        </button>
      </div>

      {/* Patient card */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-700 text-white flex items-center justify-center text-lg font-bold shrink-0 shadow-md shadow-teal-700/20">
              {profile.first_name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-400">
                {profile.file_number ? `پرونده ${toFaDigits(profile.file_number)}` : 'پرونده بیمار'}
              </p>
              <h2 className="text-xl font-bold text-slate-900">
                {profile.first_name} {profile.last_name}
              </h2>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm text-slate-500">
                {profile.birth_year && (
                  <span>
                    <span className="text-slate-400 block text-[11px]">سال تولد</span>
                    {toFaDigits(profile.birth_year)}
                  </span>
                )}
                {profile.phone && (
                  <span>
                    <span className="text-slate-400 block text-[11px]">تلفن</span>
                    {toFaDigits(profile.phone)}
                  </span>
                )}
                {profile.national_id && (
                  <span>
                    <span className="text-slate-400 block text-[11px]">کد ملی</span>
                    {toFaDigits(profile.national_id)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onEditProfile} className="btn-secondary">
              <Pencil size={16} />
              ویرایش پرونده
            </button>
            <button
              onClick={() => {
                setEditingPeriod(null);
                setPeriodFormOpen(true);
              }}
              className="btn-secondary"
            >
              <Plus size={16} />
              دوره درمان جدید
            </button>
            <button
              onClick={() => {
                setAppointmentFormOpen(true);
              }}
              className="btn-primary"
            >
              <CalendarDays size={16} />
              نوبت جدید
            </button>
          </div>
        </div>
        {(profile.address || profile.clinical_notes || profile.file_description) && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {profile.address && (
              <div>
                <span className="text-slate-400">نشانی: </span>
                <span className="text-slate-600">{profile.address}</span>
              </div>
            )}
            {profile.file_description && (
              <div className="sm:col-span-2">
                <span className="text-slate-400">شرح پرونده: </span>
                <span className="text-slate-600">{profile.file_description}</span>
              </div>
            )}
            {profile.clinical_notes && (
              <div className="sm:col-span-2">
                <span className="text-slate-400">یادداشت بالینی: </span>
                <span className="text-slate-600">{profile.clinical_notes}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <ErrorBanner message={error} />}

      {/* Periods */}
      {periods.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Layers size={48} />}
            title="هنوز دوره درمانی ثبت نشده"
            description="برای شروع درمان، یک دوره جدید ایجاد کنید."
          />
        </div>
      ) : (
        <div className="card overflow-hidden flex flex-col max-h-[min(70vh,calc(100dvh-14rem))]">
          <div className="shrink-0 px-5 py-3 border-b border-slate-100 bg-slate-50/80 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">دوره‌های درمان</h3>
              <p className="text-xs text-slate-400 mt-0.5">باز و بسته کردن جلسات داخل همین ناحیه اسکرول می‌شود</p>
            </div>
            <div className="relative">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pr-9 text-sm py-2"
                placeholder="جستجو: شماره دوره، دندان، ناحیه، تاریخ جلسه…"
                value={periodSearch}
                onChange={(e) => setPeriodSearch(e.target.value)}
              />
            </div>
          </div>
          <div
            ref={periodsScrollRef}
            className="overflow-y-auto overscroll-contain p-3 space-y-3 min-h-0 flex-1"
          >
          {filteredPeriods.length === 0 ? (
            <EmptyState
              icon={<Layers size={40} />}
              title="دوره‌ای یافت نشد"
              description="عبارت جستجو را تغییر دهید یا فیلتر را پاک کنید."
            />
          ) : (
          paginatedPeriods.map((period) => {
            const displayNum = periodDisplayNum(period.id);
            const periodSess = sessions.filter(
              (s) => s.period_id === period.id && !pendingDeleteIds.has(s.id)
            );
            const expanded = expandedPeriod === period.id;
            const total = periodTotal(period.id);
            const paid = periodPaid(period.id);
            const remaining = periodRemaining(period.id);
            const actCount = periodActions(period.id).length;

            return (
              <div key={period.id} className="card overflow-hidden">
                {/* Period header */}
                <button
                  type="button"
                  onClick={() => togglePeriod(period.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition text-right"
                >
                  <div className="flex items-center gap-3">
                    {expanded ? (
                      <ChevronDown size={18} className="text-slate-400" />
                    ) : (
                      <ChevronLeft size={18} className="text-slate-400" />
                    )}
                    <div>
                      <div className="font-semibold text-slate-900">
                        دوره درمان {toFaDigits(displayNum)}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {periodSess.length} جلسه · {actCount} اقدام
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <div className="text-xs text-slate-400">باقی‌مانده</div>
                      <div
                        className={`text-sm font-semibold ${
                          remaining > 0 ? 'text-red-600' : 'text-emerald-600'
                        }`}
                      >
                        {formatPrice(remaining)}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Teeth/areas summary */}
                <div className="px-5 pb-3 flex flex-wrap gap-2">
                  {period.teeth.map((t) => (
                    <span
                      key={t}
                      className="badge bg-slate-100 text-slate-600"
                    >
                      دندان {t}
                    </span>
                  ))}
                  {period.areas.map((a) => (
                    <span
                      key={a}
                      className="badge bg-sky-50 text-sky-700 border border-sky-200"
                    >
                      {a === 'LJ' ? 'فک پایین' : a === 'UJ' ? 'فک بالا' : 'کل دهان'}
                    </span>
                  ))}
                </div>

                {expanded && (
                  <div className="border-t border-slate-100 px-5 py-4 space-y-4 animate-fade-in">
                    {/* Financial summary */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-slate-50 p-3 text-center">
                        <div className="text-xs text-slate-400">کل هزینه</div>
                        <div className="text-sm font-semibold text-slate-700 mt-1">
                          {formatPrice(total)}
                        </div>
                      </div>
                      <div className="rounded-lg bg-emerald-50 p-3 text-center">
                        <div className="text-xs text-emerald-600">پرداخت‌شده</div>
                        <div className="text-sm font-semibold text-emerald-700 mt-1">
                          {formatPrice(paid)}
                        </div>
                      </div>
                      <div className="rounded-lg bg-red-50 p-3 text-center">
                        <div className="text-xs text-red-600">باقی‌مانده</div>
                        <div className="text-sm font-semibold text-red-700 mt-1">
                          {formatPrice(remaining)}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => addSession(period.id)} className="btn-secondary text-xs">
                        <Plus size={14} />
                        جلسه جدید
                      </button>
                      <button
                        onClick={() => {
                          setEditingPeriod(period);
                          setPeriodFormOpen(true);
                        }}
                        className="btn-secondary text-xs"
                      >
                        <Pencil size={14} />
                        ویرایش دوره
                      </button>
                      <button
                        onClick={() => {
                          setPaymentPeriodId(period.id);
                          setEditingPayment(null);
                          setPaymentFormOpen(true);
                        }}
                        className="btn-secondary text-xs"
                      >
                        <Wallet size={14} />
                        ثبت پرداخت
                      </button>
                      <button
                        onClick={() =>
                          setConfirmDelete({
                            type: 'period',
                            id: period.id,
                            label: `دوره درمان ${toFaDigits(displayNum)}`,
                          })
                        }
                        className="btn-danger text-xs"
                      >
                        <Trash2 size={14} />
                        حذف دوره
                      </button>
                    </div>

                    {/* Sessions */}
                    {periodSess.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">
                        هنوز جلسه‌ای ثبت نشده. «جلسه جدید» را بزنید.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {periodSess.map((session) => {
                          const sessParts = parts.filter(
                            (p) => p.session_id === session.id && !pendingDeleteIds.has(p.id)
                          );
                          const sessExpanded = expandedSession === session.id;
                          return (
                            <div key={session.id} className="rounded-lg border border-slate-200">
                              <button
                                type="button"
                                onClick={() => toggleSession(session.id)}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition text-right"
                              >
                                <div className="flex items-center gap-2.5">
                                  {sessExpanded ? (
                                    <ChevronDown size={16} className="text-slate-400" />
                                  ) : (
                                    <ChevronLeft size={16} className="text-slate-400" />
                                  )}
                                  <CalendarDays size={16} className="text-teal-600" />
                                  <span className="text-sm font-medium text-slate-700">
                                    جلسه {toFaDigits(session.session_number)}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    {formatDate(session.session_date)}
                                  </span>
                                </div>
                                <span className="text-xs text-slate-400">
                                  {sessParts.length} بخش
                                </span>
                              </button>
                              {sessExpanded && (
                                <div className="border-t border-slate-100 px-4 py-3 space-y-2 animate-fade-in">
                                  {sessParts.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center py-2">
                      بخشی وجود ندارد.
                    </p>
                                  ) : (
                                    sessParts.map((part) => {
                                      const partActions = actions.filter(
                                        (a) =>
                                          a.part_id === part.id && !pendingDeleteIds.has(a.id)
                                      );
                                      return (
                                        <div
                                          key={part.id}
                                          className="rounded-lg bg-slate-50 p-3"
                                        >
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2 text-sm">
                                              <CircleDot size={14} className="text-slate-400" />
                                              <span className="font-medium text-slate-700">
                                                بخش {toFaDigits(part.part_number)}
                                              </span>
                                              {(part.tooth || part.area) && (
                                                <span className="text-xs text-slate-400">
                                                  {part.tooth && `دندان ${part.tooth}`}
                                                  {part.tooth && part.area && ' · '}
                                                  {part.area &&
                                                    (part.area === 'LJ'
                                                      ? 'فک پایین'
                                                      : part.area === 'UJ'
                                                        ? 'فک بالا'
                                                        : 'کل دهان')}
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex gap-1">
                                              <button
                                                onClick={() => addPart(session.id)}
                                                className="text-xs text-teal-600 hover:bg-teal-50 px-2 py-1 rounded"
                                              >
                                                + بخش
                                              </button>
                                              <button
                                                onClick={() =>
                                                  setConfirmDelete({
                                                    type: 'part',
                                                    id: part.id,
                                                    label: `بخش ${toFaDigits(part.part_number)}`,
                                                  })
                                                }
                                                className="text-red-500 hover:bg-red-50 p-1 rounded"
                                              >
                                                <Trash2 size={14} />
                                              </button>
                                            </div>
                                          </div>
                                          {/* Actions */}
                                          {partActions.length === 0 ? (
                                            <div className="flex items-center justify-between">
                                              <p className="text-xs text-slate-400">
                                                اقدامی ثبت نشده.
                                              </p>
                                              <button
                                                onClick={() => {
                                                  setActionPartId(part.id);
                                                  setEditingAction(null);
                                                  setActionFormOpen(true);
                                                }}
                                                className="text-xs text-teal-600 hover:bg-teal-50 px-2 py-1 rounded"
                                              >
                                                + اقدام
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="space-y-1.5">
                                              {partActions.map((action) => (
                                                <div
                                                  key={action.id}
                                                  className="flex items-center justify-between bg-white rounded-lg border border-slate-100 px-3 py-2"
                                                >
                                                  <div className="flex items-center gap-2 min-w-0">
                                                    {action.status === 'complete' ? (
                                                      <CheckCircle2
                                                        size={15}
                                                        className="text-emerald-500 shrink-0"
                                                      />
                                                    ) : (
                                                      <Clock
                                                        size={15}
                                                        className="text-amber-500 shrink-0"
                                                      />
                                                    )}
                                                    <span className="text-sm text-slate-700 truncate">
                                                      {action.title}
                                                    </span>
                                                    {action.needs_followup && (
                                                      <AlertCircle
                                                        size={13}
                                                        className="text-red-500 shrink-0"
                                                      />
                                                    )}
                                                  </div>
                                                  <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-xs font-medium text-slate-600">
                                                      {formatPrice(action.price - action.discount)}
                                                    </span>
                                                    <button
                                                      onClick={() => {
                                                        setActionPartId(part.id);
                                                        setEditingAction(action);
                                                        setActionFormOpen(true);
                                                      }}
                                                      className="text-slate-400 hover:text-teal-600 p-1"
                                                    >
                                                      <Pencil size={13} />
                                                    </button>
                                                    <button
                                                      onClick={() =>
                                                        setConfirmDelete({
                                                          type: 'action',
                                                          id: action.id,
                                                          label: action.title,
                                                        })
                                                      }
                                                      className="text-slate-400 hover:text-red-500 p-1"
                                                    >
                                                      <Trash2 size={13} />
                                                    </button>
                                                  </div>
                                                </div>
                                              ))}
                                              <button
                                                onClick={() => {
                                                  setActionPartId(part.id);
                                                  setEditingAction(null);
                                                  setActionFormOpen(true);
                                                }}
                                                className="text-xs text-teal-600 hover:bg-teal-50 px-2 py-1 rounded"
                                              >
                                                + اقدام
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  )}
                                  {sessParts.length > 0 && (
                                    <button
                                      onClick={() => addPart(session.id)}
                                      className="text-xs text-teal-600 hover:bg-teal-50 px-2 py-1 rounded"
                                    >
                                      + بخش جدید
                                    </button>
                                  )}
                                  <button
                                    onClick={() =>
                                      setConfirmDelete({
                                        type: 'session',
                                        id: session.id,
                                        label: `جلسه ${toFaDigits(session.session_number)}`,
                                      })
                                    }
                                    className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded"
                                  >
                                    حذف جلسه
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Payments list */}
                    {periodPayments(period.id).length > 0 && (
                      <div className="border-t border-slate-100 pt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Wallet size={15} className="text-emerald-600" />
                          <span className="text-sm font-medium text-slate-700">پرداخت‌ها</span>
                        </div>
                        <div className="space-y-1.5">
                          {periodPayments(period.id).map((pay) => (
                            <div
                              key={pay.id}
                              className="flex items-center justify-between bg-emerald-50/50 rounded-lg px-3 py-2"
                            >
                              <div className="text-sm">
                                <span className="text-slate-700">{formatPrice(pay.amount)}</span>
                                <span className="text-xs text-slate-400 mr-2">
                                  {formatDate(pay.payment_date)}
                                </span>
                                {pay.tracking_code && (
                                  <span className="text-xs text-slate-400 mr-2">
                                    کد: {toFaDigits(pay.tracking_code)}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => {
                                    setPaymentPeriodId(period.id);
                                    setEditingPayment(pay);
                                    setPaymentFormOpen(true);
                                  }}
                                  className="text-slate-400 hover:text-teal-600 p-1"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() =>
                                    setConfirmDelete({
                                      type: 'payment',
                                      id: pay.id,
                                      label: formatPrice(pay.amount),
                                    })
                                  }
                                  className="text-slate-400 hover:text-red-500 p-1"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
          )}
          </div>
          {periodTotalPages > 1 && (
            <div className="shrink-0 px-4 py-3 border-t border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                صفحه {toFaDigits(safePeriodPage)} از {toFaDigits(periodTotalPages)}
                <span className="text-slate-400 mx-1">·</span>
                {toFaDigits(filteredPeriods.length)} دوره
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPeriodPage((p) => Math.max(1, p - 1))}
                  disabled={safePeriodPage <= 1}
                  className="btn-secondary text-xs py-1.5 px-2.5 disabled:opacity-40"
                  aria-label="صفحه قبل"
                >
                  <ChevronRight size={14} />
                  قبلی
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodPage((p) => Math.min(periodTotalPages, p + 1))}
                  disabled={safePeriodPage >= periodTotalPages}
                  className="btn-secondary text-xs py-1.5 px-2.5 disabled:opacity-40"
                  aria-label="صفحه بعد"
                >
                  بعدی
                  <ChevronLeft size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Appointments section */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="icon-well bg-sky-50 text-sky-600">
              <CalendarDays size={20} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">نوبت‌ها</h3>
              <p className="text-xs text-slate-400">
                {appointments.length > 0
                  ? `${toFaDigits(appointments.length)} نوبت`
                  : 'هنوز نوبتی ثبت نشده'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setAppointmentFormOpen(true)}
            className="btn-primary text-xs"
          >
            <Plus size={14} />
            نوبت جدید
          </button>
        </div>

        {appointments.length > 0 && (
          <>
            {/* Stats */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
                <p className="text-[10px] text-slate-400">کل نوبت‌ها</p>
                <p className="text-sm font-bold text-slate-700">{toFaDigits(appointments.length)}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-center">
                <p className="text-[10px] text-emerald-600">تکمیل شده</p>
                <p className="text-sm font-bold text-emerald-700">
                  {toFaDigits(appointments.filter((a) => a.status === 'completed').length)}
                </p>
              </div>
              <div className="rounded-lg bg-red-50 px-3 py-2 text-center">
                <p className="text-[10px] text-red-600">عدم حضور</p>
                <p className="text-sm font-bold text-red-700">
                  {toFaDigits(appointments.filter((a) => a.status === 'no_show').length)}
                </p>
              </div>
              <div className="rounded-lg bg-sky-50 px-3 py-2 text-center">
                <p className="text-[10px] text-sky-600">نرخ تکمیل</p>
                <p className="text-sm font-bold text-sky-700">
                  {(() => {
                    const completed = appointments.filter((a) => a.status === 'completed').length;
                    const terminal = appointments.filter(
                      (a) => a.status === 'completed' || a.status === 'no_show'
                    ).length;
                    return terminal > 0
                      ? `${toFaDigits(Math.round((completed / terminal) * 100))}%`
                      : '—';
                  })()}
                </p>
              </div>
            </div>

            {/* List */}
            <div className="space-y-2">
              {[...appointments]
                .sort(
                  (a, b) =>
                    new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
                )
                .map((appt) => {
                  const typeCfg = APPOINTMENT_TYPES.find((t) => t.value === appt.type);
                  const isPast = new Date(appt.start_time).getTime() < Date.now();
                  return (
                    <div
                      key={appt.id}
                      className={`flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 hover:bg-slate-50 transition ${
                        isPast ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-slate-800">
                            {formatDate(appt.start_time)}
                          </span>
                          <span className="text-xs text-slate-400">
                            {(() => {
                              const d = new Date(appt.start_time);
                              return d.toLocaleTimeString('fa-IR', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                              });
                            })()}
                          </span>
                          <span className="text-xs text-slate-400">
                            {toFaDigits(appt.duration_minutes)} دقیقه
                          </span>
                          <span
                            className={`badge text-[10px] ${
                              typeCfg ? `bg-${typeCfg.color}-50 text-${typeCfg.color}-700 border border-${typeCfg.color}-200` : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {typeCfg?.label ?? appt.type}
                          </span>
                          <span
                            className={`badge text-[10px] ${
                              appt.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : appt.status === 'no_show'
                                ? 'bg-red-100 text-red-700'
                                : appt.status === 'cancelled'
                                ? 'bg-slate-100 text-slate-400 line-through'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {getStatusLabel(appt.status)}
                          </span>
                          {appt.series_id && (
                            <span className="badge text-[10px] bg-purple-50 text-purple-600 border border-purple-200">
                              تکراری
                            </span>
                          )}
                        </div>
                        {appt.notes && (
                          <p className="text-xs text-slate-400 mt-1 truncate">
                            {appt.notes}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setEditingAppointment(appt);
                          setAppointmentFormOpen(true);
                        }}
                        className="text-slate-400 hover:text-teal-600 p-1.5 rounded-lg hover:bg-slate-50"
                        title="ویرایش"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  );
                })}
            </div>
          </>
        )}

        {appointments.length === 0 && (
          <EmptyState
            icon={<CalendarDays size={32} />}
            title="هنوز نوبتی ثبت نشده"
            description="اولین نوبت بیمار را ایجاد کنید."
          />
        )}
      </div>

      {/* Forms */}
      {periodFormOpen && (
        <PeriodForm
          open={periodFormOpen}
          onClose={() => {
            setPeriodFormOpen(false);
            setEditingPeriod(null);
          }}
          onSaved={() => {
            setPeriodFormOpen(false);
            setEditingPeriod(null);
            loadAll();
          }}
          profileId={profile.id}
          editing={editingPeriod}
        />
      )}
      {actionFormOpen && actionPartId && (
        <ActionForm
          open={actionFormOpen}
          onClose={() => {
            setActionFormOpen(false);
            setEditingAction(null);
            setActionPartId(null);
          }}
          onSaved={() => {
            setActionFormOpen(false);
            setEditingAction(null);
            setActionPartId(null);
            loadAll();
          }}
          partId={actionPartId}
          editing={editingAction}
        />
      )}
      {paymentFormOpen && paymentPeriodId && (
        <PaymentForm
          open={paymentFormOpen}
          onClose={() => {
            setPaymentFormOpen(false);
            setEditingPayment(null);
            setPaymentPeriodId(null);
          }}
          onSaved={() => {
            setPaymentFormOpen(false);
            setEditingPayment(null);
            setPaymentPeriodId(null);
            loadAll();
          }}
          periodId={paymentPeriodId}
          editing={editingPayment}
        />
      )}

      {appointmentFormOpen && (
        <AppointmentForm
          open={appointmentFormOpen}
          onClose={() => {
            setAppointmentFormOpen(false);
            setEditingAppointment(null);
          }}
          onSaved={() => {
            setAppointmentFormOpen(false);
            setEditingAppointment(null);
            loadAll();
          }}
          prefillProfileId={editingAppointment ? undefined : profile.id}
          editing={editingAppointment}
        />
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="حذف"
        message={`آیا از حذف «${confirmDelete?.label ?? ''}» مطمئن هستید؟ تا ۳۰ ثانیه پس از تأیید می‌توانید بازگردانی کنید.`}
        confirmLabel="حذف"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
