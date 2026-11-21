import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { canonical, digest, exists, inside, loadPolicy, lock, now, readJSON, route, writeJSON } from './core.mjs';

const stateDir = home => path.join(home, 'eva-harness', 'state');
const sessionKey = id => digest(String(id)).slice(0, 32);
function activeDelegation(home, fallback = 'manual') {
  const file = path.join(home, 'eva-harness', 'installation.json');
  if (!exists(file)) return fallback;
  const installed = readJSON(file);
  return installed.status === 'installed' && ['read-only', 'automatic'].includes(installed.delegation) ? installed.delegation : 'manual';
}
export function fingerprint(workspace) {
  const git = spawnSync('git', ['-c', 'core.fsmonitor=false', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: workspace, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, windowsHide: true, timeout: 10000 });
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
    const skill = input.tool_name === 'Skill' ? input.tool_input?.skill : null;
    if (typeof skill === 'string' && /^[a-z0-9][a-z0-9:_-]{0,127}$/i.test(skill)) item.skill = skill;
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

export function beginTask(home, workspace, title, mode = 'dev-mode', session) {
  if (typeof title !== 'string' || !title.trim() || title.length > 500) throw new Error('Task title must contain 1 to 500 characters');
  if (!['dev-mode', 'debug-mode', 'research-dev-mode', 'target-mode', 'coordinate-work', 'manual-qa', 'commit-message', 'legacy-naming', 'review-change'].includes(mode)) throw new Error('Invalid task mode');
  if (session !== undefined && !/^[a-f0-9]{32}$/.test(session)) throw new Error('Invalid session binding');
  const task = { schemaVersion: 1, id: crypto.randomUUID(), title, workspace: canonical(workspace), mode, ...(session ? { session } : {}), status: 'running', createdAt: now(), updatedAt: now(), revision: 0, checkpoints: [], checks: [] };
  writeJSON(taskFile(home, task.id), task);
  return task;
}

export function listTasks(home, workspace) {
  const directory = path.join(stateDir(home), 'tasks');
  if (!exists(directory)) return [];
  return fs.readdirSync(directory).filter(x => /^[a-f0-9-]{36}\.json$/.test(x)).map(x => readJSON(path.join(directory, x))).filter(x => !workspace || x.workspace === canonical(workspace)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getTask(home, id) {
  return readJSON(taskFile(home, id));
}

export function defineTask(home, id, criteria, requiredChecks, checkCommands = {}) {
  if (!Array.isArray(criteria) || !criteria.length || criteria.length > 30 || criteria.some(x => typeof x !== 'string' || !x.trim() || x.length > 1000)) throw new Error('Define 1 to 30 acceptance criteria');
  if (!Array.isArray(requiredChecks) || requiredChecks.length > 30 || requiredChecks.some(x => !/^[a-z][a-z0-9-]{0,39}$/.test(x)) || new Set(requiredChecks).size !== requiredChecks.length) throw new Error('Required checks need unique lowercase labels');
  if (!checkCommands || typeof checkCommands !== 'object' || Array.isArray(checkCommands)) throw new Error('Invalid configured check commands');
  for (const [label, argv] of Object.entries(checkCommands)) {
    if (!requiredChecks.includes(label) || !Array.isArray(argv) || !argv.length || argv.some(x => typeof x !== 'string' || !x)) throw new Error('Configured commands must match required check labels');
  }
  return updateTask(home, id, task => {
    if (task.status !== 'running') throw new Error('Resume the task before defining its contract');
    task.revision += 1;
    task.contract = { criteria, requiredChecks, checkCommands, at: now() };
    task.checkpoints.push({ at: now(), revision: task.revision, note: 'Acceptance criteria and required checks updated', contract: task.contract });
  });
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

export function checkpoint(home, id, note, status = 'running', session) {
  if (!['running', 'paused', 'blocked', 'cancelled'].includes(status)) throw new Error('Invalid checkpoint status');
  if (!note?.trim() || note.length > 4000) throw new Error('A checkpoint needs a note of at most 4000 characters');
  if (session !== undefined && !/^[a-f0-9]{32}$/.test(session)) throw new Error('Invalid session binding');
  return updateTask(home, id, task => {
    if (['completed', 'cancelled'].includes(task.status)) throw new Error('Task is closed');
    task.status = status;
    if (session) task.session = session;
    task.revision += 1;
    task.checkpoints.push({ at: now(), revision: task.revision, note });
  });
}

export function runCheck(home, id, argv, policy, label = 'default') {
  if (!argv.length || argv.some(x => typeof x !== 'string')) throw new Error('Provide a check command after --');
  if (!/^[a-z][a-z0-9-]{0,39}$/.test(label)) throw new Error('Invalid check label');
  return updateTask(home, id, task => {
    if (task.status !== 'running') throw new Error('Resume the task before checking');
    const configured = task.contract?.checkCommands && Object.hasOwn(task.contract.checkCommands, label) ? task.contract.checkCommands[label] : undefined;
    if (configured && JSON.stringify(configured) !== JSON.stringify(argv)) throw new Error(`Command does not match the recorded project check: ${label}`);
    const started = now();
    const before = fingerprint(task.workspace);
    // Direct argv execution, never a shell. Windows .cmd wrappers require an explicit executable such as node.
    const result = spawnSync(argv[0], argv.slice(1), { cwd: task.workspace, shell: false, timeout: policy.maxCheckSeconds * 1000, maxBuffer: 1024 * 1024, windowsHide: true, encoding: 'utf8' });
    const after = fingerprint(task.workspace);
    const check = { at: started, label, revision: task.revision, fingerprint: after, commandHash: digest(JSON.stringify(argv)), exitCode: result.status, passed: result.status === 0 && !result.error && before === after, changedWorkspace: before !== after, signal: result.signal, errorCode: result.error?.code || null };
    task.checks.push(check);
    return { taskId: id, check, stdout: result.stdout || '', stderr: result.stderr || '' };
  });
}

export function completeTask(home, id, summary, skipReason, acceptanceNote) {
  if (!summary?.trim()) throw new Error('Completion needs a summary');
  return updateTask(home, id, task => {
    if (task.status !== 'running') throw new Error('Only running tasks can complete');
    const state = fingerprint(task.workspace);
    const current = task.checks.filter(x => x.revision === task.revision && x.fingerprint === state);
    if (current.some(x => !x.passed)) throw new Error('Current revision has failed checks; fix it, checkpoint, and rerun checks');
    const missing = (task.contract?.requiredChecks || []).filter(label => !current.some(x => x.label === label && x.passed));
    if (missing.length) throw new Error(`Missing required checks for current source: ${missing.join(', ')}`);
    if (task.contract && !acceptanceNote?.trim()) throw new Error('Contracted tasks need --acceptance-note describing the actual acceptance review');
    if (!current.some(x => x.passed) && !skipReason?.trim()) throw new Error('Run a check or give an explicit --skip-reason; missing evidence cannot be reported as verified');
    task.status = 'completed';
    task.outcome = { summary, validation: current.length ? 'passed' : 'unverified', ...(skipReason ? { skipReason } : {}), ...(acceptanceNote ? { acceptanceReview: acceptanceNote } : {}) };
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
  const cli = `node "${path.join(root, 'tools', 'harness.mjs').replaceAll('\\', '/')}" --home "${home.replaceAll('\\', '/')}" --session ${sessionKey(input.session_id)}`;
  if (event === 'SessionStart') {
    prune(home, policy);
    audit(home, input, policy, { release: readJSON(path.join(root, 'package.json')).version });
    const active = listTasks(home, input.cwd).filter(x => ['running', 'paused', 'blocked'].includes(x.status));
    const delegation = activeDelegation(home, policy.defaultDelegation || 'manual');
    return context(`EVA harness v${readJSON(path.join(root, 'package.json')).version} hook is active. Delegation profile: ${delegation}. ${delegation === 'automatic' ? 'Use bounded reader and writer agents within the authorized task without per-agent approval. Assign exact scope and disjoint write ownership; native tool permissions still apply.' : delegation === 'read-only' ? 'Bounded research/debugger/reviewer workers may be used within the authorized task; writer agents still require explicit approval. Native permissions may impose additional approval.' : 'Every agent launch needs explicit approval.'} Workflow routing is advisory; follow the full request. Runtime CLI: ${cli}. Use "project-context" to discover local guidance, scripts and the optional .eva-harness.json contract without executing them. Use "help" for syntax, "task list" for workspace tasks, and "task show ID" to inspect a checkpoint. Use "commit-context" for staged-only evidence. For substantial changes, begin a task and define acceptance criteria plus named required checks with "task define"; use "task check --label NAME" and complete with an acceptance note. Checkpoint before compaction/interruption. Do not store secrets in notes. ${active.length ? `Unfinished task IDs (inspect before resuming): ${active.map(x => x.id).join(', ')}. Resume only if the request continues that work.` : 'No unfinished task records in this workspace.'}`);
  }
  if (event === 'UserPromptSubmit') {
    const routing = route(String(input.prompt || ''));
    audit(home, input, policy, { mode: routing.mode });
    return context(`EVA routing suggestion: ${routing.mode} (${routing.reason}). Explicit user intent wins. ${routing.mode === 'conversation' ? 'Answer directly; do not create task records for ordinary questions.' : `Use /${routing.mode} when it fits the request. Delegation follows the active profile; workflow selection does not authorize production changes, commits, publication, or deployments.`}`);
  }
  if (event === 'PreToolUse') {
    if (['Agent', 'Task'].includes(input.tool_name)) {
      const delegation = activeDelegation(home, policy.defaultDelegation || 'manual');
      const worker = input.tool_input?.subagent_type;
      const needsApproval = delegation === 'manual' || (delegation === 'read-only' && !['research', 'debugger', 'reviewer'].includes(worker));
      audit(home, input, policy, { decision: needsApproval ? 'ask' : 'defer' });
      if (needsApproval) return { hookSpecificOutput: { hookEventName: event, permissionDecision: 'ask', permissionDecisionReason: 'This agent launch needs approval under the active EVA delegation profile' } };
      return {};
    }
    const reason = fileDecision(input, home);
    audit(home, input, policy, { decision: reason ? 'deny' : 'defer' });
    if (reason) return { hookSpecificOutput: { hookEventName: event, permissionDecision: 'deny', permissionDecisionReason: reason } };
    // Never return "allow": native permissions still decide.
    return {};
  }
  if (event === 'Stop') {
    const unfinished = listTasks(home, input.cwd).filter(task => task.session === sessionKey(input.session_id) && task.status === 'running' && task.contract);
    const block = unfinished.length > 0 && !input.stop_hook_active;
    audit(home, input, policy, { completionGate: block ? 'reminder' : unfinished.length ? 'loop-protection' : 'clear' });
    if (block) return { decision: 'block', reason: `Contracted task(s) still running: ${unfinished.map(x => x.id).join(', ')}. Inspect their acceptance criteria and required checks, then complete with actual evidence. If work is unfinished, save a paused/blocked checkpoint with the reason and report the limitation. Do not claim verified completion without evidence.` };
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
  return {
    workspace,
    activation: {
      sessionStartSeen: events.some(x => x.event === 'SessionStart'),
      promptRoutingSeen: events.some(x => x.event === 'UserPromptSubmit'),
      skillsObserved: [...new Set(events.filter(x => x.event === 'PostToolUse' && x.skill).map(x => x.skill))].sort(),
      deniedToolCalls: events.filter(x => x.event === 'PreToolUse' && x.decision === 'deny').length,
      lastEventAt: events[0]?.at || null
    },
    recentEvents: events.slice(0, 20),
    tasks: listTasks(home, workspace)
  };
}
