---
name: resume-task
description: Recover interrupted work by reconciling a durable task record with the current request, checkout, changes, and execution state. Use when continuing saved work or recovering after interruption.
---

# Resume Task

Use the SessionStart runtime CLI to list unfinished tasks for the current
workspace, then inspect the relevant record with `task show ID`. Match the
objective to the current user request; do not resume unrelated work automatically.
If multiple records fit and choosing would change scope, ask a focused question.

Confirm the recorded checkout, inspect the current Git status and diff, and read
the latest checkpoint, acceptance contract, and check failures. Preserve user edits.
Compare checkpoint claims with actual files before making further changes.
Inspect queued or running isolated jobs by ID before submitting replacements.
Reconcile externally visible side effects before retrying an interrupted action.

Use `task checkpoint ID --status running --note TEXT` to resume the same task
and bind it to the current session when the CLI supplies `--session`. This starts
a new verification revision; rerun required checks against the reconciled source.
Do not copy an old passing result into the new revision or clear failed evidence.
Completed and cancelled tasks cannot be reopened; a newly authorized follow-up
gets a new task referencing the previous objective.

Recovery receipts created at compaction/session end contain task references,
not a transcript or a guarantee that the last edits were checkpointed. Existing
checkpoint notes are the source for decisions and remaining work. If absent,
reconstruct only what repository evidence supports and disclose uncertainty.

Handoff: recovered objective, reconciled changes, remaining work, running jobs,
and stale or missing verification. Continue the relevant implementation or
verification workflow within the existing authorization.
