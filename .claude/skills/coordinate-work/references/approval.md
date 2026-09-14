# Delegation approval

Represent each approved worker with a document conforming to
`C:/Users/SSD/.claude/schemas/delegation-approval.schema.json`.

Approval is task-specific, model-specific, path-specific, and single-use. Set
`status` to `consumed` when the worker starts. A rejected, consumed, expired, or
merely proposed approval cannot authorize a launch.

One user response may approve an enumerated batch. Create one approval record per
worker so scope or model changes remain independently auditable. Do not treat an
approval record as authorization unless it accurately represents the user's
answer in the current conversation.
