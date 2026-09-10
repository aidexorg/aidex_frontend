/**
 * Data export utilities for offline mode.
 * Supports JSON (full backup) and CSV (tabular reports).
 */
import type {
  Profile,
  Period,
  Session,
  Part,
  Action,
  Payment,
  Appointment,
} from '@/types';
import { formatPrice, toFaDigits } from './format';
import { type OfflineStorageSnapshot } from '@/data/offlineProvider';

// ── Download helper ──

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([`\uFEFF${content}`], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── JSON Export (full backup) ──

export function exportJSON(snapshot: OfflineStorageSnapshot): void {
  const data = {
    _format: 'aidex-offline-backup',
    _version: 1,
    _exported_at: new Date().toISOString(),
    ...snapshot,
  };
  downloadFile(JSON.stringify(data, null, 2), `aidex-backup-${dateStamp()}.json`, 'application/json');
}

export function importJSON(file: File): Promise<OfflineStorageSnapshot> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (data._format !== 'aidex-offline-backup') {
          reject(new Error('فرمت فایل نامعتبر است.'));
          return;
        }
        resolve({
          profiles: data.profiles ?? [],
          periods: data.periods ?? [],
          sessions: data.sessions ?? [],
          parts: data.parts ?? [],
          actions: data.actions ?? [],
          payments: data.payments ?? [],
          appointments: data.appointments ?? [],
          account: data.account ?? null,
        });
      } catch {
        reject(new Error('خطا در خواندن فایل.'));
      }
    };
    reader.onerror = () => reject(new Error('خطا در خواندن فایل.'));
    reader.readAsText(file);
  });
}

// ── CSV Helpers ──

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowsToCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(escapeCSV).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCSV).join(','));
  }
  return lines.join('\n');
}

// ── CSV Exports ──

export function exportProfilesCSV(profiles: Profile[]): void {
  const headers = ['شماره پرونده', 'نام', 'نام خانوادگی', 'تلفن', 'سال تولد', 'کد ملی', 'توضیحات', 'تاریخ ایجاد'];
  const rows = profiles.map((p) => [
    p.file_number,
    p.first_name,
    p.last_name,
    p.phone,
    p.birth_year,
    p.national_id,
    p.file_description,
    p.created_at,
  ]);
  downloadFile(rowsToCSV(headers, rows), `aidex-profiles-${dateStamp()}.csv`, 'text/csv');
}

export function exportActionsCSV(
  snapshot: OfflineStorageSnapshot,
): void {
  const profileMap = new Map(snapshot.profiles.map((p) => [p.id, p]));
  const periodMap = new Map(snapshot.periods.map((p) => [p.id, p]));
  const sessionMap = new Map(snapshot.sessions.map((s) => [s.id, s]));
  const partMap = new Map(snapshot.parts.map((p) => [p.id, p]));

  const headers = ['بیمار', 'پرونده', 'تاریخ جلسه', 'عنوان اقدام', 'قیمت', 'تخفیف', 'خالص', 'وضعیت'];
  const rows: (string | number | null)[][] = [];

  for (const action of snapshot.actions) {
    const part = partMap.get(action.part_id);
    const session = part ? sessionMap.get(part.session_id) : undefined;
    const period = session ? periodMap.get(session.period_id) : undefined;
    const profile = period ? profileMap.get(period.profile_id) : undefined;

    rows.push([
      profile ? `${profile.first_name} ${profile.last_name}` : '—',
      profile?.file_number ?? '—',
      session?.session_date ?? '—',
      action.title,
      toFaDigits(action.price),
      toFaDigits(action.discount),
      toFaDigits(action.price - action.discount),
      action.status === 'complete' ? 'کامل' : action.status === 'incomplete' ? 'ناقص' : 'برنامه‌ریزی',
    ]);
  }

  downloadFile(rowsToCSV(headers, rows), `aidex-actions-${dateStamp()}.csv`, 'text/csv');
}

export function exportPaymentsCSV(
  snapshot: OfflineStorageSnapshot,
): void {
  const periodMap = new Map(snapshot.periods.map((p) => [p.id, p]));
  const profileMap = new Map(snapshot.profiles.map((p) => [p.id, p]));

  const headers = ['بیمار', 'پرونده', 'تاریخ پرداخت', 'مبلغ', 'کد رهگیری', 'توضیحات'];
  const rows: (string | number | null)[][] = [];

  for (const payment of snapshot.payments) {
    const period = periodMap.get(payment.period_id);
    const profile = period ? profileMap.get(period.profile_id) : undefined;

    rows.push([
      profile ? `${profile.first_name} ${profile.last_name}` : '—',
      profile?.file_number ?? '—',
      payment.payment_date,
      toFaDigits(payment.amount),
      payment.tracking_code ?? '—',
      payment.description ?? '—',
    ]);
  }

  downloadFile(rowsToCSV(headers, rows), `aidex-payments-${dateStamp()}.csv`, 'text/csv');
}

