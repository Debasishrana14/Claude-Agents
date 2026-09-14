---
name: coordinate-work
description: Coordinate a long multi-stage engineering task through consented baton-passing handoffs or an agent team when direct worker negotiation is genuinely required. Do not use for ordinary direct work or a single isolated investigation.
---

# Coordinate Work

Use this skill only after deciding that staged coordination provides a material
benefit over direct work.

## Select a mode

- **Relay:** stages are sequential and can exchange compact artifacts through
  the main session. Read [references/relay.md](references/relay.md).
- **Team:** workers must directly request inputs or changes from each other,
  challenge decisions, or coordinate a shared task list. Read
  [references/team.md](references/team.md).

Do not describe relay subagents as talking to one another. Claude Code subagents
cannot spawn subagents; the main session owns any further decomposition.

## Consent and routing

Before starting each worker, or an explicitly listed batch, obtain user approval
for its role, bounded task, minimum capable model, access, and handoff. A team
plan must also state that agent teams are experimental and generally increase
total token use.

For a multi-stage workflow, read
[references/approval.md](references/approval.md) and create single-use approval
records conforming to the maintained schema before launching workers.

Model tier depends on ambiguity and reasoning difficulty, never on the owning
application layer. Start at the lowest tier expected to meet the acceptance
criteria. Escalation requires evidence of insufficiency and fresh approval.

## Shared invariants

- Give every stage a stable work ID and one accountable owner.
- Give parallel writers disjoint paths or isolated worktrees.
- Exchange contracts, decisions, evidence, and artifact paths—not transcripts.
- Validate each baton before the dependent stage begins.
- Preserve unresolved questions instead of allowing the next worker to guess.
- Stop when acceptance criteria are met; do not create work to keep agents busy.
- Default to at most four concurrent workers and one evidence-driven correction
  round. A larger roster or retry budget requires explicit user approval.
