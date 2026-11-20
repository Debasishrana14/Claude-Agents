# EVA Agent Harness

A local workflow and operations layer for Claude Code. It provides automatic
workflow discovery, versioned installation, rollback, diagnostics, private local
event receipts, and recoverable task records. Claude Code supplies the model,
tool execution, native permissions, and session management.

Requires Node.js 22+ and Claude Code. No npm dependencies or background service.
This release is a tested local foundation, not a certification or a hosted
enterprise platform.

## Install and use

From this checkout:

```text
node tools/harness.mjs validate
node --test tests/harness.test.mjs
node tools/harness.mjs install
node tools/harness.mjs doctor
```

The default destination is `~/.claude`, or `CLAUDE_CONFIG_DIR` when set. Override
it with `--home PATH`. The installer changes your default model to Sonnet,
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
Delegation still requires explicit approval, but selecting a workflow does not.

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
  Git operations and agent launches. Existing stronger rules are retained.
- PreToolUse checks direct Read/Edit/Write/NotebookEdit calls. It blocks secret
  file access, writes outside the workspace (resolving existing symlinks), and
  writes to Git internals or installed harness state/releases. It never grants
  access that native permissions would reject.
- The research and debugger workers have read/search tools only. Test writers
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
