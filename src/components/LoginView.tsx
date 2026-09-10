import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { DataError, useData } from '@/data';
import type { Account } from '@/types';
import { ErrorBanner, Spinner } from './ui';
import { useTranslation } from './LocaleProvider';

interface LoginViewProps {
  onGoRegister?: () => void;
  onAuthenticated?: (account: Account) => void;
}

export function LoginView({ onGoRegister, onAuthenticated }: LoginViewProps) {
  const data = useData();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError(t('login.required'));
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
            : t('login.failed');
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-5 sm:p-8 space-y-5 sm:space-y-6 shadow-lg">
      <div className="text-center">
        <h2 className="text-xl font-bold text-brand-navy">{t('login.title')}</h2>
        <p className="text-sm text-slate-400 mt-1">{t('login.subtitle')}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'login-error' : undefined}
        className="space-y-4"
      >
        {error && <div id="login-error"><ErrorBanner message={error} /></div>}
        <div>
          <label htmlFor="login-email" className="label">{t('login.username')}</label>
          <div className="relative">
            <User size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="login-email"
              className="input ps-10"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.usernamePlaceholder')}
              autoFocus
            />
          </div>
        </div>
        <div>
          <label htmlFor="login-password" className="label">{t('login.password')}</label>
          <div className="relative">
            <Lock size={16} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="login-password"
              className="input pe-10 ps-10"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.passwordPlaceholder')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={saving} className="btn-primary w-full py-3">
          {saving ? <Spinner /> : t('login.submit')}
        </button>
        <p className="text-center text-sm text-slate-400">
          {t('login.forgotPassword')}
        </p>
        {onGoRegister && (
          <button type="button" className="btn-ghost w-full text-sm" onClick={onGoRegister}>
            {t('login.goRegister')}
          </button>
        )}
      </form>
    </div>
  );
}
