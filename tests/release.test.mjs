import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, digest, readJSON, writeJSON } from '../lib/core.mjs';
import { exportRelease, releaseFiles } from '../lib/release.mjs';

function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'public harness export '));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const source = path.join(base, 'reviewed source');
  exportRelease(ROOT, source);
  return { base, source };
}
function manifest(source, additions) {
  const file = path.join(source, 'release.config.json');
  const config = readJSON(file);
  writeJSON(file, { ...config, files: [...config.files, ...additions] });
}

test('public export has exact reviewed files, MIT license and hashes, without ambient private data or history', t => {
  const { base, source } = fixture(t);
  fs.mkdirSync(path.join(source, '.local')); fs.writeFileSync(path.join(source, '.local/private.md'), 'COMPANY_PRIVATE_SENTINEL');
  fs.mkdirSync(path.join(source, 'business')); fs.writeFileSync(path.join(source, 'business/README.md'), 'COMPANY_PRIVATE_SENTINEL');
  fs.mkdirSync(path.join(source, '.git')); fs.writeFileSync(path.join(source, '.git/config'), 'PRIVATE_HISTORY_SENTINEL');
  fs.writeFileSync(path.join(source, 'unreviewed.md'), 'UNREVIEWED_SENTINEL');
  const output = path.join(base, 'public package');
  const result = exportRelease(source, output);
  assert.equal(result.includesGitHistory, false);
  assert.deepEqual(result.preparationBlockers, []);
  for (const file of ['.local', '.git', 'business', 'business-packs', 'unreviewed.md']) assert.equal(fs.existsSync(path.join(output, file)), false);
  const metadata = readJSON(path.join(output, 'release-manifest.json'));
  assert.deepEqual(Object.keys(metadata.files).sort(), releaseFiles(source));
  assert.match(fs.readFileSync(path.join(output, 'LICENSE'), 'utf8'), /MIT License/);
  for (const [file, hash] of Object.entries(metadata.files)) assert.equal(digest(fs.readFileSync(path.join(output, file))), hash);
  const check = spawnSync(process.execPath, [path.join(output, 'tools/harness.mjs'), 'validate'], { encoding: 'utf8', windowsHide: true });
  assert.equal(check.status, 0, check.stderr);
  assert.equal(JSON.parse(check.stdout).plugin.name, 'engineering');
});

test('export rejects privacy paths with case variants and traversal before reading them', t => {
  const { source } = fixture(t);
  const file = path.join(source, 'release.config.json');
  const original = readJSON(file);
  for (const candidate of ['.git/config', '.GIT/config', '.LOCAL/private.md', 'Business/domain.md', 'business-packs/private.md', 'docs/.ENV', 'docs/secret.KEY']) {
    writeJSON(file, { ...original, files: [...original.files, candidate] });
    assert.throws(() => releaseFiles(source), /Private or sensitive/);
  }
  for (const candidate of ['../private.md', 'docs/../private.md', 'docs\\private.md', 'docs./private.md']) {
    writeJSON(file, { ...original, files: [...original.files, candidate] });
    assert.throws(() => releaseFiles(source), /relative without traversal/);
  }
});

test('export requires every runtime asset to be explicitly reviewed in the release manifest', t => {
  const { base, source } = fixture(t);
  fs.writeFileSync(path.join(source, 'lib/new-dependency.mjs'), 'export const value = true;');
  const output = path.join(base, 'incomplete package');
  assert.throws(() => exportRelease(source, output), /omits required runtime files.*new-dependency/);
  assert.equal(fs.existsSync(output), false);
});

test('export rejects linked ancestors rather than copying external document bodies', t => {
  const { source, base } = fixture(t);
  const outside = path.join(base, 'outside'); fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'private.md'), 'PRIVATE_EXTERNAL_BODY');
  fs.symlinkSync(outside, path.join(source, 'docs/linked'), process.platform === 'win32' ? 'junction' : 'dir');
  manifest(source, ['docs/linked/private.md']);
  assert.throws(() => releaseFiles(source), /without linked ancestors/);
});

test('export preserves existing populated destinations and refuses to replace its own source', t => {
  const { source, base } = fixture(t);
  const output = path.join(base, 'existing'); fs.mkdirSync(output);
  fs.writeFileSync(path.join(output, 'personal.md'), 'Keep this');
  assert.throws(() => exportRelease(source, output), /new or empty directory/);
  assert.equal(fs.readFileSync(path.join(output, 'personal.md'), 'utf8'), 'Keep this');
  assert.throws(() => exportRelease(source, source), /cannot replace the source/);
  assert.throws(() => exportRelease(source, base), /cannot replace the source/);
  const empty = path.join(base, 'empty'); fs.mkdirSync(empty);
  assert.equal(exportRelease(source, empty).output, empty);
});

test('release metadata name is reserved and file names must not collide on case-insensitive systems', t => {
  const { source, base } = fixture(t);
  const file = path.join(source, 'release.config.json');
  const original = readJSON(file);
  manifest(source, ['release-manifest.json']);
  assert.throws(() => releaseFiles(source), /reserved/);
  writeJSON(file, { ...original, files: [...original.files, 'readme.md'] });
  assert.throws(() => releaseFiles(source), /Duplicate release file/);
  fs.writeFileSync(path.join(source, '__proto__'), 'Public metadata fixture');
  writeJSON(file, { ...original, files: [...original.files, '__proto__'] });
  const output = path.join(base, 'prototype filename');
  exportRelease(source, output);
  assert.equal(Object.hasOwn(readJSON(path.join(output, 'release-manifest.json')).files, '__proto__'), true);
});

test('unlicensed preparation exports are clearly marked and oversized inputs are rejected', t => {
  const { source, base } = fixture(t);
  fs.unlinkSync(path.join(source, 'LICENSE'));
  assert.match(exportRelease(source, path.join(base, 'unlicensed preparation')).preparationBlockers[0], /LICENSE/);
  fs.writeFileSync(path.join(source, 'docs/oversized.md'), 'x'.repeat(2 * 1024 * 1024 + 1));
  manifest(source, ['docs/oversized.md']);
  assert.throws(() => releaseFiles(source), /exceeds 2 MiB/);
});
