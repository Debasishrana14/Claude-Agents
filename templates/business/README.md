# Project knowledge

Replace this introduction with the project's purpose and established terminology.
Keep this entry point short. Link supporting Markdown documents only when they
contain maintained project knowledge and say when each should be read.

Useful subjects include architecture and contracts, business rules, naming
examples from maintained code, organization-specific roles and ownership,
approval responsibilities, and verification requirements. Document unknowns as
unknowns. Do not invent authorities or copy generic engineering policy here.

The harness discovers this file as `business/README.md` in the application root.
An optional `business/harness.json` can index guides:

```json
{
  "schemaVersion": 1,
  "documents": [
    { "path": "architecture.md", "when": "Changing service boundaries or public contracts" }
  ]
}
```

Create the referenced file before adding it to the index. Paths stay inside this
folder. The index accepts documentation metadata only, not commands, permissions,
models, or executable hooks. Shared knowledge normally belongs in version control;
personal activation settings and task state do not. Keep secrets out of this pack.
