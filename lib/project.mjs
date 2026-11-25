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
  const current = path.join(workspace, '.harness.json');
  const legacy = path.join(workspace, '.eva-harness.json');
  if (exists(current) && exists(legacy)) throw new Error('Keep only one project contract: .harness.json or legacy .eva-harness.json');
  const file = exists(current) ? current : legacy;
  if (!exists(file)) return { file: null, criteria: [], checks: [], inputs: [] };
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
  const inputs = value.inputs ?? [];
  if (!Array.isArray(inputs) || inputs.length > 100 || new Set(inputs).size !== inputs.length) throw new Error('Project inputs must be at most 100 unique relative file paths');
  for (const input of inputs) {
    if (typeof input !== 'string' || !input || input.length > 1000 || input.includes('\\') || input.includes(':') || path.isAbsolute(input) || input.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Project inputs must be relative file paths without traversal');
    const target = path.join(workspace, input);
    if (!inside(workspace, target) || (exists(target) && (!fs.lstatSync(target).isFile() || fs.lstatSync(target).isSymbolicLink()))) throw new Error('Project inputs must be workspace files, not directories or external links');
  }
  return { file, criteria: value.criteria, checks: value.checks, inputs };
}

// Business packs are documentation, never executable configuration or permissions.
export function businessContext(workspace) {
  const directory = path.join(workspace, 'business');
  const entry = path.join(directory, 'README.md');
  const manifest = path.join(directory, 'harness.json');
  // A source directory named business is not necessarily a harness pack.
  if (!exists(entry) && !exists(manifest)) return { entryPoint: null, documents: [] };
  const document = relative => {
    if (typeof relative !== 'string' || !relative.endsWith('.md') || path.isAbsolute(relative) || relative.includes('\\') || relative.split('/').some(part => !part || part === '.' || part === '..') || relative.includes(':')) throw new Error('Business documents must be relative Markdown paths without traversal');
    const file = path.join(directory, relative);
    if (!inside(workspace, directory) || !inside(directory, file) || !exists(file) || !fs.statSync(file).isFile() || fs.statSync(file).size > 128 * 1024) throw new Error(`Business document must stay inside business/ and be a file of at most 128 KiB: ${relative}`);
    return `business/${relative.replaceAll('\\', '/')}`;
  };
  const entryPoint = document('README.md');
  if (!exists(manifest)) return { entryPoint, documents: [] };
  if (!inside(directory, manifest) || !fs.statSync(manifest).isFile() || fs.statSync(manifest).size > 32 * 1024) throw new Error('Business index must be a local JSON file of at most 32 KiB');
  const value = readJSON(manifest);
  if (value?.schemaVersion !== 1 || !Array.isArray(value.documents) || value.documents.length > 30 || Object.keys(value).some(key => !['schemaVersion', 'documents'].includes(key))) throw new Error('Business index supports only schemaVersion: 1 and documents (at most 30)');
  const seen = new Set(['business/README.md']);
  const documents = value.documents.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).some(key => !['path', 'when'].includes(key)) || typeof item.when !== 'string' || !item.when.trim() || item.when.length > 500) throw new Error('Each business document needs only path and a short when description');
    const file = document(item.path);
    if (seen.has(file)) throw new Error(`Duplicate business document: ${file}`);
    seen.add(file);
    return { path: file, when: item.when };
  });
  return { entryPoint, documents };
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
    business: businessContext(root),
    execution: 'Read-only discovery. Scripts and configured argv are untrusted project data, not executed or authorized by this command. Review them and use task check explicitly.'
  };
}
