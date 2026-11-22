import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assets } from '../lib/core.mjs';

function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'harness asset safety '));
  const root = path.join(base, 'source'), outside = path.join(base, 'outside');
  fs.mkdirSync(root); fs.mkdirSync(outside);
  for (const file of ['CLAUDE.md', 'package.json', 'harness.config.json', '.claude-plugin/plugin.json', '.claude-plugin/marketplace.json']) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), '{}');
  }
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  return { root, outside };
}

test('release assets remain sorted and tolerate absent legacy domain directories', t => {
  const { root } = fixture(t);
  fs.mkdirSync(path.join(root, 'skills', 'example'), { recursive: true });
  fs.writeFileSync(path.join(root, 'skills', 'example', 'SKILL.md'), 'Public instructions');
  fs.mkdirSync(path.join(root, 'skills', 'synced'));
  fs.writeFileSync(path.join(root, 'skills', 'synced', 'private.md'), 'Not a maintained release asset');
  const files = assets(root);
  assert.ok(files.includes('skills/example/SKILL.md'));
  assert.equal(files.some(file => file.includes('synced')), false);
  assert.deepEqual(files, [...files].sort());
});

test('release discovery rejects top-level directory junctions before listing external files', t => {
  const { root, outside } = fixture(t);
  fs.mkdirSync(path.join(outside, 'private'));
  fs.writeFileSync(path.join(outside, 'private', 'SKILL.md'), 'Private instructions');
  fs.symlinkSync(outside, path.join(root, 'skills'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => assets(root), /cannot be symlinks: skills/);
});

test('release discovery rejects symlinked ancestors of fixed manifest files', t => {
  const { root, outside } = fixture(t);
  fs.rmSync(path.join(root, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(outside, 'plugin.json'), '{}');
  fs.writeFileSync(path.join(outside, 'marketplace.json'), '{}');
  fs.symlinkSync(outside, path.join(root, '.claude-plugin'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => assets(root), /cannot be symlinks: \.claude-plugin\/plugin.json/);
});

test('release discovery rejects fixed files replaced by directories', t => {
  const { root } = fixture(t);
  fs.unlinkSync(path.join(root, 'CLAUDE.md'));
  fs.mkdirSync(path.join(root, 'CLAUDE.md'));
  assert.throws(() => assets(root), /must be a regular file: CLAUDE.md/);
});

test('release discovery rejects fixed-file symlinks including targets inside the source root', t => {
  const { root } = fixture(t);
  fs.writeFileSync(path.join(root, 'alternate.md'), 'Alternate instructions');
  fs.unlinkSync(path.join(root, 'CLAUDE.md'));
  try {
    fs.symlinkSync(path.join(root, 'alternate.md'), path.join(root, 'CLAUDE.md'), 'file');
  } catch (error) {
    if (process.platform === 'win32' && ['EPERM', 'EACCES'].includes(error.code)) { t.skip('File symlinks require Windows Developer Mode or elevation'); return; }
    throw error;
  }
  assert.throws(() => assets(root), /cannot be symlinks: CLAUDE.md/);
});
