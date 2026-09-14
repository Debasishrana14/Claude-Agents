# Configurator Visualization Domain

## Validated scope

Visualization is spread across several legacy paths; it is not confined to the
folder named `visualization-layer`.

Primary paths include:

```text
src/app/configurator/common/visualization-layer/**
src/app/configurator/common/3d-config/visualization/**
src/app/configurator/common/3d-config/3d-helpers/**
src/app/configurator/common/3d-config/label-helpers/**
src/app/configurator/common/3d-objects/**
```

Related orchestration and shared state may live in:

```text
common/3d-config/shared/services/visualization.service.ts
common/3d-config/data-helpers/models/VisualizationDataHelper.ts
common/geometry-layer/drawing-board/**
```

Those related files are overlap zones, not automatically writable under a
Visualization assignment. `sectioningView/**`, manufacturing drawing, and
`projects/machining-engine/**` own their feature-specific rendering unless the
task explicitly assigns those paths.

## Responsibilities

- Three.js scene representation, meshes, lines, materials, textures, labels,
  helpers, visibility, transforms, and rendering state.
- Realistic-view presentation and material selection.
- Mapping agreed Data and Geometry contracts into visible objects.
- Scene lifecycle: create, attach, update, hide/show, detach, and dispose.
- View-mode transitions where the assigned path owns them.

## Boundaries

- Do not make meshes, labels, `userData`, or scene traversal the authoritative
  business-data store when an existing domain contract is available.
- Do not repair incorrect geometry with arbitrary visual offsets, `renderOrder`,
  depth flags, or duplicate objects without establishing the root cause.
- Do not mutate Data rules merely to simplify rendering without a negotiated
  contract.
- Preserve object identity when callers retain references; otherwise document
  replacement and cleanup semantics.
- Treat the Three.js fields embedded in `Polygon2D` and drawing-board objects as
  legacy shared state requiring cross-domain impact analysis.

## Baton required from upstream

Before implementation, request only what rendering needs:

- geometry identity and coordinate space;
- domain state that controls appearance;
- update/recalculation trigger;
- visibility and view-mode rules;
- ownership and disposal responsibility;
- performance scale such as expected object count.

Return downstream evidence about created/reused/disposed objects and visual
state transitions rather than returning raw scene dumps.

## Representative scenarios

### Correct geometry, wrong material or visibility

Visualization owns the fix. Verify normal and realistic modes, transitions,
updates, and disposal.

### Object is duplicated after an edit

Trace creation, attachment, retained references, removal, and re-entry. Do not
only hide the duplicate.

### Wrong shape is displayed

Compare the upstream polygon/line contract with the mesh-building input. Route
incorrect coordinates to Geometry or domain selection to Data; do not silently
compensate in rendering.

### Machining preview defect

Route to `projects/machining-engine/src/core|preview|camera|annotation|pick/**` as
its own context, not to the legacy configurator Visualization department.

## Verification

- Scene membership and parent/child relationships.
- Local/world transforms and camera state.
- Object, material, geometry, texture, and listener disposal.
- Duplicate and stale objects.
- Normal/realistic and 2D/3D transitions.
- Render-on-demand and animation-loop lifecycle.
- Representative large designs for avoidable traversal/allocation regressions.
