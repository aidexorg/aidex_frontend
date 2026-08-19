import { useState, type FormEvent } from 'react';
import { DataError, useData } from '@/data';
import type { Account } from '@/types';
import { ErrorBanner, Spinner, SuccessBanner } from './ui';

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
  const [created, setCreated] = useState<Account | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedName = displayName.trim();

    if (!trimmedEmail || !password || !confirm) {
      setError('ایمیل، رمز عبور و تکرار رمز الزامی است.');
      setCreated(null);
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`رمز عبور باید حداقل ${MIN_PASSWORD_LENGTH} نویسه باشد.`);
      setCreated(null);
      return;
    }
    if (password !== confirm) {
      setError('رمز عبور و تکرار آن یکسان نیستند.');
      setCreated(null);
      return;
    }

    setSaving(true);
    setError(null);
    setCreated(null);
    try {
      const account = await data.registerAccount({
        email: trimmedEmail,
        password,
        display_name: trimmedName || null,
      });
      setCreated(account);
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
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white">ثبت‌نام اپراتور</h2>
        <p className="text-sm text-slate-400 mt-1">حساب ورود جدا از پرونده بیمار است.</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        {error && <ErrorBanner message={error} />}
        {created && (
          <SuccessBanner
            message={`حساب «${created.email}» ساخته شد.${
              created.display_name ? ` (${created.display_name})` : ''
            }`}
          />
        )}
        <div>
          <label className="label">ایمیل *</label>
          <input
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setCreated(null);
            }}
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
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          {onGoLogin ? (
            <button type="button" className="btn-ghost text-xs" onClick={onGoLogin}>
              حساب دارید؟ ورود
            </button>
          ) : (
            <span />
          )}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Spinner /> : 'ایجاد حساب'}
          </button>
        </div>
      </form>
    </div>
  );
}
