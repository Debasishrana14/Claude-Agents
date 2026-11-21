import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { atomicWrite, canonical, digest, exists, inside, isSensitivePath, lock, now, readJSON, writeJSON } from './core.mjs';

export function docker(args) {
  const result = spawnSync('docker', args, { encoding: 'utf8', shell: false, windowsHide: true, timeout: 15000, maxBuffer: 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`Docker operation failed: ${result.error?.code || result.stderr.trim()}. No host execution fallback is permitted.`);
  return args[0] === 'logs' ? `${result.stdout || ''}${result.stderr || ''}` : result.stdout.trim();
}

export function executionPolicy(home) {
  const file = path.join(home, 'eva-harness', 'execution.json');
  if (!exists(file)) throw new Error('Configure operator-owned eva-harness/execution.json before using isolated jobs');
  const value = readJSON(file);
  if (value.schemaVersion !== 1 || !Array.isArray(value.approvedImages) || value.approvedImages.some(x => !/^sha256:[a-f0-9]{64}$/.test(x))) throw new Error('Execution policy needs approved immutable local image IDs');
  for (const [key, min, max] of [['cpus', 0.1, 64], ['memoryMiB', 64, 131072], ['pids', 16, 4096], ['timeoutSeconds', 1, 86400], ['maxConcurrent', 1, 16], ['maxQueued', 1, 100], ['maxSnapshotMiB', 1, 1024], ['maxFiles', 1, 100000]]) {
    if (typeof value[key] !== 'number' || !Number.isFinite(value[key]) || value[key] < min || value[key] > max || (key !== 'cpus' && !Number.isInteger(value[key]))) throw new Error(`Invalid execution limit: ${key}`);
  }
  return value;
}

function snapshot(workspace, destination, policy) {
  const listing = spawnSync('git', ['-c', 'core.fsmonitor=false', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: workspace, encoding: 'utf8', windowsHide: true, timeout: 10000, maxBuffer: 4 * 1024 * 1024 });
  let names;
  if (listing.status === 0) names = [...new Set(listing.stdout.split('\0').filter(Boolean))].sort();
  else {
    names = [];
    const walk = relative => {
      for (const entry of fs.readdirSync(path.join(workspace, relative), { withFileTypes: true })) {
        if (['.git', 'node_modules', '.scratch', '.claude'].includes(entry.name) || entry.isSymbolicLink()) continue;
        const name = path.join(relative, entry.name);
        if (entry.isDirectory()) walk(name); else names.push(name);
        if (names.length > policy.maxFiles) throw new Error('Snapshot file limit exceeded');
      }
    };
    walk('');
  }
  if (names.length > policy.maxFiles) throw new Error('Snapshot file limit exceeded');
  const files = [], omitted = [];
  let bytes = 0;
  fs.mkdirSync(destination, { recursive: true, mode: 0o755 });
  for (const name of names) {
    const parts = name.replaceAll('\\', '/').split('/');
    const source = path.join(workspace, name);
    if (parts.some(x => ['.git', 'node_modules', '.scratch', '.claude'].includes(x)) || isSensitivePath(name) || !exists(source)) { omitted.push(name); continue; }
    if (!inside(workspace, source) || fs.lstatSync(source).isSymbolicLink() || !fs.statSync(source).isFile()) { omitted.push(name); continue; }
    const size = fs.statSync(source).size;
    if (bytes + size > policy.maxSnapshotMiB * 1024 * 1024) throw new Error('Snapshot byte limit exceeded');
    const content = fs.readFileSync(source); bytes += content.length;
    if (bytes > policy.maxSnapshotMiB * 1024 * 1024) throw new Error('Snapshot byte limit exceeded');
    const target = path.join(destination, name);
    if (!inside(destination, target)) throw new Error('Invalid snapshot path');
    fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o755 });
    fs.writeFileSync(target, content, { mode: 0o644 });
    files.push({ path: name, bytes: content.length, hash: digest(content) });
  }
  return { files, omitted, bytes, hash: digest(JSON.stringify(files)) };
}

export function containerArguments(job, policy) {
  if (/[\r\n,]/.test(job.inputDirectory)) throw new Error('Unsupported mount path');
  return ['create', '--name', job.container, '--label', `eva.harness.job=${job.id}`, '--pull', 'never', '--init',
    '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
    '--user', '65534:65534', '--cpus', String(policy.cpus), '--memory', `${policy.memoryMiB}m`, '--memory-swap', `${policy.memoryMiB}m`,
    '--pids-limit', String(policy.pids), '--log-driver', 'json-file', '--log-opt', 'max-size=1m', '--log-opt', 'max-file=1',
    '--tmpfs', '/tmp:rw,noexec,nosuid,nodev,size=64m', '--tmpfs', '/work:rw,nosuid,nodev,size=256m',
    '--mount', `type=bind,src=${job.inputDirectory},dst=/workspace,readonly`, '--workdir', '/workspace',
    '--entrypoint', '/usr/bin/timeout', job.image, '--signal=TERM', '--kill-after=5s', `${policy.timeoutSeconds}s`, ...job.argv];
}

