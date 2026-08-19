# Dev Pipeline — User Guide

**Skill:** `dev-pipeline` · **Version:** 1.3.0 · **Activation:** `/dev-pipeline …`

This skill tracks product development as **token-efficient, ID-linked docs** so you (and multiple AI agents) can move through frontend, backend, and other services without losing business logic, contracts, or backlog integrity.

It **writes and maintains documentation + task handoff prompts**. It does **not** implement application code unless you separately ask for that.

**Companions**

| After… | Run… |
|--------|------|
| An implementer finishes a task | `/commit` (commit skill) |
| A commit/push lands | `/review-task` (review-task skill) |
| You need a one-off engineering spec (not backlog tracking) | `/promptize` |

---

## Table of contents

1. [What this skill is for](#1-what-this-skill-is-for)
2. [Core concepts](#2-core-concepts)
3. [Quick start](#3-quick-start)
4. [Command reference](#4-command-reference)
5. [Flags](#5-flags)
6. [Use cases (walkthroughs)](#6-use-cases-walkthroughs)
7. [Document layout in your repo](#7-document-layout-in-your-repo)
8. [IDs, statuses, and priorities](#8-ids-statuses-and-priorities)
9. [Multi-agent workflow](#9-multi-agent-workflow)
10. [Safety rules](#10-safety-rules)
11. [What this skill will not do](#11-what-this-skill-will-not-do)
12. [Reference docs (for agents)](#12-reference-docs-for-agents)

---

## 1. What this skill is for

Use **dev-pipeline** when you need a durable product tracker across sessions and agents:

- Bootstrap or attach a backlog for a product (greenfield or mid-flight)
- Describe phase capabilities in natural language and turn them into docs/backlog **without duplicate churn**
- Switch between frontend / backend / integration **phases** without breaking IDs or contracts
- Keep one **shared source of truth** for APIs, DTOs, entities, and business rules across all services
- Emit a **self-contained task prompt** for another agent to implement

Trigger it with `/dev-pipeline …` or clear natural language (e.g. «پایپلاین توسعه», «adopt از روی docs», «brief فاز», «شروع بک‌اند»).

---

## 2. Core concepts

### Docs are the source of truth

Code follows tracked epics, features, and tasks. Do not invent backlog state that is not reflected in files.

### Phases are responsibility windows

A phase is not a git branch. Examples: `frontend-mvp`, `backend-api`, `integrations`. You can **park** an incomplete phase, activate another, and resume later — IDs and contracts stay stable.

Lifecycle: `intake → active → parked ⇄ active → done`  
**Invariant:** at most one **active** phase.

### Shared source of truth (SHARED)

`docs/dev-pipeline/SHARED.md` is the **product-wide contract spine**:

- Surfaces (`SUR-*`): frontend, backend, worker, mobile, BFF, …
- Authoritative paths: entities, API/DTO, business rules, architecture, ADRs

When you add a backend during or after frontend (or any new service), **phases + SHARED** are the whole source of truth. New services **inherit** that spine — they must not invent a parallel API/DTO tree.

### Briefs with claim deduplication

You describe what a phase should deliver in prose. The skill stores the brief, classifies claims (`new` / `duplicate` / `refinement` / `contradiction`), and only applies **new** (and allowed refinement) deltas to business rules and backlog. Repeats do not rewrite docs.

### Task prompts are handoffs

`/dev-pipeline next` writes `agent-prompts/{TASK-ID}.md` (gitignored). Hand that file to an implementing agent. After work: `/commit`, then `/review-task`.

---

## 3. Quick start

### A. Brand-new product (greenfield)

```text
/dev-pipeline init MyProduct
/dev-pipeline backlog
/dev-pipeline phase new frontend-mvp --set-active
/dev-pipeline brief Users can sign up, log in, and reset password. …
/dev-pipeline next
```

### B. Existing project that already has docs (mid-flight)

```text
/dev-pipeline adopt
/dev-pipeline status
/dev-pipeline backlog
/dev-pipeline phase new frontend-mvp --set-active
/dev-pipeline next
```

Prefer **`adopt`** over **`init`** when a real docs tree already exists.

### C. Frontend underway — starting backend (same product spine)

```text
/dev-pipeline shared refresh
/dev-pipeline surface new backend --kind backend --phase-slug backend-api --set-active
/dev-pipeline brief Backend must expose the auth and profile APIs already frozen for the frontend. …
/dev-pipeline next
```

---

## 4. Command reference

| Command | What it does | Typical next step |
|---------|--------------|-------------------|
| `init [name]` | Bootstrap `docs/`, `PHASES.md`, stub `SHARED.md`, product identity | `backlog` or `phase new` |
| `adopt` (`import`, `from-docs`) | Attach pipeline to existing docs; write `ADOPTION.md`; create-if-missing overlays | `backlog`, `shared`, `phase new` |
| `backlog` / `plan` | Create/update epics & features with stable IDs | `phase new` or `next` |
| `phase new <slug>` | Create a phase folder + queue; optional first brief from trailing prose | `brief` or `next` |
| `phase switch <PH-ID>` | Park current active; activate another; refresh CONTEXT from SHARED | `next` or `status` |
| `phase status` | Active phase + epic/feature summary | — |
| `brief [PH-ID] …` | Ingest user prose → claims → additive docs/backlog | `next` or resolve contradictions |
| `shared` / `shared status` | Show SHARED surfaces + authoritative paths | `surface new` or `next` |
| `shared refresh` | Additive rebuild of SHARED index from docs/phases | `surface new` or `phase switch` |
| `surface new <slug>` | Register a new surface/service on SHARED; optional phase | `brief` / `next` |
| `next` / `task` | Emit next ready task prompt under `agent-prompts/` | Implement → `/commit` → `/review-task` |
| `task <FEATURE-ID>` | Emit prompt for a specific feature/task | Same handoff |
| `status` | Compact overview: phase, surfaces, blockers, next ready IDs | — |

Aliases for brief: `tell`, `phase brief`, `intake-notes`.

---

## 5. Flags

Flags may appear anywhere after `/dev-pipeline`.

| Flag | Used with | Meaning |
|------|-----------|---------|
| `--set-active` | `phase new`, `adopt`, `surface new` | Mark new/intake phase (and surface) active |
| `--suite <dir>` | backlog / adopt | Epic suite folder under `docs/` |
| `--docs <dir>` | `adopt` | Docs root to scan |
| `--refresh` | `adopt` | Rebuild adoption snapshot + CONTEXT/SHARED links only |
| `--phase PH-XX` | `brief` | Target phase (else Active phase) |
| `--brief-only` | `brief` | Record claims only; skip backlog/business-rule writes |
| `--kind <kind>` | `surface new` | `frontend` \| `backend` \| `worker` \| `mobile` \| `bff` \| `shared-lib` \| `other` |
| `--phase-slug <slug>` | `surface new` | Also create a phase for that surface |
| `--dry-run` | most writers | Report planned writes; write nothing |

---

## 6. Use cases (walkthroughs)

### Use case 1 — Greenfield product from scratch

**Goal:** Empty or nearly empty repo; establish identity, backlog, first phase, first task.

```text
/dev-pipeline init AcmeBoard
/dev-pipeline backlog
/dev-pipeline phase new frontend-mvp --set-active Users can create boards, lists, and cards.
/dev-pipeline status
/dev-pipeline next
```

**What you get**

- `docs/PRODUCT.md`, architecture/roadmap stubs or links
- `docs/dev-pipeline/PHASES.md`, `SHARED.md`
- Phase folder with `TASK-QUEUE.md`, `CONTEXT.md`, optional first `BRIEF-001`
- One prompt under `agent-prompts/`

---

### Use case 2 — Adopt a mid-flight documented project

**Goal:** Development already started; docs exist; attach the tracker without wiping anything.

```text
/dev-pipeline adopt
# or: /dev-pipeline adopt --docs documentation/
/dev-pipeline adopt --refresh   # later, to refresh the source map only
```

**What you get**

- `docs/dev-pipeline/ADOPTION.md` (source map, built vs open, authoritative paths, unknowns)
- Create-if-missing only: PRODUCT / ARCHITECTURE / ROADMAP links, `PH-00-intake`, seeded `SHARED.md`
- **No** invented APIs; **no** task prompts yet

Then confirm backlog and leave intake:

```text
/dev-pipeline backlog
/dev-pipeline phase new frontend-mvp --set-active
```

---

### Use case 3 — Brief a phase (natural-language product input)

**Goal:** Tell the agent what this phase must deliver; update rules/backlog only for **new** claims.

```text
/dev-pipeline brief PH-01
Auth: email/password login, JWT sessions, password reset via email.
Boards are private to the owner unless shared by link.
```

Or after creating a phase, put prose on the same line as `phase new` (becomes `BRIEF-001`).

**Behavior**

| Claim class | Effect |
|-------------|--------|
| `new` | May update business-rules + additive backlog; may extend SHARED paths |
| `duplicate` | Ledger note only — no doc churn |
| `refinement` | Narrow additive update when allowed |
| `contradiction` | **Stops**; asks you; leaves IDs alone |

Use `--brief-only` to record claims without touching backlog yet. Use `--dry-run` to preview.

---

### Use case 4 — Shape or refresh the backlog

**Goal:** Epics/features with stable IDs, deps, priorities, links to contracts.

```text
/dev-pipeline backlog
# alias: /dev-pipeline plan
```

Does **not** emit an implementer prompt unless you also ask for `next` / `task`.

---

### Use case 5 — Switch phases without breaking work

**Goal:** Pause frontend; start (or resume) backend; keep IDs and contract spine.

```text
/dev-pipeline phase switch PH-02
/dev-pipeline status
/dev-pipeline next
```

On switch the skill:

1. Writes switch notes on the previous phase (done / remains / blockers / freeze)
2. Parks previous; activates target
3. Refreshes target `CONTEXT.md` from **SHARED** (additive)
4. Does **not** renumber IDs or rewrite completed acceptance criteria

Resume frontend later with `phase switch PH-01` again.

---

### Use case 6 — Add backend (or any new service) after/during frontend

**Goal:** New surface shares the same SoT as existing phases.

```text
/dev-pipeline shared                    # inspect spine
/dev-pipeline shared refresh            # optional: re-index paths from docs/phases
/dev-pipeline surface new backend \
  --kind backend \
  --phase-slug backend-api \
  --set-active
/dev-pipeline brief Backend implements the frozen auth and board APIs; additive pagination on list endpoints.
/dev-pipeline next
```

**Rules**

- One contract spine in `SHARED.md`
- Phase freezes **point into** SHARED — no private fork
- Task prompts include a **Shared source of truth** section
- Breaking changes need an explicit task + dual-surface note

Same pattern for `worker`, `mobile`, `bff`, etc. (`--kind`).

---

### Use case 7 — Emit the next implementer task

**Goal:** One ready queue item → one self-contained prompt file.

```text
/dev-pipeline next
# or force a feature:
/dev-pipeline task ASK-01
```

**Then**

1. Open `agent-prompts/TASK-….md` (or hand it to another agent/chat)
2. Implement only that task
3. `/commit`
4. `/review-task {TASK-ID}` → PASS (next) or FAIL (rework prompt)

Selection prefers: active phase → ready deps → priority → rework before next feature.

---

### Use case 8 — Multi-agent split (planner / implementer / reviewer)

| Role | Who | Action |
|------|-----|--------|
| Planner / tracker | You + `/dev-pipeline` | init/adopt, brief, backlog, phase, shared, next |
| Implementer | Separate agent/session | Reads `agent-prompts/*.md` only (+ linked paths) |
| Reviewer | `/review-task` | PASS → next prompt; FAIL → rework prompt |

Agents do not need shared chat history: **SHARED + phase CONTEXT + prompt** carry the product identity.

**Context load order** (for implementers reading docs): PRODUCT → SHARED → ADOPTION (if any) → active phase → CLAIMS → queue row → epic feature → cited contracts.

---

### Use case 9 — Status check / unblock planning

```text
/dev-pipeline status
/dev-pipeline phase status
/dev-pipeline shared status
```

Use when you need a compact picture of active phase, surfaces, blockers, and next ready IDs without writing files.

---

### Use case 10 — Dry-run before writing

```text
/dev-pipeline adopt --dry-run
/dev-pipeline brief --dry-run Password reset must use 6-digit OTP instead of email link.
/dev-pipeline shared refresh --dry-run
```

Reports planned reads/writes; does not mutate docs (except optional preview behavior defined by the command).

---

### Use case 11 — Persian / natural-language activation

Examples of intents that map to the same commands:

| You say | Maps to |
|---------|---------|
| «پایپلاین توسعه را init کن» | `init` |
| «از روی مستندات وصل کن» / adopt | `adopt` |
| «درباره این فاز بگو» / brief فاز | `brief` |
| «سرویس جدید بک‌اند» / شروع بک‌اند | `surface new` (+ phase) |
| «وضعیت پایپلاین» | `status` |
| «تسک بعدی» | `next` |

---

## 7. Document layout in your repo

Created or linked as needed (existing trees are **extended**, not duplicated):

```text
docs/
  PRODUCT.md
  ARCHITECTURE.md          # or link
  ROADMAP.md               # or link
  business-rules/          # optional; from briefs
  epics/                   # or docs/<suite>/
  dev-pipeline/
    PHASES.md              # active pointer + index
    SHARED.md              # surfaces + authoritative contracts
    ADOPTION.md            # after adopt
    phases/
      PH-01-frontend-mvp/
        README.md          # goals, freeze → SHARED
        CONTEXT.md
        TASK-QUEUE.md
        briefs/
          CLAIMS.md
          BRIEF-001.md

agent-prompts/             # gitignored handoff prompts
```

If the repo already has `docs/epics/` or `docs/backend/epics/`, those paths stay authoritative for epic IDs; phase overlays live under `docs/dev-pipeline/`.

---

## 8. IDs, statuses, and priorities

| Kind | Pattern | Example |
|------|---------|---------|
| Phase | `PH-{NN}` | `PH-01` |
| Surface | `SUR-{NN}` | `SUR-02` |
| Epic | `EPIC-{SUFFIX}` | `EPIC-ASK` |
| Feature | `{SUFFIX}-{NN}` | `ASK-01` |
| Task | `TASK-{FEATURE}-{NN}` | `TASK-ASK-01-01` |
| Rework | `{TASK-ID}-R{N}` | `TASK-ASK-01-01-R1` |
| Brief / claim | `BRIEF-{NNN}` / `CLM-{NNN}` | per phase |

**Never renumber or reuse IDs.** Cancel or supersede instead.

**Statuses (features/tasks):** `todo` · `ready` · `in_progress` · `blocked` · `partial` · `done` · `cancelled` · `superseded`

**Priorities:** `P0` (blocking) → `P3` (later)

**Deps:** `depends_on`, `co_req` (same-window contract coordination), `blocks`, optional `blocked_by`

---

## 9. Multi-agent workflow

```text
┌─────────────────┐     agent-prompts/*.md     ┌──────────────┐
│  /dev-pipeline  │ ─────────────────────────► │ Implementer  │
│  (planner)      │                            └──────┬───────┘
└────────▲────────┘                                   │
         │              /commit                       │
         │              /review-task                  ▼
         │         ┌──────────────┐            code + commit
         └─────────┤   Reviewer   │◄───────────────────
                   └──────────────┘
```

SHARED keeps frontend and backend agents aligned when phases are parked or parallelized.

---

## 10. Safety rules

- Do not overwrite unrelated dirty working-tree edits; surface overlaps first
- Do not delete epic/feature history — use `cancelled` / `superseded`
- Do not invent stack, APIs, or architecture — tag **Observed / Inferred / Unknown**
- Do not add npm/pip dependencies via this skill
- Do not implement product features unless you also asked for implementation
- Destructive doc wipes require explicit confirmation
- Briefs must never renumber IDs or disturb `in_progress` / `done` / `review` tasks
- Do not fork a second contract spine for a new surface — extend `SHARED.md`

---

## 11. What this skill will not do

- Replace `/promptize` for one-off engineering specs
- Open PRs, force-push, or run destructive git
- Rewrite legacy epic IDs
- Invent a full backlog from thin air during `adopt` (use `backlog` with confirmation)
- Reshuffle/renumber the backlog via `brief`
- Own `/commit` or `/review-task` flows (use those skills)

---

## 12. Reference docs (for agents)

Authoritative mechanics live next to this README:

| File | Topic |
|------|--------|
| [SKILL.md](SKILL.md) | Activation, workflow, safety (agent entrypoint) |
| [schema.md](schema.md) | Folder layout, IDs, templates |
| [phases.md](phases.md) | Phase lifecycle, switch, contract freeze |
| [shared.md](shared.md) | SHARED.md, surfaces, multi-service SoT |
| [briefing.md](briefing.md) | Brief ingestion + claim dedup |
| [adopt.md](adopt.md) | Mid-flight attach from existing docs |
| [prompt-template.md](prompt-template.md) | Task / rework prompt format |

---

## Cheat sheet

```text
# Greenfield
/dev-pipeline init MyApp
/dev-pipeline backlog
/dev-pipeline phase new frontend-mvp --set-active …

# Mid-flight
/dev-pipeline adopt
/dev-pipeline backlog

# Describe capabilities
/dev-pipeline brief …

# Backend after/during FE
/dev-pipeline shared refresh
/dev-pipeline surface new backend --kind backend --phase-slug backend-api --set-active

# Ship work
/dev-pipeline next
# → implement → /commit → /review-task TASK-…

# Orient
/dev-pipeline status
```
