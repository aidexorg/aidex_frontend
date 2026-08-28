import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Check, ChevronLeft, ChevronRight, LocateFixed, X } from 'lucide-react';
import type { View } from './Layout';

const PREFERENCE_PREFIX = 'aidex.onboarding.v1';

type OnboardingOutcome = 'completed' | 'dismissed';

interface OnboardingStep {
  title: string;
  description: string;
  target: string;
  targetLabel: string;
  unavailableHint: string;
}

const STEPS: OnboardingStep[] = [
  {
    title: 'اولین پرونده بیمار را بسازید',
    description:
      'از فهرست پرونده‌ها، اطلاعات پایه بیمار را ثبت کنید تا مسیر درمان او آغاز شود.',
    target: '[data-onboarding-target="create-profile"]',
    targetLabel: 'نمایش دکمه پرونده جدید',
    unavailableHint: 'به فهرست پرونده‌ها بروید و «پرونده جدید» را انتخاب کنید.',
  },
  {
    title: 'یک دوره درمان اضافه کنید',
    description:
      'پرونده بیمار را باز کنید و دوره درمان را برای نگهداری جلسات و اقدامات بسازید.',
    target: '[data-onboarding-target="create-period"]',
    targetLabel: 'نمایش دکمه دوره جدید',
    unavailableHint: 'در فهرست پرونده‌ها، یک بیمار را باز کنید تا دکمه «دوره جدید» دیده شود.',
  },
  {
    title: 'اولین اقدام را ثبت کنید',
    description:
      'در اورویو درمانی، دوره و جلسه را باز کنید و زیر بخش مربوط، اقدام درمانی را ثبت کنید.',
    target: '[data-onboarding-target="create-action"]',
    targetLabel: 'نمایش دکمه اقدام',
    unavailableHint:
      'پرونده را باز کنید، به اورویو درمانی بروید و دوره، جلسه و بخش موردنظر را باز کنید.',
  },
];

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface OnboardingOverlayProps {
  accountId: string;
  currentView: View;
  onNavigate: (view: View) => void;
}

function preferenceKey(accountId: string): string {
  return `${PREFERENCE_PREFIX}:${accountId}`;
}

function hasPreference(accountId: string): boolean {
  try {
    const value = localStorage.getItem(preferenceKey(accountId));
    return value === 'completed' || value === 'dismissed';
  } catch {
    return false;
  }
}

function savePreference(accountId: string, outcome: OnboardingOutcome): void {
  try {
    localStorage.setItem(preferenceKey(accountId), outcome);
  } catch {
    // Storage may be unavailable in private/restricted browsing. Closing still
    // applies for the current mounted session.
  }
}

function visibleTarget(selector: string): HTMLElement | null {
  const elements = document.querySelectorAll<HTMLElement>(selector);
  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    if (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden'
    ) {
      return element;
    }
  }
  return null;
}

export function OnboardingOverlay({
  accountId,
  currentView,
  onNavigate,
}: OnboardingOverlayProps) {
  const [open, setOpen] = useState(() => !hasPreference(accountId));
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const step = STEPS[stepIndex];

  const updateTarget = useCallback(() => {
    const target = visibleTarget(step.target);
    if (!target) {
      setTargetRect((current) => (current === null ? current : null));
      return;
    }
    const rect = target.getBoundingClientRect();
    const next = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
    setTargetRect((current) =>
      current &&
      current.top === next.top &&
      current.left === next.left &&
      current.width === next.width &&
      current.height === next.height
        ? current
        : next
    );
  }, [step.target]);

  useEffect(() => {
    setStepIndex(0);
    setOpen(!hasPreference(accountId));
  }, [accountId]);

  useLayoutEffect(() => {
    if (!open) return;
    updateTarget();

    const observer = new MutationObserver(updateTarget);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    window.addEventListener('resize', updateTarget);
    window.addEventListener('scroll', updateTarget, true);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateTarget);
      window.removeEventListener('scroll', updateTarget, true);
    };
  }, [currentView, open, updateTarget]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.querySelector<HTMLElement>('button')?.focus();

    return () => {
      const previousFocus = previousFocusRef.current;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  const finish = useCallback(
    (outcome: OnboardingOutcome) => {
      savePreference(accountId, outcome);
      setOpen(false);
    },
    [accountId]
  );

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish('dismissed');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [finish, open]);

  const locateStepTarget = () => {
    const target = visibleTarget(step.target);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.focus({ preventScroll: true });
      updateTarget();
      return;
    }
    onNavigate('profiles');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none" dir="rtl">
      <div className="absolute inset-0 bg-slate-950/25" aria-hidden="true" />

      {targetRect && (
        <div
          className="fixed rounded-2xl border-2 border-sage-400 ring-4 ring-white/90 shadow-[0_0_0_9999px_rgb(15_23_42_/_0.08)] transition-all duration-200"
          style={{
            top: Math.max(6, targetRect.top - 6),
            left: Math.max(6, targetRect.left - 6),
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
          aria-hidden="true"
        />
      )}

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
        className="pointer-events-auto absolute inset-x-3 bottom-3 md:inset-x-auto md:right-8 md:bottom-8 md:w-[420px] card overflow-hidden animate-fade-in"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-medium text-sage-600">راهنمای شروع AIDEX</p>
            <p className="mt-0.5 text-xs text-slate-400">
              مرحله {stepIndex + 1} از {STEPS.length}
            </p>
          </div>
          <button
            type="button"
            onClick={() => finish('dismissed')}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="بستن و دیگر نمایش ندادن راهنما"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <div className="mb-5 flex gap-2" aria-label={`مرحله ${stepIndex + 1} از ${STEPS.length}`}>
            {STEPS.map((item, index) => (
              <span
                key={item.title}
                className={`h-1.5 flex-1 rounded-full ${
                  index <= stepIndex ? 'bg-sage-500' : 'bg-slate-100'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>

          <h2 id="onboarding-title" className="text-lg font-bold text-brand-navy">
            {step.title}
          </h2>
          <p id="onboarding-description" className="mt-2 text-sm leading-7 text-slate-500">
            {step.description}
          </p>

          <div className="mt-4 rounded-xl bg-sage-50 px-4 py-3 text-xs leading-6 text-sage-800">
            {targetRect ? 'محل این گزینه در صفحه مشخص شده است.' : step.unavailableHint}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={locateStepTarget}
              className="btn-secondary text-xs"
            >
              <LocateFixed size={15} />
              {targetRect
                ? step.targetLabel
                : 'رفتن به فهرست پرونده‌ها'}
            </button>

            <div className="flex-1" />

            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex((index) => index - 1)}
                className="btn-ghost px-3 text-xs"
              >
                <ChevronRight size={15} />
                قبلی
              </button>
            )}

            {stepIndex < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStepIndex((index) => index + 1)}
                className="btn-sage px-4 text-xs"
              >
                بعدی
                <ChevronLeft size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => finish('completed')}
                className="btn-sage px-4 text-xs"
              >
                <Check size={15} />
                پایان راهنما
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
