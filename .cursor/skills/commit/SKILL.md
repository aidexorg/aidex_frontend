---
name: commit
description: >-
  Commits current working-tree changes with a concise, repo-style message
  derived from the diff. Use when the user starts with /commit, attaches this
  skill, or explicitly asks to commit the latest/current changes via the commit
  skill. Does not push unless the user also asks to push.
disable-model-invocation: true
version: 1.0.0
---

# Commit

When the user message begins with `/commit`, this skill is attached, or they explicitly ask to **commit the latest / current changes** via this skill, run the commit workflow below **immediately**.

**Purpose:** Stage relevant changes and create **one** git commit with a proper message that matches the repository’s style. Do not push unless the user also explicitly asks.

## Activation

| Form | Behavior |
|------|----------|
| `/commit` | Commit all relevant current changes |
| `/commit <hint>` | Same, using `<hint>` to steer the message (still base it on the diff) |
| Skill attached + “commit” / “commit the latest changes” | Same as `/commit` |

Do not treat unrelated coding requests as this skill unless `/commit` or an explicit commit-skill ask is present.

## Safety (non-negotiable)

- **NEVER** update git config
- **NEVER** use destructive/irreversible git (`push --force`, `hard reset`, etc.) unless the user explicitly requests it
- **NEVER** skip hooks (`--no-verify`, `--no-gpg-sign`, …) unless the user explicitly requests it
- **NEVER** force-push to `main`/`master`; warn if asked
- **NEVER** push unless the user explicitly asks to push
- **NEVER** use interactive flags (`-i`, `git add -i`, `git rebase -i`)
- **Avoid** `git commit --amend` unless **all** are true:
  1. User explicitly requested amend, **or** the commit succeeded but a pre-commit hook auto-modified files that must be included
  2. `HEAD` was created by you in this conversation (`git log -1 --format='%an %ae'`)
  3. Commit is **not** pushed (`git status` shows branch ahead of remote)
- If commit **failed** or was **rejected** by a hook: fix and create a **new** commit — do **not** amend
- Do **not** commit secrets (`.env`, `credentials.json`, private keys, etc.). Warn and exclude them if the user asks to commit those files

## Workflow

Run these steps in order. Independent reads may be parallel; stage → commit → verify are sequential.

### 1. Inspect (parallel)

Run all three:

```bash
git status
git diff
git diff --cached
git log -8 --oneline
```

Use `git log` to match this repo’s message style (tense, prefixes like `feat:`, scope, length).

### 2. Decide what to commit

- Include tracked modifications and relevant untracked source/docs that belong to the change
- Exclude secrets, build artifacts, and unrelated junk unless the user explicitly requires them
- If there are **no** staged and **no** unstaged/untracked changes to commit: tell the user and **stop** — do not create an empty commit
- If the working tree mixes unrelated concerns and the user did not clarify scope: prefer committing the logical change set from the recent work; ask only when grouping would be wrong or destructive

### 3. Draft the message

- 1–2 sentences, focus on **why** over a file laundry list
- Match repo style from `git log` (e.g. `feat:`, `fix:`, `docs:`, `refactor:`)
- Accurately reflect intent: **add** = new capability; **update** = enhance existing; **fix** = bugfix
- If the user passed `/commit <hint>`, incorporate the hint only where it fits the actual diff

### 4. Stage and commit

```bash
git add <relevant paths>
git commit -m "$(cat <<'EOF'
Message here.

EOF
)"
git status
```

Always pass the message via a HEREDOC as above (or equivalent non-interactive multi-line `-m`) so formatting stays intact.

### 5. Report

Briefly confirm: commit hash/subject, whether the branch is ahead of remote, and that the working tree is clean (or what remains uncommitted and why).

## Failure handling

- **Hook failure / commit rejected:** fix the underlying issue, then create a **new** commit (no amend unless amend rules above are fully satisfied)
- **Nothing to commit:** say so; stop
- **Partial secrets in the change set:** unstage/exclude them, warn, commit the rest if safe; otherwise stop and ask

## Out of scope

- Creating pull requests (use the PR workflow / user request)
- Pushing to remote (unless the user explicitly asks in the same request)
- Amending old or pushed commits
- Rebase, merge, or branch management beyond what’s required to commit
