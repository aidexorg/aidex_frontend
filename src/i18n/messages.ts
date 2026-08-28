import type { AppLocale } from '@/lib/locale';

export const messages = {
  fa: {
    'common.loading': 'در حال بارگذاری…',
    'common.retry': 'تلاش مجدد',
    'common.close': 'بستن',
    'common.optional': 'اختیاری',
    'common.emDash': '—',

    'theme.system': 'سیستم',
    'theme.light': 'روشن',
    'theme.dark': 'تاریک',
    'theme.ariaLabel': 'تم: {label}. برای تغییر کلیک کنید',
    'theme.title': 'تم: {label}',

    'locale.fa': 'فارسی',
    'locale.en': 'English',
    'locale.ariaLabel': 'زبان: {label}. برای تغییر کلیک کنید',
    'locale.title': 'زبان: {label}',

    'layout.skipToContent': 'رفتن به محتوای اصلی',
    'layout.nav.main': 'ناوبری اصلی',
    'layout.nav.mobile': 'ناوبری اصلی موبایل',
    'layout.nav.bottom': 'ناوبری پایین موبایل',
    'layout.nav.dashboard': 'خانه',
    'layout.nav.profiles': 'فهرست پرونده‌ها',
    'layout.nav.appointments': 'تقویم نوبت‌ها',
    'layout.version': 'نسخه ۱.۰ — AIDEX',
    'layout.menu': 'منو',
    'layout.menuClose': 'بستن منو',
    'layout.menuDialog': 'منوی ناوبری',
    'layout.searchOpen': 'باز کردن جستجوی سراسری',
    'layout.searchPlaceholder': 'جستجو در پرونده‌ها، بیماران، نوبت‌ها و...',
    'layout.doctorGreeting': 'دکتر {name}',
    'layout.doctorRole': 'متخصص دندانپزشکی',
    'layout.logout': 'خروج',
    'layout.logoutAccount': 'خروج از حساب',

    'auth.shellLabel': 'ورود به AIDEX',
    'auth.shellVersion': 'نسخه ۱.۰ — ورود اپراتور',

    'login.title': 'ورود',
    'login.subtitle': 'با حساب اپراتور وارد شوید.',
    'login.username': 'نام کاربری',
    'login.password': 'رمز عبور',
    'login.usernamePlaceholder': 'نام کاربری خود را وارد کنید',
    'login.passwordPlaceholder': 'رمز عبور خود را وارد کنید',
    'login.showPassword': 'نمایش رمز عبور',
    'login.hidePassword': 'پنهان کردن رمز عبور',
    'login.submit': 'ورود',
    'login.forgotPassword': 'رمز عبور را فراموش کرده‌اید؟',
    'login.goRegister': 'حساب ندارید؟ ثبت‌نام',
    'login.required': 'ایمیل و رمز عبور الزامی است.',
    'login.failed': 'ورود ناموفق بود.',

    'register.title': 'ثبت‌نام',
    'register.subtitle': 'حساب ورود جدا از پرونده بیمار است.',
    'register.email': 'ایمیل *',
    'register.displayName': 'نام نمایشی',
    'register.password': 'رمز عبور *',
    'register.confirmPassword': 'تکرار رمز عبور *',
    'register.passwordPlaceholder': 'حداقل ۸ نویسه',
    'register.submit': 'ایجاد حساب',
    'register.goLogin': 'حساب دارید؟ ورود',
    'register.required': 'ایمیل، رمز عبور و تکرار رمز الزامی است.',
    'register.passwordMin': 'رمز عبور باید حداقل {min} نویسه باشد.',
    'register.passwordMismatch': 'رمز عبور و تکرار آن یکسان نیستند.',
    'register.failed': 'ثبت‌نام ناموفق بود.',
    'register.emailTaken': 'این ایمیل قبلاً ثبت شده است.',

    'offline.local': 'حالت آفلاین — داده محلی',
    'offline.pending': 'آفلاین — {count} تغییر در صف همگام‌سازی',
    'offline.generic': 'اتصال اینترنت قطع است — تغییرات ذخیره می‌شوند و پس از اتصال ارسال می‌شوند',

    'pwa.updateReady': 'نسخه جدید اپلیکیشن آماده است',
    'pwa.reload': 'بارگذاری مجدد',

    'toast.undo': 'بازگردانی',

    'currency.toman': 'تومان',
  },
  en: {
    'common.loading': 'Loading…',
    'common.retry': 'Retry',
    'common.close': 'Close',
    'common.optional': 'Optional',
    'common.emDash': '—',

    'theme.system': 'System',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.ariaLabel': 'Theme: {label}. Click to change',
    'theme.title': 'Theme: {label}',

    'locale.fa': 'فارسی',
    'locale.en': 'English',
    'locale.ariaLabel': 'Language: {label}. Click to change',
    'locale.title': 'Language: {label}',

    'layout.skipToContent': 'Skip to main content',
    'layout.nav.main': 'Main navigation',
    'layout.nav.mobile': 'Mobile main navigation',
    'layout.nav.bottom': 'Mobile bottom navigation',
    'layout.nav.dashboard': 'Home',
    'layout.nav.profiles': 'Patient records',
    'layout.nav.appointments': 'Appointments calendar',
    'layout.version': 'Version 1.0 — AIDEX',
    'layout.menu': 'Menu',
    'layout.menuClose': 'Close menu',
    'layout.menuDialog': 'Navigation menu',
    'layout.searchOpen': 'Open global search',
    'layout.searchPlaceholder': 'Search records, patients, appointments…',
    'layout.doctorGreeting': 'Dr. {name}',
    'layout.doctorRole': 'Dentistry specialist',
    'layout.logout': 'Log out',
    'layout.logoutAccount': 'Log out of account',

    'auth.shellLabel': 'Sign in to AIDEX',
    'auth.shellVersion': 'Version 1.0 — operator sign-in',

    'login.title': 'Sign in',
    'login.subtitle': 'Sign in with your operator account.',
    'login.username': 'Username',
    'login.password': 'Password',
    'login.usernamePlaceholder': 'Enter your username',
    'login.passwordPlaceholder': 'Enter your password',
    'login.showPassword': 'Show password',
    'login.hidePassword': 'Hide password',
    'login.submit': 'Sign in',
    'login.forgotPassword': 'Forgot your password?',
    'login.goRegister': 'No account? Register',
    'login.required': 'Email and password are required.',
    'login.failed': 'Sign-in failed.',

    'register.title': 'Register',
    'register.subtitle': 'Operator account is separate from patient records.',
    'register.email': 'Email *',
    'register.displayName': 'Display name',
    'register.password': 'Password *',
    'register.confirmPassword': 'Confirm password *',
    'register.passwordPlaceholder': 'At least 8 characters',
    'register.submit': 'Create account',
    'register.goLogin': 'Have an account? Sign in',
    'register.required': 'Email, password, and confirmation are required.',
    'register.passwordMin': 'Password must be at least {min} characters.',
    'register.passwordMismatch': 'Password and confirmation do not match.',
    'register.failed': 'Registration failed.',
    'register.emailTaken': 'This email is already registered.',

    'offline.local': 'Offline — local demo data',
    'offline.pending': 'Offline — {count} change(s) queued for sync',
    'offline.generic': 'You are offline — changes will sync when connected',

    'pwa.updateReady': 'A new app version is ready',
    'pwa.reload': 'Reload',

    'toast.undo': 'Undo',

    'currency.toman': 'Toman',
  },
} as const satisfies Record<AppLocale, Record<string, string>>;

export type MessageKey = keyof typeof messages.fa;

export type TranslationParams = Record<string, string | number>;

export function translate(
  locale: AppLocale,
  key: MessageKey,
  params?: TranslationParams,
): string {
  const template = messages[locale][key] ?? messages.fa[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}
