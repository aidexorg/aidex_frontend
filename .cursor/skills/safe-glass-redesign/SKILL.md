---
name: safe-glass-redesign
description: >-
  Redesigns a single page to light frosted glassmorphism while preserving
  stone+amber visual identity and without breaking changes or logic side
  effects. Use when the user asks for glassmorphism redesign, glass depth,
  frosted UI, dashboard-style glass on another page, or safe visual-only
  restyle with no behavior changes.
disable-model-invocation: true
---

# Safe Glassmorphism Redesign (Visual Only)

## When invoked

Follow this workflow exactly. Scope is one page (or the paths the user names). Do not widen to the whole app unless asked.

## Goal (verbatim)

هدف: ریدیزاین VISUAL فقط به glassmorphism برای این صفحه:
[مسیر صفحه را از پیام کاربر بگیر — مثلاً `src/pages/AssessmentsPage.tsx` و کامپوننت‌های UI اختصاصی‌اش]

## Hard constraints (verbatim)

قیدهای سخت (بدون استثنا):
1. بدون breaking change: routing، props، handlers، API calls، state shape، validation، navigation، و behavior فعلی دست‌نخورده بماند.
2. بدون side effect: منطق کسب‌وکار، data fetching، persistence، و صفحات دیگر تغییر نکنند مگر import کلاس‌های مشترک pure UI.
3. فقط className / markup تزئینی / لایه‌های atmospheric مجاز است. منطق را جابه‌جا یا refactor نکن مگر برای extract توکن CSS/class بدون تغییر رفتار.
4. dependency جدید اضافه نکن (بدون framer-motion و مشابه).
5. commit نکن مگر صریحاً بگویم.

## Visual identity (verbatim)

هویت بصری (حفظ شود — مرجع: Dashboard glass):
- پالت: stone + amber (نه purple، نه teal عمومی، نه dark-mode کل اپ)
- الگوی مرجع: DashboardPage + DASH_GLASS_BASE در DashboardCharts
  - elev-1: frosted panel با border-white، backdrop-blur، inset highlight
  - elev-2: hero/header قوی‌تر
  - icon wells شیشه‌ای؛ CTA اصلی amber-600
- Layout سراسری / sidebar را عوض نکن
- اگر صفحه داخل Layout است، فقط ناحیهٔ content صفحه را گلس کن

## Glass depth (verbatim)

عمق گلس (کمتر flat):
- چند سطح elevation، نه یک کارت سفید یکنواخت
- پس‌زمینهٔ atmospheric ملایم (orbs/wash) تا شیشه شفاف دیده شود
- specular inset + سایهٔ بیرونی خوانا
- حداکثر ۲–۳ motion کوتاه (مثلاً enter/hover lift)؛ prefers-reduced-motion را رعایت کن

## Codebase anchors

Reuse before inventing:

- `src/pages/DashboardPage.tsx` — `glassElevated`, `glassQuiet`, `glassIconWell`, atmosphere orbs
- `src/features/dashboard/DashboardCharts.tsx` — `DASH_GLASS_BASE`
- `src/index.css` — `.dash-enter` / `prefers-reduced-motion` (reuse or mirror locally; do not break other pages)

If extracting shared tokens for reuse across pages: pure class-string module only, no behavior change, and keep dashboard imports working (re-export if moved).

## Workflow

1. List briefly which files and which class/tokens you will touch.
2. Implement visual-only changes on the named page scope.
3. End with verification checklist (desktop/mobile, hover/focus, contrast, prior behavior intact).
4. Explicitly state what you deliberately did **not** change.

## Output (verbatim)

خروجی کار:
1. اول لیست کوتاه «چه فایل‌هایی و چه کلاس‌هایی» را بگو، بعد پیاده کن
2. در پایان: چک‌لیست verification (دسکتاپ/موبایل، hover/focus، خوانایی کنتراست، رفتار قبلی intact)
3. صریحاً بگو چه چیزهایی را عمداً تغییر ندادی

## Limits (verbatim)

محدودیت‌ها:
- UI redesign ساختاری / تغییر IA / حذف سکشن‌ها ممنوع
- متن‌ها و copy را عوض نکن مگر برای فاصله‌گذاری بی‌اثر
- docs/markdown جدید نساز

## Agent checklist

- [ ] Page scope clear (or asked user)
- [ ] No logic / API / routing / state changes
- [ ] stone + amber identity preserved
- [ ] Dashboard glass pattern reused where possible
- [ ] Layout/sidebar untouched
- [ ] No new dependencies
- [ ] No commit unless user asked
- [ ] Verification checklist delivered
