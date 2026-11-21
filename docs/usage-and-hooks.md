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
| Implement a change | `/engineering:dev-mode` |
| Diagnose without editing | `/engineering:debug-mode` |
| Explore alternatives | `/engineering:research-dev-mode` |
| Continue substantial staged work | `/engineering:coordinate-work` |
| Review code | `/engineering:review-change` |
| Suggest names from local conventions | `/engineering:legacy-naming` |
| Draft ticket-ready manual QA | `/engineering:manual-qa` |
| Draft a message from staged evidence | `/engineering:commit-message` |

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
| `Stop` | Reminds once about unfinished contracted tasks, with loop protection |

You do not launch hooks manually during development. The plugin owns their
lifecycle. It does not add a global CLAUDE.md import: generic instructions are
delivered by SessionStart, because Claude does not automatically load a plugin's
root CLAUDE.md as project context.

Receipts omit prompts, commands, file bodies, results, and secrets. Business guide
bodies are not injected wholesale. Claude is instructed to read the entry point
and only relevant guides, and to compare them with actual code evidence.

## Limits and troubleshooting

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
