# v2 conversion validation

Validated locally on 2026-11-21 with Node.js 22+ and Claude Code 2.1.220 on Windows.
This records packaging and runtime evidence, not a model-quality benchmark.

| Check | Observed result |
| --- | --- |
| Full Node test suite with `HARNESS_NATIVE_CLAUDE_TESTS=1` | 70 tests: 69 passed, 0 failed, 1 skipped |
| Skipped test | Actual Docker isolation integration; no approved test image configured |
| `node tools/harness.mjs validate` | v2.0.0; 6 agents, 9 skills, 0 global domain rules, 8 plugin hooks |
| `claude plugin validate .` | Marketplace accepted |
| Individual plugin manifest validation | Accepted; warning that root CLAUDE.md is not automatically project context |
| Native installation in temporary Claude configuration | v2 installed at local scope without creating a global CLAUDE.md import |
| Native component inventory | All 9 skills, 6 agents, and 8 hooks discovered |
| Native switch across two temporary application folders | Disabling one clone preserved the other's local enabled setting; re-enable succeeded |
| Hook launcher | Quoted plugin-root expansion worked through Git Bash with spaces in paths |
| Startup instructions | Runtime tests verified generic policy delivered in SessionStart output, with namespaced workflows |
| Business knowledge | Optional discovery, clone isolation, bounded metadata, and invalid-path/schema rejection passed |
| Legacy compatibility | Contract fallback, owned asset retirement, rollback, safe uninstall, receipts, and user-edit preservation passed |
| Skill structure | All 9 SKILL.md files passed skill-creator structural validation |
| Diff whitespace | `git diff --check` passed |

The root-CLAUDE.md warning is accounted for: the plugin SessionStart hook explicitly
delivers generic instructions. This does not prove that an actual model complies
with them. No model request, live development pilot, browser QA, comparative token
benchmark, or remote CI run was performed for this conversion. Temporary native
installation tests did not migrate the developer's real Claude configuration.

`npm test` normally skips the opt-in native Claude integration as well as Docker
when unavailable. To exercise native plugin management, run tests with
`HARNESS_NATIVE_CLAUDE_TESTS=1` in a shell appropriate for your OS. The test creates
its own source copy, application folders, and Claude configuration and removes
them afterward; it makes no model calls. Docker remains separately opt-in via
the existing approved-image test configuration.

## Manual acceptance still to run

| Case | Actions and expected outcome | Status |
| --- | --- | --- |
| Fresh development session | Install locally in a sample application, restart Claude, request a small fix. Expect a proportional workflow, real checks, and no unsolicited Git writes. | Not run |
| Business specialization | Copy and review a pack, start a fresh application session, request a domain change. Expect relevant guides and code evidence; do not expect invented owners. | Not run with a model |
| Disabled application session | Disable locally, start a fresh session without `--plugin-dir`, and inspect loaded components/hooks. Expect no engineering-plugin components; old receipts remain historical. | Not run with a model |
| Substantial approved plan | Provide an agreed plan and use `/engineering:coordinate-work`. Expect bounded work, checkpoints when useful, review, and actual verification. | Not run with a model |

Setup follows [Claude's plugin model](https://code.claude.com/docs/en/plugins) and
[local installation scope](https://code.claude.com/docs/en/discover-plugins#choose-an-install-scope).
The business pack is repository documentation, not a permissions mechanism.
