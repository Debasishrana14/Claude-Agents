# Parent-mediated relay

Use a relay when work is long and sequential but workers do not need direct
conversation. The main session remains the coordinator.

## Work record

Create one gitignored directory:

```text
.scratch/coordination/<work-id>/
  manifest.json
  stages/
    01-<stage>.json
    02-<stage>.json
```

`manifest.json` must conform to
`C:/Users/SSD/.claude/schemas/coordination-manifest.schema.json`. It records the
user-approved roster, model and access for every stage, stage dependencies, and
current status. Do not store raw chain-of-thought, secrets, full transcripts, or
copied source files.

Each stage artifact uses this contract:

```json
{
  "schemaVersion": "1.0",
  "workId": "stable-id",
  "stage": "datalayer",
  "status": "complete|blocked|failed",
  "producer": "role-name",
  "scope": ["approved/path"],
  "changedFiles": [],
  "contractsProduced": [],
  "decisions": [],
  "evidence": [{"file": "path", "line": 1, "claim": "fact"}],
  "requestsForNextStage": [],
  "verification": [],
  "unknowns": [],
  "risks": []
}
```

The complete artifact must conform to
`C:/Users/SSD/.claude/schemas/stage-handoff.schema.json`. Contracts are versioned
as `<major>.<minor>` and record consumer, invariants, units, coordinate space,
and identity semantics when applicable. A consumer must name the contract
versions it consumed.

## Baton sequence

1. The coordinator defines stage acceptance criteria and obtains delegation
   approval.
2. The producer completes only its approved scope and writes its stage artifact.
3. The coordinator checks that the artifact is complete, evidence-backed, and
   compatible with repository state.
4. Before launching the consumer, the coordinator obtains its required approval
   and passes the artifact path plus only essential constraints.
5. The consumer may return `blocked` with `requestsForNextStage`. The coordinator
   routes those requests to the previous owner only after any required new
   delegation approval.
6. A completed consumer records which upstream contract it consumed and any
   deviation it found.

For example, Geometry may specify the DataLayer contract it needs before either
stage is implemented. The coordinator routes that request to the DataLayer
owner. After DataLayer produces the contract and evidence, Geometry consumes the
artifact. This is deliberate baton passing, not direct subagent conversation.

Do not launch every stage at the beginning when later scopes depend on earlier
findings. Approval may be collected in advance only for stages whose boundaries,
models, and handoffs are already concrete.
