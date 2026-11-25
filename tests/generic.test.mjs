import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, assets, readJSON, writeJSON } from '../lib/core.mjs';
import { businessContext, projectContext, projectContract } from '../lib/project.mjs';
import { install, rollback, uninstall } from '../lib/install.mjs';
import { handleHook, status } from '../lib/runtime.mjs';
import { validatePlugin } from '../lib/plugin.mjs';

function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'generic harness '));
  const workspace = path.join(base, 'application'), other = path.join(base, 'other'), home = path.join(base, 'config');
  for (const directory of [workspace, other, home]) fs.mkdirSync(directory);
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  return { base, workspace, other, home };
}
function copySource(base) {
  const source = path.join(base, 'harness source');
  for (const file of assets(ROOT)) {
    const target = path.join(source, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(ROOT, file), target);
  }
  return source;
}
const input = (cwd, event = 'SessionStart', extra = {}) => ({ cwd, session_id: 'generic-session', hook_event_name: event, ...extra });

test('core operates without a business pack and cannot load EVA domain guides globally', t => {
  const { home, workspace } = fixture(t);
  assert.deepEqual(businessContext(workspace), { entryPoint: null, documents: [] });
  fs.mkdirSync(path.join(workspace, 'business'));
  fs.writeFileSync(path.join(workspace, 'business', 'service.py'), '# Ordinary application source');
  assert.deepEqual(businessContext(workspace), { entryPoint: null, documents: [] });
  const release = assets(ROOT);
  assert.equal(release.some(file => /(?:business-packs|templates|departments|eva-.*\.md)/.test(file)), false);
  install(ROOT, home);
  assert.deepEqual(fs.readdirSync(path.join(home, 'rules')), []);
  assert.deepEqual(fs.readdirSync(path.join(home, 'departments')), []);
  const output = handleHook(ROOT, home, input(workspace));
  assert.match(output.hookSpecificOutput.additionalContext, /No business pack/);
  assert.doesNotMatch(output.hookSpecificOutput.additionalContext, /configurator|Sectioning|Geometry/);
});

test('local business knowledge is discovered only in its application clone and is not injected wholesale', t => {
  const { workspace, other, home } = fixture(t);
  const directory = path.join(workspace, 'business');
  fs.mkdirSync(directory);
  fs.writeFileSync(path.join(directory, 'README.md'), '# Example project\nSee architecture.md for service boundaries.');
  fs.writeFileSync(path.join(directory, 'architecture.md'), '# Example service boundaries\nSECRET_DOMAIN_BODY');
  writeJSON(path.join(directory, 'harness.json'), { schemaVersion: 1, documents: [{ path: 'architecture.md', when: 'Changing service boundaries' }] });
  const context = projectContext(workspace);
  assert.equal(context.business.entryPoint, 'business/README.md');
  assert.equal(context.business.documents.length, 1);
  assert.equal(projectContext(other).business.entryPoint, null);
  const output = handleHook(ROOT, home, input(workspace), { plugin: true });
  assert.match(output.hookSpecificOutput.additionalContext, /business\/README.md/);
  assert.doesNotMatch(output.hookSpecificOutput.additionalContext, /SECRET_DOMAIN_BODY/);
  assert.doesNotMatch(JSON.stringify(status(home, workspace)), /SECRET_DOMAIN_BODY|architecture\.md/);
});

test('a simple business README needs no manifest; indexes cannot grant executable privileges', t => {
  const { workspace } = fixture(t);
  const directory = path.join(workspace, 'business');
  fs.mkdirSync(directory); fs.writeFileSync(path.join(directory, 'README.md'), '# Project knowledge');
  assert.deepEqual(businessContext(workspace), { entryPoint: 'business/README.md', documents: [] });
  const file = path.join(directory, 'harness.json');
  writeJSON(file, { schemaVersion: 1, documents: [], permissions: { allow: ['Bash'] } });
  assert.throws(() => businessContext(workspace), /supports only/);
  writeJSON(file, { schemaVersion: 1, documents: [{ path: 'missing.md', when: 'Design work' }] });
  assert.throws(() => businessContext(workspace), /must stay inside/);
  fs.writeFileSync(path.join(directory, 'roles.md'), 'Responsibilities');
  writeJSON(file, { schemaVersion: 1, documents: [{ path: 'roles.md', when: 'Ownership', command: 'unsafe' }] });
  assert.throws(() => businessContext(workspace), /needs only/);
});

