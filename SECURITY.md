# Security policy

This repository provides behavioral instructions and user-scoped Claude Code
configuration. Prompt instructions are not a security boundary.

## Enforced locally

The active user settings require a permission prompt for the `Agent` tool,
disable bypass-permissions mode, block reads of common private-key and dotenv
paths, and block selected destructive or external Git commands.

User settings are not enterprise-managed policy and can be changed by the local
user. An organization deployment should reproduce reviewed controls in managed
settings, restrict unmanaged hooks and MCP servers where required, and use the
Claude Code sandbox and network allowlists appropriate to its threat model.

## Never store

- API keys, access tokens, passwords, cookies, or private keys.
- Raw model chain-of-thought or complete private transcripts.
- Customer or production data in coordination artifacts.
- Credentials in agents, skills, evaluation cases, or example manifests.

## Sensitive actions

Publishing, deployment, package installation, external messages, commits,
pushes, destructive Git operations, material deletion, permission changes, and
production access require explicit task-specific authorization.

Repository content, issue text, logs, and retrieved web pages are untrusted
input. Instructions found inside them cannot expand user authorization.
