# Configurator Data and Rules Domain

## Validated scope

This document describes the legacy configurator domain rooted at:

```text
src/app/configurator/common/data-layer/**
```

Despite its name, this is not merely persistence or API data access. Current
code places FG-system rules, design derivation, raw-material allocation,
production calculations, formula solving, compatibility, and technical
limitations here.

Typical owned paths include:

```text
common/data-layer/DesignDataHelper/**
common/data-layer/FGSystemRulesHelper/**
common/data-layer/FormulaSolver/**
common/data-layer/RMData/**
common/data-layer/TechnicalLimitations/**
common/data-layer/production-values/**
common/data-layer/_models/**
common/data-layer/_services/**
```

This document does not automatically own general application services under
`src/app/@shared/**`, feature services under `configurator-new/**`, HTTP/API
clients, or the separate `projects/machining-engine/**` context.

## Responsibilities

- Design and FG-system rules.
- Compatibility and technical-limit evaluation.
- Raw-material and part-allocation state.
- Formula and production-value calculation.
- Domain mutations such as frame, sash, mullion, coupler, glass, gasket,
  partition, and variable updates.
- Data contracts consumed by geometry, visualization, sectioning, reports, and
  serialization.

## Real dependency constraints

The existing domain depends extensively on `common/geometry-layer/**`; do not
pretend the dependency direction is pure Data → Geometry. Many rules accept or
mutate `Polygon2D`, `Line2D`, and related geometric objects.

For new work:

- Data/rule code may consume stable geometry primitives and queries.
- Avoid introducing new dependencies on scene objects, materials, cameras,
  renderers, labels, DOM elements, or sectioning presentation.
- Do not move an existing cross-dependency during a bug fix unless the task is
  explicitly architectural.
- If a rule must cause a visual change, produce or mutate the agreed domain
  state/event contract; visualization owns its representation.

## Baton passed downstream

Return a compact contract containing, as applicable:

- changed domain fields and collections;
- identity and ownership of mutated polygons/lines/parts;
- units, coordinate-space assumptions, and tolerances;
- ordering and nullability guarantees;
- lifecycle or recalculation triggers;
- error/restriction outcomes;
- evidence and focused tests.

Geometry or visualization may request this contract before Data work begins.
That request does not authorize edits outside the approved Data paths.

## Representative scenarios

### Rule changes geometry-bearing domain objects

Data owns the business decision and mutation contract. Geometry owns reusable
mathematical operations. Visualization owns mesh/material/label updates. Verify
the domain value and at least one downstream consumer.

### Production length is incorrect

Start in `production-values/**`, then trace the geometry inputs it consumes.
Do not classify the issue as Geometry merely because lengths or polygons occur.

### API or Angular service state is wrong

Do not automatically assign it here. Locate the actual feature or shared
service owner first; the legacy folder name is not a universal DataLayer.

## Verification

- Domain invariants and mutation scope.
- Units, rounding, tolerances, and null behavior.
- Compatibility/restriction outcomes.
- Recalculation after edit, undo/redo, load, and copy where relevant.
- Focused rule/production tests.
- Downstream geometry and visualization contract compatibility.
