# Teammate setup: EVA Agent Harness

This harness gives Claude Code a shared working process: specialist agents,
development workflows, review, manual QA cases, commit drafting, naming advice,
and records of tasks and checks. Claude Code does the actual AI work.

Each teammate installs the harness on their own computer. Your application stays
in its existing repository. No application source needs to be copied into this
harness, and no shared server or Docker installation is needed for normal use.
Each person needs their own authorized Claude Code access; the harness does not
provide an account or extra usage allowance. Multiple agents can increase usage.

## 1. Prepare your computer

Install Git, Node.js 22 or newer, and Claude Code using your team's approved
installation methods. Sign in to Claude Code with your own account.

Open a normal PowerShell terminal and check:

```powershell
git --version
node --version
claude --version
```

All three should print a version. Node must be v22 or newer. If a command is not
found, finish installing it and reopen the terminal. The harness itself normally
needs no administrator terminal and has no npm dependencies to install.

The examples below use Windows PowerShell. Replace application paths with your
own paths. Teammates on macOS/Linux can use the same Node CLI commands with their
own paths and shell syntax instead of PowerShell variables and `Set-Location`.

## 2. Download the harness once

Clone the team repository into a permanent folder, separate from your application:

```powershell
git clone https://github.com/Debasishrana14/Claude-Agents.git "$HOME/Claude-Agents"
Set-Location "$HOME/Claude-Agents"
```

Repository access is required. If your team uses another remote or a reviewed
release/tag, use the URL and revision supplied by your maintainer. Keep this
checkout for updates and diagnostics. Do not copy another person's `.claude`
folder, login credentials, installation state, or project registry.

## 3. Install into your Claude configuration

Run these from the harness folder:

```powershell
node tools/harness.mjs validate
npm test
node tools/harness.mjs install --delegation automatic
node tools/harness.mjs doctor
```

Continue only when validation and tests have no failures. The real Docker test
can be skipped when Docker integration is not configured.

Installation creates a versioned local release and connects its instructions,
skills, agents, rules, and hooks to your user-level Claude configuration. The
default location is your home directory's `.claude` folder; an existing
`CLAUDE_CONFIG_DIR` environment variable changes that destination. Existing
unrelated settings are preserved. Conflicting unmanaged harness filenames cause
installation to stop rather than overwrite them silently.

This command preserves your configured model (defaults to Sonnet if absent) and
enables automatic bounded
delegation within your requested work. It removes Agent/Task launch approval
rules, including existing per-role asks, while preserving other asks and deny
rules. It does not enable permission bypass. Organization policy can still
restrict effective behavior. For an explicitly restrictive profile, use
`--delegation manual` or `--delegation read-only` instead.

Workers inherit the model you selected in Claude. Add `--model opus`,
`--model sonnet`, or `--model haiku` only when you intend to change the configured
main default. A request to optimize tokens allows the main agent to consider a
capable cheaper worker; ordinary quick fixes stay direct without a forced model
change. See the README's task-size guidance for the default approval/review flow.

Claude may edit and check the requested code, but must not stage, commit, or push
until you explicitly request the relevant action. "Write a commit message" is a
draft only, and "commit" does not authorize "push". Native permission prompts
for those commands remain enabled even with automatic worker delegation.

The installation affects Claude sessions using this configuration, including
other projects. Use your team's approved Claude configuration if work and
personal environments must be separate. With a custom `--home PATH`, use that
same home for subsequent CLI commands and configure Claude to use that directory;
`--home` alone does not switch Claude's configuration.

A doctor warning about optional isolated execution is expected without Docker
and an execution policy. Resolve any `fail` entries before proceeding.

## 4. Link your application checkout

There are two different connections:

| Connection | What it does |
| --- | --- |
| Install the harness | Makes its workflows available to Claude under your user configuration. |
| Register an application alias | Gives the harness CLI a short name for a local Git checkout. |

Registration is optional for basic Claude use. Opening Claude in the application
folder is what selects the code it works on. Registration does not change that
folder, install application dependencies, or create application instructions.

From the harness folder, register your own application Git root:

```powershell
node tools/harness.mjs projects add main --path "C:/Work/eva-angular-ui"
node tools/harness.mjs projects list
node tools/harness.mjs project-context --project main
```

Replace `C:/Work/eva-angular-ui` with the actual checkout root, not its `src`
directory. `project-context` lists available guidance, scripts, and check
configuration; it does not run those scripts.

For multiple clones, give each its own alias and path:

```powershell
node tools/harness.mjs projects add secondary --path "C:/Work/eva-secondary"
node tools/harness.mjs projects add bug-fixing --path "C:/Work/eva-bug-fixing"
```

Use lowercase aliases such as `main`, `secondary`, or `bug-fixing`. Each person
registers their own paths; your maintainer's four aliases are not distributed.
There is no sticky default project. For CLI operations, select `--project main`
or `--workspace "C:/Work/eva-angular-ui"`, not both. An existing alias cannot be
repointed with `projects add`; choose another alias if a checkout moves.

## 5. Start Claude in the application and verify it

Close existing Claude sessions, then open a new one in your application:

```powershell
Set-Location "C:/Work/eva-angular-ui"
claude
```

In Claude, try a harmless first request:

```text
/legacy-naming Read our project guidance and nearby code, then recommend names
for one function in FILE_PATH. Explain the evidence. Do not edit files.
```

