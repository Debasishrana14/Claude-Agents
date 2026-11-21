# EVA Agent Harness

A local workflow and operations layer for Claude Code. It provides automatic
workflow discovery, versioned installation, rollback, diagnostics, private local
event receipts, and recoverable task records. Claude Code supplies the model,
tool execution, native permissions, and session management.

Requires Node.js 22+ and Claude Code. No npm dependencies. Optional isolated jobs
require a local Linux Docker engine with working resource controls.
This release is a tested local foundation, not a certification or a hosted
enterprise platform.

Local operations, isolated jobs, clone aliases, deployment prerequisites and
remaining environment dependencies are documented in [docs/operations.md](docs/operations.md).
The November 21 live/application validation is in
[docs/validation-2026-11-21.json](docs/validation-2026-11-21.json).

## Install and use

**Need to check installation or understand hooks? Read the [usage and hooks guide](docs/usage-and-hooks.md).**
It explains the difference between installed and active, the status fields,
daily workflow commands, and the current rollback/deactivation limitation.

**Sharing with teammates? Start with the [step-by-step team setup guide](docs/team-setup.md).**
It covers downloading the harness, installing it, linking each person's application
checkouts, verifying activation, daily prompts, updates, and rollback. Each teammate
installs their own local copy using their own Claude account; no shared server is required.

From this checkout:

```text
node tools/harness.mjs validate
npm test
node tools/harness.mjs install
node tools/harness.mjs doctor
```

The default destination is `~/.claude`, or `CLAUDE_CONFIG_DIR` when set. Override
it with `--home PATH`. The installer preserves your configured model (uses
Sonnet when none is configured),
merges its permissions and hooks, and adds a marked CLAUDE.md import with escaped
spaces. Existing permissions, unrelated hooks, instructions, and extra skills
are preserved. A colliding unmanaged agent, rule, or skill aborts installation.
Installation uses directory links (junctions on Windows), so directory-link
support is required; copied files need no Windows Developer Mode.

Legacy group junctions pointing to this checkout are migrated into real config
directories. Extra directory entries retain links to their original location;
in particular, existing synced skills remain available. Do not delete those
original directories while their extra entries are linked.

Restart Claude Code after installation. Then send an ordinary development
request; `/dev-mode` and other slash commands remain available as overrides.
Automatic delegation is the default: bounded reader and writer agents can work
within your request without per-agent approval. Optional restrictive profiles
are described below.

To verify activation:

```text
node tools/harness.mjs doctor
node tools/harness.mjs status --workspace "PATH TO YOUR PROJECT"
```

Doctor checks installed assets and release hashes. Status summarizes startup,
prompt routing, successfully observed skill calls, denied direct tool calls,
recent hook receipts, and saved tasks for a workspace. A routing suggestion is
distinct from a skill actually being observed. An installation pass does not establish
that a running session loaded it. In Claude, inspect `/context all`, `/memory`,
`/skills`, `/agents`, and `/hooks` as supported by your installed version. Project
or managed configuration can affect the effective settings. The hook records
prove hook execution; they do not prove semantic compliance with every rule.

## Engineering workflow and delegation

For substantial work, ask Claude for an observable result and its constraints:

```text
Fix repeated section regeneration while preserving retained object identity.
First inspect project guidance and consumers, define acceptance criteria and
checks, then implement, review the change, and validate. Keep exports compatible.
```

The development skill now separates exploration, implementation, and verification
when needed, keeps context focused, and uses a dedicated `/review-change` skill.
The reviewer worker has read/search tools only, no shell or write access. Numerical
or performance claims require relevant tolerances, input scale, and comparable
measurements; no benchmark is invented or launched automatically.

To discover project instructions, scripts, and configured checks without running
them:

```text
node tools/harness.mjs project-context --workspace "PATH TO YOUR PROJECT"
```

Optionally maintain `.eva-harness.json` in the application repository. See this
repo's own file for the schema: `schemaVersion: 1`, a `criteria` array, and a
`checks` array of unique `{label, argv, purpose}` entries. Commands are argv arrays,
not shell strings. These are project data and never grant permission to execute.
The inspector does not infer or execute a monorepo's scripts, install dependencies,
or evaluate JavaScript configuration. Read the identified guidance before acting.

For a substantial task, Claude can use the session-bound runtime CLI:

