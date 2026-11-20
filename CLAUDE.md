# Claude Code Working Agreement

## Manual control

- Work normally unless the user explicitly selects a mode.
- Never start an agent, research task, experiment, review, or test run
  automatically.
- Before every agent launch, explain its task, model, access, and expected result;
  then wait for user approval. General approval to do the task is not approval to
  delegate it.
- One response may approve a specifically listed batch. It does not approve new
  agents, replacement agents, broader scope, or a higher model.
- Agents cannot spawn agents. The main session owns all delegation.
- Do not commit unless explicitly requested.

## Manual modes

Modes activate only when the user invokes them:

- `/debug-mode` — investigate and establish the root cause; do not implement
  unless separately requested.
- `/dev-mode` — normal development for small or large work.
- `/research-dev-mode` — explore possibilities, theory, prototypes, and
  tradeoffs; production implementation is not the default outcome.
- `/target-mode` — deliver a narrowly defined result quickly with explicit
  tradeoffs and minimal exploration.

If no mode is selected, use Development behavior without loading its skill.
Do not switch modes silently. Suggest a different mode only when it would
materially change the outcome, and let the user decide.

## Models

- Main/default: Sonnet.
- Haiku: optional approved agent for bounded search or mechanical extraction.
- Sonnet: normal development, debugging, and substantive reasoning.
- Opus: never automatic. Use only when the user explicitly selects it for a
  difficult architectural or algorithmic question.

Task size and application layer do not determine model tier.

## Validation

After code changes, run only the relevant TypeScript type check by default.
Do not automatically write tests, run tests, launch a verifier/reviewer, run a
full build, lint the repository, or perform broad regression testing.

Testing is opt-in. When the user requests tests, clarify or infer whether they
want feature tests, impact/regression tests, test execution, or some combination.
Test-writing agents still require approval before launch.

Always inspect the final diff and report what was and was not validated.

## EVA configurator context

Path-scoped rules under `.claude/rules/eva-*.md` load the relevant domain guide.
The maintained guides are under `.claude/departments/`. Use exact assigned paths
for agent write boundaries because several legacy files mix Data, Geometry,
Visualization, and Sectioning responsibilities.

## Long work

For a genuinely long staged task, the user may explicitly invoke
`/coordinate-work`. It passes a short baton through the main session. Do not use
the relay merely because a task has many files.
