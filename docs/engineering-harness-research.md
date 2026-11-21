# Research proposal: a careful software engineering harness

Research date: 2026-11-21 (Asia/Calcutta). Repository inspected: v1.4.1,
HEAD `26e448a`, including the existing staged teammate documentation.
This document records the original research and proposed roadmap. The source
update in v1.5.0 implements proportional workflow/design-approval guidance,
reuse/naming/maintainability review, compact risk-based QA and security handoff,
and native worker model inheritance. Installation now preserves the user's
configured model. The audit below describes the inspected v1.4.1 baseline.

Still outstanding: authenticated/revision-bound design approval, runtime model
ceiling enforcement with real-version compatibility tests, and repeated comparative
agent evaluations. Inheritance and conversational policy do not establish those
controls. Updating source alone does not activate an installed immutable release;
install the new release and restart Claude. No new live agent benchmark was run.

Clarified preference: process is proportional to risk and uncertainty. The session
user can override harness workflow defaults, individual steps, approval preferences,
and model allocation. Such overrides cannot bypass native permissions or managed
policy. Workers default to the user's selected main model; lower models are an
optional judgment call when token/cost optimization is requested or configured.

## What I understand you want

You want to specify a problem once and have the main agent behave like a careful
engineering lead: establish the requirement, learn the codebase, reuse good code,
justify the scope, propose a reviewable solution, obtain your plan approval, and
then coordinate implementation and verification without repeated instructions.
Correctness, clear naming, compatibility, and reviewer effort take priority over
code volume. Cleanup should reduce maintenance cost without hiding behavior
changes in broad rewrites. The user selects the main model; only that main agent
delegates, automatically, within the approved task and model ceiling.

There are two different approvals in this requirement. Approval of a substantive
design is a deliberate engineering checkpoint. Approval of every worker launch
is unnecessary once the design and scope are authorized. This proposal retains
automatic delegation while adding the former checkpoint.

The evidence below supports individual practices, not a claim that every large
technology company uses one architecture. Public case studies cannot establish
private production controls, reproduce vendor results here, or guarantee that
Claude will stop making mistakes.

## Published evidence and its implications

