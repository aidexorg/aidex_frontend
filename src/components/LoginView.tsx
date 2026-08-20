import { useState, type FormEvent } from 'react';
import { DataError, useData } from '@/data';
import type { Account } from '@/types';
import { ErrorBanner, Spinner, SuccessBanner } from './ui';

interface LoginViewProps {
  onGoRegister?: () => void;
  onAuthenticated?: (account: Account) => void;
}

export function LoginView({ onGoRegister, onAuthenticated }: LoginViewProps) {
  const data = useData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<Account | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError('ایمیل و رمز عبور الزامی است.');
      setSignedIn(null);
      return;
    }

    setSaving(true);
    setError(null);
    setSignedIn(null);
    try {
      const account = await data.loginAccount({ email: trimmedEmail, password });
      setSignedIn(account);
      setPassword('');
      onAuthenticated?.(account);
    } catch (err) {
      const msg =
        err instanceof DataError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'ورود ناموفق بود.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white">ورود اپراتور</h2>
        <p className="text-sm text-slate-400 mt-1">با حساب ثبت‌شده وارد شوید.</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        {error && <ErrorBanner message={error} />}
        {signedIn && (
          <SuccessBanner
            message={`وارد شدید: «${signedIn.email}»${
              signedIn.display_name ? ` (${signedIn.display_name})` : ''
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
              setSignedIn(null);
            }}
            placeholder="operator@clinic.ir"
            autoFocus
          />
        </div>
        <div>
          <label className="label">رمز عبور *</label>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          {onGoRegister ? (
            <button type="button" className="btn-ghost text-xs" onClick={onGoRegister}>
              حساب ندارید؟ ثبت‌نام
            </button>
          ) : (
            <span />
          )}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Spinner /> : 'ورود'}
          </button>
        </div>
      </form>
    </div>
  );
}
