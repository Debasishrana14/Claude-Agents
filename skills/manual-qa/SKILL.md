---
name: manual-qa
description: Write manual QA test cases and ticket-ready QA updates from a ticket, acceptance criteria, or code changes. Use for human-executable test plans, not automated test code or unsupported claims that testing passed.
---

# Manual QA and Ticket Cases

Produce cases a tester can execute and paste into the requested ticket. Follow
an existing ticket format when supplied; otherwise use the compact format below.
Draft in the conversation by default. Writing a plan does not execute tests or
authorize a ticket comment, transition, attachment, or other external update.
Perform a ticket update only when its destination and write are explicitly
authorized and a suitable connected tool is available; otherwise return the draft.

## Establish the behavior

- Read the ticket and acceptance criteria supplied or available through an
  authorized connected source. Ask for the ticket content if a referenced ticket
  cannot be accessed and its requirements cannot be established from available
  context. Do not invent ticket IDs, requirements, environments, or credentials.
- If changes are the source, distinguish requirements from behavior inferred from
  implementation. For staged changes, use the runtime `commit-context` command
  to establish the staged scope; inspect relevant consumers or guides only as
  needed. For a broader feature, inspect the relevant source and existing tests.
- Map each supplied acceptance criterion to cases. Select relevant happy paths,
  negative cases, boundaries, lifecycle/repeated operations, and credible affected
  regressions. Avoid generic matrices unrelated to the change.
- For EVA, include downstream Data/Geometry/Visualization/Sectioning effects only
  when the changed contract supports them. Cover normal-view restoration and
  repeated regeneration when section lifecycle is affected; exports when the
  exporter or shared output contract changes.

## Ticket-ready output

Start with the ticket reference (only if known), change/feature summary, scope,
and environment or prerequisites. Mark missing environment details as unspecified.
Provide stable local case IDs such as `QA-01`; these are case labels, not ticket IDs.

For a small change, use a table:

| ID | Priority | Requirement/coverage | Preconditions and test data | Steps | Expected result | Status |
| --- | --- | --- | --- | --- | --- | --- |

For complex cases, use one short block per case with numbered actions and
observable expected results at meaningful steps. Define concrete test data when
the domain supports it; label examples and assumptions. Specify units and
tolerances when required, and avoid inventing product limits or exact dimensions.
Prioritize by user impact and likelihood, rather than labeling everything high.

Finish with relevant coverage gaps, assumptions, and blockers. Include a concise
ticket update summary if requested. Separate proposed cases from execution
evidence. New manual cases are **Not run**. Mark Passed, Failed, or Blocked only
from supplied or actually observed manual execution evidence; identify its source.
Automated test success does not establish a manual QA pass. Never claim a ticket
was updated when only a draft was produced. Do not modify production code or
create automated tests for a manual case-writing request.
