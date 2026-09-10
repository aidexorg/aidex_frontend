import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { toFaDigits } from '@/lib/format';

export type SortDirection = 'asc' | 'desc';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
  /** Opt-in: render this column header as a sort control. */
  sortable?: boolean;
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
  /** Controlled sort state (parent performs the actual sort). */
  sortKey?: string | null;
  sortDirection?: SortDirection;
  onSortChange?: (key: string) => void;
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
  sortKey = null,
  sortDirection = 'asc',
  onSortChange,
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
            <tr className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/50">
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
              {columns.map((col) => {
                const isSortable = Boolean(col.sortable && onSortChange);
                const isActiveSort = isSortable && sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    aria-sort={
                      isActiveSort
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : isSortable
                          ? 'none'
                          : undefined
                    }
                    className={`px-4 py-3 text-start font-medium text-slate-500 dark:text-slate-400 ${col.className ?? ''}`}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => onSortChange?.(col.key)}
                        className="inline-flex items-center gap-1 font-medium text-slate-500 hover:text-slate-700 transition-colors dark:text-slate-400 dark:hover:text-slate-200"
                      >
                        {col.header}
                        {isActiveSort ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp size={14} aria-hidden="true" />
                          ) : (
                            <ChevronDown size={14} aria-hidden="true" />
                          )
                        ) : (
                          <ChevronsUpDown size={14} className="text-slate-300" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
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
                  className={`border-b border-slate-50 last:border-0 dark:border-slate-700/50 ${
                    onRowClick ? 'cursor-pointer hover:bg-sage-50/50 transition-colors dark:hover:bg-sage-950/30' : ''
                  } ${selected.has(key) ? 'bg-sage-50/40 dark:bg-sage-950/25' : ''}`}
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
