import { useState, useEffect, useRef, useCallback, useId } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { toFaDigits, todayISO } from '@/lib/format';
import {
  PERSIAN_MONTH_NAMES,
  isoToJalali,
  jalaliToIso,
  jalaaliMonthLength,
  jalaliFirstWeekday,
  addJalaliDays,
  type JalaliParts,
} from '@/lib/jalali';
import { formatJalaliLong } from '@/lib/jalaliFormat';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  /** Accessible name when no visible label is associated. */
  'aria-label'?: string;
}

const PERSIAN_WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

function jalaliFromIsoOrToday(iso: string | undefined): JalaliParts {
  if (iso) {
    const parsed = isoToJalali(iso);
    if (parsed) return parsed;
  }
  const today = todayISO();
  return isoToJalali(today) ?? { jy: 1403, jm: 1, jd: 1 };
}

function sameJalaliDay(a: JalaliParts, b: JalaliParts): boolean {
  return a.jy === b.jy && a.jm === b.jm && a.jd === b.jd;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'انتخاب تاریخ',
  disabled = false,
  className = '',
  id: idProp,
  'aria-label': ariaLabel = 'انتخاب تاریخ',
}: DatePickerProps) {
  const generatedId = useId();
  const triggerId = idProp ?? generatedId;
  const gridId = `${triggerId}-grid`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<{ jy: number; jm: number }>(() => {
    const j = jalaliFromIsoOrToday(value);
    return { jy: j.jy, jm: j.jm };
  });
  const [focusedDay, setFocusedDay] = useState<JalaliParts>(() => jalaliFromIsoOrToday(value));

  const todayIso = todayISO();
  const todayJalali = isoToJalali(todayIso);

  const openPicker = useCallback(() => {
    if (disabled) return;
    const anchor = jalaliFromIsoOrToday(value);
    setViewMonth({ jy: anchor.jy, jm: anchor.jm });
    setFocusedDay(anchor);
    setIsOpen(true);
  }, [disabled, value]);

  const closePicker = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        gridRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => {
      const focused = gridRef.current?.querySelector<HTMLButtonElement>(
        'button[data-day="true"][tabindex="0"]',
      );
      focused?.focus();
    });
  }, [isOpen, viewMonth.jy, viewMonth.jm, focusedDay]);

  const goToPrevMonth = useCallback(() => {
    setViewMonth((prev) => {
      if (prev.jm === 1) return { jy: prev.jy - 1, jm: 12 };
      return { jy: prev.jy, jm: prev.jm - 1 };
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewMonth((prev) => {
      if (prev.jm === 12) return { jy: prev.jy + 1, jm: 1 };
      return { jy: prev.jy, jm: prev.jm + 1 };
    });
  }, []);

  const selectDay = useCallback(
    (day: JalaliParts) => {
      onChange(jalaliToIso(day.jy, day.jm, day.jd));
      setIsOpen(false);
      triggerRef.current?.focus();
    },
    [onChange],
  );

  const goToToday = useCallback(() => {
    if (!todayJalali) return;
    setViewMonth({ jy: todayJalali.jy, jm: todayJalali.jm });
    setFocusedDay(todayJalali);
    onChange(todayIso);
    setIsOpen(false);
    triggerRef.current?.focus();
  }, [onChange, todayIso, todayJalali]);

  const moveFocus = useCallback(
    (delta: number) => {
      setFocusedDay((prev) => {
        const next = addJalaliDays(prev, delta);
        setViewMonth({ jy: next.jy, jm: next.jm });
        return next;
      });
    },
    [],
  );

  const handleGridKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          moveFocus(-1);
          break;
        case 'ArrowRight':
          event.preventDefault();
          moveFocus(1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          moveFocus(-7);
          break;
        case 'ArrowDown':
          event.preventDefault();
          moveFocus(7);
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          selectDay(focusedDay);
          break;
        case 'Escape':
          event.preventDefault();
          closePicker();
          break;
        case 'Home':
          event.preventDefault();
          setFocusedDay({ jy: viewMonth.jy, jm: viewMonth.jm, jd: 1 });
          break;
        case 'End': {
          event.preventDefault();
          const last = jalaaliMonthLength(viewMonth.jy, viewMonth.jm);
          setFocusedDay({ jy: viewMonth.jy, jm: viewMonth.jm, jd: last });
          break;
        }
        default:
          break;
      }
    },
    [closePicker, focusedDay, moveFocus, selectDay, viewMonth.jm, viewMonth.jy],
  );

  const daysInMonth = jalaaliMonthLength(viewMonth.jy, viewMonth.jm);
  const firstDay = jalaliFirstWeekday(viewMonth.jy, viewMonth.jm);

  const calendarDays: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const monthLabel = `${PERSIAN_MONTH_NAMES[viewMonth.jm - 1]} ${toFaDigits(viewMonth.jy)}`;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? gridId : undefined}
        onClick={() => (isOpen ? closePicker() : openPicker())}
        disabled={disabled}
        className={`w-full flex items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3.5 py-2.5 text-sm text-left transition
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-teal-300 hover:bg-white cursor-pointer'}
          ${isOpen ? 'border-teal-500 bg-white ring-4 ring-teal-500/10' : ''}
        `}
      >
        <Calendar size={16} className="text-slate-400 shrink-0" aria-hidden="true" />
        <span className={value ? 'text-slate-900' : 'text-slate-400'}>
          {value ? formatJalaliLong(value) : placeholder}
        </span>
      </button>

      {isOpen && (
        <div
          ref={gridRef}
          id={gridId}
          role="dialog"
          aria-modal="false"
          aria-label={`تقویم ${monthLabel}`}
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-900/10 p-4 z-50 animate-fade-in min-w-[280px]"
          onKeyDown={handleGridKeyDown}
        >
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goToPrevMonth}
              aria-label="ماه قبل"
              className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
            <p className="text-sm font-semibold text-slate-800" aria-live="polite">
              {monthLabel}
            </p>
            <button
              type="button"
              onClick={goToNextMonth}
              aria-label="ماه بعد"
              className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2" role="row">
            {PERSIAN_WEEKDAYS.map((day) => (
              <div
                key={day}
                role="columnheader"
                className="text-center text-[10px] font-medium text-slate-400 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1" role="grid" aria-label="روزهای ماه">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} role="presentation" />;
              }

              const cell: JalaliParts = { jy: viewMonth.jy, jm: viewMonth.jm, jd: day };
              const iso = jalaliToIso(cell.jy, cell.jm, cell.jd);
              const isSelected = value === iso;
              const isToday = todayJalali ? sameJalaliDay(cell, todayJalali) : false;
              const isFocused = sameJalaliDay(cell, focusedDay);

              return (
                <button
                  key={day}
                  type="button"
                  data-day="true"
                  role="gridcell"
                  tabIndex={isFocused ? 0 : -1}
                  aria-label={`${toFaDigits(day)} ${PERSIAN_MONTH_NAMES[viewMonth.jm - 1]} ${toFaDigits(viewMonth.jy)}`}
                  aria-selected={isSelected}
                  aria-current={isToday ? 'date' : undefined}
                  onClick={() => selectDay(cell)}
                  onFocus={() => setFocusedDay(cell)}
                  className={`
                    relative w-full aspect-square flex items-center justify-center rounded-lg text-sm transition
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500
                    ${isSelected
                      ? 'bg-teal-600 text-white font-semibold shadow-sm shadow-teal-600/25'
                      : isToday
                        ? 'bg-teal-50 text-teal-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-100'
                    }
                  `}
                >
                  {toFaDigits(day)}
                  {isToday && !isSelected && (
                    <span
                      className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal-500"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={goToToday}
              className="text-xs font-medium text-teal-600 hover:text-teal-700 px-2 py-1 rounded-lg hover:bg-teal-50 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500"
            >
              امروز
            </button>
            <button
              type="button"
              onClick={closePicker}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-50 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