test('business indexes reject traversal, duplicate references, oversized files and escaped symlinks', t => {
  const { workspace, other } = fixture(t);
  const directory = path.join(workspace, 'business');
  fs.mkdirSync(directory); fs.writeFileSync(path.join(directory, 'README.md'), '# Knowledge');
  fs.writeFileSync(path.join(directory, 'roles.md'), 'Responsibilities');
  const index = entries => writeJSON(path.join(directory, 'harness.json'), { schemaVersion: 1, documents: entries });
  for (const file of ['../README.md', 'x/../roles.md', '/absolute.md', 'C:/roles.md', '..\\roles.md']) {
    index([{ path: file, when: 'All work' }]);
    assert.throws(() => businessContext(workspace), /relative Markdown/);
  }
  index([{ path: 'roles.md', when: 'Ownership' }, { path: 'roles.md', when: 'Again' }]);
  assert.throws(() => businessContext(workspace), /Duplicate/);
  fs.writeFileSync(path.join(directory, 'roles.md'), 'x'.repeat(128 * 1024 + 1));
  index([{ path: 'roles.md', when: 'Ownership' }]);
  assert.throws(() => businessContext(workspace), /128 KiB/);
  fs.writeFileSync(path.join(other, 'roles.md'), 'Outside the clone');
  fs.symlinkSync(other, path.join(directory, 'escaped'), process.platform === 'win32' ? 'junction' : 'dir');
  index([{ path: 'escaped/roles.md', when: 'Ownership' }]);
  assert.throws(() => businessContext(workspace), /must stay inside/);
});

test('generic contracts work while legacy contracts remain supported without ambiguous precedence', t => {
  const { workspace } = fixture(t);
  const contract = { schemaVersion: 1, criteria: ['Expected outcome'], checks: [] };
  writeJSON(path.join(workspace, '.harness.json'), contract);
  assert.equal(path.basename(projectContract(workspace).file), '.harness.json');
  writeJSON(path.join(workspace, '.eva-harness.json'), contract);
  assert.throws(() => projectContract(workspace), /Keep only one/);
  fs.unlinkSync(path.join(workspace, '.harness.json'));
  assert.equal(path.basename(projectContract(workspace).file), '.eva-harness.json');
});

test('plugin startup supplies generic policy and namespaced workflow routing without global installation', t => {
  const { workspace, home } = fixture(t);
  validatePlugin(ROOT);
  const start = handleHook(ROOT, home, input(workspace), { plugin: true }).hookSpecificOutput.additionalContext;
  assert.match(start, /Engineering harness v[\d.]+ hook is active/);
  assert.match(start, /Stage, unstage, commit.*each require explicit user authorization/);
  assert.match(start, /engineering:implement-feature/);
  assert.match(start, /workers inherit/i);
  assert.equal(fs.existsSync(path.join(home, 'CLAUDE.md')), false);
  assert.equal(fs.existsSync(path.join(home, 'settings.json')), false);
  const routed = handleHook(ROOT, home, input(workspace, 'UserPromptSubmit', { prompt: '/engineering:coordinate-work Execute the agreed plan.' }), { plugin: true });
  assert.match(routed.hookSpecificOutput.additionalContext, /Use \/engineering:coordinate-tasks/);
  assert.equal(status(home, workspace).recentEvents.find(event => event.event === 'SessionStart').transport, 'plugin');
});

