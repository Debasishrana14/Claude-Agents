# Changelog

## Unreleased

- Introduce canonical action-based workflow names with compatibility aliases;
  add planning and interrupted-task recovery, and consolidate change verification.
- Separate file access, delegation approval, and completion policy handlers.
  Support explicit operator-configured memory and temporary write directories.
- Record bounded recovery references before compaction and at session end,
  preserving verification revisions and applying session-receipt retention.
- Keep agent definitions and instruction-level model ceilings unchanged for the
  later agent refactor.

- Bind every required validation check to explicit argv; reject unbound legacy
  contracts until redefined. Keep failures open across checkpoints until the
  same check succeeds on current inputs.
- Fingerprint declared ignored project inputs and record evidence limitations.
- Replace full plugin startup policy injection with a bounded core and load
  workflow details on demand. Clarify automatic delegation and causal diagnosis.

- Consult project naming evidence for identifier changes and reject incomplete
  sentence-style names during development and review.

- Clarify outcome-based use without requiring users to select components.
- Tighten development context gathering and reuse of plans already in chat.
- Add a paired evaluation protocol for quality, reviewer effort, and overhead.

## 2.0.0 — beta preparation

- Package generic engineering workflows as a native Claude Code plugin.
- Support local installation and per-clone enable/disable settings.
- Discover optional business knowledge in the application; keep it local by default.
- Keep business role descriptions separate from native tool permissions.
- Retain legacy installation rollback and migration removal with drift checks.
- Preserve existing local task records and legacy project-contract compatibility.
- Prepare a public export from an explicit file list without company knowledge,
  developer state, or existing Git history.
- Reject linked release assets that could escape the source directory.

This is beta preparation, not a published release or a guarantee of code quality.
See [release gates](docs/releasing.md) and [validation](docs/validation-2.0.0.md).
