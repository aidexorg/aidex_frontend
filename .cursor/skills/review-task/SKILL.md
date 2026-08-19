---
name: review-task
description: >-
  Reviews the latest git changes against a tracked pipeline task prompt
  (agent-prompts/ or bolt-prompts/), scores acceptance criteria, updates the
  phase task queue, and writes the next or rework prompt. Use when the user
  starts with /review-task, attaches this skill, or asks to review the latest
  task changes for a TASK-ID after agent implementation.
disable-model-invocation: true
version: 1.0.0
---

# Review Task

When the user message begins with `/review-task`, this skill is attached, or they ask to **review the latest task changes** for a pipeline `TASK-ID`, run this workflow **immediately**.

**Purpose:** Verify an implementer agent’s diff against the **exact task prompt** that was assigned, report PASS/FAIL/PARTIAL, update queue status, and emit the next (or rework) prompt under `agent-prompts/` (gitignored).

**Companions:** Task prompts from `/dev-pipeline`; commits via `/commit`. Legacy `bolt-prompts/` + `review-bolt-changes` remain valid for bolt-specific flows.

## Activation

| Form | Behavior |
|------|----------|
| `/review-task` | Review latest assigned task → next/rework prompt |
| `/review-task TASK-…` | Force review against that task id |
| `/review-task --pull` | `git pull --ff-only` first (default: **no** pull) |
| `/review-task --no-pull` | Explicit skip pull (default behavior) |
| Natural language: “review task”, «ریویو تسک», «بررسی آخرین تغییرات تسک» | Same as `/review-task` |

### Flag parsing

| Flag | Meaning |
|------|---------|
| `--pull` | Pull current branch ff-only before reviewing |
| `--no-pull` | Do not pull (default) |
| `TASK-…` | Explicit task under review |

Do not treat generic code-review asks as this skill unless a pipeline/bolt task prompt handoff is clearly intended.

## Discover conventions

Look for, in order:

1. `agent-prompts/TASK-*.md` (preferred)
2. `bolt-prompts/TASK-*.md` (legacy)
3. `docs/dev-pipeline/phases/*/TASK-QUEUE.md` or `**/BOLT-TASK-QUEUE.md` / `**/TASK-QUEUE.md`
4. Epic docs linked from the queue
5. Conversation: last prompt path / task id written

If `agent-prompts/` is missing, create it and ensure `.gitignore` contains `agent-prompts/` before writing prompts.

## Safety

- **NEVER** update git config
- **NEVER** `push --force`, hard reset, or discard user changes
- **NEVER** skip hooks unless the user explicitly asks
- **NEVER** use interactive git (`-i`)
- Before `--pull`: if working tree is **dirty**, stop and ask (stash / commit / proceed). Do not discard dirty files.
- Prefer `git pull --ff-only`. If it fails, report and ask — do not rebase/merge without confirmation.
- Do not commit or push unless the user explicitly asks in the same turn.
- Never put prompt bodies into git-tracked paths; confirm with `git check-ignore -v <path>`.

## Workflow

### 1. Resolve task under review

Determine `TASK_ID` and prompt path:

1. Explicit `TASK-…` in the user message, else
2. Queue row with status `in_progress`, else
3. Newest matching `agent-prompts/TASK-*.md` (prefer non-rework unless rework is current), else
4. Legacy `bolt-prompts/`, else
5. Ask which task to review (blocking)

Read the full prompt. Extract: Goal, Required changes, Out of scope, Acceptance criteria, Definition of done, Contracts.

### 2. Collect the change set

```bash
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git status -sb
git log -15 --oneline
```

If `--pull`: save `BEFORE_SHA`, pull ff-only, then review `BEFORE_SHA..HEAD`.

Otherwise prefer, in order:

1. Range since the task started if known (commit message / notes containing `TASK_ID`)
2. Unpushed commits on the branch clearly for this task
3. `git diff` working tree + staged if uncommitted work is the deliverable
4. Ask which SHA range to use (blocking) if ambiguous

Note unrelated dirty files as **protected** — do not revert them.

### 3. Review against the task prompt

Score each acceptance criterion: **pass** / **fail** / **unclear**.

Also check:

| Check | Fail if |
|-------|---------|
| Scope | Files/behavior outside Out of scope / drive-by refactors |
| Dependencies | New packages unless the prompt allowed them |
| Contracts | Breaking API/DTO/entity changes not required by the task |
| Patterns | Ignores repo conventions called out in the prompt |
| Secrets | Credentials or `.env` committed |
| Identity | Violates Product identity / phase invariants in the prompt |

Run **only** validation commands that exist in-repo and are relevant. Do not invent a harness.

Details: [checklist.md](checklist.md).

### 4. Verdict

- **PASS** — all AC pass; scope clean; relevant validation OK
- **FAIL** — required criterion fails, out-of-scope damage, or build broken by the change
- **PARTIAL** — core behavior works but blocking gaps remain → treat like FAIL for queue advance unless user overrides

### 5. Update queue + write next prompt

**On PASS:**

1. Set this task to `done` in the phase `TASK-QUEUE.md` (if present).
2. Update parent feature status in the epic file when all its tasks are done (or set `partial` if only part shipped).
3. Write the **next** ready task prompt to `agent-prompts/` (same sections as the prior prompt / [checklist.md](checklist.md) next-task rules). If the `dev-pipeline` skill is available, align with its `prompt-template.md`.
4. Point the user to that path for the next implementer handoff.

**On FAIL or PARTIAL:**

1. Leave task `in_progress` or mark rework needed.
2. Write `agent-prompts/{TASK-ID}-R{N}.md` with failures, required fixes only, open AC.
3. Do **not** advance to the next feature task.

### 6. Stop

Do not implement the next task unless the user also asked to implement. This skill reviews and hands off prompts only.

## Out of scope

- Implementing the feature instead of reviewing (unless user separately asks)
- Opening PRs / pushing
- Treating unrelated dirty local edits as the task deliverable
- Advancing `blocked` tasks
- Replacing `/review-bolt-changes` when the user explicitly wants the bolt pull-centric flow
