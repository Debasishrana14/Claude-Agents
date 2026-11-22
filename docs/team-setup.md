# Set up the Engineering Harness

Each developer uses their own authorized Claude account and a local harness
checkout. Applications stay in their existing repositories. No shared service,
administrator terminal, npm dependency install, or Docker is required for normal work.

## 1. Check prerequisites

In PowerShell:

```powershell
node --version
claude --version
```

Node must be 22+. Plugin support must be available in your Claude Code version.
The packaging and native installation/switch commands were checked with Claude
Code 2.1.220 on Windows; this is not a claim about every version or platform.

Download a reviewed distribution or clone its public source into a permanent
folder. In that folder, run:

```powershell
node tools/harness.mjs validate
```

## 2. Migrate an older installation, if present

Skip this section for a fresh setup. If you used `node tools/harness.mjs install`,
close Claude sessions, then run from the harness folder:

```powershell
node tools/harness.mjs uninstall
```

This unwinds the installer's recorded transactions, including upgrades. It restores
pre-install settings and instructions, retains task records and receipts, and
refuses to overwrite configuration edits made afterward. It can stop partway if
an earlier transaction has conflicting edits; the journal retains progress.
Do not delete your entire `.claude` folder to resolve a conflict. Preserve the
reported changes and reconcile the exact files before retrying.

If your setup predates the transactional installer and used manually linked
directories or direct CLAUDE.md imports, those need separate inspection. Restoring
pre-install content can restore those older links. Remove only confirmed harness
links/imports, preserving personal content. An uninstall result does not certify
that arbitrary manual installations are absent.

Use the same Claude configuration directory for migration and the new plugin.
If you set `CLAUDE_CONFIG_DIR`, keep it consistent; the legacy CLI also accepts
`--home PATH`. Do not run the legacy and plugin installations together.

## 3. Register the distribution

Run this once per developer, replacing the path with their harness folder:

```powershell
claude plugin marketplace add "C:\Tools\engineering-harness"
```

This registers the local source. It does not activate the harness in every
application. Keep the source folder available for updates.

For a reviewed GitHub release, the maintainer can instead publish the marketplace
and provide this form:

```powershell
claude plugin marketplace add OWNER/REPOSITORY
```

Replace the placeholder with the actual published repository. You use one route,
not both. A native Claude plugin is sufficient; no separate GitHub extension is
needed. This beta preparation includes the MIT license but does not publish a repository.

## 4. Activate an application clone

Navigate to the application, then install locally:

```powershell
Set-Location "C:\Work\my-application"
claude plugin install engineering@engineering-harness-local --scope local
claude plugin list
claude
```

`Set-Location` means change the terminal's folder. `claude` opens Claude Code for
that application. You can also use the Claude Code editor extension after local
installation; verify the selected workspace and start a fresh session.

The local enablement is stored in `.claude/settings.local.json`. Confirm it stays
out of Git; if needed add that exact path to your clone's `.git/info/exclude`.
Do not ignore all `.claude` files: some teams intentionally share project guidance.

Repeat this section for each clone you want enabled. Installing locally in one
clone does not select branches, synchronize code, or enable another clone.

## 5. Optionally copy business knowledge

Copy the **folder**, not its parent, so the result is:

```text
your-application/
  business/
    README.md
```

Use `templates/business/` for a new customization. Copy using your file manager,
without overwriting an existing business folder blindly. Before adding private
material, find the application's local exclude file:

```powershell
git rev-parse --git-path info/exclude
```

Open that returned file in an editor and add `/business/`. This keeps new
customization local without editing the application's shared ignore policy.
It does not untrack already committed files or erase history. Companies can
choose an approved private repository for deliberate team sharing later.

Review and customize the pack.
Organization-specific roles, owners, and business boundaries belong here.
The core works without this folder. [Business pack guide](business-packs.md).
Local documents may still be sent to the configured model provider when Claude
reads them; do not include credentials or assume local AI processing.

## 6. Work normally

Describe an outcome and useful constraints:

```text
Fix duplicate submission. Keep the existing validation and appearance.
```

For a plan already in the same conversation:

```text
/engineering:coordinate-work Execute the plan we agreed above.
```

Claude should select a proportional workflow. Small fixes do not require a large
planning ceremony or multiple agents. Larger uncertain designs get investigation,
a short design, required approval, implementation, review, and actual verification.
You can override workflow defaults. No workflow removes native permission checks.
Staging, committing, and pushing each require explicit authorization.

## 7. Switch, verify, and update

From the application clone:

```powershell
claude plugin disable engineering@engineering-harness-local --scope local
claude plugin enable engineering@engineering-harness-local --scope local
claude plugin list
```

Run the relevant switch command, then start a fresh Claude session. You do not
need to run both commands each time. The choice affects your local clone only.
For an explicit temporary test, `claude --plugin-dir "PATH TO HARNESS"` loads the
source for that session; it is separate from installed-plugin enablement.

To update, first obtain the team's reviewed harness release in the source folder,
then refresh the marketplace and cached plugin:

```powershell
claude plugin marketplace update engineering-harness-local
claude plugin update engineering@engineering-harness-local
```

Restart Claude and confirm the version with `claude plugin list`. Source edits
alone do not update an installed cached plugin. Review business-pack changes
separately: copied project knowledge is intentionally not overwritten by updates.
See [usage and hooks](usage-and-hooks.md) for evidence and troubleshooting.

To remove the plugin through Claude, open `/plugin`, select the installation for
the intended clone, and uninstall it. Local business knowledge and historical
runtime records are separate data; plugin removal should not be treated as a
request to delete them. Review those paths explicitly if cleanup is desired.
