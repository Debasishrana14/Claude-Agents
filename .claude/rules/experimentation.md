# Experimentation Rules

## Purpose

Experimentation is used to answer questions that cannot be determined confidently through code inspection alone. 

Research asks:

> "What does the existing system do?"

Experiment asks:

> "What actually happens if we test this hypothesis?"

Planning asks:

> "What should we do based on the evidence?"

These are different activities.

---

# 1. When to Experiment

Use an experiment when:

- geometry behavior is ambiguous
- an algorithm has uncertain edge cases
- numerical behavior is unclear
- multiple possible solutions exist
- rendering behavior is uncertain
- Three.js behavior needs confirmation
- performance characteristics are unknown
- a reproduction is required
- tests do not suffciently explain behavior
- static inspection cannot establish the answer confidently

Examples:

- Which side of an offset polygon is correct?
- Does this intersection algorithm behave correctly for concave polygons?
- Where should a dock point move when a mullion crosses a coupler?
- Does changing renderOrder actually solve the rendering problem or only hide it?
- Does a specific Three.js object retain chilren after changing scene state?

---

# 2. Do Not Experiment Unnecessarily

 Do not create an experiment for:

 - obvious code changes
 - simple CRUD behavior
 - known API behavior
 - formatting
 - simple refactors
 - already-covered tests
 - questions answerable by reading the implementation

 ---

 # 3. Experiment Must Have a Hypothesis

 Every experiment must define:

 Hypothesis:
 What do we believe may be true?

 Input: 
 What exact case will it be tested?

 Expected:
 What result would support the hypothesis?

 Observed: 
 What actually happenend?

 Conclusions:
 What should we now believe?

 ---

 # 4. Experiment Isolation

 Prefer:

 - temporary scripts
 - isolated unit tests
 - small reproducible examples
 - Controlled geometry inputs
 - minimal Three.js scenes
 - benchmark scripts

 Avoid changing production code merely to perform an experiment. 

 ---

 # 5. CAD / Geometry Experiments

 For geometry experiments explicitly record:

 - input points
 - line equations
 - polygon orientation
 - tolerances
 - intersection points
 - offsets
 - expected topoloty
 - actual topology
 - degenerate cases

 Include edge cases where appropriate:

 - horizontal
 - vertical
 - diagonal
 - zero-length
 - parallel
 - coincident
 - tangent
 - concave
 - convex
 - arc
 - self-intersection
 - near-zero angle
 - floating-point tolerance

 ---

# 6. Performance Experiments

Performance experiments must distinguish:

- CPU time
- number of objects
- memory
- allocations
- rendering time
- API calls
- iteration count
- algorithmic complexity

Do not claim a performance improvement without evidence. 

---

# 7. Experiment Output

Return:

Experiment:
Hypothesis:
Input: 
Expected:
Observed:
Conclusion:
Confidence:
Limitations:

If the experiment generates substantial output, save it as an artifact instead of returning the entire output.

---

# 8. Production Safety

Experiments must not silently alter production behavior. 

Prefer:

- temporary files
- isolated test cases
- disposable branches/worktrees
- test-only-code

Delete temporary artifacts when they are not longer useful.