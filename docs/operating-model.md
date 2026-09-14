# Operating model

## Supported deployment

This repository is the maintained source for one user's cross-project Claude
Code agents, rules, and skills. User-level junctions expose those directories to
Claude Code. It is not an organization-managed security policy.

## Decision ownership

- The user authorizes delegation, model escalation, scope expansion, external
  effects, commits, and destructive operations.
- The main session classifies work, proposes delegations, validates handoffs,
  integrates results, and reports deviations.
- A worker owns one accepted deliverable and only its assigned paths.
- A verifier produces evidence and does not repair failures.
- An architect resolves one approved high-difficulty decision and does not
  implement it.

## Release process

1. Update configuration and evaluation cases together.
2. Run `node tools/validate-config.mjs` and `git diff --check`.
3. Review user-level setting changes separately from repository changes.
4. Exercise representative direct, relay, and escalation scenarios manually.
5. Update `CHANGELOG.md` and `VERSION`.
6. Commit and tag only after user review and explicit authorization.
7. Roll back by restoring the previous tag and restarting Claude Code.

## Compatibility

The configuration assumes Claude Code supports filesystem agents, Agent Skills,
path-scoped rules, the `Agent` permission name, and optional experimental agent
teams. If a client upgrade changes these surfaces, validation must be followed by
a manual smoke test; static checks cannot prove runtime compatibility.

## Managed-policy promotion

`.claude/policy/managed-settings.example.json` is a reviewed starting point, not
an active managed policy. IT/security must adapt secret paths, command rules,
sandbox filesystem/network allowlists, approved MCP servers, marketplaces, and
authentication controls to the organization threat model before deploying it.
Do not copy it blindly into the system managed-policy location.

## Distribution

The current supported deployment is user-level junctions. A future multi-user
distribution should package generic agents and skills using Claude Code's plugin
format and keep repository-domain rules separate. Do not use a Codex
`.codex-plugin` manifest for Claude Code.

## Success measures

Measure separately:

- direct versus delegated task count;
- main-context preservation;
- total model tokens and cost when available;
- Opus invocation rate and justification;
- delegation rejection or scope-change rate;
- verification failures and correction rounds;
- handoff completeness and downstream contract deviations.

Do not claim token savings without comparing representative direct and delegated
runs. Repository validation checks policy consistency, not model behavior.
