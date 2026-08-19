# Adopt existing project

Read from `SKILL.md` when running `/dev-pipeline adopt` (aliases: `import`, `from-docs`).

**Purpose:** Attach the pipeline to a repo that **already has documentation and ongoing development**, by reading the project docs tree, synthesizing current product state with evidence tags, and creating **additive** pipeline overlays — without inventing architecture or wiping existing docs.

## When to use

| Situation | Command |
|-----------|---------|
| Greenfield / empty docs | `init` then `backlog` |
| Mid-flight project with docs | **`adopt`** then optionally `backlog` / `phase new` |
| Pipeline already present; refresh map only | `adopt --refresh` |

## Flags

| Flag | Meaning |
|------|---------|
| `--docs <dir>` | Docs root to scan (default: discover) |
| `--suite <dir>` | Epic suite under `docs/` when creating/linking backlog (same as global) |
| `--dry-run` | Report planned reads/writes; write nothing |
| `--refresh` | Rebuild `ADOPTION.md` + refresh `CONTEXT.md` links only; do not recreate PRODUCT/ROADMAP if they exist |
| `--set-active` | After creating intake/`PH-00` or first phase, mark it active |

## Docs-root discovery (do not invent)

Resolve **one** docs root, in order:

1. Explicit `--docs <dir>` (must exist)
2. `docs/` at repo root
3. `documentation/` or `Documentation/`
4. `doc/`
5. Paths named in `README.md` as the docs folder (Inferred — cite the README line)
6. If none found: **ask** (blocking) — do not invent a docs tree

Record the chosen root and discovery rule in `ADOPTION.md`.

## Inspect procedure (mandatory before writes)

Task-scoped; prefer indexes and high-signal files over dumping every page.

### 1. Inventory

List files under the docs root (and one level of common subfolders). Categorize each hit:

| Category | Typical names / patterns |
|----------|---------------------------|
| Identity | `PRODUCT*`, `VISION*`, `ABOUT*`, README product sections |
| Architecture | `ARCHITECTURE*`, `DESIGN*`, `C4*`, `SYSTEM*` |
| Roadmap / status | `ROADMAP*`, `STATUS*`, `CHANGELOG*`, `TODO*`, milestone docs |
| Epics / features | `epics/**`, `features/**`, `backlog/**`, user-story trees |
| Domain / entities | `Entities/`, `domain/`, `models/`, glossary |
| API / contracts | `*api*`, `*dto*`, `*contract*`, OpenAPI/Swagger links |
| Decisions | `decisions/`, `adr/`, `ADR-*` |
| Business rules | `business-rules/`, `invariants*`, domain rules |
| Other | Everything else — note path only unless clearly relevant |

Also skim **repo-root** `README.md` for product one-liner and links into docs (Observed).

### 2. Evidence rules

For every claim about current state:

| Tag | Use |
|-----|-----|
| **Observed** | Directly supported by a cited path/section |
| **Inferred** | Reasonable synthesis; must say Inferred |
| **Unknown** | Not in docs; do not invent |

Never present Inferred as Observed. Never invent stack, APIs, entities, or “done” features without evidence.

### 3. Synthesize current state

Produce a compact picture of:

- Product identity and surfaces (frontend/backend/…)
- What appears **already built / shipped** vs **planned / open**
- Authoritative contract/entity/ADR paths
- Gaps (Unknowns that block a safe backlog)

Prefer tables and path pointers over prose.

## Writes (additive only)

### Always (unless `--dry-run`)

1. Ensure `docs/dev-pipeline/` exists.
2. Write or update `docs/dev-pipeline/ADOPTION.md` (see template below).
3. Ensure `.gitignore` contains `agent-prompts/` (keep `bolt-prompts/` if present).
4. Create-if-missing `docs/dev-pipeline/SHARED.md` seeded from Authoritative paths + Observed surfaces (see [shared.md](shared.md)). Do not duplicate contract bodies.

