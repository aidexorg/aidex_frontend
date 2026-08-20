import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search,
  Users,
  CreditCard,
  Stethoscope,
  X,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
} from 'lucide-react';
import { useData } from '@/data';
import { formatPrice } from '@/lib/format';
import type { Profile, Action, Payment, Appointment } from '@/types';

// ── Types ──

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSelectProfile: (profile: Profile) => void;
  onSelectPayment?: (payment: Payment) => void;
}

type ResultType = 'profile' | 'action' | 'payment' | 'appointment';

interface SearchResult {
  type: ResultType;
  id: string;
  title: string;
  subtitle: string;
  profile?: Profile;
  action?: Action;
  payment?: Payment;
  appointment?: Appointment;
}

// ── Helpers ──

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[0-9]/g, (d) => d);
}

function matchesQuery(text: string, query: string): boolean {
  if (!query) return true;
  const normalized = normalize(text);
  const normalizedQuery = normalize(query);
  return normalized.includes(normalizedQuery);
}

// ── Component ──

export function CommandPalette({
  open,
  onClose,
  onSelectProfile,
  onSelectPayment,
}: CommandPaletteProps) {
  const data = useData();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── Load data and search ──

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const [profiles, actions, payments, appointments] = await Promise.all([
        data.listProfiles(),
        data.listActions(),
        data.listPayments(),
        data.listAppointments(),
      ]);

      // Build profile map for action/payment context
      const profileMap = new Map(profiles.map((p) => [p.id, p]));

      // Build session → profile map for actions
      const sessions = await data.listSessions();
      const sessionMap = new Map(sessions.map((s) => [s.id, s.period_id]));
      const periods = await data.listPeriods();
      const periodMap = new Map(periods.map((p) => [p.id, p.profile_id]));

      const allResults: SearchResult[] = [];

      // Search profiles
      for (const profile of profiles) {
        const searchText = [
          profile.first_name,
          profile.last_name,
          profile.file_number ?? '',
          profile.phone ?? '',
          profile.national_id ?? '',
        ].join(' ');
        if (matchesQuery(searchText, q)) {
          allResults.push({
            type: 'profile',
            id: profile.id,
            title: `${profile.first_name} ${profile.last_name}`,
            subtitle: [
              profile.file_number ? `پرونده: ${profile.file_number}` : '',
              profile.phone ?? '',
            ]
              .filter(Boolean)
              .join(' · '),
            profile,
          });
        }
      }

      // Search actions
      for (const action of actions) {
        const searchText = [action.title, action.description ?? ''].join(' ');
        if (matchesQuery(searchText, q)) {
          // Find parent profile
          const part = await data.listParts([action.part_id]);
          const parentPart = part[0];
          let profileName = '';
          if (parentPart) {
            const sessionsForPart = await data.listSessions([parentPart.session_id]);
            const parentSession = sessionsForPart[0];
            if (parentSession) {
              const periodId = sessionMap.get(parentSession.period_id);
              const profileId = periodId ? periodMap.get(periodId) : undefined;
              const parentProfile = profileId ? profileMap.get(profileId) : undefined;
              profileName = parentProfile
                ? `${parentProfile.first_name} ${parentProfile.last_name}`
                : '';
            }
          }
          allResults.push({
            type: 'action',
            id: action.id,
            title: action.title,
            subtitle: profileName,
            action,
          });
        }
      }

      // Search payments
      for (const payment of payments) {
        const searchText = [
          payment.tracking_code ?? '',
          String(payment.amount),
          payment.description ?? '',
        ].join(' ');
        if (matchesQuery(searchText, q)) {
          const periodId = periodMap.get(payment.period_id);
          const profile = periodId ? profileMap.get(periodId) : undefined;
          allResults.push({
            type: 'payment',
            id: payment.id,
            title: payment.tracking_code ?? `پرداخت ${formatPrice(payment.amount)}`,
            subtitle: profile
              ? `${profile.first_name} ${profile.last_name} · ${formatPrice(payment.amount)}`
              : formatPrice(payment.amount),
            payment,
            profile,
          });
        }
      }

      // Search appointments
      for (const appt of appointments) {
        const profile = profileMap.get(appt.profile_id);
        const searchText = [
          profile ? `${profile.first_name} ${profile.last_name}` : '',
          appt.notes ?? '',
          appt.type,
        ].join(' ');
        if (matchesQuery(searchText, q)) {
          allResults.push({
            type: 'appointment',
            id: appt.id,
            title: profile
              ? `${profile.first_name} ${profile.last_name}`
              : 'نوبت',
            subtitle: `${appt.type} · ${new Date(appt.start_time).toLocaleDateString('fa-IR')}`,
            appointment: appt,
            profile,
          });
        }
      }

      setResults(allResults.slice(0, 20)); // Limit to 20 results
      setSelectedIndex(0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [data]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, open, search]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // ── Keyboard navigation ──

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected) {
          handleSelect(selected);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [results, selectedIndex, onClose]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex] as HTMLElement;
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // ── Select handler ──

  const handleSelect = (result: SearchResult) => {
    if (result.type === 'profile' && result.profile) {
      onSelectProfile(result.profile);
    } else if (result.type === 'payment' && result.profile) {
      onSelectProfile(result.profile);
      onSelectPayment?.(result.payment!);
    } else if (result.profile) {
      onSelectProfile(result.profile);
    }
    onClose();
  };

  // ── Render ──

  if (!open) return null;

  const groupedResults = useMemo(() => {
    const groups: { type: ResultType; label: string; icon: typeof Users; items: SearchResult[] }[] = [];
    const typeOrder: ResultType[] = ['profile', 'appointment', 'action', 'payment'];
    const typeLabels: Record<ResultType, string> = {
      profile: 'پرونده‌ها',
      appointment: 'نوبت‌ها',
      action: 'اقدامات',
      payment: 'پرداخت‌ها',
    };
    const typeIcons: Record<ResultType, typeof Users> = {
      profile: Users,
      appointment: Users,
      action: Stethoscope,
      payment: CreditCard,
    };

    for (const type of typeOrder) {
      const items = results.filter((r) => r.type === type);
      if (items.length > 0) {
        groups.push({
          type,
          label: typeLabels[type],
          icon: typeIcons[type],
          items,
        });
      }
    }
    return groups;
  }, [results]);

  let globalIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Palette */}
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="جستجوی پرونده، نوبت، اقدام، پرداخت..."
            className="flex-1 text-sm text-slate-800 placeholder:text-slate-400 outline-none bg-transparent"
            dir="rtl"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[300px] overflow-y-auto overscroll-contain"
        >
          {loading && query.length >= 2 ? (
            <div className="p-6 text-center text-sm text-slate-400">
              در حال جستجو...
            </div>
          ) : results.length === 0 && query.length >= 2 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-slate-500">نتیجه‌ای یافت نشد</p>
              <p className="text-xs text-slate-400 mt-1">
                عبارت دیگری امتحان کنید
              </p>
            </div>
          ) : query.length < 2 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-slate-500">
                حداقل ۲ حرف تایپ کنید
              </p>
              <div className="flex items-center justify-center gap-2 mt-2 text-xs text-slate-400">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">
                  Ctrl
                </kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">
                  K
                </kbd>
              </div>
            </div>
          ) : (
            groupedResults.map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.type}>
                  {/* Group header */}
                  <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
                    <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                      <Icon size={12} />
                      {group.label}
                    </span>
                  </div>
                  {/* Items */}
                  {group.items.map((item) => {
                    const currentIndex = globalIndex++;
                    const isSelected = currentIndex === selectedIndex;
                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        className={`w-full text-right px-4 py-3 flex items-center gap-3 transition-colors ${
                          isSelected
                            ? 'bg-teal-50 text-teal-900'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {/* Type icon */}
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-teal-100 text-teal-600'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Icon size={14} />
                        </div>
                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.title}
                          </p>
                          {item.subtitle && (
                            <p className="text-xs text-slate-400 truncate">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                        {/* Keyboard hint */}
                        {isSelected && (
                          <CornerDownLeft
                            size={14}
                            className="text-teal-400 shrink-0"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-4 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <ArrowUp size={10} />
            <ArrowDown size={10} />
            ناوبری
          </span>
          <span className="flex items-center gap-1">
            <CornerDownLeft size={10} />
            انتخاب
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-slate-200 text-slate-500 font-mono">
              Esc
            </kbd>
            بستن
          </span>
        </div>
      </div>
    </div>
  );
}
