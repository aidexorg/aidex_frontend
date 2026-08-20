import { useState, useEffect, useCallback } from 'react';
import { FileText, Copy, Check, User, ClipboardList } from 'lucide-react';
import { useData } from '@/data';
import { formatPrice, formatDate, toFaDigits } from '@/lib/format';
import type { Profile, Period, Session, Part, Action, Payment } from '@/types';
import { LoadingState, EmptyState } from './ui';

// --- Template helpers (text.txt §2_3_1) ---

const SUP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '/': '·', '.': '·',
};
const toSuperscript = (s: string) => s.split('').map((c) => SUP[c] ?? c).join('');

const toPersianDigits = (s: string) =>
  s.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);

/** Convert action title to template short form per text.txt §2_3_1 */
function toTemplateShortForm(title: string): string {
  const endo = title.match(/^Endo\.([1-6])-Canal$/);
  if (endo) return `Endo.${endo[1]}-Canal`;
  const reEndo = title.match(/^reEndo\.([1-6])-Canal$/);
  if (reEndo) return `reEndo.${reEndo[1]}-Can`;
  const aml = title.match(/^Aml\.Filling for Class ([1-6])$/);
  if (aml) return `Aml.FillingCl${toSuperscript(aml[1])}`;
  const com = title.match(/^Com\.Filling for Class ([1-6])$/);
  if (com) return `Com.FillingCl${toSuperscript(com[1])}`;
  const crownPFM = title.match(/^Crown PFM(.+)?$/);
  if (crownPFM) return `Crown.PFM${crownPFM[1] ? toSuperscript(crownPFM[1]) : ''}`;
  const crownPFZ = title.match(/^Crown PFZ(.+)?$/);
  if (crownPFZ) return `Crown.Zrcn${crownPFZ[1] ? toSuperscript(crownPFZ[1]) : ''}`;
  if (title === 'Manual SRP') return 'SRP.ManTool';
  if (title === 'Ultrsonic SRP') return 'SRP.Ultrsonic';
  if (title === 'Prophylaxis Polish') return 'Prophy.Polish';
  if (title === 'Fluoride therapy') return 'Prophy.Fluor';
  if (title === 'CL.SoftTissue') return 'CL.SoftTissu';
  if (title === 'CL.hardTissue') return 'CL.hardTissu';
  if (title === 'EXT.SurgicalSoftTissue' || title === 'EXT.SurgicalHardTissue') return 'EXT.Surgical';
  if (title === 'EXT.NonSurgical') return 'EXT.NonSurg';
  const postCrco = title.match(/^PostCore \(crco\)(.+)?$/);
  if (postCrco) return `PostCoreᶜʳᶜᵒ`;
  const postNpg = title.match(/^PostCore \(npg\)(.+)?$/);
  if (postNpg) return `PostCoreᴺᴾᴳ`;
  return title;
}

