import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Lock, User, WifiOff } from 'lucide-react';
import { DataError, useData, useDataProviderMode } from '@/data';
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
  const { setMode } = useDataProviderMode();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOfflineSuggestion, setShowOfflineSuggestion] = useState(false);

  const isNetworkError = (err: unknown): boolean => {
    if (err instanceof TypeError) return true; // fetch failed
    if (err instanceof Error) {
      const msg = err.message.toLowerCase();
      return msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch') || msg.includes('refused');
    }
    return false;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError(t('login.required'));
      return;
    }
    setSaving(true);
    setError(null);
    setShowOfflineSuggestion(false);
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
      if (isNetworkError(err)) {
        setShowOfflineSuggestion(true);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchToOffline = () => {
    setMode('offline');
    setShowOfflineSuggestion(false);
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

        {/* Offline mode suggestion when backend is unreachable */}
        {showOfflineSuggestion && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 animate-fade-in dark:border-amber-800/50 dark:bg-amber-950/40">
            <div className="flex items-start gap-2">
              <WifiOff size={16} className="text-amber-600 mt-0.5 shrink-0 dark:text-amber-400" />
              <div className="flex-1">
                <p className="text-sm text-amber-800 dark:text-amber-200">{t('login.offlineSuggestion')}</p>
                <button
                  type="button"
                  onClick={handleSwitchToOffline}
                  className="mt-2 text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
                >
                  {t('login.switchToOffline')}
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-sm text-slate-400">
          {t('login.forgotPassword')}
        </p>
        {onGoRegister && (
          <button type="button" className="btn-ghost w-full text-sm" onClick={onGoRegister}>
            {t('login.goRegister')}
          </button>
        )}
      </form>

      {/* Always-visible offline mode entry point */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
        <button
          type="button"
          onClick={handleSwitchToOffline}
          className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition dark:text-slate-400 dark:hover:text-slate-200"
        >
          <WifiOff size={14} />
          {t('login.workOffline')}
        </button>
        <p className="text-[10px] text-slate-300 text-center mt-1 dark:text-slate-600">
          {t('login.offlineHint')}
        </p>
      </div>
    </div>
  );
}
