# Phase briefing (user → docs → backlog)

Read from `SKILL.md` when running `/dev-pipeline brief` (aliases: `phase brief`, `tell`, `intake-notes`).

**Purpose:** Let the user describe phase capabilities in natural language. Treat those statements as **product documentation inputs**. Update business-logic docs and backlog **only for net-new claims**. Ignore repeats. **Never** disrupt phase/task workflows or stable IDs.

## When to use

| Situation | Command |
|-----------|---------|
| Just created a phase; describing what it must deliver | `brief` (target = that phase) |
| Adding more product/domain detail later | `brief PH-XX` again |
| Inline with create | `phase new <slug> …` then remaining prose as first brief (see [phases.md](phases.md)) |
| Only want a dry classification | `brief --dry-run` |

Not a substitute for `/dev-pipeline backlog` full reshaping — `brief` is **delta ingestion** from the user’s words.

## Activation forms

```text
/dev-pipeline brief [PH-ID] <user prose…>
/dev-pipeline brief --phase PH-01 <user prose…>
/dev-pipeline tell <user prose…>          # active phase
/dev-pipeline phase brief [PH-ID] <…>
```

If `PH-ID` omitted: use **Active** phase from `PHASES.md`. If none active: **ask** (blocking).

Flags:

| Flag | Meaning |
|------|---------|
| `--phase PH-XX` | Target phase (same as positional ID) |
| `--dry-run` | Classify claims; report planned writes; write nothing except optional preview |
| `--brief-only` | Record raw brief + claim ledger only; do **not** touch backlog/business-rules yet |
| `--force-new` | Treat near-duplicates as new only if user insists (still never renumber IDs) |

Natural language: «درباره این فاز بگو», «brief فاز», «این قابلیت‌ها رو ثبت کن».

## Hard invariants (non-negotiable)

1. **Never renumber or reuse** Phase / Epic / Feature / Task IDs.
2. **Never delete** queue rows, epic history, or prior briefs.
3. **Never change** status of tasks that are `in_progress`, `review`, `done`, or `rework_required` because of a brief.
4. **Never rewrite** completed acceptance criteria as unfinished.
5. **Never park/switch/activate** phases as a side effect of `brief`.
6. **Duplicates do not mutate** business-rules or backlog (ledger note only).
7. **Contradictions** → ask user before changing anything; do not silently overwrite.
8. New backlog items are **additive** only (`todo` / `ready` as appropriate); cancel/supersede only if the user **explicitly** requests it in the brief.

## Docs layout (per phase)

```text
docs/dev-pipeline/phases/PH-{NN}-<slug>/
  README.md
  CONTEXT.md
  TASK-QUEUE.md
  briefs/
    README.md           # index of briefs + how to read ledger
    CLAIMS.md           # durable claim ledger (dedup source of truth)
    BRIEF-001.md        # raw + extracted claims for one briefing session
    BRIEF-002.md
    …
```

Also (product-level, create-if-missing):

- `docs/business-rules/` — one short file per rule or a single `RULES.md` with anchored sections (prefer existing tree if present)
- Epic suite files under existing `docs/epics/**` (extend; do not fork parallel IDs)

## Claim model

Each extracted unit of meaning is a **claim**:

| Field | Meaning |
|-------|---------|
| `CLM-{NNN}` | Stable claim ID within the phase (never renumber) |
| `summary` | One-line normalized statement |
| `kind` | `capability` \| `business_rule` \| `constraint` \| `non_goal` \| `backlog_hint` \| `other` |
| `status` | `absorbed` \| `duplicate` \| `superseded` \| `contradicted` \| `deferred` |
| `first_brief` | `BRIEF-{NNN}` |
| `links` | Paths to business-rule / epic / feature updated from this claim |

### Classification on each new brief

Compare new extracts to `CLAIMS.md` (and linked rule text):

| Class | Meaning | Doc / backlog effect |
|-------|---------|----------------------|
| **new** | Not previously recorded | May update business-rules + additive backlog |
| **duplicate** | Same meaning as an existing claim (rephrased OK) | **No** content mutation; append “seen again” note on claim |
| **refinement** | Narrows/clarifies an existing claim without contradicting | Additive clarification on the same rule/feature; do not fork a conflicting rule |
| **contradiction** | Conflicts with an absorbed claim, frozen contract, or `SHARED.md` spine | **Stop** that claim; ask user; leave IDs alone |

