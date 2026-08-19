# Phase model

Read from `SKILL.md` when creating or switching phases.

## Why phases exist

A phase is a **responsibility window** (e.g. frontend MVP, backend API, integrations), not a git branch requirement. Development may pause a phase and start another when constraints change. The pipeline must allow that **without breaking changes** to IDs, contracts, or completed work.

When a new part of the system starts (backend after or during frontend, another service, worker), **phases + `docs/dev-pipeline/SHARED.md`** are the **whole source of truth** for that work — see [shared.md](shared.md). Phase-local freezes point into SHARED; they do not fork contracts.

Phases may be driven by:

- One agent sequentially, or
- Separate agents per phase / per task prompt handoff / per surface

## Phase lifecycle

```text
intake → active → parked ⇄ active → done
```

| Status | Meaning |
|--------|---------|
| `intake` | Backlog shaping; no implementation prompts yet |
| `active` | Exactly one recommended; prompts emit from its queue |
| `parked` | Incomplete; preserved for later resume |
| `done` | Phase goals met; queue mostly `done` |

**Invariant:** at most one `active` phase in `PHASES.md`. Parking the previous active phase is mandatory before activating another.

## Intake after `adopt`

When attaching to a mid-flight repo (`/dev-pipeline adopt`), create or reuse `PH-00-intake` (status `intake` or `active` if `--set-active`):

1. Seed `CONTEXT.md` from the docs-root source map in `ADOPTION.md` (paths only).
2. Keep `TASK-QUEUE.md` empty or minimal until `/dev-pipeline backlog` confirms features.
3. Do not emit implementer prompts from intake until the user creates/activates a real phase or explicitly runs `next` on a ready queue.

Prefer `adopt` over `phase new` when the only goal is “understand current docs and attach the tracker.”

## Creating a phase (`phase new`)

1. Allocate next `PH-{NN}` (never reuse).
2. Ensure `docs/dev-pipeline/SHARED.md` exists; if this phase is for a surface not yet registered, allocate/register `SUR-*` first ([shared.md](shared.md)).
3. Create `docs/dev-pipeline/phases/PH-{NN}-<slug>/` with `README.md`, `CONTEXT.md`, `TASK-QUEUE.md`, and empty `briefs/` (`README.md` + empty `CLAIMS.md`).
4. Seed `CONTEXT.md` from **SHARED authoritative paths** first, then existing architecture/entity/API docs (paths + short notes only). Do not invent a parallel contract tree for the new surface.
5. Phase README contract freeze **must cite SHARED** (same paths or documented subset).
6. Add row to `PHASES.md`; link owning `SUR-*` on the phase README.
7. If `--set-active` (or first phase): park any current active, set new active.
8. Optionally attach epic suites relevant to this phase (links, not copies).
9. If the user included capability/domain prose after the slug/flags: run [briefing.md](briefing.md) once as the phase’s first brief (`BRIEF-001`). Do **not** allocate another phase ID.

## Phase briefs (`brief`)

User descriptions of what the phase should deliver are **documentation inputs**. Follow [briefing.md](briefing.md):

- Dedup via per-phase `briefs/CLAIMS.md`
- Update business-rules + additive backlog only for **new** (and allowed **refinement**) claims
- Repeats → no doc churn
- Hard ban on ID renumbering and disruption of in-flight/done tasks or phase switching

## Switching phases (`phase switch PH-XX`)

**Allowed always** when target exists. Procedure:

1. Write **switch notes** on the current active phase README: what is done, what remains, open blockers, contract freeze statement (paths must still match SHARED).
2. Set current phase status to `parked` (unless user marks `done`).
3. Set target to `active`; update `PHASES.md` **Active:** pointer.
4. Refresh target `CONTEXT.md` from **SHARED.md** if contracts evolved (additive notes; do not delete history); append SHARED Inheritance log.
5. **Do not:**
   - Renumber epics/features/tasks/surfaces
   - Rewrite completed acceptance criteria as if unfinished
   - Change frozen contract docs in place in a breaking way — add a versioned note or additive section instead; update SHARED consumers
   - Delete the parked queue
   - Invent a second contract spine for the target surface

## Resume a parked phase

Same as `phase switch` back to it. Before emitting `next` tasks:

1. Re-read `SHARED.md` + `CONTEXT.md` + any newer contract docs from other phases/surfaces.
2. Mark queue items whose deps are now satisfied as `ready`.
3. Mark items broken by intervening work as `blocked` with `blocked_by` notes — prefer additive fix tasks over silent drift.

## Contract freeze (anti-breakage)

Each active phase README must list **authoritative** contract paths for that window (API, DTO, entities). Those paths **are entries in `SHARED.md`** (or an explicit subset with justification).

Rules for agents (encode in task prompts):

- Extend contracts additively when possible
- Breaking changes require an explicit task + dual-phase / dual-surface note (consumer + provider)
- Other phases and **new services** consume the SHARED paths; they must not invent parallel contracts
- Starting backend after/during frontend = inherit SHARED + parked FE freeze; do not redefine the product API story from scratch

## Mapping epics to phases

- An epic may span multiple phases (e.g. UX in `PH-01`, API in `PH-02`).
- Features stay on one epic; tasks bind to **one** phase queue.
- Cross-phase deps use Feature/Task IDs in `depends_on` / `blocks` (e.g. `ASK-01` blocks `BE-ASK-01`).
- Cross-surface work must cite the same SHARED contract paths on both features; use `co_req` when FE+BE must ship the same contract change.

## Multi-agent split

| Role | Skill / action |
|------|----------------|
| Planner / tracker | `/dev-pipeline` (this skill) |
| Implementer | Receives `agent-prompts/*.md`; may `/commit` |
| Reviewer | `/review-task` → next or rework prompt |

Do not require the same chat session for all roles. Shared SoT (`SHARED.md`) keeps FE/BE/service agents aligned without sharing chat history.
