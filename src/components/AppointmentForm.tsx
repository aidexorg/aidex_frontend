import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Modal } from './Modal';
import { ErrorBanner, Spinner } from './ui';
import { useData } from '@/data';
import {
  APPOINTMENT_TYPES,
  type Appointment,
  type AppointmentType,
} from '@/types';
import { toFaDigits } from '@/lib/format';
import type { Profile } from '@/types';

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictWarnings, setConflictWarnings] = useState<
    { message: string; severity: 'red' | 'amber' }[]
  >([]);
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
      setProfileSearch('');
    } else {
      setSelectedProfileId(prefillProfileId ?? '');
      setType('treatment');
      setDate('');
      setTime('09:00');
      setDuration('45');
      setNotes('');
      setProfileSearch('');
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

          // Chair conflict (if both have chair_id and match)
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

          // Dentist conflict (if both have dentist_id and match)
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

          // Generic overlap (no chair/dentist match — still warn)
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
      const payload = {
        profile_id: selectedProfileId,
        dentist_id: editing?.dentist_id ?? null,
        chair_id: editing?.chair_id ?? null,
        start_time: startIso,
        duration_minutes: dur,
        type,
        status: editing?.status ?? 'scheduled',
        notes: notes.trim() || null,
      };
      const row = editing
        ? await data.updateAppointment(editing.id, payload)
        : await data.createAppointment(payload);
      onSaved(row);
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
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Patient preview */}
        {selectedProfile && (
          <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 p-4 text-white flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-lg font-bold">
              {selectedProfile.first_name.charAt(0)}
            </div>
            <div>
              <p className="text-[11px] text-teal-100">
                {editing ? 'ویرایش نوبت بیمار' : 'نوبت جدید برای'}
              </p>
              <p className="text-lg font-bold">{displayName}</p>
              {selectedProfile.file_number && (
                <p className="text-xs text-teal-100">
                  پرونده {toFaDigits(selectedProfile.file_number)}
                </p>
              )}
            </div>
          </div>
        )}

        {error && <ErrorBanner message={error} />}

        {/* Patient search */}
        {!prefillProfileId && !editing && (
          <div>
            <label className="label">بیمار *</label>
            <input
              className="input"
              placeholder="جستجو بر اساس نام یا شماره پرونده…"
              value={profileSearch || (selectedProfile ? displayName : '')}
              onChange={(e) => {
                setProfileSearch(e.target.value);
                if (selectedProfileId) setSelectedProfileId('');
              }}
            />
            {profileSearch && filteredProfiles.length > 0 && !selectedProfileId && (
              <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                {filteredProfiles.slice(0, 8).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedProfileId(p.id);
                      setProfileSearch('');
                    }}
                    className="w-full text-right px-3 py-2 hover:bg-slate-50 text-sm flex items-center gap-2"
                  >
                    <span className="font-medium text-slate-800">
                      {p.first_name} {p.last_name}
                    </span>
                    {p.file_number && (
                      <span className="text-xs text-slate-400">
                        پرونده {toFaDigits(p.file_number)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Appointment type */}
        <div>
          <label className="label">نوع نوبت *</label>
          <div className="flex flex-wrap gap-2">
            {APPOINTMENT_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => handleTypeChange(t.value)}
                className={type === t.value ? 'chip-active' : 'chip'}
              >
                {t.label} ({toFaDigits(t.defaultDuration)} دقیقه)
              </button>
            ))}
          </div>
        </div>

        {/* Date + Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">تاریخ *</label>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">ساعت *</label>
            <input
              className="input"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="label">مدت (دقیقه) *</label>
          <input
            className="input"
            type="number"
            min={5}
            max={480}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
          {typeConfig && (
            <p className="text-xs text-slate-400 mt-1">
              پیش‌فرض {typeConfig.label}: {toFaDigits(typeConfig.defaultDuration)} دقیقه
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="label">یادداشت</label>
          <textarea
            className="input min-h-[60px] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="یادداشت اختیاری درباره نوبت…"
          />
        </div>

        {/* Conflict warnings */}
        {conflictWarnings.length > 0 && (
          <div className="space-y-1.5">
            {conflictWarnings.map((w, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm ${
                  w.severity === 'red'
                    ? 'bg-red-50 border border-red-100 text-red-700'
                    : 'bg-amber-50 border border-amber-100 text-amber-700'
                }`}
              >
                <span className="text-lg">⚠️</span>
                <span>{w.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary">
            انصراف
          </button>
          <button type="submit" disabled={saving} className="btn-primary min-w-[140px]">
            {saving ? <Spinner /> : editing ? 'ذخیره تغییرات' : 'ایجاد نوبت'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
