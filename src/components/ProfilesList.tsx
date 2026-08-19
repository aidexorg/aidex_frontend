import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Users,
  FileText,
  Phone,
  Sparkles,
  Activity,
  UserCheck,
  Layers,
  Calendar,
  Wallet,
  ArrowLeft,
  CreditCard,
  Cake,
} from 'lucide-react';
import { useData } from '@/data';
import { formatPrice, formatDate, toFaDigits } from '@/lib/format';
import type { Profile } from '@/types';
import { LoadingState, EmptyState } from './ui';
import { ProfileForm } from './ProfileForm';

interface ProfilesListProps {
  onOpenProfile: (profile: Profile) => void;
}

interface ProfileSummary {
  periodCount: number;
  sessionCount: number;
  actionNet: number;
  paid: number;
  lastActivity: string | null;
}

export function ProfilesList({ onOpenProfile }: ProfilesListProps) {
  const data = useData();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState<ProfileSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await data.listProfiles();
      setProfiles(rows);
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = profiles.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      (p.file_number ?? '').toLowerCase().includes(q) ||
      (p.phone ?? '').toLowerCase().includes(q) ||
      (p.national_id ?? '').toLowerCase().includes(q)
    );
  });

  const selectedProfile = filtered.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId && !filtered.some((p) => p.id === selectedId)) {
      setSelectedId(null);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    if (!selectedProfile) {
      setSummary(null);
      setSummaryLoading(false);
      return;
    }

    let cancelled = false;

    const loadSummary = async () => {
      setSummaryLoading(true);
      try {
        const periods = await data.listPeriods(selectedProfile.id);
        const periodIds = periods.map((p) => p.id);

        const [payments, sessions] = await Promise.all([
          periodIds.length > 0 ? data.listPayments(periodIds) : Promise.resolve([]),
          periodIds.length > 0 ? data.listSessions(periodIds) : Promise.resolve([]),
        ]);

        const sessionIds = sessions.map((s) => s.id);
        const parts =
          sessionIds.length > 0 ? await data.listParts(sessionIds) : [];
        const partIds = parts.map((p) => p.id);
        const actions =
          partIds.length > 0 ? await data.listActions(partIds) : [];

        const actionNet = actions.reduce(
          (sum, a) => sum + (a.price - a.discount),
          0
        );
        const paid = payments.reduce((sum, p) => sum + p.amount, 0);

        const activityDates: string[] = [];
        for (const s of sessions) {
          if (s.session_date) activityDates.push(s.session_date);
          if (s.updated_at) activityDates.push(s.updated_at);
        }
        for (const p of payments) {
          if (p.payment_date) activityDates.push(p.payment_date);
        }
        for (const a of actions) {
          if (a.updated_at) activityDates.push(a.updated_at);
        }
        const lastActivity =
          activityDates.length > 0
            ? activityDates.sort((a, b) => b.localeCompare(a))[0]
            : null;

        if (!cancelled) {
          setSummary({
            periodCount: periods.length,
            sessionCount: sessions.length,
            actionNet,
            paid,
            lastActivity,
          });
        }
      } catch {
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    };

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, [selectedProfile, data]);

  const withPhone = profiles.filter((p) => Boolean(p.phone)).length;
  const withNationalId = profiles.filter((p) => Boolean(p.national_id)).length;
  const recentProfiles = [...filtered]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4);

  const balance = summary ? summary.actionNet - summary.paid : 0;

  return (
    <div className="space-y-6">
      <section className="card p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pr-10"
              placeholder="Search by Name / ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="btn-primary"
          >
            <Plus size={16} />
            پرونده جدید
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="page-title">داشبورد پرونده‌ها</h1>
                <p className="page-sub">نمای سریع بیماران و وضعیت پرونده‌های ثبت‌شده</p>
              </div>
              <div className="hidden sm:flex icon-well bg-teal-50 text-teal-700">
                <Sparkles size={20} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
                <p className="text-[11px] text-slate-400">کل پرونده‌ها</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{toFaDigits(profiles.length)}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
                <p className="text-[11px] text-slate-400">دارای شماره تماس</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{toFaDigits(withPhone)}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
                <p className="text-[11px] text-slate-400">دارای کد ملی</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{toFaDigits(withNationalId)}</p>
              </div>
            </div>
          </div>

          {loading ? (
            <LoadingState />
          ) : filtered.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<Users size={48} />}
                title={search ? 'نتیجه‌ای یافت نشد' : 'هنوز پرونده‌ای ثبت نشده'}
                description={
                  search
                    ? 'عبارت جستجو را تغییر دهید.'
                    : 'برای شروع، اولین پرونده بیمار را ایجاد کنید.'
                }
                action={
                  !search && (
                    <button
                      onClick={() => {
                        setEditing(null);
                        setFormOpen(true);
                      }}
                      className="btn-primary mt-2"
                    >
                      <Plus size={16} />
                      ایجاد پرونده
                    </button>
                  )
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((profile) => {
                const isSelected = selectedId === profile.id;
                return (
                  <div
                    key={profile.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(profile.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedId(profile.id);
                      }
                    }}
                    className={`card p-4 text-right transition-all group cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-teal-500 shadow-md'
                        : 'hover:shadow-lg hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="icon-well bg-gradient-to-br from-teal-100 to-teal-200 text-teal-700 font-bold">
                          {profile.first_name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h3
                            className={`font-semibold truncate transition ${
                              isSelected ? 'text-teal-700' : 'text-slate-900 group-hover:text-teal-700'
                            }`}
                          >
                            {profile.first_name} {profile.last_name}
                          </h3>
                          {profile.file_number && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              پرونده {toFaDigits(profile.file_number)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-slate-500">
                      {profile.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone size={12} className="text-slate-300" />
                          {toFaDigits(profile.phone)}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <FileText size={12} className="text-slate-300" />
                        ایجاد: {formatDate(profile.created_at)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenProfile(profile);
                      }}
                      className="btn-secondary w-full mt-3 text-xs py-2"
                    >
                      <ArrowLeft size={14} />
                      مشاهده پرونده
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <aside className="lg:col-span-4 space-y-4">
          <div className="card p-4 lg:sticky lg:top-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="icon-well bg-teal-50 text-teal-700 !w-9 !h-9 rounded-xl">
                <UserCheck size={16} />
              </div>
              <h2 className="text-sm font-semibold text-slate-800">اطلاعات بیمار</h2>
            </div>

            {!selectedProfile ? (
              <EmptyState
                icon={<Users size={40} />}
                title="بیماری انتخاب نشده"
                description="یک پرونده را از فهرست انتخاب کنید تا اطلاعات هویتی، خلاصه درمان و مانده حساب نمایش داده شود."
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-700 text-white flex items-center justify-center text-lg font-bold shrink-0">
                    {selectedProfile.first_name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-400">
                      {selectedProfile.file_number
                        ? `پرونده ${toFaDigits(selectedProfile.file_number)}`
                        : 'بدون شماره پرونده'}
                    </p>
                    <h3 className="font-bold text-slate-900">
                      {selectedProfile.first_name} {selectedProfile.last_name}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 text-sm">
                  {selectedProfile.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone size={14} className="text-slate-400 shrink-0" />
                      <span className="text-slate-400 text-xs">تلفن</span>
                      <span className="mr-auto">{toFaDigits(selectedProfile.phone)}</span>
                    </div>
                  )}
                  {selectedProfile.national_id && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <CreditCard size={14} className="text-slate-400 shrink-0" />
                      <span className="text-slate-400 text-xs">کد ملی</span>
                      <span className="mr-auto">{toFaDigits(selectedProfile.national_id)}</span>
                    </div>
                  )}
                  {selectedProfile.birth_year && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Cake size={14} className="text-slate-400 shrink-0" />
                      <span className="text-slate-400 text-xs">سال تولد</span>
                      <span className="mr-auto">{toFaDigits(selectedProfile.birth_year)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <p className="text-[11px] font-semibold text-slate-500 mb-2">خلاصه پرونده</p>
                  {summaryLoading ? (
                    <p className="text-xs text-slate-400">در حال بارگذاری…</p>
                  ) : summary ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Layers size={12} />
                          دوره درمان
                        </div>
                        <p className="text-lg font-bold text-slate-800 mt-0.5">
                          {toFaDigits(summary.periodCount)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Calendar size={12} />
                          جلسات
                        </div>
                        <p className="text-lg font-bold text-slate-800 mt-0.5">
                          {toFaDigits(summary.sessionCount)}
                        </p>
                      </div>
                      {summary.lastActivity && (
                        <div className="col-span-2 rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[10px] text-slate-400">آخرین فعالیت</p>
                          <p className="text-sm text-slate-700 mt-0.5">
                            {formatDate(summary.lastActivity)}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">اطلاعات درمان در دسترس نیست.</p>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <p className="text-[11px] font-semibold text-slate-500 mb-2">مانده حساب</p>
                  {summaryLoading ? (
                    <p className="text-xs text-slate-400">در حال محاسبه…</p>
                  ) : summary ? (
                    <div className="rounded-xl border border-slate-100 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Wallet size={14} className="text-slate-400" />
                        <span
                          className={`text-xs font-medium ${
                            balance > 0
                              ? 'text-red-600'
                              : balance < 0
                                ? 'text-emerald-600'
                                : 'text-slate-500'
                          }`}
                        >
                          {balance > 0
                            ? 'بدهکار (بیمار به کلینیک بدهکار است)'
                            : balance < 0
                              ? 'بستانکار (اعتبار بیمار)'
                              : 'تسویه'}
                        </span>
                      </div>
                      <p
                        className={`text-xl font-bold ${
                          balance > 0
                            ? 'text-red-600'
                            : balance < 0
                              ? 'text-emerald-600'
                              : 'text-slate-800'
                        }`}
                      >
                        {formatPrice(Math.abs(balance))}
                      </p>
                      <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                        <span>صورت‌حساب: {formatPrice(summary.actionNet)}</span>
                        <span>پرداخت: {formatPrice(summary.paid)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">—</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onOpenProfile(selectedProfile)}
                  className="btn-primary w-full"
                >
                  <ArrowLeft size={16} />
                  مشاهده پرونده کامل
                </button>
              </div>
            )}
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="icon-well bg-sky-50 text-sky-700 !w-9 !h-9 rounded-xl">
                <Activity size={16} />
              </div>
              <h2 className="text-sm font-semibold text-slate-800">فعالیت اخیر</h2>
            </div>
            {recentProfiles.length === 0 ? (
              <p className="text-xs text-slate-400">فعلاً داده‌ای ثبت نشده.</p>
            ) : (
              <div className="space-y-2">
                {recentProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => setSelectedId(profile.id)}
                    className={`w-full text-right rounded-xl border px-3 py-2 transition ${
                      selectedId === profile.id
                        ? 'border-teal-300 bg-teal-50'
                        : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-sm text-slate-800 truncate">
                      {profile.first_name} {profile.last_name}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      ثبت: {formatDate(profile.created_at)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card p-4 bg-gradient-to-br from-teal-600 to-teal-700 text-white">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck size={16} />
              <h2 className="text-sm font-semibold">راهنمای سریع</h2>
            </div>
            <p className="text-xs text-teal-50/90 leading-6">
              برای شروع مدیریت درمان، ابتدا پرونده را بسازید، سپس دوره درمان و جلسات را ثبت کنید.
            </p>
          </div>
        </aside>
      </section>

      {formOpen && (
        <ProfileForm
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
    </div>
  );
}
