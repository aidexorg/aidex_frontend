# Dev Pipeline Schema

Read from `SKILL.md` when creating or updating pipeline docs.

## Default layout

Create only what is missing. Prefer linking existing docs over duplication.

```text
docs/
  PRODUCT.md                 # product identity, surfaces, non-goals
  ARCHITECTURE.md            # modules, boundaries (or link if exists)
  ROADMAP.md                 # coarse completed vs remaining
  dev-pipeline/
    PHASES.md                # phase index + active pointer
    SHARED.md                # product-wide shared SoT: surfaces + authoritative contracts
    ADOPTION.md              # mid-flight adopt/refresh snapshot (optional until adopt)
    phases/
      PH-00-intake/          # optional intake after adopt/init
        README.md
        TASK-QUEUE.md
        CONTEXT.md
      PH-01-<slug>/
        README.md            # goals, status, switch notes, contract freeze → SHARED
        TASK-QUEUE.md        # ordered tasks for this phase
        CONTEXT.md           # compact map: entities ↔ modules ↔ APIs/DTOs (links SHARED)
        briefs/              # user phase briefs + claim ledger (see briefing.md)
          README.md
          CLAIMS.md
          BRIEF-001.md
  epics/                     # or docs/<suite>/ — epic index + epic files
  business-rules/            # optional; seeded/extended by phase briefs; indexed in SHARED
  # optional domain trees already in repo:
  # backend/Entities/, api-contract-and-dtos.md, etc. — one spine via SHARED, no forks

agent-prompts/               # gitignored handoff prompts (required)
```

If the repo already uses `docs/epics/`, `docs/backend/epics/`, or `docs/epics-*/`, **keep those paths**. Put only phase/queue/shared overlays under `docs/dev-pipeline/`.

### Greenfield vs mid-flight

| Command | Use when |
|---------|----------|
| `init` | Little/no product docs; bootstrap empty layout |
| `adopt` | Project already developing; docs tree exists — read it, map state, overlay pipeline |
| `brief` | User describes phase capabilities in prose — absorb as docs; dedupe repeats |
| `surface new` / `shared refresh` | New service/surface or rebuild shared contract index — see [shared.md](shared.md) |

`adopt` details: [adopt.md](adopt.md). `brief` details: [briefing.md](briefing.md). Shared SoT: [shared.md](shared.md). Do not duplicate existing doc bodies; link and cite paths with Observed / Inferred / Unknown.

## ID scheme (stable, token-cheap)

| Kind | Pattern | Example |
|------|---------|---------|
| Phase | `PH-{NN}` | `PH-01` |
| Surface | `SUR-{NN}` | `SUR-01` |
| Epic | `EPIC-{SUFFIX}` | `EPIC-ASK` |
| Feature | `{SUFFIX}-{NN}` | `ASK-01` |
| Task | `TASK-{FEATURE}-{NN}` | `TASK-ASK-01-01` |
| Rework | `{TASK-ID}-R{N}` | `TASK-ASK-01-01-R1` |

Rules:

- `{SUFFIX}` = short uppercase token (2–8 chars), unique across the product.
- Never reuse or renumber IDs. Cancel or supersede instead.
- Feature IDs appear in queues, commits messages (optional), and prompts — keep them scannable.
- One **task** = one agent session of work (small enough for clear AC).
- **Brief claim IDs** `CLM-{NNN}` and **brief session IDs** `BRIEF-{NNN}` are per-phase, stable, never renumbered (see [briefing.md](briefing.md)).
- Phase briefs must not allocate a new `PH-*` or reshuffle existing Task/Feature IDs.
- **Surface IDs** `SUR-*` are product-wide, stable; see [shared.md](shared.md).

## Status legend

| Status | Meaning |
|--------|---------|
| `todo` | Not started |
| `ready` | Deps met; can be prompted |
| `in_progress` | Prompt issued / work underway |
| `blocked` | Waiting on dependency or decision |
| `partial` | Usable but incomplete |
| `done` | AC + DoD met (after review PASS) |
| `cancelled` | Will not do |
| `superseded` | Replaced by another ID (link it) |

## Priority

Use `P0` (blocking product), `P1` (high), `P2` (normal), `P3` (later).  
Queue order = active phase → `P0`…`P3` → explicit `order` column → Feature ID.

## Dependency fields (required on features/tasks)

| Field | Meaning |
|-------|---------|
| `depends_on` | Must be `done` (or accepted `partial`) before start |
| `co_req` | Should ship in the same phase window; coordinate contracts |
| `blocks` | IDs that cannot proceed until this is done |
| `blocked_by` | Inverse view (optional; can be derived) |

## `PHASES.md` template

