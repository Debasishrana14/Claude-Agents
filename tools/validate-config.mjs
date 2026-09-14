import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function json(relative) {
  try {
    return JSON.parse(read(relative));
  } catch (error) {
    fail(`${relative}: invalid JSON (${error.message})`);
    return null;
  }
}

function files(directory, suffix) {
  const absolute = path.join(root, directory);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap(entry => {
    const relative = path.join(directory, entry.name);
    return entry.isDirectory() ? files(relative, suffix) : entry.name.endsWith(suffix) ? [relative] : [];
  });
}

const version = read('VERSION').trim();
if (!/^\d+\.\d+\.\d+$/.test(version)) fail('VERSION must be semantic major.minor.patch');

for (const relative of files('.claude/schemas', '.json')) {
  const schema = json(relative);
  if (schema && !schema.$schema) fail(`${relative}: missing $schema`);
  if (schema && !schema.$id) fail(`${relative}: missing $id`);
}

const ownership = json('.claude/ownership/eva-configurator.json');
if (ownership) {
  const ids = ownership.contexts.map(context => context.id);
  if (new Set(ids).size !== ids.length) fail('ownership: duplicate context id');
  for (const context of ownership.contexts) {
    if (!Array.isArray(context.paths) || context.paths.length === 0) fail(`ownership ${context.id}: paths required`);
    if (context.instruction && !fs.existsSync(path.join(root, context.instruction))) {
      fail(`ownership ${context.id}: missing instruction ${context.instruction}`);
    }
  }
}

const allowedModels = new Set(['haiku', 'sonnet', 'opus', 'inherit']);
for (const relative of files('.claude/agents', '.md')) {
  const source = read(relative);
  const match = source.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) {
    fail(`${relative}: missing YAML frontmatter`);
    continue;
  }
  const name = match[1].match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const model = match[1].match(/^model:\s*(.+)$/m)?.[1]?.trim();
  const tools = match[1].match(/^tools:\s*(.+)$/m)?.[1] ?? '';
  if (!name) fail(`${relative}: missing name`);
  if (!allowedModels.has(model)) fail(`${relative}: unsupported model ${model ?? '<missing>'}`);
  if (/read-only/i.test(source) && /\b(?:Write|Edit)\b/.test(tools)) {
    fail(`${relative}: read-only agent grants a write tool`);
  }
  if (model === 'opus' && !/user approved|user approval/i.test(source)) {
    fail(`${relative}: Opus agent lacks explicit user-approval condition`);
  }
}

for (const relative of files('.claude/skills', 'SKILL.md')) {
  const source = read(relative);
  const name = source.match(/^name:\s*([a-z0-9-]+)$/m)?.[1];
  const description = source.match(/^description:\s*(.+)$/m)?.[1];
  if (!source.startsWith('---\n') || !name || !description) fail(`${relative}: invalid skill frontmatter`);
  for (const match of source.matchAll(/\]\((references\/[^)]+)\)/g)) {
    const target = path.join(path.dirname(path.join(root, relative)), match[1]);
    if (!fs.existsSync(target)) fail(`${relative}: missing reference ${match[1]}`);
  }
}

const evaluations = json('.agent-evals/cases.json');
if (evaluations) {
  if (!Array.isArray(evaluations.cases) || evaluations.cases.length < 8) fail('evaluations: insufficient routing coverage');
  const ids = evaluations.cases.map(item => item.id);
  if (new Set(ids).size !== ids.length) fail('evaluations: duplicate case id');
}

const managedPolicy = json('.claude/policy/managed-settings.example.json');
if (managedPolicy) {
  if (managedPolicy.allowManagedPermissionRulesOnly !== true) fail('managed policy: permission rules are not locked');
  if (managedPolicy.permissions?.disableBypassPermissionsMode !== 'disable') fail('managed policy: bypass mode is not disabled');
  if (!managedPolicy.permissions?.ask?.includes('Agent')) fail('managed policy: Agent does not require a prompt');
  if (managedPolicy.sandbox?.enabled !== true) fail('managed policy: sandbox is not enabled');
}

for (const relative of files('.', '.md')) {
  const source = read(relative);
  if (/E:\\Copies of EVA software/i.test(source)) fail(`${relative}: developer-specific E: path`);
}

if (failures.length > 0) {
  console.error(failures.map(item => `FAIL ${item}`).join('\n'));
  process.exit(1);
}

console.log(`PASS configuration ${version}: schemas, ownership, agents, skills, references, and routing cases`);
