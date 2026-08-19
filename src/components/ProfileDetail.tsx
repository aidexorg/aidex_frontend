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
import type { Profile, Period, Session, Part, Action, Payment } from '@/types';
import { AREA_OPTIONS } from '@/types';
import { LoadingState, EmptyState, ErrorBanner, ConfirmDialog } from './ui';
import { PeriodForm } from './PeriodForm';
import { ActionForm } from './ActionForm';
import { PaymentForm } from './PaymentForm';

interface ProfileDetailProps {
  profile: Profile;
  onBack: () => void;
  onEditProfile: () => void;
}

/** BR-UX-05: bounded periods per page (accordion-heavy) */
const PERIOD_PAGE_SIZE = 6;

export function ProfileDetail({ profile, onBack, onEditProfile }: ProfileDetailProps) {
  const data = useData();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
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
  const [periodSearch, setPeriodSearch] = useState('');
  const [periodPage, setPeriodPage] = useState(1);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری داده‌ها.');
    } finally {
      setLoading(false);
    }
  }, [profile.id, data]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Derived totals
  const periodActions = (periodId: string) => {
    const sessionIds = sessions.filter((s) => s.period_id === periodId).map((s) => s.id);
    const partIds = parts.filter((p) => sessionIds.includes(p.session_id)).map((p) => p.id);
    return actions.filter((a) => partIds.includes(a.part_id));
  };
  const periodPayments = (periodId: string) => payments.filter((p) => p.period_id === periodId);
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

  const filteredPeriods = periods.filter(periodMatchesSearch);
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

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { type, id } = confirmDelete;
    try {
      if (type === 'period') await data.deletePeriod(id);
      else if (type === 'session') await data.deleteSession(id);
      else if (type === 'part') await data.deletePart(id);
      else if (type === 'action') await data.deleteAction(id);
      else await data.deletePayment(id);
      setConfirmDelete(null);
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در حذف.');
    }
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
              className="btn-primary"
            >
              <Plus size={16} />
              دوره درمان جدید
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
            const periodSess = sessions.filter((s) => s.period_id === period.id);
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
                          const sessParts = parts.filter((p) => p.session_id === session.id);
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
                                        (a) => a.part_id === part.id
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

      <ConfirmDialog
        open={confirmDelete !== null}
        title="حذف"
        message={`آیا از حذف «${confirmDelete?.label ?? ''}» مطمئن هستید؟ این عمل قابل بازگشت نیست.`}
        confirmLabel="حذف"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
