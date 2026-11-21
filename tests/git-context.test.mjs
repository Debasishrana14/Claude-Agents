import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { commitContext } from '../lib/git-context.mjs';
import { ROOT } from '../lib/core.mjs';

function repository(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eva staged context '));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => {
    const result = spawnSync('git', ['-c', 'user.name=Harness Test', '-c', 'user.email=harness-test@example.invalid', ...args], { cwd: root, encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };
  const write = (name, content) => {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), content);
  };
  git('init', '--quiet');
  return { root, git, write };
}

test('commit context reads partially staged content and leaves the index unchanged', t => {
  const { root, git, write } = repository(t);
  write('geometry.mjs', 'export const tolerance = 1;\n');
  git('add', '--', 'geometry.mjs'); git('commit', '--quiet', '-m', 'feat(geometry): add tolerance');
  write('geometry.mjs', 'export const tolerance = 2; // STAGED_BEHAVIOR\n'); git('add', '--', 'geometry.mjs');
  write('geometry.mjs', 'export const tolerance = 99; // UNSTAGED_BEHAVIOR\n');
  write('untracked.mjs', 'UNTRACKED_BEHAVIOR');
  const before = git('ls-files', '--stage');
  const result = commitContext(root);
  assert.equal(result.complete, true);
  assert.equal(result.changes.length, 1);
  assert.match(result.changes[0].patch, /STAGED_BEHAVIOR/);
  assert.doesNotMatch(JSON.stringify(result), /UNSTAGED_BEHAVIOR|UNTRACKED_BEHAVIOR/);
  assert.deepEqual(result.recentSubjects, ['feat(geometry): add tolerance']);
  assert.equal(git('ls-files', '--stage'), before);
});

test('empty and initial repositories report exact staged scope without inventing history', t => {
  const { root, git, write } = repository(t);
  assert.deepEqual(commitContext(root).changes, []);
  write('new file.txt', 'first staged content\n'); git('add', '--', 'new file.txt');
  const result = commitContext(root);
  assert.equal(result.head, null);
  assert.deepEqual(result.recentSubjects, []);
  assert.equal(result.changes[0].status, 'A');
  assert.match(result.changes[0].patch, /first staged content/);
});

test('renames, deletions, binary files and literal pathspec names are represented', t => {
  const { root, git, write } = repository(t);
  write('old name.txt', 'rename this content\n'); write('delete.txt', 'remove this\n');
  git('add', '.'); git('commit', '--quiet', '-m', 'test: add fixture files');
  git('mv', '--', 'old name.txt', 'renamed file.txt'); git('rm', '--', 'delete.txt');
  write('literal[1].txt', 'LITERAL_CONTENT\n'); write('image.bin', Buffer.from([0, 1, 2, 3])); git('add', '.');
  const result = commitContext(root);
  assert.ok(result.changes.some(x => x.status.startsWith('R') && x.oldPath === 'old name.txt' && x.path === 'renamed file.txt'));
  assert.ok(result.changes.some(x => x.status === 'D' && x.path === 'delete.txt'));
  assert.match(result.changes.find(x => x.path === 'literal[1].txt').patch, /LITERAL_CONTENT/);
  assert.match(result.changes.find(x => x.path === 'image.bin').patch, /Binary files/);
});

test('sensitive filenames are withheld and oversized evidence is explicitly incomplete', t => {
  const { root, git, write } = repository(t);
  const secrets = ['.env', 'nested/.npmrc', 'nested/client.PEM', 'nested/id_ed25519'];
  for (const name of secrets) write(name, 'ACTUAL_STAGED_SECRET=placeholder\n');
  write('large.txt', 'x'.repeat(10000)); git('add', '.');
  const result = commitContext(root, 100);
  assert.deepEqual(result.withheldPaths.sort(), secrets.sort());
  assert.doesNotMatch(JSON.stringify(result), /ACTUAL_STAGED_SECRET/);
  assert.equal(result.truncated, true);
  assert.equal(result.complete, false);
  assert.equal(result.changes.find(x => x.path === '.env').patch, null);
});

test('collection from a subdirectory still covers the repository index', t => {
  const { root, git, write } = repository(t);
  write('outside.txt', 'staged outside cwd\n'); write('nested/inside.txt', 'staged inside cwd\n'); git('add', '.');
  const result = commitContext(path.join(root, 'nested'));
  assert.deepEqual(result.changes.map(x => x.path).sort(), ['nested/inside.txt', 'outside.txt']);
});

test('CLI exposes staged evidence without staging or committing', t => {
  const { root, git, write } = repository(t);
  write('app.mjs', 'export const enabled = true;\n'); git('add', '.');
  const before = git('ls-files', '--stage');
  const result = spawnSync(process.execPath, [path.join(ROOT, 'tools/harness.mjs'), 'commit-context', '--workspace', root], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).changes.length, 1);
  assert.equal(git('ls-files', '--stage'), before);
  assert.equal(commitContext(root).head, null);
});

test('an unmerged index is marked incomplete rather than presented as commit-ready', t => {
  const { root, git, write } = repository(t);
  write('conflict.txt', 'base\n'); git('add', '.'); git('commit', '--quiet', '-m', 'test: create merge base');
  const originalBranch = git('branch', '--show-current').trim();
  git('checkout', '--quiet', '-b', 'other');
  write('conflict.txt', 'other\n'); git('add', '.'); git('commit', '--quiet', '-m', 'test: other change');
  git('checkout', '--quiet', originalBranch);
  write('conflict.txt', 'current\n'); git('add', '.'); git('commit', '--quiet', '-m', 'test: current change');
  const merge = spawnSync('git', ['-c', 'user.name=Harness Test', '-c', 'user.email=harness-test@example.invalid', 'merge', '--no-edit', 'other'], { cwd: root, encoding: 'utf8', windowsHide: true });
  assert.equal(merge.status, 1);
  const before = git('ls-files', '--unmerged');
  const result = commitContext(root);
  assert.equal(result.hasConflicts, true);
  assert.equal(result.complete, false);
  assert.equal(git('ls-files', '--unmerged'), before);
});
