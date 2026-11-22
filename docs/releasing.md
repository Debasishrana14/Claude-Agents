# Public beta release preparation

The deliverable is a native Claude Code plugin. GitHub can host its source,
marketplace manifest, documentation, and versioned release downloads. Developers
can also install a downloaded local folder. A separate GitHub or editor extension
is not required for this distribution model.

The marketplace identifier remains `engineering-harness-local` for compatibility
with existing installations. The word `local` is a name, not a restriction to
local-folder distribution. The owner selected MIT; the [license](../LICENSE) is
included in exports. The actual public repository address must be selected before publication.

## Keep the public boundary explicit

Public content includes generic workflows, worker definitions, hooks, runtime
code, tests, documentation, and fictional customization templates. Real business
knowledge, application-specific validation artifacts, private contacts, credentials,
local preferences, and runtime state stay outside the distribution.

The working repository previously held company-specific material. Moving it to
an ignored local folder does not remove it from existing Git history. Do not make
the original repository/history public on the assumption that deletion or ignore
rules have sanitized it. Use the allowlisted export as the basis of a clean public
repository, and review that export before publishing. Do not rewrite or publish
history as part of routine harness maintenance.

From the harness checkout:

```powershell
node tools/harness.mjs export --output "C:\Releases\engineering-harness-beta"
```

Use a new or empty destination as required by the exporter. The export should
contain the portable plugin and public supporting files without a `.git` directory
or private local material. Review its contents and run validation from that folder.
Creating an export does not authorize a Git commit, push, GitHub repository
creation, or publication.

`release.config.json` is an exact reviewed file list. New runtime files must be
added deliberately or export fails. Paths are checked case-insensitively for
private locations, links are rejected, and the result includes hashes in
`release-manifest.json`. Inputs are limited to 2 MiB per file and 16 MiB total.
The MIT license is included automatically. These checks do not scan arbitrary
document contents for secrets; human review and the remaining release gates
still apply. Never publish the ignored `.local/` archive or ambient checkout.

## Release gate

Before labeling a build ready for external beta users:

1. Confirm the included code and templates can be redistributed under the selected
   MIT license, and retain the copyright and license notices in the export.
2. Configure a monitored private vulnerability-reporting channel and update
   [SECURITY.md](../SECURITY.md) with the real route.
3. Review the export for company names, application paths, secrets, private
   documents, and accidental history. Verify its file list against the allowlist.
4. Run `node tools/harness.mjs validate`, `claude plugin validate .`, and `npm test`
   in a clean exported checkout. Record skipped checks and environment details.
5. Run native Claude plugin installation, update, disable, re-enable, and removal
   tests in temporary configurations, preserving unrelated personal configuration.
   Check component discovery rather than accepting a successful install alone.
6. Verify Windows, macOS, and Linux paths on actual supported environments. A CI
   definition is not evidence that each platform has passed. State version limits.
   Current local native tests used Claude's Windows executable; npm `.cmd` wrapper
   execution was not separately validated by the subprocess integration test.
7. Exercise representative real tasks across several stacks: a small fix, a larger
   approved plan, review findings, failed checks, interruption recovery, and an
   optional business pack. Evaluate correctness, human review effort, and token
   overhead; avoid broad quality claims based only on structural tests.
8. Record versioned release notes, known limitations, migration steps, validation
   evidence, and the exact artifact users should install.

Maintainers should publish a small beta first. Passing tests provides evidence
for specific behaviors, not proof that an agent cannot hallucinate or produce
incorrect, insecure, or hard-to-maintain code.

## Installation routes after publication

For GitHub-hosted distribution, replace the placeholder with the reviewed public
repository:

```powershell
claude plugin marketplace add OWNER/REPOSITORY
```

For a downloaded folder:

```powershell
claude plugin marketplace add "PATH TO DOWNLOADED HARNESS"
```

From the application clone, install for that developer in that clone:

```powershell
claude plugin install engineering@engineering-harness-local --scope local
```

Developers can disable it without deleting application knowledge:

```powershell
claude plugin disable engineering@engineering-harness-local --scope local
```

Start a fresh session after switching. The plugin does not erase instructions
already loaded in an existing conversation. Use `/plugin` for native uninstall.
See [setup](team-setup.md) for migration and [usage](usage-and-hooks.md) for evidence.
