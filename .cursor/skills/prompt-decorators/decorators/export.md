# +++Export

When this decorator is active, produce a concise export or summary of the conversation in the requested format.
**Structure:** [Scope] → [Format] → [Exported Content]
**Parameter:**
- `format` (text | markdown | json | yaml) – output structure.
Include active decorators if available and ensure the export is self-contained.
