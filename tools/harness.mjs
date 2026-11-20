import fs from 'node:fs';
import path from 'node:path';
import { ROOT, configHome, loadPolicy, readJSON } from '../lib/core.mjs';
import { doctor, install, rollback } from '../lib/install.mjs';
import { beginTask, checkpoint, completeTask, listTasks, runCheck, status } from '../lib/runtime.mjs';

const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(name);
  const separator = args.indexOf('--');
  if (index < 0 || (separator >= 0 && index > separator)) return fallback;
  if (index + 1 >= args.length || args[index + 1].startsWith('--')) throw new Error(`Missing value for ${name}`);
  const value = args[index + 1]; args.splice(index, 2); return value;
}

function validate() {
  loadPolicy(ROOT);
  const counts = {};
  for (const group of ['agents', 'skills', 'rules']) {
    const directory = path.join(ROOT, '.claude', group);
    const files = fs.readdirSync(directory).filter(name => name !== 'synced').map(name => path.join(directory, name, ...(group === 'skills' ? ['SKILL.md'] : [])));
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
      if (!text.startsWith('---\n') || !text.slice(4).includes('\n---\n')) throw new Error(`Missing frontmatter: ${file}`);
      if (group !== 'rules' && !/^name: [a-z0-9-]+$/m.test(text)) throw new Error(`Invalid name: ${file}`);
      if (group === 'skills' && /disable-model-invocation: true/.test(text)) throw new Error(`Workflow is not discoverable: ${file}`);
      if (/[A-Z]:[\\/]/.test(text)) throw new Error(`Machine-specific path: ${file}`);
    }
    counts[group] = files.length;
  }
  for (const file of fs.readdirSync(path.join(ROOT, '.claude/rules'))) {
    const text = fs.readFileSync(path.join(ROOT, '.claude/rules', file), 'utf8');
    for (const match of text.matchAll(/~\/\.claude\/departments\/([\w.-]+\.md)/g)) {
      if (!fs.existsSync(path.join(ROOT, '.claude/departments', match[1]))) throw new Error(`Missing guide ${match[1]}`);
    }
  }
  return { valid: true, version: readJSON(path.join(ROOT, 'package.json')).version, ...counts };
}

try {
  const home = path.resolve(option('--home', configHome()));
  const workspace = path.resolve(option('--workspace', process.cwd()));
  const command = args.shift() || 'help';
  let result;
  if (command === 'validate') result = validate();
  else if (command === 'install') { validate(); result = install(ROOT, home); }
  else if (command === 'rollback') result = rollback(home);
  else if (command === 'doctor') { result = doctor(ROOT, home); if (result.some(x => x.level === 'fail')) process.exitCode = 1; }
  else if (command === 'status') result = status(home, workspace);
  else if (command === 'task') {
    const action = args.shift();
    if (action === 'begin') result = beginTask(home, workspace, option('--title'), option('--mode', 'dev-mode'));
    else if (action === 'list') result = listTasks(home, workspace);
    else if (action === 'checkpoint') { const status = option('--status', 'running'); const note = option('--note'); result = checkpoint(home, args[0], note, status); }
    else if (action === 'check') {
      const separator = args.indexOf('--');
      if (separator !== 1) throw new Error('Usage: task check TASK_ID -- executable arguments');
      result = runCheck(home, args[0], args.slice(separator + 1), loadPolicy(ROOT));
      if (!result.check.passed) process.exitCode = 1;
    } else if (action === 'complete') { const summary = option('--summary'); const skip = option('--skip-reason'); result = completeTask(home, args[0], summary, skip); }
    else throw new Error('Unknown task action');
  } else if (command === 'help') result = {
    usage: 'node tools/harness.mjs COMMAND [--home CLAUDE_CONFIG_DIR] [--workspace PROJECT]',
    commands: ['validate', 'install', 'doctor', 'status', 'rollback', 'task begin --title TEXT [--mode MODE]', 'task list', 'task checkpoint ID --note TEXT [--status running|paused|blocked|cancelled]', 'task check ID -- executable arguments', 'task complete ID --summary TEXT [--skip-reason TEXT]']
  };
  else throw new Error(`Unknown command: ${command}`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`EVA harness: ${error.message}\n`);
  process.exitCode = 1;
}
