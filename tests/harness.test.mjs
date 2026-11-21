import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { ROOT, loadPolicy, readJSON, route, writeJSON } from '../lib/core.mjs';
import { doctor, install, rollback } from '../lib/install.mjs';
import { beginTask, checkpoint, completeTask, handleHook, prune, runCheck, status } from '../lib/runtime.mjs';

function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'eva harness test '));
  const home = path.join(base, 'claude config');
  const workspace = path.join(base, 'workspace');
  fs.mkdirSync(home); fs.mkdirSync(workspace);
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  return { base, home, workspace };
}
const policy = loadPolicy(ROOT);
const input = (workspace, event, extra = {}) => ({ session_id: 'test-session', cwd: workspace, hook_event_name: event, ...extra });

test('routing respects explicit modes and distinguishes diagnosis from repair', () => {
  for (const [prompt, expected] of [
    ['/debug-mode fix this', 'debug-mode'],
    ['Investigate the root cause', 'debug-mode'],
    ['Investigate and fix the crash', 'dev-mode'],
    ['Clean up unused configuration', 'dev-mode'],
    ['Explore the feasibility and tradeoffs', 'research-dev-mode'],
    ['Quickly implement the narrow change', 'target-mode'],
    ['What is this harness?', 'conversation'],
    ['This is a read-only activation check. Without reading files or executing commands, state the harness name.', 'conversation'],
    ['Just explain how to fix this; do not change files.', 'conversation'],
    ['Compare approaches and implement the selected fix.', 'dev-mode'],
    ['Diagnose only. Do not fix or modify the implementation.', 'debug-mode'],
    ['Could you tell me which workflows are available?', 'conversation'],
    ['Investigate and repair this issue quickly.', 'target-mode'],
    ['Continue the saved section-regeneration pilot task for this workspace.', 'dev-mode'],
    ['/manual-qa Prepare cases for the change', 'manual-qa'],
    ['Write manual QA test cases for ticket EVA-123.', 'manual-qa'],
    ['Prepare test cases for the ticket update.', 'manual-qa'],
    ['Draft a commit message from staged changes using an atomic commit strategy.', 'commit-message'],
    ['/commit-message Use the repository convention', 'commit-message'],
    ['Explain what a commit message is.', 'conversation'],
    ['What is manual QA?', 'conversation'],
    ['Do not write a commit message.', 'conversation'],
    ['Create a manual QA skill for this harness.', 'dev-mode'],
    ['Implement a commit message writer feature.', 'dev-mode'],
    ['/legacy-naming Review these identifiers', 'legacy-naming'],
    ['Suggest variable names based on our naming conventions.', 'legacy-naming'],
    ['Study legacy naming standards and recommend function names.', 'legacy-naming'],
    ['Review these method names without modifying files.', 'legacy-naming'],
    ['Create a legacy naming skill for the harness.', 'dev-mode'],
    ['Explain naming conventions.', 'conversation'],
    ['Do not suggest function names.', 'conversation'],
    ['Apply these variable name changes.', 'dev-mode'],
    ['Suggest and apply better function names.', 'dev-mode'],
    ['/coordinate-work build the integration', 'coordinate-work']
  ]) assert.equal(route(prompt).mode, expected, prompt);
});

test('install preserves settings and instructions, is idempotent, and rolls back', t => {
  const { home } = fixture(t);
  const original = { model: 'opus', permissions: { allow: ['Read'], deny: ['Read(secret)'] }, hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'echo personal' }] }] }, customValue: 42 };
  const bytes = JSON.stringify(original);
  fs.writeFileSync(path.join(home, 'settings.json'), bytes);
  fs.writeFileSync(path.join(home, 'CLAUDE.md'), '# Personal guidance\n');
  const installed = install(ROOT, home);
  assert.equal(installed.status, 'installed');
  const settings = readJSON(path.join(home, 'settings.json'));
  assert.equal(settings.customValue, 42);
  assert.equal(settings.model, 'sonnet');
  assert.deepEqual(settings.permissions.allow, ['Read', 'Agent', 'Task']);
  assert.ok(settings.permissions.deny.includes('Read(secret)'));
  assert.equal(settings.hooks.SessionStart.length, 2);
  assert.ok(fs.readFileSync(path.join(home, 'CLAUDE.md'), 'utf8').includes('eva\\ harness\\ test'));
  assert.equal(install(ROOT, home).status, 'already-installed');
  assert.equal(doctor(ROOT, home).filter(x => x.level === 'fail').length, 0);
  rollback(home);
  assert.equal(fs.readFileSync(path.join(home, 'settings.json'), 'utf8'), bytes);
  assert.equal(fs.readFileSync(path.join(home, 'CLAUDE.md'), 'utf8'), '# Personal guidance\n');
  assert.equal(fs.existsSync(path.join(home, 'skills')), false);
});

