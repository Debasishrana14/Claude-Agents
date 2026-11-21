import fs from 'node:fs';
import { ROOT, configHome } from '../lib/core.mjs';
import { handleHook } from '../lib/runtime.mjs';

try {
  const position = process.argv.indexOf('--home');
  const home = position < 0 ? configHome() : process.argv[position + 1];
  const input = fs.readFileSync(0, 'utf8');
  if (Buffer.byteLength(input) > 2 * 1024 * 1024) throw new Error('Hook input exceeds 2 MB');
  const result = handleHook(ROOT, home, JSON.parse(input), { plugin: process.argv.includes('--plugin') });
  process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
  // PreToolUse hook failures block via exit 2; other events surface the error.
  process.stderr.write(`Engineering harness hook failed: ${error.message}\n`);
  process.exitCode = 2;
}
