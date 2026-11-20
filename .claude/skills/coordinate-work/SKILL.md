---
name: coordinate-work
description: Explicit lightweight baton-passing mode for a genuinely long staged task. Activate only when the user invokes /coordinate-work; do not use for ordinary multi-file work.
disable-model-invocation: true
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

Write a scratch artifact only when the baton cannot remain concise. Do not create
approval records, manifests, or coordination files for simple work. Do not run
tests unless requested; type check remains the default validation.
