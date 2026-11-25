import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, assets, digest, loadPolicy, readJSON, route, writeJSON } from '../lib/core.mjs';
import { projectContext, projectContract } from '../lib/project.mjs';
import { install, rollback } from '../lib/install.mjs';
import { beginTask, checkpoint, completeTask, defineTask, fingerprint, getTask, handleHook, runCheck } from '../lib/runtime.mjs';

const policy = loadPolicy(ROOT);
const session = digest('engineering-session').slice(0, 32);
function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'eva engineering '));
  const workspace = path.join(base, 'project'), home = path.join(base, 'config');
  fs.mkdirSync(workspace); fs.mkdirSync(home);
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  return { base, workspace, home };
}
const hookInput = (cwd, hook_event_name, extra = {}) => ({ cwd, session_id: 'engineering-session', hook_event_name, ...extra });

test('required checks need bound commands, including legacy saved contracts', t => {
  const { workspace, home } = fixture(t);
  const task = beginTask(home, workspace, 'Bound validation');
  assert.throws(() => defineTask(home, task.id, ['Behavior'], ['unit']), /bound command/);
  const file = path.join(home, 'eva-harness', 'state', 'tasks', `${task.id}.json`);
  writeJSON(file, { ...task, contract: { criteria: ['Behavior'], requiredChecks: ['unit'] } });
  assert.throws(() => runCheck(home, task.id, [process.execPath, '-e', '0'], policy, 'unit'), /no bound command/);
  assert.throws(() => completeTask(home, task.id, 'Done', undefined, 'Reviewed'), /Missing required/);
});

test('checkpoint cannot erase failures; same command on repaired source resolves them', t => {
  const { workspace, home } = fixture(t);
  const source = path.join(workspace, 'valid.txt');
  fs.writeFileSync(source, 'false');
  const task = beginTask(home, workspace, 'Regression lifecycle');
  const argv = [process.execPath, '-e', "process.exit(require('fs').readFileSync('valid.txt','utf8') === 'true' ? 0 : 1)"];
  runCheck(home, task.id, argv, policy, 'regression');
  checkpoint(home, task.id, 'Only bookkeeping changed');
  runCheck(home, task.id, [process.execPath, '-e', '0'], policy, 'unit');
  assert.throws(() => completeTask(home, task.id, 'Done'), /unresolved failed/);
  runCheck(home, task.id, [process.execPath, '-e', '0'], policy, 'regression');
  assert.throws(() => completeTask(home, task.id, 'Done'), /unresolved failed/);
  fs.writeFileSync(source, 'true');
  checkpoint(home, task.id, 'Repaired cause');
  runCheck(home, task.id, argv, policy, 'regression');
  assert.equal(completeTask(home, task.id, 'Repaired').outcome.validation, 'passed');
});

test('declared ignored input changes and deletion invalidate check evidence', t => {
  const { workspace, home } = fixture(t);
  assert.equal(spawnSync('git', ['init'], { cwd: workspace, windowsHide: true }).status, 0);
  fs.writeFileSync(path.join(workspace, '.gitignore'), 'runtime.json\n');
  const input = path.join(workspace, 'runtime.json');
  fs.writeFileSync(input, 'first');
  writeJSON(path.join(workspace, '.harness.json'), { schemaVersion: 1, criteria: [], checks: [], inputs: ['runtime.json'] });
  const before = fingerprint(workspace);
  const task = beginTask(home, workspace, 'Configured inputs');
  runCheck(home, task.id, [process.execPath, '-e', '0'], policy);
  fs.writeFileSync(input, 'second');
  assert.notEqual(fingerprint(workspace), before);
  assert.throws(() => completeTask(home, task.id, 'Done'), /Run a check/);
  const changed = fingerprint(workspace);
  fs.unlinkSync(input);
  assert.notEqual(fingerprint(workspace), changed);
  runCheck(home, task.id, [process.execPath, '-e', '0'], policy);
  const outcome = completeTask(home, task.id, 'Done').outcome;
  assert.deepEqual(outcome.evidence.inputs, ['runtime.json']);
  assert.match(outcome.evidence.adequacy, /does not establish/);
  for (const invalid of ['../outside', '/absolute', 'a/../b', '.']) {
    writeJSON(path.join(workspace, '.harness.json'), { schemaVersion: 1, criteria: [], checks: [], inputs: [invalid] });
    assert.throws(() => fingerprint(workspace), /relative file paths/);
  }
});

