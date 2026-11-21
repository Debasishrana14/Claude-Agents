import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, readJSON, writeJSON } from '../lib/core.mjs';
import { Jobs, containerArguments, docker, executionPolicy } from '../lib/jobs.mjs';
import { registerProject, registeredProjects, resolveProject } from '../lib/project.mjs';

const IMAGE = `sha256:${'a'.repeat(64)}`;
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eva operations '));
  const workspace = path.join(root, 'workspace'), home = path.join(root, 'config');
  fs.mkdirSync(workspace); fs.mkdirSync(home);
  const policy = { ...readJSON(path.join(ROOT, 'deploy/execution.example.json')), approvedImages: [IMAGE] };
  writeJSON(path.join(home, 'eva-harness/execution.json'), policy);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, workspace, home, policy };
}
function fakeDriver(policy) {
  const containers = new Map(), calls = [];
  const driver = args => {
    calls.push(args);
    const operation = args[0], name = args.at(-1);
    if (operation === 'context') return JSON.stringify('unix:///var/run/docker.sock');
    if (operation === 'info') return JSON.stringify({ OSType: 'linux', MemoryLimit: true, SwapLimit: true, CpuCfsQuota: true, PidsLimit: true });
    if (operation === 'create') {
      const container = args[args.indexOf('--name') + 1], label = args[args.indexOf('--label') + 1].split('=')[1];
      containers.set(container, {
        Config: { Labels: { 'eva.harness.job': label }, User: '65534:65534' },
        HostConfig: { ReadonlyRootfs: true, NetworkMode: 'none', Memory: policy.memoryMiB * 1024 * 1024, MemorySwap: policy.memoryMiB * 1024 * 1024, NanoCpus: policy.cpus * 1e9, PidsLimit: policy.pids, CapDrop: ['ALL'], SecurityOpt: ['no-new-privileges:true'] },
        Mounts: [{ Destination: '/workspace', RW: false }], State: { Running: false, Status: 'created', ExitCode: 0 }
      }); return 'created-id';
    }
    if (operation === 'ps') {
      const filter = args[args.indexOf('--filter') + 1];
      return [...containers.keys()].some(key => filter === `name=^/${key}$`) ? 'existing-container-id' : '';
    }
    const container = containers.get(name);
    if (!container) throw new Error('Container not found');
    if (operation === 'inspect') return JSON.stringify([container]);
    if (operation === 'start') { container.State.Running = true; container.State.Status = 'running'; return name; }
    if (operation === 'kill') { container.State = { Running: false, Status: 'exited', ExitCode: 137 }; return name; }
    if (operation === 'rm') { containers.delete(name); return name; }
    if (operation === 'logs') return 'bounded workload output';
    throw new Error('Unexpected Docker operation');
  };
  return { driver, containers, calls };
}

test('job snapshots omit secret names, dependencies and symlinks and survive CLI restart', t => {
  const { root, workspace, home, policy } = fixture(t);
  fs.writeFileSync(path.join(workspace, 'input.txt'), 'workload');
  for (const name of ['.env', '.npmrc', 'client.PEM', 'id_ed25519']) {
    fs.writeFileSync(path.join(workspace, name), 'SECRET_PLACEHOLDER');
  }
  fs.mkdirSync(path.join(workspace, 'node_modules')); fs.writeFileSync(path.join(workspace, 'node_modules/dependency.txt'), 'not copied');
  const outside = path.join(root, 'outside'); fs.mkdirSync(outside);
  fs.symlinkSync(outside, path.join(workspace, 'link'), process.platform === 'win32' ? 'junction' : 'dir');
  const fake = fakeDriver(policy), jobs = new Jobs(home, fake.driver);
  const job = jobs.submit(workspace, IMAGE, ['node', '--version']);
  assert.equal(job.workspace, fs.realpathSync(workspace));
  assert.deepEqual(job.input.files.map(x => x.path), ['input.txt']);
  assert.equal(fs.existsSync(path.join(job.inputDirectory, '.env')), false);
  assert.equal(new Jobs(home, fake.driver).get(job.id).status, 'queued');
  assert.equal(fake.calls.length, 0);
});

