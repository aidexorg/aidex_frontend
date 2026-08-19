# +++Clear

When this decorator is included without parameters, all active chat-scoped decorators must be cleared.
Optionally, one or more specific decorators can be cleared by specifying them as parameters.
Examples:
- `+++Clear` → clears all active decorators.
- `+++Clear(+++Reasoning, +++StepByStep)` → clears only the specified decorators.