test('plugin refuses simultaneous legacy installation and works after all recorded upgrades are removed', t => {
  const { workspace, home, base } = fixture(t);
  const original = { model: 'custom-model', custom: 'preserve', hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'echo personal' }] }] } };
  writeJSON(path.join(home, 'settings.json'), original);
  fs.writeFileSync(path.join(home, 'CLAUDE.md'), '# Personal instructions\n');
  const source = copySource(base);
  install(source, home);
  fs.appendFileSync(path.join(source, 'CLAUDE.md'), '\nAn upgrade.\n');
  install(source, home);
  assert.throws(() => handleHook(ROOT, home, input(workspace), { plugin: true }), /Legacy harness installation is still active/);
  assert.equal(uninstall(home).transactionsReverted, 2);
  assert.deepEqual(readJSON(path.join(home, 'settings.json')), original);
  assert.equal(fs.readFileSync(path.join(home, 'CLAUDE.md'), 'utf8'), '# Personal instructions\n');
  assert.equal(uninstall(home).transactionsReverted, 0);
  assert.match(handleHook(ROOT, home, input(workspace), { plugin: true }).hookSpecificOutput.additionalContext, /hook is active/);
});

test('legacy removal preserves local task receipts and refuses to overwrite user configuration edits', t => {
  const { workspace, home } = fixture(t);
  install(ROOT, home);
  handleHook(ROOT, home, input(workspace));
  const file = path.join(home, 'settings.json');
  const settings = readJSON(file); settings.personal = 'new edit'; writeJSON(file, settings);
  assert.throws(() => uninstall(home), /Rollback would overwrite changes/);
  assert.equal(readJSON(file).personal, 'new edit');
  delete settings.personal; writeJSON(file, settings);
  uninstall(home);
  assert.equal(status(home, workspace).activation.sessionStartSeen, true);
});

test('upgrades remove only unchanged retired domain assets and rollback restores the previous installation', t => {
  const { home, base } = fixture(t);
  const source = copySource(base);
  const rule = path.join(source, '.claude/rules/legacy-domain.md');
  fs.mkdirSync(path.dirname(rule), { recursive: true });
  fs.writeFileSync(rule, '---\npaths:\n  - "src/example/**"\n---\n\n# Previous domain guidance\n');
  install(source, home);
  const installedRule = path.join(home, 'rules/legacy-domain.md');
  const original = fs.readFileSync(installedRule, 'utf8');
  fs.unlinkSync(rule);
  install(source, home);
  assert.equal(fs.existsSync(installedRule), false);
  rollback(home);
  assert.equal(fs.readFileSync(installedRule, 'utf8'), original);
  fs.appendFileSync(installedRule, '\nUser customization');
  assert.throws(() => install(source, home), /Removed harness asset was edited/);
  assert.match(fs.readFileSync(installedRule, 'utf8'), /User customization/);
});

test('plugin hook entry point works from paths containing spaces and emits real runtime receipts', t => {
  const { workspace, home, base } = fixture(t);
  const source = copySource(base);
  const result = spawnSync(process.execPath, [path.join(source, 'tools/hook.mjs'), '--plugin', '--home', home], { cwd: workspace, input: JSON.stringify(input(workspace)), encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  assert.match(JSON.parse(result.stdout).hookSpecificOutput.additionalContext, /Engineering harness v[\d.]+ hook is active/);
  assert.equal(status(home, workspace).activation.sessionStartSeen, true);
});

test('the plugin hook launcher resolves CLAUDE_PLUGIN_ROOT through a shell with spaces in paths', t => {
  const { workspace, home, base } = fixture(t);
  const bash = process.platform === 'win32' ? path.join(process.env.ProgramFiles || 'C:/Program Files', 'Git/bin/bash.exe') : '/bin/bash';
  if (!fs.existsSync(bash)) { t.skip('Bash is not installed'); return; }
  const source = copySource(base);
  const command = readJSON(path.join(source, 'hooks/hooks.json')).hooks.SessionStart[0].hooks[0].command;
  const result = spawnSync(bash, ['-c', command], { cwd: workspace, env: { ...process.env, CLAUDE_PLUGIN_ROOT: source, CLAUDE_CONFIG_DIR: home }, input: JSON.stringify(input(workspace)), encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  assert.match(JSON.parse(result.stdout).hookSpecificOutput.additionalContext, /Engineering harness v[\d.]+ hook is active/);
  assert.equal(status(home, workspace).recentEvents[0].transport, 'plugin');
});
