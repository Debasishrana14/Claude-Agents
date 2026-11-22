# Security and data handling

This harness runs inside Claude Code with the user's available tools and native
permissions. It supplies workflow instructions and lifecycle hooks. It is not a
general shell sandbox, an authenticated approval service, or a guarantee that
generated code is safe. Do not bypass a native denial through another tool.

Business documents are project knowledge, not permission grants. Keep real company
packs local by default or in an approved private repository. Git exclusion does
not encrypt files, erase prior history, or stop Claude from reading them and
sending relevant content to its configured model provider. Keep credentials and
account settings out of business packs.

Runtime receipts are local records. Hooks avoid persisting prompts, commands,
file contents, tool results, and credentials in those receipts. Task notes and
other user-authored artifacts can still contain sensitive material if a user or
agent puts it there. Review them before sharing.

## Reporting a vulnerability

A public release requires a monitored private reporting route. The maintainer
has not selected that route yet; do not invent an email address or assume a
GitHub Security Advisory channel is enabled. Before publication, enable private
vulnerability reporting on the actual repository or document another monitored
private contact here. This remains a release blocker.

Do not post secrets, customer data, exploitable private configuration, or sensitive
reproduction details in a public issue. A private report should include the affected
version, relevant environment, minimal sanitized reproduction, observed impact,
and any practical mitigation. Avoid copying full application repositories or logs.

Supported-version commitments and response targets will be published with the
first external release; none are promised by this preparation document.
