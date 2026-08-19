---
name: prompt-decorators
description: >-
  Prompt Decorator framework (+++) that modifies how responses are generated.
  Detects, applies, and tracks chat-scoped vs message-scoped decorators such as
  +++Reasoning, +++StepByStep, +++Socratic, +++Debate, +++Critique, +++Refine,
  +++CiteSources, +++FactCheck, +++OutputFormat, +++Tone, +++ChatScope,
  +++MessageScope, +++Clear, +++ActiveDecs, +++AvailableDecs, +++Interactive,
  +++Planning, +++Brainstorm, +++Rewrite, +++Import, +++Candor, +++Export,
  +++Dump. Use whenever a user message contains +++ decorators, mentions prompt
  decorators, asks for ActiveDecs/AvailableDecs, or manages decorator scope.
---

# Prompt Decorators

## Definition

A **Prompt Decorator** is an instruction added to a prompt to modify the output or influence how the response is generated.

Retain this definition across the conversation.

## Compliance (mandatory)

1. Detect, apply, and fully comply with **all** decorators present. Ignoring or partially applying any decorator is unacceptable.
2. Maintain an active memory of chat-scoped decorators for the whole conversation. Update when decorators are activated, deactivated, or cleared.
3. Scope rules:
   - **Chat-scoped**: remain active across messages until cleared/changed (`+++ChatScope` and decorators activated with it).
   - **Message-scoped**: apply only to the prompt where used (default, or after `+++MessageScope`).
4. When a decorator appears, read its skill file under [decorators/](decorators/) and follow it precisely.
5. Strip decorator tokens from the user-facing restatement of the task; apply their effects to the answer.

## Scope control

| Decorator | Effect |
|-----------|--------|
| `+++ChatScope` | Subsequent (and same-message) decorators become chat-scoped until cleared |
| `+++MessageScope` | Pause chat-scope application; new decorators are message-only; chat set is paused not erased |
| `+++Clear` / `+++Clear(+++A, +++B)` | Clear all or listed chat-scoped decorators |
| `+++ActiveDecs` | List currently active chat-scoped decorators, or `No active decorators` |
| `+++AvailableDecs` | Table of all decorators: Name, Description, Status (Active/Inactive) |

## Decorator catalog

| Token | Skill file |
|-------|------------|
| `+++Reasoning` | [decorators/reasoning.md](decorators/reasoning.md) |
| `+++StepByStep` | [decorators/step-by-step.md](decorators/step-by-step.md) |
| `+++Socratic` | [decorators/socratic.md](decorators/socratic.md) |
| `+++Debate` | [decorators/debate.md](decorators/debate.md) |
| `+++Critique` | [decorators/critique.md](decorators/critique.md) |
| `+++Refine(iterations=N)` | [decorators/refine.md](decorators/refine.md) |
| `+++CiteSources` | [decorators/cite-sources.md](decorators/cite-sources.md) |
| `+++FactCheck` | [decorators/fact-check.md](decorators/fact-check.md) |
| `+++OutputFormat(format=FORMAT)` | [decorators/output-format.md](decorators/output-format.md) |
| `+++Tone(style=STYLE)` | [decorators/tone.md](decorators/tone.md) |
| `+++ChatScope` | [decorators/chat-scope.md](decorators/chat-scope.md) |
| `+++MessageScope` | [decorators/message-scope.md](decorators/message-scope.md) |
| `+++Clear` | [decorators/clear.md](decorators/clear.md) |
| `+++ActiveDecs` | [decorators/active-decs.md](decorators/active-decs.md) |
| `+++AvailableDecs` | [decorators/available-decs.md](decorators/available-decs.md) |
| `+++Interactive` | [decorators/interactive.md](decorators/interactive.md) |
| `+++Planning` | [decorators/planning.md](decorators/planning.md) |
| `+++Brainstorm` | [decorators/brainstorm.md](decorators/brainstorm.md) |
| `+++Rewrite` | [decorators/rewrite.md](decorators/rewrite.md) |
| `+++Import` | [decorators/import.md](decorators/import.md) |
| `+++Candor` | [decorators/candor.md](decorators/candor.md) |
| `+++Export` | [decorators/export.md](decorators/export.md) |
| `+++Dump` | [decorators/dump.md](decorators/dump.md) |

## Response workflow

1. Parse all `+++Name` / `+++Name(param=value)` tokens in the user message.
2. Update chat-scope memory (activate via ChatScope, clear via Clear, pause via MessageScope).
3. Merge **message decorators** + **active chat-scoped decorators** (unless MessageScope paused chat set for this turn—then message-only, except scope management decorators still run).
4. Apply combined decorators in a sensible order: scope/meta first (`ChatScope`, `MessageScope`, `Clear`, `ActiveDecs`, `AvailableDecs`, `Export`/`Dump`), then process (`Rewrite`, `Planning`, `Interactive`, `Brainstorm`, `Import`), then reasoning style (`Reasoning`, `StepByStep`, `Socratic`, `Debate`, `Critique`, `Refine`, `CiteSources`, `FactCheck`), then presentation (`Tone`, `OutputFormat`, `Candor`).
5. Produce the final answer complying with every active decorator.
