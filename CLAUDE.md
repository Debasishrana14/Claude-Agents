# Claude Code Working Agreement

These instructions apply when Claude Code is launched in any project that
imports this file.

## Default behavior

- Complete small, clear, and sequential work directly in the main session.
- Do not delegate merely because a request is large or touches several files.
- Delegate only when context isolation, independent parallel work, specialist
  judgment, or a clean stage handoff is worth the extra tokens and latency.
- Use the minimum capable model. File ownership or application layer never
  determines model tier by itself.
- Preserve user intent, unrelated work, and the current repository state.
- Do not commit unless the user explicitly asks.

## Delegation consent

Every proposed delegation requires user consent before the agent or teammate is
started. State the bounded task, role, model, reason, expected handoff, and
whether it can edit files. Wait for the answer.

One answer may approve a clearly enumerated batch of independent delegations.
It does not approve additional agents, replacement agents, recursive work, a
higher model tier, or a broader scope. Ask again before expanding the approved
roster. "Use agents" alone is not blanket approval unless the user explicitly
says it is.

## Workflow routing

- Ordinary bug fixes, edits, questions, and reviews: work directly and apply
  only the relevant rules under `.claude/rules/`.
- A focused investigation whose raw exploration is disposable: propose one
  read-only subagent.
- Independent bounded tasks: propose a parallel batch of subagents.
- A long sequential task whose stages can exchange compact artifacts: use the
  `coordinate-work` skill and its relay mode.
- Work requiring workers to negotiate inputs, request changes from one another,
  or communicate directly: use the `coordinate-work` skill and consider an
  agent team. Do not represent ordinary subagents as directly communicating.

Claude Code subagents cannot spawn subagents. Any deeper decomposition must be
performed by the main session after obtaining any required new consent. Agent
teams are experimental, cost more total tokens, and must be explicitly approved.

## Hard boundaries

- Read-only roles must not edit repository files.
- A delegated writer owns only the paths named in its assignment.
- Parallel writers must have disjoint path ownership or isolated worktrees.
- No agent may silently broaden its task, delegate further, raise its model
  tier, delete material files, cross an ownership boundary, or commit.
- Failed verification returns to the owner of the failed stage; it does not
  authorize an unbounded retry loop. After one evidence-driven correction,
  escalate repeated failure to the main session.

## Model routing

Choose by the actual subtask, not by DataLayer, Geometry, Visualization, or
SectioningBoard ownership:

- Haiku: file discovery, inventories, known-pattern searches, mechanical checks,
  and concise extraction with clear acceptance criteria.
- Sonnet: ordinary implementation, debugging, verification, review, experiments,
  and planning with bounded ambiguity.
- Opus: only high-ambiguity architecture, difficult algorithmic reasoning,
  conflicting cross-system constraints, or escalation after a cheaper model
  produced insufficient evidence.

Use `inherit` only when the parent model is already the minimum capable model.
Do not escalate because a task is long; split or checkpoint it instead. Record
the reason whenever proposing Opus.

## Domain ownership

Ownership rules are documented in `.claude/rules/departments.md`. Load only the
department document relevant to files being changed. When the current project
does not provide a concrete path-to-owner map, treat department labels as review
guidance rather than enforceable write boundaries and use explicit assigned
paths instead.

## Verification and completion

Run the strongest relevant practical check without automatically running every
suite. Inspect the final diff. Report what passed, what failed, what was not
verified, and remaining risk. Never use agent-count percentage as task progress.

For multi-stage work, follow `.claude/skills/coordinate-work/SKILL.md` only when
that workflow is selected.
