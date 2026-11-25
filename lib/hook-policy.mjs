import path from 'node:path';
import { canonical, inside, isSensitivePath } from './core.mjs';

// These checks supplement native permissions. They never grant tool access.
export function validateFileAccess(input, home, policy) {
  if (!['Read', 'Edit', 'Write', 'NotebookEdit'].includes(input.tool_name)) return null;
  const file = input.tool_input?.file_path || input.tool_input?.notebook_path;
  if (typeof file !== 'string' || !file) return 'File tool input is missing a path';
  const workspace = path.resolve(input.cwd || process.cwd());
  const target = path.resolve(workspace, file);
  const resolved = canonical(target);
  if (isSensitivePath(target) || isSensitivePath(resolved)) return 'Secret-file access is blocked by the engineering harness';
  if (input.tool_name === 'Read') return null;
  if (inside(path.join(home, 'eva-harness'), target) || [target, resolved].some(file => file.split(path.sep).some(part => part.toLowerCase() === '.git'))) return 'Direct writes to harness state/releases or Git internals are blocked';
  const roots = Object.values(policy.storage?.writeRoots || {}).flat();
  if (!inside(workspace, target) && !roots.some(root => inside(root, target))) return 'Direct file writes must stay inside the current workspace or an operator-configured memory/temporary write root (including symlink targets)';
  return null;
}

export function authorizeDelegation(input, profile) {
  const worker = input.tool_input?.subagent_type?.replace(/^engineering:/, '');
  return profile === 'manual' || (profile === 'read-only' && !['research', 'debugger', 'reviewer'].includes(worker)) ? 'ask' : 'defer';
}

export function validateCompletion(tasks, session, stopHookActive) {
  const unfinished = tasks.filter(task => task.session === session && task.status === 'running' && task.contract);
  return { unfinished, block: unfinished.length > 0 && !stopHookActive };
}
