# Engineering Harness

A generic engineering workflow for Claude Code: understand the task, investigate
existing code, make a proportionate plan, implement, review, and verify. Small
fixes stay direct. Substantial work supports bounded delegation and recoverable
task records. The user-selected model is preserved; Git writes require explicit
authorization for each action.

Optional **business packs** supply project terminology, architecture, naming,
organization-specific roles, ownership, and domain checks. The core makes no EVA,
language, framework, or industry assumptions. It works without a business pack.

Requires Node.js 22+ on PATH and Claude Code with plugin support. No npm dependencies.
Docker is optional and only needed for isolated jobs. This is a local tool, not a
hosted platform or a guarantee of correct code.

## Start here

Read the [step-by-step setup](docs/team-setup.md). If you previously used
`node tools/harness.mjs install`, follow its migration section first: the legacy
global import must be removed before a plugin switch can fully control loading.

For a new installation, register this downloaded folder as a local marketplace:

```powershell
claude plugin marketplace add "PATH TO THIS HARNESS CHECKOUT"
```

Then, from your **application repository**, install for your copy of that repo:

```powershell
claude plugin install engineering@engineering-harness-local --scope local
claude
```

Describe your task normally: `Fix the duplicate form submission.` The harness
supplies the engineering process. You do not need to repeat its instructions.
Optional overrides include `/engineering:dev-mode`, `/engineering:coordinate-work`,
`/engineering:review-change`, `/engineering:manual-qa`, and
`/engineering:commit-message`. Commit drafting does not authorize Git writes.

## Switch on or off

Run these in the application clone whose setting you want to change:

```powershell
claude plugin disable engineering@engineering-harness-local --scope local
claude plugin enable engineering@engineering-harness-local --scope local
claude plugin list
```

The local choice lives in `.claude/settings.local.json`; keep it untracked.
Start a fresh Claude session after switching. Already loaded instructions and
conversation content cannot be removed from an existing conversation by a switch.
Your other clones and teammates have their own local choices. Do not use
`--plugin-dir` to test the off switch: that flag explicitly loads a plugin.

## Add business knowledge

Copy [templates/business](templates/business) to `business/` in the application
root and edit its README. A README alone is enough. Add indexed supporting guides
only when needed. For EVA, copy [business-packs/eva/business](business-packs/eva/business)
instead. Review it against the actual checkout before relying on its claims.

Business guides specialize responsibilities; they do not grant tool permissions
or authorize scripts, notifications, commits, or pushes. Shared project knowledge
normally belongs in Git. See [business pack design](docs/business-packs.md).

## Checks and operations

Run these from the harness checkout:

```powershell
node tools/harness.mjs validate
claude plugin validate .
npm test
node tools/harness.mjs status --workspace "PATH TO APPLICATION"
```

`status` shows historical hook receipts and tasks, not a live connection or proof
that every instruction was followed. Use `claude plugin list` from the application
to inspect plugin installation and enablement. See [usage and hooks](docs/usage-and-hooks.md).

The existing CLI remains available for explicit clone aliases, staged-change
evidence, checkpoints, actual checks, and optional isolated Docker jobs. A project
can define checks in `.harness.json`; legacy `.eva-harness.json` remains supported,
but do not keep both. Discovery never executes those commands automatically.

For backward compatibility, local records remain under the historical
`eva-harness/` directory inside Claude's configuration directory. The name is a
storage compatibility detail, not a business dependency. Existing task IDs and
clone registrations remain available. [Operations reference](docs/operations.md).

## Implementation boundaries

| Component | Responsibility |
| --- | --- |
| `CLAUDE.md` | Generic workflow policy; delivered by SessionStart for plugin sessions |
| `skills/`, `agents/` | Reusable workflows and bounded worker definitions |
| `.claude-plugin/`, `hooks/` | Native plugin distribution and lifecycle wiring |
| `lib/project.mjs` | Read-only project, business-pack, and check discovery |
| `lib/runtime.mjs` | Hooks, private receipts, task contracts, and verification records |
| `lib/install.mjs` | Legacy transactional installation, rollback, and migration removal |
| `lib/git-context.mjs`, `lib/jobs.mjs` | Staged evidence and optional isolated jobs |
| `business-packs/`, `templates/` | Copyable knowledge, never installed as global rules |

Hooks protect certain direct file operations; they are not a Bash/MCP sandbox.
Business guidance, design approvals, model ceilings, and Git authorization remain
instruction-level controls where no corresponding runtime enforcement exists.
Native permissions and managed policy still apply. The plugin does not install
the legacy installer's extra native permission rules or grant broad tool access.

The [v2 validation record](docs/validation-2.0.0.md) lists checks and remaining manual acceptance.
Automated tests and native plugin management checks are evidence of those paths,
not a comparative model-quality benchmark. Earlier application validation and
research remain dated evidence: [research](docs/engineering-harness-research.md),
[earlier validation](docs/validation-2026-11-21.json).
