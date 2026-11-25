# Does the harness improve development work?

The product hypothesis is codebase-aware changes with less repeated prompting
and less reviewer cleanup. Skill counts, successful packaging tests, and a good
demonstration do not establish that result. This protocol evaluates development
behavior; the existing automated suite evaluates runtime and packaging behavior.

## Set up a fair comparison

Use disposable application copies from the same starting revision, with identical
dependencies, initial dirty state, native permissions, tools, model, effort, and
task prompt. Keep company material and transcripts in an approved private
location. Do not run evaluations against production or push trial changes.

Compare three conditions when investigating the source of an improvement:

| Condition | Purpose |
| --- | --- |
| Native Claude Code and existing project instructions | Realistic baseline |
| Baseline plus the same relevant project knowledge | Isolate the benefit of supplied knowledge |
| Harness with that same knowledge | Assess the additional workflow and runtime |

For the baseline, verify the plugin is disabled, no legacy global harness import
remains, and no explicit plugin directory loads it. Start a fresh conversation
for every trial. Running inside this harness repository would independently load
its root instructions; use the application copies instead. Record Claude and
harness versions and the actual loaded configuration, not only intended settings.

Alternate trial order. Run multiple trials per task where budget permits; record
the count and variability. Use the same predeclared time/token budget and the same
policy for clarification replies. Record interventions rather than quietly
coaching one condition more. Do not claim statistical significance from a few trials.

## Choose representative tasks before running

Use approved historical tasks with known acceptance criteria and separate
evaluation checks. Avoid giving the agent a reference patch or evaluator answers.

| Task | What to observe |
| --- | --- |
| Small bug with an existing regression test | Focused investigation, repair, and check without unnecessary ceremony |
| Enhancement with an existing helper | Appropriate reuse and checks of affected consumers |
| Legacy change with domain-specific names | Names supported by actual conventions; compatibility preserved |
| Ambiguous public behavior | A consequential question before guessing a contract |
| Async or lifecycle regression | Failure reproduction and downstream behavior |
| Review-only request with a known defect | Supported finding without modifying code |
| Staged commit-message request | Accurate brief draft from the index; no Git writes |
| Existing plan in conversation | Execution without requiring the plan to be repeated |

Choose relevant tasks for each claimed stack. A correct larger patch can be
better than a broken smaller one: do not rank solutions by line count alone.

## Grade outcomes independently

Have a human reviewer assess anonymized patches where practical, using the same
acceptance criteria across conditions. Keep agent self-reports separate from
executed checks and reviewer judgments. A model grader can assist, but should not
be the sole authority for correctness or maintainability.

Record one row per trial with:

- Task, condition, versions, configuration, trial order, and starting revision.
- Acceptance checks passed/failed/not run, with commands and actual results.
- Confirmed regressions, scope violations, and unsupported repository claims.
- Material reviewer corrections and review minutes, with concrete reasons.
- Repeated user instructions and clarification/intervention count.
- Elapsed time, actual token usage/cost when available, and worker count.
- Naming/reuse/maintainability judgment with local code evidence.
- Missing observations, environmental failures, and stopped or failed trials.

Use `unknown` for unavailable usage; do not estimate token savings from text
length or omit unsuccessful trials. Keep raw artifacts private and publish only
reviewed sanitized summaries. Capture metadata needed for evaluation without
collecting secrets or unnecessary company source.

## Decide what to ship

Before trials, agree the acceptable overhead for small tasks and which outcomes
matter to your team. Report quality and cost separately by task class rather than
hiding small-task regressions in an average. A few successes cannot establish
enterprise readiness, security isolation, or hallucination prevention.

If a workflow costs more without a demonstrated benefit, simplify or remove it.
Turn recurring observed failures into narrow regression cases; do not append
universal instructions for every isolated mistake. Rerun affected task classes
when a workflow changes, alongside the runtime suite. Record the limits of every
published comparison. No model-driven comparative trials are supplied by this
document, and no productivity improvement is claimed.

## Current improvement baseline and pending trials

The pre-change source revision for this improvement cycle is
`d8353a9b273c89438b70f93fd927344f24b1d285`. Preserve that revision as the
before condition; do not reconstruct it from modified source or run evaluation
inside the harness checkout. Runtime regression cases now cover unbound required
labels, failure persistence across checkpoints, ignored declared input changes,
and bounded plugin startup context. These deterministic cases do not measure
solver quality or delegation judgment.

Freeze task prompts, private evaluator checks, and a human rubric before paid
trials. In addition to the eight task classes above, include: a single-owner
one-line fix; two genuinely independent diagnostic hypotheses; separable work
with shared integration constraints; an unsafe shared repair that should be
deferred; and a root-cause repair competing with a downstream symptom guard.
Score both missed and unnecessary delegation, including duplicated reads,
integration errors, total tokens, elapsed time and human corrections.

No paid trial or calibration has run. First run a small explicitly budgeted
calibration, then estimate repeated baseline/current trials including graders.
Native agent permission coverage across named, generic, nested and unknown
agent types and migration of existing global installations remain separate
validation work. Competing implementations remain experimental and off by
default. Do not advertise these pending items as completed capabilities.

## Research informing this protocol

- [Claude Code best practices](https://code.claude.com/docs/en/best-practices):
  supply missing project knowledge, keep instructions focused, and use checks.
- [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents):
  start with simple approaches and justify added complexity against cost.
- [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents):
  distinguish tasks, repeated trials, grading, and observed outcomes.

These sources inform the design; they do not validate this harness's effectiveness.