test('unmanaged name collision aborts transaction and preserves unrelated assets', t => {
  const { home } = fixture(t);
  fs.mkdirSync(path.join(home, 'agents'));
  const existing = path.join(home, 'agents', 'developer.md');
  fs.writeFileSync(existing, 'my custom developer');
  assert.throws(() => install(ROOT, home), /unmanaged content/);
  assert.equal(fs.readFileSync(existing, 'utf8'), 'my custom developer');
  assert.equal(fs.existsSync(path.join(home, 'settings.json')), false);
});

test('rollback refuses to overwrite edits made after installation', t => {
  const { home } = fixture(t);
  install(ROOT, home);
  const file = path.join(home, 'settings.json');
  const settings = readJSON(file); settings.model = 'haiku'; writeJSON(file, settings);
  assert.throws(() => rollback(home), /overwrite changes/);
  assert.equal(readJSON(file).model, 'haiku');
});

test('doctor detects release tampering', t => {
  const { home } = fixture(t);
  const installed = install(ROOT, home);
  fs.appendFileSync(path.join(installed.release, 'CLAUDE.md'), '\nmodified');
  assert.ok(doctor(ROOT, home).some(x => x.check === 'release integrity' && x.level === 'fail'));
});

test('legacy directory junctions migrate without losing extra skills and can be restored', t => {
  const { home, base } = fixture(t);
  const source = path.join(base, 'source');
  fs.cpSync(ROOT, source, { recursive: true, filter: file => {
    const relative = path.relative(ROOT, file).replaceAll('\\', '/');
    return !relative.startsWith('.git') && !relative.startsWith('.claude/skills/synced');
  } });
  const extra = path.join(source, '.claude/skills/personal');
  fs.mkdirSync(extra); fs.writeFileSync(path.join(extra, 'note.txt'), 'keep me');
  // Extra skill is outside maintained release assets for this fixture.
  fs.renameSync(extra, path.join(source, '.claude/skills/synced'));
  for (const group of ['agents', 'skills', 'rules', 'departments']) fs.symlinkSync(path.join(source, '.claude', group), path.join(home, group), process.platform === 'win32' ? 'junction' : 'dir');
  fs.writeFileSync(path.join(home, 'CLAUDE.md'), `# Legacy\n@${path.join(source, 'CLAUDE.md')}\n`);
  install(source, home);
  assert.equal(fs.lstatSync(path.join(home, 'skills')).isSymbolicLink(), false);
  assert.equal(fs.readFileSync(path.join(home, 'skills/synced/note.txt'), 'utf8'), 'keep me');
  assert.ok(!fs.readFileSync(path.join(home, 'CLAUDE.md'), 'utf8').includes(`@${path.join(source, 'CLAUDE.md')}\n`));
  rollback(home);
  assert.equal(fs.lstatSync(path.join(home, 'skills')).isSymbolicLink(), true);
  assert.equal(fs.realpathSync(path.join(home, 'skills')), fs.realpathSync(path.join(source, '.claude/skills')));
});