/** Ordinal suffix for treatment course */
function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/** Format date as superscript: ¹²·¹¹·¹۴۰۴ */
function toSuperscriptDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${toSuperscript(String(day))}·${toSuperscript(String(month))}·${toSuperscript(String(year))}`;
}

/** Tooth position label: UR→Upper Right, etc. */
function toothPositionLabel(tooth: string): string {
  const pos = tooth.slice(0, 2);
  const labels: Record<string, string> = {
    UR: 'Upper Right', UL: 'Upper Left',
    LR: 'Lower Right', LL: 'Lower Left',
  };
  return labels[pos] ?? pos;
}

interface OutputsViewProps {
  onOpenProfile: (profile: Profile) => void;
}

type OutputType = 'profile' | 'review';

export function OutputsView({ onOpenProfile }: OutputsViewProps) {
  const data = useData();
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
      const rows = await data.listProfiles();
      setProfiles(rows);
      if (rows.length > 0 && !selectedId) setSelectedId(rows[0].id);
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [selectedId, data]);

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

      const periods = await data.listPeriods(selectedId);

      let sessions: Session[] = [];
      let parts: Part[] = [];
      let actions: Action[] = [];
      let payments: Payment[] = [];

      if (periods.length > 0) {
        const periodIds = periods.map((p) => p.id);
        sessions = await data.listSessions(periodIds);

        if (sessions.length > 0) {
          const sessionIds = sessions.map((s) => s.id);
          parts = await data.listParts(sessionIds);

          if (parts.length > 0) {
            const partIds = parts.map((p) => p.id);
            actions = await data.listActions(partIds);
          }
        }

        payments = await data.listPayments(periodIds);
      }

      const lines: string[] = [];
      const divider = '━━━━━━━━━━━━━━━━━━━━━━━━';

      if (outputType === 'profile') {
        // === Profile output per text.txt §2_3_1 ===
        // Header
        lines.push('**〇** 𝗣𝗿𝗼𝗳𝗶𝗹𝗲');
        lines.push(`🅘#**${profile.file_number ? `No${profile.file_number}` : 'No???'}**`);
        lines.push(`🅝#**${profile.first_name}_${profile.last_name}**`);
        if (profile.birth_year) lines.push(`**Ⓨ** ${toPersianDigits(profile.birth_year)}`);
        if (profile.phone) lines.push(`**Ⓣ** ${profile.phone}`);
        lines.push(`**Ⓐ** ${profile.address || 'خمینی‌شهر'}`);
        lines.push(`**Ⓗ** ${profile.clinical_notes || 'فاقد ملاحظات خاص پزشکی'}`);
        lines.push('');

        // Per period: Treatment Course
        periods.forEach((period, pIdx) => {
          const pSessions = sessions
            .filter((s) => s.period_id === period.id)
            .sort((a, b) => a.session_number - b.session_number);
          const periodActions = actions.filter((a) => {
            const part = parts.find((pp) => pp.id === a.part_id);
            const sess = part && sessions.find((s) => s.id === part.session_id);
            return sess && sess.period_id === period.id;
          });
          const periodPayments = payments.filter((p) => p.period_id === period.id);

          lines.push(`💠 「**${toFaDigits(pIdx + 1)}${ordinalSuffix(pIdx + 1)}** 𝗧𝗿𝗲𝗮𝘁𝗺𝗲𝗻𝘁 𝗖𝗼𝘂𝗿𝘀𝗲」`);
          lines.push('');

          // Group parts by tooth+area to group actions
          const partGroups = new Map<string, { tooth: string; area: string | null; actions: Action[] }>();
          const periodParts = parts.filter((p) => {
            const sess = sessions.find((s) => s.id === p.session_id);
            return sess && sess.period_id === period.id;
          });
          for (const part of periodParts) {
            const key = `${part.tooth || ''}|${part.area || ''}`;
            if (!partGroups.has(key)) {
              partGroups.set(key, { tooth: part.tooth || '', area: part.area || null, actions: [] });
            }
            const group = partGroups.get(key)!;
            group.actions.push(...actions.filter((a) => a.part_id === part.id));
          }

          // Tooth lines with actions
          for (const [, group] of partGroups) {
            const toothNum = group.tooth ? group.tooth.slice(2) : '?';
            const pos = group.tooth ? group.tooth.slice(0, 2) : '';
            const sessionCount = new Set(
              periodParts
                .filter((pp) => (pp.tooth === group.tooth && pp.area === group.area))
                .map((pp) => pp.session_id)
            ).size;
            const loc = group.area === 'LJ' ? 'LL' : group.area === 'UJ' ? 'UL' : pos;
            lines.push(`**❖ ${toothNum}|${loc}** |${toSuperscript(sessionCount > 1 ? `1-${sessionCount}` : String(sessionCount))}|`);
            for (const action of group.actions) {
              lines.push(`${action.price - action.discount ? (action.price - action.discount).toFixed(1) : '0.0'} ${toTemplateShortForm(action.title)}`);
            }
            lines.push('');
          }

          // Session lines
          for (const session of pSessions) {
            const sessPayments = periodPayments.filter((p) => {
              const sessDate = new Date(p.payment_date).toDateString();
              const sessionDate = new Date(session.session_date).toDateString();
              return sessDate === sessionDate;
            });
            const sessAmount = sessPayments.reduce((s, p) => s + p.amount, 0);
            lines.push(`① ${sessAmount.toFixed(1)} ${toSuperscriptDate(session.session_date)}`);
          }
          // Additional payments on different dates
          const sessionDates = new Set(pSessions.map((s) => new Date(s.session_date).toDateString()));
          const otherPayments = periodPayments.filter((p) => !sessionDates.has(new Date(p.payment_date).toDateString()));
          for (const pay of otherPayments) {
            lines.push(`② ${pay.amount.toFixed(1)} ${toSuperscriptDate(pay.payment_date)}`);
          }

          // Accounting line
          const totalBilled = periodActions.reduce((s, a) => s + a.price, 0);
          const totalDiscount = periodActions.reduce((s, a) => s + a.discount, 0);
          const totalPaid = periodPayments.reduce((s, p) => s + p.amount, 0);
          const balance = totalBilled - totalDiscount - totalPaid;
          lines.push('');
          lines.push(`🅣 **${totalBilled.toFixed(1)}** ➖ ${totalDiscount.toFixed(1)}ᵒᶠᶠ ➖ ${totalPaid.toFixed(1)}ᵖᵃʸ 🟰 **${balance.toFixed(1)}**`);
          lines.push('');
        });
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
  }, [selectedId, outputType, profiles, data]);

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
        <h1 className="page-title">خروجی قالب</h1>
        <p className="page-sub">
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
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition ${
                    outputType === 'profile'
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm shadow-teal-600/20'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <User size={16} />
                  پرونده بیمار
                </button>
                <button
                  onClick={() => setOutputType('review')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition ${
                    outputType === 'review'
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm shadow-teal-600/20'
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
