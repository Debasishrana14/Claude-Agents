# Using the harness and its hooks

The plugin supplies a reusable engineering process. Claude supplies the model,
tools, permissions, and conversation. Skills are reusable instructions; hooks are
code Claude runs automatically at defined lifecycle events.

## Is it enabled?

From the application clone:

```powershell
claude plugin list
```

Check `engineering@engineering-harness-local`, its version, scope, and enabled
state. The list can include installations for other clones: use
`claude plugin list --json` and match `projectPath` to the intended clone rather
than treating every listed entry as active here.
Local enablement belongs in `.claude/settings.local.json`, outside Git.
Real company knowledge belongs in a local `business/` folder by default; use
the application's local Git exclude file as described in [business packs](business-packs.md).
Use the native plugin switch, then start a fresh session:

```powershell
claude plugin disable engineering@engineering-harness-local --scope local
claude plugin enable engineering@engineering-harness-local --scope local
```

Run the one you need. An explicit `--plugin-dir` session is a separate load path.
Disabling a plugin cannot erase instructions already present in the conversation.
Older global imports must be migrated first; see [setup](team-setup.md).
Disabling this plugin does not disable independently configured project guidance.
In particular, this harness's own source checkout has a CLAUDE.md and skills for
working on the harness. Test application activation in an application checkout.

## Did hooks actually run?

Start Claude in the application and send a normal request. From the harness folder:

```powershell
node tools/harness.mjs status --workspace "PATH TO APPLICATION"
```

| Field | Meaning |
| --- | --- |
| `sessionStartSeen` | A retained startup receipt exists for this workspace |
| `promptRoutingSeen` | A retained prompt-hook receipt exists |
| `skillsObserved` | Successfully observed Skill calls, distinct from routing suggestions |
| `lastEventAt` | Most recent retained event time |
| `recentEvents[].transport` | Startup records identify plugin or legacy loading |

Use recent timestamps and the startup release to distinguish new execution from
history. Disabling preserves old receipts, so a historical `true` does not mean
the harness is still enabled. Conversely, no receipt leaves execution unconfirmed.
Synthetic hook input tests protocol handling, not a real session's activation.

## Daily use

Usually just describe your task. Optional explicit commands:

| Need | Plugin command |
| --- | --- |
| Plan substantial work | `/engineering:plan-task` |
| Implement a change | `/engineering:implement-feature` |
| Diagnose without editing | `/engineering:diagnose-issue` |
| Explore alternatives | `/engineering:research-task` |
| Continue substantial staged work | `/engineering:coordinate-tasks` |
| Review code | `/engineering:review-code` |
| Suggest names from local conventions | `/engineering:apply-conventions` |
| Verify a change or draft manual QA | `/engineering:verify-change` |
| Draft a message from staged evidence | `/engineering:write-commit` |
| Recover interrupted work | `/engineering:resume-task` |

Canonical names use actions. Former commands remain compatibility aliases:
`dev-mode`, `debug-mode`, `research-dev-mode`, `coordinate-work`, `review-change`,
`manual-qa`, `commit-message`, and `legacy-naming` load their corresponding
workflow above. `target-mode` loads `implement-feature` with the user's deadline
as a constraint. Existing task records remain readable; new task records store
the canonical name. Alias files contain no separate implementation.

Each workflow establishes its input and authorization scope, performs the relevant
procedure, and returns evidence and remaining work. Skills supply procedures;
hooks enforce supported boundaries. Agent definitions are unchanged in this phase.

A plan in this conversation can be referenced directly. For another conversation,
provide the agreed plan or a maintained task record; cross-chat access is not assumed.
The default model stays selected by the user. Workers inherit it unless authorized
optimization or explicit choices justify otherwise. Delegation is proportional.

## Automatic hook behavior

| Event | Harness action |
| --- | --- |
| `SessionStart` | Supplies generic policy, runtime CLI, relevant business-guide index, unfinished task IDs |
| `UserPromptSubmit` | Suggests an appropriate workflow; the full user request takes precedence |
| `PreToolUse` | Checks supported direct file operations and the active delegation profile |
| `PostToolUse` | Records bounded metadata and successful observed skill calls |
| `PostToolUseFailure` | Records failure metadata without tool output |
| `SubagentStart`, `SubagentStop` | Records worker lifecycle metadata |
| `PreCompact`, `SessionEnd` | Saves recovery references to session-bound unfinished tasks without altering check revisions |
| `Stop` | Reminds once about unfinished contracted tasks, with loop protection |

