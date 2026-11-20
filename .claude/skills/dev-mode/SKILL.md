---
name: dev-mode
description: Explicit normal development mode for small or large implementation work. Activate only when the user invokes /dev-mode; direct work is preferred and agents require separate approval.
disable-model-invocation: true
---

# Development Mode

Understand the requested outcome, inspect the relevant code, and make the
smallest correct change. Small and sequential work stays in the main session.
For long work, split into clear stages but do not create agents merely because
the task is large.

If an independent worker would materially reduce context or safely parallelize
disjoint work, propose its task, model, access, and result, then wait for user
approval.

Do not write or run tests unless requested. Run the relevant TypeScript type
check by default, inspect the diff, and report unvalidated behavior.
