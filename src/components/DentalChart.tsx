import { TOOTH_NUMBERS } from '@/types';
import { toFaDigits } from '@/lib/format';
import type { ToothDisplayStatus } from '@/lib/profileOutput';

const NUMS = [...TOOTH_NUMBERS];

const UPPER = {
  right: [...NUMS].reverse().map((n) => `UR${n}`),
  left: NUMS.map((n) => `UL${n}`),
};
const LOWER = {
  right: [...NUMS].reverse().map((n) => `LR${n}`),
  left: NUMS.map((n) => `LL${n}`),
};

function archLift(index: number, count: number): number {
  const mid = (count - 1) / 2;
  const t = (index - mid) / mid;
  return Math.round(t * t * 14);
}

function toothNumber(code: string): string {
  return code.slice(2);
}

const STATUS_STYLES: Record<ToothDisplayStatus, string> = {
  healthy: 'bg-white text-slate-500 border-slate-200 hover:border-sage-300',
  in_treatment: 'bg-blue-400 text-white border-blue-300 shadow-sm',
  treated: 'bg-sage-500 text-white border-sage-400 shadow-sm',
  appointment_needed: 'bg-amber-400 text-white border-amber-300 shadow-sm',
};

interface DentalChartProps {
  selected: string[];
  onToggle: (code: string) => void;
}

function ToothButton({
  code,
  selected,
  onToggle,
  arch,
}: {
  code: string;
  selected: boolean;
  onToggle: (code: string) => void;
  arch: 'upper' | 'lower';
}) {
  return (
    <button
      type="button"
      title={code}
      aria-label={code}
      aria-pressed={selected}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(code);
      }}
      className={`relative w-full aspect-[4/5] min-h-[1.75rem] max-h-11 text-[9px] sm:text-[10px] font-semibold transition-all duration-150 border cursor-pointer ${
        arch === 'upper' ? 'rounded-t-[14px] rounded-b-[6px]' : 'rounded-b-[14px] rounded-t-[6px]'
      } ${
        selected
          ? 'bg-sage-500 text-white border-sage-400 shadow-[0_0_14px_rgba(122,158,126,0.4)] scale-[1.04]'
          : 'bg-white text-slate-500 border-slate-200 hover:border-sage-300 hover:text-sage-700'
      }`}
    >
      <span
        className={`absolute left-1/2 -translate-x-1/2 w-3.5 h-1.5 rounded-full pointer-events-none ${
          selected ? 'bg-white/30' : 'bg-slate-200'
        } ${arch === 'upper' ? 'top-1' : 'bottom-1'}`}
      />
      {toFaDigits(toothNumber(code))}
    </button>
  );
}

function DisplayToothButton({
  code,
  status,
  isSelected,
  onSelect,
  arch,
}: {
  code: string;
  status: ToothDisplayStatus;
  isSelected: boolean;
  onSelect: (code: string) => void;
  arch: 'upper' | 'lower';
}) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.healthy;
  return (
    <button
      type="button"
      title={code}
      onClick={() => onSelect(code)}
      className={`relative w-full aspect-[4/5] min-h-[1.75rem] max-h-11 text-[9px] sm:text-[10px] font-semibold transition-all border cursor-pointer ${
        arch === 'upper' ? 'rounded-t-[14px] rounded-b-[6px]' : 'rounded-b-[14px] rounded-t-[6px]'
      } ${style} ${isSelected ? 'ring-2 ring-brand-navy ring-offset-1 z-10' : ''}`}
    >
      {toFaDigits(toothNumber(code))}
    </button>
  );
}

