import fs from 'node:fs';
import path from 'node:path';
import { assets, digest, exists, inside, isSensitivePath, readJSON, writeJSON } from './core.mjs';
import { validatePlugin } from './plugin.mjs';

export function releaseFiles(source) {
  const config = readJSON(path.join(source, 'release.config.json'));
  if (config.schemaVersion !== 1 || !Array.isArray(config.files) || !config.files.length || config.files.length > 300) throw new Error('Invalid release file manifest');
  const files = [...config.files];
  if (exists(path.join(source, 'LICENSE'))) files.push('LICENSE');
  const seen = new Set();
  for (const file of files) {
    if (typeof file !== 'string' || file.includes('\\') || file.includes(':') || path.isAbsolute(file) || file.split('/').some(part => !part || part === '.' || part === '..' || /[. ]$/.test(part))) throw new Error('Release paths must be relative without traversal or ambiguous trailing characters');
    const portable = file.toLowerCase();
    if (seen.has(portable)) throw new Error(`Duplicate release file: ${file}`);
    seen.add(portable);
    if (portable === 'release-manifest.json') throw new Error('release-manifest.json is reserved for generated metadata');
    if (portable.split('/').some(part => ['.git', '.local', '.scratch', '.claude', 'business-packs', 'node_modules'].includes(part)) || portable.startsWith('business/') || isSensitivePath(file)) throw new Error(`Private or sensitive path cannot be exported: ${file}`);
    let current = source;
    const parts = file.split('/');
    for (let index = 0; index < parts.length; index++) {
      current = path.join(current, parts[index]);
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink() || !inside(source, current) || (index === parts.length - 1 ? !stat.isFile() : !stat.isDirectory())) throw new Error(`Release files must be regular files without linked ancestors: ${file}`);
      if (index === parts.length - 1 && stat.size > 2 * 1024 * 1024) throw new Error(`Release file exceeds 2 MiB: ${file}`);
    }
  }
  return files.sort();
}

export function exportRelease(source, destination) {
  if (typeof destination !== 'string' || !destination.trim()) throw new Error('Provide --output PATH for a new or empty export directory');
  const output = path.resolve(destination);
  if (inside(output, source)) throw new Error('Release output cannot replace the source or an ancestor');
  if (exists(output) && (fs.lstatSync(output).isSymbolicLink() || !fs.statSync(output).isDirectory() || fs.readdirSync(output).length)) throw new Error('Release output must be a new or empty directory, never a link');
  const plugin = validatePlugin(source);
  const files = releaseFiles(source);
  const missing = assets(source).filter(file => !files.includes(file));
  if (missing.length) throw new Error(`Release manifest omits required runtime files: ${missing.join(', ')}`);
  // Read exactly the reviewed files before creating the output. Ignore rules are
  // not a release boundary, and no Git history or ambient directory is copied.
  let totalBytes = 0;
  const contents = files.map(file => {
    const body = fs.readFileSync(path.join(source, file));
    totalBytes += body.length;
    if (totalBytes > 16 * 1024 * 1024) throw new Error('Release export exceeds 16 MiB');
    return { file, body };
  });
  const parent = path.dirname(output);
  fs.mkdirSync(parent, { recursive: true });
  const staging = fs.mkdtempSync(path.join(parent, '.harness-export-'));
  try {
    const hashes = Object.create(null);
    for (const { file, body } of contents) {
      const target = path.join(staging, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, body, { flag: 'wx' });
      hashes[file] = digest(body);
    }
    const blockers = files.includes('LICENSE') ? [] : ['Owner must select and add LICENSE before public distribution.'];
    writeJSON(path.join(staging, 'release-manifest.json'), { schemaVersion: 1, name: plugin.name, version: plugin.version, files: hashes, preparationBlockers: blockers });
    // Never remove a populated directory even if another process changed it.
    if (exists(output)) fs.rmdirSync(output);
    fs.renameSync(staging, output);
    return { output, version: plugin.version, files: files.length, includesGitHistory: false, preparationBlockers: blockers, publication: 'Not published. Review contents, license, release checklist, and validation before distribution.' };
  } finally {
    // Only this operation's newly created staging directory can be removed.
    if (exists(staging) && path.dirname(staging) === parent && path.basename(staging).startsWith('.harness-export-')) fs.rmSync(staging, { recursive: true, force: true });
  }
}
