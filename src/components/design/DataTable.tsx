import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toFaDigits } from '@/lib/format';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  ariaLabel?: string;
  rowLabel?: (row: T) => string;
  /** Enable controlled row selection (checkbox column). */
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  /** Accessible label for a row checkbox. */
  selectionLabel?: (row: T) => string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyMessage = 'موردی یافت نشد.',
  page,
  totalPages,
  onPageChange,
  ariaLabel = 'جدول اطلاعات',
  rowLabel,
  selectable = false,
  selectedKeys,
  onSelectionChange,
  selectionLabel,
}: DataTableProps<T>) {
  const selected = selectedKeys ?? new Set<string>();
  const pageKeys = rows.map(rowKey);
  const selectedOnPage = pageKeys.filter((key) => selected.has(key));
  const allPageSelected = pageKeys.length > 0 && selectedOnPage.length === pageKeys.length;
  const somePageSelected = selectedOnPage.length > 0 && !allPageSelected;
  const totalColumns = columns.length + (selectable ? 1 : 0);

  const toggleRow = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange?.(next);
  };

  const togglePage = () => {
    const next = new Set(selected);
    if (allPageSelected) {
      pageKeys.forEach((key) => next.delete(key));
    } else {
      pageKeys.forEach((key) => next.add(key));
    }
    onSelectionChange?.(next);
  };

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table aria-label={ariaLabel} className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {selectable && (
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-sage-600"
                    checked={allPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = somePageSelected;
                    }}
                    onChange={togglePage}
                    aria-label="انتخاب همه ردیف‌های این صفحه"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-right font-medium text-slate-500 ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={totalColumns} className="px-4 py-12 text-center text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const key = rowKey(row);
                return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(row)}
                  onKeyDown={(event) => {
                    if (!onRowClick || (event.key !== 'Enter' && event.key !== ' ')) return;
                    event.preventDefault();
                    onRowClick(row);
                  }}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-label={rowLabel?.(row)}
                  className={`border-b border-slate-50 last:border-0 ${
                    onRowClick ? 'cursor-pointer hover:bg-sage-50/50 transition-colors' : ''
                  } ${selected.has(key) ? 'bg-sage-50/40' : ''}`}
                >
                  {selectable && (
                    <td className="px-4 py-3.5 w-10">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-sage-600"
                        checked={selected.has(key)}
                        onClick={(event) => event.stopPropagation()}
                        onChange={() => toggleRow(key)}
                        aria-label={selectionLabel?.(row) ?? 'انتخاب ردیف'}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3.5 text-slate-700 ${col.className ?? ''}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {page !== undefined && totalPages !== undefined && totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-center gap-2 py-4 border-t border-slate-100">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40"
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
              className={`min-w-[32px] h-8 rounded-lg text-sm font-medium ${
                p === page ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {toFaDigits(p)}
            </button>
          ))}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40"
            aria-label="صفحه بعد"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
