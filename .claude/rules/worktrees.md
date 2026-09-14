# Parallel writer isolation

Use the current working tree for one writer or clearly disjoint approved paths.
Use separate worktrees when writers may touch overlapping files, shared generated
artifacts, package locks, project configuration, or common contracts.

Before parallel writes, record the base revision, writable paths, integration
owner, and verification owner. Workers do not merge, rebase, commit, delete a
worktree, or resolve another worker's conflicts without explicit authorization.
The coordinator inspects individual diffs and verifies the combined result.
