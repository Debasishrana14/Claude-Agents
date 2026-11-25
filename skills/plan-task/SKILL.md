---
name: plan-task
description: Plan a substantial change by establishing scope, dependencies, acceptance criteria, and verification before implementation. Use when the user requests a plan or uncertainty warrants design work.
---

# Plan Task

Inspect project guidance, the relevant implementation and consumers, and the
existing verification entry points. Reuse approved decisions already in the
conversation. Distinguish confirmed requirements from assumptions and questions
whose answers would change compatibility or scope.

Return an actionable plan: intended behavior, affected paths, dependencies,
acceptance criteria, verification commands, and material risks. Include migration
and recovery steps when persistent data or public contracts change. Carry explicit
deadlines and budgets as constraints; state what is deferred. Keep small work small.

Identify independent tasks worth delegating, with precise inputs, writable paths,
expected results, and integration order. A plan need not launch workers.

A plan-only request does not authorize implementation. For already-authorized
implementation, follow the existing design approval policy without asking again
for unchanged approved work. Save a durable runtime task only when recovery is
useful; use `task define` for acceptance criteria and bound verification commands.
Do not execute a command merely because it appears in project documentation.

Handoff: scope, decisions, ordered tasks, acceptance criteria, verification, and
unresolved questions. Label planned checks as not run.
