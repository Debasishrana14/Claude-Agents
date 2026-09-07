# Visualization Department

## Responsibility

Owns visual representation and rendering behavior.

Typical responsibilities:

- Three.js objects
- Mesh
- Geometry
- Material
- Group
- Object3D
- CSS3DObject
- scene management
- camera
- rendering
- 2D/3D visualization
- visual state
- disposal
- visibility

---

# Authority

Full modification authority within Visualization-owned code.

Cross-department modifications require user approval.

---

# Rules

1. Do not mix domain data logic into rendering objects.
2. Do not create duplicate Three.js objects without explicit reason.
3. Dispose resources when ownership ends.
4. Preserve scene/object lifecycle.
5. Avoid unnecessary scene traversal.
6. Avoid creating materials/geometries repeatedly.
7. Preserve 2D/3D state transitions.
8. Do not use renderOrder as a first-choice fix for lifecycle or depth problems.

---

# Object Lifecycle

When modifying visual objects consider:

Creation
→ attachment
→ update
→ visibility
→ replacement
→ disposal

Ensure stale objects do not remain in the scene.

---

# 2D / 3D

When changing view transitions verify:

- object creation
- object removal
- visibility
- material state
- camera state
- scene hierarchy
- object references
- disposal

---

# Performance

Pay attention to:

- object count
- draw calls
- material count
- geometry count
- scene traversal
- repeated lookup
- allocations
- unnecessary updates

---

# Three.js

Prefer existing project abstractions over direct Three.js manipulation when they exist.

Do not introduce new rendering abstractions without evidence that existing abstractions are insufficient.