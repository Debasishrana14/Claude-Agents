import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT, digest, loadPolicy, readJSON, route, writeJSON } from '../lib/core.mjs';
import { WORKFLOWS, WORKFLOW_ALIASES } from '../lib/workflows.mjs';
import { beginTask, defineTask, getTask, handleHook, prune, status } from '../lib/runtime.mjs';

function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'harness workflows '));
  const home = path.join(base, 'config'), workspace = path.join(base, 'workspace');
  const root = path.join(base, 'policy'), memory = path.join(base, 'memory');
  for (const dir of [home, workspace, root, memory]) fs.mkdirSync(dir);
  fs.copyFileSync(path.join(ROOT, 'harness.config.json'), path.join(root, 'harness.config.json'));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const input = (event, extra = {}) => ({ cwd: workspace, session_id: 'recovery-session', hook_event_name: event, ...extra });
  return { base, home, workspace, root, memory, input };
}

test('canonical commands and former commands route and create canonical task records', t => {
  const { home, workspace } = fixture(t);
  for (const name of [...WORKFLOWS, ...Object.keys(WORKFLOW_ALIASES)]) {
    const expected = WORKFLOW_ALIASES[name] || name;
    assert.equal(route(`/engineering:${name} Follow this request.`).mode, expected);
    assert.equal(beginTask(home, workspace, 'Bounded task', name).mode, expected);
  }
  assert.throws(() => beginTask(home, workspace, 'Invalid workflow', 'toString'), /Invalid task mode/);
});

test('routing distinguishes planning, recovery, verification, and workflow implementation', () => {
  for (const [prompt, mode] of [
    ['Plan the schema migration.', 'plan-task'],
    ['Resume the interrupted implementation.', 'resume-task'],
    ['Verify this patch against its acceptance criteria.', 'verify-change'],
    ['Build a resume-task skill.', 'implement-feature'],
    ['Plan and implement the feature.', 'implement-feature'],
    ['Explain how to resume interrupted work.', 'conversation'],
    ['Do not resume the saved task.', 'conversation']
  ]) assert.equal(route(prompt).mode, mode, prompt);
});

test('external storage is opt-in and cannot bypass sensitive paths or directory boundaries', t => {
  const { home, workspace, root, memory, input } = fixture(t);
  const write = file_path => handleHook(root, home, input('PreToolUse', { tool_name: 'Write', tool_input: { file_path } }));
  assert.equal(write(path.join(memory, 'plan.md')).hookSpecificOutput.permissionDecision, 'deny');
  const policy = loadPolicy(root);
  policy.storage.writeRoots.memory = [memory, home];
  writeJSON(path.join(root, 'harness.config.json'), policy);
  assert.deepEqual(write(path.join(memory, 'plan.md')), {});
  assert.deepEqual(write(path.join(workspace, 'src', 'new.js')), {});
  for (const file of [path.join(memory, '.env'), path.join(memory, 'private.key'), path.join(memory, '.git', 'config'), path.join(home, 'eva-harness', 'state', 'tamper.json'), `${memory}-other/plan.md`]) {
    assert.equal(write(file).hookSpecificOutput.permissionDecision, 'deny', file);
  }
  const outside = path.join(workspace, 'outside-memory');
  fs.mkdirSync(outside);
  fs.symlinkSync(outside, path.join(memory, 'escaped'), process.platform === 'win32' ? 'junction' : 'dir');
  // The escape is still allowed when it resolves into the workspace.
  assert.deepEqual(write(path.join(memory, 'escaped', 'plan.md')), {});
  const denied = path.join(path.dirname(memory), 'unapproved'); fs.mkdirSync(denied);
  fs.symlinkSync(denied, path.join(memory, 'denied'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal(write(path.join(memory, 'denied', 'plan.md')).hookSpecificOutput.permissionDecision, 'deny');
});

test('storage configuration rejects relative paths, filesystem roots, and unknown domains', t => {
  const { root } = fixture(t);
  const policy = loadPolicy(root), file = path.join(root, 'harness.config.json');
  for (const writeRoots of [{ memory: ['../memory'] }, { memory: [path.parse(ROOT).root] }, { unrestricted: [ROOT] }, { memory: 'not-an-array' }]) {
    writeJSON(file, { ...policy, storage: { writeRoots } });
    assert.throws(() => loadPolicy(root), /storage|Storage/);
  }
});

test('recovery hooks preserve validation revisions and isolate tasks by session and workspace', t => {
  const { home, workspace, root, base, input } = fixture(t);
  const session = digest('recovery-session').slice(0, 32);
  const task = beginTask(home, workspace, 'Recover me', 'implement-feature', session);
  defineTask(home, task.id, ['Expected behavior'], []);
  beginTask(home, workspace, 'Other session', 'implement-feature', digest('other').slice(0, 32));
  const otherWorkspace = path.join(base, 'other'); fs.mkdirSync(otherWorkspace);
  beginTask(home, otherWorkspace, 'Other checkout', 'implement-feature', session);
  const before = getTask(home, task.id);
  for (const event of ['PreCompact', 'SessionEnd']) {
    assert.deepEqual(handleHook(root, home, input(event, { transcript_path: 'SECRET_TRANSCRIPT', reason: 'SECRET_REASON' })), {});
    const receipt = readJSON(path.join(home, 'eva-harness', 'state', 'sessions', session, 'recovery.json'));
    assert.equal(receipt.event, event);
    assert.deepEqual(receipt.tasks, [{ id: task.id, revision: before.revision, status: 'running' }]);
    assert.doesNotMatch(JSON.stringify(receipt), /SECRET|Recover me/);
    assert.deepEqual(getTask(home, task.id), before);
  }
});

test('recovery receipts expire without removing durable task notes', t => {
  const { home, workspace, root, input } = fixture(t);
  const session = digest('recovery-session').slice(0, 32);
  const task = beginTask(home, workspace, 'Durable objective', 'implement-feature', session);
  handleHook(root, home, input('PreCompact'));
  const receipt = path.join(home, 'eva-harness', 'state', 'sessions', session, 'recovery.json');
  fs.utimesSync(receipt, new Date(0), new Date(0));
  prune(home, loadPolicy(root));
  assert.equal(fs.existsSync(receipt), false);
  assert.equal(getTask(home, task.id).title, 'Durable objective');
});

test('execution receipts distinguish failure without retaining tool output', t => {
  const { home, workspace, root, input } = fixture(t);
  handleHook(root, home, input('PostToolUseFailure', { tool_name: 'Bash', tool_input: { command: 'SECRET_COMMAND' }, error: 'SECRET_ERROR' }));
  const receipt = status(home, workspace).recentEvents[0];
  assert.equal(receipt.handler, 'record-execution');
  assert.equal(receipt.outcome, 'failed');
  assert.doesNotMatch(JSON.stringify(receipt), /SECRET/);
});
