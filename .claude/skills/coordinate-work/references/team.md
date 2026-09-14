# Agent-team coordination

Use an agent team only when workers genuinely need direct messaging, mutual
requests, competing-hypothesis discussion, or a shared task list. Agent teams
are experimental and must be enabled in the user's Claude Code environment.

## Before creation

Confirm and obtain approval for:

- why relay mode is insufficient;
- every initial teammate, bounded responsibility, model, and write scope;
- whether teammates may message one another only or also change the shared task
  list;
- maximum concurrent teammates and stopping conditions;
- the increased token/cost risk;
- file isolation strategy.

Team approval does not permit unnamed teammates or model escalation. A teammate
must ask the lead to propose roster expansion to the user. Do not promise nested
subagent trees.

## Contract-first workflow

For cross-layer work, begin with contracts before implementation:

1. Downstream owner states the exact upstream data, invariants, error behavior,
   and evidence it needs.
2. Upstream owner accepts, rejects, or negotiates each requirement.
3. The lead records the agreed contract in the shared work artifact.
4. Upstream implementation and verification complete.
5. Downstream owner consumes the agreed contract and reports deviations rather
   than silently compensating for them.

Messages should contain decisions, questions, artifact paths, and blockers.
Avoid conversational status chatter and repeated source dumps.

## File safety

Agent-team members share a filesystem by default. Assign disjoint writable paths.
If edits can overlap, use isolated worktrees or serialize the writers. The lead
integrates and inspects the combined diff; teammates do not commit unless the
user separately authorizes commits.

## Completion

The lead reports accepted contracts, completed stages, verification evidence,
unresolved risks, unperformed work, and actual deviations from the approved
roster. Shut down teammates when their accepted deliverable is complete.
