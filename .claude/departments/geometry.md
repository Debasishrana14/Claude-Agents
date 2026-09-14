# Configurator Geometry and Drawing-Board Domain

## Validated scope

Primary legacy path:

```text
src/app/configurator/common/geometry-layer/**
```

It contains more than pure geometry:

```text
geometry-2d/**             geometric primitives and topology
helpers/**                 math, cutting, extrusion, and Three.js helpers
dimensions/**              dimension geometry and labels
custom-dimensions/**       custom dimension behavior
angle-line-dimension-layer/**
drawing-board/**           board state, tools, interaction, serialization,
                           view control, and orchestration
interfaces/**              geometry and interchange contracts
```

`projects/machining-engine/src/**` is a separate bounded context. Its solid,
cut, pick, camera, annotation, and section modules are not owned by this legacy
department merely because they contain geometry.

## Responsibilities

- Point, line, arc, polygon, bounds, intersection, offset, cut, extrusion, and
  coordinate-transform behavior.
- Topology, orientation, tolerance, and geometric identity.
- Legacy drawing-board geometry and interaction behavior within the concrete
  paths assigned for a task.
- Geometry serialization/parsing contracts inside `drawing-board/json/**`.

## Important legacy overlap

This is not a clean computational layer. `Polygon2D` currently holds domain
fields, raw-material data, `THREE.Mesh`, `CSS3DObject`, parent-plane state, and
event-related behavior. `drawing-board/db-core-base.ts` imports Data rules,
visual labels, Three.js, section helpers, UI services, and configuration.

Therefore:

- Do not assume every edit under this folder is geometry-only.
- Classify the changed responsibility and downstream effects, not just the path.
- Do not perform a purity refactor as part of an ordinary bug fix.
- Changes to `Polygon2D`, `Line2D`, `DbPlane`, or `DbCoreBase` require impact
  analysis across Data rules, 2D/3D visualization, sectioning, serialization,
  interaction, and tests.

## Contract boundaries

Data/rules provide domain meaning, constraints, and mutation requirements.
Geometry provides stable primitives and results with explicit:

- input/output coordinate space;
- units and tolerances;
- orientation and ordering;
- identity preservation or replacement;
- degenerate-case behavior;
- whether output mutates or allocates;
- topology changes.

Visualization may consume geometry but should not become the source of domain
truth. Sectioning may derive section-specific geometry but should reuse general
primitives rather than pushing section presentation into them.

## Representative scenarios

### Incorrect polygon offset or intersection

Geometry owns the algorithm. Ask Data for semantic side/offset rules when they
are not intrinsic. Pass resulting point order, orientation, tolerance, and
degenerate behavior to consumers.

### Dragging or snapping defect

Start under `drawing-board/**`, but trace whether the fault is input state,
geometric constraint, DOM interaction, or rendering. This can be a multi-owner
workflow even though the entry file is under geometry-layer.

### Mesh appears in the wrong place

First determine whether computed coordinates are wrong or their scene transform
is wrong. Geometry owns the former; Visualization owns the latter.

## Verification

- Empty, zero-length, coincident, parallel, tangent, and tolerance-edge cases.
- Convex, concave, arc, and non-rectangular inputs where applicable.
- Point order, winding, topology, and stable identity.
- World/local coordinate conversion and units.
- Drawing-board edit, snapping, undo/redo, load/save, and disposal when touched.
- Downstream scene and section output for shared core types.