function Arch({
  codes,
  arch,
  selected,
  onToggle,
  mode,
  toothStatus,
  selectedTooth,
  onSelectTooth,
}: {
  codes: { right: string[]; left: string[] };
  arch: 'upper' | 'lower';
  selected?: string[];
  onToggle?: (code: string) => void;
  mode: 'edit' | 'display';
  toothStatus?: Record<string, ToothDisplayStatus>;
  selectedTooth?: string | null;
  onSelectTooth?: (code: string) => void;
}) {
  const all = [...codes.right, ...codes.left];
  const align = arch === 'upper' ? 'items-end' : 'items-start';
  const padKey = arch === 'upper' ? 'paddingTop' : 'paddingBottom';
  const leftHalf = all.slice(0, 8);
  const rightHalf = all.slice(8);

  return (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-0.5 sm:gap-x-1 w-full min-h-[4rem] ${
        arch === 'upper' ? 'items-end' : 'items-start'
      }`}
    >
      <div className={`grid grid-cols-8 gap-0.5 sm:gap-1 min-w-0 ${align}`}>
        {leftHalf.map((code, i) => (
          <div key={code} className="min-w-0" style={{ [padKey]: archLift(i, 16) }}>
            {mode === 'edit' ? (
              <ToothButton
                code={code}
                selected={selected!.includes(code)}
                onToggle={onToggle!}
                arch={arch}
              />
            ) : (
              <DisplayToothButton
                code={code}
                status={toothStatus?.[code] ?? 'healthy'}
                isSelected={selectedTooth === code}
                onSelect={onSelectTooth!}
                arch={arch}
              />
            )}
          </div>
        ))}
      </div>
      <div className="w-px self-stretch bg-slate-200 mx-0.5 shrink-0" />
      <div className={`grid grid-cols-8 gap-0.5 sm:gap-1 min-w-0 ${align}`}>
        {rightHalf.map((code, i) => (
          <div key={code} className="min-w-0" style={{ [padKey]: archLift(i + 8, 16) }}>
            {mode === 'edit' ? (
              <ToothButton
                code={code}
                selected={selected!.includes(code)}
                onToggle={onToggle!}
                arch={arch}
              />
            ) : (
              <DisplayToothButton
                code={code}
                status={toothStatus?.[code] ?? 'healthy'}
                isSelected={selectedTooth === code}
                onSelect={onSelectTooth!}
                arch={arch}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartShell({
  children,
  legend,
}: {
  children: React.ReactNode;
  legend?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-100 p-3 sm:p-5 overflow-hidden">
      <p className="text-[11px] text-slate-400 text-center mb-3">
        نمای روبه‌روی بیمار · راست بیمار سمت چپ نمودار
      </p>
      <div dir="ltr" className="select-none w-full max-w-xl mx-auto">
        <div className="flex justify-between text-[10px] tracking-wide text-slate-400 px-1 mb-1">
          <span>راست</span>
          <span>فک بالا</span>
          <span>چپ</span>
        </div>
        {children}
        <div className="flex justify-between text-[10px] tracking-wide text-slate-400 px-1 mt-1">
          <span>راست</span>
          <span>فک پایین</span>
          <span>چپ</span>
        </div>
      </div>
      {legend}
    </div>
  );
}

export function DentalChart({ selected, onToggle }: DentalChartProps) {
  return (
    <ChartShell
      legend={
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3.5 h-4 rounded-t-md bg-white border border-slate-200" />
            انتخاب‌نشده
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3.5 h-4 rounded-t-md bg-sage-500" />
            درگیر
          </span>
        </div>
      }
    >
      <Arch codes={UPPER} arch="upper" selected={selected} onToggle={onToggle} mode="edit" />
      <div className="my-3 flex items-center gap-2">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-[10px] text-slate-400">خط وسط</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      <Arch codes={LOWER} arch="lower" selected={selected} onToggle={onToggle} mode="edit" />
    </ChartShell>
  );
}

interface DentalChartDisplayProps {
  toothStatus: Record<string, ToothDisplayStatus>;
  selectedTooth: string | null;
  onSelectTooth: (code: string) => void;
}

export function DentalChartDisplay({
  toothStatus,
  selectedTooth,
  onSelectTooth,
}: DentalChartDisplayProps) {
  return (
    <ChartShell>
      <Arch
        codes={UPPER}
        arch="upper"
        mode="display"
        toothStatus={toothStatus}
        selectedTooth={selectedTooth}
        onSelectTooth={onSelectTooth}
      />
      <div className="my-3 flex items-center gap-2">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-[10px] text-slate-400">خط وسط</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      <Arch
        codes={LOWER}
        arch="lower"
        mode="display"
        toothStatus={toothStatus}
        selectedTooth={selectedTooth}
        onSelectTooth={onSelectTooth}
      />
    </ChartShell>
  );
}
