import { useState, type FormEvent } from 'react';
import { DataError, useData } from '@/data';
import type { Account } from '@/types';
import { ErrorBanner, Spinner } from './ui';

const MIN_PASSWORD_LENGTH = 8;

interface RegisterViewProps {
  onGoLogin?: () => void;
  onAuthenticated?: (account: Account) => void;
}

export function RegisterView({ onGoLogin, onAuthenticated }: RegisterViewProps) {
  const data = useData();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedName = displayName.trim();

    if (!trimmedEmail || !password || !confirm) {
      setError('ایمیل، رمز عبور و تکرار رمز الزامی است.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`رمز عبور باید حداقل ${MIN_PASSWORD_LENGTH} نویسه باشد.`);
      return;
    }
    if (password !== confirm) {
      setError('رمز عبور و تکرار آن یکسان نیستند.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const account = await data.registerAccount({
        email: trimmedEmail,
        password,
        display_name: trimmedName || null,
      });
      setPassword('');
      setConfirm('');
      onAuthenticated?.(account);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ثبت‌نام ناموفق بود.';
      if (err instanceof DataError && err.code === '23505') {
        setError('این ایمیل قبلاً ثبت شده است.');
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-8 space-y-6 shadow-lg">
      <div className="text-center">
        <h2 className="text-xl font-bold text-brand-navy">ثبت‌نام</h2>
        <p className="text-sm text-slate-400 mt-1">حساب ورود جدا از پرونده بیمار است.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <div>
          <label className="label">ایمیل *</label>
          <input
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@clinic.ir"
            autoFocus
          />
        </div>
        <div>
          <label className="label">نام نمایشی</label>
          <input
            className="input"
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="اختیاری"
          />
        </div>
        <div>
          <label className="label">رمز عبور *</label>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="حداقل ۸ نویسه"
          />
        </div>
        <div>
          <label className="label">تکرار رمز عبور *</label>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <button type="submit" disabled={saving} className="btn-primary w-full py-3">
          {saving ? <Spinner /> : 'ایجاد حساب'}
        </button>
        {onGoLogin && (
          <button type="button" className="btn-ghost w-full text-sm" onClick={onGoLogin}>
            حساب دارید؟ ورود
          </button>
        )}
      </form>
    </div>
  );
}
