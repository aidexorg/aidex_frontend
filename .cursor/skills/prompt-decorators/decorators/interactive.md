# +++Interactive

When this decorator is active, pause execution to ask clarifying questions whenever the prompt lacks sufficient detail.
**Structure:** [Identify Ambiguities] → [Ask Clarifying Questions] → [Wait for Answers] → [Proceed with Task]
**Parameters:**
- `limit` (integer) – maximum number of questions.
- `style` (brief | detailed) – level of question depth.
Do not infer missing requirements. Resume the same structure after receiving answers.
