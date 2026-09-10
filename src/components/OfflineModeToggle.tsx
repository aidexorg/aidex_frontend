import { useState, useRef, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  HardDrive,
  Upload,
  ChevronDown,
} from 'lucide-react';
import { useDataProviderMode, getOfflineSnapshot, getOfflineStorageSize } from '@/data';
import type { DataProviderMode } from '@/data';
import {
  exportJSON,
  importJSON,
  exportProfilesCSV,
  exportActionsCSV,
  exportPaymentsCSV,
  exportAppointmentsCSV,
  exportFullReport,
} from '@/lib/exportData';
import { toFaDigits } from '@/lib/format';
import { useToast } from './ToastProvider';
import { useTranslation } from './LocaleProvider';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '۰ بایت';
  if (bytes < 1024) return `${toFaDigits(bytes)} بایت`;
  if (bytes < 1024 * 1024) return `${toFaDigits(Math.round(bytes / 1024))} کیلوبایت`;
  return `${toFaDigits(Math.round(bytes / (1024 * 1024)))} مگابایت`;
}

export function OfflineModeToggle() {
  const { mode, setMode } = useDataProviderMode();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close menus on outside click
  useEffect(() => {
    if (!menuOpen && !exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen, exportOpen]);

  const isOffline = mode === 'offline';

  const handleModeToggle = () => {
    const next: DataProviderMode = isOffline ? 'remote' : 'offline';
    setMode(next);
    setMenuOpen(false);
    showToast({
      message: next === 'offline'
        ? 'حالت آفلاین فعال شد — تمام داده‌ها سمت مرورگر ذخیره می‌شوند.'
        : 'حالت آنلاین فعال شد — اتصال به سرور برقرار است.',
      variant: 'info',
    });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const snapshot = await importJSON(file);
      // Write imported data to localStorage
      const PREFIX = 'aidex:offline:';
      localStorage.setItem(`${PREFIX}profiles`, JSON.stringify(snapshot.profiles));
      localStorage.setItem(`${PREFIX}periods`, JSON.stringify(snapshot.periods));
      localStorage.setItem(`${PREFIX}sessions`, JSON.stringify(snapshot.sessions));
      localStorage.setItem(`${PREFIX}parts`, JSON.stringify(snapshot.parts));
      localStorage.setItem(`${PREFIX}actions`, JSON.stringify(snapshot.actions));
      localStorage.setItem(`${PREFIX}payments`, JSON.stringify(snapshot.payments));
      localStorage.setItem(`${PREFIX}appointments`, JSON.stringify(snapshot.appointments));
      if (snapshot.account) {
        localStorage.setItem(`${PREFIX}account`, JSON.stringify(snapshot.account));
      }
      // Switch to offline mode
      setMode('offline');
      showToast({ message: `داده‌های ${toFaDigits(snapshot.profiles.length)} بیمار با موفقیت بازیابی شد.`, variant: 'success' });
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : 'خطا در بازیابی داده‌ها.', variant: 'error' });
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const snapshot = isOffline ? getOfflineSnapshot() : null;
  const storageSize = isOffline ? getOfflineStorageSize() : 0;

  return (
    <>
      {/* Mode toggle button */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-sm transition ${
            isOffline
              ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
              : 'border-slate-200 bg-slate-50/80 text-slate-600 hover:border-sage-300 hover:bg-white dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-sage-500'
          }`}
          aria-label={isOffline ? 'حالت آفلاین فعال' : 'حالت آنلاین فعال'}
          aria-expanded={menuOpen}
        >
          {isOffline ? <WifiOff size={16} /> : <Wifi size={16} />}
          <span className="hidden sm:inline text-xs font-medium">
            {isOffline ? 'آفلاین' : 'آنلاین'}
          </span>
          <ChevronDown size={12} className="hidden sm:block" />
        </button>

        {menuOpen && (
          <div className="absolute end-0 top-full mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg z-50 dark:border-slate-700 dark:bg-slate-800 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">حالت اتصال</span>
              {isOffline && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400">
                  {formatBytes(storageSize)}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleModeToggle}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition text-right ${
                isOffline
                  ? 'bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800/50'
                  : 'bg-sage-50 border border-sage-200 dark:bg-sage-950/40 dark:border-sage-800/50'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isOffline ? 'bg-amber-100 text-amber-600' : 'bg-sage-100 text-sage-600'
              }`}>
                {isOffline ? <WifiOff size={20} /> : <Wifi size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {isOffline ? 'آفلاین' : 'آنلاین'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isOffline
                    ? 'تمام داده‌ها سمت مرورگر ذخیره می‌شوند'
                    : 'اتصال به سرور REST API'}
                </p>
              </div>
            </button>

            {isOffline && snapshot && (
              <div className="mt-3 space-y-2">
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  {toFaDigits(snapshot.profiles.length)} بیمار · {toFaDigits(snapshot.appointments.length)} نوبت · {toFaDigits(snapshot.actions.length)} اقدام
                </p>
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                بازیابی داده از فایل پشتیبان
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-2 p-2 rounded-lg border border-dashed border-slate-300 text-sm text-slate-600 hover:bg-slate-50 transition dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700/50"
              >
                <Upload size={16} />
                انتخاب فایل JSON
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
            </div>
          </div>
        )}
      </div>

      {/* Export dropdown (only in offline mode) */}
      {isOffline && (
        <div className="relative" ref={exportRef}>
          <button
            type="button"
            onClick={() => setExportOpen(!exportOpen)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2 text-sm text-slate-600 hover:border-sage-300 hover:bg-white transition dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-sage-500"
            aria-label="خروجی داده‌ها"
            aria-expanded={exportOpen}
          >
            <Download size={16} />
            <span className="hidden sm:inline text-xs font-medium">خروجی</span>
            <ChevronDown size={12} className="hidden sm:block" />
          </button>

          {exportOpen && (
            <div className="absolute end-0 top-full mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg z-50 dark:border-slate-700 dark:bg-slate-800 animate-fade-in">
              <p className="px-2 py-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                خروجی JSON (پشتیبان کامل)
              </p>
              <button
                type="button"
                onClick={() => { exportJSON(snapshot!); setExportOpen(false); }}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition dark:text-slate-300 dark:hover:bg-slate-700/50"
              >
                <FileJson size={16} className="text-blue-500" />
                پشتیبان کامل (JSON)
              </button>

              <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

              <p className="px-2 py-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                خروجی CSV (گزارش‌ها)
              </p>
              <button
                type="button"
                onClick={() => { exportProfilesCSV(snapshot!.profiles); setExportOpen(false); }}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition dark:text-slate-300 dark:hover:bg-slate-700/50"
              >
                <FileSpreadsheet size={16} className="text-emerald-500" />
                فهرست بیماران
              </button>
              <button
                type="button"
                onClick={() => { exportActionsCSV(snapshot!); setExportOpen(false); }}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition dark:text-slate-300 dark:hover:bg-slate-700/50"
              >
                <FileSpreadsheet size={16} className="text-teal-500" />
                اقدامات درمانی
              </button>
              <button
                type="button"
                onClick={() => { exportPaymentsCSV(snapshot!); setExportOpen(false); }}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition dark:text-slate-300 dark:hover:bg-slate-700/50"
              >
                <FileSpreadsheet size={16} className="text-amber-500" />
                پرداخت‌ها
              </button>
              <button
                type="button"
                onClick={() => { exportAppointmentsCSV(snapshot!); setExportOpen(false); }}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition dark:text-slate-300 dark:hover:bg-slate-700/50"
              >
                <FileSpreadsheet size={16} className="text-sky-500" />
                نوبت‌ها
              </button>

              <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

              <button
                type="button"
                onClick={() => { exportFullReport(snapshot!); setExportOpen(false); }}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition dark:text-slate-300 dark:hover:bg-slate-700/50"
              >
                <FileText size={16} className="text-purple-500" />
                گزارش کامل
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