test('hook receipts prove execution without retaining sensitive input', t => {
  const { home, workspace } = fixture(t);
  const start = handleHook(ROOT, home, input(workspace, 'SessionStart'));
  assert.match(start.hookSpecificOutput.additionalContext, /hook is active/);
  handleHook(ROOT, home, input(workspace, 'UserPromptSubmit', { prompt: 'Fix this SECRET_PROMPT_TEXT' }));
  handleHook(ROOT, home, input(workspace, 'PostToolUse', { tool_name: 'Bash', tool_input: { command: 'SECRET_COMMAND' }, tool_response: 'SECRET_RESULT' }));
  const receipt = status(home, workspace);
  assert.equal(receipt.recentEvents.length, 3);
  const files = fs.readdirSync(path.join(home, 'eva-harness/state/sessions')).filter(x => x.endsWith('.jsonl'));
  const text = fs.readFileSync(path.join(home, 'eva-harness/state/sessions', files[0]), 'utf8');
  assert.doesNotMatch(text, /SECRET_|test-session/);
});

test('direct-file policy denies traversal, symlink escapes, secrets and git writes', t => {
  const { home, workspace, base } = fixture(t);
  fs.mkdirSync(path.join(base, 'outside'));
  fs.symlinkSync(path.join(base, 'outside'), path.join(workspace, 'link'), process.platform === 'win32' ? 'junction' : 'dir');
  for (const file_path of ['../outside/file.txt', 'link/file.txt', '.env', '.env.production', '.git/config']) {
    const output = handleHook(ROOT, home, input(workspace, 'PreToolUse', { tool_name: 'Write', tool_input: { file_path } }));
    assert.equal(output.hookSpecificOutput.permissionDecision, 'deny', file_path);
  }
  assert.deepEqual(handleHook(ROOT, home, input(workspace, 'PreToolUse', { tool_name: 'Write', tool_input: { file_path: 'src/new/file.ts' } })), {});
  assert.deepEqual(handleHook(ROOT, home, input(workspace, 'PreToolUse', { tool_name: 'Bash', tool_input: { command: 'echo test' } })), {});
});

test('check evidence gates completion and becomes stale after workspace edits', t => {
  const { home, workspace } = fixture(t);
  const file = path.join(workspace, 'app.js'); fs.writeFileSync(file, 'one');
  const task = beginTask(home, workspace, 'Implement behavior');
  assert.throws(() => completeTask(home, task.id, 'done'), /Run a check/);
  runCheck(home, task.id, [process.execPath, '-e', 'process.exit(0)'], policy);
  fs.writeFileSync(file, 'two');
  assert.throws(() => completeTask(home, task.id, 'done'), /Run a check/);
  checkpoint(home, task.id, 'Updated behavior');
  runCheck(home, task.id, [process.execPath, '-e', 'process.exit(0)'], policy);
  const done = completeTask(home, task.id, 'Implemented and checked');
  assert.equal(done.outcome.validation, 'passed');
  assert.throws(() => checkpoint(home, task.id, 'more'), /closed/);
});

test('failed and timed-out checks cannot produce verified completion', t => {
  const { home, workspace } = fixture(t);
  const task = beginTask(home, workspace, 'A failing check');
  const failed = runCheck(home, task.id, [process.execPath, '-e', 'process.exit(7)'], policy);
  assert.equal(failed.check.exitCode, 7);
  assert.throws(() => completeTask(home, task.id, 'done', 'skip failure'), /failed checks/);
  checkpoint(home, task.id, 'Changed approach');
  const timeout = runCheck(home, task.id, [process.execPath, '-e', 'setInterval(()=>{},1000)'], { ...policy, maxCheckSeconds: 1 });
  assert.equal(timeout.check.passed, false);
  assert.equal(timeout.check.errorCode, 'ETIMEDOUT');
});

test('explicitly skipped checks produce an unverified outcome; tasks survive restart', t => {
  const { home, workspace } = fixture(t);
  const task = beginTask(home, workspace, 'Documentation task');
  checkpoint(home, task.id, 'Ready to resume', 'paused');
  const context = handleHook(ROOT, home, input(workspace, 'SessionStart')).hookSpecificOutput.additionalContext;
  assert.ok(context.includes(task.id));
  checkpoint(home, task.id, 'Resumed');
  const done = completeTask(home, task.id, 'Edited prose', 'No executable check applies');
  assert.equal(done.outcome.validation, 'unverified');
});

