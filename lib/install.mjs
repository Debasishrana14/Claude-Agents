import fs from 'node:fs';
import path from 'node:path';
import { assets, atomicWrite, canonical, digest, exists, inside, loadPolicy, lock, now, readJSON, writeJSON } from './core.mjs';
import { executionStatus } from './jobs.mjs';

const START = '<!-- eva-harness:start -->';
const END = '<!-- eva-harness:end -->';
const EVENTS = ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'SubagentStart', 'SubagentStop', 'Stop'];
const HOOK_TAG = ' EVA_HARNESS_HOOK';

function snapshot(file) {
  if (!exists(file)) return null;
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink()) return { kind: 'link', target: fs.readlinkSync(file), directory: fs.statSync(file, { throwIfNoEntry: false })?.isDirectory() ?? true };
  if (stat.isDirectory()) return { kind: 'directory' };
  if (!stat.isFile()) throw new Error(`Unsupported installation target: ${file}`);
  return { kind: 'file', data: fs.readFileSync(file).toString('base64'), mode: stat.mode & 0o777 };
}

function restore(file, value) {
  const current = snapshot(file);
  if (current?.kind === 'directory') {
    // A fresh installation may have acquired unrelated entries since installation.
    if (!value && fs.readdirSync(file).length) return;
    fs.rmdirSync(file); // Empty directories only.
  }
  else if (current) fs.unlinkSync(file); // A junction is unlinked, never traversed.
  if (!value) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (value.kind === 'directory') fs.mkdirSync(file);
  else if (value.kind === 'link') fs.symlinkSync(value.target, file, value.directory ? (process.platform === 'win32' ? 'junction' : 'dir') : 'file');
  else { atomicWrite(file, Buffer.from(value.data, 'base64')); fs.chmodSync(file, value.mode); }
}

