import fs from 'node:fs';
import path from 'node:path';
import { ROOT, configHome, loadPolicy, readJSON } from '../lib/core.mjs';
import { doctor, install, rollback } from '../lib/install.mjs';
import { commitContext } from '../lib/git-context.mjs';
import { projectContext, projectContract, registerProject, registeredProjects, resolveProject } from '../lib/project.mjs';
import { Jobs, executionStatus } from '../lib/jobs.mjs';
import { beginTask, checkpoint, completeTask, defineTask, getTask, listTasks, runCheck, status } from '../lib/runtime.mjs';

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
  const suppliedWorkspace = option('--workspace');
  const project = option('--project');
  if (project && suppliedWorkspace) throw new Error('Choose either --project or --workspace, not both');
  const workspace = project ? resolveProject(home, project) : path.resolve(suppliedWorkspace || process.cwd());
  const session = option('--session');
  const requested = args.shift() || 'help';
  const command = ['--help', '-h'].includes(requested) ? 'help' : requested;
  let result;
  if (command === 'validate') result = validate();
  else if (command === 'install') { validate(); result = install(ROOT, home, { delegation: option('--delegation'), model: option('--model') }); }
  else if (command === 'rollback') result = rollback(home);
  else if (command === 'doctor') { result = doctor(ROOT, home); if (result.some(x => x.level === 'fail')) process.exitCode = 1; }
  else if (command === 'status') result = status(home, workspace);
  else if (command === 'commit-context') result = commitContext(workspace);
  else if (command === 'project-context') result = projectContext(workspace);
  else if (command === 'execution-status') result = executionStatus(home);
  else if (command === 'operations-status') {
    const jobs = new Jobs(home).list(), counts = Object.create(null);
    for (const job of jobs) counts[job.status] = (counts[job.status] || 0) + 1;
    result = { projects: Object.keys(registeredProjects(home)), execution: executionStatus(home), jobs: { total: jobs.length, byStatus: counts } };
  }
  else if (command === 'projects') {
    const action = args.shift();
    if (action === 'list') result = registeredProjects(home);
    else if (action === 'add') { const directory = option('--path'); result = registerProject(home, args[0], directory); }
    else throw new Error('Projects actions: list, add ALIAS --path CHECKOUT');
  }
  else if (command === 'jobs') {
    const jobs = new Jobs(home), action = args.shift();
    if ((project || suppliedWorkspace) && !['submit', 'list'].includes(action) && args[0] && jobs.get(args[0]).workspace !== workspace) throw new Error('Job belongs to another checkout; use its recorded project');
    if (action === 'submit') {
      const image = option('--image');
      if (args[0] !== '--') throw new Error('Usage: jobs submit --image sha256:ID -- executable arguments');
      result = jobs.submit(workspace, image, args.slice(1));
    } else if (action === 'start') result = jobs.start(args[0]);
    else if (action === 'status') result = jobs.refresh(args[0]);
    else if (action === 'show') result = jobs.get(args[0]);
    else if (action === 'cancel') result = jobs.cancel(args[0]);
    else if (action === 'logs') result = jobs.logs(args[0]);
    else if (action === 'remove') result = jobs.remove(args[0]);
    else if (action === 'list') result = jobs.list();
    else throw new Error('Jobs actions: submit, start, status, show, cancel, logs, remove, list');
  }
  else if (command === 'task') {
    const action = args.shift();
    if ((project || suppliedWorkspace) && args[0] && !['begin', 'list', 'help', '--help', '-h'].includes(action) && getTask(home, args[0]).workspace !== workspace) throw new Error('Task belongs to another checkout; use its recorded project');
    if (action === 'begin') result = beginTask(home, workspace, option('--title'), option('--mode', 'dev-mode'), session);
    else if (action === 'list') result = listTasks(home, workspace);
    else if (action === 'show') result = getTask(home, args[0]);
    else if (action === 'define') {
      const fromProject = args.includes('--from-project');
      if (fromProject) args.splice(args.indexOf('--from-project'), 1);
      const criteria = option('--criteria');
      const labels = option('--required-checks', '');
      const project = fromProject ? projectContract(getTask(home, args[0]).workspace) : null;
      if (fromProject && !project.file) throw new Error('No .eva-harness.json in the saved task workspace');
      result = defineTask(home, args[0], project ? [...project.criteria, ...(criteria ? [criteria] : [])] : criteria ? [criteria] : [], project ? project.checks.map(x => x.label) : labels.split(',').filter(Boolean), project ? Object.fromEntries(project.checks.map(x => [x.label, x.argv])) : {});
    }
    else if (['help', '--help', '-h', undefined].includes(action)) result = { actions: ['begin --title TEXT [--mode MODE]', 'list', 'show ID', 'define ID --criteria TEXT --required-checks label,label | --from-project', 'checkpoint ID --note TEXT [--status running|paused|blocked|cancelled]', 'check ID [--label NAME] -- executable arguments', 'complete ID --summary TEXT [--skip-reason TEXT] [--acceptance-note TEXT]'] };
    else if (action === 'checkpoint') { const status = option('--status', 'running'); const note = option('--note'); result = checkpoint(home, args[0], note, status, session); }
    else if (action === 'check') {
      const label = option('--label', 'default');
      const separator = args.indexOf('--');
      if (separator !== 1) throw new Error('Usage: task check TASK_ID -- executable arguments');
      result = runCheck(home, args[0], args.slice(separator + 1), loadPolicy(ROOT), label);
      if (!result.check.passed) process.exitCode = 1;
    } else if (action === 'complete') { const summary = option('--summary'); const skip = option('--skip-reason'); const acceptance = option('--acceptance-note'); result = completeTask(home, args[0], summary, skip, acceptance); }
    else throw new Error('Unknown task action');
  } else if (command === 'help') result = {
    usage: 'node tools/harness.mjs COMMAND [--home CLAUDE_CONFIG_DIR] [--workspace PROJECT]',
    commands: ['operations-status', 'execution-status', 'projects list | projects add ALIAS --path CHECKOUT', 'jobs submit --image sha256:ID -- executable arguments', 'jobs start|status|show|cancel|logs|remove ID', 'jobs list', 'validate', 'install [--delegation automatic|manual|read-only] [--model sonnet|opus|haiku]', 'doctor', 'status', 'project-context [--workspace PROJECT]', 'commit-context [--workspace REPOSITORY]', 'rollback', 'task begin --title TEXT [--mode MODE]', 'task list', 'task show ID', 'task define ID --criteria TEXT --required-checks label,label | --from-project', 'task checkpoint ID --note TEXT [--status running|paused|blocked|cancelled]', 'task check ID [--label NAME] -- executable arguments', 'task complete ID --summary TEXT [--skip-reason TEXT] [--acceptance-note TEXT]']
  };
  else throw new Error(`Unknown command: ${command}`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`EVA harness: ${error.message}\n`);
  process.exitCode = 1;
}
