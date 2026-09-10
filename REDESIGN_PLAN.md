# 🔧 AIDEX – فهرست بازطراحی (ریدیزاین)

## خلاصه تحلیل

پروژه AIDEX یک اپلیکیشن مدیریت کلینیک دندانپزشکی (React + Vite + Tailwind + Supabase) است
با پشتیبانی از زبان فارسی (RTL) و حالت تاریک. پس از بررسی کامل تمام کامپوننت‌ها،
فایل‌های استایل، و تنظیمات Tailwind، موارد زیر به‌عنوان اولویت‌بندی شده‌ی بازطراحی شناسایی شدند.

---

## 🔴 اولویت بحرانی (P0) – مشکلات ساختاری و بصری جدی

### 1. رنگ‌های `primary` و `sage` در Tailwind کاملاً یکسان هستند
**فایل:** `tailwind.config.js`
**وضعیت:** پالت `primary` و `sage` دقیقاً مقادیر یکسانی دارند (`#7a9e7e` → `#334536`).
**مشکل:** هیچ تمایزی بین رنگ اصلی و رنگ برند وجود ندارد. برخی کامپوننت‌ها `primary-*`
و برخی `sage-*` را استفاده می‌کنند، اما تفاوتی ندارند. همچنین CSS متغیر `--color-primary`
تعریف شده ولی هیچ‌جا استفاده نمی‌شود.
**راه‌حل:** یکی را حذف کنید و یک سیستم رنگ واحد بسازید. `primary` را برای رنگ برند
(مثلاً برای دکمه‌های اصلی) و `sage` را برای رنگ‌های ثانویه/بازخورد نگه دارید.
یا `primary` را حذف کنید و همه جا از `sage` استفاده کنید.

---

### 2. متغیرهای CSS `--color-*` استفاده نمی‌شوند
**فایل:** `src/index.css` (خطوط ۳–۱۲)
**وضعیت:** متغیرهای `--color-bg`, `--color-surface`, `--color-border`, `--color-text`,
`--color-primary` و ... تعریف شده‌اند، اما هیچ‌کجا در کد استفاده نمی‌شوند.
تمام رنگ‌ها مستقیماً با کلاس‌های Tailwind (`slate-*`, `sage-*`, `teal-*`) نوشته شده‌اند.
**مشکل:** این متغیرها غیرفعال هستند و اگر روزی بخواهید سیستم طراحی تغییر کند،
باید تمام فایل‌ها را دستی ویرایش کنید. همچنین `dark` tokens در CSS متغیرها با
`dark:` variants Tailwind همپوشانی دارند.
**راه‌حل:** یا متغیرها را حذف کنید تا کد تمیزتر شود، یا کامپوننت‌ها را به استفاده
از متغیرها مهاجرت دهید تا themeing متمرکز شود.

---

### 3. کمبود dark mode در چندین کامپوننت کلیدی
**کامپوننت‌ها:**
- `DashboardHeader.tsx`: `text-slate-900` بدون `dark:text-*`
- `StatusBreakdown.tsx`: `text-slate-700` بدون `dark:` variant
- `TodayAppointments.tsx`: `text-slate-800` بدون `dark:text-*`
- `QuickStatsFooter.tsx`: `text-slate-900` بدون `dark:text-*`
- `MonthlySummaryCard.tsx`: `text-slate-700` و `text-slate-900` بدون `dark:` variants
- `ARAging.tsx`: `text-slate-700` بدون `dark:text-*`
- `ProductionByDentist.tsx`: `text-slate-700` و `text-slate-800` بدون `dark:`
- `ProductionByType.tsx`: مشابه بالا
- `ProfileForm.tsx` (صفحه variant): `text-slate-900` بدون `dark:text-*`
- `DataTable.tsx`: `text-slate-500` در header بدون `dark:text-*`

**مشکل:** در حالت تاریک، متن‌های این کامپوننت‌ها خوانایی کمی دارند یا
با پس‌زمینه ترکیب می‌شوند.
**راه‌حل:** برای هر رنگ `text-slate-*` در کامپوننت‌های بالا، یک `dark:text-slate-*`
مناسب اضافه کنید.

---

### 4. پالت رنگی نامنسجم در سراسر اپلیکیشن
**وضعیت:** اپ از ۶+ پالت رنگی مختلف استفاده می‌کند بدون سلسله‌مراتب مشخص:

