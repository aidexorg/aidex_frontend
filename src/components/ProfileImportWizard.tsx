import { useCallback, useMemo, useRef, useState } from 'react';
import { Upload, ChevronLeft, ChevronRight, FileSpreadsheet, AlertCircle } from 'lucide-react';
import type { Profile } from '@/types';
import type { ProfileWrite } from '@/data/types';
import { useData } from '@/data';
import { CsvParseError, parseCsv, type ParsedCsv } from '@/lib/csvParse';
import {
  autoMapColumns,
  importableRows,
  mappingComplete,
  IMPORT_FIELDS,
  REQUIRED_IMPORT_FIELDS,
  validateImportRows,
  type ColumnMapping,
  type ImportFieldKey,
  type ValidatedImportRow,
} from '@/lib/profileImport';
import { runBulk } from '@/lib/bulkRun';
import { formatDigits } from '@/lib/format';
import { Modal } from './Modal';
import { Spinner } from './ui';
import { useTranslation } from './LocaleProvider';
import type { MessageKey } from '@/i18n/messages';

type WizardStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'done';

const PREVIEW_LIMIT = 10;

interface ProfileImportWizardProps {
  open: boolean;
  onClose: () => void;
  existingProfiles: Profile[];
  onImported: () => void;
}

interface ImportFailure {
  rowIndex: number;
  name: string;
  reason: string;
}