```text
task begin --title "Fix repeated section generation"
task define TASK_ID --from-project --criteria "Repeated generation preserves identity"
task checkpoint TASK_ID --note "Changed paths, decisions, remaining work"
task check TASK_ID --label unit -- node --test path/to/actual.test.mjs
task complete TASK_ID --summary "Result" --acceptance-note "Reviewed the stated criteria and downstream contracts"
```

Use check labels/argv from the actual project contract; `unit` above is illustrative.
Alternatively define task-specific criteria with `--criteria TEXT --required-checks
unit,typecheck`. Contracted completion requires every current named check. Imported
project commands must match recorded argv, so a trivial substitute under the same
label is rejected. Source changes and new checkpoints invalidate older evidence.
Acceptance notes remain authored assessments, not proof that a chosen test suite
is sufficient. Older tasks without a contract retain their original behavior.

The session-bound CLI associates new tasks and resumed checkpoints with the current
session. Stop hooks remind Claude once if a contracted task remains running. To
prevent an infinite hook loop, the next Stop with `stop_hook_active` is allowed;
the event records loop protection. Paused/blocked tasks and unrelated sessions do
not block stopping. This is a completion reminder, not an unbypassable security gate.

Choose delegation explicitly when installing:

```text
node tools/harness.mjs install --delegation automatic
node tools/harness.mjs install --delegation manual
node tools/harness.mjs install --delegation read-only
```

`automatic` removes per-agent launch approval for reader and writer agents within
the authorized task; file/tool permissions still apply. Selecting it explicitly
removes existing Agent/Task launch ask rules, including per-role rules, while
preserving other asks and all deny rules. It does not enable bypass mode.

`manual` preserves approval for every agent. `read-only` authorizes bounded
research/debugger/reviewer workers within the requested work; writer, general,
and unknown worker roles still trigger a native approval request from the hook.
The main session announces purpose and keeps a small worker budget. Worker count
is an instruction-level budget, not a resource quota. Other tool restrictions and managed
policy remain in force. In `read-only` mode only Agent/Task asks previously added by this
installer may be removed; user-authored asks are retained,
and settings drift is treated conservatively. Doctor reports preserved restrictions.
Omitting `--delegation` on later installs preserves the selected profile. Rollback
restores the previous profile and settings. The installer does not enable bypass
permission mode, purchase account access, or elevate OS privileges.