test('plugin startup keeps a bounded core instead of loading the full workflow', t => {
  const { workspace, home } = fixture(t);
  const context = handleHook(ROOT, home, hookInput(workspace, 'SessionStart'), { plugin: true }).hookSpecificOutput.additionalContext;
  assert.ok(Buffer.byteLength(context) < 2200, `Startup context was ${Buffer.byteLength(context)} bytes`);
  assert.match(context, /Only the main session delegates/);
  assert.match(context, /each require explicit user authorization/);
  assert.doesNotMatch(context, /## Authorization and delegation/);
});

test('project discovery is read-only and exposes explicit validation commands', t => {
  const { workspace } = fixture(t);
  writeJSON(path.join(workspace, 'package.json'), { scripts: { test: 'node forbidden-side-effect.mjs' } });
  fs.writeFileSync(path.join(workspace, 'README.md'), 'Read this guidance');
  writeJSON(path.join(workspace, '.eva-harness.json'), { schemaVersion: 1, criteria: ['Repeated regeneration preserves identity'], checks: [{ label: 'unit', argv: ['node', '--test', 'unit.test.mjs'] }] });
  const before = fs.readdirSync(workspace);
  const context = projectContext(workspace);
  assert.ok(context.documentsToInspect.includes('README.md'));
  assert.deepEqual(context.package.scripts, { test: 'node forbidden-side-effect.mjs' });
  assert.equal(context.contract.checks[0].label, 'unit');
  assert.deepEqual(fs.readdirSync(workspace), before);
});

test('project contracts reject malformed and duplicate check definitions', t => {
  const { workspace } = fixture(t);
  const file = path.join(workspace, '.eva-harness.json');
  writeJSON(file, { schemaVersion: 1, criteria: ['Expected behavior'], checks: [{ label: 'unit', argv: ['node'] }, { label: 'unit', argv: ['node'] }] });
  assert.throws(() => projectContract(workspace), /unique/);
  writeJSON(file, { schemaVersion: 1, criteria: ['Expected behavior'], checks: [{ label: 'unit', argv: 'node test.js' }] });
  assert.throws(() => projectContract(workspace), /argv/);
});

test('contracted completion requires each current named check and acceptance review', t => {
  const { workspace, home } = fixture(t);
  fs.writeFileSync(path.join(workspace, 'app.mjs'), 'export const valid = true;');
  const task = beginTask(home, workspace, 'Implement a contract');
  defineTask(home, task.id, ['Expected result'], ['unit', 'typecheck'], Object.fromEntries(['unit', 'typecheck'].map(label => [label, [process.execPath, '-e', 'process.exit(0)']])));
  runCheck(home, task.id, [process.execPath, '-e', 'process.exit(0)'], policy, 'unit');
  assert.throws(() => completeTask(home, task.id, 'done', 'skip missing check', 'reviewed'), /Missing required checks.*typecheck/);
  runCheck(home, task.id, [process.execPath, '-e', 'process.exit(0)'], policy, 'typecheck');
  assert.throws(() => completeTask(home, task.id, 'done'), /acceptance-note/);
  const result = completeTask(home, task.id, 'done', undefined, 'Reviewed the contract and actual behavior');
  assert.equal(result.outcome.validation, 'passed');
  assert.match(result.outcome.acceptanceReview, /Reviewed/);
});

test('contracted checks become stale after edits or a changed contract', t => {
  const { workspace, home } = fixture(t);
  const file = path.join(workspace, 'source.txt'); fs.writeFileSync(file, 'first');
  const task = beginTask(home, workspace, 'Source changes');
  defineTask(home, task.id, ['Outcome'], ['unit'], Object.fromEntries(['unit'].map(label => [label, [process.execPath, '-e', 'process.exit(0)']])));
  runCheck(home, task.id, [process.execPath, '-e', 'process.exit(0)'], policy, 'unit');
  fs.writeFileSync(file, 'second');
  assert.throws(() => completeTask(home, task.id, 'done', undefined, 'reviewed'), /Missing required/);
  checkpoint(home, task.id, 'Updated implementation');
  runCheck(home, task.id, [process.execPath, '-e', 'process.exit(0)'], policy, 'unit');
  defineTask(home, task.id, ['New acceptance outcome'], ['unit'], Object.fromEntries(['unit'].map(label => [label, [process.execPath, '-e', 'process.exit(0)']])));
  assert.throws(() => completeTask(home, task.id, 'done', undefined, 'reviewed'), /Missing required/);
});

test('configured check labels cannot be satisfied with a different command', t => {
  const { workspace, home } = fixture(t);
  const task = beginTask(home, workspace, 'Configured validation');
  const argv = [process.execPath, '-e', 'process.exit(0)'];
  defineTask(home, task.id, ['Outcome'], ['unit'], { unit: argv });
  assert.throws(() => runCheck(home, task.id, [process.execPath, '--version'], policy, 'unit'), /does not match/);
  assert.equal(getTask(home, task.id).checks.length, 0);
  assert.equal(runCheck(home, task.id, argv, policy, 'unit').check.passed, true);
});

test('CLI imports project contract and runs its check with actual evidence', t => {
  const { workspace, home } = fixture(t);
  const argv = [process.execPath, '-e', 'process.exit(0)'];
  writeJSON(path.join(workspace, '.eva-harness.json'), { schemaVersion: 1, criteria: ['Expected result'], checks: [{ label: 'unit', argv }] });
  const task = beginTask(home, workspace, 'CLI contract');
  const cli = (...args) => spawnSync(process.execPath, [path.join(ROOT, 'tools/harness.mjs'), '--home', home, ...args], { encoding: 'utf8', windowsHide: true });
  const defined = cli('task', 'define', task.id, '--from-project', '--criteria', 'Task-specific result');
  assert.equal(defined.status, 0, defined.stderr);
  assert.equal(JSON.parse(defined.stdout).contract.criteria.length, 2);
  const checked = cli('task', 'check', task.id, '--label', 'unit', '--', ...argv);
  assert.equal(checked.status, 0, checked.stderr);
  const completed = cli('task', 'complete', task.id, '--summary', 'Done', '--acceptance-note', 'Reviewed both criteria');
  assert.equal(completed.status, 0, completed.stderr);
  assert.equal(JSON.parse(completed.stdout).status, 'completed');
});

test('CLI binds explicit task commands and rejects substitution', t => {
  const { workspace, home } = fixture(t);
  const task = beginTask(home, workspace, 'Task-specific validation');
  const argv = [process.execPath, '--version'];
  const cli = (...args) => spawnSync(process.execPath, [path.join(ROOT, 'tools/harness.mjs'), '--home', home, ...args], { encoding: 'utf8', windowsHide: true });
  const defined = cli('task', 'define', task.id, '--criteria', 'Runtime is available', '--required-checks', 'runtime', '--check-commands', JSON.stringify({ runtime: argv }));
  assert.equal(defined.status, 0, defined.stderr);
  assert.deepEqual(JSON.parse(defined.stdout).contract.checkCommands.runtime, argv);
  assert.equal(cli('task', 'check', task.id, '--label', 'runtime', '--', process.execPath, '-e', '0').status, 1);
  assert.equal(cli('task', 'check', task.id, '--label', 'runtime', '--', ...argv).status, 0);
});

test('read-only delegation permits only reader roles, writers still ask', t => {
  const { workspace, home } = fixture(t);
  install(ROOT, home, { delegation: 'read-only' });
  for (const subagent_type of ['research', 'debugger', 'reviewer']) {
    assert.deepEqual(handleHook(ROOT, home, hookInput(workspace, 'PreToolUse', { tool_name: 'Agent', tool_input: { subagent_type } })), {});
  }
  for (const subagent_type of ['developer', 'general-purpose', 'unknown']) {
    const result = handleHook(ROOT, home, hookInput(workspace, 'PreToolUse', { tool_name: 'Agent', tool_input: { subagent_type } }));
    assert.equal(result.hookSpecificOutput.permissionDecision, 'ask');
  }
});

test('profile switch removes only harness-added broad asks and rollback restores them', t => {
  const { home } = fixture(t);
  install(ROOT, home, { delegation: 'manual' });
  assert.ok(readJSON(path.join(home, 'settings.json')).permissions.ask.includes('Agent'));
  install(ROOT, home, { delegation: 'read-only' });
  const readonly = readJSON(path.join(home, 'settings.json'));
  assert.equal(readonly.permissions.ask.includes('Agent'), false);
  assert.ok(readonly.permissions.allow.includes('Agent(reviewer)'));
  rollback(home);
  assert.ok(readJSON(path.join(home, 'settings.json')).permissions.ask.includes('Agent'));
  assert.equal(readJSON(path.join(home, 'eva-harness/installation.json')).delegation, 'manual');
});

test('preexisting user agent restrictions survive the read-only profile', t => {
  const { home } = fixture(t);
  writeJSON(path.join(home, 'settings.json'), { permissions: { ask: ['Agent'] } });
  install(ROOT, home, { delegation: 'manual' });
  install(ROOT, home, { delegation: 'read-only' });
  assert.ok(readJSON(path.join(home, 'settings.json')).permissions.ask.includes('Agent'));
});

test('manual delegation and session-bound completion reminders remain controlled', t => {
  const { workspace, home } = fixture(t);
  install(ROOT, home, { delegation: 'manual' });
  const ask = handleHook(ROOT, home, hookInput(workspace, 'PreToolUse', { tool_name: 'Agent', tool_input: { subagent_type: 'research' } }));
  assert.equal(ask.hookSpecificOutput.permissionDecision, 'ask');
  const task = beginTask(home, workspace, 'A substantial change', 'dev-mode', session);
  defineTask(home, task.id, ['Expected behavior'], ['unit'], Object.fromEntries(['unit'].map(label => [label, [process.execPath, '-e', 'process.exit(0)']])));
  assert.equal(handleHook(ROOT, home, hookInput(workspace, 'Stop')).decision, 'block');
  assert.deepEqual(handleHook(ROOT, home, hookInput(workspace, 'Stop', { stop_hook_active: true })), {});
  assert.deepEqual(handleHook(ROOT, home, { ...hookInput(workspace, 'Stop'), session_id: 'unrelated-session' }), {});
  checkpoint(home, task.id, 'Waiting on a dependency', 'blocked', session);
  assert.deepEqual(handleHook(ROOT, home, hookInput(workspace, 'Stop')), {});
});

test('review routing distinguishes review-only requests from implementation', () => {
  assert.equal(route('Review this staged code diff for correctness.').mode, 'review-change');
  assert.equal(route('/review-change Check acceptance coverage.').mode, 'review-change');
  assert.equal(route('Review and fix this implementation.').mode, 'dev-mode');
});

test('explicit model selection is preserved by reinstall and reversed by rollback', t => {
  const { home } = fixture(t);
  install(ROOT, home);
  install(ROOT, home, { model: 'opus' });
  assert.equal(readJSON(path.join(home, 'settings.json')).model, 'opus');
  assert.equal(install(ROOT, home).status, 'already-installed');
  rollback(home);
  assert.equal(readJSON(path.join(home, 'settings.json')).model, 'sonnet');
  assert.throws(() => install(ROOT, home, { model: 'unrecognized' }), /Model must/);
});

test('upgrades preserve a user-selected provider model and rollback preserves that choice', t => {
  const { home, base } = fixture(t);
  const source = path.join(base, 'source');
  fs.cpSync(ROOT, source, { recursive: true, filter: file => {
    const relative = path.relative(ROOT, file).replaceAll('\\', '/');
    return !['.git', '.local', '.scratch', 'business', 'node_modules'].includes(relative.split('/')[0]) && !relative.startsWith('.claude/skills/synced');
  } });
  install(source, home);
  const file = path.join(home, 'settings.json');
  const settings = readJSON(file);
  settings.model = 'provider-custom-model';
  writeJSON(file, settings);
  fs.appendFileSync(path.join(source, 'CLAUDE.md'), '\nUpdated guidance.\n');
  const upgraded = install(source, home);
  assert.equal(upgraded.model, settings.model);
  assert.equal(readJSON(file).model, settings.model);
  assert.equal(install(source, home).status, 'already-installed');
  rollback(home);
  assert.equal(readJSON(file).model, settings.model);
});

test('first installation preserves a full model ID unless an alias is explicitly requested', t => {
  const { home } = fixture(t);
  const file = path.join(home, 'settings.json');
  writeJSON(file, { model: 'provider-custom-model' });
  assert.equal(install(ROOT, home).model, 'provider-custom-model');
  assert.equal(install(ROOT, home, { model: 'haiku' }).model, 'haiku');
  rollback(home);
  assert.equal(readJSON(file).model, 'provider-custom-model');
});

test('definition validation rejects body-spoofed names and fixed worker models', t => {
  const { base } = fixture(t);
  const source = path.join(base, 'source');
  for (const file of assets(ROOT)) {
    const target = path.join(source, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(ROOT, file), target);
  }
  const validate = () => spawnSync(process.execPath, [path.join(source, 'tools/harness.mjs'), 'validate'], { encoding: 'utf8', windowsHide: true });
  assert.equal(validate().status, 0);
  const file = path.join(source, 'agents/research.md');
  const original = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, original.replace('name: research', 'name: wrong-role') + '\nname: research\n');
  assert.notEqual(validate().status, 0);
  fs.writeFileSync(file, original.replace('model: inherit', 'model: haiku'));
  assert.notEqual(validate().status, 0);
  fs.writeFileSync(file, original);
  assert.equal(validate().status, 0);
});