| رنگ | کجا استفاده می‌شود | نقش |
|-----|-------------------|-----|
| `sage-*` | دکمه‌ها، TabBar active، nav active، StatusPill، icon-well | رنگ برند اصلی |
| `teal-*` | ProfileForm header، loading spinner، DashboardView، calendar | رنگ ثانویه |
| `emerald-*` | StatusPill active، success banner، toast، btn-save-success | موفقیت/تأیید |
| `sky-*` | StatusPill appointment_needed، ArrivalsQueue badges، calendar | نوبت/انتظار |
| `amber-*` | followup badges، waiting queue، AR aging | هشدار |
| `brand-navy` | متن عنوان، لوگو، nav active text | رنگ متن اصلی |

**مشکل:** کاربر نمی‌داند هر رنگ چه معنایی دارد. مثلاً `teal` و `sage` هر دو
"سبز" هستند اما نقش‌های متفاوتی دارند. `emerald` برای موفقیت است اما
`btn-save-success` هم `emerald` دارد.
**راه‌حل:** یک راهنمای رنگی (color semantics) تعریف کنید:
- رنگ برند = sage/primary
- رنگ اقدام/لینک = teal
- موفقیت = emerald
- هشدار = amber
- خطا = red
- اطلاعات = sky

و کامپوننت‌ها را بر اساس آن یکپارچه کنید.

---

## 🟠 اولویت بالا (P1) – ناهماهنگی‌های الگویی

### ۵. سه الگوی متفاوت Section Wrapper در فرم‌ها
**فایل:** `ProfileForm.tsx`
**وضعیت:** سه کامپوننت متفاوت برای wrap کردن بخش‌های فرم:
- `Section`: `rounded-2xl border border-slate-100 bg-slate-50/60 p-4` (modal variant)
- `CompactSection`: بدون background/border، فقط `space-y-2.5` (page variant)
- ساختار inline در page variant که هیچ‌کدام نیست

**مشکل:** اگر بخواهید ظاهر بخش‌ها را تغییر دهید، باید ۳ جا را ویرایش کنید.
**راه‌حل:** یک کامپوننت `FormSection` واحد با prop `variant="card" | "compact" | "inline"` بسازید.

---

### ۶. الگوی EmptyState ناهمگن
**وضعیت:** حداقل ۴ الگوی مختلف برای نمایش حالت خالی:
1. کامپوننت `EmptyState` از `ui.tsx` (با icon, title, description, action)
2. کارت با آیکون + متن درون `card` wrapper (DashboardView followups)
3. `p` ساده در `card p-4` (ArrivalsQueue, BalanceAlerts)
4. آیکون + متن بدون wrapper (TodayAppointments)

**مشکل:** ظاهر نامنسجم. برخی card دارند، برخی ندارند. اندازه آیکون‌ها متفاوت است.
**راه‌حل:** الگوی `EmptyState` از `ui.tsx` را به‌عنوان استاندارد انتخاب کنید
و بقیه را با آن جایگزین کنید.

---

### ۷. استایل‌های inline مغایر با `StatusPill`
**فایل:** `TodayAppointments.tsx`, `DashboardView.tsx` (FollowupsPanel)
**وضعیت:** کامپوننت `StatusPill` وجود دارد و سه وضعیت را مدیریت می‌کند،
اما بسیاری از جاها badge‌های inline با استایل‌های دستی می‌نویسند:
```tsx
// TodayAppointments:
<span className={`text-[10px] px-1.5 py-0.5 rounded border ${TYPE_COLORS[appt.type]}`}>
  {typeConfig.label}
</span>

// DashboardView followups:
<span className="text-[10px] px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">
  پیگیری
</span>
```

**مشکل:** اگر بخواهید ظاهر badge را تغییر دهید، باید تمام جاهای inline را پیدا کنید.
**راه‌حل:** `StatusPill` را گسترش دهید تا types و followup status را هم پوشش دهد،
یا یک کامپوننت `Badge` عمومی‌تر بسازید.

---

### ۸. کلاس‌های دکمه ناهمگن (`btn-*` vs inline)
**وضعیت:** دو سیستم برای دکمه‌ها وجود دارد:
1. کلاس‌های `@layer components` در `index.css`: `btn-primary`, `btn-secondary`, `btn-sage`, `btn-danger`, `btn-ghost`
2. دکمه‌های inline در کامپوننت‌ها:
   ```tsx
   // ArrivalsQueue:
   className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg transition"
   // BalanceAlerts:
   className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-medium rounded-lg transition"
   ```

**مشکل:** دکمه‌های inline اندازه‌ها، گوشه‌ها و transition‌های متفاوتی دارند.
**راه‌حل:** الگوی `btn-*` را گسترش دهید تا variant‌های `btn-sm`, `btn-xs`, `btn-teal` هم داشته باشید.

---