function signature(value) {
  // Windows exposes synthetic POSIX permission bits, not the chmod request.
  if (process.platform === 'win32' && value?.kind === 'file') {
    const { mode, ...portable } = value;
    return digest(JSON.stringify(portable));
  }
  return digest(JSON.stringify(value));
}
function importPath(file) { return file.replaceAll('\\', '/').replaceAll(' ', '\\ '); }
function quoted(file) {
  // Hooks use a shell. Refuse characters that are active even inside double quotes.
  if (/["$`\r\n%!]/.test(file)) throw new Error(`Unsupported shell character in installation path: ${file}`);
  return `"${file.replaceAll('\\', '/')}"`;
}

function ownedHook(hook) { return hook?.type === 'command' && typeof hook.command === 'string' && hook.command.endsWith(HOOK_TAG); }

function agreement(existing, source, release) {
  const block = `${START}\n@${importPath(path.join(release, 'CLAUDE.md'))}\n${END}`;
  if (existing.includes(START)) {
    const first = existing.indexOf(START), last = existing.indexOf(END, first);
    if (last < 0 || existing.indexOf(START, first + START.length) >= 0) throw new Error('Malformed existing harness import block');
    return existing.slice(0, first) + block + existing.slice(last + END.length);
  }
  // Migrate only the exact legacy import installed by this repository.
  const legacy = `@${path.join(source, 'CLAUDE.md')}`;
  const normalized = `@${path.join(source, 'CLAUDE.md').replaceAll('\\', '/')}`;
  const lines = existing.split(/\r?\n/).filter(line => line !== legacy && line !== normalized);
  return `${lines.join('\n').trimEnd()}\n\n${block}\n`;
}

export function install(source, home, options = {}) {
  const policy = loadPolicy(source);
  const base = path.join(home, 'eva-harness');
  return lock(base, () => {
    const journalPath = path.join(base, 'installation.json');
    const previous = exists(journalPath) ? readJSON(journalPath) : null;
    const delegation = options.delegation ?? previous?.delegation ?? policy.defaultDelegation ?? 'manual';
    if (!['manual', 'read-only', 'automatic'].includes(delegation)) throw new Error('Delegation must be manual, read-only, or automatic');
    const settingsPath = path.join(home, 'settings.json');
    const existingSettings = exists(settingsPath) ? readJSON(settingsPath) : {};
    if (options.model !== undefined && !['sonnet', 'opus', 'haiku'].includes(options.model)) throw new Error('Model must be sonnet, opus, or haiku');
    // An ordinary install/upgrade must not replace a user's selected model,
    // including a full provider model ID that the alias selector does not expose.
    const model = options.model ?? existingSettings.model ?? previous?.model ?? policy.defaultModel;
    if (typeof model !== 'string' || !model.trim()) throw new Error('Existing model must be a non-empty string; select an explicit --model alias');
    if (previous && previous.status !== 'installed' && previous.status !== 'rolled-back') throw new Error('Interrupted installation: run rollback before installing again');
    const files = assets(source);
    const hashes = Object.fromEntries(files.map(file => [file, digest(fs.readFileSync(path.join(source, file)))]));
    const version = readJSON(path.join(source, 'package.json')).version;
    const id = `${version}-${digest(JSON.stringify(hashes)).slice(0, 12)}`;
    if (previous?.status === 'installed' && previous.releaseId === id && (previous.delegation || 'manual') === delegation && (previous.model || policy.defaultModel) === model) {
      const drift = previous.expected.filter(item => signature(snapshot(item.path)) !== item.signature);
      if (drift.length) throw new Error(`Installation drift: ${drift.map(x => x.path).join(', ')}`);
      for (const [file, hash] of Object.entries(hashes)) {
        if (!exists(path.join(previous.release, file)) || digest(fs.readFileSync(path.join(previous.release, file))) !== hash) throw new Error(`Release was modified: ${file}`);
      }
      return { status: 'already-installed', releaseId: id };
    }
    const release = path.join(base, 'releases', id);
    quoted(release); quoted(process.execPath);
    fs.mkdirSync(release, { recursive: true, mode: 0o700 });
    for (const file of files) {
      const target = path.join(release, file);
      if (exists(target) && digest(fs.readFileSync(target)) !== hashes[file]) throw new Error(`Release was modified: ${target}`);
      if (!exists(target)) atomicWrite(target, fs.readFileSync(path.join(source, file)));
    }
    writeJSON(path.join(release, 'release.json'), { version, releaseId: id, hashes });
    const transaction = { schemaVersion: 1, status: 'installing', at: now(), releaseId: id, release, source, delegation, model, changes: [], previous };
    const save = () => writeJSON(journalPath, transaction);
    save();
    const change = (file, value) => {
      if (!inside(home, path.dirname(file))) throw new Error(`Installation escaped config directory: ${file}`);
      const before = snapshot(file);
      transaction.changes.push({ path: file, before, after: value });
      save(); // Persist intent before mutation so an interrupted install can be recovered.
      restore(file, value);
    };
    try {
      for (const group of ['agents', 'skills', 'rules', 'departments']) {
        const relative = ['agents', 'skills'].includes(group) ? group : `.claude/${group}`;
        const sourceDirectory = path.join(source, relative);
        const releaseDirectory = path.join(release, relative);
        const directory = path.join(home, group);
        const initial = snapshot(directory);
        if (initial?.kind === 'link') {
          if (canonical(directory) !== canonical(sourceDirectory)) throw new Error(`Foreign linked directory: ${directory}; inspect manual legacy links before migration`);
          const children = fs.readdirSync(directory);
          change(directory, { kind: 'directory' });
          for (const name of children) {
            const target = path.join(sourceDirectory, name);
            change(path.join(directory, name), fs.statSync(target).isDirectory() ? { kind: 'link', target, directory: true } : snapshot(target));
          }
        } else if (!initial) change(directory, { kind: 'directory' });
        else if (initial.kind !== 'directory') throw new Error(`Expected directory: ${directory}`);
        const names = exists(releaseDirectory) ? fs.readdirSync(releaseDirectory) : [];
        // Retire removed owned assets during upgrades; never remove user edits.
        for (const old of previous?.expected || []) {
          if (path.dirname(old.path) !== directory || names.includes(path.basename(old.path))) continue;
          const before = snapshot(old.path);
          if (!before || before.kind === 'directory') continue;
          if (signature(before) !== old.signature) throw new Error(`Removed harness asset was edited; preserve or move it before upgrading: ${old.path}`);
          change(old.path, null);
        }
        for (const name of names) {
          const target = path.join(directory, name);
          const before = snapshot(target);
          const oldOwned = previous?.expected?.some(x => x.path === target && x.signature === signature(before));
          const sourceTarget = path.join(sourceDirectory, name);
          const legacyOwned = (before?.kind === 'link' && canonical(target) === canonical(sourceTarget)) || (before?.kind === 'file' && before.data === snapshot(sourceTarget)?.data);
          if (before && !oldOwned && !legacyOwned) throw new Error(`Refusing to replace existing unmanaged content: ${target}`);
          const released = path.join(releaseDirectory, name);
          change(target, fs.statSync(released).isDirectory() ? { kind: 'link', target: released, directory: true } : snapshot(released));
        }
      }
      const agreementFile = path.join(home, 'CLAUDE.md');
      const existing = exists(agreementFile) ? fs.readFileSync(agreementFile, 'utf8') : '';
      change(agreementFile, { kind: 'file', data: Buffer.from(agreement(existing, source, release)).toString('base64'), mode: 0o600 });
      const settings = existingSettings;
      settings.model = model;
      settings.permissions ??= {};
      // Read-only mode preserves original launch restrictions. Automatic mode
      // explicitly removes launch asks while retaining other permission rules.
      let oldest = previous;
      while (oldest?.previous) oldest = oldest.previous;
      const original = oldest?.changes?.find(x => x.path === settingsPath)?.before;
      const originalSettings = original?.kind === 'file' ? JSON.parse(Buffer.from(original.data, 'base64').toString('utf8').replace(/^\uFEFF/, '')) : original === null ? {} : null;
      const lastExpected = previous?.expected?.find(x => x.path === settingsPath);
      const unchanged = lastExpected && lastExpected.signature === signature(snapshot(settingsPath));
      const originalAsks = originalSettings?.permissions?.ask || [];
      let asks = settings.permissions.ask || [];
      const agentRule = rule => /^(?:Agent|Task)(?:\(.*\))?$/.test(rule);
      // Selecting automatic explicitly authorizes removal of delegation-only asks,
      // including earlier per-role user rules. Other permissions are retained.
      if (delegation === 'automatic') asks = asks.filter(rule => !agentRule(rule));
      if (delegation === 'read-only' && unchanged && originalSettings) asks = asks.filter(rule => !['Agent', 'Task'].includes(rule) || originalAsks.includes(rule));
      const managedAsks = policy.permissions.ask.filter(rule => delegation === 'manual' || !['Agent', 'Task'].includes(rule));
      settings.permissions.ask = [...new Set([...asks, ...managedAsks])];
      settings.permissions.deny = [...new Set([...(settings.permissions.deny || []), ...policy.permissions.deny])];
      if (delegation === 'read-only') settings.permissions.allow = [...new Set([...(settings.permissions.allow || []), 'Agent(research)', 'Agent(debugger)', 'Agent(reviewer)'])];
      if (delegation === 'automatic') settings.permissions.allow = [...new Set([...(settings.permissions.allow || []), 'Agent', 'Task'])];
      settings.hooks ??= {};
      for (const event of EVENTS) {
        const existingGroups = (settings.hooks[event] || []).map(group => ({ ...group, hooks: group.hooks.filter(hook => !ownedHook(hook)) })).filter(group => group.hooks.length);
        const command = `${quoted(process.execPath)} ${quoted(path.join(release, 'tools', 'hook.mjs'))} --home ${quoted(home)}${HOOK_TAG}`;
        const matcher = event === 'PreToolUse' ? 'Read|Edit|Write|NotebookEdit|Agent|Task' : undefined;
        settings.hooks[event] = [...existingGroups, { ...(matcher ? { matcher } : {}), hooks: [{ type: 'command', command, timeout: 10 }] }];
      }
      change(settingsPath, { kind: 'file', data: Buffer.from(`${JSON.stringify(settings, null, 2)}\n`).toString('base64'), mode: 0o600 });
      // Only record the final state of each path, including directories created here.
      transaction.expected = [...new Set(transaction.changes.map(x => x.path))].map(file => ({ path: file, signature: signature(snapshot(file)) }));
      transaction.status = 'installed'; save();
      return { status: 'installed', releaseId: id, release, home, delegation, model, restartRequired: true };
    } catch (error) {
      for (const item of [...transaction.changes].reverse()) restore(item.path, item.before);
      if (previous) writeJSON(journalPath, previous); else { transaction.status = 'rolled-back'; save(); }
      throw error;
    }
  });
}

// Deliberately unwind the recorded chain rather than guessing ownership from
// filenames. Each rollback retains its drift checks and interruption journal.
export function uninstall(home) {
  const journal = path.join(home, 'eva-harness', 'installation.json');
  let reverted = 0;
  while (exists(journal) && readJSON(journal).status !== 'rolled-back') {
    rollback(home);
    reverted += 1;
  }
  return { status: 'uninstalled', transactionsReverted: reverted, restartRequired: true, retained: 'Local task records, receipts, and release backups' };
}

export function rollback(home) {
  const base = path.join(home, 'eva-harness');
  return lock(base, () => {
    const journalPath = path.join(base, 'installation.json');
    const transaction = readJSON(journalPath);
    if (transaction.status === 'rolled-back') return { status: 'already-rolled-back' };
    if (transaction.status === 'installed') {
      const drift = transaction.expected.filter(item => signature(snapshot(item.path)) !== item.signature);
      if (drift.length) throw new Error(`Rollback would overwrite changes: ${drift.map(x => x.path).join(', ')}`);
    }
    for (const item of transaction.changes.filter(x => x.before?.kind === 'link' && x.after?.kind === 'directory')) {
      if (snapshot(item.path)?.kind !== 'directory') continue;
      const known = new Set(transaction.changes.filter(x => path.dirname(x.path) === item.path).map(x => path.basename(x.path)));
      if (fs.readdirSync(item.path).some(name => !known.has(name))) throw new Error(`New entries would be hidden by the old junction: ${item.path}`);
    }
    transaction.status = 'rolling-back';
    transaction.rollbackIndex ??= 0;
    writeJSON(journalPath, transaction);
    const reverse = [...transaction.changes].reverse();
    for (let index = transaction.rollbackIndex; index < reverse.length; index++) {
      const item = reverse[index];
      if (!path.resolve(item.path).startsWith(path.resolve(home) + path.sep)) throw new Error('Invalid rollback journal path');
      const current = signature(snapshot(item.path));
      if (current !== signature(item.after) && current !== signature(item.before) && snapshot(item.path) !== null) throw new Error(`Interrupted operation conflicts with current content: ${item.path}`);
      restore(item.path, item.before);
      transaction.rollbackIndex = index + 1;
      writeJSON(journalPath, transaction);
    }
    if (transaction.previous) writeJSON(journalPath, transaction.previous);
    else writeJSON(journalPath, { ...transaction, status: 'rolled-back' });
    return { status: 'rolled-back', releaseId: transaction.releaseId, restartRequired: true };
  });
}

export function doctor(source, home) {
  const results = [];
  const add = (level, check, detail) => results.push({ level, check, detail });
  try { loadPolicy(source); add('pass', 'policy', 'Policy is valid'); } catch (e) { add('fail', 'policy', e.message); }
  const journalPath = path.join(home, 'eva-harness', 'installation.json');
  if (!exists(journalPath)) { add('fail', 'installation', 'Not installed: run install'); return results; }
  const state = readJSON(journalPath);
  add(state.status === 'installed' ? 'pass' : 'fail', 'installation', `${state.status}: ${state.releaseId}`);
  if (state.status !== 'installed') return results;
  for (const item of state.expected) {
    try { add(signature(snapshot(item.path)) === item.signature ? 'pass' : 'fail', 'installed asset', item.path); }
    catch (e) { add('fail', 'installed asset', e.message); }
  }
  const release = readJSON(path.join(state.release, 'release.json'));
  for (const [file, hash] of Object.entries(release.hashes)) {
    if (!exists(path.join(state.release, file)) || digest(fs.readFileSync(path.join(state.release, file))) !== hash) add('fail', 'release integrity', file);
  }
  if (!results.some(x => x.check === 'release integrity')) add('pass', 'release integrity', state.releaseId);
  const settings = readJSON(path.join(home, 'settings.json'));
  add(settings.model === (state.model || loadPolicy(source).defaultModel) ? 'pass' : 'fail', 'model', settings.model);
  add(settings.disableAllHooks ? 'fail' : 'pass', 'hooks enabled', settings.disableAllHooks ? 'Hooks are disabled' : 'User settings enable hooks; managed settings may override');
  add(settings.permissions?.defaultMode === 'bypassPermissions' ? 'fail' : 'pass', 'permission mode', settings.permissions?.defaultMode || 'default; session flags and managed settings may override');
  add('pass', 'delegation profile', state.delegation || 'manual');
  if (state.delegation === 'read-only' && (settings.permissions?.ask || []).some(x => ['Agent', 'Task'].includes(x))) add('warn', 'native delegation restriction', 'A preserved user Agent/Task ask still requires native approval; the read-only profile does not override it');
  const sessions = path.join(home, 'eva-harness', 'state', 'sessions');
  const receipts = exists(sessions) ? fs.readdirSync(sessions).filter(x => x.endsWith('.jsonl')) : [];
  add(receipts.length ? 'pass' : 'warn', 'runtime evidence', receipts.length ? `${receipts.length} session logs; inspect status for recent hook events` : 'No hook receipts yet. Restart Claude Code and send a prompt; installation alone does not prove activation.');
  const execution = executionStatus(home);
  add(execution.ready ? 'pass' : 'warn', 'isolated execution', execution.ready ? 'Local Docker engine advertises required limits and an image policy is configured; inspect policy and integration evidence before relying on isolation' : 'Docker execution is not ready. Run execution-status; host commands remain a separate explicitly authorized path.');
  return results;
}