test('CLI returns nonzero for failed checks and hook entrypoint emits protocol JSON', t => {
  const { home, workspace } = fixture(t);
  const task = beginTask(home, workspace, 'CLI check');
  const result = spawnSync(process.execPath, [path.join(ROOT, 'tools/harness.mjs'), '--home', home, 'task', 'check', task.id, '--', process.execPath, '-e', 'process.exit(3)'], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).check.exitCode, 3);
  const hook = spawnSync(process.execPath, [path.join(ROOT, 'tools/hook.mjs'), '--home', home], { input: JSON.stringify(input(workspace, 'UserPromptSubmit', { prompt: 'diagnose this crash' })), encoding: 'utf8', windowsHide: true });
  assert.equal(hook.status, 0, hook.stderr);
  assert.equal(JSON.parse(hook.stdout).hookSpecificOutput.hookEventName, 'UserPromptSubmit');
});

test('rollback preserves extra entries created after a fresh install', t => {
  const { home } = fixture(t);
  install(ROOT, home);
  const extra = path.join(home, 'agents/personal.md');
  fs.writeFileSync(extra, 'personal agent');
  rollback(home);
  assert.equal(fs.readFileSync(extra, 'utf8'), 'personal agent');
});

test('an interrupted rollback resumes from its persisted operation index', t => {
  const { home } = fixture(t);
  install(ROOT, home);
  const journal = path.join(home, 'eva-harness/installation.json');
  const state = readJSON(journal);
  const last = state.changes.at(-1);
  assert.equal(last.before, null);
  fs.unlinkSync(last.path);
  state.status = 'rolling-back'; state.rollbackIndex = 1;
  writeJSON(journal, state);
  rollback(home);
  assert.equal(fs.existsSync(path.join(home, 'CLAUDE.md')), false);
  assert.equal(readJSON(journal).status, 'rolled-back');
});

test('upgrade deploys a new immutable release and rollback restores the previous release', t => {
  const { home, base } = fixture(t);
  const source = path.join(base, 'upgrade source');
  fs.cpSync(ROOT, source, { recursive: true, filter: file => {
    const relative = path.relative(ROOT, file).replaceAll('\\', '/');
    return !relative.startsWith('.git') && !relative.startsWith('.claude/skills/synced');
  } });
  const first = install(source, home);
  fs.appendFileSync(path.join(source, 'CLAUDE.md'), '\nA new release rule.\n');
  const second = install(source, home);
  assert.notEqual(first.releaseId, second.releaseId);
  assert.equal(fs.readFileSync(path.join(first.release, 'CLAUDE.md'), 'utf8').includes('A new release rule.'), false);
  rollback(home);
  assert.equal(readJSON(path.join(home, 'eva-harness/installation.json')).releaseId, first.releaseId);
  assert.equal(doctor(source, home).some(x => x.level === 'fail'), false);
});

test('checks that mutate source cannot be used as passing evidence', t => {
  const { home, workspace } = fixture(t);
  fs.writeFileSync(path.join(workspace, 'app.js'), 'initial');
  const task = beginTask(home, workspace, 'Mutation during check');
  const result = runCheck(home, task.id, [process.execPath, '-e', "require('fs').writeFileSync('app.js','changed')"], policy);
  assert.equal(result.check.exitCode, 0);
  assert.equal(result.check.changedWorkspace, true);
  assert.equal(result.check.passed, false);
  assert.throws(() => completeTask(home, task.id, 'done'), /failed checks/);
});

test('event caps and retention bound local session logs', t => {
  const { home, workspace } = fixture(t);
  const boundedRoot = path.join(workspace, 'runtime'); fs.mkdirSync(boundedRoot);
  writeJSON(path.join(boundedRoot, 'harness.config.json'), { ...policy, maxEventsPerSession: 2 });
  for (let i = 0; i < 4; i++) handleHook(boundedRoot, home, input(workspace, 'PostToolUse', { tool_name: 'Read' }));
  assert.equal(status(home, workspace).recentEvents.length, 2);
  const directory = path.join(home, 'eva-harness/state/sessions');
  const log = path.join(directory, fs.readdirSync(directory).find(x => x.endsWith('.jsonl')));
  const past = new Date(Date.now() - 40 * 86400000); fs.utimesSync(log, past, past);
  prune(home, policy);
  assert.equal(fs.existsSync(log), false);
});