Replace `FILE_PATH` with a real file. This exercises an installed skill without
requesting code changes. The harness can also select relevant skills from normal
language; slash commands let you choose explicitly.

In another PowerShell terminal, inspect the installation and application state:

```powershell
Set-Location "$HOME/Claude-Agents"
node tools/harness.mjs doctor
node tools/harness.mjs status --project main
```

Check for recent startup/hook receipts associated with your session. Status
separates routing suggestions from successfully observed Skill tool calls; an
explicit slash command may expand without a separate Skill call receipt.
Doctor verifies files, not whether an already-running conversation loaded them.
If needed, inspect Claude's available memory, skills, agents, and hooks using
the inspection commands supported by your installed Claude version.

## 6. Use it for daily work

Start Claude in the checkout you intend to change, then describe the result you
want. You do not need to run install again for each task or each application.

| Need | Example prompt in Claude |
| --- | --- |
| Develop a feature | `/dev-mode Implement TICKET_DETAILS. Inspect project guidance, define acceptance criteria, implement, review, and run relevant checks.` |
| Diagnose a bug | `/debug-mode Investigate REPRODUCTION_STEPS. Explain the cause and fix constraints; do not implement.` |
| Review changes | `/review-change Review the current changes for regressions and missing tests.` |
| Prepare ticket QA | `/manual-qa Write manual cases for these acceptance criteria: DETAILS. Include expected results and mark unexecuted cases Not run.` |
| Draft a commit | `/commit-message Read only my staged changes and draft a message using our repository convention. Do not commit.` |
| Follow legacy naming | `/legacy-naming Study MODULE_PATH and recommend names for these identifiers. Do not rename files yet.` |

Supply ticket requirements when Claude cannot retrieve them. A QA draft does not
update a ticket. A commit-message request does not stage or commit files. Ask
explicitly when you want an external action, commit, or push.

For substantial work, ask Claude to use task records, acceptance criteria, and
named checks. Agent launches can happen automatically within the task; ordinary
tool permissions still apply. The harness does not install your application's
dependencies or guarantee that its test suite covers every regression.

## 7. Share project-specific standards with the team

Keep application build instructions and conventions in the application's own
maintained guidance. Keep shared harness behavior in this repository. Do not put
individual absolute checkout paths into shared skills or instructions.

Optionally, the application maintainer can commit an `.eva-harness.json` contract
at the application root with schema version 1, acceptance `criteria`, and named
`checks` containing executable `argv` arrays. See [the harness's own contract](../.eva-harness.json)
for the format, but use your application's actual commands rather than copying
the harness tests. Validate discovery with `project-context --project main`.
Claude can import that contract into a task with `task define ID --from-project`.

On Windows, checks should invoke an executable such as `node` with the actual
test runner's path rather than rely on a `.cmd` shell wrapper. A configured
command is project data; review it before execution. A contract is optional and
does not need to be added merely to use the skills.

## 8. Update or roll back

After your maintainer shares an approved update, run from the harness checkout:

```powershell
Set-Location "$HOME/Claude-Agents"
git status --short
git pull --ff-only
node tools/harness.mjs validate
npm test
node tools/harness.mjs install
node tools/harness.mjs doctor
```

Preserve or resolve local edits before pulling; do not discard them to force an
update. Follow your team's pinned revision instead if it distributes releases.
Restart Claude after installation. Pulling alone does not update the installed
release. Later installs preserve your selected delegation profile and model
unless you explicitly change them.

To reverse the latest installation transaction:

```powershell
node tools/harness.mjs rollback
node tools/harness.mjs doctor
```

Restart Claude afterward. Rollback restores the prior managed configuration and
refuses to overwrite subsequent edits. After rollback, doctor can report a
version difference from the newer checkout. This is transaction rollback, not a
general-purpose uninstall command; do not delete your entire `.claude` folder.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Skills are missing | Restart Claude; check that install and Claude use the same configuration directory. Run doctor. |
| It works in the harness folder, but not the application | Verify the application session uses the same user configuration; inspect project and managed settings. Registration alone does not activate a different configuration. |
| Unknown project alias | Run `projects list` on this computer, then register your own checkout root. |
| Agent launches still ask for approval | Check the installed profile, project permissions, and organization policy. Reinstall with `--delegation automatic` if that is your intended profile. |
| Installation reports a filename collision | Inspect the named existing skill, agent, or rule; preserve it and resolve the naming conflict before retrying. |
| Directory link creation fails | Use a local filesystem that supports directory links/junctions. Do not immediately rerun as administrator. |
| Optional Docker warning | Normal local skills still work. See [operations](operations.md) only if you need isolated jobs. |
| Claude says it finished without enough evidence | Ask for the actual check results and review. Installation cannot prove the correctness of a code change. |

## Maintainer handoff checklist

- Share this repository URL and an approved branch, tag, or commit.
- Share this guide and the application repository URL separately.
- Tell teammates which account/configuration to use and whether automatic delegation is approved.
- Supply application prerequisites, real test commands, and project guidance.
- Pilot a read-only skill and one small development task before broader adoption.
- Keep personal configuration, credentials, logs, and local installation state out of the shared repository.

This is a local team workflow setup. Central enforcement, shared identity,
remote audit collection, and Docker resource isolation require additional
deployment work described in [operations](operations.md).
