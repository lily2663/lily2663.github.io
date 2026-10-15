import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

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

function optimizeOriginalReferences() {
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
  if (!source.startsWith(`${staticImages}${sep}`) || !existsSync(source)) {
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
}

const responsiveWidths = [480, 960, 1440];
const responsiveQuality = 82;
const articleImagePrefix = '/assets/img/';

function withoutCodeFences(body) {
  let fence;
  return body.split(/\r?\n/).filter((line) => {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined;
      return false;
    }
    return !fence;
  }).join('\n');
}

function publishedImageReferences(siteRoot) {
  const posts = join(siteRoot, 'content', 'posts');
  const urls = new Set();
  const now = Date.now();
  for (const file of existsSync(posts) ? walk(posts).filter((file) => extname(file).toLowerCase() === '.md') : []) {
    const source = readFileSync(file, 'utf8');
    const frontMatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!frontMatter) continue;
    const meta = YAML.parse(frontMatter[1]) || {};
    if (meta.draft || meta.protected || meta.params?.protected) continue;
    if ([meta.date, meta.publishDate, meta.publishdate].some((value) => value && Date.parse(value) > now)) continue;
    const expiry = meta.expiryDate || meta.expirydate;
    if (expiry && Date.parse(expiry) <= now) continue;
    const body = withoutCodeFences(source.slice(frontMatter[0].length));
    const references = new Map([...body.matchAll(/^ {0,3}\[([^\]]+)\]:\s*<?([^\s>]+)>?/gm)]
      .map((match) => [match[1].trim().toLowerCase(), match[2]]));
    for (const match of body.matchAll(/(?<!\\)!\[([^\]]*)\](?:\(\s*<?([^\s)>]+)>?[^\n]*?\)|\[([^\]]*)\])?/g)) {
      const raw = match[2] || references.get((match[3] || match[1]).trim().toLowerCase());
      if (!raw) continue;
      try {
        const url = new URL(raw, 'https://local.invalid');
        const imagePath = decodeURIComponent(url.pathname);
        if (raw.startsWith(articleImagePrefix) && imagePath.startsWith(articleImagePrefix)
            && !imagePath.startsWith(`${articleImagePrefix}responsive/`)
            && !imagePath.split('/').some((part) => part === '..')
            && ['.png', '.jpg', '.jpeg', '.webp'].includes(extname(imagePath).toLowerCase())) urls.add(imagePath);
      } catch {}
    }
  }
  return [...urls].sort();
}

function dimensions(file) {
  const result = spawnSync(process.env.FFPROBE_PATH || 'ffprobe', [
    '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,codec_name,nb_frames', '-of', 'json', file,
  ], { encoding: 'utf8', windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`Cannot inspect ${file}: ${result.error?.message || result.stderr}`);
  const stream = JSON.parse(result.stdout).streams?.[0];
  return stream && Number.isInteger(stream.width) && stream.width > 0 && Number.isInteger(stream.height) && stream.height > 0 ? stream : null;
}

function isAnimated(bytes) {
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const type = bytes.toString('ascii', offset, offset + 4);
      if (type === 'ANIM' || type === 'ANMF') return true;
      offset += 8 + bytes.readUInt32LE(offset + 4) + (bytes.readUInt32LE(offset + 4) % 2);
    }
  }
  if (bytes.toString('hex', 0, 8) === '89504e470d0a1a0a') {
    for (let offset = 8; offset + 12 <= bytes.length;) {
      if (bytes.toString('ascii', offset + 4, offset + 8) === 'acTL') return true;
      offset += 12 + bytes.readUInt32BE(offset);
    }
  }
  return false;
}

// Opt in with: node scripts/optimize-images.mjs --responsive
// This mode only adds smaller candidates for published articles' existing local
// image URLs, including original PNGs. It never rewrites Markdown or deletes originals.
export function generateResponsiveImages(siteRoot = root) {
  const responsiveRoot = resolve(siteRoot, 'static/assets/img/responsive');
  const manifest = { version: 1, widths: responsiveWidths, quality: responsiveQuality, images: {} };
  let bytesSaved = 0;
  let candidateCount = 0;
  const urls = publishedImageReferences(siteRoot);
  for (const url of urls) {
    const source = resolve(siteRoot, 'static', `.${url}`);
    const imageRoot = resolve(siteRoot, 'static/assets/img');
    if (!source.startsWith(`${imageRoot}${sep}`) || !existsSync(source)) continue;
    const bytes = readFileSync(source);
    if (isAnimated(bytes)) continue;
    const info = dimensions(source);
    if (!info || info.codec_name === 'apng' || Number(info.nb_frames) > 1) continue;
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const candidates = [];
    for (const width of responsiveWidths.filter((width) => width < info.width)) {
      const filename = `${sha256.slice(0, 20)}-${width}w-q${responsiveQuality}.webp`;
      const output = join(responsiveRoot, filename);
      if (!existsSync(output)) {
        const temporary = join(tmpdir(), `lily-responsive-${process.pid}-${sha256.slice(0, 20)}-${width}.webp`);
        const result = spawnSync(process.env.FFMPEG_PATH || 'ffmpeg', [
          '-y', '-v', 'error', '-i', source, '-map_metadata', '-1', '-vf', `scale=${width}:-1`,
          '-frames:v', '1', '-c:v', 'libwebp', '-q:v', String(responsiveQuality), '-compression_level', '6', '-threads', '1', temporary,
        ], { encoding: 'utf8', windowsHide: true });
        if (result.error || result.status !== 0) throw new Error(`Cannot resize ${url}: ${result.error?.message || result.stderr}`);
        if (statSync(temporary).size >= bytes.length) { unlinkSync(temporary); continue; }
        mkdirSync(responsiveRoot, { recursive: true });
        copyFileSync(temporary, output);
        unlinkSync(temporary);
      }
      const candidate = dimensions(output);
      const size = statSync(output).size;
      if (!candidate || candidate.width !== width || size >= bytes.length) continue;
      candidates.push({ url: `/assets/img/responsive/${filename}`, width, height: candidate.height, bytes: size });
      candidateCount += 1;
      bytesSaved += bytes.length - size;
    }
    if (candidates.length) manifest.images[url] = { sha256, width: info.width, height: info.height, candidates };
  }
  const manifestPath = join(siteRoot, 'data/image_variants.json');
  mkdirSync(dirname(manifestPath), { recursive: true });
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  if (!existsSync(manifestPath) || readFileSync(manifestPath, 'utf8') !== serialized) writeFileSync(manifestPath, serialized);
  console.log(`Responsive images: ${urls.length} referenced local sources, ${Object.keys(manifest.images).length} with ${candidateCount} smaller candidates; ${bytesSaved} bytes saved across candidates compared with serving each original.`);
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--responsive')) {
    const rootIndex = process.argv.indexOf('--root');
    generateResponsiveImages(rootIndex >= 0 ? resolve(process.argv[rootIndex + 1]) : root);
  } else optimizeOriginalReferences();
}
