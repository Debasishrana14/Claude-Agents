# Business packs

The core owns engineering process and execution boundaries. A project's `business/`
folder owns organization and product knowledge: terminology, architecture,
responsibility boundaries, naming examples, known risks, ownership, approvals,
and domain acceptance requirements. It specializes the workflow without replacing
native permissions or silently authorizing external actions.

## Create a pack

Copy `templates/business/` into an application's root and edit `business/README.md`.
Do not copy the harness's code into this folder. A README alone is supported.
An ordinary source folder named `business` without a README or index is not a pack.

For existing EVA work, copy `business-packs/eva/business/` instead. Its original
department guidance and path mappings are preserved as project reference documents.
They are no longer installed as global rules for unrelated projects.

Keep the entry point brief. Link only maintained supporting documents and say
when each matters. There is no required stack, department structure, or list of
roles. A small project may need only terminology and one architecture paragraph.

## Optional index

```json
{
  "schemaVersion": 1,
  "documents": [
    { "path": "roles.md", "when": "Ownership, escalation, or approval decisions" },
    { "path": "architecture.md", "when": "Changing module boundaries or shared contracts" }
  ]
}
```

Save this as `business/harness.json` after creating the referenced Markdown files.
It supports at most 30 guides. Paths must remain inside `business/`, without
traversal or external symlink targets. Each Markdown file is limited to 128 KiB,
and the index to 32 KiB. Executable configuration and unknown fields are rejected.

Discovery lists the entry point and indexed guide metadata without executing
commands or loading every guide body. At startup Claude receives that index and
instructions to read the entry point and relevant guides. This is guidance, not
proof that the model understood or complied. `project-context` displays discovery.

## Responsibilities and precedence

The main session owns task interpretation, coordination, integration, and user
communication. Workers have bounded assignments and cannot delegate. Reviewers
return findings; native role tools determine actual access.

The business pack can identify domain specialists, ownership boundaries, approval
roles, and handoff contracts. A role description does not create a new executable
agent or change its tools. If a project needs new worker definitions, implement
and review those separately using supported Claude configuration.

Explicit user instructions govern the task within applicable system, native, and
managed controls. Business guidance specializes generic defaults; it cannot grant
permissions, lift worker boundaries, or authorize Git writes. Consequential
conflicts with repository guidance or code must be surfaced. Missing owners or
approval contacts stay unknown; do not invent them.

## Maintenance

Commit shared knowledge for team review. Keep personal activation and runtime
state out of Git. Review copied pack updates manually; plugin updates do not
overwrite application knowledge. Separate project-specific facts from broader
organization policy, and record the scope/date of claims that can become stale.
Never include credentials or private account settings in a business pack.

Actual runnable validation remains in the project contract `.harness.json`:
`schemaVersion: 1`, `criteria`, and `checks` with `{label, argv, purpose}` entries.
The CLI discovers those commands but does not execute or authorize them implicitly.
Legacy `.eva-harness.json` works when `.harness.json` is absent. Keeping both is
an error, preventing silent selection of an outdated contract.