test('command argv after -- is preserved even when it resembles harness options', t => {
  const { home, workspace } = fixture(t);
  const task = beginTask(home, workspace, 'Preserve arguments');
  const result = spawnSync(process.execPath, [path.join(ROOT, 'tools/harness.mjs'), '--home', home, 'task', 'check', task.id, '--', process.execPath, '-e', 'console.log(process.argv.slice(1).join(","))', '--', '--home', 'unrelated'], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  assert.match(JSON.parse(result.stdout).stdout, /--home,unrelated/);
});

test('the installed hook command executes through Bash with spaces in paths', t => {
  const { home, workspace } = fixture(t);
  const bash = process.platform === 'win32' ? path.join(process.env.ProgramFiles || 'C:/Program Files', 'Git/bin/bash.exe') : '/bin/bash';
  if (!fs.existsSync(bash)) { t.skip('Git Bash is not installed'); return; }
  install(ROOT, home);
  const settings = readJSON(path.join(home, 'settings.json'));
  const command = settings.hooks.SessionStart.at(-1).hooks[0].command;
  const result = spawnSync(bash, ['-c', command], { input: JSON.stringify(input(workspace, 'SessionStart')), encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  assert.match(JSON.parse(result.stdout).hookSpecificOutput.additionalContext, /hook is active/);
});

test('parallel hook calls preserve all receipts without lock contention failures', async t => {
  const { home, workspace } = fixture(t);
  const results = await Promise.all(Array.from({ length: 8 }, () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(ROOT, 'tools/hook.mjs'), '--home', home], { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stderr }));
    child.stdin.end(JSON.stringify(input(workspace, 'PostToolUse', { tool_name: 'Read' })));
  })));
  assert.ok(results.every(x => x.code === 0), JSON.stringify(results));
  assert.equal(status(home, workspace).recentEvents.length, 8);
});

test('task inspection and conventional help work without guessing subcommands', t => {
  const { home, workspace } = fixture(t);
  const task = beginTask(home, workspace, 'Recover this checkpoint');
  checkpoint(home, task.id, 'Remaining work is recorded here', 'paused');
  for (const args of [['--help'], ['-h'], ['task', '--help'], ['task', 'help']]) {
    const result = spawnSync(process.execPath, [path.join(ROOT, 'tools/harness.mjs'), '--home', home, ...args], { encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(JSON.parse(result.stdout));
  }
  const shown = spawnSync(process.execPath, [path.join(ROOT, 'tools/harness.mjs'), '--home', home, 'task', 'show', task.id], { encoding: 'utf8', windowsHide: true });
  assert.equal(shown.status, 0, shown.stderr);
  const record = JSON.parse(shown.stdout);
  assert.equal(record.status, 'paused');
  assert.equal(record.checkpoints.at(-1).note, 'Remaining work is recorded here');
  const context = handleHook(ROOT, home, input(workspace, 'SessionStart')).hookSpecificOutput.additionalContext;
  assert.match(context, /task show ID/);
});

test('status distinguishes routing from actual skill observations and omits skill arguments', t => {
  const { home, workspace } = fixture(t);
  handleHook(ROOT, home, input(workspace, 'SessionStart'));
  handleHook(ROOT, home, input(workspace, 'UserPromptSubmit', { prompt: 'Fix behavior' }));
  assert.deepEqual(status(home, workspace).activation.skillsObserved, []);
  handleHook(ROOT, home, input(workspace, 'PostToolUse', { tool_name: 'Skill', tool_input: { skill: 'dev-mode', args: 'SECRET_SKILL_ARGUMENTS' } }));
  handleHook(ROOT, home, input(workspace, 'PostToolUseFailure', { tool_name: 'Skill', tool_input: { skill: 'debug-mode' } }));
  const receipt = status(home, workspace);
  assert.equal(receipt.activation.sessionStartSeen, true);
  assert.equal(receipt.activation.promptRoutingSeen, true);
  assert.deepEqual(receipt.activation.skillsObserved, ['dev-mode']);
  assert.doesNotMatch(JSON.stringify(receipt.recentEvents), /SECRET_SKILL_ARGUMENTS/);
});
