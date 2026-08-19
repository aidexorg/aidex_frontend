---
name: dev-pipeline
description: >-
  Runs a phase-based product development tracking pipeline for AI-agent
  workflows: pre-prod docs, adopt mid-flight projects from existing docs,
  phase briefs that update business logic and backlog from user prose with
  claim deduplication, epics/features/tasks with stable IDs, phase switching
  without breaking changes, product-wide shared source of truth for contracts
  across surfaces/services (frontend→backend and new services), surface
  registration, and self-contained task prompt handoffs. Use when the user
  starts with /dev-pipeline, asks to init or adopt a product backlog pipeline,
  brief a phase, create or switch phases, register a new surface/service,
  refresh shared contracts, emit the next agent task prompt, or track
  epic/feature status across multi-agent development.
disable-model-invocation: true
version: 1.3.0
---

# Dev Pipeline

When the user message begins with `/dev-pipeline`, this skill is attached, or they explicitly ask to run the **dev-pipeline** / product tracking pipeline, activate this skill **immediately**.

**Purpose:** Persist product evolution as token-efficient, ID-linked docs so sequential or parallel agents can continue work without losing business-logic integrity or product identity. Emits self-contained task prompts for another agent; does **not** implement product code unless the user also asks.

**Companions:** `/commit` (commit skill) after implementation; `/review-task` (review-task skill) after a task lands.

## Design decisions

1. **Docs are source of truth** — code follows tracked epics/features/tasks; do not invent backlog state not reflected in files.
2. **Phases are switchable** — incomplete phases stay parked; switching must not rewrite IDs or break contracts.
3. **IDs are stable forever** — never renumber; mark superseded instead.
4. **Prompts are handoffs** — write under `agent-prompts/` (gitignored); do not commit prompt bodies unless the user explicitly requires it.
5. **Minimal tokens** — prefer tables, IDs, and short evidence pointers over prose dumps.
6. **Reuse existing docs** — if the repo already has `docs/epics/`, `ROADMAP.md`, etc., **extend** them; do not duplicate parallel trees without cause.
7. **Adopt mid-flight** — for repos already in development with a docs tree, `adopt` reads that tree, records current state with evidence tags, and overlays the pipeline without clobbering existing docs.
8. **Phase briefs with dedup** — user prose about a phase is documentation input; absorb only **new** claims into business rules/backlog; repeats must not rewrite docs; never disturb IDs or in-flight tasks.
9. **Shared SoT for all surfaces** — phases plus `docs/dev-pipeline/SHARED.md` are the **whole source of truth** for contracts, entities, and absorbed product rules when adding a backend during/after frontend or any new service; never fork a parallel contract spine per surface.

## Activation

| Form | Behavior |
|------|----------|
| `/dev-pipeline init [name]` | Bootstrap layout + product identity docs (greenfield) |
| `/dev-pipeline adopt` | Attach pipeline to an **existing** documented project (see [adopt.md](adopt.md)) |
| `/dev-pipeline brief [PH-ID] …` | Ingest user phase descriptions → docs/backlog with claim dedup (see [briefing.md](briefing.md)) |
| `/dev-pipeline backlog` / `/dev-pipeline plan` | Inspect product → create/update backlog (epics/features) |
| `/dev-pipeline phase new <slug>` | Create a phase; optionally set active; trailing prose → first brief |
| `/dev-pipeline phase switch <PH-ID>` | Activate another phase without breaking prior work |
| `/dev-pipeline phase status` | Show active phase + epic/feature summary |
| `/dev-pipeline next` / `/dev-pipeline task` | Emit next ready task prompt under `agent-prompts/` |
| `/dev-pipeline task <FEATURE-ID>` | Emit prompt for a specific feature/task |
| `/dev-pipeline status` | Compact pipeline overview (phases, surfaces, blockers, priorities) |
| `/dev-pipeline shared` / `/dev-pipeline shared status` | Show product-wide shared SoT (`SHARED.md`) |
| `/dev-pipeline shared refresh` | Additive rebuild of shared contract index from docs/phases |
| `/dev-pipeline surface new <slug>` | Register a new surface/service that inherits shared SoT |
| Natural language: “dev pipeline”, «پایپلاین توسعه», «رهگیری فاز», «adopt از روی docs», «درباره این فاز بگو», «brief فاز», «سرویس جدید», «شروع بک‌اند», «shared source of truth» | Same as matching subcommand intent |

Flags may appear anywhere after `/dev-pipeline`:

