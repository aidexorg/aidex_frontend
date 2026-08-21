import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { toFaDigits } from '@/lib/format';

interface TimePickerProps {
  value: string; // HH:mm format
  onChange: (time: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function formatTimeDisplay(time: string): string {
  if (!time) return '';
  const [h, m] = time.split(':');
  return `${toFaDigits(h)}:${toFaDigits(m)}`;
}

export function TimePicker({
  value,
  onChange,
  placeholder = 'انتخاب ساعت',
  disabled = false,
  className = '',
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState(() => {
    if (value) {
      const h = parseInt(value.split(':')[0], 10);
      return isNaN(h) ? 9 : h;
    }
    return 9;
  });
  const [selectedMinute, setSelectedMinute] = useState(() => {
    if (value) {
      const m = parseInt(value.split(':')[1], 10);
      return isNaN(m) ? 0 : m;
    }
    return 0;
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with external value
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      const hour = parseInt(h, 10);
      const minute = parseInt(m, 10);
      if (!isNaN(hour)) setSelectedHour(hour);
      if (!isNaN(minute)) setSelectedMinute(minute);
    }
  }, [value]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const confirmSelection = useCallback(() => {
    const timeStr = `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
    onChange(timeStr);
    setIsOpen(false);
  }, [selectedHour, selectedMinute, onChange]);

  const incrementHour = useCallback(() => {
    setSelectedHour((h) => (h + 1) % 24);
  }, []);

  const decrementHour = useCallback(() => {
    setSelectedHour((h) => (h - 1 + 24) % 24);
  }, []);

  const incrementMinute = useCallback(() => {
    setSelectedMinute((m) => (m + 5) % 60);
  }, []);

  const decrementMinute = useCallback(() => {
    setSelectedMinute((m) => (m - 5 + 60) % 60);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3.5 py-2.5 text-sm text-left transition
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-teal-300 hover:bg-white cursor-pointer'}
          ${isOpen ? 'border-teal-500 bg-white ring-4 ring-teal-500/10' : ''}
        `}
      >
        <Clock size={16} className="text-slate-400 shrink-0" />
        <span className={value ? 'text-slate-900' : 'text-slate-400'}>
          {value ? formatTimeDisplay(value) : placeholder}
        </span>
      </button>

      {/* Dropdown time picker */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-900/10 p-4 z-50 animate-fade-in min-w-[260px]">
          {/* Time display with arrows */}
          <div className="flex items-center justify-center gap-6 mb-4">
            {/* Hour */}
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={incrementHour}
                className="p-1 rounded-lg hover:bg-slate-100 transition text-slate-500"
              >
                <ChevronUp size={18} />
              </button>
              <div className="text-3xl font-bold text-slate-800 w-14 text-center tabular-nums">
                {toFaDigits(String(selectedHour).padStart(2, '0'))}
              </div>
              <button
                type="button"
                onClick={decrementHour}
                className="p-1 rounded-lg hover:bg-slate-100 transition text-slate-500"
              >
                <ChevronDown size={18} />
              </button>
              <span className="text-[10px] text-slate-400">ساعت</span>
            </div>

            <span className="text-2xl font-bold text-teal-500">:</span>

            {/* Minute */}
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={incrementMinute}
                className="p-1 rounded-lg hover:bg-slate-100 transition text-slate-500"
              >
                <ChevronUp size={18} />
              </button>
              <div className="text-3xl font-bold text-slate-800 w-14 text-center tabular-nums">
                {toFaDigits(String(selectedMinute).padStart(2, '0'))}
              </div>
              <button
                type="button"
                onClick={decrementMinute}
                className="p-1 rounded-lg hover:bg-slate-100 transition text-slate-500"
              >
                <ChevronDown size={18} />
              </button>
              <span className="text-[10px] text-slate-400">دقیقه</span>
            </div>
          </div>

          {/* Quick minute buttons */}
          <div className="flex flex-wrap justify-center gap-1.5 mb-4">
            {MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMinute(m)}
                className={`
                  w-10 h-8 rounded-lg text-xs font-medium transition
                  ${selectedMinute === m
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/25'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }
                `}
              >
                {toFaDigits(String(m).padStart(2, '0'))}
              </button>
            ))}
          </div>

          {/* Quick hour buttons */}
          <div className="flex flex-wrap justify-center gap-1 mb-4">
            {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setSelectedHour(h)}
                className={`
                  w-10 h-8 rounded-lg text-xs font-medium transition
                  ${selectedHour === h
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/25'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }
                `}
              >
                {toFaDigits(String(h).padStart(2, '0'))}
              </button>
            ))}
          </div>

          {/* Confirm button */}
          <button
            type="button"
            onClick={confirmSelection}
            className="w-full py-2 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-500 transition shadow-sm shadow-teal-600/25"
          >
            تأیید — {formatTimeDisplay(`${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`)}
          </button>
        </div>
      )}
    </div>
  );
}
