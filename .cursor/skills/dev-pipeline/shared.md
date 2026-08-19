# Shared Source of Truth (product-wide)

Read from `SKILL.md` when registering surfaces, creating phases for a new part of the system, refreshing shared contracts, or emitting task prompts that must stay aligned across frontend/backend/services.

**Purpose:** When the product grows a new surface (e.g. backend during or after frontend, a second API, a worker), **phases + shared contracts** are the **whole source of truth** for every new service. Agents must not invent parallel business rules, APIs, DTOs, or entity models per surface.

## Core idea

| Layer | Role |
|-------|------|
| `docs/dev-pipeline/SHARED.md` | Product-wide index: surfaces + authoritative shared paths |
| Phase `README` contract freeze | Points **into** SHARED (and cited docs); does not fork contracts |
| Phase `CONTEXT.md` | Local map for that window; links SHARED rows; additive notes only |
| Epic / feature Links | Cite the same shared paths |
| Task prompts | Mandatory **Shared SoT** section; implementers consume, do not reinvent |

**Invariant:** There is one shared contract spine for the product. New phases and new services **extend** it additively or open an explicit dual-consumer breaking-change task — they never create a second spine.

## When this applies

| Situation | Behavior |
|-----------|----------|
| Frontend phase already exists; starting backend | Register surface `backend` (if missing); `phase new` seeds from `SHARED.md` + prior freezes |
| Backend and frontend in parallel | Same SHARED index; cross-phase `depends_on` / `co_req` / `blocks`; both freezes cite SHARED |
| New service (worker, BFF, mobile API) | `/dev-pipeline surface new <slug>` then phase(s); inherit SHARED |
| Contracts discovered via `adopt` / `brief` | Refresh SHARED authoritatively (paths only); do not duplicate bodies |

## File: `docs/dev-pipeline/SHARED.md`

Create on `init`, `adopt` (create-if-missing), `shared refresh`, or first `surface new` / `phase new` that needs it.

### Template

```markdown
# Shared Source of Truth

**Product:** {link docs/PRODUCT.md}
**Last refreshed:** {ISO or local timestamp} ({event: init|adopt|shared refresh|surface new|phase switch})

## Rule (non-negotiable)

All surfaces and phases consume the paths below as the product-wide contract spine.
Do **not** invent parallel API/DTO/entity/business-rule trees for a new service.
Extend additively; breaking changes need an explicit task + dual-surface note.

## Surfaces

| Surface ID | Slug | Kind | Status | Owning phases | Notes |
|------------|------|------|--------|---------------|-------|
| SUR-01 | frontend | frontend | active | PH-01 | … |
| SUR-02 | backend | backend | planned | PH-02 | … |

Kind values: `frontend` | `backend` | `worker` | `mobile` | `bff` | `shared-lib` | `other`

Status: `planned` | `active` | `parked` | `done`

## Authoritative shared paths

| Category | Path | Consumers (surfaces) | Evidence |
|----------|------|----------------------|----------|
| Entities | `docs/…` | frontend, backend | Observed from … |
| API / DTO | `docs/…` | … | … |
| Business rules | `docs/…` | … | … |
| Architecture boundaries | `docs/ARCHITECTURE.md` | all | … |
| Decisions / ADR | `docs/…` | … | … |

## Inheritance log

| Event | What was inherited / added |
|-------|----------------------------|
| adopt | Seeded from ADOPTION.md authoritative paths |
| phase switch PH-01→PH-02 | PH-02 CONTEXT linked SHARED rows |
| surface new SUR-02 | Backend registered; consumers column updated |
```

## Surface IDs

| Kind | Pattern | Example |
|------|---------|---------|
| Surface | `SUR-{NN}` | `SUR-01` |

Rules: never reuse or renumber; cancel/supersede with a note. Stable forever (same spirit as Phase/Epic IDs).

## Commands

### `shared` / `shared status`

