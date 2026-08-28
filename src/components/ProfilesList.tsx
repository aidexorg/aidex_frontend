import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, FolderOpen, Filter } from 'lucide-react';
import { useData } from '@/data';
import { formatDate, toFaDigits } from '@/lib/format';
import { loadProfileListMeta } from '@/lib/patientStatus';
import type { Profile } from '@/types';
import { EmptyState } from './ui';
import { SkeletonProfileList } from './Skeleton';
import {
  DataTable,
  PageHeader,
  StatusPill,
  type Column,
  type PatientStatus,
} from './design';

interface ProfilesListProps {
  onOpenProfile: (profile: Profile) => void;
  onCreateProfile: () => void;
}

type StatusFilter = 'all' | PatientStatus;

const PAGE_SIZE = 10;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'همه وضعیت‌ها' },
  { key: 'active', label: 'فعال' },
  { key: 'in_treatment', label: 'در حال درمان' },
  { key: 'appointment_needed', label: 'نوبت لازم' },
];

export function ProfilesList({ onOpenProfile, onCreateProfile }: ProfilesListProps) {
  const data = useData();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [search] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [statusMap, setStatusMap] = useState<Map<string, PatientStatus>>(new Map());
  const [lastVisitMap, setLastVisitMap] = useState<Map<string, string | null>>(new Map());

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedProfiles = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const columns: Column<Profile>[] = useMemo(
    () => [
      {
        key: 'file',
        header: 'پرونده',
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
        render: (p) => (
          <span className="font-medium text-brand-navy">
            {p.first_name} {p.last_name}
          </span>
        ),
      },
      {
        key: 'phone',
        header: 'تلفن',
        render: (p) => (
          <span className="text-slate-500">{p.phone ? toFaDigits(p.phone) : '—'}</span>
        ),
      },
      {
        key: 'lastVisit',
        header: 'آخرین مراجعه',
        render: (p) => {
          if (loadingMeta) return <span className="text-slate-300">…</span>;
          const d = lastVisitMap.get(p.id);
          return <span className="text-slate-500">{d ? formatDate(d) : '—'}</span>;
        },
      },
      {
        key: 'status',
        header: 'وضعیت',
        render: (p) =>
          loadingMeta ? (
            <span className="inline-block w-16 h-5 bg-slate-100 rounded-full animate-pulse" />
          ) : (
            <StatusPill status={statusMap.get(p.id) ?? 'active'} />
          ),
      },
    ],
    [lastVisitMap, statusMap, loadingMeta]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="فهرست پرونده‌ها"
        subtitle="مشاهده و مدیریت پرونده‌های بیماران"
        action={
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
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setStatusFilter(f.key)}
            aria-pressed={statusFilter === f.key}
            className={statusFilter === f.key ? 'chip-active' : 'chip'}
          >
            {f.key === 'all' && <Filter size={14} className="inline ml-1" />}
            {f.label}
          </button>
        ))}
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
        />
      )}
    </div>
  );
}
