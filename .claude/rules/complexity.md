# Complexity Rules

## Purpose

Analyze complexity only when it can materially affect correctness or performance.

Do NOT perform formal complexity analysis for every task.

---

# 1. Complexity Analysis Required When

Consider complexity analysis when modifying:

- algorithms
- loops over large collections
- nested loops
- graph traversal
- geometry algorithms
- intersection algorithms
- polygon operations
- searching
- sorting
- caching
- rendering pipelines
- thousands of Three.js objects.
- repeated scene traversal
- event processing
- recursive algorithms
- data transformations
- memory-heavy operations
- performance-sensitive code. 

---

# 2. Complexity Analysis Not Required For

Do not analyze complexity for:

- simple bug fixes
- formatting
- renaming
- straightforward UI changes
- simple configuration
- isolated property changes
- trivial CRUD operations

---

# 3. Required Analysis

When applicable identify:

Time Complexity:
O(...)

Dominant operations: 
...

Scaling concern:
...

Potential optimization:
...

---

# 4. Geometry

For geometry algorithms consider:

- number of points
- number of edges
- number of polygons
- pairwise comparisons
- repeated intersection calculations
- spatial indexing
- tolerance operations

Explicitly identify whether an algorithm is:

O(n)
O(n log n)
O(n²)
O(n³)
or worse.

---

# 5. Rendering

For visualization consider:

- number of Three.js objects.
- traversal count
- material creation
- geometry creation
- disposal
- draw calls
- scene updates
- repeated object lookup

Avoid optimizing purely based on intuition.

---

# 6. Optimization Rule

Do not refactor for theoretical complexity alone. 

Optimization should be justified by:

- measured performance.
- known scaling problem.
- obvious pathological behavior
- architectural requirement

Prefer the simplest implementation that satisfies the requirement.
