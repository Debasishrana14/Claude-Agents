import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, assets, readJSON } from '../lib/core.mjs';

// Opt-in integration: no model calls, accounts, or real user settings are needed.
// Windows coverage uses the native executable; npm claude.cmd wrappers are not
// supported by spawnSync without a shell and need separate compatibility testing.
test('native Claude discovers, updates, switches, and removes only the selected local installation', { skip: process.env.HARNESS_NATIVE_CLAUDE_TESTS !== '1' }, t => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'native harness integration '));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const source = path.join(base, 'plugin source'), home = path.join(base, 'config');
  const workspace = path.join(base, 'application'), other = path.join(base, 'other');
  for (const directory of [source, home, workspace, other]) fs.mkdirSync(directory);
  for (const file of assets(ROOT)) {
    const target = path.join(source, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(ROOT, file), target);
  }
  const env = { ...process.env, CLAUDE_CONFIG_DIR: home, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1', DISABLE_AUTOUPDATER: '1' };
  const cli = (args, cwd = workspace) => {
    const result = spawnSync('claude', args, { cwd, env, encoding: 'utf8', windowsHide: true, timeout: 20000 });
    assert.equal(result.status, 0, `${args.join(' ')}: ${result.error || result.stderr || result.stdout}`);
    return result.stdout;
  };
  const id = 'engineering@engineering-harness-local';
  cli(['plugin', 'marketplace', 'add', source]);
  cli(['plugin', 'install', id, '--scope', 'local']);
  const installed = JSON.parse(cli(['plugin', 'list', '--json'])).find(item => item.id === id);
  assert.equal(installed.version, readJSON(path.join(ROOT, 'package.json')).version);
  assert.equal(installed.scope, 'local');
  assert.equal(installed.enabled, true);
  const inventory = cli(['plugin', 'details', id]);
  assert.match(inventory, /Skills \(9\)/);
  assert.match(inventory, /Agents \(6\)/);
  assert.match(inventory, /Hooks \(8\)/);
  assert.equal(fs.existsSync(path.join(home, 'CLAUDE.md')), false);
  cli(['plugin', 'install', id, '--scope', 'local'], other);
  const otherSettings = path.join(other, '.claude/settings.local.json');
  assert.equal(readJSON(otherSettings).enabledPlugins[id], true);
  const localSettings = path.join(workspace, '.claude/settings.local.json');
  cli(['plugin', 'disable', id, '--scope', 'local']);
  assert.equal(readJSON(localSettings).enabledPlugins[id], false);
  assert.equal(readJSON(otherSettings).enabledPlugins[id], true);
  const otherInstalled = JSON.parse(cli(['plugin', 'list', '--json'], other)).find(item => item.id === id && item.projectPath === other);
  assert.equal(otherInstalled.scope, 'local');
  cli(['plugin', 'enable', id, '--scope', 'local']);
  assert.equal(readJSON(localSettings).enabledPlugins[id], true);

  const parts = installed.version.match(/^(\d+)\.(\d+)\.(\d+)/);
  assert.ok(parts, 'The fixture source needs a semantic version');
  const updatedVersion = `${parts[1]}.${parts[2]}.${Number(parts[3]) + 1}`;
  for (const relative of ['package.json', '.claude-plugin/plugin.json']) {
    const file = path.join(source, relative);
    fs.writeFileSync(file, `${JSON.stringify({ ...readJSON(file), version: updatedVersion }, null, 2)}\n`);
  }
  cli(['plugin', 'marketplace', 'update', 'engineering-harness-local']);
  cli(['plugin', 'update', id, '--scope', 'local']);
  const updated = JSON.parse(cli(['plugin', 'list', '--json'])).find(item => item.id === id && item.projectPath === workspace);
  assert.equal(updated.version, updatedVersion);
  assert.equal(updated.scope, 'local');
  assert.equal(updated.enabled, true);
  assert.notEqual(updated.installPath, installed.installPath);

  const otherSettingsBeforeRemoval = readJSON(otherSettings);
  cli(['plugin', 'uninstall', id, '--scope', 'local']);
  const remaining = JSON.parse(cli(['plugin', 'list', '--json'], other));
  assert.equal(remaining.some(item => item.id === id && item.projectPath === workspace), false);
  const otherRemaining = remaining.find(item => item.id === id && item.projectPath === other);
  assert.equal(otherRemaining.scope, 'local');
  assert.equal(otherRemaining.version, otherInstalled.version);
  assert.equal(otherRemaining.installPath, otherInstalled.installPath);
  assert.equal(fs.existsSync(otherRemaining.installPath), true);
  assert.deepEqual(readJSON(otherSettings), otherSettingsBeforeRemoval);
  assert.match(cli(['plugin', 'details', id], other), /Agents \(6\)/);
});
