import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { DataError, useData } from '@/data';
import type { Account } from '@/types';
import { ErrorBanner, Spinner } from './ui';

interface LoginViewProps {
  onGoRegister?: () => void;
  onAuthenticated?: (account: Account) => void;
}

export function LoginView({ onGoRegister, onAuthenticated }: LoginViewProps) {
  const data = useData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('ایمیل و رمز عبور الزامی است.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const account = await data.loginAccount({ email: trimmedEmail, password });
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
    <div className="card p-8 space-y-6 shadow-lg">
      <div className="text-center">
        <h2 className="text-xl font-bold text-brand-navy">ورود</h2>
        <p className="text-sm text-slate-400 mt-1">با حساب اپراتور وارد شوید.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <div>
          <label className="label">نام کاربری</label>
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="نام کاربری خود را وارد کنید"
              autoFocus
            />
          </div>
        </div>
        <div>
          <label className="label">رمز عبور</label>
          <div className="relative">
            <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pr-10 pl-10"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="رمز عبور خود را وارد کنید"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={saving} className="btn-primary w-full py-3">
          {saving ? <Spinner /> : 'ورود'}
        </button>
        <p className="text-center text-sm text-slate-400">
          رمز عبور را فراموش کرده‌اید؟
        </p>
        {onGoRegister && (
          <button type="button" className="btn-ghost w-full text-sm" onClick={onGoRegister}>
            حساب ندارید؟ ثبت‌نام
          </button>
        )}
      </form>
    </div>
  );
}