| Flag | Meaning |
|------|---------|
| `--set-active` | With `phase new`, `adopt`, or `surface new`: mark new/intake phase (and surface) active |
| `--suite <dir>` | Epic suite folder under `docs/` (default: discover) |
| `--docs <dir>` | Docs root for `adopt` (default: discover `docs/`, `documentation/`, …) |
| `--refresh` | With `adopt`: rebuild adoption snapshot + CONTEXT links only |
| `--phase PH-XX` | Target phase for `brief` |
| `--brief-only` | With `brief`: record claims only; skip backlog/rule writes |
| `--kind <kind>` | With `surface new`: `frontend` \| `backend` \| `worker` \| `mobile` \| `bff` \| `shared-lib` \| `other` |
| `--phase-slug <slug>` | With `surface new`: also create a phase for that surface |
| `--dry-run` | Report planned file writes; do not write |

Do not treat ambient coding as this skill unless `/dev-pipeline` or an explicit pipeline ask is present.

## References

- Human user guide (all use cases): [README.md](README.md)
- Folder layout, IDs, statuses, templates: [schema.md](schema.md)
- Phase rules & switching: [phases.md](phases.md)
- Shared SoT + surfaces (multi-service): [shared.md](shared.md)
- Task prompt format: [prompt-template.md](prompt-template.md)
- Mid-flight attach from existing docs: [adopt.md](adopt.md)
- Phase user briefs + claim dedup: [briefing.md](briefing.md)

## Discover project conventions (do not invent)

Look for, in order:

1. `docs/dev-pipeline/PHASES.md` — canonical phase index (this skill)
2. `docs/dev-pipeline/SHARED.md` — product-wide shared SoT (surfaces + authoritative contracts)
3. `docs/dev-pipeline/ADOPTION.md` — last adopt/refresh snapshot (if present)
4. Existing `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/epics/**`, suite folders like `docs/epics-*/`
5. `docs/**/TASK-QUEUE.md` or `**/BOLT-TASK-QUEUE.md`
6. `agent-prompts/` or legacy `bolt-prompts/`
7. Entity/API docs (`docs/**/Entities/`, `*api-contract*`, `*dto*`) — must be indexed in SHARED when used cross-surface
8. Alternate docs roots when adopting: `documentation/`, `Documentation/`, `doc/` (see [adopt.md](adopt.md))

If both legacy and `docs/dev-pipeline/` exist, treat **legacy epic IDs as authoritative**; store phase/queue overlays under `docs/dev-pipeline/` and link out.

## Safety

- Never overwrite unrelated user edits; if a target file is dirty with unrelated changes, surface overlap before editing.
- Never delete epic/feature history; use status `cancelled` / `superseded`.
- Never invent stack, APIs, or architecture — tag Observed / Inferred / Unknown (same evidence rules as Promptize).
- Do not add dependencies. Do not implement product features in this skill unless the user also requested implementation in the same message.
- Destructive doc wipes require explicit confirmation.
- **Briefing:** never renumber IDs; never mutate in-flight/done task rows from repeats; duplicates must not rewrite business-rules/backlog (see [briefing.md](briefing.md)).

## Workflow (sequential)

### 0. Parse

Extract subcommand, IDs, flags, and short request remainder.

### 1. Inspect (task-scoped)

1. Repo root + top-level layout.
2. Existing docs listed above.
3. Active phase from `docs/dev-pipeline/PHASES.md` (or ask if missing and command needs it).
4. `git status` when about to write files.

### 2. Branch by subcommand

#### `init`

1. Create layout per [schema.md](schema.md) (skip files that already exist with real content).
2. Write `docs/PRODUCT.md` (identity, surfaces: frontend/backend/other).
3. Write or link `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`.
4. Write `docs/dev-pipeline/PHASES.md` with no active phase or `PH-00` intake.
5. Write stub `docs/dev-pipeline/SHARED.md` (surfaces from PRODUCT + empty authoritative table, or seed if contract paths already exist).
6. Ensure `.gitignore` contains `agent-prompts/` (and keep `bolt-prompts/` if already ignored).
7. Stop with paths created + next suggested command (`backlog`, `phase new`, or `surface new`).

Use `init` for greenfield. If the repo already has a substantial docs tree, prefer **`adopt`**.

#### `adopt` / `import` / `from-docs`

Attach the pipeline to a mid-flight project by reading its docs folder and recording current state.

1. Follow [adopt.md](adopt.md) fully (discover docs root → inventory → evidence-tagged synthesis → additive writes).
2. Write `docs/dev-pipeline/ADOPTION.md` (source map, built vs open, authoritative paths, unknowns).
3. Create-if-missing only: `PRODUCT.md` / `ARCHITECTURE.md` / `ROADMAP.md` stubs or links; `PHASES.md` + `PH-00-intake` with seeded `CONTEXT.md`; `SHARED.md` seeded from ADOPTION authoritative paths + Observed surfaces.
4. Do **not** invent stack/APIs/features; do **not** emit task prompts; do **not** overwrite contentful existing docs.
5. Stop with adoption report + next suggested command (`backlog`, `phase new`, `surface new`, or `status`).

