import { formatPrice, toFaDigits } from '@/lib/format';
import type { Profile, Period, Session, Part, Action, Payment } from '@/types';
import type { DataProvider } from '@/data/types';

const SUP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '/': '·', '.': '·',
};
const toSuperscript = (s: string) => s.split('').map((c) => SUP[c] ?? c).join('');
const toPersianDigits = (s: string) =>
  s.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);

export function toTemplateShortForm(title: string): string {
  const endo = title.match(/^Endo\.([1-6])-Canal$/);
  if (endo) return `Endo.${endo[1]}-Canal`;
  const reEndo = title.match(/^reEndo\.([1-6])-Canal$/);
  if (reEndo) return `reEndo.${reEndo[1]}-Can`;
  const aml = title.match(/^Aml\.Filling for Class ([1-6])$/);
  if (aml) return `Aml.FillingCl${toSuperscript(aml[1])}`;
  const com = title.match(/^Com\.Filling for Class ([1-6])$/);
  if (com) return `Com.FillingCl${toSuperscript(com[1])}`;
  if (title === 'Manual SRP') return 'SRP.ManTool';
  if (title === 'Ultrsonic SRP') return 'SRP.Ultrsonic';
  if (title === 'Prophylaxis Polish') return 'Prophy.Polish';
  if (title === 'Fluoride therapy') return 'Prophy.Fluor';
  return title;
}

function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function toSuperscriptDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${toSuperscript(String(d.getDate()))}·${toSuperscript(String(d.getMonth() + 1))}·${toSuperscript(String(d.getFullYear()))}`;
}

function toothPositionLabel(tooth: string): string {
  const pos = tooth.slice(0, 2);
  const labels: Record<string, string> = {
    UR: 'Upper Right', UL: 'Upper Left', LR: 'Lower Right', LL: 'Lower Left',
  };
  return labels[pos] ?? pos;
}

const PERSIAN_MONTHS_FA = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

function toPersianJalaliDate(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear() - 621;
  const monthName = PERSIAN_MONTHS_FA[d.getMonth()];
  return `${toPersianDigits(String(d.getDate()))}/${monthName}/${toPersianDigits(String(year))}`;
}

export type OutputType = 'profile' | 'review';

export async function generateProfileOutput(
  data: DataProvider,
  profile: Profile,
  outputType: OutputType
): Promise<string> {
  const periods = await data.listPeriods(profile.id);
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

  if (outputType === 'profile') {
    lines.push('**〇** 𝗣𝗿𝗼𝗳𝗶𝗹𝗲');
    lines.push(`🅘#**${profile.file_number ? `No${profile.file_number}` : 'No???'}**`);
    lines.push(`🅝#**${profile.first_name}_${profile.last_name}**`);
    if (profile.birth_year) lines.push(`**Ⓨ** ${toPersianDigits(profile.birth_year)}`);
    if (profile.phone) lines.push(`**Ⓣ** ${profile.phone}`);
    lines.push(`**Ⓐ** ${profile.address || 'خمینی‌شهر'}`);
    lines.push(`**Ⓗ** ${profile.clinical_notes || 'فاقد ملاحظات خاص پزشکی'}`);
    lines.push('');

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
        partGroups.get(key)!.actions.push(...actions.filter((a) => a.part_id === part.id));
      }

      for (const [, group] of partGroups) {
        const toothNum = group.tooth ? group.tooth.slice(2) : '?';
        const pos = group.tooth ? group.tooth.slice(0, 2) : '';
        const sessionCount = new Set(
          periodParts.filter((pp) => pp.tooth === group.tooth && pp.area === group.area).map((pp) => pp.session_id)
        ).size;
        const loc = group.area === 'LJ' ? 'LL' : group.area === 'UJ' ? 'UL' : pos;
        lines.push(`**❖ ${toothNum}|${loc}** |${toSuperscript(sessionCount > 1 ? `1-${sessionCount}` : String(sessionCount))}|`);
        for (const action of group.actions) {
          lines.push(`${action.price - action.discount ? (action.price - action.discount).toFixed(1) : '0.0'} ${toTemplateShortForm(action.title)}`);
        }
        lines.push('');
      }

      for (const session of pSessions) {
        const sessPayments = periodPayments.filter((p) => {
          return new Date(p.payment_date).toDateString() === new Date(session.session_date).toDateString();
        });
        const sessAmount = sessPayments.reduce((s, p) => s + p.amount, 0);
        lines.push(`① ${sessAmount.toFixed(1)} ${toSuperscriptDate(session.session_date)}`);
      }

      const totalBilled = periodActions.reduce((s, a) => s + a.price, 0);
      const totalDiscount = periodActions.reduce((s, a) => s + a.discount, 0);
      const totalPaid = periodPayments.reduce((s, p) => s + p.amount, 0);
      const balance = totalBilled - totalDiscount - totalPaid;
      lines.push('');
      lines.push(`🅣 **${totalBilled.toFixed(1)}** ➖ ${totalDiscount.toFixed(1)}ᵒᶠᶠ ➖ ${totalPaid.toFixed(1)}ᵖᵃʸ 🟰 **${balance.toFixed(1)}**`);
      lines.push('');
    });
  } else {
    lines.push('**〇** 𝗥𝗲𝘃𝗶𝗲𝘄');
    lines.push(`🅘#**${profile.file_number ? `No${profile.file_number}` : 'No???'}**`);
    lines.push('');

    periods.forEach((period, pIdx) => {
      const pSessions = sessions
        .filter((s) => s.period_id === period.id)
        .sort((a, b) => a.session_number - b.session_number);
      const periodPayments = payments.filter((p) => p.period_id === period.id);
      const periodLabel = pIdx === 0 ? 'اول' : pIdx === 1 ? 'دوم' : pIdx === 2 ? 'سوم' : toFaDigits(pIdx + 1);
      lines.push(`💠 **دوره‌ی ${periodLabel}**`);

      for (const session of pSessions) {
        lines.push(` **◆ جلسه ${toFaDigits(session.session_number)}**`);
        lines.push(toPersianJalaliDate(session.session_date));

        const sessParts = parts.filter((p) => p.session_id === session.id);
        for (const part of sessParts) {
          const toothNum = part.tooth ? part.tooth.slice(2) : '?';
          const loc = part.area === 'LJ' ? 'Lower Left' : part.area === 'UJ' ? 'Upper Left' : toothPositionLabel(part.tooth || '');
          lines.push(`🔹 **${toothNum} | ${loc} | Part ${toFaDigits(part.part_number)}**`);
          for (const action of actions.filter((a) => a.part_id === part.id)) {
            lines.push(`**${toTemplateShortForm(action.title)}:**`);
            if (action.description) lines.push(action.description);
          }
        }
        const sessPayments = periodPayments.filter((p) =>
          new Date(p.payment_date).toDateString() === new Date(session.session_date).toDateString()
        );
        lines.push(`*${sessPayments.reduce((s, p) => s + p.amount, 0).toFixed(1)}`);
      }
      lines.push('');
    });
  }

  return lines.join('\n');
}

