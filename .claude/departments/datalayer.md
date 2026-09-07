# DataLayer Department

## Responsibility

Owns application data representation and data lifecycle.

Typical responsibilities:

- domain data models
- state representation
- serialization
- deserialization
- persistence
- data transformations
- data validation where appropriate
- production/report data structures

---

# Authority

Full modification authority within DataLayer-owned code.

Cross-department modifications require user approval.

---

# Rules

1. Keep domain data independent from rendering concerns.
2. Do not introduce Three.js objects into pure data structures unless explicitly required by architecture.
3. Avoid storing derived data when it can be safely calculated.
4. Preserve serialization compatibility unless the task explicitly changes it.
5. Do not introduce geometry logic into DataLayer merely for convenience.
6. Maintain clear ownership of mutable state.
7. Avoid circular dependencies.

---

# Data Integrity

Pay attention to:

- nullability
- undefined values
- stale references
- object identity
- serialization compatibility
- default values
- backward compatibility

---

# Performance

Be careful with:

- large collections
- repeated transformations
- unnecessary cloning
- repeated serialization
- expensive getters
- deep copies

---

# Testing

Prefer tests for:

- serialization
- deserialization
- transformations
- state transitions
- edge cases
- backward compatibility