Aliases: `import`, `from-docs`. Natural language: «از روی مستندات وصل کن», «adopt».

#### `backlog` / `plan`

1. Inspect product + code/docs evidence.
2. Produce/update epic suite README + epic files with stable IDs.
3. For each feature: status, priority, depends-on, co-req, blocks, acceptance sketch.
4. Record cross-links to entities, modules, API contracts, DTOs (paths only).
5. Do **not** emit an agent task prompt unless also `next`/`task` was requested.

#### `phase new` / `phase switch` / `phase status`

Follow [phases.md](phases.md). Switching must preserve all IDs and prior queues.

Before seeding a new/resumed phase CONTEXT: read [shared.md](shared.md) and inherit `SHARED.md` authoritative paths (register the surface first if missing).

After `phase new`, if the user message still contains capability/domain prose (beyond slug and flags), run **one** [briefing.md](briefing.md) pass as `BRIEF-001` for that phase.

#### `shared` / `shared status` / `shared refresh`

Follow [shared.md](shared.md). `status` is read-mostly (create stub only if missing). `refresh` is additive path indexing only — no ID renumbers, no contract body rewrites.

#### `surface new`

Follow [shared.md](shared.md). Registers a new product surface/service that **must** consume the shared SoT. Optionally creates a phase via `--phase-slug`.

Typical flow when starting backend after/during frontend:

1. `/dev-pipeline shared` (confirm spine) or `shared refresh`
2. `/dev-pipeline surface new backend --kind backend --phase-slug backend-api --set-active`
3. `/dev-pipeline brief …` for backend capabilities (dedup against SHARED + CLAIMS)
4. `/dev-pipeline next` — prompts cite Shared SoT

#### `brief` / `tell` / `phase brief` / `intake-notes`

Ingest user descriptions of phase capabilities as documentation; update business logic and backlog for **new** claims only.

1. Follow [briefing.md](briefing.md) fully (resolve phase → read `CLAIMS.md` → classify new/duplicate/refinement/contradiction → persist BRIEF → apply only allowed deltas).
2. Treat verbatim user prose as Observed documentation input (store under `briefs/BRIEF-*.md`).
3. **Duplicates:** ledger note only — do not re-edit docs or backlog.
4. **Never** renumber IDs, delete queue rows, change `in_progress`/`done`/`review` task status, or switch phases as a side effect.
5. Do not emit `agent-prompts/` during `brief`.
6. Stop with classification table + paths touched + any contradictions needing user input.

#### `next` / `task`

1. Resolve active phase + queue.
2. Pick highest-priority **ready** item (deps satisfied, not blocked).
3. Write one self-contained prompt via [prompt-template.md](prompt-template.md) to `agent-prompts/{TASK-ID}.md`.
4. Set queue row to `ready` or `in_progress` as appropriate.
5. Tell the user to hand that file to the implementing agent; mention `/commit` after work and `/review-task` after commit/push.

#### `status`

Emit a compact table: active phase, surfaces from SHARED, epic/feature counts by status, blockers, next ready IDs. No file writes unless fixing a broken index was requested.

### 3. Stop

Default: documentation + prompt handoff only. Implementation belongs to the other agent (or a separate user ask).

## Context loading order (for agents using the docs)

When reading pipeline docs, load **only** what the current task needs, in this order:

1. `docs/PRODUCT.md` (identity — short)
2. `docs/dev-pipeline/SHARED.md` if present (product-wide contract spine + surfaces — especially when adding/continuing a service)
3. `docs/dev-pipeline/ADOPTION.md` if present (source map — especially after mid-flight adopt)
4. `docs/dev-pipeline/PHASES.md` → active phase README
5. Active phase `briefs/CLAIMS.md` when interpreting domain rules for that phase
6. Active `TASK-QUEUE.md` row for the task
7. Parent epic file section for the feature
8. Linked contract/entity/business-rule paths cited by that feature **and** by SHARED
9. Skip unrelated suites

## Out of scope for this skill

- Implementing application code (unless user separately asks)
- `/commit` or `/review-task` workflows (delegate to those skills)
- Rewriting legacy epic IDs
- Opening PRs / force-push / destructive git
- Replacing Promptize for one-off engineering specs (use `/promptize` for that)
- Using `adopt` to invent a full backlog without doc evidence (use `backlog` after adoption with user confirmation)
- Using `brief` to reshuffle or renumber the entire backlog (additive deltas + explicit cancel/supersede only)
- Forking a second API/DTO/entity spine for a new surface instead of extending `SHARED.md`
