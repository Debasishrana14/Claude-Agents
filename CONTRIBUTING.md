# Contributing

This repository is being prepared for a public beta under the [MIT license](LICENSE).
Contribute only material you have the right to distribute under that license.

Keep contributions generic. Do not include a company's real architecture,
business rules, contacts, application validation artifacts, credentials, or local
Claude configuration. Use fictional examples and sanitized fixtures. Optional
business packs stay with their owners rather than becoming public core policy.

## Propose a change

Describe the concrete problem, affected behavior, compatibility implications,
and a small example. Reuse existing code before adding a new abstraction. Keep
changes focused and reviewable; avoid unrelated formatting or renaming.

Add regression coverage for meaningful behavior changes. Validate from the
harness folder:

```powershell
node tools/harness.mjs validate
claude plugin validate .
npm test
```

Native Claude integration and Docker integration can be environment-dependent.
Report the actual commands, environment, failures, and skipped checks. Do not
convert a skipped or synthetic check into a claim that a real session worked.

For user-facing changes, update setup and usage documentation. For a plugin
packaging change, check that Claude discovers all expected skills, agents, and
hooks and that local disable/removal leaves unrelated configuration intact.
For release preparation, follow [the release gate](docs/releasing.md).

Report non-sensitive bugs with the harness/Claude/Node versions, OS, minimal
sanitized reproduction, expected result, and observed result. For security issues,
follow [SECURITY.md](SECURITY.md) instead of posting sensitive details publicly.

Do not publish a release or alter Git history as part of an ordinary fix. Staging,
committing, pushing, and publication each require the responsible user's explicit
authorization in an agent-assisted session.
