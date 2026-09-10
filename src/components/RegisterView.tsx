import { useState, type FormEvent } from 'react';
import { DataError, useData } from '@/data';
import type { Account } from '@/types';
import { ErrorBanner, Spinner } from './ui';
import { useTranslation } from './LocaleProvider';

const MIN_PASSWORD_LENGTH = 8;

interface RegisterViewProps {
  onGoLogin?: () => void;
  onAuthenticated?: (account: Account) => void;
}

export function RegisterView({ onGoLogin, onAuthenticated }: RegisterViewProps) {
  const data = useData();
  const { t } = useTranslation();
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
      setError(t('register.required'));
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('register.passwordMin', { min: MIN_PASSWORD_LENGTH }));
      return;
    }
    if (password !== confirm) {
      setError(t('register.passwordMismatch'));
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
      const msg = err instanceof Error ? err.message : t('register.failed');
      if (err instanceof DataError && err.code === '23505') {
        setError(t('register.emailTaken'));
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-5 sm:p-8 space-y-5 sm:space-y-6 shadow-lg">
      <div className="text-center">
        <h2 className="text-xl font-bold text-brand-navy">{t('register.title')}</h2>
        <p className="text-sm text-slate-400 mt-1">{t('register.subtitle')}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'register-error' : undefined}
        className="space-y-4"
      >
        {error && <div id="register-error"><ErrorBanner message={error} /></div>}
        <div>
          <label htmlFor="register-email" className="label">{t('register.email')}</label>
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
          <label htmlFor="register-display-name" className="label">{t('register.displayName')}</label>
          <input
            id="register-display-name"
            className="input"
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t('common.optional')}
          />
        </div>
        <div>
          <label htmlFor="register-password" className="label">{t('register.password')}</label>
          <input
            id="register-password"
            className="input"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('register.passwordPlaceholder')}
          />
        </div>
        <div>
          <label htmlFor="register-password-confirm" className="label">{t('register.confirmPassword')}</label>
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
          {saving ? <Spinner /> : t('register.submit')}
        </button>
        {onGoLogin && (
          <button type="button" className="btn-ghost w-full text-sm" onClick={onGoLogin}>
            {t('register.goLogin')}
          </button>
        )}
      </form>
    </div>
  );
}
