import { useMemo } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  History,
  Wallet,
} from 'lucide-react';
import { formatDate, formatPrice, toFaDigits } from '@/lib/format';
import {
  buildTreatmentTimeline,
  timelineCalendarDay,
  type TreatmentTimelineItem,
} from '@/lib/treatmentTimeline';
import { AREA_OPTIONS } from '@/types';
import type { Action, Part, Payment, Period, Session } from '@/types';

interface TreatmentTimelineProps {
  periods: Period[];
  sessions: Session[];
  parts: Part[];
  actions: Action[];
  payments: Payment[];
}

function areaLabel(code: string): string {
  return AREA_OPTIONS.find((option) => option.value === code)?.label ?? code;
}

function PeriodContext({ item }: { item: TreatmentTimelineItem }) {
  const locations = [
    ...item.period.teeth.map((tooth) => `دندان ${toFaDigits(tooth)}`),
    ...item.period.areas.map(areaLabel),
  ];

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
      <span className="font-medium text-slate-600">
        دوره درمان {toFaDigits(item.periodNumber)}
      </span>
      {locations.map((location) => (
        <span
          key={location}
          className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5"
        >
          {location}
        </span>
      ))}
    </div>
  );
}

function TimelineMarker({ item }: { item: TreatmentTimelineItem }) {
  if (item.kind === 'session') {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-sky-100 text-sky-700">
        <CalendarDays size={16} aria-hidden="true" />
      </span>
    );
  }

  if (item.kind === 'payment') {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-emerald-100 text-emerald-700">
        <Wallet size={16} aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      className={`flex h-9 w-9 items-center justify-center rounded-full border-4 border-white ${
        item.action.status === 'complete'
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-amber-100 text-amber-700'
      }`}
    >
      {item.action.status === 'complete' ? (
        <CheckCircle2 size={16} aria-hidden="true" />
      ) : (
        <Clock size={16} aria-hidden="true" />
      )}
    </span>
  );
}

function TimelineCard({ item }: { item: TreatmentTimelineItem }) {
  if (item.kind === 'session') {
    return (
      <article className="rounded-xl border border-sky-100 bg-sky-50/40 p-4">
        <p className="text-xs font-medium text-sky-700">نقطه عطف جلسه</p>
        <h5 className="mt-1 font-semibold text-slate-800">
          جلسه {toFaDigits(item.session.session_number)}
        </h5>
        <PeriodContext item={item} />
      </article>
    );
  }

  if (item.kind === 'payment') {
    return (
      <article className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
        <p className="text-xs font-medium text-emerald-700">پرداخت</p>
        <h5 className="mt-1 font-semibold text-slate-800">
          {formatPrice(item.payment.amount)}
        </h5>
        {item.payment.tracking_code && (
          <p className="mt-1 text-xs text-slate-500">
            کد پیگیری: {toFaDigits(item.payment.tracking_code)}
          </p>
        )}
        <PeriodContext item={item} />
      </article>
    );
  }

  const partLocation = [
    item.part.tooth ? `دندان ${toFaDigits(item.part.tooth)}` : null,
    item.part.area ? areaLabel(item.part.area) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const completed = item.action.status === 'complete';

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-slate-500">اقدام درمانی</p>
          <h5 className="mt-1 font-semibold text-slate-800">{item.action.title}</h5>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              completed
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {completed ? 'انجام‌شده' : 'ناتمام'}
          </span>
          {item.action.needs_followup && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
              <AlertCircle size={12} aria-hidden="true" />
              نیازمند پیگیری
            </span>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        جلسه {toFaDigits(item.session.session_number)}
        {' · '}
        بخش {toFaDigits(item.part.part_number)}
        {partLocation && ` · ${partLocation}`}
      </p>
      <PeriodContext item={item} />
    </article>
  );
}

export function TreatmentTimeline({
  periods,
  sessions,
  parts,
  actions,
  payments,
}: TreatmentTimelineProps) {
  const items = useMemo(
    () => buildTreatmentTimeline({ periods, sessions, parts, actions, payments }),
    [periods, sessions, parts, actions, payments]
  );
  const groups = useMemo(() => {
    const grouped = new Map<string, TreatmentTimelineItem[]>();
    for (const item of items) {
      const day = timelineCalendarDay(item);
      const existing = grouped.get(day);
      if (existing) existing.push(item);
      else grouped.set(day, [item]);
    }
    return [...grouped.entries()];
  }, [items]);

  if (items.length === 0) {
    return (
      <div
        id="treatment-timeline-panel"
        className="card p-8 text-center"
        role="region"
        aria-label="تایم‌لاین درمان"
      >
        <History size={42} className="mx-auto text-slate-300" aria-hidden="true" />
        <h3 className="mt-3 font-semibold text-slate-700">رویداد درمانی ثبت نشده</h3>
        <p className="mt-1 text-sm text-slate-400">
          پس از ثبت جلسه، اقدام یا پرداخت، روند درمان در اینجا نمایش داده می‌شود.
        </p>
      </div>
    );
  }

  return (
    <section
      id="treatment-timeline-panel"
      className="card overflow-hidden"
      aria-labelledby="treatment-timeline-title"
    >
      <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3">
        <h3 id="treatment-timeline-title" className="text-sm font-semibold text-slate-700">
          تایم‌لاین درمان
        </h3>
        <p className="mt-0.5 text-xs text-slate-400">
          نمایش زمانی جلسات، اقدامات و پرداخت‌ها از قدیمی به جدید
        </p>
      </div>
      <div className="max-h-[min(70vh,calc(100dvh-14rem))] overflow-y-auto overscroll-contain p-4 sm:p-5">
        <div className="space-y-7">
          {groups.map(([day, dayItems]) => (
            <section key={day} aria-labelledby={`timeline-day-${day}`}>
              <h4
                id={`timeline-day-${day}`}
                className="mb-3 text-sm font-semibold text-brand-navy"
              >
                {formatDate(day)}
              </h4>
              <ol className="relative mr-4 space-y-4 border-r-2 border-slate-200">
                {dayItems.map((item) => (
                  <li key={item.id} className="relative pr-8">
                    <span className="absolute -right-[19px] top-2" aria-hidden="true">
                      <TimelineMarker item={item} />
                    </span>
                    <TimelineCard item={item} />
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
