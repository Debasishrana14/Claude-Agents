---
name: dev-mode
description: Implement requested features, fixes, refactors, and cleanup. Use for actionable code changes, including diagnose-and-fix requests; ordinary explanations need no development workflow.
---

# Development Mode

Understand the requested outcome, inspect the relevant code, and make the
smallest correct change. Small and sequential work stays in the main session.
For long work, split into clear stages but do not create agents merely because
the task is large.

If an independent worker would materially reduce context or safely parallelize
disjoint work, propose its task, model, access, and result, then wait for user
approval.

For multi-step work, begin a runtime task and checkpoint changed files,
decisions, and remaining work. Before completion, run relevant existing checks
and record their actual exit status with `task check`. Add focused tests for
meaningful new behavior or regressions. Inspect the diff, then complete the task
with evidence or an explicit unverified reason.
