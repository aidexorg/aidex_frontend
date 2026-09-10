import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  FolderOpen,
  Filter,
  LayoutGrid,
  Rows3,
  Phone,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Upload,
} from 'lucide-react';
import { useData } from '@/data';
import { formatDate, toFaDigits } from '@/lib/format';
import { loadProfileListMeta } from '@/lib/patientStatus';
import { generateProfileOutput } from '@/lib/profileOutput';
import { runBulk } from '@/lib/bulkRun';
import type { Profile } from '@/types';
import { EmptyState } from './ui';
import { SkeletonProfileList } from './Skeleton';
import { useToast } from './ToastProvider';
import { ProfileImportWizard } from './ProfileImportWizard';
import { ProfileQuickActionsMenu, type ProfileQuickAction } from './ProfileQuickActionsMenu';
import { useTranslation } from './LocaleProvider';
import type { ProfileDetailIntent, ProfileDetailTab } from './ProfileDetail';
import {
  DataTable,
  BulkActionBar,
  PageHeader,
  StatusPill,
  getStatusLabel,
  type Column,
  type PatientStatus,
  type SortDirection,
} from './design';

interface ProfilesListProps {
  onOpenProfile: (
    profile: Profile,
    tab?: ProfileDetailTab,
    intent?: ProfileDetailIntent | null,
  ) => void;
  onCreateProfile: () => void;
}

type StatusFilter = 'all' | PatientStatus;
type ViewMode = 'table' | 'card';

const PAGE_SIZE = 10;
const VIEW_PREFERENCE_KEY = 'aidex:profiles:view';
const STATUS_RANK: Record<PatientStatus, number> = {
  active: 0,
  in_treatment: 1,
  appointment_needed: 2,
};

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'همه وضعیت‌ها' },
  { key: 'active', label: 'فعال' },
  { key: 'in_treatment', label: 'در حال درمان' },
  { key: 'appointment_needed', label: 'نوبت لازم' },
];

function loadViewPreference(): ViewMode {
  try {
    const value = localStorage.getItem(VIEW_PREFERENCE_KEY);
    return value === 'card' ? 'card' : 'table';
  } catch {
    return 'table';
  }
}

function saveViewPreference(view: ViewMode): void {
  try {
    localStorage.setItem(VIEW_PREFERENCE_KEY, view);
  } catch {
    // Storage may be unavailable in private/restricted browsing; the choice
    // still applies for the current mounted session.
  }
}

