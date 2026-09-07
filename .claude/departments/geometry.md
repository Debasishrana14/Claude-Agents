# Geometry Department

## Responsibility

Owns geometric primitives, geometry algorithms, topology operations and geometric calculations.

Typical responsibilities:

- Point
- Line
- Polygon
- PointBase
- LineBase
- PolygonBase
- intersections
- offsets
- trimming
- extension
- projection
- distance
- angles
- parallel lines
- polygon generation
- polygon validation
- geometric relationships

---

# Authority

Full modification authority within Geometry-owned code.

Cross-department modifications require explicit user approval.

---

# Core Invariants

Preserve:

- coordinate correctness
- point ordering
- line direction
- polygon orientation
- topology
- endpoint relationships
- parent-child relationships
- geometric tolerance rules

Never change these implicitly.

---

# Numerical Robustness

Consider floating-point tolerance whenever comparing:

- coordinates
- distances
- angles
- parallelism
- collinearity
- intersection results

Avoid direct equality comparisons for floating-point geometry unless exact equality is intentional.

---

# Polygon Rules

Before modifying polygon algorithms determine:

- clockwise or anticlockwise convention
- outer boundary convention
- hole convention
- edge ordering
- closed/open representation

Never assume orientation.

---

# Line Rules

Understand:

- startPoint
- endPoint
- direction
- normal
- line equation
- segment bounds

Distinguish carefully between:

- infinite line
- ray
- finite line segment

---

# Intersection Rules

Handle explicitly where relevant:

- proper intersection
- endpoint intersection
- parallel lines
- coincident lines
- no intersection
- near-parallel lines
- overlapping segments
- tolerance

---

# Offset Rules

For offsets determine:

- direction convention
- polygon orientation
- inside/outside meaning
- normal direction
- positive/negative offset meaning

Never assume "left" or "right" without considering line direction.

---

# Degenerate Cases

Consider:

- zero-length lines
- duplicate points
- collinear points
- zero-area polygons
- nearly parallel lines
- tangent intersections
- very small edges
- self-intersections

Only handle cases relevant to the affected algorithm.

---

# Performance

Avoid unnecessary:

- O(n²) operations
- repeated intersection calculations
- repeated polygon traversal
- object allocation
- cloning
- recalculation of invariant values

For performance-sensitive changes, use the complexity rules.

---

# Verification

Geometry changes should include targeted cases where applicable:

- horizontal
- vertical
- diagonal
- convex
- concave
- rectangle
- non-rectangular
- arc
- boundary
- intersection
- parallel
- coincident
- tolerance/precision cases