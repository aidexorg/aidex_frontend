import { type ReactNode } from 'react';

// ── Base skeleton primitives ──

export function SkeletonPulse({
  className = '',
  rounded = 'rounded',
  style,
}: {
  className?: string;
  rounded?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse ${rounded} ${className}`}
      style={style}
    />
  );
}

export function SkeletonText({
  lines = 1,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonPulse
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
          rounded="rounded"
        />
      ))}
    </div>
  );
}

export function SkeletonCircle({
  size = 40,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <SkeletonPulse
      className={className}
      rounded="rounded-full"
      style={{ width: size, height: size } as React.CSSProperties}
    />
  );
}

// ── Skeleton card wrapper ──

export function SkeletonCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card p-4 ${className}`}>
      {children}
    </div>
  );
}

// ── Profile list skeleton ──

export function SkeletonProfileList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i}>
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <SkeletonPulse className="w-10 h-10 shrink-0" rounded="rounded-xl" />
            {/* Content */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <SkeletonPulse className="h-4 w-32" />
                <SkeletonPulse className="h-5 w-16" rounded="rounded-full" />
              </div>
              <div className="flex items-center gap-3">
                <SkeletonPulse className="h-3 w-24" />
                <SkeletonPulse className="h-3 w-20" />
                <SkeletonPulse className="h-3 w-28" />
              </div>
            </div>
            {/* Actions */}
            <div className="flex gap-2">
              <SkeletonPulse className="w-8 h-8" rounded="rounded-lg" />
              <SkeletonPulse className="w-8 h-8" rounded="rounded-lg" />
            </div>
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

// ── Profile detail skeleton ──

export function SkeletonProfileDetail() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <SkeletonPulse className="w-16 h-16" rounded="rounded-2xl" />
        <div className="space-y-2">
          <SkeletonPulse className="h-6 w-48" />
          <SkeletonPulse className="h-4 w-32" />
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i}>
            <SkeletonPulse className="h-3 w-16 mb-2" />
            <SkeletonPulse className="h-5 w-24" />
          </SkeletonCard>
        ))}
      </div>

      {/* Periods */}
      <div className="space-y-3">
        <SkeletonPulse className="h-5 w-24" />
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex items-center gap-3">
              <SkeletonPulse className="w-8 h-8" rounded="rounded-lg" />
              <div className="flex-1 space-y-2">
                <SkeletonPulse className="h-4 w-32" />
                <SkeletonPulse className="h-3 w-48" />
              </div>
              <SkeletonPulse className="w-6 h-6" rounded="rounded-full" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

// ── Appointment list skeleton ──

export function SkeletonAppointmentList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i}>
          <div className="flex items-center gap-3">
            {/* Type icon */}
            <SkeletonPulse className="w-10 h-10 shrink-0" rounded="rounded-lg" />
            {/* Content */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <SkeletonPulse className="h-4 w-28" />
                <SkeletonPulse className="h-5 w-16" rounded="rounded-full" />
                <SkeletonPulse className="h-5 w-20" rounded="rounded-full" />
              </div>
              <div className="flex items-center gap-3">
                <SkeletonPulse className="h-3 w-32" />
                <SkeletonPulse className="h-3 w-16" />
              </div>
            </div>
            {/* Actions */}
            <div className="flex gap-2">
              <SkeletonPulse className="w-8 h-8" rounded="rounded-lg" />
              <SkeletonPulse className="w-8 h-8" rounded="rounded-lg" />
            </div>
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

// ── Payment list skeleton ──

export function SkeletonPaymentList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i}>
          <div className="flex items-center gap-3">
            {/* Icon */}
            <SkeletonPulse className="w-10 h-10 shrink-0" rounded="rounded-lg" />
            {/* Content */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <SkeletonPulse className="h-4 w-32" />
                <SkeletonPulse className="h-5 w-24" rounded="rounded-full" />
              </div>
              <div className="flex items-center gap-3">
                <SkeletonPulse className="h-3 w-28" />
                <SkeletonPulse className="h-3 w-20" />
              </div>
            </div>
            {/* Amount */}
            <SkeletonPulse className="h-5 w-24" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

// ── Calendar skeleton ──

export function SkeletonCalendar() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SkeletonPulse className="w-8 h-8" rounded="rounded-lg" />
          <SkeletonPulse className="h-5 w-32" />
          <SkeletonPulse className="w-8 h-8" rounded="rounded-lg" />
        </div>
        <SkeletonPulse className="h-8 w-16" rounded="rounded-lg" />
      </div>

      {/* Grid */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 gap-px bg-slate-100">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bg-white p-2">
              <SkeletonPulse className="h-4 w-8 mx-auto mb-2" />
            </div>
          ))}
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="bg-white p-2 min-h-[60px]">
              <SkeletonPulse className="h-3 w-6 mb-1" />
              {i % 3 === 0 && (
                <SkeletonPulse className="h-1.5 w-full rounded-full" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
