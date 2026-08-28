import type { Profile } from '@/types';
import { formatDate, toFaDigits } from '@/lib/format';

interface PrintableSummaryProps {
  profile: Profile;
  content: string;
  generatedAt: string;
}

/**
 * A4 print document. Hidden on screen (`.print-root`), revealed only by the
 * `@media print` stylesheet so the browser print / save-as-PDF flow renders a
 * clean Persian clinical summary instead of the app UI.
 */
export function PrintableSummary({ profile, content, generatedAt }: PrintableSummaryProps) {
  const fullName = `${profile.first_name} ${profile.last_name}`.trim();

  return (
    <div className="print-root" dir="rtl" aria-hidden="true">
      <header
        style={{
          borderBottom: '2px solid #111',
          paddingBottom: '10px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>خلاصه پرونده درمانی</h1>
          <span style={{ fontSize: '13px', fontWeight: 700 }}>AIDEX</span>
        </div>
        <div style={{ marginTop: '8px', fontSize: '13px', lineHeight: 1.8 }}>
          <div>
            <strong>بیمار:</strong> {fullName || '—'}
          </div>
          {profile.file_number && (
            <div>
              <strong>شماره پرونده:</strong> {toFaDigits(profile.file_number)}
            </div>
          )}
          <div>
            <strong>تاریخ تولید:</strong> {formatDate(generatedAt)}
          </div>
        </div>
      </header>

      <div className="print-summary">{content || 'اطلاعات درمانی ثبت نشده است.'}</div>
    </div>
  );
}
