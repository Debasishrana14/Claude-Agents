---
name: review-code
description: Review a proposed or implemented code change against acceptance criteria and realistic downstream behavior. Use for requested code reviews or the verification phase of substantial implementation; ordinary explanations and naming-only reviews use their own workflows.
---

# Evidence-Based Change Review

Establish the requested behavior and exact review scope: staged, working tree,
commit, branch, or supplied diff. Do not silently treat the current index as the
entire change. Preserve unrelated work. Use `commit-context` for staged reviews;
for other scopes inspect the appropriate read-only Git diff and changed code.
Use `--no-ext-diff --no-textconv` so diff inspection does not invoke repository
diff drivers or converters.
Never equate an incomplete or truncated diff with complete review coverage.

Read applicable project instructions, acceptance criteria, changed definitions,
and realistic consumers. Check only relevant failure surfaces: state and object
identity, error/null paths, lifecycle and listener disposal, concurrency/async
ordering, public/serialized contracts, and boundary inputs. For computational
changes, check units, coordinate spaces, tolerances, degeneracies, scale, and
credible complexity/allocation changes. A speed claim needs a comparable measured
workload, not an impression from reading code.

Review maintainability as well as passing tests: do names match behavior and
local terminology, do responsibilities and dependencies remain understandable,
and could existing code satisfy the change with less duplication? Inspect
shared-helper consumers before proposing reuse or repair. Flag unnecessary
layers, speculative patterns, hidden side effects, and unexplained diff churn
with concrete maintenance costs. SOLID/OOP and design patterns are tools for
actual design problems, not mandatory structures for every patch.
For changed identifiers, consult apply-conventions guidance and established local
evidence. Reject new sentence-fragment names that rely on arguments to finish
their meaning; avoid blanket suffix bans and preserve fixed external contracts.

Compare the task diff with its pre-existing dirty baseline and approved scope.
Identify unrelated edits or contract/dependency changes needing a design update.
Check security only where there is a credible changed surface: authorization,
untrusted input, secrets, command/filesystem access, or sensitive data. Supported
concerns need a trigger, impact, evidence, mitigation, and known responsible
owner; mark ownership unknown when absent. Draft handoffs without external writes.

Compare checks to the acceptance criteria. Where execution is authorized and
available, run focused reproductions or tests; otherwise mark findings static.
Do not change production code for a review-only request. In development, fix
supported findings within scope and rerun affected checks before completion.

Use the main session for small reviews. A reviewer worker can reduce context
pollution for a substantial independent review, subject to the active delegation
profile. Supply the objective, scope, and raw change evidence; do not feed it the
answer you want. Report honestly whether review was a self-review, a separate
worker review, or execution-backed verification. No worker is mandatory for every
edit, and more agents do not establish better quality.

Return supported findings ordered by impact: file/line, trigger, consequence,
evidence, and confidence. Separate material unknowns from confirmed defects.
When no findings are supported, say so without guaranteeing correctness. Omit
style-only rewrites unrelated to the request. A review does not authorize a
commit, push, merge, ticket update, or deployment.