1. Ensure `SHARED.md` exists (create stub from PRODUCT + discoverable contract paths if missing).
2. Print surfaces table + authoritative paths + which active phase freezes cite them.
3. No writes unless the file was missing (create-only).

### `shared refresh`

1. Inspect: `ADOPTION.md` (if any), all phase README freezes, `CONTEXT.md` contract tables, discovered `*api*/*dto*/Entities/business-rules` paths (Observed only).
2. **Additive** update of Authoritative shared paths and Consumers columns.
3. Do **not** delete rows that still have consumers; mark obsolete paths `superseded → {new path}` instead of removing history.
4. Append Inheritance log.
5. Stop with a short diff summary (paths added / consumers updated).

Flags: `--dry-run` (report only).

### `surface new <slug>`

Register a new part of the system that must inherit the shared spine.

1. Allocate next `SUR-{NN}`; add Surfaces row (`status: planned` unless `--set-active`).
2. Ensure `SHARED.md` exists; if empty authoritative table, seed from adopt/phase freezes/architecture (paths only).
3. Update Consumers on relevant shared paths to include the new surface.
4. Optionally create a phase: `--phase-slug <slug>` runs `phase new` seeded from SHARED (see below). With `--set-active`, activate that phase (park prior active first).
5. Do **not** copy contract doc bodies into the new surface folder; link SHARED only.
6. Stop with SUR-ID, SHARED path, and next command (`phase new` if no phase created, or `brief` / `backlog`).

Flags:

| Flag | Meaning |
|------|---------|
| `--kind <frontend\|backend\|…>` | Surface kind (default: Infer from slug; else ask if ambiguous) |
| `--phase-slug <slug>` | Also create `PH-*` for this surface |
| `--set-active` | Mark surface active; if phase created, set that phase active |
| `--dry-run` | Report only |

Natural language: «سرویس جدید», «شروع بک‌اند», «surface جدید», «shared source of truth».

## Phase create / switch — SHARED seeding (mandatory)

When `phase new` or `phase switch` targets work for a surface that is new or resumed:

1. Read `SHARED.md` first (create stub if missing).
2. Seed or refresh phase `CONTEXT.md` **from SHARED authoritative paths** (plus prior phase freeze notes) — paths + short notes only.
3. Phase README **Contract freeze** must list the same SHARED paths (or a subset with justification); never a private fork.
4. If the phase is for a surface not yet in SHARED, run the `surface new` registration steps first (or inline allocate SUR-*).
5. On switch into a backend (or other) phase after frontend: Inheritance log entry; mark queue items whose shared deps are satisfied as `ready`.

## Brief / backlog interaction

- **Brief:** new claims that introduce contracts must **add or refine SHARED paths** (or ask on contradiction with SHARED), not only phase-local CONTEXT.
- **Backlog:** feature Links for cross-surface work must cite SHARED paths; `co_req` when FE+BE must share the same contract change.

## Multi-surface / multi-service rules

1. **One spine** — SHARED is the whole SoT for contracts + absorbed product rules cited there.
2. **Phases remain switchable** — parking FE to build BE (or parallel agents) does not split the spine.
3. **Extend, don’t fork** — additive OpenAPI/DTO/entity fields preferred; breaking change = explicit task + note on every consumer surface.
4. **Prompts bind to SHARED** — see [prompt-template.md](prompt-template.md) Shared SoT section.
5. **Code follows docs** — implementers follow SHARED paths; they do not invent a second API story “just for backend.”

## Anti-patterns (forbid)

- Creating `docs/backend/api-contract.md` that duplicates `docs/api-contract.md` without linking SHARED and declaring one authoritative
- Phase CONTEXT that lists invented endpoints absent from SHARED / frozen contracts
- Task prompts that omit Shared SoT when the feature touches more than one surface
- Renumbering SUR-* or deleting SHARED history

## Out of scope for shared.md mechanics

- Implementing application services
- Choosing frameworks/stacks (still Observed/Inferred/Unknown from repo)
- Replacing Promptize for one-off specs
```