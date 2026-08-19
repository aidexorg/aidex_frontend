# Task prompt template

Used by `/dev-pipeline next` and `/dev-pipeline task`, and by `/review-task` when emitting next/rework prompts.

## File naming

| Kind | Path |
|------|------|
| Normal | `agent-prompts/TASK-{FEATURE}-{NN}.md` |
| Rework | `agent-prompts/TASK-{FEATURE}-{NN}-R{N}.md` |

Confirm ignore: `git check-ignore -v <path>` when in a git repo.

## Prompt body (required sections)

Write **self-contained** prompts. No “as discussed above”.

```markdown
# {TASK-ID} — {short title}

**Task ID:** `{TASK-ID}`
**Feature ID:** `{FEATURE-ID}`
**Epic ID:** `{EPIC-ID}`
**Phase:** `{PH-ID}` ({phase slug})
**Surface(s):** `{SUR-ID}` ({slug}) — from `docs/dev-pipeline/SHARED.md`
**Priority:** `P0`|`P1`|`P2`|`P3`
**depends_on:** {ids or —}
**blocks:** {ids or —}
**Queue:** `docs/dev-pipeline/phases/{PH}/TASK-QUEUE.md`

## Product identity (do not violate)
{1–3 lines from docs/PRODUCT.md}

## Shared source of truth (do not fork)
- Index: `docs/dev-pipeline/SHARED.md`
- Follow contracts: `{paths from SHARED + phase freeze}`
- Consumers that must stay compatible: `{surfaces / modules}`
- Do **not** invent parallel API/DTO/entity docs for this surface

## Goal
{one paragraph}

## Current state (evidence)
- `{path}` — {what exists / gap}
- …

## Required changes
1. …
2. …

## Out of scope
- …

## Contracts & integrity
- Follow: `{api/dto/entity paths}` (must be SHARED-listed or explicit additive extension task)
- Business rules: `{docs/business-rules/… or CLAIMS links}`
- Preserve: {invariants from phase CONTEXT.md + SHARED}
- Do not break: {consumers / modules / other surfaces}
- Respect absorbed claims: `briefs/CLAIMS.md` (do not contradict without an explicit task)

## Acceptance criteria
1. {observable}
2. {observable}

## Definition of done
- AC met
- No unrelated files modified
- No new dependency unless listed under Required changes
- Match existing repo patterns
- Ready for `/commit` then `/review-task {TASK-ID}`

## Validation
- Run only if defined in-repo: `{command}` …
- Manual: …

## Handoff
1. Implement only this task.
2. User runs `/commit` (commit skill) when ready.
3. User runs `/review-task {TASK-ID}` for PASS → next prompt or FAIL → rework prompt.
```

## Rework prompt extras

Add after the title block:

```markdown
**Kind:** rework
**Previous prompt:** `agent-prompts/…`
**Review verdict:** FAIL | PARTIAL

## What failed
- …

## Required fixes (only these)
1. …

## Do not change
- …
```

Keep original Acceptance criteria that are still open; mark passed ones as already satisfied.

## Selection rules for `/dev-pipeline next`

1. Active phase queue only.
2. Status `ready` (or `todo` with all `depends_on` done).
3. Skip `blocked`, `in_progress` (unless user forces ID), `done`.
4. Prefer rework `*-R{N}` for the same feature before advancing to the next feature.
5. One prompt per invocation.

## Size budget

Prefer prompts that stay scannable: short bullets, paths over pasted code, AC ≤ 7 items. Link epic sections instead of copying entire epics.
