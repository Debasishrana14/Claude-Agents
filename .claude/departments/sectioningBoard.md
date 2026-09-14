# Legacy Configurator Sectioning View Domain

## Correct name and validated scope

The repository does not contain a clean `SectioningBoard` technical layer. The
concrete legacy feature is:

```text
src/app/configurator/sectioningView/**
```

Use **Sectioning View** when discussing this code. “SectioningBoard” may still
refer to runtime drawing-board concepts such as
`SectioningDataHelperService.SectioningBoardDesignType`; it should not imply a
separate repository layer.

Owned feature paths include:

```text
sectioningView/front-view/**
sectioningView/side-and-top-view/**
sectioningView/sectioning-lines/**
sectioningView/profiles-viewer/**
sectioningView/properties-box/**
sectioningView/wall-view/**
sectioningView/drag-events/**
sectioningView/dxf/**
sectioningView/section-view-service.ts
sectioningView/secton-view-design-helpers.ts
sectioningView/section-view-enums.ts
```

Shared section helpers under `common/3d-config/shared/section-view-helpers/**`
are an overlap zone. Assign their paths explicitly. The machining engine's
`projects/machining-engine/src/section/**` is unrelated ownership-wise.

## Responsibilities

Sectioning View is a vertical feature slice that coordinates:

- section-line selection and drag behavior;
- front, side, and top view derivation;
- section-specific profile, glass, wall, fastener, and connecting-line output;
- dimensions, labels, property boxes, and profile viewing;
- section report layout and format selection;
- section DXF export;
- entry, update, repeated generation, and exit lifecycle.

It consumes Data rules and geometry primitives and creates Three.js objects.
That does not transfer general Data, Geometry, or Visualization ownership to
this feature.

## Contract boundaries

From Data, request design meaning, profiles/parts, variables, format state, and
domain restrictions. From Geometry, request stable polygons, lines, coordinate
spaces, tolerances, and transformations. From Visualization, reuse lifecycle
and representation contracts where existing abstractions support them.

Sectioning View owns section-specific composition. General-purpose corrections
must go back to their upstream owner instead of being patched only in the
section output.

`section-view-service.ts` is a high-impact orchestrator with extensive static
state and dependencies. Changes require tracing callers, repeated invocation,
format-specific branches, and cleanup; do not treat it as an isolated service.

## Representative scenarios

### Normal design correct, section profile misplaced

Sectioning View owns section transformation/composition if the upstream geometry
contract is correct. Record the consumed coordinate space and resulting offset.

### Both normal and section views are wrong

Investigate Data/Geometry first. Avoid duplicating the correction in sectioning.

### Section output becomes stale after editing

Trace mutation notification, cached/static section state, retained Three.js
objects, regeneration, and cleanup. Ownership may span the upstream mutation
contract and section lifecycle.

### DXF differs from the visible section

Compare the shared section model/objects and exporter conversion. Determine
whether the source view or export transform is wrong before changing either.

## Verification matrix

- Enter, update, exit, and repeated sectioning.
- Normal view before and after sectioning.
- Front, side, and top views as applicable.
- Inside/outside and supported design/report formats.
- Custom and generated sectioning lines.
- Dragging, dimensions, labels, properties, and profile viewer when affected.
- Walls, glass, fasteners, and connecting lines where relevant.
- Visible view versus DXF/export output.
- Stale objects, references, static state, and listeners.
- Multiple openings/designs in one session.
