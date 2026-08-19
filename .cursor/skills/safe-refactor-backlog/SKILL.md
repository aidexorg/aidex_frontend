---
name: safe-refactor-backlog
description: >-
  Analyzes src/ and produces a prioritized, evidence-based refactor backlog
  focused on modularity, reusability, lower coupling, and anti-pattern reduction
  — analysis only, no code changes. Use when the user asks for a refactor
  backlog, safe refactor plan, modularity/coupling review, anti-pattern audit,
  or prioritized mechanical refactors without breaking changes.
disable-model-invocation: true
---

# Safe Refactor Backlog (Analysis Only)

## When invoked

Follow this workflow exactly. Do not improvise scope.

## Goal (verbatim)

هدف: فقط ANALYSIS و PRIORITIZED REFACTOR BACKLOG — هنوز هیچ کدی را تغییر نده و هیچ commit/PR نساز مگر اینکه صریحاً بگویم.

سورس را در `src/` آنالیز کن (به‌خصوص `pages/`, `features/`, `api/`, `domain/`, `components/`, `lib/`, `hooks/`, `types/`). هدف refactor:
- افزایش modularity و reusability
- کاهش coupling
- حذف/کاهش anti-patternها

## Hard constraints (verbatim)

قیدهای سخت:
1. بدون side effect و بدون breaking change در رفتار UI/API/routing/types عمومی.
2. فقط پیشنهادهایی که می‌توانند به‌صورت mechanical/safe انجام شوند (extract، move، rename داخلی، split file، shared util، thin wrapper).
3. چیزهایی که رفتار محصول را عوض می‌کنند، redesign فیچر، یا rewrite بزرگ هستند را جداگانه با برچسب OUT_OF_SCOPE بگذار.
4. حدس نزن؛ برای هر مورد حداقل یک evidence از کد بیاور (مسیر فایل + نماد/الگوی تکراری).
5. اول ساختار و نقاط داغ duplication/coupling را پیدا کن، بعد لیست نهایی را بساز.

## Priority criteria (verbatim)

معیار اولویت (ضروری‌ترین اول):
- P0: coupling بالا یا duplication که الان مانع تغییر ایمن است / god files / circular deps مشکوک
- P1: anti-pattern واضح با reuse فوری (copy-paste بین pages/features، API helpers تکراری، UI primitives پراکنده)
- P2: بهبود modularity مفید ولی غیرمسدودکننده
- P3: neatness / consistency اختیاری

## Per-item template (verbatim)

برای هر مورد دقیقاً این قالب را پر کن:

### R-XX — عنوان کوتاه
- Priority: P0|P1|P2|P3
- Location: فایل‌ها/ماژول‌ها
- Evidence: چه چیزی الان اشتباه/تکراری/coupled است (با ارجاع فایل)
- Anti-pattern / smell: نام مشخص (مثلاً God Component, Shotgun Surgery, Feature Envy, Duplicate Abstraction, Leaky API layer, …)
- Proposed refactor: گام‌های کوچک و ایمن
- Why it improves modularity/reusability/coupling
- Risk of breaking change: Low/Med + چگونه صفر نگه داشته شود (public API پایدار، barrel re-export، تست‌های موجود)
- Suggested verification: `npm test` / typecheck / صفحات متأثر
- Effort: S/M/L
- Dependencies: آیا به R-YY وابسته است؟

## Final output (verbatim)

خروجی نهایی:
1. خلاصه ۱ پاراگرافی از وضعیت معماری فعلی
2. لیست مرتب‌شده P0 → P3 (حداکثر ۱۵ مورد باکیفیت؛ کم‌ارزش‌ها را ادغام یا حذف کن)
3. جدول سریع: ID | Priority | Title | Effort | Risk
4. پیشنهاد ترتیب اجرای ۳ مورد اول به‌صورت PRهای کوچک و مستقل
5. صریحاً بگو چه چیزهایی را عمداً refactor نمی‌کنی و چرا

## Limits (verbatim)

محدودیت‌ها:
- UI redesign نکن
- dependency جدید پیشنهاد نکن مگر ضروری و با دلیل
- docs را فقط اگر برای فهم معماری لازم است بخوان؛ فایل markdown جدید نساز

## Agent checklist

- [ ] No file edits, commits, or PRs
- [ ] Scoped to `src/` (or user-narrowed paths)
- [ ] Hotspots found before ranking
- [ ] Every R-XX has code evidence
- [ ] ≤15 items, P0→P3 sorted
- [ ] OUT_OF_SCOPE called out separately
- [ ] No new markdown files written
