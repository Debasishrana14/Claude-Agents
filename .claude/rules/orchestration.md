# Agent Orchestration Rules

## Primary objective

Complete the task correctly using the minimum necessary context, agents, model capability, and execution steps.

Do not optimize for the number of agents used.

Optimize for:

1. Correctness
2. Context efficiency
3. Minimum delegation
4. Fast completion
5. Clear verification

---

# 1. Task Classification

Before doing substantial work, classify the task.

## Small

Examples:

- simple question
- lookup
- obvious one-file fix
- simple rename
- formatting
- straightforward code change
- known bug with known cause
- sequential edits where relevant files are already understood

Actions: 

DO NOT delegate.

DO NOT create a plan unless the user asks for one.

Do the work directly.

---

## Medium

Examples:

- several related files
- moderately uncertain bug
- bounded refactor
- non-trivial test changes
- localized feature

Actions:

Prefer the main session.

Delegate only if doing so clearly reduces or provides useful independent investigation.

Default agent count: 0-2.

---

## Big

Examples:

- architectural change
- large refactor
- unknown root cause across multiple modules
- cross-department change
- major behavior change
- performance investigation
- complex algorithm
- substantial feature

Action:

Choose the minimum effective orchestration strategy.

---

# 2. Direct Work Has Priority

If the main session already has the necessary context, continue directly. 

Do NOT delegate merely to "spread the work".

Do NOT create an agent for a task that can be completed immediately with the current context.

---

# 3. Choose the Workflow

## Bug Fix

Default:

```text
Understand
→ Locate
→ Diagnose
→ Implement
→ Verify
```

Use the `research` agent only when locating or tracing behavior would add
substantial disposable context. Use the `experiment` agent only when inspection
cannot resolve an important uncertainty. Use the `implementer` agent when a
bounded implementation can be delegated without losing essential context. Use
the `verifier` after material delegated changes, and use the `reviewer` when an
independent review materially reduces risk.

## Refactor

```text
Understand
→ Scope
→ Plan when needed
→ Implement
→ Verify
```

Use the `planner` only for architectural, cross-module, or otherwise complex
refactors. Straightforward refactors remain in the main session.

## Code Review

```text
Scope
→ Inspect
→ Analyze
→ Report
```

Use the `reviewer` when isolated inspection is useful. A reviewer remains
read-only and reports actionable findings only.

## Complex Feature

```text
Research when needed
→ Experiment when behavior is uncertain
→ Plan
→ Implement
→ Verify
→ Review when risk warrants it
```

These are decision rules, not a requirement to invoke every agent. Select only
the roles whose work is necessary for the current request.
---

# 4. Progress Tracking

Progress tracking must be lightweight.

When progress tracking is useful, the configured hooks store session state in
`.claude/state/<session-id>.progress.json` using this schema:

```json
{
  "percentage": 30,
  "phase": "Diagnose",
  "activeAgents": [],
  "completedAgents": [],
  "totalAgents": 0
}
```

The configured hooks maintain the agent arrays. The main session may update
only `percentage` and `phase` at the meaningful transitions listed below.

Do not continuously report progress in chat.

Do not dump intermediate tool output into the parent conversation.

For Medium and Big tasks, track meaningful phase transition only.

---

## Progress Phases

### Bug Fix

Understand  10%
Locate      20%
Diagnose    30%
Implement   70%
Verify      90%
Complete    100%


### Refactor

Understand  10%
Scope       25%
Plan        40%
Implement   70%
Verify      90%
Complete    100%

### Code Review

Scope       15%
Inspect     50%
Analyse     75%
Report      90%
Complete    100%

### Complex Feature

Research        15%
Experiment      30%
Plan            45%
Implement       70%
Verify          90%
Review          95%
Complete        100%

---

## Progress Reporting

Only update progress when:

- phase changes
- agent starts
- agent completes
- major blocker occurs
- verification starts
- verification fails
- task completes

Do not update progress for every tool call.

----

## Agent Visibility

When an agent is active, track:

Agent: 
Role:
Model:
Phase:
Status:

Possible statuses:

- queued
- running
- blocked
- completed
- failed

---

## Token Efficiency

Do not send progress updates as conversational messages.

Use external state/status tracking where available.

The parent agent should receive only the final result of a subagent unless intermediate information is required for a decision.

---

## Completion

A task reaches 100% only when:

1. implementation is complete
2. applicable verification is complete
3. known failures are resolved or explicitly reported
4. final diff has been inspected.
5. no required cross-department approval remains.
