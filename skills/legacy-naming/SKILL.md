---
name: legacy-naming
description: Recommend variable, function, method, and parameter names by studying the relevant legacy code and its documented naming conventions. Use for naming reviews or new identifier suggestions; recommendations do not authorize renaming or creating a repository-wide naming policy.
---

# Legacy Naming Recommendations

Recommend names that accurately describe behavior and fit the affected codebase.
Study the actual application repository, not the harness configuration repository.
Work read-only by default. A naming review does not authorize edits, mass renames,
lint configuration changes, commits, or writing a permanent naming standard.

## Establish the scope and meaning

Use the supplied files, symbols, diff, or intended behavior as the starting point.
If the application source is unavailable, ask for its path or the relevant code;
do not claim the naming standards were learned from unrelated examples. For a
new symbol, establish its type, domain meaning, inputs/outputs, and side effects
from available context. If ambiguity materially changes the name, identify the
missing fact and label any provisional suggestion with its assumption.

Read the definition, relevant call sites, types, and tests before judging an
existing identifier. For functions, establish whether the operation queries,
allocates, mutates, validates, converts, or triggers lifecycle work; check null,
error, asynchronous, and side-effect behavior rather than inferring it from the
current name. For variables, distinguish an entity, ID, collection, count, state,
coordinate space, and measured quantity where relevant.

## Learn conventions from evidence

1. Read applicable contribution/style guides, scoped instructions, and naming
   rules in lint/config files without executing repository code. Formatting rules
   alone do not establish domain naming semantics.
2. Inspect nearby maintained examples of the same symbol kind and responsibility,
   then representative consumers in the same domain. Expand the search only if
   the local evidence is insufficient. Exclude generated, vendored, minified, and
   explicitly deprecated examples from the primary convention sample.
3. Record what is documented versus inferred: casing, common domain terms and
   abbreviations, boolean prefixes, function verbs, collection naming, unit/space
   suffixes, visibility prefixes, and asynchronous/observable conventions only
   where evidence exists. Do not impose a generic style as an observed standard.
4. Distinguish conventions by module and symbol kind when the legacy repository
   is inconsistent. Cite representative file/symbol locations and counterexamples
   that matter. A repeated typo or misleading name is not automatically a rule.
   Explain conflicts between written guidance and current practice, and prefer
   applicable explicit guidance unless the user specifies compatibility needs.

Consult relevant project business guides when present. Preserve established
domain terminology when it carries real meaning.
Do not invent expansions of abbreviations. Add unit or coordinate-space terms
only when the implementation establishes them. For example, do not assert `Mm`,
`World`, `Local`, `get`, `find`, or `create` is your team's convention without
evidence that it has the relevant meaning in that module.

## Recommend and assess compatibility

Prefer names whose operation or predicate is understandable without reading the
argument. Do not introduce sentence fragments such as
`hasZoneBetweenReferenceAnd(zone)` that require an argument to finish the name.
Conjunctions and prepositions are not banned words: judge the complete meaning,
not a suffix regex. `isPathToReferenceBlocked(zone)` is a candidate only if the
implementation actually checks that path and the project uses those terms;
neither the old name nor a restriction label alone establishes this behavior.
Respect explicit user/project naming requirements and preserve externally fixed
contracts. Flag existing incomplete names within scope without starting a mass
rename. Crisp means clear and specific, not the shortest possible identifier.

Keep an existing name if it is accurate and consistent; avoid cosmetic churn.
Prefer one recommendation per symbol, with an alternative only when a genuine
semantic choice remains. A local legacy convention can justify retaining a name
that differs from generic modern style, but cannot justify disguising behavior.

Before recommending a rename as low risk, check relevant declarations and uses:
exports, interface/override contracts, templates, reflection/dynamic lookups,
serialized JSON, API payloads, database fields, configuration keys, and downstream
consumers. Search is evidence of known references, not proof that no external
consumer exists. Distinguish a local alias from changing an externally consumed
key or public contract. State compatibility uncertainty and migration needs;
do not propose a blind text replacement as a safe symbol rename.

## Output

Briefly state the scope inspected and the conventions established, with concrete
repository evidence. Use a compact table when reviewing several symbols:

| Location/current name | Recommended name (or keep) | Meaning and convention evidence | Confidence | Rename impact |
| --- | --- | --- | --- | --- |

For one symbol, a short explanation may be clearer. Tie confidence to the scope
and consistency of the evidence. Separate observed standards, inferred patterns,
and unresolved assumptions. Do not claim runtime or compiler validation occurred
when only a read-only naming review was performed.

If the user separately asks to apply names, use the development workflow within
the requested scope, recheck references/contracts, and run relevant checks. Keep
the distinction between recommending a name and implementing a migration clear.