### ۹. Pagination تکراری بدون استخراج
**فایل‌ها:** `DataTable.tsx`, `ProfilesList.tsx` (card view)
**وضعیت:** الگوی pagination تقریباً یکسان در دو جا کپی شده:
```tsx
// هر دو:
<button disabled={page <= 1} onClick={() => onPageChange(page - 1)} ...>
  <ChevronRight size={18} />
</button>
{Array.from({ length: Math.min(totalPages, 5) }, ...).map(p => (
  <button ...>{toFaDigits(p)}</button>
))}
<button disabled={page >= totalPages} ...>
  <ChevronLeft size={18} />
</button>
```
**مشکل:** اگر bug fix یا بهبودی لازم باشد، باید دو جا تغییر کنید.
**راه‌حل:** یک کامپوننت `Pagination` استخراج کنید.

---

## 🟡 اولویت متوسط (P2) – بهبودهای بصری و تجربه کاربری

### ۱۰. عدم وجود سیستم ارتفاع/ارتفاع بصری (elevation)
**وضعیت:** تمام کارت‌ها از `shadow-[0_8px_32px_-12px_rgb(30_42_58_/_0.1)]` یکسان
استفاده می‌کنند. هیچ تفاوتی بین کارت اصلی، کارت فرعی، کارت модال و ... وجود ندارد.
**راه‌حل:** سیستم elevation سه‌سطحی معرفی کنید:
- `shadow-elevated` (modals, dropdowns)
- `shadow-card` (card‌های اصلی)
- `shadow-soft` (card‌های فرعی، inline)

---

### ۱۱. فاصله‌گذاری (spacing) نامنظم
**وضعیت:** فاصله‌های بین بخش‌ها در صفحات مختلف متفاوت:
- DashboardView: `space-y-6`
- ProfilesList: `space-y-6`
- AppointmentsView: `space-y-4` یا `space-y-6`
- ProfileDetail: `space-y-5` یا `space-y-6`
- فرم‌ها: `space-y-5`

**مشکل:** ریتم بصری شکسته می‌شود.
**راه‌حل:** یک spacing scale ثابت تعریف کنید:
- بین بخش‌های اصلی صفحه: `space-y-6`
- بین آیتم‌های داخل یک بخش: `space-y-3` یا `space-y-4`
- بین المان‌های کوچک: `space-y-2`

---

### ۱۲. `icon-well` با اندازه‌های متغیر
**وضعیت:** کلاس `icon-well` در `index.css` اندازه `w-11 h-11` دارد،
اما در کامپوننت‌ها با override استفاده می‌شود:
```tsx
<span className="icon-well !w-8 !h-8 rounded-xl bg-white text-teal-700 shadow-sm">
<span className="icon-well bg-sage-50 text-sage-600 dark:bg-sage-900/40">
<span className="icon-well bg-red-100 text-red-600 w-10 h-10 rounded-xl">
```

**مشکل:** اندازه ثابت نیست. `!important` override ها کد را شکننده می‌کنند.
**راه‌حل:** prop size به `icon-well` اضافه کنید: `icon-well-sm`, `icon-well-md`, `icon-well-lg`.

---

### ۱۳. کلاس‌های متنی پراکنده بدون سلسله‌مراتب
**وضعیت:** اندازه‌های متنی در سراسر کد پراکنده‌اند:
`text-[9px]`, `text-[10px]`, `text-[11px]`, `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`

**مشکل:** هیچ type scale مشخصی وجود ندارد. `text-[10px]` یک بار برای badge
و بار دیگر برای footer استفاده می‌شود.
**اهداف:** یک type scale ثابت تعریف کنید:
- Caption/Label: `text-[10px]` → `text-xs`
- Body small: `text-xs` → `text-sm`
- Body: `text-sm`
- Heading small: `text-base`
- Heading: `text-lg`
- Title: `text-xl`

---

### ۱۴. کلاس `card` سایه hardcoded دارد
**فایل:** `src/index.css`
**وضعیت:** `.card` از `shadow-[0_8px_32px_-12px_rgb(30_42_58_/_0.1)]` استفاده
می‌کند در حالی که `--shadow-card` CSS متغیر تعریف شده.
**راه‌حل:** `.card` را به `shadow-[var(--shadow-card)]` یا `shadow-card`
(اگر در Tailwind config اضافه شود) تغییر دهید.

---

### ۱۵. DecorativeBg در هر صفحه رندر می‌شود
**فایل:** `DecorativeBg.tsx`
**وضعیت:** این کامپوننت سه div blur‌دار + یک SVG در هر صفحه رندر می‌شود.
روی دستگاه‌های ضعیف ممکن است performance داشته باشد.
**راه‌حل:** یک بار در `Layout` رندر شود (که قبلاً انجام می‌شود) و
در `AuthShell` حذف شود، یا `will-change: transform` اضافه شود.