Rephrasing counts as **duplicate**. Examples of duplicate:

- “Users can cancel orders before shipment” vs “Allow cancel only if not shipped yet”

## Workflow (sequential)

### 0. Parse

Phase ID, flags, remainder = **raw user brief** (must be non-empty unless `--dry-run` of empty is rejected).

### 1. Inspect

1. Resolve phase dir from `PHASES.md`.
2. Read `briefs/CLAIMS.md` if present (empty ledger if first brief).
3. Read `docs/dev-pipeline/SHARED.md` (if present), phase `CONTEXT.md`, `README.md`, linked business-rules, relevant epic sections (paths only as needed).
4. `git status` before writes.

### 2. Persist raw brief

Allocate next `BRIEF-{NNN}` (never reuse). Write `briefs/BRIEF-{NNN}.md`:

```markdown
# BRIEF-001 — {ISO or local timestamp}

**Phase:** `PH-01`
**Source:** user

## Raw input
{verbatim user prose}

## Extracted claims (this session)
| Local | Class | Summary | Matches | Action |
|-------|-------|---------|---------|--------|
| 1 | new | … | — | absorb → CLM-004 |
| 2 | duplicate | … | CLM-001 | ledger note only |
```

### 3. Update claim ledger

For each extract, append/update `CLAIMS.md`. Do not renumber existing `CLM-*`.

### 4. Apply only `new` / allowed `refinement`

Unless `--brief-only` or `--dry-run`:

**Business logic**

- Create or extend files under `docs/business-rules/` (or existing domain rules path from CONTEXT/ADOPTION/SHARED).
- Prefer additive bullets; cite `CLM-*` / `BRIEF-*`.
- Update phase `CONTEXT.md` **Invariants** only for new invariants (additive).
- When claims introduce or refine API/DTO/entity contracts: **additively update** `docs/dev-pipeline/SHARED.md` (paths + consumers) — do not fork a surface-local contract doc.
- Add `Changed by` row: `brief BRIEF-NNN`.

**Backlog**

- Map new capabilities to existing Feature IDs when the feature clearly already exists (update acceptance/links only — do not change ID).
- If no feature exists: allocate **next** Feature ID in the right epic (`{SUFFIX}-{NN}`); status `todo`; link claim.
- Optionally add **new** `TASK-*` rows at end of `TASK-QUEUE.md` for the phase — never reorder existing rows’ IDs; never alter `in_progress`/`done` rows.
- Do not emit `agent-prompts/` during `brief`.

### 5. Report to user

Compact table:

| Claim | Class | Action |
|-------|-------|--------|
| … | new / duplicate / … | paths touched or “none” |

List: new CLM IDs, skipped duplicates, contradictions needing answers, files written. Remind that IDs/phases/task statuses were left intact.

## `CLAIMS.md` template

```markdown
# Claim ledger — PH-01

| Claim ID | Summary | Kind | Status | First brief | Links |
|----------|---------|------|--------|-------------|-------|
| CLM-001 | … | business_rule | absorbed | BRIEF-001 | `docs/business-rules/…` |
```

## `briefs/README.md` (minimum)

- Briefs are user documentation inputs for this phase.
- Dedup via `CLAIMS.md`; duplicates must not rewrite product docs.
- ID safety: see Hard invariants.

## Interaction with `phase new`

After creating the phase directory, if the user message includes capability prose beyond the slug/flags:

1. Finish `phase new` steps (IDs allocated once).
2. Run this briefing workflow once as `BRIEF-001` for that phase.
3. Do not create a second phase or reallocate `PH-*`.

## Safety & evidence

- Tag synthesis Inferred when normalizing fuzzy speech; store **verbatim** raw input in the BRIEF file (Observed user text).
- Do not invent APIs/stack from a brief unless the user stated them — mark Unknown otherwise.
- `--dry-run` writes nothing (or only prints the classification table).
