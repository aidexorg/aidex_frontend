---
name: prompt-decorator-step-by-step
description: >-
  Prompt decorator +++StepByStep. Structure the reply as labeled steps.
  Use when +++StepByStep is present. Also load the prompt-decorators skill.
---

# +++StepByStep

Canonical: [../prompt-decorators/decorators/step-by-step.md](../prompt-decorators/decorators/step-by-step.md)

When this decorator is used, the response must be structured into a sequence of logically ordered steps. Each step should be explicitly labeled, such as:
**[Step 1] → [Step 2] → ... → [Final Step]**.
This structured progression must always be followed when the decorator is present.