---

## 🟢 اولویت پایین (P3) – بهبودهای جزئی

### ۱۶. `DashboardHeader` قدیمی استفاده نمی‌شود
**فایل:** `src/components/dashboard/DashboardHeader.tsx`
**وضعیت:** این کامپوننت هیچ import‌ای ندارد. `DashboardView` به جای آن
از inline header با `card` wrapper استفاده می‌کند.
**راه‌حل:** حذف فایل `DashboardHeader.tsx`.

---

### ۱۷. `QuickStatsFooter` استفاده نمی‌شود
**فایل:** `src/components/dashboard/QuickStatsFooter.tsx`
**وضعیت:** 类似 `DashboardHeader`، این کامپوننت هم import نشده.
**راه‌حل:** حذف فایل `QuickStatsFooter.tsx`.

---

### ۱۸. `StatsCards` استفاده نمی‌شود
**فایل:** `src/components/dashboard/StatsCards.tsx`
**وضعیت:** `DashboardView` از `ActionStat` + `StatCard` استفاده می‌کند،
نه از `StatsCards`. این فایل مازاد است.
**راه‌حل:** حذف فایل `StatsCards.tsx`.

---

### ۱۹. باگ padding موبایل در صفحات فرم
**فایل:** `ProfileForm.tsx` (page variant)
**وضعیت:** صفحه فرم page از `max-w-4xl mx-auto` استفاده می‌کند
ولی padding mobile ندارد (`px-4 md:px-8` در `Layout` هست ولی فرم خودش `p-5 md:p-6` دارد).
**راه‌حل:** بررسی کنید padding در ریزونز موبایل کافی است.

---

### ۲۰. Modal backdrop hardcoded
**فایل:** `Modal.tsx`
**وضعیت:** `bg-slate-900/40` hardcoded است و در dark mode تفاوتی نمی‌کند.
**راه‌حل:** از `dark:bg-slate-950/60` استفاده کنید.

---

### ۲۱. Toast position با mobile bottom nav overlap
**فایل:** `ToastProvider.tsx`
**وضعیت:** Toast در `bottom-20 md:bottom-6` قرار دارد.
bottom nav ارتفاع ~56px (`py-2.5` ≈ 40px + icon + text) دارد.
`bottom-20` = 80px. ممکن است overlap شود.
**راه‌حل:** `bottom-24` یا `bottom-28` برای mobile تست کنید.

---

### ۲۲. Input fields بدون focus ring یکپارچه
**فایل:** `index.css` (.input)
**وضعیت:** `.input` از `focus:ring-4 focus:ring-sage-500/10` استفاده می‌کند.
ولی `*:focus-visible` از `outline: 2px solid` استفاده می‌کند.
این دو با هم conflict دارند.
**راه‌حل:** focus-visible outline را حذف کنید و فقط از ring استفاده کنید، یا بالعکس.

---

### ۲۳. عدم وجود loading skeleton برای بعضی صفحات
**وضعیت:** `SkeletonProfileList`, `SkeletonProfileDetail`, `SkeletonCalendar`,
`SkeletonAppointmentList`, `SkeletonPaymentList` وجود دارد.
ولی برای `MonthlySummaryCard`, `ARAging`, `FollowupsPanel`, `ArrivalsQueue`
skeleton ندارند و `animate-pulse` inline می‌نویسند.
**راه‌حل:** skeleton اختصاصی برای هر dashboard widget بسازید یا الگوی placeholder ثابتی تعریف کنید.

---

## 📋 خلاصه اجرا

| اولویت | تعداد | زمان تقریبی |
|--------|-------|------------|
| 🔴 P0 (بحرانی) | ۴ مورد | ۳–۵ روز |
| 🟠 P1 (بالا) | ۵ مورد | ۲–۳ روز |
| 🟡 P2 (متوسط) | ۶ مورد | ۲–۳ روز |
| 🟢 P3 (پایین) | ۸ مورد | ۱–۲ روز |
| **مجموع** | **۲۳ مورد** | **۸–۱۳ روز** |

---

## 🎯 پیشنهاد اجرایی

1. **هفته ۱:** P0 (رنگ‌ها، dark mode، سیستم رنگی)
2. **هفته ۲:** P1 (الگوهای تکراری، component extraction)
3. **هفته ۳:** P2 (elevation، spacing، typography)
4. **هفته ۴:** P3 (پاکسازی فایل‌های مازاد و بهبودهای جزئی)