### Create-if-missing (skip when file already has real content)

| Target | Behavior |
|--------|----------|
| `docs/PRODUCT.md` | Create short identity file **or** a stub that only links to the Observed identity doc |
| `docs/ARCHITECTURE.md` | Create only if missing; otherwise link from `ADOPTION.md` / PRODUCT |
| `docs/ROADMAP.md` | Create only if missing; seed from Observed roadmap/changelog — mark Inferred rows |
| `docs/dev-pipeline/PHASES.md` | Create with `PH-00` intake (or no active) if missing |
| `docs/dev-pipeline/SHARED.md` | Create/seed from Authoritative paths + Observed surfaces if missing |
| `docs/dev-pipeline/phases/PH-00-intake/` | `README.md`, `CONTEXT.md`, empty/minimal `TASK-QUEUE.md` if phase dir missing |

With `--refresh`: update `ADOPTION.md` + additive notes on active (or intake) `CONTEXT.md` + additive `SHARED.md` path refresh; **do not** overwrite PRODUCT/ARCHITECTURE/ROADMAP content.

### Never

- Delete or rewrite existing epic/feature history
- Duplicate entire existing docs into new trees
- Invent epic/feature IDs for work not evidenced (draft backlog rows must be tagged Inferred and left `todo` / unqueued until user confirms via `backlog`)
- Mark features `done` without Observed evidence of completion

## `ADOPTION.md` template

```markdown
# Adoption snapshot

**Adopted at:** {timestamp}
**Docs root:** `{path}` (discovery: {rule})
**Mode:** adopt | refresh

## Source map

| Category | Path | Role (one line) | Evidence |
|----------|------|-----------------|----------|
| Identity | `docs/…` | … | Observed |
| Architecture | `…` | … | Observed |

## Product state (current)

- Identity: … — Observed/Inferred from `{path}`
- Surfaces: … — …
- Non-goals: … — … | Unknown

## Built vs open

| Item | Status guess | Evidence |
|------|--------------|----------|
| … | done / partial / planned | Observed from `{path}` / Inferred |

## Authoritative paths (for CONTEXT / contract freeze / SHARED)

- Entities: `…`
- API/DTO: `…`
- Decisions: `…`
- Business rules: `…`

Copy these into `docs/dev-pipeline/SHARED.md` Authoritative shared paths (create-if-missing). Phase freezes must point at the same spine.

## Pipeline overlays created/linked

- `docs/dev-pipeline/PHASES.md` — created | existed
- `docs/dev-pipeline/SHARED.md` — created | existed | seeded
- …

## Unknowns / blockers

- …

## Next commands

1. `/dev-pipeline backlog` — confirm Inferred backlog against evidence
2. `/dev-pipeline shared` — confirm shared SoT spine
3. `/dev-pipeline phase new <slug> --set-active` — when ready to leave intake
4. `/dev-pipeline surface new <slug>` — when adding backend/another service
5. `/dev-pipeline status`
```

## Phase `CONTEXT.md` seeding from adopt

Copy **paths only** (+ short notes) from the Source map / Authoritative paths into intake or active `CONTEXT.md` tables **and** into `SHARED.md`. Do not paste large doc bodies.

Add:

```markdown
## Changed by
| Task / event | Note |
|--------------|------|
| adopt | Initial seed from docs root `{path}` |
```

## Optional draft backlog

If docs clearly list epics/features/milestones:

1. Prefer **linking** existing epic folders over creating parallel files.
2. If creating new epic stubs, use stable IDs per [schema.md](schema.md), status from evidence (`done` only if Observed complete), and list them in `ADOPTION.md`.
3. Do **not** emit `agent-prompts/` during `adopt`.

Full backlog shaping remains `/dev-pipeline backlog`.

## Completion report (to user)

Emit a short table: docs root, files written vs skipped, key Observed facts, Unknown blockers, suggested next command. If `--dry-run`, list planned writes only.