test('settings drift is preserved conservatively when changing delegation', t => {
  const { home } = fixture(t);
  install(ROOT, home, { delegation: 'manual' });
  const file = path.join(home, 'settings.json');
  const settings = readJSON(file); settings.customSetting = 'user edit'; writeJSON(file, settings);
  install(ROOT, home, { delegation: 'read-only' });
  const changed = readJSON(file);
  assert.equal(changed.customSetting, 'user edit');
  assert.ok(changed.permissions.ask.includes('Agent'));
});

test('manual check labels do not resolve inherited object properties as commands', t => {
  const { workspace, home } = fixture(t);
  const task = beginTask(home, workspace, 'A valid named check');
  defineTask(home, task.id, ['Expected outcome'], ['constructor'], Object.fromEntries(['constructor'].map(label => [label, [process.execPath, '-e', 'process.exit(0)']])));
  const result = runCheck(home, task.id, [process.execPath, '-e', 'process.exit(0)'], policy, 'constructor');
  assert.equal(result.check.passed, true);
});

test('automatic delegation removes launch approvals without changing other permissions', t => {
  const { workspace, home } = fixture(t);
  const file = path.join(home, 'settings.json');
  writeJSON(file, { permissions: { ask: ['Agent', 'Task', 'Agent(developer)', 'Bash(custom *)'], deny: ['Read(private.txt)'], allow: ['Read'] }, customValue: 9 });
  install(ROOT, home, { delegation: 'manual' });
  const edited = readJSON(file); edited.customValue = 10; writeJSON(file, edited);
  install(ROOT, home, { delegation: 'automatic' });
  const settings = readJSON(file);
  assert.equal(settings.customValue, 10);
  assert.equal(settings.permissions.ask.some(x => /^(Agent|Task)(\(|$)/.test(x)), false);
  assert.ok(settings.permissions.ask.includes('Bash(custom *)'));
  assert.ok(settings.permissions.ask.includes('Bash(git push *)'));
  assert.ok(settings.permissions.ask.includes('Bash(git add *)'));
  assert.ok(settings.permissions.ask.includes('Bash(git commit *)'));
  assert.ok(settings.permissions.deny.includes('Read(private.txt)'));
  assert.ok(settings.permissions.allow.includes('Agent'));
  assert.ok(settings.permissions.allow.includes('Task'));
  for (const subagent_type of ['research', 'developer', 'feature-test-writer', 'general-purpose']) {
    assert.deepEqual(handleHook(ROOT, home, hookInput(workspace, 'PreToolUse', { tool_name: 'Agent', tool_input: { subagent_type } })), {});
  }
  assert.match(handleHook(ROOT, home, hookInput(workspace, 'SessionStart')).hookSpecificOutput.additionalContext, /without per-agent approval/);
  assert.equal(install(ROOT, home).status, 'already-installed');
  rollback(home);
  assert.ok(readJSON(file).permissions.ask.includes('Agent'));
});

test('new installations default to automatic delegation', t => {
  const { home } = fixture(t);
  const installed = install(ROOT, home);
  assert.equal(installed.delegation, 'automatic');
  assert.equal(readJSON(path.join(home, 'settings.json')).permissions.ask.includes('Agent'), false);
});
