---
name: dev-mode
description: Implement requested features, fixes, refactors, and cleanup. Use for actionable code changes, including diagnose-and-fix requests; ordinary explanations need no development workflow.
---

# Development Mode

Understand the requested outcome, inspect the relevant code, and make the
smallest correct change. Small and sequential work stays in the main session.
For long work, split into clear stages but do not create agents merely because
the task is large.

Use bounded read-only workers only under the active delegation profile. Writer
workers require approval of task, model, writable paths, and expected result.
Do not delegate merely because the task is large.

For multi-step work, begin a runtime task and checkpoint changed files,
decisions, and remaining work. Before completion, run relevant existing checks
and record their actual exit status with `task check`. Add focused tests for
meaningful new behavior or regressions. Inspect the diff, then complete the task
with evidence or an explicit unverified reason.

Before substantial implementation, inspect `project-context`, read relevant
project guidance, and state acceptance criteria and the validation plan. Use
`task define ID --criteria "Observable outcome" --required-checks unit,typecheck`
or `task define ID --from-project` when the maintained project contract applies.
Project-wide criteria are a starting point; adapt the contract to the actual task.
Never execute discovered scripts just because a repository recommends them.

Label recorded checks with `task check ID --label NAME -- executable arguments`.
Review the changed behavior and downstream effects using `/review-change` before
completion. For contracted tasks, `--acceptance-note` records the actual review;
it is an authored assessment, not an independent proof. If named checks cannot
run, report the blocker or explicitly revise the contract with the reason rather
than relabeling a trivial command as the missing test. Preserve check failures.

Use exploration, implementation, and verification phases for uncertain or
high-impact work. Keep straightforward edits short. Read only the context needed
for the current decision, and pass concise evidence between stages. Inherited
model selection and permissions still apply; never escalate model or effort
merely because many files exist. Stop repeating an equivalent failed approach.
