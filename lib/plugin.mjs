import fs from 'node:fs';
import path from 'node:path';
import { inside, readJSON } from './core.mjs';

export function validatePlugin(root) {
  const plugin = readJSON(path.join(root, '.claude-plugin/plugin.json'));
  const marketplace = readJSON(path.join(root, '.claude-plugin/marketplace.json'));
  const pkg = readJSON(path.join(root, 'package.json'));
  if (plugin.name !== 'engineering' || plugin.version !== pkg.version) throw new Error('Plugin name/version must match the engineering package');
  if (marketplace.name !== 'engineering-harness-local' || marketplace.plugins?.length !== 1 || marketplace.plugins[0].name !== plugin.name || marketplace.plugins[0].source !== './') throw new Error('Local marketplace must reference this plugin');
  if (!fs.readdirSync(path.join(root, 'agents')).some(name => name.endsWith('.md'))) throw new Error('Plugin requires worker definitions in the standard agents/ directory');
  for (const entry of fs.readdirSync(path.join(root, 'skills'))) {
    const file = path.join(root, 'skills', entry, 'SKILL.md');
    if (!inside(root, file) || !fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`Invalid plugin skill: ${entry}`);
  }
  const hooks = readJSON(path.join(root, 'hooks/hooks.json')).hooks;
  for (const event of ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'SubagentStart', 'SubagentStop', 'Stop']) {
    const entries = hooks?.[event];
    if (!Array.isArray(entries) || entries.length !== 1 || entries[0].hooks?.length !== 1 || entries[0].hooks[0].command !== 'node "${CLAUDE_PLUGIN_ROOT}/tools/hook.mjs" --plugin' || entries[0].hooks[0].type !== 'command') throw new Error(`Invalid plugin hook: ${event}`);
  }
  return { name: plugin.name, version: plugin.version, hooks: Object.keys(hooks).length };
}
