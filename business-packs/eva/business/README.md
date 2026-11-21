# EVA project knowledge

This optional pack describes the EVA configurator. Copy this whole `business`
folder into an EVA application checkout only. Review it against that checkout;
these guides are starting knowledge, not proof of its current architecture.

Read guides relevant to the affected behavior:

| Area | Paths and guide |
| --- | --- |
| Data | `src/app/configurator/common/data-layer/`; [data responsibilities](departments/datalayer.md) |
| Geometry | `src/app/configurator/common/geometry-layer/`; [geometry responsibilities](departments/geometry.md) |
| Visualization | Visualization layers, `3d-config`, `3d-objects`; [visualization responsibilities](departments/visualization.md) |
| Sectioning | `src/app/configurator/sectioningView/`; [sectioning responsibilities](departments/sectioningBoard.md) |

The `rules/` documents retain the more specific path mappings. They are reference
documents inside this pack, not globally installed Claude rules.
Legacy files can mix responsibilities: classify behavior and downstream contracts
rather than assigning ownership by directory alone. Role descriptions do not
grant tools, spawning privileges, or authorization for Git or external writes.
No approval contacts are configured; ask when an actual decision needs an owner.

Use actual repository examples for naming and actual configured commands for
validation. Do not infer either from the EVA label or invent benchmark results.
