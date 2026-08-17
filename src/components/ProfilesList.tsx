import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Users, Pencil, FileText, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toFaDigits, formatDate } from '@/lib/format';
import type { Profile } from '@/types';
import { LoadingState, EmptyState } from './ui';
import { ProfileForm } from './ProfileForm';

interface ProfilesListProps {
  onOpenProfile: (profile: Profile) => void;
}

export function ProfilesList({ onOpenProfile }: ProfilesListProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProfiles((data ?? []) as Profile[]);
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">پرونده‌ها</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            مدیریت بیماران و پرونده‌های درمانی
          </p>
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

      {/* Search */}
      <div className="relative">
        <Search
          size={18}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          className="input pr-10"
          placeholder="جستجو بر اساس نام، شماره پرونده، تلفن یا کد ملی…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((profile) => (
            <button
              key={profile.id}
              onClick={() => onOpenProfile(profile)}
              className="card p-4 text-right hover:shadow-md hover:border-teal-300 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-100 to-teal-200 text-teal-700 flex items-center justify-center font-bold shrink-0">
                    {profile.first_name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate group-hover:text-teal-700 transition">
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
            </button>
          ))}
        </div>
      )}

      {/* Inline edit button for the last opened profile (mobile convenience) */}
      {profiles.length > 0 && (
        <div className="text-center text-xs text-slate-400 pt-2">
          {toFaDigits(profiles.length)} پرونده ثبت شده
        </div>
      )}

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