export function ProfilesList({ onOpenProfile, onCreateProfile }: ProfilesListProps) {
  const data = useData();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [search] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [statusMap, setStatusMap] = useState<Map<string, PatientStatus>>(new Map());
  const [lastVisitMap, setLastVisitMap] = useState<Map<string, string | null>>(new Map());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(loadViewPreference);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [importOpen, setImportOpen] = useState(false);

  const setView = useCallback((view: ViewMode) => {
    setViewMode(view);
    saveViewPreference(view);
  }, []);

  const handleSort = useCallback((key: string) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
        return prevKey;
      }
      setSortDirection('asc');
      return key;
    });
  }, []);

  const load = useCallback(async () => {
    setLoadingProfiles(true);
    setLoadingMeta(true);
    try {
      const rows = await data.listProfiles();
      setProfiles(rows);
      setLoadingProfiles(false);

      const { statuses, lastVisits } = await loadProfileListMeta(data, rows);
      setStatusMap(statuses);
      setLastVisitMap(lastVisits);
    } catch {
      setProfiles([]);
      setStatusMap(new Map());
      setLastVisitMap(new Map());
    } finally {
      setLoadingProfiles(false);
      setLoadingMeta(false);
    }
  }, [data]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
        (p.file_number ?? '').toLowerCase().includes(q) ||
        (p.phone ?? '').toLowerCase().includes(q) ||
        (p.national_id ?? '').toLowerCase().includes(q);

      const status = statusMap.get(p.id) ?? 'active';
      const matchesStatus = statusFilter === 'all' || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [profiles, search, statusFilter, statusMap]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;

    const getValue = (p: Profile): string | number | null => {
      switch (sortKey) {
        case 'file':
          return p.file_number ?? null;
        case 'name':
          return `${p.first_name} ${p.last_name}`.trim() || null;
        case 'phone':
          return p.phone ?? null;
        case 'lastVisit':
          return lastVisitMap.get(p.id) ?? null;
        case 'status':
          return STATUS_RANK[statusMap.get(p.id) ?? 'active'];
        default:
          return null;
      }
    };

    return [...filtered].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), 'fa', { numeric: true });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDirection, lastVisitMap, statusMap]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedProfiles = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [search, statusFilter]);

  const selectedProfiles = useMemo(
    () => profiles.filter((p) => selectedIds.has(p.id)),
    [profiles, selectedIds]
  );

  const handleExportSelected = useCallback(async () => {
    if (selectedProfiles.length === 0) return;
    setExporting(true);
    const sections = new Map<string, string>();
    const result = await runBulk(
      selectedProfiles,
      async (profile) => {
        const output = await generateProfileOutput(data, profile, 'profile');
        sections.set(profile.id, output);
      },
      { concurrency: 3 }
    );

    if (result.succeeded.length > 0) {
      const body = result.succeeded
        .map((profile) => {
          const name = `${profile.first_name} ${profile.last_name}`.trim();
          const fileNo = profile.file_number ? ` (پرونده ${profile.file_number})` : '';
          return `${'='.repeat(48)}\n${name}${fileNo}\n${'='.repeat(48)}\n\n${
            sections.get(profile.id) ?? ''
          }`;
        })
        .join('\n\n\n');
      const blob = new Blob([`\uFEFF${body}`], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `aidex-profiles-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    setExporting(false);
    if (result.failed.length === 0) {
      showToast({
        message: `${toFaDigits(result.succeeded.length)} پرونده با موفقیت خروجی گرفته شد.`,
        variant: 'success',
      });
      setSelectedIds(new Set());
    } else {
      showToast({
        message: `${toFaDigits(result.succeeded.length)} پرونده خروجی گرفته شد، ${toFaDigits(
          result.failed.length
        )} مورد ناموفق بود.`,
        variant: 'error',
      });
      setSelectedIds(new Set(result.failed.map((f) => f.item.id)));
    }
  }, [selectedProfiles, data, showToast]);

  const profileLabel = useCallback(
    (profile: Profile) => `${profile.first_name} ${profile.last_name}`.trim(),
    [],
  );

  const handleQuickAction = useCallback(
    (profile: Profile, action: ProfileQuickAction) => {
      switch (action) {
        case 'payment':
          onOpenProfile(profile, 'financial', 'openPayment');
          break;
        case 'newSession':
          onOpenProfile(profile, 'treatment', 'newSession');
          break;
        case 'output':
          onOpenProfile(profile, 'review');
          break;
      }
    },
    [onOpenProfile],
  );

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const columns: Column<Profile>[] = useMemo(
    () => [
      {
        key: 'file',
        header: 'پرونده',
        sortable: true,
        render: (p) => (
          <div className="flex items-center gap-2">
            <FolderOpen size={16} className="text-sage-500 shrink-0" />
            <span className="font-mono text-sm">{toFaDigits(p.file_number ?? '—')}</span>
          </div>
        ),
      },
      {
        key: 'name',
        header: 'نام بیمار',
        sortable: true,
        render: (p) => (
          <span className="font-medium text-brand-navy">
            {p.first_name} {p.last_name}
          </span>
        ),
      },
      {
        key: 'phone',
        header: 'تلفن',
        sortable: true,
        render: (p) => (
          <span className="text-slate-500">{p.phone ? toFaDigits(p.phone) : '—'}</span>
        ),
      },
      {
        key: 'lastVisit',
        header: 'آخرین مراجعه',
        sortable: true,
        render: (p) => {
          if (loadingMeta) return <span className="text-slate-300">…</span>;
          const d = lastVisitMap.get(p.id);
          return <span className="text-slate-500">{d ? formatDate(d) : '—'}</span>;
        },
      },
      {
        key: 'status',
        header: 'وضعیت',
        sortable: true,
        render: (p) =>
          loadingMeta ? (
            <span className="inline-block w-16 h-5 bg-slate-100 rounded-full animate-pulse" />
          ) : (
            <StatusPill status={statusMap.get(p.id) ?? 'active'} />
          ),
      },
      {
        key: 'actions',
        header: '',
        className: 'w-12 text-start',
        render: (p) => (
          <ProfileQuickActionsMenu
            profileLabel={profileLabel(p)}
            onAction={(action) => handleQuickAction(p, action)}
          />
        ),
      },
    ],
    [lastVisitMap, statusMap, loadingMeta, profileLabel, handleQuickAction]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="فهرست پرونده‌ها"
        subtitle="مشاهده و مدیریت پرونده‌های بیماران"
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="btn-secondary"
            >
              <Upload size={16} />
              {t('import.open')}
            </button>
            <button
              onClick={onCreateProfile}
              className="btn-sage"
              data-onboarding-target="create-profile"
              aria-keyshortcuts="Alt+N"
            >
              <Plus size={16} />
              پرونده جدید
              <kbd className="hidden sm:inline text-[10px] text-white/80">Alt+N</kbd>
            </button>
          </div>
        }
      />

      <ProfileImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        existingProfiles={profiles}
        onImported={() => void load()}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              aria-pressed={statusFilter === f.key}
              className={statusFilter === f.key ? 'chip-active' : 'chip'}
            >
              {f.key === 'all' && <Filter size={14} className="inline ms-1" />}
              {f.label}
            </button>
          ))}
        </div>

        <div
          role="group"
          aria-label="نوع نمایش فهرست"
          className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 dark:border-slate-600 dark:bg-slate-800"
        >
          <button
            type="button"
            onClick={() => setView('table')}
            aria-pressed={viewMode === 'table'}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-sage-50 text-sage-700'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Rows3 size={14} aria-hidden="true" />
            جدول
          </button>
          <button
            type="button"
            onClick={() => setView('card')}
            aria-pressed={viewMode === 'card'}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'card'
                ? 'bg-sage-50 text-sage-700'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <LayoutGrid size={14} aria-hidden="true" />
            کارت
          </button>
        </div>
      </div>

      {loadingProfiles ? (
        <SkeletonProfileList count={5} />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            title={search || statusFilter !== 'all' ? 'نتیجه‌ای یافت نشد' : 'هنوز پرونده‌ای ثبت نشده'}
            description={
              search || statusFilter !== 'all'
                ? 'فیلتر یا عبارت جستجو را تغییر دهید.'
                : 'برای شروع، اولین پرونده بیمار را ایجاد کنید.'
            }
            action={
              !search && statusFilter === 'all' && (
                <button
                  onClick={onCreateProfile}
                  className="btn-sage mt-2"
                  data-onboarding-target="create-profile"
                  aria-keyshortcuts="Alt+N"
                >
                  <Plus size={16} />
                  ایجاد پرونده
                  <kbd className="hidden sm:inline text-[10px] text-white/80">Alt+N</kbd>
                </button>
              )
            }
          />
        </div>
      ) : (
        <>
          <BulkActionBar
            count={selectedIds.size}
            busy={exporting}
            status={exporting ? 'در حال آماده‌سازی خروجی…' : null}
            onClear={() => setSelectedIds(new Set())}
            actions={[
              {
                key: 'export',
                label: 'خروجی متنی',
                onClick: () => void handleExportSelected(),
              },
            ]}
          />
          {viewMode === 'table' ? (
            <DataTable
              ariaLabel="فهرست پرونده‌های بیماران"
              columns={columns}
              rows={paginatedProfiles}
              rowKey={(p) => p.id}
              rowLabel={(p) => `باز کردن پرونده ${p.first_name} ${p.last_name}`}
              onRowClick={onOpenProfile}
              page={safePage}
              totalPages={totalPages}
              onPageChange={setPage}
              selectable
              selectedKeys={selectedIds}
              onSelectionChange={setSelectedIds}
              selectionLabel={(p) => `انتخاب ${p.first_name} ${p.last_name}`}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSortChange={handleSort}
            />
          ) : (
            <ProfileCardGrid
              profiles={paginatedProfiles}
              loadingMeta={loadingMeta}
              statusMap={statusMap}
              lastVisitMap={lastVisitMap}
              selectedIds={selectedIds}
              onToggleSelect={(id) =>
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              onOpenProfile={onOpenProfile}
              onQuickAction={handleQuickAction}
              profileLabel={profileLabel}
              page={safePage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

interface ProfileCardGridProps {
  profiles: Profile[];
  loadingMeta: boolean;
  statusMap: Map<string, PatientStatus>;
  lastVisitMap: Map<string, string | null>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpenProfile: (profile: Profile) => void;
  onQuickAction: (profile: Profile, action: ProfileQuickAction) => void;
  profileLabel: (profile: Profile) => string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function ProfileCardGrid({
  profiles,
  loadingMeta,
  statusMap,
  lastVisitMap,
  selectedIds,
  onToggleSelect,
  onOpenProfile,
  onQuickAction,
  profileLabel,
  page,
  totalPages,
  onPageChange,
}: ProfileCardGridProps) {
  return (
    <div className="space-y-4">
      <ul
        aria-label="فهرست کارتی پرونده‌های بیماران"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {profiles.map((p) => {
          const status = statusMap.get(p.id) ?? 'active';
          const lastVisit = lastVisitMap.get(p.id);
          const isSelected = selectedIds.has(p.id);
          return (
            <li key={p.id}>
              <div
                role="button"
                tabIndex={0}
                aria-label={`باز کردن پرونده ${p.first_name} ${p.last_name}`}
                onClick={() => onOpenProfile(p)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  onOpenProfile(p);
                }}
                className={`card h-full cursor-pointer p-4 transition-colors hover:bg-sage-50/50 ${
                  isSelected ? 'ring-2 ring-sage-300' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-sage-600"
                      checked={isSelected}
                      onClick={(event) => event.stopPropagation()}
                      onChange={() => onToggleSelect(p.id)}
                      aria-label={`انتخاب ${p.first_name} ${p.last_name}`}
                    />
                    <span className="flex items-center gap-1.5 font-mono text-xs text-slate-500">
                      <FolderOpen size={14} className="text-sage-500 shrink-0" />
                      {toFaDigits(p.file_number ?? '—')}
                    </span>
                  </div>
                  <div className="flex items-start gap-1 shrink-0">
                    {loadingMeta ? (
                      <span className="inline-block h-5 w-16 animate-pulse rounded-full bg-slate-100" />
                    ) : (
                      <StatusPill status={status} />
                    )}
                    <ProfileQuickActionsMenu
                      profileLabel={profileLabel(p)}
                      onAction={(action) => onQuickAction(p, action)}
                    />
                  </div>
                </div>

                <p className="mt-3 font-medium text-brand-navy">
                  {p.first_name} {p.last_name}
                </p>

                <dl className="mt-2 space-y-1 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Phone size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
                    <dt className="sr-only">تلفن</dt>
                    <dd>{p.phone ? toFaDigits(p.phone) : '—'}</dd>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CalendarClock
                      size={13}
                      className="shrink-0 text-slate-400"
                      aria-hidden="true"
                    />
                    <dt className="sr-only">آخرین مراجعه</dt>
                    <dd>
                      {loadingMeta ? '…' : lastVisit ? formatDate(lastVisit) : '—'}
                    </dd>
                  </div>
                  <div className="flex items-center gap-1.5 sr-only">
                    <dt>وضعیت</dt>
                    <dd>{getStatusLabel(status)}</dd>
                  </div>
                </dl>
              </div>
            </li>
          );
        })}
      </ul>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-40"
            aria-label="صفحه قبل"
          >
            <ChevronRight size={18} />
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              aria-label={`صفحه ${toFaDigits(p)}`}
              className={`h-8 min-w-[32px] rounded-lg text-sm font-medium ${
                p === page ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-100' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {toFaDigits(p)}
            </button>
          ))}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-40"
            aria-label="صفحه بعد"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
