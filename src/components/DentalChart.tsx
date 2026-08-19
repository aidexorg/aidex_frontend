import { TOOTH_NUMBERS } from '@/types';
import { toFaDigits } from '@/lib/format';

const NUMS = [...TOOTH_NUMBERS];

/** Facing-patient odontogram: viewer's left = patient's right. Codes stay UR/UL/LR/LL. */
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
      onClick={() => onToggle(code)}
      className={`relative shrink-0 w-8 h-10 sm:w-9 sm:h-11 text-[10px] sm:text-[11px] font-semibold transition-all duration-150 border ${
        arch === 'upper'
          ? 'rounded-t-[14px] rounded-b-[6px]'
          : 'rounded-b-[14px] rounded-t-[6px]'
      } ${
        selected
          ? 'bg-teal-500 text-white border-teal-400 shadow-[0_0_14px_rgba(20,184,166,0.4)] scale-[1.04]'
          : 'bg-white text-slate-500 border-slate-200 hover:border-teal-300 hover:text-teal-700'
      }`}
    >
      <span
        className={`absolute left-1/2 -translate-x-1/2 w-3.5 h-1.5 rounded-full ${
          selected ? 'bg-white/30' : 'bg-slate-200'
        } ${arch === 'upper' ? 'top-1' : 'bottom-1'}`}
      />
      {toFaDigits(toothNumber(code))}
    </button>
  );
}

function Arch({
  codes,
  arch,
  selected,
  onToggle,
}: {
  codes: { right: string[]; left: string[] };
  arch: 'upper' | 'lower';
  selected: string[];
  onToggle: (code: string) => void;
}) {
  const all = [...codes.right, ...codes.left];
  const align = arch === 'upper' ? 'items-end' : 'items-start';
  const padKey = arch === 'upper' ? 'paddingTop' : 'paddingBottom';

  return (
    <div className={`flex ${align} justify-center gap-1 min-h-[4.25rem]`}>
      {all.map((code, i) => (
        <div key={code} className="contents">
          {i === 8 && <div className="w-px self-stretch bg-slate-200 mx-1 my-1" />}
          <div style={{ [padKey]: archLift(i, 16) }}>
            <ToothButton
              code={code}
              selected={selected.includes(code)}
              onToggle={onToggle}
              arch={arch}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DentalChart({ selected, onToggle }: DentalChartProps) {
  return (
    <div className="rounded-[1.25rem] bg-gradient-to-b from-slate-50 to-white border border-slate-100 p-4 sm:p-5">
      <p className="text-[11px] text-slate-400 text-center mb-3">
        نمای روبه‌روی بیمار · راست بیمار سمت چپ نمودار
      </p>

      <div dir="ltr" className="select-none">
        <div className="flex justify-between text-[10px] tracking-wide text-slate-400 px-1 mb-1">
          <span>راست</span>
          <span>فک بالا</span>
          <span>چپ</span>
        </div>

        <Arch codes={UPPER} arch="upper" selected={selected} onToggle={onToggle} />

        <div className="my-3 flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[10px] text-slate-400">خط وسط</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <Arch codes={LOWER} arch="lower" selected={selected} onToggle={onToggle} />

        <div className="flex justify-between text-[10px] tracking-wide text-slate-400 px-1 mt-1">
          <span>راست</span>
          <span>فک پایین</span>
          <span>چپ</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-4 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3.5 h-4 rounded-t-md bg-white border border-slate-200" />
          انتخاب‌نشده
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3.5 h-4 rounded-t-md bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.45)]" />
          درگیر
        </span>
      </div>
    </div>
  );
}
