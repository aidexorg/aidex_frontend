import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  applyDocumentLocale,
  nextLocale,
  readStoredLocale,
  setActiveLocale,
  writeStoredLocale,
  type AppLocale,
} from '@/lib/locale';
import { translate, type MessageKey, type TranslationParams } from '@/i18n/messages';

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  cycleLocale: () => void;
  t: (key: MessageKey, params?: TranslationParams) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(() => readStoredLocale());

  const apply = useCallback((next: AppLocale) => {
    setLocaleState(next);
    setActiveLocale(next);
    writeStoredLocale(next);
    applyDocumentLocale(next);
  }, []);

  const setLocale = useCallback(
    (next: AppLocale) => {
      apply(next);
    },
    [apply],
  );

  const cycleLocale = useCallback(() => {
    setLocale(nextLocale(locale));
  }, [locale, setLocale]);

  useEffect(() => {
    apply(readStoredLocale());
  }, [apply]);

  const t = useCallback(
    (key: MessageKey, params?: TranslationParams) => translate(locale, key, params),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, cycleLocale, t }),
    [locale, setLocale, cycleLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useTranslation(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within LocaleProvider');
  }
  return ctx;
}
