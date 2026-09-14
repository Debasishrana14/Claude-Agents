# Orchestration Decision Rules

Use this reference for delegation decisions. The consent and safety boundaries
in the root working agreement always apply.

## Decision gate

Work directly unless at least one of these benefits is material:

- exploration would add large disposable context to the main session;
- two or more tasks are genuinely independent;
- independent verification or review materially reduces risk;
- a long stage can produce a small, durable handoff for the next stage;
- specialists must negotiate a cross-boundary contract through an agent team.

Do not delegate sequential edits whose context is already understood, tiny
lookups, formatting, renames, or work split only to distribute load.

## Consent proposal

Before each agent launch, or one explicitly enumerated parallel batch, provide:

```text
Delegation: <role and bounded task>
Model: <Haiku | Sonnet | Opus> — <why this is the minimum capable tier>
Access: <read-only | exact writable paths>
Handoff: <small result or artifact>
Why delegate: <benefit over direct work>
```

Wait for approval. Any agent not named in the approved proposal requires a new
proposal. An approved agent cannot create or approve another agent.

## Strategy selection

| Work shape | Strategy |
|---|---|
| Clear and locally understood | Main session |
| Large read, small answer | One read-only subagent |
| Independent bounded analyses | Parallel subagents |
| Sequential stages, compact artifacts | Parent-mediated relay |
| Direct worker negotiation or shared task list | Agent team |
| Parallel overlapping edits | Separate worktrees or no parallel writes |

Subagents are isolated workers. They return to the parent and do not talk to or
spawn other subagents. A parent-mediated relay is not direct inter-agent
conversation. Use an explicitly approved agent team when direct messaging is a
real requirement and the experimental feature is available.

## Handoffs

Every delegated task has one deliverable, acceptance criteria, and an output
budget. Prefer a short structured return. When the result is too large, write a
unique artifact under `.scratch/coordination/<work-id>/` and return only its path,
status, key decisions, and unresolved questions.

The parent validates a handoff before routing it onward. Do not paste raw logs or
large file contents across agent boundaries. The next worker reads the artifact
directly and receives only the decisions and constraints it needs.

## Failure and escalation

- Insufficient evidence: refine the same bounded task before changing models.
- Capability failure: propose the next model tier and obtain approval.
- Scope expansion or new worker: obtain new approval.
- Verification failure: return evidence to the responsible writer for one
  targeted correction; repeated failure returns control to the main session.
- Conflicting worker recommendations: the main session decides unless an
  approved team has been asked to negotiate the conflict.

## Progress

Report real events: agent proposed, approved, started, completed, failed, or
blocked; stage accepted; verification passed or failed. Do not infer task
percentage from agent counts or tool calls.
