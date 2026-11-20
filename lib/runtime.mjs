import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { canonical, digest, exists, inside, loadPolicy, lock, now, readJSON, route, writeJSON } from './core.mjs';

const stateDir = home => path.join(home, 'eva-harness', 'state');
const sessionKey = id => digest(String(id)).slice(0, 32);
export function fingerprint(workspace) {
  const git = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: workspace, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, windowsHide: true });
  let names;
  if (git.status === 0) names = [...new Set(git.stdout.split('\0').filter(Boolean))].sort();
  else {
    names = [];
    const walk = relative => {
      for (const entry of fs.readdirSync(path.join(workspace, relative), { withFileTypes: true })) {
        if (['.git', 'node_modules', '.scratch'].includes(entry.name) || (relative === '.claude' && entry.name === 'state')) continue;
        const name = path.join(relative, entry.name);
        if (entry.isDirectory()) walk(name); else names.push(name);
      }
    };
    walk(''); names.sort();
  }
  const hash = crypto.createHash('sha256');
  for (const name of names) {
    const file = path.join(workspace, name);
    hash.update(name).update('\0');
    if (!exists(file)) hash.update('deleted');
    else if (fs.lstatSync(file).isSymbolicLink()) hash.update(`link:${fs.readlinkSync(file)}`);
    else if (fs.statSync(file).isFile()) hash.update(fs.readFileSync(file));
    else hash.update('directory');
    hash.update('\0');
  }
  return hash.digest('hex');
}
const taskFile = (home, id) => {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid task id');
  return path.join(stateDir(home), 'tasks', `${id}.json`);
};

export function audit(home, input, policy, extra = {}) {
  if (typeof input.session_id !== 'string' || !input.session_id) throw new Error('Missing session_id');
  const key = sessionKey(input.session_id);
  const directory = path.join(stateDir(home), 'sessions', key);
  return lock(directory, () => {
    const file = path.join(stateDir(home), 'sessions', `${key}.jsonl`);
    const counterFile = path.join(directory, 'count.json');
    const count = exists(counterFile) ? readJSON(counterFile).count : 0;
    if (count >= policy.maxEventsPerSession) return;
    // Never persist prompts, commands, file contents, transcript paths, tool results, or credentials.
    const item = { at: now(), event: input.hook_event_name, session: key, workspace: digest(canonical(input.cwd || process.cwd())).slice(0, 16), ...extra };
    if (typeof input.tool_name === 'string') item.tool = input.tool_name.slice(0, 100);
    if (typeof input.agent_type === 'string') item.agent = input.agent_type.slice(0, 100);
    fs.appendFileSync(file, `${JSON.stringify(item)}\n`, { mode: 0o600 });
    writeJSON(counterFile, { count: count + 1 });
  });
}

export function prune(home, policy) {
  const directory = path.join(stateDir(home), 'sessions');
  if (!exists(directory)) return;
  const cutoff = Date.now() - policy.retentionDays * 86400000;
  for (const name of fs.readdirSync(directory)) {
    if (!/^[a-f0-9]{32}\.jsonl$/.test(name)) continue;
    const file = path.join(directory, name);
    if (fs.statSync(file).mtimeMs < cutoff) fs.unlinkSync(file);
  }
}

export function beginTask(home, workspace, title, mode = 'dev-mode') {
  if (typeof title !== 'string' || !title.trim() || title.length > 500) throw new Error('Task title must contain 1 to 500 characters');
  if (!['dev-mode', 'debug-mode', 'research-dev-mode', 'target-mode', 'coordinate-work'].includes(mode)) throw new Error('Invalid task mode');
  const task = { schemaVersion: 1, id: crypto.randomUUID(), title, workspace: canonical(workspace), mode, status: 'running', createdAt: now(), updatedAt: now(), revision: 0, checkpoints: [], checks: [] };
  writeJSON(taskFile(home, task.id), task);
  return task;
}

