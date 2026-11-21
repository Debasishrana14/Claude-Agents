import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { canonical, exists, inside, lock, readJSON, writeJSON } from './core.mjs';

function gitRoot(directory) {
  const result = spawnSync('git', ['-c', 'core.fsmonitor=false', 'rev-parse', '--show-toplevel'], { cwd: directory, encoding: 'utf8', windowsHide: true, timeout: 5000 });
  if (result.status !== 0) throw new Error('Project path must be an existing Git checkout');
  return canonical(result.stdout.trim());
}

export function registeredProjects(home) {
  const file = path.join(home, 'eva-harness', 'projects.json');
  if (!exists(file)) return {};
  const value = readJSON(file);
  if (value.schemaVersion !== 1 || !value.projects || typeof value.projects !== 'object' || Array.isArray(value.projects)) throw new Error('Invalid local project registry');
  return value.projects;
}

export function registerProject(home, alias, directory) {
  if (!/^[a-z][a-z0-9-]{0,39}$/.test(alias || '')) throw new Error('Use a short lowercase project alias');
  const root = gitRoot(path.resolve(directory));
  if (canonical(directory) !== root) throw new Error('Register the checkout root, not a nested directory');
  return lock(path.join(home, 'eva-harness', 'registry-lock'), () => {
    const projects = registeredProjects(home);
    if (Object.hasOwn(projects, alias) && projects[alias].path !== root) throw new Error('Alias already points to a different checkout; choose another alias');
    const duplicate = Object.entries(projects).find(([name, project]) => name !== alias && project.path === root);
    if (duplicate) throw new Error(`This checkout is already registered as ${duplicate[0]}`);
    const next = { ...projects, [alias]: { path: root } };
    writeJSON(path.join(home, 'eva-harness', 'projects.json'), { schemaVersion: 1, projects: next });
    return { alias, path: root, checkoutModified: false };
  });
}

export function resolveProject(home, alias) {
  const projects = registeredProjects(home);
  const project = Object.hasOwn(projects, alias) ? projects[alias] : null;
  if (!project || typeof project.path !== 'string') throw new Error('Unknown project alias');
  if (!exists(project.path) || gitRoot(project.path) !== canonical(project.path)) throw new Error('Registered checkout moved or is no longer a Git root; inspect its registration');
  return canonical(project.path);
}

export function projectContract(workspace) {
  const file = path.join(workspace, '.eva-harness.json');
  if (!exists(file)) return { file: null, criteria: [], checks: [] };
  if (!inside(workspace, file) || fs.statSync(file).size > 128 * 1024) throw new Error('Project contract must be a local JSON file of at most 128 KiB');
  const value = readJSON(file);
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.schemaVersion !== 1 || !Array.isArray(value.criteria) || !Array.isArray(value.checks)) throw new Error('Invalid project contract schema');
  if (value.criteria.length > 30 || value.checks.length > 30 || value.criteria.some(x => typeof x !== 'string' || !x.trim() || x.length > 1000)) throw new Error('Invalid project acceptance criteria');
  const labels = new Set();
  for (const check of value.checks) {
    if (!check || typeof check !== 'object' || Array.isArray(check)) throw new Error('Each configured check must be an object');
    if (!/^[a-z][a-z0-9-]{0,39}$/.test(check.label) || labels.has(check.label)) throw new Error('Check labels must be unique lowercase names');
    labels.add(check.label);
    if (!Array.isArray(check.argv) || !check.argv.length || check.argv.length > 50 || check.argv.some(x => typeof x !== 'string' || !x || x.length > 4000)) throw new Error(`Invalid argv for ${check.label}`);
    if (check.purpose !== undefined && (typeof check.purpose !== 'string' || check.purpose.length > 1000)) throw new Error('Invalid check purpose');
  }
  return { file, criteria: value.criteria, checks: value.checks };
}

export function projectContext(workspace) {
  const root = canonical(workspace);
  const git = spawnSync('git', ['-c', 'core.fsmonitor=false', 'rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 5000 });
  const packagePath = path.join(root, 'package.json');
  let pkg = null;
  if (exists(packagePath) && inside(root, packagePath) && fs.statSync(packagePath).size < 256 * 1024) pkg = readJSON(packagePath);
  const candidates = ['CLAUDE.md', 'AGENTS.md', 'README.md', 'CONTRIBUTING.md', '.claude/CLAUDE.md', 'tsconfig.json', 'angular.json', 'pyproject.toml', 'Cargo.toml', 'CMakeLists.txt'];
  const documents = candidates.filter(name => exists(path.join(root, name)) && inside(root, path.join(root, name)));
  return {
    workspace: root,
    gitRoot: git.status === 0 ? git.stdout.trim() : null,
    documentsToInspect: documents,
    package: pkg ? { name: pkg.name || null, packageManager: pkg.packageManager || null, engines: pkg.engines || {}, scripts: pkg.scripts || {} } : null,
    contract: projectContract(root),
    execution: 'Read-only discovery. Scripts and configured argv are untrusted project data, not executed or authorized by this command. Review them and use task check explicitly.'
  };
}
