import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const digest = value => crypto.createHash('sha256').update(value).digest('hex');
export const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
export const configHome = () => path.resolve(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'));
export const now = () => new Date().toISOString();

export function atomicWrite(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temp, value, { mode: 0o600, flag: 'wx' });
    fs.renameSync(temp, file);
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}

export const writeJSON = (file, value) => atomicWrite(file, `${JSON.stringify(value, null, 2)}\n`);
export function exists(file) {
  try { fs.lstatSync(file); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; }
}

export function canonical(file) {
  const absolute = path.resolve(file);
  if (exists(absolute)) return fs.realpathSync(absolute);
  const parent = path.dirname(absolute);
  return parent === absolute ? absolute : path.join(canonical(parent), path.basename(absolute));
}

export function inside(parent, child) {
  const relative = path.relative(canonical(parent), canonical(child));
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

export function lock(directory, operation) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const file = path.join(directory, '.lock');
  let fd;
  const deadline = Date.now() + 2000;
  while (fd === undefined) {
    try { fd = fs.openSync(file, 'wx', 0o600); }
    catch (e) {
      if (e.code !== 'EEXIST') throw e;
      if (Date.now() >= deadline) throw new Error(`Operation already running or interrupted: ${file}. Verify no process is using it before removing the lock.`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    }
  }
  try { fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, at: now() })); return operation(); }
  finally { fs.closeSync(fd); fs.unlinkSync(file); }
}

export function loadPolicy(root) {
  const policy = readJSON(path.join(root, 'harness.config.json'));
  if (policy.schemaVersion !== 1 || policy.defaultModel !== 'sonnet') throw new Error('Unsupported policy schema or default model');
  if (policy.defaultDelegation !== undefined && !['manual', 'read-only', 'automatic'].includes(policy.defaultDelegation)) throw new Error('Invalid default delegation profile');
  for (const key of ['maxCheckSeconds', 'maxEventsPerSession', 'retentionDays']) {
    if (!Number.isSafeInteger(policy[key]) || policy[key] < 1) throw new Error(`Invalid policy: ${key}`);
  }
  for (const key of ['deny', 'ask']) {
    if (!Array.isArray(policy.permissions?.[key]) || policy.permissions[key].some(x => typeof x !== 'string')) throw new Error(`Invalid permission list: ${key}`);
  }
  return policy;
}

export function assets(root) {
  const files = ['CLAUDE.md', 'package.json', 'harness.config.json'];
  for (const dir of ['lib', 'tools', '.claude/agents', '.claude/skills', '.claude/rules', '.claude/departments']) {
    const walk = current => {
      for (const entry of fs.readdirSync(path.join(root, current), { withFileTypes: true })) {
        if (entry.name === 'synced') continue;
        const relative = `${current}/${entry.name}`;
        if (entry.isSymbolicLink()) throw new Error(`Release assets cannot be symlinks: ${relative}`);
        if (entry.isDirectory()) walk(relative); else if (entry.isFile()) files.push(relative);
      }
    };
    walk(dir);
  }
  return files.sort();
}

export function route(prompt) {
  const explicit = prompt.match(/(?:^|\s)\/(debug-mode|dev-mode|research-dev-mode|target-mode|coordinate-work|manual-qa|commit-message|legacy-naming|review-change)(?=\s|$)/);
  if (explicit) return { mode: explicit[1], reason: 'explicit command' };
  // Negated operations must not turn a read-only question into implementation.
  // This remains a conservative hint; interpreting the full request is the model's job.
  const positive = prompt.replace(/\b(?:do not|don't|never|without)\b[^.!?\n;]*/gi, '');
  const drafting = /\b(write|draft|prepare|generate|create|update|give|suggest|propose)\b/i.test(positive);
  const explanation = /\b(?:just|only)\s+explain\b|^(?:please\s+)?(?:what (?:is|are)|how (?:does|do)|explain)\b/i.test(positive.trim());
  const buildingWorkflow = /\b(create|add|implement|build|extend|configure)\b[^.!?\n]*\b(skill|agent|workflow|writer|generator)\b/i.test(positive);
  if (!buildingWorkflow && !explanation && /\b(?:review|audit)\b/i.test(positive) && /\b(?:code|diff|staged changes|implementation|pull request|patch)\b/i.test(positive) && !/\b(?:fix|implement|apply|repair)\b/i.test(positive)) return { mode: 'review-change', reason: 'bounded code or change review request' };
  const namingTarget = /\b(?:variable|function|method|parameter|identifier|symbol)\s+names?\b|\bnaming\s+(?:standards?|conventions?|patterns?)\b|\b(?:better|clearer|legacy)\s+names?\b/i.test(positive);
  const applyingNames = /\b(apply|rename|implement|refactor|change)\b/i.test(positive);
  if (!buildingWorkflow && !applyingNames && !explanation && namingTarget && /\b(recommend|suggest|review|study|infer|assess|check)\b/i.test(positive)) return { mode: 'legacy-naming', reason: 'naming recommendations grounded in legacy repository evidence' };
  if (!buildingWorkflow && !explanation && /\bcommit\s+(?:messages?|strategy|plan)\b/i.test(positive) && (drafting || /\bstaged\b/i.test(positive) || /^commit\s+message\b/i.test(positive.trim()))) return { mode: 'commit-message', reason: 'staged commit message or commit strategy drafting request' };
  if (!buildingWorkflow && !explanation && drafting && /\b(?:manual\s+(?:qa|test)|qa\s+(?:test\s+)?cases?|test\s+cases?[^.!?\n]*\bticket)\b/i.test(positive)) return { mode: 'manual-qa', reason: 'manual QA cases or ticket-ready QA drafting request' };
  const diagnostic = /\b(diagnose|diagnosis|debug|root cause|investigate)\b/i.test(positive);
  const diagnosisOnly = /\b(?:diagnosis|diagnose|investigation)\s+only\b/i.test(prompt);
  const actionable = /\b(fix|implement|build|create|change|remove|refactor|resolve|repair|clean up|add|update|finish|resume|apply|rename)\b/i.test(positive) || /\bcontinue\b.*\b(?:task|work|checkpoint)\b/i.test(positive);
  if (diagnostic && (diagnosisOnly || !actionable)) return { mode: 'debug-mode', reason: 'diagnosis without authorized implementation' };
  if (/\b(?:just|only)\s+explain\b/i.test(positive)) return { mode: 'conversation', reason: 'explanation explicitly requested without action' };
  if (actionable) {
    if (/\b(urgent|quickly|timeboxed|time.boxed)\b/i.test(positive)) return { mode: 'target-mode', reason: 'time constrained delivery' };
    return { mode: 'dev-mode', reason: 'implementation request, including any investigation phase' };
  }
  if (/\b(compare|tradeoffs?|explore|research|feasibility|prototype)\b/i.test(positive)) return { mode: 'research-dev-mode', reason: 'exploration without implementation request' };
  return { mode: 'conversation', reason: 'no clear implementation request; answer or clarify using the full context' };
}
