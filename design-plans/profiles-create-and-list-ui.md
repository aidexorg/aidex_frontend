# Profiles create flow and profiles list UI plan

Scope:
- ProfileForm create/edit flow variants (modal + page) in `src/components/ProfileForm.tsx`
- ProfilesList toolbar and empty state in `src/components/ProfilesList.tsx`
- Appointments empty create action only as comparison reference in `src/components/AppointmentsView.tsx`

Audit basis:
- improve-ui audit of create profile and profiles list surfaces
- repo commit `78e8115`
- no `DESIGN.md` present; design sources are `src/index.css`, `tailwind.config.js`, `src/components/design/*`, `src/components/Modal.tsx`, `src/components/ui.tsx`

Note for executor:
- This plan is read-only output from the audit. Do not treat missing `DESIGN.md` as approval to skip documenting the decision. Record the accepted design decision somewhere the product team can find it after the change.

---

## Finding 1: profiles list toolbar view toggle uses a different control family than status filters

Problem:
- Status filters use `chip`/`chip-active`.
- View toggle uses a custom pill with active classes `bg-sage-50 text-sage-700`.
- Both controls live in the same toolbar group and both represent user selection.

Evidence:
- `src/components/ProfilesList.tsx:407..437` implements the view toggle as an inline button group with custom active/inactive classes.
- `src/components/ProfilesList.tsx:374..381` implements status filters with `chip-active` / `chip`.
- `src/index.css:129..132` defines `.chip` and `.chip-active`.
- Appointments list does not use a custom inline pill for view switching; it uses `CalendarViewTabs` instead, so profiles list is the surface where the custom pill appears.

Chosen correction:
- Make the view toggle use the same chip control family as status filters, or give both toolbar controls one shared toolbar control primitive.

Required change:
- In `src/components/ProfilesList.tsx`, replace the custom inline pill active/inactive classes for the view toggle with `chip` and `chip-active`.
- Keep icon + label structure if it still fits the chip shape. If chip shape cannot express the toggle visually, define one shared toolbar toggle primitive and use it for both controls instead of two unrelated styles.

Exact reusable primitives:
- `.chip` and `.chip-active` from `src/index.css:129..132`
- If the chip shape is unsuitable, introduce one primitive owned by the profiles list toolbar or design system, not two local inline styles.

Affected surfaces:
- `src/components/ProfilesList.tsx`

Decision record:
- Pick one control family for toolbar selection controls: chips, or a shared toolbar toggle primitive.
- If view toggle intentionally differs from filter chips, document that difference explicitly.

---

## Finding 2: empty-state create action color differs by surface

Problem:
- Profiles list empty create action uses `btn-sage`.
- Appointments empty create action uses `btn-primary`.
- Both are primary creation actions from an empty list state.

Evidence:
- `src/components/ProfilesList.tsx:470..488` uses `btn-sage` for the empty create action.
- `src/components/AppointmentsView.tsx:608..613` uses `btn-primary` for the empty create action.
- `src/index.css:76..84` defines `.btn-primary`, `.btn-sage`, and related button tokens.

Chosen correction:
- Choose one primary create action color for empty-state creation flows, or document intentional per-surface difference.

Required change:
- In `src/components/ProfilesList.tsx`, set the empty create action to the same primary button token chosen for empty creation flows.
- In `src/components/AppointmentsView.tsx`, keep or align to the same choice if the product decision is unification. If the decision is per-surface ownership, document why appointments empty action is `btn-primary` while profiles empty action is `btn-sage`.

Exact reusable primitives:
- `.btn-primary` and `.btn-sage` from `src/index.css:76..84`

Affected surfaces:
- `src/components/ProfilesList.tsx`
- `src/components/AppointmentsView.tsx`

Decision record:
- Empty creation action should use one primary color across list surfaces, or each surface should own its own rule explicitly.

---

## Finding 3: create profile modal variant header differs from page variant header

Problem:
- Modal variant uses a teal gradient header block with a white avatar chip.
- Page variant uses a plain slate heading and no header block.
- Both branches handle the same create/edit task and same form fields.

Evidence:
- `src/components/ProfileForm.tsx:127..140` implements the modal header block with `from-teal-600 to-teal-700` and avatar chip.
- `src/components/ProfileForm.tsx:258..265` implements the page heading as `text-lg font-bold text-slate-900` inside a card.
- `src/components/Modal.tsx:58` shows modal title styling, but the teal header block is introduced inside `ProfileForm`, not in `Modal`.

Chosen correction:
- Unify the create profile header treatment across modal and page variants, or document that each variant intentionally owns a different header style.

Required change:
- Create one owned header block for the create/edit profile task and use it in both variants, or align the page variant header to the modal header style if the gradient block is the chosen identity.
- If the gradient block is only meant for the modal, move that intent into documentation and keep page variant header as a separate, documented choice.

Exact reusable primitives:
- Existing avatar chip pattern in `ProfileForm` modal header
- Existing `ProfileForm` page heading pattern
- If unified, reuse one header component or one explicit header JSX block in `ProfileForm`

Affected surfaces:
- `src/components/ProfileForm.tsx`

Decision record:
- Choose one header identity for create/edit profile, or define which variant owns which header style.

---

## Execution order

1. Decide toolbar control family for finding 1 before touching button token ownership, because the toolbar is the most local and self-contained change.
2. Decide empty create action color for finding 2. this decision affects button usage in more than one surface.
3. Unify or document create profile header treatment for finding 3 last, because it is the largest visual change and can depend on whether the product wants a stronger header identity for profile creation.

## Doc update note

After changes, record one short design note covering:
- toolbar selection control family used in profiles list
- primary create action color rule for empty states
- create profile header identity rule across modal and page variants

If `DESIGN.md` is created later, place these decisions there. If not, record them where the product team keeps UI decisions.
