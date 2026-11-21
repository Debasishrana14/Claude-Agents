# Local execution and deployment

For v2 plugin installation and per-clone activation, use [team setup](team-setup.md).
The CLI below is optional operations tooling. Its historical `eva-harness` storage
names are retained for compatibility; they do not select business knowledge.

The harness now has a local Docker job path and explicit clone targeting. These
do not turn every Claude Bash/MCP call into a sandboxed operation. Normal host
checks and isolated jobs are separate execution paths.

## Your four checkouts

`projects list` displays locally registered aliases. Examples below use
`main` and `secondary`; register your own names and paths. Registration writes only local
harness state; it does not edit the application or its Git configuration.

```text
node tools/harness.mjs projects list
node tools/harness.mjs --project main project-context
node tools/harness.mjs --project secondary commit-context
node tools/harness.mjs operations-status
```

There is no sticky/default alias. Use either `--project ALIAS` or an explicit
`--workspace PATH`. Task checks still use the task's saved workspace; combining
an existing task ID with another registered clone is rejected. Do not interpret
a test pass in one checkout as evidence for another checkout.

## Isolated jobs

Docker and WSL were unavailable on the inspected machine on November 21. The
backend is implemented and tested with a driver double, but actual Linux
container integration is skipped locally until the runtime is available. A Linux
CI job is configured to run the actual integration test, not silently skip it.
CI configuration is not evidence that a remote CI run has completed.

An operator must first install/configure a local Linux Docker engine. The harness
does not install virtualization, enable Windows features, restart the machine,
or silently execute jobs on the host. `execution-status` reports readiness.

Copy `deploy/execution.example.json` to the selected Claude config directory's
`eva-harness/execution.json`, review limits, and populate `approvedImages` with
reviewed local immutable image IDs (`sha256:` plus 64 hex characters). An empty
image list authorizes no workload. Treat this file as operator policy. A user
who can run unrestricted host commands or edit this policy is outside this
local control boundary; team deployments need OS-level separation.

The supplied `deploy/Dockerfile.worker` verifies that the timeout tool is present.
Build with `deploy/` as the build context, not the application or user directory:

```text
docker build -f deploy/Dockerfile.worker -t eva-worker-local deploy
docker image inspect --format "{{.Id}}" eva-worker-local
```

Review/pin the base image for production and approve the resulting local image ID.
The worker image must contain the workload's tools and dependencies. No host
`node_modules`, environment files, Git internals, credentials by known sensitive
filenames, or symlink targets are automatically copied. A filename filter is
not a general secret scanner; inspect the proposed source/data scope.

```text
node tools/harness.mjs --project main jobs submit --image sha256:APPROVED_LOCAL_ID -- node path/to/self-contained-workload.mjs
node tools/harness.mjs jobs start JOB_ID
node tools/harness.mjs jobs status JOB_ID
node tools/harness.mjs jobs logs JOB_ID
node tools/harness.mjs jobs cancel JOB_ID
node tools/harness.mjs jobs remove JOB_ID
```

Replace the illustrative image ID and command. Do not submit the whole Angular
application and assume its dependency tree exists in the generic worker image;
prepare an appropriate image or target a bounded self-contained workload.

Submission snapshots a bounded set of files and records hashes, argv, image ID,
limits, and omitted paths. Jobs use copied inputs, not live application mounts;
changed or added snapshot files are rejected before execution. The local owner
can still modify state, so operator separation requires OS-level protection. Source
capture is not an atomic filesystem snapshot, but the manifest records the exact
captured bytes. Each job runs non-root with no network, a read-only root/input
mount, dropped capabilities, no-new-privileges, CPU/memory/swap/PID limits, bounded
tmpfs and Docker logs, and a container-internal GNU timeout. Local Unix socket or
Windows named-pipe contexts are required; remote daemon mounts are rejected.

The container's timeout survives the submitting CLI exiting. Job records survive
restart; `status` reconciles them with the owned container. Lost/created-only jobs
are not assumed successful or automatically executed twice. Unknown/running jobs
consume a concurrency slot until reconciled/cancelled. Exit 124 is classified as
timeout; OOM is reported separately; other forced kills remain failures unless
explicitly cancelled. No application-internal computation checkpoint is invented.

Commands read `/workspace` and can write temporary outputs to `/work` or `/tmp`.
Only bounded stdout/stderr logs are retained by `jobs logs`, with an artifact hash;
arbitrary output trees are not copied to the host. These logs can contain workload
data: keep local state private. The queue, snapshot size/file count, concurrency,
and total retained record count are bounded. `remove` cleans up a non-active owned
container and its local snapshot/logs, without deleting application files. It
refuses to remove active or foreign containers. No unreviewed auto-pruning occurs.

The Docker daemon advertises limits and created-container configuration is
verified before start. Actual enforcement still requires testing on the intended
host. Docker shares the host kernel; stronger hostile-code isolation requires a
VM/microVM or a separately administered execution service. Do not expose a Docker
socket or operator credentials to an untrusted agent.

## Actual application evidence

The neighboring `main` checkout's existing machining-engine suite was executed:
369 tests passed with a 2 GiB Node heap setting and one worker. A focused geometry
and operation-validation subset also passed 86 tests. Git status was unchanged
after each run. Durations are a baseline on this machine, not evidence of a
performance improvement. This does not cover all legacy Angular UI/browser/E2E
flows or the other three checkouts. See the dated JSON report for live Claude
contract/review results and limitations.

## Team deployment is prepared, not activated

`deploy/managed-settings.example.json` is a Linux administrator template, not an
installed policy. It intentionally contains an organization UUID placeholder.
Do not deploy it until the real UUID, immutable runtime/Node paths, and telemetry
endpoint are reviewed and configured. Incorrect organization settings can prevent
login. The example is not appropriate to copy unchanged onto Windows.

The template uses native organization-scoped login, managed hooks/permissions,
bypass-mode restrictions, an explicit MCP allowlist, and HTTPS OTLP telemetry
with prompt/tool-content logging disabled. Configure SSO and assign users in the
real Claude organization; this repository cannot create an enterprise identity
provider or obtain organization credentials. Administrator-owned runtime and
policy files must be read-only to users/agents. Managed-only hooks require the
hooks to be deployed in the managed policy, not just a user installation.

Provision an authenticated TLS collector using operator-managed certificates or
native OTLP headers outside source control. Store audit/usage records in a backend
outside user control with appropriate access, retention and deletion protection.
The local metadata logger is not tamper-resistant. A template alone does not
establish protected auditing or verify telemetry delivery.

Before rollout, verify effective settings/login rejection, actual managed hook
execution, permission denials, and telemetry received by the backend on the exact
deployed Claude version. The inspected client was 2.1.220; current documentation
describes behavior changes in later releases, so do not assume current managed
semantics were verified on it. Monitor API errors/latency, permission denials,
resource failures, timeouts, queue age, job state, and cost in the real backend.
Configure quota/alert thresholds from actual workload measurements.

Official interfaces:
[Docker resources](https://docs.docker.com/engine/containers/resource_constraints/),
[container run](https://docs.docker.com/reference/cli/docker/container/run/),
[Claude managed settings](https://code.claude.com/docs/en/managed-settings), and
[Claude monitoring](https://code.claude.com/docs/en/monitoring-usage).