test('job lifecycle enforces flags, concurrency, cancellation and bounded output artifacts', t => {
  const { workspace, home, policy } = fixture(t);
  fs.writeFileSync(path.join(workspace, 'input.txt'), 'input');
  const fake = fakeDriver(policy), jobs = new Jobs(home, fake.driver);
  const first = jobs.submit(workspace, IMAGE, ['node', '--version']);
  const second = jobs.submit(workspace, IMAGE, ['node', '--version']);
  assert.equal(jobs.start(first.id).status, 'running');
  assert.throws(() => jobs.remove(first.id), /Cancel or reconcile/);
  const args = fake.calls.find(x => x[0] === 'create');
  assert.ok(args.includes('--read-only')); assert.equal(args[args.indexOf('--network') + 1], 'none');
  assert.ok(args.includes('--pids-limit')); assert.ok(args.includes('--memory-swap'));
  assert.ok(args.includes('/usr/bin/timeout')); assert.ok(args.includes('--pull'));
  assert.throws(() => jobs.start(second.id), /Concurrent/);
  assert.equal(jobs.logs(first.id).output.bounded, true);
  assert.equal(jobs.cancel(first.id).status, 'cancelled');
  assert.equal(jobs.start(second.id).status, 'running');
  fake.containers.get(second.container).State = { Running: false, Status: 'exited', ExitCode: 0, OOMKilled: false };
  assert.equal(new Jobs(home, fake.driver).refresh(second.id).status, 'completed');
  assert.equal(jobs.remove(second.id).status, 'removed');
  assert.equal(fs.existsSync(path.dirname(jobs.file(second.id))), false);
  assert.equal(fs.readFileSync(path.join(workspace, 'input.txt'), 'utf8'), 'input');
});

test('unapproved images, changed snapshots and changed policies fail closed', t => {
  const { workspace, home, policy } = fixture(t);
  fs.writeFileSync(path.join(workspace, 'input.txt'), 'input');
  const fake = fakeDriver(policy), jobs = new Jobs(home, fake.driver);
  assert.throws(() => jobs.submit(workspace, 'node:latest', ['node']), /approved/);
  const job = jobs.submit(workspace, IMAGE, ['node', '--version']);
  fs.writeFileSync(path.join(job.inputDirectory, 'injected.txt'), 'unexpected');
  assert.throws(() => jobs.start(job.id), /snapshot changed/);
  assert.equal(fake.calls.some(x => x[0] === 'create'), false);
  writeJSON(path.join(home, 'eva-harness/execution.json'), { ...policy, memoryMiB: 2048 });
  assert.throws(() => jobs.start(job.id), /policy changed/);
});

test('unavailable Docker never executes the workload on the host', t => {
  const { workspace, home } = fixture(t);
  const jobs = new Jobs(home, () => { throw new Error('Docker unavailable; no host fallback'); });
  const job = jobs.submit(workspace, IMAGE, ['node', '-e', "require('fs').writeFileSync('HOST_SIDE_EFFECT','bad')"]);
  assert.throws(() => jobs.start(job.id), /Docker unavailable/);
  assert.equal(fs.existsSync(path.join(workspace, 'HOST_SIDE_EFFECT')), false);
  assert.equal(jobs.get(job.id).status, 'queued');
});

test('resource support, container ownership and queue limits are checked', t => {
  const { workspace, home, policy } = fixture(t);
  const jobs = new Jobs(home, args => args[0] === 'context' ? JSON.stringify('unix:///var/run/docker.sock') : JSON.stringify({ OSType: 'linux', MemoryLimit: false }));
  const job = jobs.submit(workspace, IMAGE, ['node']);
  assert.throws(() => jobs.start(job.id), /limit support/);
  writeJSON(path.join(home, 'eva-harness/execution.json'), { ...policy, maxQueued: 1 });
  assert.throws(() => jobs.submit(workspace, IMAGE, ['node']), /queue limit/);
  assert.equal(jobs.cancel(job.id).status, 'cancelled');
  assert.throws(() => executionPolicy(path.join(home, 'missing')), /Configure/);
});

