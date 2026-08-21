import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Modal } from './Modal';
import { ErrorBanner, Spinner } from './ui';
import { useData } from '@/data';
import {
  APPOINTMENT_TYPES,
  RECURRENCE_PATTERNS,
  type Appointment,
  type AppointmentType,
  type RecurrencePattern,
} from '@/types';
import { toFaDigits } from '@/lib/format';
import type { Profile } from '@/types';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

interface AppointmentFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: (appointment: Appointment) => void;
  editing?: Appointment | null;
  prefillProfileId?: string;
}

function toLocalDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function toLocalTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toISOString().slice(11, 16);
  } catch {
    return '';
  }
}

export function AppointmentForm({
  open,
  onClose,
  onSaved,
  editing,
  prefillProfileId,
}: AppointmentFormProps) {
  const data = useData();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileSearch, setProfileSearch] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState(
    editing?.profile_id ?? prefillProfileId ?? ''
  );
  const [type, setType] = useState<AppointmentType>(
    editing?.type ?? 'treatment'
  );
  const [date, setDate] = useState(() =>
    editing ? toLocalDate(editing.start_time) : ''
  );
  const [time, setTime] = useState(() =>
    editing ? toLocalTime(editing.start_time) : '09:00'
  );
  const [duration, setDuration] = useState(
    editing?.duration_minutes?.toString() ?? '45'
  );
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>(
    editing?.recurrence_pattern ?? 'none'
  );
  const [recurrenceEndType, setRecurrenceEndType] = useState<'date' | 'count'>(
    editing?.series_id ? 'count' : 'date'
  );
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [recurrenceCount, setRecurrenceCount] = useState('6');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictWarnings, setConflictWarnings] = useState<
    { message: string; severity: 'red' | 'amber' }[]
  >([]);
  const [showRecurrence, setShowRecurrence] = useState(false);
  const conflictTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    data.listProfiles().then((rows) => {
      if (!cancelled) setProfiles(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [open, data]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setSelectedProfileId(editing.profile_id);
      setType(editing.type);
      setDate(toLocalDate(editing.start_time));
      setTime(toLocalTime(editing.start_time));
      setDuration(editing.duration_minutes.toString());
      setNotes(editing.notes ?? '');
      setRecurrencePattern(editing.recurrence_pattern ?? 'none');
      setProfileSearch('');
      setShowRecurrence(false);
    } else {
      setSelectedProfileId(prefillProfileId ?? '');
      setType('treatment');
      setDate('');
      setTime('09:00');
      setDuration('45');
      setNotes('');
      setRecurrencePattern('none');
      setRecurrenceEndType('date');
      setRecurrenceEndDate('');
      setRecurrenceCount('6');
      setProfileSearch('');
      setShowRecurrence(false);
    }
    setError(null);
  }, [open, editing, prefillProfileId]);

  // ── Conflict detection ──
  useEffect(() => {
    if (!date || !time) {
      setConflictWarnings([]);
      return;
    }
    if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current);
    conflictTimerRef.current = setTimeout(async () => {
      try {
        const allDay = await data.listAppointments({ date });
        const newStart = new Date(`${date}T${time}:00`);
        const dur = parseInt(duration, 10) || 30;
        const newEnd = new Date(newStart.getTime() + dur * 60000);
        const warnings: { message: string; severity: 'red' | 'amber' }[] = [];

        for (const appt of allDay) {
          if (editing && appt.id === editing.id) continue;
          const existStart = new Date(appt.start_time);
          const existEnd = new Date(
            existStart.getTime() + appt.duration_minutes * 60000
          );
          if (!(newStart < existEnd && newEnd > existStart)) continue;

          const prof = profiles.find((p) => p.id === appt.profile_id);
          const pname = prof
            ? `${prof.first_name} ${prof.last_name}`
            : 'بیمار';
          const existTime = existStart.toLocaleTimeString('fa-IR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
          const existTimeEnd = existEnd.toLocaleTimeString('fa-IR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
          const timeRange = `${existTime}–${existTimeEnd}`;

          const chairId = editing?.chair_id ?? null;
          if (
            chairId &&
            appt.chair_id &&
            appt.chair_id === chairId
          ) {
            warnings.push({
              message: `تداخل با نوبت ${pname} — ${timeRange} در صندلی`,
              severity: 'red',
            });
          }

          const dentistId = editing?.dentist_id ?? null;
          if (
            dentistId &&
            appt.dentist_id &&
            appt.dentist_id === dentistId
          ) {
            warnings.push({
              message: `تداخل با نوبت ${pname} — ${timeRange} (دندانپزشک)`,
              severity: 'amber',
            });
          }

          if (
            !chairId &&
            !dentistId &&
            !appt.chair_id &&
            !appt.dentist_id
          ) {
            warnings.push({
              message: `تداخل زمانی با نوبت ${pname} — ${timeRange}`,
              severity: 'amber',
            });
          }
        }

        setConflictWarnings(warnings);
      } catch {
        setConflictWarnings([]);
      }
    }, 300);

    return () => {
      if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current);
    };
  }, [date, time, duration, editing, profiles, data]);

  const filteredProfiles = profiles.filter((p) => {
    const q = profileSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      (p.file_number ?? '').toLowerCase().includes(q)
    );
  });

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);
  const typeConfig = APPOINTMENT_TYPES.find((t) => t.value === type);

  const handleTypeChange = (newType: AppointmentType) => {
    setType(newType);
    const cfg = APPOINTMENT_TYPES.find((t) => t.value === newType);
    if (cfg && !editing) {
      setDuration(cfg.defaultDuration.toString());
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedProfileId) {
      setError('بیمار را انتخاب کنید.');
      return;
    }
    if (!date) {
      setError('تاریخ نوبت را وارد کنید.');
      return;
    }
    if (!time) {
      setError('ساعت نوبت را وارد کنید.');
      return;
    }
    const dur = parseInt(duration, 10);
    if (isNaN(dur) || dur <= 0) {
      setError('مدت نوبت باید عدد مثبت باشد.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const startIso = new Date(`${date}T${time}:00`).toISOString();

      if (editing || recurrencePattern === 'none') {
        const payload = {
          profile_id: selectedProfileId,
          dentist_id: editing?.dentist_id ?? null,
          chair_id: editing?.chair_id ?? null,
          start_time: startIso,
          duration_minutes: dur,
          type,
          status: editing?.status ?? 'scheduled',
          notes: notes.trim() || null,
          series_id: editing?.series_id ?? null,
          recurrence_pattern: editing?.recurrence_pattern ?? 'none',
          series_index: editing?.series_index ?? 0,
        };
        const row = editing
          ? await data.updateAppointment(editing.id, payload)
          : await data.createAppointment(payload);
        onSaved(row);
      } else {
        const startDate = new Date(`${date}T${time}:00`);
        const dates: Date[] = [startDate];
        const seriesId = crypto.randomUUID();

        if (recurrenceEndType === 'count') {
          const count = Math.min(Math.max(parseInt(recurrenceCount, 10) || 6, 2), 52);
          for (let i = 1; i < count; i++) {
            const next = new Date(startDate);
            switch (recurrencePattern) {
              case 'daily':
                next.setDate(next.getDate() + i);
                break;
              case 'weekly':
                next.setDate(next.getDate() + i * 7);
                break;
              case 'biweekly':
                next.setDate(next.getDate() + i * 14);
                break;
              case 'monthly':
                next.setMonth(next.getMonth() + i);
                break;
            }
            dates.push(next);
          }
        } else if (recurrenceEndType === 'date' && recurrenceEndDate) {
          const endDate = new Date(recurrenceEndDate + 'T23:59:59');
          let i = 1;
          while (dates.length < 52) {
            const next = new Date(startDate);
            switch (recurrencePattern) {
              case 'daily':
                next.setDate(next.getDate() + i);
                break;
              case 'weekly':
                next.setDate(next.getDate() + i * 7);
                break;
              case 'biweekly':
                next.setDate(next.getDate() + i * 14);
                break;
              case 'monthly':
                next.setMonth(next.getMonth() + i);
                break;
            }
            if (next > endDate) break;
            dates.push(next);
            i++;
          }
        }

        let lastRow: Appointment | null = null;
        for (let idx = 0; idx < dates.length; idx++) {
          lastRow = await data.createAppointment({
            profile_id: selectedProfileId,
            dentist_id: null,
            chair_id: null,
            start_time: dates[idx].toISOString(),
            duration_minutes: dur,
            type,
            status: 'scheduled',
            notes: notes.trim() || null,
            series_id: seriesId,
            recurrence_pattern: recurrencePattern,
            series_index: idx,
          });
        }
        onSaved(lastRow!);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره‌سازی.');
    } finally {
      setSaving(false);
    }
  };

  const displayName = selectedProfile
    ? `${selectedProfile.first_name} ${selectedProfile.last_name}`
    : '—';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'ویرایش نوبت' : 'نوبت جدید'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Patient preview */}
        {selectedProfile && (
          <div className="rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 p-3 text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-base font-bold">
              {selectedProfile.first_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-teal-100">
                {editing ? 'ویرایش نوبت بیمار' : 'نوبت جدید برای'}
              </p>
              <p className="text-base font-bold truncate">{displayName}</p>
              {selectedProfile.file_number && (
                <p className="text-[10px] text-teal-100">
                  پرونده {toFaDigits(selectedProfile.file_number)}
                </p>
              )}
            </div>
            {!editing && !prefillProfileId && (
              <button
                type="button"
                onClick={() => setSelectedProfileId('')}
                className="text-teal-200 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-white/10"
              >
                تغییر
              </button>
            )}
          </div>
        )}

        {error && <ErrorBanner message={error} />}

        {/* Patient selection — compact grid */}
        {!prefillProfileId && !editing && !selectedProfileId && (
          <div className="space-y-2">
            <label className="label text-xs">انتخاب بیمار *</label>
            <div className="relative">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input text-sm py-2 pr-8"
                placeholder="جستجو بر اساس نام یا شماره پرونده…"
                value={profileSearch}
                onChange={(e) => setProfileSearch(e.target.value)}
              />
            </div>
            <div className="max-h-[180px] overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
              {filteredProfiles.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  بیماری یافت نشد
                </p>
              ) : (
                filteredProfiles.slice(0, 10).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedProfileId(p.id);
                      setProfileSearch('');
                    }}
                    className="w-full text-right px-3 py-2.5 hover:bg-teal-50 transition flex items-center gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-teal-100 flex items-center justify-center text-xs font-bold text-slate-600 group-hover:text-teal-700 shrink-0">
                      {p.first_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {p.first_name} {p.last_name}
                      </p>
                      {p.file_number && (
                        <p className="text-[10px] text-slate-400">
                          پرونده {toFaDigits(p.file_number)}
                        </p>
                      )}
                    </div>
                    {p.phone && (
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {toFaDigits(p.phone)}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Main form — two column layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Left column: Date, Time, Duration */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">تاریخ *</label>
                <input
                  className="input text-sm py-2"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="label text-xs">ساعت *</label>
                <input
                  className="input text-sm py-2"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label text-xs">مدت (دقیقه) *</label>
              <input
                className="input text-sm py-2"
                type="number"
                min={5}
                max={480}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
              {typeConfig && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  پیش‌فرض {typeConfig.label}: {toFaDigits(typeConfig.defaultDuration)} دقیقه
                </p>
              )}
            </div>
          </div>

          {/* Right column: Type, Notes */}
          <div className="space-y-3">
            <div>
              <label className="label text-xs">نوع نوبت *</label>
              <div className="flex flex-wrap gap-1.5">
                {APPOINTMENT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => handleTypeChange(t.value)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border transition ${
                      type === t.value
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label text-xs">یادداشت</label>
              <textarea
                className="input text-sm py-2 min-h-[50px] resize-y"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="یادداشت اختیاری…"
              />
            </div>
          </div>
        </div>

        {/* Recurrence — collapsible */}
        <div className="border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setShowRecurrence(!showRecurrence)}
            className="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-teal-600 transition"
          >
            {showRecurrence ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            تکرار نوبت
            {recurrencePattern !== 'none' && (
              <span className="badge bg-teal-50 text-teal-700 border border-teal-200 text-[10px]">
                فعال
              </span>
            )}
          </button>
          {showRecurrence && (
            <div className="mt-2 space-y-2 animate-fade-in">
              <div className="flex flex-wrap gap-1.5">
                {RECURRENCE_PATTERNS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setRecurrencePattern(p.value)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border transition ${
                      recurrencePattern === p.value
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {recurrencePattern !== 'none' && (
                <div className="flex gap-2 items-end flex-wrap">
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRecurrenceEndType('date')}
                      className={`text-[10px] px-2 py-1 rounded-md border transition ${
                        recurrenceEndType === 'date'
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      تا تاریخ
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecurrenceEndType('count')}
                      className={`text-[10px] px-2 py-1 rounded-md border transition ${
                        recurrenceEndType === 'count'
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      تا تعداد
                    </button>
                  </div>
                  {recurrenceEndType === 'date' ? (
                    <input
                      className="input text-sm py-1.5 w-36"
                      type="date"
                      value={recurrenceEndDate}
                      onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    />
                  ) : (
                    <div>
                      <input
                        className="input text-sm py-1.5 w-20"
                        type="number"
                        min={2}
                        max={52}
                        value={recurrenceCount}
                        onChange={(e) => setRecurrenceCount(e.target.value)}
                      />
                      <p className="text-[9px] text-slate-400 mt-0.5">نوبت</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Conflict warnings */}
        {conflictWarnings.length > 0 && (
          <div className="space-y-1">
            {conflictWarnings.map((w, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                  w.severity === 'red'
                    ? 'bg-red-50 border border-red-100 text-red-700'
                    : 'bg-amber-50 border border-amber-100 text-amber-700'
                }`}
              >
                <span>⚠️</span>
                <span>{w.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">
            انصراف
          </button>
          <button type="submit" disabled={saving} className="btn-primary min-w-[120px] text-sm">
            {saving ? <Spinner /> : editing ? 'ذخیره' : 'ایجاد نوبت'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
