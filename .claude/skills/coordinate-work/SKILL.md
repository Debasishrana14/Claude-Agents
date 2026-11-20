---
name: coordinate-work
description: Coordinate long staged implementation with durable checkpoints and bounded handoffs. Use when interruption recovery or distinct stages matter; ordinary multi-file changes use development.
---

# Coordinate Work

The main session coordinates. Subagents do not talk to or spawn one another.

Before every worker, propose its bounded task, minimum model, access, expected
result, and reason delegation is useful; wait for approval. Pass only a concise
baton to the next approved stage:

```text
Stage and result:
Changed files:
Contracts/decisions:
Evidence/type check:
Input required by next stage:
Unknowns and risks:
```

Use the runtime CLI to begin one task for the objective. Save the baton with
`task checkpoint` after each stage and before interruption. Inspect unfinished
records on restart and resume only the objective the user still wants. Run
relevant executable checks before `task complete`; record skipped validation
explicitly. Do not create extra artifacts when the task record is sufficient.
After two equivalent failures, change approach or report the blocker.