export function exportAppointmentsCSV(
  snapshot: OfflineStorageSnapshot,
): void {
  const profileMap = new Map(snapshot.profiles.map((p) => [p.id, p]));

  const headers = ['بیمار', 'پرونده', 'تاریخ', 'ساعت', 'نوع', 'وضعیت', 'یادداشت'];
  const rows: (string | number | null)[][] = [];

  for (const appt of snapshot.appointments) {
    const profile = profileMap.get(appt.profile_id);
    const date = appt.start_time.slice(0, 10);
    const time = appt.start_time.slice(11, 16);

    const typeMap: Record<string, string> = {
      consultation: 'مشاوره',
      treatment: 'درمان',
      followup: 'پیگیری',
      emergency: 'اورژانس',
      hygiene: 'بهداشت',
    };
    const statusMap: Record<string, string> = {
      scheduled: 'برنامه‌ریزی',
      confirmed: 'تأیید',
      arrived: 'حاضر',
      in_progress: 'در حال درمان',
      completed: 'تکمیل',
      no_show: 'عدم حضور',
      cancelled: 'لغو',
    };

    rows.push([
      profile ? `${profile.first_name} ${profile.last_name}` : '—',
      profile?.file_number ?? '—',
      date,
      time,
      typeMap[appt.type] ?? appt.type,
      statusMap[appt.status] ?? appt.status,
      appt.notes ?? '—',
    ]);
  }

  downloadFile(rowsToCSV(headers, rows), `aidex-appointments-${dateStamp()}.csv`, 'text/csv');
}

// ── Full Report (all-in-one) ──

export function exportFullReport(snapshot: OfflineStorageSnapshot): void {
  const profileMap = new Map(snapshot.profiles.map((p) => [p.id, p]));
  const periodMap = new Map(snapshot.periods.map((p) => [p.id, p]));
  const sessionMap = new Map(snapshot.sessions.map((s) => [s.id, s]));
  const partMap = new Map(snapshot.parts.map((p) => [p.id, p]));

  const lines: string[] = [
    '═'.repeat(60),
    `گزارش کامل آفلاین — ${new Date().toLocaleDateString('fa-IR')}`,
    '═'.repeat(60),
    '',
  ];

  // Summary
  let totalProduction = 0;
  let totalCollections = 0;
  for (const action of snapshot.actions) {
    if (action.status === 'complete') totalProduction += action.price - action.discount;
  }
  for (const payment of snapshot.payments) {
    totalCollections += payment.amount;
  }

  lines.push(`تعداد بیماران: ${toFaDigits(snapshot.profiles.length)}`);
  lines.push(`تعداد نوبت‌ها: ${toFaDigits(snapshot.appointments.length)}`);
  lines.push(`تولید کل: ${formatPrice(totalProduction)}`);
  lines.push(`وصول کل: ${formatPrice(totalCollections)}`);
  lines.push(`مانده: ${formatPrice(totalProduction - totalCollections)}`);
  lines.push('');

  // Per-profile breakdown
  for (const profile of snapshot.profiles) {
    const periods = snapshot.periods.filter((p) => p.profile_id === profile.id);
    const profileActions = snapshot.actions.filter((a) => {
      const part = partMap.get(a.part_id);
      const session = part ? sessionMap.get(part.session_id) : undefined;
      const period = session ? periodMap.get(session.period_id) : undefined;
      return period?.profile_id === profile.id;
    });
    const profilePayments = snapshot.payments.filter((p) => {
      const period = periodMap.get(p.period_id);
      return period?.profile_id === profile.id;
    });

    const profileTotal = profileActions
      .filter((a) => a.status === 'complete')
      .reduce((s, a) => s + (a.price - a.discount), 0);
    const profilePaid = profilePayments.reduce((s, p) => s + p.amount, 0);

    lines.push('─'.repeat(40));
    lines.push(`پرونده ${profile.file_number ?? '—'}: ${profile.first_name} ${profile.last_name}`);
    lines.push(`  دوره‌ها: ${toFaDigits(periods.length)} | اقدامات: ${toFaDigits(profileActions.length)} | پرداخت‌ها: ${toFaDigits(profilePayments.length)}`);
    lines.push(`  جمع تولید: ${formatPrice(profileTotal)} | وصول: ${formatPrice(profilePaid)} | مانده: ${formatPrice(profileTotal - profilePaid)}`);
    lines.push('');
  }

  downloadFile(lines.join('\n'), `aidex-full-report-${dateStamp()}.txt`, 'text/plain');
}