Installation preserves the existing configured model, including full provider
model IDs; a fresh configuration defaults to Sonnet. Use `install --model opus`,
`--model sonnet`, or `--model haiku` to explicitly change that default. Rollback
restores the previous settings. Harness workers use `model: inherit`, following
the main session by default. With requested/configured token optimization, the
main agent may choose a capable lower model or keep work direct; "quickly" alone
does not request a downgrade. Session instructions can override workflow defaults.
The equal-or-lower family ceiling is advisory: launch overrides and provider or
managed substitution affect actual models. No runtime ceiling or account access
is established by these definitions. See [Claude's model selection rules](https://code.claude.com/docs/en/sub-agents#choose-a-model).

## How much process does a task need?

| Work | Default workflow |
| --- | --- |
| Question, typo, clear local edit | Answer or edit directly; inspect the result. |
| Small bug/enhancement | Brief understanding, inspect local code and consumers, minimal patch, focused check and diff review. |
| Substantial or uncertain design | Explain requirements, research relevant existing code, propose scope/reuse/names/checks and useful pseudocode; obtain human approval before implementation. |
| Security, migration, architecture, expensive computation | Add explicit risk analysis, bounded execution, recovery, and appropriate review/verification. |

The session user can skip or strengthen workflow steps and pre-authorize bounded
work. This does not override native permissions or managed policy. Small work
needs no formal plan record or worker. Use durable task records when recovery is
useful. Prefer existing code and familiar project patterns; new abstractions
need a concrete reason. Review readability, naming, compatibility, and reviewer
effort as well as test results. Meaningful behavior changes receive compact
manual QA drafts, marked Not run unless execution evidence exists. Full QA
documents and commit drafts remain on demand. No ticket is sent automatically.

These are agent workflow instructions. Design approval, scope ownership, model
allocation, and engineering judgment are not authenticated runtime guarantees.
The [research proposal](docs/engineering-harness-research.md) distinguishes the
implemented guidance from remaining evaluation and enforcement work.

## Manual QA and commit drafting

After restarting Claude Code, use either ordinary requests or these commands:

```text
/manual-qa Prepare manual test cases for EVA-123 using these acceptance criteria: ...
/manual-qa Turn the staged changes into a QA section I can paste into the ticket.
/commit-message Read staged changes and draft a message using our repository convention.
/commit-message Recommend atomic commit groups for these staged changes; do not change staging.
/commit-message Draft one squash message for the staged result.
```

These skills run in the main conversation; no additional agent is required.
They are selected when relevant, and explicit slash commands override routing.
Both can be used after development when requested, without modifying code.

Manual QA output includes known ticket context, preconditions/test data, actions,
observable expected results, priority, acceptance-criteria coverage, and gaps.
New manual cases are **Not run**. A ticket-ready draft does not post a comment
or change the ticket's status. Provide the ticket content if no connected source
can retrieve it; the skill must distinguish supplied requirements from inference.

Commit drafting follows your explicit strategy, then repository contribution or
commitlint/release conventions, then recent subjects. If none establishes a
convention, it defaults to Conventional Commit style with atomic grouping. A
mixed index gets suggested groups rather than automatic staging changes. Squash
drafts describe the combined final behavior. Staging, committing, and pushing
each require an explicit user request for that action; implementing or finishing
a task grants none of them. Commit authorization does not include push permission.
A message request does not stage, unstage, commit, amend, rebase, or push, and
ticket IDs or passing-test claims require evidence. Installed native permission
rules ask for `git add`, `git commit`, and `git push`; these supplement the workflow
rule and do not intercept every possible shell, alias, Git API, or MCP write.

The read-only context collector is also available directly:

```text
node tools/harness.mjs commit-context --workspace "PATH TO YOUR PROJECT"
```

It returns index-based statuses, patches, recent subjects, and completeness
flags. It excludes unstaged/untracked contents, including unstaged edits to a
partially staged file. Sensitive filenames are withheld; this is a filename
filter, not a guarantee that arbitrary source code contains no secrets. Large
patches, conflicts, and concurrent staging changes are marked incomplete rather
than presented as a complete review. No patch data is saved by the collector.
The seven collector tests use temporary Git repositories; they do not stage or
commit changes in this project. Skill instructions are structurally
validated; the historical live pilot below does not evaluate their prose quality.

## Legacy naming recommendations

Use the naming skill from the actual application project:

```text
/legacy-naming Study naming conventions in src/app/configurator/common/geometry-layer and suggest better variable and function names in this file: ...
/legacy-naming Recommend a name for this new function based on neighboring code: ...
/legacy-naming Review these identifiers; keep names that already fit our standards. Do not edit files.
```

It inspects documented guidance, comparable local symbols, implementations,
types, and call sites. It distinguishes module-specific legacy patterns from
repository-wide standards and explains suggestions with concrete evidence and
confidence. It checks whether a rename touches public contracts, templates,
serialization keys, or known downstream consumers. No code is renamed unless
you request implementation separately.

The skill does not arrive with EVA naming standards already learned: this
repository contains harness configuration and domain guides, not the complete
application source. Supply the relevant application path/code when invoking it.
Observed conventions stay in the current review unless you ask to save a
maintained project standard. The skill is structurally validated; its naming
judgment has not yet been evaluated on a real EVA code sample.

## Durable tasks

The SessionStart hook supplies the installed runtime CLI path. Run these commands
with that CLI, or with `node tools/harness.mjs` from this checkout:

```text
node tools/harness.mjs task begin --title "Fix section regeneration" --mode dev-mode
node tools/harness.mjs task show TASK_ID
node tools/harness.mjs task checkpoint TASK_ID --note "Changed files, decisions, remaining work"
node tools/harness.mjs task check TASK_ID -- node --test path/to/relevant.test.mjs
node tools/harness.mjs task complete TASK_ID --summary "Implemented and validated"
```

Checks execute an argv array without a shell, in the saved workspace. On Windows,
use an executable such as `node` rather than a `.cmd` wrapper. Command output is
returned to the terminal; only its command hash, exit status, timing, and workspace
fingerprint are saved. A check that changes the workspace does not count as a pass.

Completion requires successful checks for the current checkpoint revision and
workspace fingerprint. In Git repositories, tracked and non-ignored untracked
files are fingerprinted. Git-ignored files, external dependencies, and symlink
target contents are outside that guarantee. Without Git, the fallback excludes
`.git`, `node_modules`, `.scratch`, and `.claude/state`. A passing command is
evidence of that command only; the harness cannot judge whether it is sufficient.

If no executable check applies, `task complete ... --skip-reason "Reason"`
records an **unverified** outcome. It cannot waive a failed current check.
Use `task checkpoint ... --status paused|blocked|cancelled` as needed; resume
with a normal checkpoint. Tasks survive restart, and unfinished task IDs are
presented to Claude for inspection, not silently resumed.

## Releases and rollback

Installation copies maintained assets into
`~/.claude/eva-harness/releases/VERSION-CONTENT_HASH/`. The installed workflow
does not follow subsequent edits in this checkout; rerun installation to deploy
them. Reinstalling an identical release is idempotent. Release files are expected
to remain immutable; doctor detects modifications but provides no cryptographic
publisher authentication.

```text
node tools/harness.mjs rollback
```

Rollback restores the previous installation's managed files and settings. It
refuses to overwrite edits made since installation. Release archives remain for
inspection. Installation intents are journaled before mutations; interrupted
installation can be reversed with rollback. If a process crashes while holding
an operation lock, first verify the recorded PID is no longer running, then
remove only that stale `.lock` file and retry rollback. Do not edit the journal.

## Controls and data

- Native permission rules deny direct reads of `.env`, `.env.*` (including
  `.env.example`), and `.credentials.json`, and request approval for selected
  Git operations. Launch approvals depend on the selected delegation profile;
  automatic mode removes delegation-only ask rules. Other restrictions remain.
- PreToolUse checks direct Read/Edit/Write/NotebookEdit calls. It blocks secret
  file access, writes outside the workspace (resolving existing symlinks), and
  writes to Git internals or installed harness state/releases. It never grants
  access that native permissions would reject.
- The research, debugger, and reviewer workers have read/search tools only. Test writers
  cannot execute commands. The developer has an explicit local tool list and
  cannot delegate. Worker writable assignments are instructions, not an OS
  access boundary.
- Hook receipts contain timestamps, event/tool/agent names, routing mode, a
  skill identifier when present, a hashed session ID, and a workspace hash. Prompts, skill arguments, tool arguments/results,
  commands, transcripts, and source contents are not retained by this logger.
  Task titles and checkpoint notes are user/agent-authored: keep them non-sensitive.
- Session logs are bounded by events per session and pruned after 30 inactive
  days on session start. Task records, counters, installation snapshots, and
  release archives remain until explicitly managed. Native Claude telemetry and
  transcripts have separate retention policies.

Hooks are defense in depth. They do **not** sandbox Bash, MCP, plugins, child
processes, or a user who controls the config. No shell-command regex is presented
as a security boundary. Hook failure blocking depends on Claude's event behavior
and effective settings. Use managed policy and isolated execution for team-level
enforcement; avoid bypass-permission modes for controlled environments.

## Validation and rollout

The code stays split by responsibility: `core` supplies shared filesystem/policy
helpers; `install` owns release transactions and rollback; `runtime` owns hooks,
tasks, and check receipts; `project` discovers contracts and checkout aliases;
`git-context` collects staged evidence; `jobs` manages opt-in Docker execution.
The two tools are CLI/protocol entry points. Workflow decisions belong in scoped
skills and domain guides, rather than another orchestration framework.

CI validates definitions and runs behavioral tests on Windows and Linux. Tests
cover installation preservation, rollback and drift, legacy junction migration,
route selection, hook protocol, direct-file controls, privacy, timeouts, recovery,
and stale validation evidence. They use temporary config homes and do not call
a model or send data externally.

Before organization-wide use, pilot real EVA tasks in approved isolated projects.
Measure correctness, routing, approval burden, cost, completion time, recovery,
and policy violations against ordinary Claude Code. Release only after those
results meet your team's acceptance criteria. Team identity/SSO, centrally
enforced policy, remote tamper-resistant audit storage, resource quotas, and
organization-specific security review require deployment infrastructure beyond
this local repository.

Runtime interfaces follow the official Claude Code documentation:
[hooks](https://code.claude.com/docs/en/hooks),
[settings](https://code.claude.com/docs/en/settings),
[skills](https://code.claude.com/docs/en/skills), and
[memory imports](https://code.claude.com/docs/en/memory).

The local live pilot results are recorded in [docs/pilot-results.json](docs/pilot-results.json).
They exercise synthetic section-regeneration fixtures in temporary workspaces;
they are not a benchmark of the complete EVA application. Raw session streams
remain local under ignored `.scratch/pilot/` because they can contain prompts,
tool arguments, source excerpts, and machine-specific paths. Pilot model calls
are intentional and are separate from the offline test suite.