function capabilities(info) {
  return info.OSType === 'linux' && info.MemoryLimit === true && info.SwapLimit === true && info.CpuCfsQuota === true && info.PidsLimit === true;
}

function localEndpoint(driver) {
  const explicit = process.env.DOCKER_HOST;
  if (explicit && !/^(?:unix|npipe):\/\//.test(explicit)) throw new Error('Remote Docker hosts are not supported by local snapshot jobs');
  const endpoint = JSON.parse(driver(['context', 'inspect', '--format', '{{json .Endpoints.docker.Host}}']));
  if (typeof endpoint !== 'string' || !/^(?:unix|npipe):\/\//.test(endpoint)) throw new Error('Local Unix-socket or Windows named-pipe Docker context required');
  return endpoint;
}

function verifySnapshot(job) {
  const actual = [];
  const walk = relative => {
    for (const entry of fs.readdirSync(path.join(job.inputDirectory, relative), { withFileTypes: true })) {
      const name = path.join(relative, entry.name), file = path.join(job.inputDirectory, name);
      if (entry.isSymbolicLink()) throw new Error('Snapshot contains a symbolic link');
      if (entry.isDirectory()) walk(name);
      else if (entry.isFile()) actual.push({ path: name, hash: digest(fs.readFileSync(file)) });
      else throw new Error('Snapshot contains an unsupported file');
    }
  };
  walk('');
  const expected = job.input.files.map(x => ({ path: path.normalize(x.path), hash: x.hash }));
  const sort = values => values.sort((a, b) => a.path.localeCompare(b.path));
  if (JSON.stringify(sort(actual)) !== JSON.stringify(sort(expected))) throw new Error('Job input snapshot changed after submission');
}

export class Jobs {
  constructor(home, driver = docker) { this.home = home; this.directory = path.join(home, 'eva-harness', 'jobs'); this.driver = driver; }
  file(id) { if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid job ID'); return path.join(this.directory, id, 'job.json'); }
  get(id) {
    const job = readJSON(this.file(id));
    if (job.id !== id || job.container !== `eva-harness-${id}` || path.resolve(job.inputDirectory) !== path.join(path.dirname(this.file(id)), 'input')) throw new Error('Invalid job record ownership');
    return job;
  }
  list() { return exists(this.directory) ? fs.readdirSync(this.directory).filter(x => /^[a-f0-9-]{36}$/.test(x) && exists(this.file(x))).map(x => this.get(x)) : []; }
  save(job) { job.updatedAt = now(); writeJSON(this.file(job.id), job); return job; }
  submit(workspace, image, argv) {
    const policy = executionPolicy(this.home);
    if (!policy.approvedImages.includes(image)) throw new Error('Image is not in the operator-approved immutable image list');
    if (!Array.isArray(argv) || !argv.length || argv.length > 100 || argv.some(x => typeof x !== 'string' || !x || x.length > 8000)) throw new Error('Job requires an executable and argv, not a shell command string');
    return lock(this.directory, () => {
      const current = this.list();
      if (current.length >= 200 || current.filter(x => x.status === 'queued').length >= policy.maxQueued) throw new Error('Job storage or queue limit reached; operator cleanup is required');
      const id = crypto.randomUUID(), directory = path.dirname(this.file(id));
      const inputDirectory = path.join(directory, 'input');
      try {
        const manifest = snapshot(canonical(workspace), inputDirectory, policy);
        return this.save({ schemaVersion: 1, id, status: 'queued', workspace: canonical(workspace), container: `eva-harness-${id}`, image, argv, inputDirectory, input: manifest, limits: policy, createdAt: now() });
      } catch (error) {
        if (exists(directory) && inside(this.directory, directory) && path.basename(directory) === id) fs.rmSync(directory, { recursive: true, force: true });
        throw error;
      }
    });
  }
  inspect(job) {
    const value = JSON.parse(this.driver(['inspect', '--type', 'container', job.container]))[0];
    if (value?.Config?.Labels?.['eva.harness.job'] !== job.id) throw new Error('Container ownership label mismatch');
    return value;
  }
  absent(job) {
    return this.driver(['ps', '-a', '--filter', `name=^/${job.container}$`, '--format', '{{.ID}}']) === '';
  }
  start(id) {
    return lock(this.directory, () => {
      const policy = executionPolicy(this.home), job = this.get(id);
      if (job.status !== 'queued') throw new Error('Only queued jobs can start');
      if (!policy.approvedImages.includes(job.image) || JSON.stringify(job.limits) !== JSON.stringify(policy)) throw new Error('Execution policy changed; submit a new job under the current limits');
      localEndpoint(this.driver);
      const info = JSON.parse(this.driver(['info', '--format', '{{json .}}']));
      if (!capabilities(info)) throw new Error('Linux Docker with memory, swap, CPU quota and PID limit support is required');
      if (this.list().filter(x => ['starting', 'running', 'unknown'].includes(x.status)).length >= policy.maxConcurrent) throw new Error('Concurrent job limit reached; refresh completed job status first');
      verifySnapshot(job);
      job.status = 'starting'; this.save(job);
      try {
        this.driver(containerArguments(job, policy));
        const created = this.inspect(job), host = created.HostConfig;
        if (!host?.ReadonlyRootfs || host.NetworkMode !== 'none' || host.Memory !== policy.memoryMiB * 1024 * 1024 || host.MemorySwap !== host.Memory || host.NanoCpus !== policy.cpus * 1e9 || host.PidsLimit !== policy.pids || created.Config.User !== '65534:65534' || !host.CapDrop?.includes('ALL') || !host.SecurityOpt?.includes('no-new-privileges:true') || !created.Mounts?.some(x => x.Destination === '/workspace' && x.RW === false)) throw new Error('Container isolation configuration did not match the required policy');
        this.driver(['start', job.container]);
        job.status = 'running'; job.startedAt = now(); return this.save(job);
      } catch (error) { job.error = error.message; this.save(job); throw error; }
    });
  }
  refresh(id) {
    return lock(this.directory, () => {
      const job = this.get(id);
      if (!['starting', 'running', 'unknown'].includes(job.status)) return job;
      let container;
      try { container = this.inspect(job); }
      catch (error) {
        if (!this.absent(job)) throw error;
        job.status = 'lost'; job.error = 'Container does not exist; no completion or automatic retry is inferred';
        return this.save(job);
      }
      const state = container.State;
      if (state.Running) job.status = 'running';
      else if (state.Status === 'created') { job.status = 'unknown'; job.error = 'Created but not started; cancel and resubmit rather than executing twice'; }
      else {
        job.status = job.cancelRequested ? 'cancelled' : state.OOMKilled ? 'out-of-memory' : state.ExitCode === 0 ? 'completed' : state.ExitCode === 124 ? 'timed-out' : 'failed';
        job.exitCode = state.ExitCode; job.finishedAt = state.FinishedAt;
      }
      return this.save(job);
    });
  }
  cancel(id) {
    return lock(this.directory, () => {
      const job = this.get(id);
      if (job.status === 'queued') { job.status = 'cancelled'; return this.save(job); }
      if (!['starting', 'running', 'unknown'].includes(job.status)) return job;
      let container;
      try { container = this.inspect(job); }
      catch (error) {
        if (!this.absent(job)) throw error;
        job.status = 'cancelled'; job.cancelRequested = true; job.error = 'Cancelled recorded intent; container was not created';
        return this.save(job);
      }
      job.cancelRequested = true; this.save(job);
      if (container.State.Running) this.driver(['kill', job.container]);
      job.status = 'cancelled'; return this.save(job);
    });
  }
  logs(id) {
    return lock(this.directory, () => {
      const job = this.get(id); this.inspect(job);
      const text = this.driver(['logs', '--tail', '1000', job.container]);
      atomicWrite(path.join(path.dirname(this.file(id)), 'output.log'), text);
      job.output = { file: 'output.log', hash: digest(text), bytes: Buffer.byteLength(text), bounded: true };
      this.save(job);
      return { id, output: job.output, text };
    });
  }
  remove(id) {
    return lock(this.directory, () => {
      const job = this.get(id);
      if (['starting', 'running', 'unknown'].includes(job.status)) throw new Error('Cancel or reconcile active jobs before removal');
      if (job.status !== 'queued') {
        try { this.inspect(job); this.driver(['rm', job.container]); }
        catch (error) { if (!this.absent(job)) throw error; }
      }
      const directory = path.dirname(this.file(id));
      if (!inside(this.directory, directory) || path.basename(directory) !== id || fs.lstatSync(directory).isSymbolicLink()) throw new Error('Invalid job cleanup path');
      fs.rmSync(directory, { recursive: true, force: true });
      return { id, status: 'removed', workspaceModified: false };
    });
  }
}

export function executionStatus(home) {
  let policy = null, policyError = null, engine = null, engineError = null;
  try { policy = executionPolicy(home); } catch (error) { policyError = error.message; }
  try { localEndpoint(docker); engine = JSON.parse(docker(['info', '--format', '{{json .}}'])); } catch (error) { engineError = error.message; }
  return { ready: Boolean(policy?.approvedImages.length && engine && capabilities(engine)), policyConfigured: Boolean(policy), approvedImages: policy?.approvedImages || [], engine: engine ? { type: engine.OSType, version: engine.ServerVersion, resourceLimitsAdvertised: capabilities(engine) } : null, policyError, engineError, hostFallback: false };
}
