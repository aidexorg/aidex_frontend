# App-wide design identity and horizontal scroll audit

Scope:
- Shared design tokens in `src/index.css` and `tailwind.config.js`
- Shared components in `src/components/design/*` and `src/components/ui.tsx`
- Shell chrome in `src/components/Layout.tsx`
- List surfaces using tabular or toolbar controls: `ProfilesList`, `AppointmentsView`, `PaymentsView`, `FollowupsView`, `ReportsView`, `OutputsView`
- Overflow containers across app surfaces identified by source scan

Audit basis:
- improve-ui audit rules
- current source only
- no `DESIGN.md` found
- design sources: `src/index.css`, `tailwind.config.js`, `src/components/design/*`, `src/components/ui.tsx`, `src/components/Modal.tsx`, `src/components/Layout.tsx`

Note for executor:
- This is read-only audit output. do not treat missing `DESIGN.md` as permission to skip documenting the chosen system.

## Design language
- Audited surface: application-wide design identity and overflow behavior across shared components and list surfaces.
- Design sources: token layer, shared component library, layout shell, and list surface implementations.
- Documented decisions: None documented.
- Governing owners and consumers:
  - token/component system: `src/index.css`, `tailwind.config.js`, `src/components/design/*`, `src/components/ui.tsx`
  - page header identity: `src/components/design/PageHeader.tsx`
  - table scroll container: `src/components/design/DataTable.tsx`
  - tab scroll container: `src/components/design/TabBar.tsx`
  - list-specific toolbar controls: local to each list view
- Explicit exceptions: None documented.

## Findings
| # | Problem | Evidence | Proposed change | Scope | Confidence |
| --- | --- | --- | --- | --- | --- |
| 1 | Horizontal scroll container behavior is inconsistent across surfaces. some surfaces wrap content in `card overflow-hidden` plus inner `overflow-x-auto`, others use only one overflow container, and some long inline rows can overflow visually without a controlled scroll boundary. | `src/components/design/DataTable.tsx:82..83` uses `card overflow-hidden` + inner `overflow-x-auto`. `src/components/design/TabBar.tsx:45` uses `overflow-x-auto`. `src/components/WeeklyCalendar.tsx:197` uses `overflow-x-auto pb-1`. `src/components/MonthlyCalendar.tsx:173`, `src/components/DailyCalendar.tsx:265` use different overflow patterns. `src/components/profile-detail/ProfileDetail.tsx:718` uses `overflow-x-auto` on action row. `src/components/PaymentsView.tsx:113` uses `card overflow-hidden`. | Define one overflow contract for tabular and horizontal scrolling surfaces: each scrollable region uses one explicit horizontal scroll wrapper, and cards that contain wide inline content either scroll internally or constrain content. apply same wrapper pattern to DataTable, TabBar, calendars, and list action rows. | Shared components + list/calendar surfaces | Medium |
| 2 | Page header identity is split between `PageHeader` component and direct `page-title`/`page-sub` usage across views, so the same app header role looks different surface to surface. | `src/components/design/PageHeader.tsx:1..24` defines header with sage dot, title, subtitle, and action slot. `src/components/ProfilesList.tsx` and `src/components/AppointmentsView.tsx` use `PageHeader`. `src/components/PaymentsView.tsx`, `src/components/FollowupsView.tsx`, `src/components/ReportsView.tsx`, `src/components/OutputsView.tsx` use direct heading markup with `page-title` and optional `page-sub`. | Use one page header component for all view levels, or define a documented exception for views that intentionally use custom headings. rename/rework direct heading blocks to reuse `PageHeader` when they represent the same page title role. | View headers across app | Medium |
| 3 | Filter and selection control family is not consistent across list surfaces. same control role uses different visual families: chips, tab bars, and custom inline toggle groups appear side by side in the app. | `src/components/design/StatusPill.tsx` defines patient status pills. `src/index.css:129..132` defines `.chip` and `.chip-active`. `src/components/ProfilesList.tsx:377..427` uses chips for filters and chips for view toggle now. `src/components/FollowupsView.tsx:55..70` uses chips for filters. `src/components/AppointmentsView.tsx:560..582` uses chips for status filters and `CalendarViewTabs` for view switching. `src/components/OutputsView.tsx:320..337` uses custom toggle buttons for output type. | Choose one control family per control role across the app: one style for chip-style filters, one style for view/segment toggles, and reuse them instead of local inline variants. convert custom toggle buttons to the chosen shared toggle primitive where they represent the same selection role. | Shared controls + list surfaces | Low |

## Improve first
Finding 1 has the clearest overflow contract gap: multiple surfaces implement horizontal scrolling in different ways, and some wide inline content can leak outside its container instead of scrolling under a controlled boundary. smallest high-reach correction: define one horizontal scroll wrapper rule and apply it consistently in DataTable, TabBar, calendar views, and list action rows. do not invent new components unless the existing wrapper pattern cannot express the needed behavior.

if you want plans, pick:
- finding 1
- finding 2
- finding 3
- all three

I write separate plan files under `design-plans/` for selected findings.
