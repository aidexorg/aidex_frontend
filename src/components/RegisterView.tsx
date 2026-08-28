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

      <form
        onSubmit={handleSubmit}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'register-error' : undefined}
        className="space-y-4"
      >
        {error && <div id="register-error"><ErrorBanner message={error} /></div>}
        <div>
          <label htmlFor="register-email" className="label">ایمیل *</label>
          <input
            id="register-email"
            className="input"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@clinic.ir"
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="register-display-name" className="label">نام نمایشی</label>
          <input
            id="register-display-name"
            className="input"
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="اختیاری"
          />
        </div>
        <div>
          <label htmlFor="register-password" className="label">رمز عبور *</label>
          <input
            id="register-password"
            className="input"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="حداقل ۸ نویسه"
          />
        </div>
        <div>
          <label htmlFor="register-password-confirm" className="label">تکرار رمز عبور *</label>
          <input
            id="register-password-confirm"
            className="input"
            type="password"
            required
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
