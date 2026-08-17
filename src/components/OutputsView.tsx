import { useState, useEffect, useCallback } from 'react';
import { FileText, Copy, Check, User, ClipboardList } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice, formatDate, toFaDigits } from '@/lib/format';
import type { Profile, Period, Session, Part, Action, Payment } from '@/types';
import { LoadingState, EmptyState } from './ui';

interface OutputsViewProps {
  onOpenProfile: (profile: Profile) => void;
}

type OutputType = 'profile' | 'review';

export function OutputsView({ onOpenProfile }: OutputsViewProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [outputType, setOutputType] = useState<OutputType>('profile');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProfiles((data ?? []) as Profile[]);
      if (data && data.length > 0 && !selectedId) setSelectedId(data[0].id);
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const generate = useCallback(async () => {
    if (!selectedId) return;
    setGenerating(true);
    setCopied(false);
    try {
      const profile = profiles.find((p) => p.id === selectedId);
      if (!profile) return;

      const [perRes] = await Promise.all([
        supabase.from('periods').select('*').eq('profile_id', selectedId).order('created_at'),
      ]);
      if (perRes.error) throw perRes.error;
      const periods = (perRes.data ?? []) as Period[];

      // Gather sessions, parts, actions, payments across all periods
      let sessions: Session[] = [];
      let parts: Part[] = [];
      let actions: Action[] = [];
      let payments: Payment[] = [];

      if (periods.length > 0) {
        const periodIds = periods.map((p) => p.id);
        const sRes = await supabase
          .from('sessions')
          .select('*')
          .in('period_id', periodIds)
          .order('session_number');
        if (sRes.error) throw sRes.error;
        sessions = (sRes.data ?? []) as Session[];

        if (sessions.length > 0) {
          const sessionIds = sessions.map((s) => s.id);
          const pRes2 = await supabase
            .from('parts')
            .select('*')
            .in('session_id', sessionIds)
            .order('part_number');
          if (pRes2.error) throw pRes2.error;
          parts = (pRes2.data ?? []) as Part[];

          if (parts.length > 0) {
            const partIds = parts.map((p) => p.id);
            const aRes = await supabase
              .from('actions')
              .select('*')
              .in('part_id', partIds)
              .order('created_at');
            if (aRes.error) throw aRes.error;
            actions = (aRes.data ?? []) as Action[];
          }
        }

        const payRes = await supabase
          .from('payments')
          .select('*')
          .in('period_id', periodIds)
          .order('payment_date');
        if (payRes.error) throw payRes.error;
        payments = (payRes.data ?? []) as Payment[];
      }

      const lines: string[] = [];
      const divider = '━━━━━━━━━━━━━━━━━━━━━━━━';

      if (outputType === 'profile') {
        lines.push(divider);
        lines.push('پرونده بیمار');
        lines.push(divider);
        lines.push(`نام: ${profile.first_name} ${profile.last_name}`);
        if (profile.file_number) lines.push(`شماره پرونده: ${toFaDigits(profile.file_number)}`);
        if (profile.birth_year) lines.push(`سال تولد: ${toFaDigits(profile.birth_year)}`);
        if (profile.national_id) lines.push(`کد ملی: ${toFaDigits(profile.national_id)}`);
        if (profile.phone) lines.push(`تلفن: ${toFaDigits(profile.phone)}`);
        if (profile.address) lines.push(`نشانی: ${profile.address}`);
        if (profile.file_description) lines.push(`شرح پرونده: ${profile.file_description}`);
        if (profile.clinical_notes) lines.push(`یادداشت بالینی: ${profile.clinical_notes}`);
        lines.push('');
        lines.push(`تعداد دوره‌های درمان: ${toFaDigits(periods.length)}`);
        lines.push(`تعداد جلسات: ${toFaDigits(sessions.length)}`);
        lines.push(`تعداد اقدامات: ${toFaDigits(actions.length)}`);
        const totalBilled = actions.reduce((s, a) => s + (a.price - a.discount), 0);
        const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
        lines.push(`کل هزینه: ${formatPrice(totalBilled)}`);
        lines.push(`کل پرداخت: ${formatPrice(totalPaid)}`);
        lines.push(`باقی‌مانده: ${formatPrice(totalBilled - totalPaid)}`);
      } else {
        // Review output — full treatment history
        lines.push(divider);
        lines.push(`مرور درمان: ${profile.first_name} ${profile.last_name}`);
        lines.push(divider);
        if (profile.file_number) lines.push(`شماره پرونده: ${toFaDigits(profile.file_number)}`);
        lines.push('');

        periods.forEach((period, idx) => {
          lines.push(`■ دوره درمان ${toFaDigits(idx + 1)}`);
          if (period.teeth.length > 0)
            lines.push(`  دندان‌ها: ${period.teeth.join('، ')}`);
          if (period.areas.length > 0) {
            const areaLabels = period.areas.map((a) =>
              a === 'LJ' ? 'فک پایین' : a === 'UJ' ? 'فک بالا' : 'کل دهان'
            );
            lines.push(`  نواحی: ${areaLabels.join('، ')}`);
          }
          const periodSess = sessions.filter((s) => s.period_id === period.id);
          periodSess.forEach((session) => {
            lines.push(
              `  ▸ جلسه ${toFaDigits(session.session_number)} — ${formatDate(session.session_date)}`
            );
            const sessParts = parts.filter((p) => p.session_id === session.id);
            sessParts.forEach((part) => {
              const loc = [part.tooth && `دندان ${part.tooth}`, part.area].filter(Boolean).join(' · ');
              lines.push(`    • بخش ${toFaDigits(part.part_number)}${loc ? ` (${loc})` : ''}`);
              const partActions = actions.filter((a) => a.part_id === part.id);
              partActions.forEach((action) => {
                const status =
                  action.status === 'complete' ? 'کامل' : `ناقص${action.incomplete_reason ? ` — ${action.incomplete_reason}` : ''}`;
                lines.push(
                  `      - ${action.title}: ${formatPrice(action.price - action.discount)} [${status}]${action.needs_followup ? ' (نیازمند پیگیری)' : ''}`
                );
              });
            });
          });
          const periodPays = payments.filter((p) => p.period_id === period.id);
          if (periodPays.length > 0) {
            lines.push('  پرداخت‌ها:');
            periodPays.forEach((pay) => {
              lines.push(
                `    ${formatPrice(pay.amount)} — ${formatDate(pay.payment_date)}${pay.tracking_code ? ` (کد: ${toFaDigits(pay.tracking_code)})` : ''}`
              );
            });
          }
          const billed = actions
            .filter((a) => {
              const part = parts.find((p) => p.id === a.part_id);
              const sess = part && sessions.find((s) => s.id === part.session_id);
              return sess && sess.period_id === period.id;
            })
            .reduce((s, a) => s + (a.price - a.discount), 0);
          const paid = periodPays.reduce((s, p) => s + p.amount, 0);
          lines.push(`  خلاصه مالی: هزینه ${formatPrice(billed)} | پرداخت ${formatPrice(paid)} | باقی‌مانده ${formatPrice(billed - paid)}`);
          lines.push('');
        });
      }

      setText(lines.join('\n'));
    } catch {
      setText('خطا در تولید خروجی.');
    } finally {
      setGenerating(false);
    }
  }, [selectedId, outputType, profiles]);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">خروجی قالب</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          تولید متن آماده‌ی پرونده یا مرور درمان برای کپی و استفاده
        </p>
      </div>

      {profiles.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<FileText size={48} />}
            title="پرونده‌ای وجود ندارد"
            description="ابتدا یک پرونده بیمار ایجاد کنید."
          />
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="card p-4 space-y-4">
            <div>
              <label className="label">انتخاب بیمار</label>
              <select
                className="input"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                    {p.file_number ? ` — پرونده ${toFaDigits(p.file_number)}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">نوع خروجی</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setOutputType('profile')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition ${
                    outputType === 'profile'
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <User size={16} />
                  پرونده بیمار
                </button>
                <button
                  onClick={() => setOutputType('review')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition ${
                    outputType === 'review'
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <ClipboardList size={16} />
                  مرور درمان
                </button>
              </div>
            </div>
            <button onClick={generate} disabled={generating} className="btn-primary w-full">
              {generating ? 'در حال تولید…' : 'تولید خروجی'}
            </button>
          </div>

          {/* Output */}
          {text && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-700">متن خروجی</span>
                <button onClick={copyText} className="btn-secondary text-xs">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'کپی شد' : 'کپی'}
                </button>
              </div>
              <pre className="p-4 text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed max-h-[60vh] overflow-y-auto">
                {text}
              </pre>
            </div>
          )}

          {selectedId && (
            <button
              onClick={() => {
                const p = profiles.find((x) => x.id === selectedId);
                if (p) onOpenProfile(p);
              }}
              className="text-sm text-teal-600 hover:underline"
            >
              باز کردن پرونده کامل ←
            </button>
          )}
        </>
      )}
    </div>
  );
}
