import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Users, FileText, Phone, Sparkles, Activity, UserCheck } from 'lucide-react';
import { useData } from '@/data';
import { toFaDigits, formatDate } from '@/lib/format';
import type { Profile } from '@/types';
import { LoadingState, EmptyState } from './ui';
import { ProfileForm } from './ProfileForm';

interface ProfilesListProps {
  onOpenProfile: (profile: Profile) => void;
}

export function ProfilesList({ onOpenProfile }: ProfilesListProps) {
  const data = useData();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);

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

  const withPhone = profiles.filter((p) => Boolean(p.phone)).length;
  const withNationalId = profiles.filter((p) => Boolean(p.national_id)).length;
  const recentProfiles = [...filtered]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4);

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
              {filtered.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => onOpenProfile(profile)}
                  className="card p-4 text-right hover:shadow-lg hover:-translate-y-0.5 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="icon-well bg-gradient-to-br from-teal-100 to-teal-200 text-teal-700 font-bold">
                        {profile.first_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate group-hover:text-teal-700 transition">
                          {profile.first_name} {profile.last_name}
                        </h3>
                        {profile.file_number && (
                          <p className="text-xs text-slate-400 mt-0.5">پرونده {toFaDigits(profile.file_number)}</p>
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
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="lg:col-span-4 space-y-4">
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
                    onClick={() => onOpenProfile(profile)}
                    className="w-full text-right rounded-xl border border-slate-100 px-3 py-2 hover:bg-slate-50 transition"
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
