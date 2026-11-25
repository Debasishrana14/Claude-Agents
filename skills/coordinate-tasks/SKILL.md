---
name: coordinate-tasks
description: Coordinate long staged implementation with durable checkpoints and bounded handoffs. Use when interruption recovery or distinct stages matter; ordinary multi-file changes use development.
---

# Coordinate Tasks

The main session coordinates. Subagents do not talk to or spawn one another.

Treat each assignment as a contract: objective, inputs, dependencies, allowed
tools, writable paths, expected output, and acceptance checks. Launch only ready
tasks whose dependencies are satisfied. Keep writer ownership disjoint, and
serialize edits to shared contracts. Retain task identifiers and states in the
existing runtime checkpoint rather than creating a second task database.

Worker completion is a handoff, not acceptance. Inspect its changes, reconcile
interfaces, review findings, and run integration checks before marking the parent
task complete. If a worker fails or is interrupted, inspect partial edits and any
external side effects before retrying. Cancel obsolete assignments when scope
changes. The current runtime does not enforce scheduling or path ownership;
these remain coordinator responsibilities until the agent phase.

Choose coordination when independent investigations, separable implementation,
or durable staged handoffs justify it. A multi-file change alone is insufficient.
Reconsider after initial investigation and when complexity changes; users should
not need to request delegation. Stop parallel work when findings converge or
integration costs outweigh further independent evidence. Competing fixes are
experimental and off by default; a disposable worktree is not a sandbox.

Before each worker, define its bounded task, model, access, expected result, and
reason delegation is useful. Automatic mode permits bounded reader/writer
assignments without per-agent approval. Respect explicitly selected restrictive
profiles and the shared inherited-model policy. Prefer direct work when worker
startup, repeated reads, and integration outweigh useful independent work.
Pass only a concise baton to the next stage:

```text
Stage and result:
Changed files:
Contracts/decisions:
Approved scope and user overrides:
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