```markdown
# Phases

**Active:** `PH-01`

| Phase ID | Slug | Status | Goal (one line) | Queue |
|----------|------|--------|-----------------|-------|
| PH-01 | frontend-mvp | active | … | [TASK-QUEUE](./phases/PH-01-frontend-mvp/TASK-QUEUE.md) |
| PH-02 | backend-api | parked | … | [TASK-QUEUE](./phases/PH-02-backend-api/TASK-QUEUE.md) |
```

## Phase `README.md` (minimum)

- Goal, in-scope surfaces (frontend / backend / …) with `SUR-*` links when registered
- Status: `active` | `parked` | `done`
- Contract freeze: authoritative API/DTO/entity docs — **must match** `docs/dev-pipeline/SHARED.md` (subset allowed with note); no private fork
- Switch notes: why parked / what remains
- Links to epic suite(s) and SHARED

## Phase `CONTEXT.md` (minimum)

Compact tables only:

```markdown
# PH-01 context

## Shared SoT
- Index: `docs/dev-pipeline/SHARED.md`
- Surfaces in this phase: `SUR-01` (… )

## Entities ↔ modules
| Entity | Module / path | Notes |
|--------|---------------|-------|

## API / DTO contracts
| Contract | Path | Consumers |
|----------|------|-----------|

## Invariants (do not break across phases)
- …

## Changed by
| Task / event | Note |
|--------------|------|
| adopt | Initial seed from docs root `…` (if applicable) |
| shared | Seeded/refreshed from SHARED.md |
| brief BRIEF-001 | … |
```

After `adopt`, seed tables from `ADOPTION.md` authoritative paths (paths + short notes only) **and** mirror them into `SHARED.md`.
After `phase new` / `surface new` / `shared refresh`, CONTEXT must inherit SHARED paths before inventing local notes.
After `brief`, append invariants only for **new** claims; cite `CLM-*`; update SHARED when claims introduce or refine contracts.

## Phase `briefs/` (user documentation input)

Per-phase folder for natural-language capability briefs:

| File | Role |
|------|------|
| `briefs/CLAIMS.md` | Dedup ledger (`CLM-*`); source of truth for “already said” |
| `briefs/BRIEF-{NNN}.md` | Verbatim user input + per-session classification |
| `briefs/README.md` | How agents must treat briefs |

Full rules: [briefing.md](briefing.md).

## `TASK-QUEUE.md` template

```markdown
# TASK-QUEUE — PH-01

| Order | Task ID | Feature | Title | Priority | Status | depends_on | blocks | Prompt |
|------:|---------|---------|-------|----------|--------|------------|--------|--------|
| 1 | TASK-ASK-01-01 | ASK-01 | Accept answer API+UI | P0 | ready | — | ASK-02 | |
```

Update the Prompt column to `agent-prompts/TASK-….md` when emitted.

## Epic file (minimum feature table)

```markdown
# EPIC-ASK — …

**Epic ID:** `EPIC-ASK`

| Feature ID | Feature | Status | Priority | depends_on | co_req | blocks |
|------------|---------|--------|----------|------------|--------|--------|
| ASK-01 | … | todo | P0 | — | — | ASK-02 |

## ASK-01 — title

**Status:** todo

### Acceptance
- …

### Links
- Entity: `docs/…`
- Contract: `docs/…`
```

## PRODUCT.md (minimum)

- Name + one-sentence identity
- Surfaces in scope (e.g. frontend only / frontend+backend) — keep in sync with SHARED Surfaces table
- Non-goals
- Link to architecture + active phase + `docs/dev-pipeline/SHARED.md`

When created by `adopt`, prefer linking Observed identity sources over rewriting them. Point to `docs/dev-pipeline/ADOPTION.md`.

## `SHARED.md` (product-wide SoT)

Written/updated by `init`, `adopt`, `shared refresh`, `surface new`, and phase create/switch seeding. Holds:

- Surfaces registry (`SUR-*`)
- Authoritative shared paths (entities, API/DTO, business rules, architecture, ADRs)
- Inheritance log

Full template and commands: [shared.md](shared.md).

## `ADOPTION.md` (mid-flight)

Written by `adopt` / `adopt --refresh`. Holds:

- Docs root + discovery rule
- Source map (category → path → evidence)
- Built vs open table
- Authoritative contract/entity/decision paths
- Unknowns / blockers
- Next suggested commands

Full template: [adopt.md](adopt.md).

## Business rules (from briefs)

Prefer `docs/business-rules/` (or an existing domain-rules path discovered by `adopt`). Briefs may **add** rules cited by `CLM-*`; they must not silently replace contradicted rules — ask first.

## Gitignore

Ensure:

```gitignore
agent-prompts/
```

Keep existing `bolt-prompts/` ignore entries if present.