const STATUS_STYLES: Record<ValidatedImportRow['status'], string> = {
  valid: 'bg-emerald-50 text-emerald-800 border-emerald-100',
  warning: 'bg-amber-50 text-amber-800 border-amber-100',
  error: 'bg-red-50 text-red-800 border-red-100',
  duplicate: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function ProfileImportWizard({
  open,
  onClose,
  existingProfiles,
  onImported,
}: ProfileImportWizardProps) {
  const data = useData();
  const { t, locale } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<WizardStep>('upload');
  const [parseError, setParseError] = useState<MessageKey | null>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [validated, setValidated] = useState<ValidatedImportRow[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{
    imported: number;
    skippedDuplicates: number;
    skippedErrors: number;
    failed: ImportFailure[];
  } | null>(null);

  const reset = useCallback(() => {
    setStep('upload');
    setParseError(null);
    setParsed(null);
    setMapping({});
    setValidated([]);
    setProgress({ done: 0, total: 0 });
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleClose = useCallback(() => {
    if (step === 'importing') return;
    reset();
    onClose();
  }, [step, reset, onClose]);

  const handleFile = useCallback(
    async (file: File) => {
      setParseError(null);
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setParseError('import.error.notCsv');
        return;
      }
      try {
        const text = await file.text();
        const csv = parseCsv(text);
        if (csv.rows.length === 0) {
          setParseError('import.error.emptyRows');
          return;
        }
        const auto = autoMapColumns(csv.headers);
        setParsed(csv);
        setMapping(auto);
        setStep('mapping');
      } catch (err) {
        if (err instanceof CsvParseError) {
          setParseError(
            err.message === 'empty' || err.message === 'no_headers'
              ? 'import.error.emptyFile'
              : 'import.error.parseFailed',
          );
        } else {
          setParseError('import.error.parseFailed');
        }
      }
    },
    [],
  );

  const fieldLabel = useCallback(
    (field: ImportFieldKey) => t(`import.field.${field}` as MessageKey),
    [t],
  );

  const statusLabel = useCallback(
    (row: ValidatedImportRow) => t(row.messageKeys[0]),
    [t],
  );

  const previewRows = useMemo(() => validated.slice(0, PREVIEW_LIMIT), [validated]);
  const stats = useMemo(() => {
    const importable = importableRows(validated);
    return {
      total: validated.length,
      importable: importable.length,
      duplicates: validated.filter((r) => r.status === 'duplicate').length,
      errors: validated.filter((r) => r.status === 'error').length,
    };
  }, [validated]);

  const goToPreview = useCallback(() => {
    if (!parsed || !mappingComplete(mapping)) return;
    setValidated(validateImportRows(parsed.rows, parsed.headers, mapping, existingProfiles));
    setStep('preview');
  }, [parsed, mapping, existingProfiles]);

  const runImport = useCallback(async () => {
    const rows = importableRows(validated);
    if (rows.length === 0) return;

    setStep('importing');
    setProgress({ done: 0, total: rows.length });

    const failures: ImportFailure[] = [];
    const bulkResult = await runBulk(
      rows,
      async (row) => {
        const payload: ProfileWrite = {
          ...row.data,
          first_name: row.data.first_name.trim(),
          last_name: row.data.last_name.trim(),
        };
        await data.createProfile(payload);
      },
      {
        concurrency: 3,
        onProgress: (done, total) => setProgress({ done, total }),
      },
    );

    for (const f of bulkResult.failed) {
      const err = f.error;
      failures.push({
        rowIndex: f.item.rowIndex,
        name: `${f.item.data.first_name} ${f.item.data.last_name}`.trim(),
        reason: err instanceof Error ? err.message : t('import.error.importFailed'),
      });
    }

    setResult({
      imported: bulkResult.succeeded.length,
      skippedDuplicates: validated.filter((r) => r.status === 'duplicate').length,
      skippedErrors: validated.filter((r) => r.status === 'error').length,
      failed: failures,
    });
    setStep('done');
    if (bulkResult.succeeded.length > 0) {
      onImported();
    }
  }, [validated, data, t, onImported]);

  const stepTitle = useMemo(() => {
    switch (step) {
      case 'upload':
        return t('import.title');
      case 'mapping':
        return t('import.mappingTitle');
      case 'preview':
        return t('import.previewTitle');
      case 'importing':
        return t('import.importingTitle');
      case 'done':
        return t('import.doneTitle');
    }
  }, [step, t]);

  return (
    <Modal open={open} onClose={handleClose} title={stepTitle} size="xl">
      {step === 'upload' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">{t('import.uploadHint')}</p>
          <p className="text-xs text-slate-400">{t('import.csvOnlyHint')}</p>

          <label className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 cursor-pointer hover:border-sage-300 hover:bg-sage-50/30 transition dark:border-slate-600 dark:bg-slate-800/40">
            <Upload size={32} className="text-sage-500" aria-hidden="true" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {t('import.chooseFile')}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </label>

          {parseError && (
            <div role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={16} className="shrink-0" />
              {t(parseError)}
            </div>
          )}
        </div>
      )}

      {step === 'mapping' && parsed && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            {t('import.mappingHint', { count: formatDigits(parsed.rows.length, locale) })}
          </p>

          <div className="space-y-3 max-h-[50vh] overflow-y-auto pe-1">
            {IMPORT_FIELDS.map((field) => (
              <div key={field} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                <label htmlFor={`map-${field}`} className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {fieldLabel(field)}
                  {REQUIRED_IMPORT_FIELDS.includes(field) && (
                    <span className="text-red-500 ms-1">*</span>
                  )}
                </label>
                <select
                  id={`map-${field}`}
                  className="input text-sm"
                  value={mapping[field] ?? ''}
                  onChange={(e) =>
                    setMapping((prev) => ({
                      ...prev,
                      [field]: e.target.value || null,
                    }))
                  }
                >
                  <option value="">{t('import.columnNone')}</option>
                  {parsed.headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {!mappingComplete(mapping) && (
            <p className="text-xs text-amber-700">{t('import.mappingRequired')}</p>
          )}

          <div className="flex justify-between gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setStep('upload')}>
              <ChevronRight size={16} />
              {t('import.back')}
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!mappingComplete(mapping)}
              onClick={goToPreview}
            >
              {t('import.continue')}
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-600">
              {t('import.statTotal', { count: formatDigits(stats.total, locale) })}
            </span>
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700">
              {t('import.statImportable', { count: formatDigits(stats.importable, locale) })}
            </span>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-600">
              {t('import.statDuplicates', { count: formatDigits(stats.duplicates, locale) })}
            </span>
            <span className="rounded-lg bg-red-50 px-2.5 py-1 text-red-700">
              {t('import.statErrors', { count: formatDigits(stats.errors, locale) })}
            </span>
          </div>

          <p className="text-xs text-slate-400">{t('import.previewLimit', { count: PREVIEW_LIMIT })}</p>

          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <th className="px-3 py-2 text-start font-medium">{t('import.colRow')}</th>
                  <th className="px-3 py-2 text-start font-medium">{t('import.colName')}</th>
                  <th className="px-3 py-2 text-start font-medium">{t('import.colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.rowIndex} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="px-3 py-2 font-mono text-xs">{formatDigits(row.rowIndex, locale)}</td>
                    <td className="px-3 py-2">
                      {row.data.first_name} {row.data.last_name}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block rounded-lg border px-2 py-0.5 text-xs ${STATUS_STYLES[row.status]}`}
                      >
                        {statusLabel(row)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setStep('mapping')}>
              <ChevronRight size={16} />
              {t('import.back')}
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={stats.importable === 0}
              onClick={() => void runImport()}
            >
              {t('import.confirm', { count: formatDigits(stats.importable, locale) })}
            </button>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div className="flex flex-col items-center gap-4 py-10">
          <Spinner size={32} className="text-teal-600" />
          <p className="text-sm text-slate-600">
            {t('import.progress', {
              done: formatDigits(progress.done, locale),
              total: formatDigits(progress.total, locale),
            })}
          </p>
        </div>
      )}

      {step === 'done' && result && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-sage-100 bg-sage-50/60 p-4 dark:border-sage-800 dark:bg-sage-950/30">
            <FileSpreadsheet size={24} className="text-sage-600 shrink-0" aria-hidden="true" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-brand-navy dark:text-slate-100">{t('import.resultSummary')}</p>
              <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                <li>{t('import.resultImported', { count: formatDigits(result.imported, locale) })}</li>
                <li>{t('import.resultSkippedDuplicates', { count: formatDigits(result.skippedDuplicates, locale) })}</li>
                <li>{t('import.resultSkippedErrors', { count: formatDigits(result.skippedErrors, locale) })}</li>
                {result.failed.length > 0 && (
                  <li>{t('import.resultFailed', { count: formatDigits(result.failed.length, locale) })}</li>
                )}
              </ul>
            </div>
          </div>

          {result.failed.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-xl border border-red-100 bg-red-50/50 p-3 text-xs space-y-2">
              {result.failed.map((f) => (
                <div key={f.rowIndex}>
                  <span className="font-medium">
                    {t('import.failedRow', { row: formatDigits(f.rowIndex, locale), name: f.name })}
                  </span>
                  <span className="text-red-700"> — {f.reason}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button type="button" className="btn-primary" onClick={handleClose}>
              {t('import.close')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
