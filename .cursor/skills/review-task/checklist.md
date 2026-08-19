# Review checklist & report template

Read from `SKILL.md` when scoring a pipeline task change set.

## Per-criterion scoring

For each Acceptance criterion in the task prompt:

| Result | When |
|--------|------|
| **pass** | Observable in diff and/or runnable app behavior |
| **fail** | Missing, incorrect, or contradicted by code |
| **unclear** | Cannot verify without runtime/manual steps — list the exact human check; if required and not reasonably inferable, overall **PARTIAL** |

## Mandatory checks

1. **Acceptance criteria** — all must pass for PASS.
2. **Out of scope** — no drive-by refactors, unrelated files, or extra features.
3. **Deps** — lockfiles unchanged unless prompt allowed.
4. **Build / test** — run only repo-defined commands relevant to the touch set.
5. **Contracts** — API/DTO/entity docs and code stay aligned when the prompt required surface changes.
6. **Phase invariants** — no breakage called out in the prompt’s Contracts & integrity section.
7. **Secrets** — none committed.

## Report template (emit to user)

```markdown
## Task review — {TASK_ID}

**Verdict:** PASS | FAIL | PARTIAL
**Branch:** {branch} @ {short_sha}
**Range:** {describe}
**Prompt:** `agent-prompts/…` | `bolt-prompts/…`

### Acceptance criteria
| # | Criterion | Result | Notes |
|---|-----------|--------|-------|
| 1 | … | pass/fail/unclear | … |

### Scope & quality
- Files touched: …
- Out-of-scope issues: none | …
- Dependencies: unchanged | …
- Contracts: ok | …
- Validation: `{command}` → exit {code}

### Next step
- PASS → next prompt: `agent-prompts/TASK-…md`
- FAIL/PARTIAL → rework: `agent-prompts/TASK-…-R{N}.md`
```

## Rework prompt skeleton

Minimum (align with `dev-pipeline` prompt-template when that skill is present):

```markdown
# {TASK_ID}-R{N} — rework: {short title}

**Task ID:** `{TASK_ID}-R{N}`
**Rework of:** `{TASK_ID}`
**Previous prompt:** `agent-prompts/…`
**Verdict:** FAIL | PARTIAL

## What failed
- …

## Required fixes (only these)
1. …

## Do not change
- …

## Acceptance criteria still open
1. …

## Validation
- Run: `{repo command if any}`
```

## Next-task prompt rules

- Self-contained; no reliance on prior chat.
- Include Goal, evidence paths, Required changes, Out of scope, Contracts, AC, DoD, Validation, Handoff.
- One task only; match queue Feature / Task IDs.
- Prefer `agent-prompts/` over `bolt-prompts/` for new writes.
