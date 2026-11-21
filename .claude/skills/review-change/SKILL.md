---
name: review-change
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
