import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, assets, readJSON } from '../lib/core.mjs';

// Opt-in integration: no model calls, accounts, or real user settings are needed.
test('native Claude discovers packaged components and switches only the selected clone', { skip: process.env.HARNESS_NATIVE_CLAUDE_TESTS !== '1' }, t => {
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
});
