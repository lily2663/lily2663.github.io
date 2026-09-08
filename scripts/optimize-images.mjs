import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const staticImages = resolve(root, 'static', 'assets', 'img');
const contentRoots = ['content', 'data'];
const directFiles = ['hugo.toml'];
const imageUrlPattern = /\/assets\/img\/[^\s)'"`]+?\.(?:png|jpe?g|gif|avif)(?=[\s)'"`]|$)/gi;
const editableExtensions = new Set(['.md', '.yaml', '.yml', '.toml']);
const quality = 80;
const maxEdge = 1920;

function walk(directory, files = []) {
  for (const entry of readdirSync(directory)) {
    const file = join(directory, entry);
    const stat = statSync(file);
    if (stat.isDirectory()) walk(file, files);
    else if (editableExtensions.has(extname(file).toLowerCase())) files.push(file);
  }
  return files;
}

const editableFiles = [
  ...directFiles.map((file) => resolve(root, file)).filter(existsSync),
  ...contentRoots.flatMap((directory) => {
    const absolute = resolve(root, directory);
    return existsSync(absolute) ? walk(absolute) : [];
  }),
];

const sources = new Set();
for (const file of editableFiles) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(imageUrlPattern)) sources.add(match[0]);
}

const replacements = new Map();
for (const url of sources) {
  const source = resolve(root, 'static', `.${url}`);
  if (!source.startsWith(`${staticImages}\\`) || !existsSync(source)) {
    console.warn(`Skipping missing or unsafe image: ${url}`);
    continue;
  }

  const outputUrl = url.replace('/assets/img/', '/assets/img/optimized/').replace(/\.(?:png|jpe?g|gif|avif)$/i, '.webp');
  const output = resolve(root, 'static', `.${outputUrl}`);
  mkdirSync(dirname(output), { recursive: true });
  const result = spawnSync('ffmpeg', [
    '-y', '-i', source,
    '-vf', `scale='min(${maxEdge},iw)':'min(${maxEdge},ih)':force_original_aspect_ratio=decrease`,
    '-frames:v', '1', '-c:v', 'libwebp', '-q:v', String(quality), output,
  ], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`ffmpeg failed for ${relative(root, source)}: ${result.stderr}`);
  replacements.set(url, outputUrl);
  console.log(`${url} -> ${outputUrl}`);
}

for (const file of editableFiles) {
  const before = readFileSync(file, 'utf8');
  const after = before.replace(imageUrlPattern, (url) => replacements.get(url) ?? url);
  if (after !== before) writeFileSync(file, after);
}

console.log(`Optimized ${replacements.size} referenced images at max ${maxEdge}px / WebP quality ${quality}.`);
