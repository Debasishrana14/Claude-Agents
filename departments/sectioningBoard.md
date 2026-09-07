# SectioningBoard Department

## Responsibility

Owns sectioning-board behavior and coordination of section views.

Typical responsibilities:

- sectioning interaction
- section state
- section view behavior
- section-specific geometry
- section-specific visualization
- section boundaries
- interaction state
- coordination between geometry and visualization

---

# Authority

Full modification authority within SectioningBoard-owned code.

Cross-department modifications require user approval.

---

# Rules

1. Preserve normal drawing behavior when sectioning is inactive.
2. Sectioning-specific state must not silently corrupt normal design state.
3. Clearly distinguish source geometry from sectioned geometry.
4. Avoid modifying shared geometry unless ownership is explicit.
5. Preserve transitions into and out of sectioning mode.
6. Verify both sectioned and normal views.

---

# State

When modifying sectioning logic consider:

- enter section
- update section
- exit section
- restore original state
- repeated section operations
- stale section objects
- stale references

---

# Dependencies

Geometry may be read.

Visualization may be read.

DataLayer may be read.

Modification of those departments requires explicit approval.

---

# Verification

Test:

- normal view
- sectioned view
- entering section mode
- leaving section mode
- repeated toggling
- geometry updates while sectioning
- visualization updates while sectioning