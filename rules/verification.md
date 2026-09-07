# Verification Rules

## Purpose

Verification determines whether the requested work actually works.

Review and verification are different.

Review asks:

> "Does the implmentation look correct?"

Verification asks:

> "Can we produce evidence that the implementation works?"

---

# 1. Verifications Is Required When Meaningful

After implementation, determine the strongest practical verification available.

Prefer: 
1. targetted reproduction
2. unit test
3. integration test
4. type check
5. build
6. lint
7. targeted runtime validation
8. diff inspection

Use only checks relevant to the change.

Do not run every possible check automatically.

---

# 2. Bug Fix Verification

For a bug fix:

1. Reproduce original failure if possible. 
2. Apply fix. 
3. Verify original failure is resolved.
4. Verify nearby behavior.
5. Run relevant tests.
6. Inspect final diff.

If reproduction is impossible, state taht explicitly. 

---

# 3. Refactor Verification

For refactors verify:

- behavior preservation
- compilation
- tests
- public API compatibility
- import relationships
- dependency direction
- removed dead code
- accidental behavior changes

A refactor is not considered safe merely because TypeScript compiles.

---

# 4. Code Review Verification

A reviewer does not modify production code.

Review:

- correctness
- regression risk
- architecture
- department boundaries
- error handling
- performance
- unnecessary complexity
- missing tests
- type safety
- lifecycle problems
- resource leaks

Only report actionable findings.

---

# 5. Geometry Verification 

For geometry changes verify:

- point ordering
- line direciton
- polygon orientation
- intersections
- parallel cases
- coincident cases
- zero-length cases
- tolerance handling
- concave shapes
- arcs where applicable 
- boundary containment
- no unintended topology changes

---

# 6. Rendering Verification

For Visualization changes verify:

- object visibility
- scene membership
- child relationships
- materials
- render lifecycle
- 2D/3D transisitions
- camera state
- sectioning state
- object disposal
- duplicate objects
- stale objects

---

# 7. Verification Output

Return:

Status: PASS | FAIL | PARTIAL

Checks:
- check
- result

Failures:
- failer

Remaining risks:
- risk

Confidence: 
- HIGH | MEDIUM | LOW

Never report "looks good" when stronger evidence is available. 

---

# 8. Failure Handling

If verification fails:

DO NOT immediately retry blindly. 

First determine: 

- implementation failure
- test failure
- environment failure
- unrelated existing failure
- incorrect assumption

Then act accordingly