export function listTasks(home, workspace) {
  const directory = path.join(stateDir(home), 'tasks');
  if (!exists(directory)) return [];
  return fs.readdirSync(directory).filter(x => /^[a-f0-9-]{36}\.json$/.test(x)).map(x => readJSON(path.join(directory, x))).filter(x => !workspace || x.workspace === canonical(workspace)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function updateTask(home, id, operation) {
  const file = taskFile(home, id);
  return lock(`${file}.lockdir`, () => {
    const task = readJSON(file);
    const result = operation(task);
    task.updatedAt = now();
    writeJSON(file, task);
    return result ?? task;
  });
}

export function checkpoint(home, id, note, status = 'running') {
  if (!['running', 'paused', 'blocked', 'cancelled'].includes(status)) throw new Error('Invalid checkpoint status');
  if (!note?.trim() || note.length > 4000) throw new Error('A checkpoint needs a note of at most 4000 characters');
  return updateTask(home, id, task => {
    if (['completed', 'cancelled'].includes(task.status)) throw new Error('Task is closed');
    task.status = status;
    task.revision += 1;
    task.checkpoints.push({ at: now(), revision: task.revision, note });
  });
}

export function runCheck(home, id, argv, policy) {
  if (!argv.length || argv.some(x => typeof x !== 'string')) throw new Error('Provide a check command after --');
  return updateTask(home, id, task => {
    if (task.status !== 'running') throw new Error('Resume the task before checking');
    const started = now();
    const before = fingerprint(task.workspace);
    // Direct argv execution, never a shell. Windows .cmd wrappers require an explicit executable such as node.
    const result = spawnSync(argv[0], argv.slice(1), { cwd: task.workspace, shell: false, timeout: policy.maxCheckSeconds * 1000, maxBuffer: 1024 * 1024, windowsHide: true, encoding: 'utf8' });
    const after = fingerprint(task.workspace);
    const check = { at: started, revision: task.revision, fingerprint: after, commandHash: digest(JSON.stringify(argv)), exitCode: result.status, passed: result.status === 0 && !result.error && before === after, changedWorkspace: before !== after, signal: result.signal, errorCode: result.error?.code || null };
    task.checks.push(check);
    return { taskId: id, check, stdout: result.stdout || '', stderr: result.stderr || '' };
  });
}

export function completeTask(home, id, summary, skipReason) {
  if (!summary?.trim()) throw new Error('Completion needs a summary');
  return updateTask(home, id, task => {
    if (task.status !== 'running') throw new Error('Only running tasks can complete');
    const state = fingerprint(task.workspace);
    const current = task.checks.filter(x => x.revision === task.revision && x.fingerprint === state);
    if (current.some(x => !x.passed)) throw new Error('Current revision has failed checks; fix it, checkpoint, and rerun checks');
    if (!current.some(x => x.passed) && !skipReason?.trim()) throw new Error('Run a check or give an explicit --skip-reason; missing evidence cannot be reported as verified');
    task.status = 'completed';
    task.outcome = { summary, validation: current.length ? 'passed' : 'unverified', ...(skipReason ? { skipReason } : {}) };
  });
}

function fileDecision(input, home) {
  const tool = input.tool_name;
  if (!['Read', 'Edit', 'Write', 'NotebookEdit'].includes(tool)) return null;
  const file = input.tool_input?.file_path || input.tool_input?.notebook_path;
  if (typeof file !== 'string' || !file) return 'File tool input is missing a path';
  const workspace = path.resolve(input.cwd || process.cwd());
  const target = path.resolve(workspace, file);
  const resolved = canonical(target);
  const secretName = name => /^\.env(?:\.|$)/i.test(name) || name.toLowerCase() === '.credentials.json';
  if (secretName(path.basename(target)) || secretName(path.basename(resolved))) return 'Secret-file access is blocked by the EVA harness';
  if (tool === 'Read') return null;
  if (!inside(workspace, target)) return 'Direct file writes must stay inside the current workspace (including symlink targets)';
  if (inside(path.join(home, 'eva-harness'), target) || [target, resolved].some(file => file.split(path.sep).some(part => part.toLowerCase() === '.git'))) return 'Direct writes to harness state/releases or Git internals are blocked';
  return null;
}

export function handleHook(root, home, input) {
  const policy = loadPolicy(root);
  const event = input.hook_event_name;
  const context = text => ({ hookSpecificOutput: { hookEventName: event, additionalContext: text } });
  const cli = `node "${path.join(root, 'tools', 'harness.mjs').replaceAll('\\', '/')}" --home "${home.replaceAll('\\', '/')}"`;
  if (event === 'SessionStart') {
    prune(home, policy);
    audit(home, input, policy, { release: readJSON(path.join(root, 'package.json')).version });
    const active = listTasks(home, input.cwd).filter(x => ['running', 'paused', 'blocked'].includes(x.status));
    return context(`EVA harness v${readJSON(path.join(root, 'package.json')).version} hook is active. Workflow routing is advisory; follow the user's full intent and any explicit mode. Runtime CLI: ${cli}. For multi-step implementation use task begin, checkpoint, check and complete; save a checkpoint before compaction or interruption. Do not store secrets in task notes. ${active.length ? `Unfinished task IDs (inspect before resuming): ${active.map(x => x.id).join(', ')}. Resume only if the current request continues that work.` : 'No unfinished task records in this workspace.'}`);
  }
  if (event === 'UserPromptSubmit') {
    const routing = route(String(input.prompt || ''));
    audit(home, input, policy, { mode: routing.mode });
    return context(`EVA routing suggestion: ${routing.mode} (${routing.reason}). Explicit user intent wins. ${routing.mode === 'conversation' ? 'Answer directly; do not create task records for ordinary questions.' : `Use /${routing.mode} when it fits the request. Automatic workflow selection does not authorize agent delegation, production changes, commits, publication, or deployments.`}`);
  }
  if (event === 'PreToolUse') {
    const reason = fileDecision(input, home);
    audit(home, input, policy, { decision: reason ? 'deny' : 'defer' });
    if (reason) return { hookSpecificOutput: { hookEventName: event, permissionDecision: 'deny', permissionDecisionReason: reason } };
    // Never return "allow": native permissions still decide.
    return {};
  }
  audit(home, input, policy);
  return {};
}

export function status(home, workspace) {
  const directory = path.join(stateDir(home), 'sessions');
  const workspaceHash = digest(canonical(workspace)).slice(0, 16);
  const files = exists(directory) ? fs.readdirSync(directory).filter(x => x.endsWith('.jsonl')) : [];
  const events = files.flatMap(file => fs.readFileSync(path.join(directory, file), 'utf8').trim().split('\n').filter(Boolean).map(line => { try { return JSON.parse(line); } catch { return null; } })).filter(x => x?.workspace === workspaceHash).sort((a, b) => b.at.localeCompare(a.at));
  return { workspace, recentEvents: events.slice(0, 20), tasks: listTasks(home, workspace) };
}
