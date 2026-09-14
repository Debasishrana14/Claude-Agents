# Department Rules

## Departments

For the legacy EVA configurator, use these responsibility domains:

1. Configurator Data and Rules
2. Configurator Geometry and Drawing Board
3. Configurator Visualization
4. Configurator Sectioning View

These are architectural responsibilities, not filesystem permissions by
themselves. Each consuming project should provide a path-to-owner map in its
own `CLAUDE.md` or domain documentation. Without that map, assign exact writable
paths for each task and treat the department documents as review guidance.

Shared contracts, integration tests, configuration, generated files, and files
with mixed responsibilities must have an explicit owner in the task assignment.
Do not infer ownership from a filename alone.

## Validated EVA configurator map

When these paths exist in the current repository, use this map as a starting
point, then apply the overlap rules in each department document:

```text
src/app/configurator/common/data-layer/**
  → Configurator Data and Rules

src/app/configurator/common/geometry-layer/**
  → Configurator Geometry and Drawing Board

src/app/configurator/common/visualization-layer/**
src/app/configurator/common/3d-config/visualization/**
src/app/configurator/common/3d-config/3d-helpers/**
src/app/configurator/common/3d-config/label-helpers/**
src/app/configurator/common/3d-objects/**
  → Configurator Visualization

src/app/configurator/sectioningView/**
  → Configurator Sectioning View
```

Explicit overlap zones include `Polygon2D`, drawing-board core/view code,
`common/3d-config/shared/**`, visualization data helpers, shared section helpers,
manufacturing drawing, and DXF/export flows. Classify those by the behavior
being changed and assign exact paths; do not grant one department blanket
authority.

`src/app/configurator-new/**`, `src/app/@shared/**`, and every `projects/**`
Angular/library context remain outside this four-domain map unless a task
provides a more specific owner. In particular, `projects/machining-engine/**`
is its own bounded context.

---

# 1. Department Authority

An agent assigned to a department may implement only within the exact paths
approved for its task.

It may: 

- read
- create
- modify
- refactor
- delete only when deletion is explicitly included in the approved task
- test

files owned by its department.

---

# 2. Reading Other Departments

Cross- department READ access is allowed.

Agents should read other departments when necessary to understand:

- dependencies
- consumers
- contracts
- data flow
- rendering flow
- geometry dependencies
- sectioning dependencies

Reading outside the department does NOT require approval.

---

# 3. Modifying Other Departments

Writing outside assigned paths requires explicit user approval, whether or not
the target is described as belonging to the same department.

This includes:

- modifying
- creating
- deleting
- moving
- renaming
- refactoring
- changing tests owned by another department

---

# 4. Boundary Procedure

If implementation requires another department to be modified:

STOP before modifying it.

Report:

Department:
Target department:

Files:
...

Reason:
...

Required change:
...

Why it cannot be solved inside the current department:
...

Then ask the user for approval.

Do not silently cross the boundary.

---

# 5. Dependency Direction

Do not introduce dependencies merely to make implementation easier. 

Before adding a cross-department dependency determine:

- existing dependency direction
- whether an existing abstraction already exists
- whether the dependency creates a cycle
- whether the change belongs in another layer

---

# 6. Department Documentation

Before modifying a department, load its department-specific instructions.

Configurator Data and Rules:
.claude/departments/datalayer.md

Configurator Geometry and Drawing Board:
.claude/departments/geometry.md

Configurator Visualization:
.claude/departments/visualization.md

Configurator Sectioning View:
.claude/departments/sectioningBoard.md

Only load the relevant department documentation.

Do not load all department documents for every task.

---

# 7. Boundary Escalation

If ownership is unclear:

Do not guess.

Identify:

- current file
- suspected owner
- dependency
- required modification

Ask for clarification if ownership affects implementation.

## Contract-first cross-layer work

When one department consumes another department's output, define the contract
before implementation: data shape, invariants, lifecycle, error behavior, and
verification evidence. A downstream owner may request an upstream contract, but
the request does not authorize upstream edits or another delegation. Route it
through the main coordinator and obtain the required approval.