Internal handlers have explicit responsibilities: `validateFileAccess`,
`authorizeDelegation`, `validateCompletion`, and execution recording. Native
event names remain unchanged. Recovery receipts are atomically replaced at
`state/sessions/SESSION_HASH/recovery.json` under the harness configuration home.
They contain task IDs, revisions, states, a workspace hash, and a timestamp;
they do not capture unsaved decisions or establish successful verification.
Recovery receipts expire under `retentionDays`; durable task records are retained.
Use `resume-task` to reconcile checkpoint notes with the actual checkout.

### External memory and temporary storage

Direct writes default to the workspace. Operators can explicitly list additional
absolute directories in the trusted harness `harness.config.json`:

```json
"storage": {
  "writeRoots": {
    "memory": [],
    "temporary": []
  }
}
```

Populate only the directories intentionally shared with this installation.
No user-home or filesystem-root fallback is added. This is harness policy,
not a project `.harness.json` setting; project documents cannot expand access.
In a legacy installation, update the source policy and reinstall to activate it.
Directory boundaries include resolved symlink targets. Secret files, Git
internals, and harness state remain protected even within configured write roots.
Native permissions still apply; these checks never return an unconditional allow.
Hooks cover direct file tools, not shell/MCP writes, and do not grant authorization
to store arbitrary conversation content as persistent memory.

You do not launch hooks manually during development. The plugin owns their
lifecycle. It does not add a global CLAUDE.md import: generic instructions are
delivered as a short SessionStart core, because Claude does not automatically load
a plugin's root CLAUDE.md as project context. Detailed workflows load on demand.

Receipts omit prompts, commands, file bodies, results, and secrets. Business guide
bodies are not injected wholesale. Claude is instructed to read the entry point
and only relevant guides, and to compare them with actual code evidence.
Those reads are still part of the normal Claude/model-provider data flow; a
Git-ignored business folder does not make model processing local.

## Limits and troubleshooting

For a substantial task, define required commands before recording checks. Prefer
`task define ID --from-project` with a reviewed `.harness.json`:

```json
{
  "schemaVersion": 1,
  "criteria": ["Describe the observable behavior"],
  "checks": [{ "label": "unit", "argv": ["node", "--test", "tests/unit.test.mjs"] }],
  "inputs": ["config/local-runtime.json"]
}
```

`inputs` optionally includes ignored workspace files that affect validation.
These are literal relative file paths, not directories or globs. Missing files
are fingerprinted as missing; adding, changing, or deleting them invalidates old
results. No file contents are written to task evidence. Environment variables,
external dependencies and undeclared ignored files remain outside this coverage.

Without a project contract, `task define` accepts `--criteria TEXT`,
`--required-checks unit` and `--check-commands JSON`, where JSON maps each label
to its argv array. Use your shell's quoting rules for JSON. Existing tasks with
unbound required labels must be redefined before those labels can pass. Review
commands before running them; binding argv does not prove a test is meaningful.

Run `task check ID --label unit -- node --test tests/unit.test.mjs` explicitly.
A checkpoint cannot clear a failure. Rerun the same label and command successfully
against current inputs after repairing it. If blocked, save a paused/blocked
checkpoint and report the limit. Completion evidence distinguishes local command
execution from test adequacy and independent review; acceptance notes remain
authored assessments.

Hooks are not universal shell or MCP isolation, authenticated human approval,
semantic code verification, or runtime enforcement of model ceilings. Git actions
still require explicit requests; the plugin does not add the old installer's native
permission rules. Never treat business documents as execution authorization.

If commands are missing, inspect `/plugin`, check Node on PATH, verify the local
scope and version, and restart. Validate source with `node tools/harness.mjs validate`
and `claude plugin validate .`. Check native hook errors instead of claiming success.

`node tools/harness.mjs doctor` checks the **legacy installer**, not native plugin
installation. A legacy "Not installed" result is expected after migration; use
`claude plugin list` for the plugin and `status` for runtime history.

The CLI retains rollback for one legacy transaction and uninstall for its recorded
chain. Neither is the native plugin's on/off switch. Do not delete all Claude
configuration or disable unrelated hooks to turn off this harness.

For native removal, use `/plugin` and select the installation for the intended
clone. Removal and disabling are separate from deleting private business documents
or historical receipts. This beta does not claim universal compatibility or
error-free output; see [release preparation](releasing.md).