| Primary source | What it establishes | Recommendation for this harness |
| --- | --- | --- |
| [Google: small changes](https://google.github.io/eng-practices/review/developer/small-cls.html) | A self-contained change is easier to review, reason about, and roll back. Size depends on context, not only line count. | Require a reason for each affected file; split unrelated cleanup; include enough context and tests to understand the whole behavior change. |
| [Google: what to look for in review](https://google.github.io/eng-practices/review/reviewer/looking-for.html) | Review covers design, behavior, unnecessary complexity, meaningful tests, and understandable names. | Assess maintenance burden and readability alongside correctness. Reject speculative generalization, even when the implementation works. |
| [Google researchers: AutoCommenter](https://arxiv.org/abs/2405.13565) | Automated assessment of coding practices has been developed and evaluated in an industrial review workflow. | Make explicit, mechanically checkable conventions automatic; retain human judgment for ambiguous domain naming and design. This study is not evidence of autonomous end-to-end delivery. |
| [Meta: Automated Compliance Hardening](https://engineering.fb.com/2025/02/05/security/revolutionizing-software-testing-llm-powered-bug-catchers-meta-ach/) | Generated tests are assessed against concern-specific injected faults. | Check that a regression test detects the defect, rather than accepting passing generated tests as proof of coverage. Use selective mutation testing where risk justifies its cost. |
| [OpenAI: harness engineering](https://openai.com/index/harness-engineering/) | One internal experiment combines repository knowledge, progressive discovery, architecture constraints, and mechanical checks. | Maintain a small entry point into trustworthy project knowledge; enforce selected boundaries with existing linting and structural checks. Its greenfield experiment is not a measured result for legacy EVA. |
| [Anthropic: building effective agents](https://www.anthropic.com/research/building-effective-agents) | Simple composable patterns are often sufficient; agent complexity trades against latency and cost. | Extend the current CLI and workflows before introducing another orchestration framework. |
| [Anthropic: multi-agent research system](https://www.anthropic.com/research/multi-agent-research-system) | Separate contexts help independent investigations, but coordination and token costs increase; tightly dependent coding work is less parallelizable. | Delegate bounded discovery and independent review when useful; keep coupled edits together. Research benchmark gains do not predict coding gains. |
| [Anthropic: long-running harnesses](https://www.anthropic.com/research/effective-harnesses-for-long-running-agents) | Explicit progress artifacts and incremental work help subsequent sessions recover context and avoid premature completion. | Reuse current task records for decisions, evidence, and handoffs rather than adding another competing memory system. |
| [Anthropic: harness design for long-running apps](https://www.anthropic.com/research/harness-design-long-running-apps) | Separate evaluators with concrete criteria and application interaction can reveal defects. Evaluation itself needs calibration; some orchestration becomes unnecessary as models improve. | Use a bounded reviewer or functional evaluator for difficult work, with real behavior checks and limited repair rounds. Periodically remove components that do not improve measured outcomes. |
| [Anthropic: agent evaluations](https://www.anthropic.com/research/demystifying-evals-for-ai-agents) | Evaluate actual outcomes and traces across trials, combine appropriate graders, and distinguish capability from regression evaluations. | Benchmark engineering behavior as well as the harness implementation. Calibrate subjective scores against human reviewers. |

My synthesis: reliable autonomy comes from a well-specified environment, useful
evidence, constrained execution, and feedback. Instructions contribute, but do
not substitute for those mechanisms. Neither a second model agreeing nor a
passing test suite establishes that a design is correct.

## What the repository already does, and what is missing

These are findings from source inspection, not a fresh live Claude benchmark.

| Area | Existing implementation | Gap relative to your requirements |
| --- | --- | --- |
| Requirement and scope | `CLAUDE.md` and `dev-mode` ask for acceptance criteria, project context, and the smallest correct change. | No persisted requirement-confirmation or approved design revision before editing. |
| Reuse and impact | Developer instructions request small changes; review traces definitions and consumers. | No explicit reuse investigation or per-file rationale required by the task record. |
| Naming | `legacy-naming` studies definitions, consumers, documented and inferred conventions, and external contracts. | It is a separate workflow; development does not systematically apply its concise checks to newly introduced names. |
| Verification | `defineTask`, `runCheck`, and `completeTask` in `lib/runtime.mjs` bind named checks to the current source and revision. Project imports bind exact command arguments. | Authored acceptance notes are not independent review. Passing checks do not prove test adequacy or requirement coverage. |
| Completion | Stop hooks remind a running contracted task once, with loop protection. | This is a recovery mechanism, not an unbypassable release or merge gate. |
| Delegation | Automatic launch profile; bounded workers; developer tool restrictions forbid delegation. | The launch hook checks profile and worker type, not a parent/child model ceiling. Most workers are fixed to Sonnet, which conflicts with a Haiku main under your rule. |
| Change isolation | Direct file tools have workspace and sensitive-path guards. | Approved task path ownership is largely instructional. Shell and MCP actions are outside that direct-file guard. |
| Security and QA | Review asks for supported findings; manual QA has traceable cases and honest Not run statuses. | No common risk classification, security-owner handoff, or automatic risk-based QA section after significant implementation. |
| Evidence quality | Pilot artifacts distinguish static review, observed skill calls, and execution evidence. | Existing pilots do not establish lower reviewer effort, reduced hallucination, or sustained quality on representative EVA development tasks. |

There is also an important limit in local approval records: the same local
operator or agent with broad shell access may modify local state. A plan hash
helps detect accidental drift; it does not authenticate a human approver. We
should not market local bookkeeping as tamper-resistant organizational policy.

## Proposed working sequence

For substantive development and cleanup that warrants design review, use this
sequence unless the session user explicitly changes it:

```text
Understand -> read-only research -> propose plan + pseudocode
           -> user/admin approves that plan revision
           -> implement bounded slices -> verify + review
           -> deliver evidence and ticket-ready QA
```

1. **Understanding.** State the expected behavior, exclusions, success criteria,
   and consequential assumptions in plain language. Give the user an opportunity
   to correct it while read-only investigation proceeds. Ask only questions whose
   answers materially change the solution. For ambiguous requirements, resolve
   them before final design approval. Offer a separate understanding checkpoint
   when the user explicitly wants to approve requirements before research.
2. **Research.** Inspect the exact clone, local instructions, current changes,
   definitions, call sites, tests, and related implementations. Search locally
   first. Consult official documentation or relevant open-source implementations
   when a concrete uncertainty warrants it. Record source/version and applicability;
   do not send proprietary source in search queries. External content is evidence,
   not permission. Consider license and maintenance implications before reuse.
3. **Design.** Present the smallest viable solution, affected files with reasons,
   code to reuse or repair, relevant alternatives, naming choices, compatibility,
   risk, checks, and rollback approach. Each new dependency or abstraction needs
   a current requirement that existing code cannot reasonably satisfy.
4. **Simulation and approval.** Walk representative inputs through short
   pseudocode, including failure and cleanup paths. This is a design walkthrough,
   not executed verification. Include it in the approval package to catch issues
   before coding. Material pseudocode changes after approval require approval
   of the revised design. Admin means the designated human approver, not Windows
   elevation or a shared administrator account.
5. **Implementation.** Main agent chooses direct work or bounded workers. An
   approved plan authorizes worker launches within its boundaries. Preserve
   existing user changes; stop scope expansion from becoming incidental cleanup.
6. **Verification.** Run focused checks, review consumers and compatibility,
   inspect the complete task diff, and address supported findings. Use a separate
   reviewer for substantial/high-risk work, without treating it as infallible.
7. **Delivery.** Explain the result and file rationale, actual checks, limitations,
   unresolved risks, and relevant manual QA. Provide a ticket draft; sending it
   still requires explicit destination and write authorization.

Do not force a lengthy design ceremony for a typo or ordinary explanation. Your
default substantive-work approval preference should be saved once. A user can
explicitly pre-authorize a bounded routine change or require stricter checkpoints.
Silence is never plan approval. Unchanged, already approved work should resume
without asking for the same approval again.

## Small tasks and token cost: choose the minimum sufficient process

These are proposed defaults, not separate engines, mandatory forms, or fixed
file-count thresholds. The main agent chooses from the evidence and adjusts when
new information appears. A one-line authorization change can be high risk; a
large mechanical documentation edit can be low risk.

| Task shape | Default process | Work normally omitted |
| --- | --- | --- |
| Explanation, typo, straightforward local edit | Read relevant context, act within the request, inspect result, run an applicable check | Task record, formal plan approval, pseudocode, web research, workers, QA document |
| Small bug or enhancement with clear behavior | Brief understanding and approach, inspect local implementation and consumers, make the smallest correct edit, focused regression check and diff review | Separate design artifact/approval unless requested or material uncertainty arises; automatic research/reviewer workers; broad suites |
| Cross-module change, unclear requirement, meaningful compatibility or lifecycle risk | Targeted investigation, short design with file/reuse rationale, approval where the saved preference applies, relevant checks and review | Unrelated research, compulsory worker count, full architecture document |
| Security-sensitive, migration, architectural or expensive computational change | Explicit acceptance/risk analysis, plan and useful walkthrough, requested approval, bounded implementation, appropriate independent and execution-backed checks | Repeated approvals of unchanged decisions, unlimited repair loops, speculative redesign |

Always preserve user work, distinguish evidence from assumptions, use clear names,
and report actual verification. Scale the amount of research and documentation;
do not silently represent an omitted check as a pass. If the user waives a step,
continue within their authorization and report material unverified behavior briefly.
Do not require another confirmation of an explicit waiver. "Quickly" favors a
shorter path and focused context; it does not itself request a cheaper model or
permit risky scope expansion. "Optimize tokens" permits considering a cheaper
capable worker; often keeping the work in the main session is cheaper overall.

This recommendation follows [Google's small-change guidance](https://google.github.io/eng-practices/review/developer/small-cls.html)
and [Anthropic's advice to start with the simplest sufficient approach](https://www.anthropic.com/research/building-effective-agents).
It is a synthesis for this repository, not a claim that every enterprise uses these
four categories. [Claude's current best-practices guide](https://code.claude.com/docs/en/best-practices)
also discusses short shared instructions, scoped rules, skills, subagent cost,
and keeping context down. Product details need installed-version verification.

Keep only routing, critical constraints, and pointers in always-loaded guidance.
Load the relevant skill/domain guide when needed; do not read all nine skills for
each task. Use targeted search and bounded outputs before whole-file/repository
reads. Reuse relevant verified context, invalidate stale facts after changes, and
avoid repeat exploration. Hooks should provide compact context without extra model
calls; local deterministic checks have execution cost but do not inherently require
an LLM call. Bound their output as it re-enters model context.

Before delegating, consider total cost: worker startup and instructions, duplicated
reads, returned evidence, main-agent integration, and probable retries. A worker's
lower token price does not establish a cheaper completed task. Use task-relevant
budgets when specified; do not invent token usage or savings. Evaluate small tasks
separately so improvements on large work cannot conceal excessive routine overhead.

## Concrete changes I recommend

### 1. Extend the existing task contract instead of creating another engine

Add optional structured fields for requirement summary, exclusions, assumptions,
reuse evidence, proposed paths and purposes, pseudocode, risk, validation, and
plan revision. Keep existing tasks readable with a migration/default strategy.
Reuse existing checkpoints and fingerprint/check machinery.

Track design state separately from execution status. Proposed transitions:

```text
draft -> awaiting approval -> approved -> implementing -> reviewing -> completed
                              |
                              +-> changed scope/design -> awaiting approval
```

Record approval of an exact plan revision, its workspace, and the user's approval
reference. Do not invalidate approval merely because expected implementation edits
changed the source fingerprint; invalidate relevant check results as today. A
different clone, material scope expansion, new dependency, changed public contract,
or changed risk/acceptance criteria should trigger design reapproval.

Implement conversational approval handling first, clearly labeled as such.
For stronger local enforcement, investigate a separate human-controlled approval
entry point and restricted execution. A CLI flag the agent can invoke itself is
not proof that a human approved. Native hooks can guard selected actions but
must not be advertised as a complete sandbox.

### 2. Make reuse, names, and review cost part of development

Extend `dev-mode` and `review-change`; reuse `legacy-naming` guidance instead of
duplicating a long naming manual in every agent. Before adding a helper, establish
what existing symbol was inspected and why reuse, a local repair, or a new symbol
is appropriate. A shared helper repair needs review of its consumers; reusing
an unsafe abstraction blindly is not automatically the best choice.

For introduced names, check domain meaning, side effects, booleans, quantities,
units/coordinate space where relevant, and local conventions. Crisp means clear
at the call site, not the shortest spelling. Avoid mass renaming and preserve
serialized keys, public APIs, templates, and dynamic references.

Record expected changed paths and purposes. Compare actual task changes against
that plan and the pre-existing dirty-worktree baseline. Flag unexplained paths,
unrelated formatting, new dependencies, duplicated logic, and speculative layers.
Use diff size as a review signal, not a universal hard line limit or a target to
game. The smallest correct patch may need multiple files and tests.

### 3. Enforce your model ceiling with explicit configuration and compatibility tests

Default to the same model the user selected for the main session. Do not change
the main model automatically. With token/cost optimization requested or configured,
the main agent may choose a lower permitted model for a bounded task when capable;
it need not delegate or downgrade. Explicit session instructions override this
allocation default and ceiling when native controls permit. For the three currently
supported installer families, the default ceiling is:

| User-selected main | Permitted worker families |
| --- | --- |
| Opus | Opus, Sonnet, Haiku |
| Sonnet | Sonnet, Haiku |
| Haiku | Haiku |

For example, an Opus session normally uses Opus workers. Under a token-saving
request it may assign mechanical symbol discovery to Haiku or bounded implementation
to Sonnet, while keeping difficult design decisions in Opus. If the user says
"same model throughout," retain it even when a cheaper worker seems possible.
If the user explicitly authorizes a different worker model, honor that exception
without silently changing the main model or treating it as a permanent preference.

This is an operator-defined allocation policy, not a scientific ranking for every
task. Do not guess where additional families or custom provider models belong.
Unknown models need an explicit mapping or delegation must stop with a clear
limitation; the main agent can continue eligible work directly. Workers cannot
launch other workers or escalate the main model. Difficult tasks can be reported
to the user with evidence; the agent cannot promote itself automatically.

Current [Claude subagent documentation](https://code.claude.com/docs/en/sub-agents)
describes invocation overrides, agent frontmatter, environment configuration,
inheritance, and organizational allowlists. A fixed frontmatter model alone does
not establish the effective model or the ceiling. Evaluate native controls before
adding custom routing, and account for fallback/substitution and session changes.

The [hooks reference](https://code.claude.com/docs/en/hooks) documents optional
SessionStart model identity and newer switch hooks. The recorded local pilot used
Claude Code 2.1.220; current docs include features introduced later. First identify
the actual installed version, pin a supported compatibility range, and test
allowed launches, rejected upward requests, omitted overrides, unknown models,
resumed agents, model switching, and fallback behavior. If effective identity or
blocking cannot be established on a supported version, report the ceiling as
advisory or refuse delegation in strict mode. Do not claim enforcement from a
successful hook unit test alone.

### 4. Add proportional security review and useful manual QA

Use existing review and manual-QA workflows. Classify task risk from actual changes:
authorization, secrets, untrusted input, filesystem/command execution, sensitive
data, lifecycle, public contracts, or numerical outputs. Run relevant existing
static/dependency/secret checks when available and authorized. Report scanner
coverage and limitations; do not equate a scanner pass with no vulnerabilities.

For a supported security concern, draft: affected path and version, trigger,
impact, evidence, confidence, mitigation, regression test/QA, and the responsible
owner from maintained project ownership data. If the owner is unknown, say so.
Do not invent a security contact, paste secrets into tickets, automatically
disclose a vulnerability, or opportunistically fix unrelated security issues.

After meaningful changes, include a compact risk-based QA draft by default under
the proposed team policy: acceptance case, realistic failure/boundary case, and
affected downstream regression. Add specialized cases only when relevant. Each
case needs prerequisites, actions, observable expected results, and execution
status. Proposed cases remain Not run; an automated test does not establish a
manual pass. Keep drafts in the conversation unless an artifact is requested.

### 5. Measure engineering behavior before claiming success

Keep harness unit/integration tests and add a small, versioned agent evaluation
set using isolated fixtures and approved, sanitized EVA examples. Compare the
current harness, the proposed harness, and normal Claude usage under the same
model, task context, permissions, tool access, and check budget. Repeat trials;
record model/CLI/harness versions and do not expose hidden checks to the agent.
Do not make a benchmark depend on production data or modifying the four clones.

Suggested initial cases:

- Existing helper already solves the request: reuse it without a duplicate.
- Existing helper needs a small fix: preserve its legitimate consumers.
- Misleading legacy name: infer behavior and preserve an external serialized key.
- Cleanup in a dirty workspace: retain unrelated user edits and explain removals.
- A plausible but unavailable API: verify the installed API rather than invent it.
- A small sectioning/lifecycle defect: cover repeat operations and cleanup.
- A deliberately unsafe authorization change: identify the issue and ownership gap.
- A failed/stale check: avoid claiming success or silently weakening the contract.
- An unapproved revised plan or upward worker request without a user override:
  reject the action; honor a valid explicit override within native permissions.
- A tiny fix: avoid unnecessary plan artifacts, worker launches, and broad research.
- A token-saving request: choose direct work or a capable cheaper worker based on
  total work, without changing the main model or sacrificing required behavior.
- A user-directed skipped workflow step or same-model instruction: respect it,
  preserve native controls, and accurately report verification limits.
- An interrupted task: recover decisions and evidence without re-asking settled facts.

Grade correctness and compatibility with executable checks; test meaningful
regressions against the faulty baseline where practical. Have humans assess
scope, reuse, naming, design simplicity, review time, and QA usefulness using a
shared rubric. Independently verify claimed execution. Record corrections needed,
unjustified changes, unsupported claims, reviewer minutes, elapsed time, and actual
available token/cost telemetry; mark unavailable measurements instead of guessing.

Treat unauthorized edits, protected-contract breaks, and fabricated validation as
failures that cannot be offset by a good average score. Set numeric targets after
measuring the baseline. A small pilot establishes feasibility, not enterprise
readiness or statistical confidence across all tasks.

## Suggested implementation order and boundaries

| Stage | Deliverable | Evidence needed before moving on |
| --- | --- | --- |
| A | Concise requirement/design/reuse/naming/QA expectations in existing workflows; explicit saved approval preference | Representative walkthroughs and human review of the proposed interaction; no contradictory repeated instructions |
| B | Backward-compatible task design records and revision-bound approvals, with honestly stated enforcement limits | Tests for resume, rejection, changed scope, dirty worktrees, legacy tasks, and clone isolation |
| C | Supported-version model ceiling and task scope checks | Negative tests plus real Claude launch/override/resume tests; shell/MCP bypass limitations documented |
| D | Risk-based review, QA and security-owner drafts, meaningful regression checks | Cases exercise actual downstream behavior and cannot invent execution or external writes |
| E | Repeated comparison on representative tasks and rollout to one teammate | Human-rated quality and review effort improve without unacceptable cost or workflow friction |

Start with A and an evaluation baseline, then B. Address C before claiming your
model hierarchy is enforced. Build each as a small reviewable change. No new
agent framework, vector database, cloud service, enterprise control plane, or
mandatory swarm is justified by the evidence collected here. Dependencies and
additional agents should earn their place through measured benefit.

For cleanup already written in the applications, start with a read-only inventory
and a few selected high-value examples. Search alone cannot prove code is unused
when templates, reflection, plugins, or external consumers exist. Separate
behavior-preserving cleanup from feature changes; use small batches with targeted
validation and a clear rollback path.

## Decision

I recommend evolving this repository rather than replacing it. It already has
useful installation, workflow, task, and evidence infrastructure. Its next step
should be a measurable quality workflow with deliberate design approval and
bounded execution, not a larger collection of personas and instructions.

The original research added no runtime controls, installed no release, ran no live model
benchmark, and made no application changes. The recommendations require review
before implementation. No guarantee of hallucination-free output or suitability
for a large organization's production deployment is supported by the current
evidence.