test('four clone aliases stay explicit and never rewrite a checkout', t => {
  const { root, home } = fixture(t);
  const directories = [];
  for (let i = 0; i < 4; i++) {
    const directory = path.join(root, `clone-${i}`); fs.mkdirSync(directory);
    assert.equal(spawnSync('git', ['init', '--quiet'], { cwd: directory, windowsHide: true }).status, 0);
    directories.push(directory); registerProject(home, `clone-${i}`, directory);
  }
  assert.equal(Object.keys(registeredProjects(home)).length, 4);
  assert.equal(resolveProject(home, 'clone-2'), fs.realpathSync(directories[2]));
  assert.throws(() => registerProject(home, 'clone-0', directories[1]), /different checkout/);
  const cli = spawnSync(process.execPath, [path.join(ROOT, 'tools/harness.mjs'), '--home', home, '--project', 'clone-2', 'project-context'], { encoding: 'utf8', windowsHide: true });
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).workspace, fs.realpathSync(directories[2]));
  const job = new Jobs(home).submit(directories[0], IMAGE, ['node']);
  const wrong = spawnSync(process.execPath, [path.join(ROOT, 'tools/harness.mjs'), '--home', home, '--project', 'clone-2', 'jobs', 'show', job.id], { encoding: 'utf8', windowsHide: true });
  assert.equal(wrong.status, 1);
  assert.match(wrong.stderr, /another checkout/);
});

test('interrupted creation can be reconciled without running or cancelling a foreign container', t => {
  const { workspace, home, policy } = fixture(t);
  const fake = fakeDriver(policy), jobs = new Jobs(home, fake.driver);
  const job = jobs.submit(workspace, IMAGE, ['node']);
  job.status = 'starting'; jobs.save(job);
  assert.equal(jobs.refresh(job.id).status, 'lost');
  const another = jobs.submit(workspace, IMAGE, ['node']);
  another.status = 'starting'; jobs.save(another);
  assert.equal(jobs.cancel(another.id).status, 'cancelled');
  assert.equal(fake.calls.some(x => x[0] === 'start' || x[0] === 'kill'), false);
});

test('container configuration mismatch and changed ownership are rejected', t => {
  const { workspace, home, policy } = fixture(t);
  const fake = fakeDriver(policy);
  const driver = args => {
    const result = fake.driver(args);
    if (args[0] === 'create') for (const container of fake.containers.values()) container.HostConfig.NetworkMode = 'host';
    return result;
  };
  const jobs = new Jobs(home, driver), job = jobs.submit(workspace, IMAGE, ['node']);
  assert.throws(() => jobs.start(job.id), /isolation configuration/);
  assert.equal(fake.calls.some(x => x[0] === 'start'), false);
  fake.containers.get(job.container).Config.Labels['eva.harness.job'] = 'somebody-else';
  assert.throws(() => jobs.cancel(job.id), /ownership label/);
  assert.equal(fake.calls.some(x => x[0] === 'kill'), false);
});

test('actual Docker isolation integration', { skip: !process.env.EVA_DOCKER_TEST_IMAGE }, async t => {
  const { workspace, home, policy } = fixture(t);
  const image = process.env.EVA_DOCKER_TEST_IMAGE;
  writeJSON(path.join(home, 'eva-harness/execution.json'), { ...policy, approvedImages: [image], timeoutSeconds: 10 });
  fs.writeFileSync(path.join(workspace, 'input.txt'), 'readonly-input');
  const jobs = new Jobs(home);
  const code = "const fs=require('fs');for(const p of ['/workspace/violation','/etc/violation']){try{fs.writeFileSync(p,'bad');process.exit(9)}catch{}}console.log('readonly boundaries passed')";
  const job = jobs.submit(workspace, image, ['node', '-e', code]);
  t.after(() => { try { docker(['rm', '-f', job.container]); } catch {} });
  jobs.start(job.id);
  let final;
  for (let i = 0; i < 100; i++) { final = jobs.refresh(job.id); if (final.status !== 'running') break; await new Promise(resolve => setTimeout(resolve, 100)); }
  assert.equal(final.status, 'completed');
  assert.match(jobs.logs(job.id).text, /readonly boundaries passed/);
  assert.equal(fs.existsSync(path.join(workspace, 'violation')), false);
});
