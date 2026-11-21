import { spawnSync } from 'node:child_process';
import { digest, isSensitivePath } from './core.mjs';

function git(cwd, args, maxBuffer = 4 * 1024 * 1024) {
  return spawnSync('git', ['-c', 'core.fsmonitor=false', '-c', 'log.showSignature=false', '--literal-pathspecs', ...args], {
    cwd, encoding: 'utf8', shell: false, windowsHide: true, maxBuffer, timeout: 15000
  });
}

function required(cwd, args) {
  const result = git(cwd, args);
  if (result.error || result.status !== 0) throw new Error(`Cannot inspect staged Git changes: ${result.error?.message || result.stderr.trim()}`);
  return result.stdout;
}

function parseStatuses(raw) {
  const tokens = raw.split('\0');
  const changes = [];
  for (let index = 0; index < tokens.length && tokens[index];) {
    const status = tokens[index++];
    const first = tokens[index++];
    if (!first) throw new Error('Incomplete staged name-status output');
    if (/^[RC]/.test(status)) {
      const second = tokens[index++];
      if (!second) throw new Error('Incomplete staged rename/copy output');
      changes.push({ status, oldPath: first, path: second });
    } else changes.push({ status, path: first });
  }
  return changes;
}

export function commitContext(workspace, maxPatchBytes = 64000) {
  if (!Number.isSafeInteger(maxPatchBytes) || maxPatchBytes < 1 || maxPatchBytes > 1024 * 1024) throw new Error('Patch limit must be between 1 and 1048576 bytes');
  const root = required(workspace, ['rev-parse', '--show-toplevel']).trim();
  const diffArgs = ['diff', '--cached', '--no-ext-diff', '--no-textconv', '--find-renames'];
  const rawArgs = [...diffArgs, '--raw', '--no-abbrev', '-z', '--'];
  const before = required(root, rawArgs);
  const head = git(root, ['rev-parse', '--verify', 'HEAD']);
  const changes = parseStatuses(required(root, [...diffArgs, '--name-status', '-z', '--']));
  const conflicts = required(root, ['ls-files', '--unmerged', '-z']);
  const context = {
    repository: root,
    basis: 'Git index; unstaged and untracked contents are excluded',
    head: head.status === 0 ? head.stdout.trim() : null,
    indexFingerprint: digest(before),
    recentSubjects: head.status === 0 ? required(root, ['log', '-8', '--format=%s']).trimEnd().split('\n') : [],
    hasConflicts: Boolean(conflicts),
    changes: [],
    withheldPaths: [],
    truncated: false,
    stable: true,
    complete: true
  };
  let remaining = maxPatchBytes;
  for (const change of changes) {
    const paths = [change.oldPath, change.path].filter(Boolean);
    if (paths.some(isSensitivePath)) {
      context.withheldPaths.push(...paths.filter(isSensitivePath));
      context.changes.push({ ...change, patch: null, withheld: true });
      continue;
    }
    if (remaining <= 0) { context.changes.push({ ...change, patch: null, truncated: true }); context.truncated = true; continue; }
    const result = git(root, [...diffArgs, '--no-color', '--', ...paths]);
    if (result.error && result.error.code !== 'ENOBUFS') throw new Error(`Cannot read staged patch: ${result.error.message}`);
    if (!result.error && result.status !== 0) throw new Error(`Cannot read staged patch: ${result.stderr.trim()}`);
    const bytes = Buffer.from(result.stdout || '', 'utf8');
    const truncated = bytes.length > remaining || Boolean(result.error);
    const patch = truncated ? bytes.subarray(0, remaining).toString('utf8') : result.stdout;
    context.changes.push({ ...change, patch, ...(truncated ? { truncated: true } : {}) });
    remaining -= Math.min(bytes.length, remaining);
    context.truncated ||= truncated;
  }
  const afterHead = git(root, ['rev-parse', '--verify', 'HEAD']);
  context.stable = before === required(root, rawArgs) && context.head === (afterHead.status === 0 ? afterHead.stdout.trim() : null);
  context.complete = context.stable && !context.hasConflicts && !context.truncated && !context.withheldPaths.length;
  return context;
}
