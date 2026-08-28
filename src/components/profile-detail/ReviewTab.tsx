import { useState, useEffect, useCallback } from 'react';
import { Copy, Check, Calendar, ChevronLeft, Printer } from 'lucide-react';
import { generateProfileOutput } from '@/lib/profileOutput';
import { useData } from '@/data';
import type { Profile, Session } from '@/types';
import { formatDate, toFaDigits, todayISO } from '@/lib/format';
import { Spinner } from '../ui';
import { PrintableSummary } from './PrintableSummary';

interface ReviewTabProps {
  profile: Profile;
  sessions: Session[];
  onSelectSession?: (sessionId: string) => void;
}

export function ReviewTab({ profile, sessions }: ReviewTabProps) {
  const data = useData();
  const [text, setText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const sortedSessions = [...sessions].sort((a, b) =>
    b.session_date.localeCompare(a.session_date)
  );

  const generate = useCallback(async () => {
    setGenerating(true);
    try {
      const output = await generateProfileOutput(data, profile, 'review');
      setText(output);
    } catch {
      setText('خطا در تولید ریویو.');
    } finally {
      setGenerating(false);
    }
  }, [data, profile]);

  useEffect(() => {
    void generate();
  }, [generate]);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedSession = sortedSessions.find((s) => s.id === selectedSessionId) ?? sortedSessions[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-4 space-y-2">
        <h3 className="text-sm font-semibold text-brand-navy mb-3">لیست جلسات</h3>
        {sortedSessions.length === 0 ? (
          <p className="text-sm text-slate-400">جلسه‌ای ثبت نشده.</p>
        ) : (
          sortedSessions.map((session, idx) => {
            const active = selectedSession?.id === session.id;
            return (
              <button
                key={session.id}
                type="button"
                onClick={() => setSelectedSessionId(session.id)}
                className={`w-full card p-3 text-right transition ${
                  active ? 'ring-2 ring-sage-400 bg-sage-50/50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-sage-100 text-sage-700 flex items-center justify-center text-sm font-bold">
                    {toFaDigits(idx + 1)}
                  </span>
                  <div>
                    <p className="text-sm font-medium">دوره {toFaDigits(session.session_number)}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar size={12} />
                      {formatDate(session.session_date)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="lg:col-span-8 card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-slate-400">Review</p>
            <h3 className="text-lg font-bold text-brand-navy">
              {selectedSession ? `جلسه ${toFaDigits(selectedSession.session_number)}` : 'ریویو درمان'}
            </h3>
            {selectedSession && (
              <p className="text-sm text-slate-500 mt-1">{formatDate(selectedSession.session_date)}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={!text || generating}
              className="btn-secondary text-xs"
              aria-label="چاپ یا خروجی PDF خلاصه پرونده"
            >
              <Printer size={14} />
              چاپ / PDF
            </button>
            <button type="button" onClick={copyText} disabled={!text} className="btn-secondary text-xs">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'کپی شد' : 'کپی'}
            </button>
          </div>
        </div>
        {generating ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed bg-slate-50 rounded-xl p-4 max-h-[480px] overflow-y-auto">
            {text || '—'}
          </pre>
        )}
        <button type="button" onClick={() => void generate()} className="btn-ghost text-xs mt-3">
          <ChevronLeft size={14} />
          تولید مجدد
        </button>
      </div>

      <PrintableSummary profile={profile} content={text} generatedAt={todayISO()} />
    </div>
  );
}
