# Using the harness and checking its hooks

The harness supplies Claude Code with shared instructions, workflows, specialist
workers, and local task/check records. Claude Code runs the AI and its tools.
Hooks are small programs Claude calls automatically at particular moments; you
do not run the hook script yourself during normal work.

## 1. Check whether it is installed

Run these commands in **PowerShell**, not inside the Claude chat. First move to
the harness folder. This machine's folder is shown below; teammates should use
their own harness checkout path.

```powershell
Set-Location "E:\Copies of EVA software\Claude Agents"
node tools/harness.mjs doctor
```

`Set-Location` means change the terminal's current folder, like `cd`.

Read doctor's `installation` result:

| Result | Meaning | Next step |
| --- | --- | --- |
| `pass`, `installed: VERSION-HASH` | An installed release was found. | Check the other results, then verify activity below. |
| `fail`, `Not installed: run install` | No installation was found in the selected Claude configuration. | Install with the command below. |
| Other `fail` | Installation, settings, or release integrity needs attention. | Read the named failure; preserve existing configuration before resolving it. |
| `warn`, isolated execution unavailable | Optional Docker execution is unavailable. | Normal workflows can still run; Docker is only needed for isolated jobs. |

Install or update from the same harness folder:

```powershell
node tools/harness.mjs install
node tools/harness.mjs doctor
```

An install updates the configured release; it does not update an already-running
Claude conversation. Close and reopen Claude afterward. The default configuration
is your home directory's `.claude` folder, or `CLAUDE_CONFIG_DIR` when set.
If you installed with `--home PATH`, pass the same option to doctor/status and
ensure Claude itself uses that configuration. `--home` alone does not configure
Claude. See [team setup](team-setup.md) for installation details.

## 2. Check whether Claude actually loaded it

Open your application folder in your editor and start a new Claude Code
conversation, or start it from PowerShell:

```powershell
Set-Location "E:\Copies of EVA software\Secondary-Angular-UI\secondary"
claude
```

`claude` starts the Claude Code terminal client in that application checkout.
It is unnecessary when you use the editor extension instead.

Send this harmless message **inside Claude**:

```text
Explain the workflows available from the EVA harness. Do not edit files or run commands.
```

Then, in a separate PowerShell terminal:

```powershell
Set-Location "E:\Copies of EVA software\Claude Agents"
node tools/harness.mjs status --workspace "E:\Copies of EVA software\Secondary-Angular-UI\secondary"
```

Inspect the `activation` object and `recentEvents`:

| Field | What it establishes |
| --- | --- |
| `sessionStartSeen: true` | A SessionStart receipt exists for this checkout. |
| `promptRoutingSeen: true` | A UserPromptSubmit receipt exists for this checkout. |
| `lastEventAt` | Time of the most recent recorded event; compare with your new session/request. |
| `skillsObserved` | Successful Skill tool calls observed by the logger. An empty list alone does not establish that skills are unavailable; slash commands can expand without a separate Skill call. |

These fields summarize retained activity across sessions, not a live connection
indicator. Old `true` values do not prove your current session loaded the harness.
Look for fresh timestamps and the expected release on the recent SessionStart
event. No receipts means activation is unconfirmed, not necessarily absent.
Check the exact checkout path/configuration, restart Claude, and inspect effective
hooks/settings if receipts remain missing. Project/managed settings and session
flags can affect behavior. Asking Claude whether it loaded the harness is not
independent proof; receipts provide stronger evidence of actual hook execution.

## 3. Use it normally

Install once per Claude configuration, not once per application clone. Open
Claude in the clone you intend to change; separate clones keep separate code and
task records. Optional project aliases select checkouts for CLI commands only.

Describe your task normally, or choose a workflow explicitly inside Claude:

| Need | Example |
| --- | --- |
| Fix or implement | `/dev-mode Fix this issue: ...` |
| Investigate without editing | `/debug-mode Diagnose this failure; do not implement: ...` |
| Review | `/review-change Review the current changes for correctness and maintainability.` |
| Naming advice | `/legacy-naming Recommend a name based on the nearby code: ...` |
| Manual QA draft | `/manual-qa Write cases for these acceptance criteria: ...` |
| Commit message draft | `/commit-message Draft a concise type(scope): message from staged changes.` |

Small tasks stay direct. Substantial designs get proportionate investigation,
planning, approval, implementation, and verification. You can override workflow
defaults within native permissions and managed policy. Workers inherit your model
by default; cheaper workers are considered when token optimization is requested.

**Staging, committing, and pushing each require your explicit request for that
action.** A message draft or instruction to finish coding grants none of them.
QA/ticket output is a draft until an external write is explicitly authorized.

## 4. What the installed hooks do

The installer registers these events to the installed `tools/hook.mjs` entry
point. The implementation is in `lib/runtime.mjs`.

| Event | Harness behavior |
| --- | --- |
| `SessionStart` | Records startup/release, provides runtime CLI and delegation context, lists unfinished workspace tasks, and prunes expired session logs. |
| `UserPromptSubmit` | Suggests a workflow from the request and records routing metadata. The suggestion is advisory. |
| `PreToolUse` | Checks direct Read/Edit/Write/NotebookEdit paths and Agent/Task launches. Can deny protected file access or request approval under a restrictive delegation profile. Native permissions still decide access. |
| `PostToolUse` | Records successful tool-event metadata, including a skill identifier when available. It does not independently verify the tool's output. |
| `PostToolUseFailure` | Records failure-event metadata. |
| `SubagentStart` / `SubagentStop` | Records worker lifecycle events; does not prove worker correctness. |
| `Stop` | Reminds Claude once about running, session-bound contracted tasks. Loop protection permits the next Stop; this is not an unbypassable completion gate. |

Hooks do not sandbox Bash/MCP or authenticate human design approval. Git write
prompts come from installed native permission rules, not a complete shell-command
interceptor. The model ceiling and worker path assignments are instruction-level
policies. Hook receipts omit prompts, source contents, commands, and tool results;
task notes are authored separately and must not contain secrets.

For diagnostics, use doctor and status rather than feeding synthetic events into
the hook entry point: a fabricated event would not establish real activation.

## 5. Updates, rollback, and deactivation

After obtaining a reviewed source update, run `install`, run `doctor`, and restart
Claude. Source edits alone do not change an installed immutable release.

```powershell
Set-Location "E:\Copies of EVA software\Claude Agents"
node tools/harness.mjs rollback
```

Rollback reverses the latest installation transaction and requires restarting
Claude. It may restore an older harness version, so **it is not a general off
switch**. Dedicated enable/disable/uninstall and per-clone activation commands
are not implemented. Do not delete your entire `.claude` folder or disable all
hooks as a substitute; it may contain unrelated settings and integrations.

See [team setup](team-setup.md) for clone registration and troubleshooting, and
[operations](operations.md) for optional isolated jobs and deployment boundaries.