export interface ProfileChartData {
  periods: Period[];
  sessions: Session[];
  parts: Part[];
  actions: Action[];
  payments: Payment[];
}

export async function loadProfileChartData(
  data: DataProvider,
  profileId: string
): Promise<ProfileChartData> {
  const periods = await data.listPeriods(profileId);
  if (periods.length === 0) {
    return { periods: [], sessions: [], parts: [], actions: [], payments: [] };
  }
  const periodIds = periods.map((p) => p.id);
  const [payments, sessions] = await Promise.all([
    data.listPayments(periodIds),
    data.listSessions(periodIds),
  ]);
  const sessionIds = sessions.map((s) => s.id);
  const parts = sessionIds.length > 0 ? await data.listParts(sessionIds) : [];
  const partIds = parts.map((p) => p.id);
  const actions = partIds.length > 0 ? await data.listActions(partIds) : [];
  return { periods, sessions, parts, actions, payments };
}

export type ToothDisplayStatus = 'healthy' | 'in_treatment' | 'treated' | 'appointment_needed';

export function buildToothStatusMap(
  parts: Part[],
  actions: Action[]
): Record<string, ToothDisplayStatus> {
  const map: Record<string, ToothDisplayStatus> = {};
  for (const part of parts) {
    if (!part.tooth) continue;
    const partActions = actions.filter((a) => a.part_id === part.id);
    if (partActions.length === 0) continue;
    let status: ToothDisplayStatus = 'healthy';
    if (partActions.some((a) => a.needs_followup || a.status === 'incomplete')) {
      status = 'appointment_needed';
    } else if (partActions.every((a) => a.status === 'complete')) {
      status = 'treated';
    } else {
      status = 'in_treatment';
    }
    const existing = map[part.tooth];
    if (!existing || status === 'appointment_needed') {
      map[part.tooth] = status;
    }
  }
  return map;
}

export function computeFinancialSummary(actions: Action[], payments: Payment[]) {
  const performed = actions.filter((a) => a.status === 'complete').reduce((s, a) => s + (a.price - a.discount), 0);
  const planned = actions.filter((a) => a.status !== 'complete').reduce((s, a) => s + (a.price - a.discount), 0);
  const otherCosts = 0;
  const totalCosts = performed + planned + otherCosts;
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const discounts = actions.reduce((s, a) => s + a.discount, 0);
  const insurance = 0;
  const debt = totalCosts - paid - discounts;
  return { performed, planned, otherCosts, totalCosts, paid, discounts, insurance, debt };
}
