import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const output = path.resolve(process.env.LILY_TEST_PUBLIC_DIR || path.join(root, 'public'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data/image_variants.json'), 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
function attributes(html) {
  return Object.fromEntries([...html.matchAll(/([^\s=<>]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)]
    .map((match) => [match[1], match[2] ?? match[3] ?? match[4] ?? '']));
}
const images = (html) => [...html.matchAll(/<img\b([^>]*)>/g)].map((match) => attributes(match[1]));
const sourceEntries = Object.entries(manifest.images);
assert.ok(sourceEntries.length > 0);
for (const [url, entry] of sourceEntries) {
  const source = fs.readFileSync(path.join(root, 'static', `.${url}`));
  assert.equal(hash(source), entry.sha256, `${url}: manifest belongs to this source`);
  assert.ok(url.startsWith('/assets/img/') && !url.startsWith('/assets/img/responsive/'));
  assert.deepEqual(entry.candidates.map((candidate) => candidate.width), entry.candidates.map((candidate) => candidate.width).sort((a, b) => a - b));
  for (const candidate of entry.candidates) {
    assert.ok(candidate.width < entry.width, 'candidate never upscales the source');
    assert.equal(fs.statSync(path.join(root, 'static', `.${candidate.url}`)).size, candidate.bytes);
    assert.ok(candidate.bytes < source.length, 'every shipped candidate is smaller than its source');
  }
}
let rendered = 0;
for (const post of JSON.parse(fs.readFileSync(path.join(output, 'index.json'), 'utf8'))) {
  const html = fs.readFileSync(path.join(output, `.${decodeURIComponent(post.url)}`, 'index.html'), 'utf8');
  for (const image of images(html)) {
    const entry = manifest.images[image.src];
    if (!entry) continue;
    rendered += 1;
    assert.equal(image['data-original-src'], image.src);
    assert.equal(Number(image.width), entry.width);
    assert.equal(Number(image.height), entry.height);
    assert.equal(image.loading, 'lazy');
    assert.equal(image.decoding, 'async');
    assert.ok(image.sizes);
    for (const candidate of entry.candidates) assert.ok(image.srcset.includes(`${candidate.url} ${candidate.width}w`));
    assert.ok(image.srcset.includes(`${image.src} ${entry.width}w`));
    assert.ok(!image.srcset.includes('ZgotmplZ'));
  }
}
assert.ok(rendered > 0, 'published articles use generated candidates');

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'lily-responsive-test-'));
function put(relative, bytes) {
  const target = path.join(temporary, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
}
const [sourceUrl, entry] = sourceEntries.find(([url, value]) => url.endsWith('.png') && !url.startsWith('/assets/img/optimized/') && value.width > 960)
  || sourceEntries.find(([, value]) => value.width > 960) || sourceEntries[0];
const bundleName = `bundle${path.extname(sourceUrl)}`;
put(`static${sourceUrl}`, fs.readFileSync(path.join(root, `static${sourceUrl}`)));
for (const candidate of entry.candidates) put(`static${candidate.url}`, fs.readFileSync(path.join(root, `static${candidate.url}`)));
put('data/image_variants.json', JSON.stringify(manifest));
put('hugo.toml', 'baseURL="https://fixture.invalid/"\ntitle="Image fixture"\n');
put('layouts/_default/_markup/render-image.html', fs.readFileSync(path.join(root, 'themes/lily-epitaph/layouts/_default/_markup/render-image.html')));
put('layouts/_default/single.html', '{{ .Content }}');
put('layouts/index.html', 'Fixture');
put('layouts/_default/list.html', 'List');
put('content/posts/fixture/index.md', `---\ntitle: Image fixture\ndate: 2020-01-01\n---\n![responsive](${sourceUrl})\n\n![bundle](${bundleName})\n\n![remote](https://images.example.invalid/remote.webp)\n\n![remote-collision](https://images.example.invalid${sourceUrl})\n\n![protocol-relative-collision](//images.example.invalid${sourceUrl})\n\n![missing](/assets/img/optimized/missing.webp)\n`);
put(`content/posts/fixture/${bundleName}`, fs.readFileSync(path.join(root, `static${sourceUrl}`)));
const bundledHugo = path.join(root, '.tools/hugo-0.165.0/hugo.exe');
const hugo = process.env.LILY_TEST_HUGO_PATH || process.env.LILY_HUGO_PATH || (fs.existsSync(bundledHugo) ? bundledHugo : 'hugo');
function build(name) {
  const destination = path.join(temporary, name);
  const result = spawnSync(hugo, ['--source', temporary, '--destination', destination, '--cacheDir', path.join(temporary, 'cache'), '--noBuildLock', '--minify', '--panicOnWarning'], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
  return images(fs.readFileSync(path.join(destination, 'posts/fixture/index.html'), 'utf8'));
}
const initial = build('initial');
assert.ok(initial.find((image) => image.alt === 'responsive').srcset);
const bundle = initial.find((image) => image.alt === 'bundle');
assert.ok(bundle.srcset);
assert.equal(bundle['data-original-src'], `/posts/fixture/${bundleName}`);
for (const alt of ['missing', 'remote', 'remote-collision', 'protocol-relative-collision']) {
  const image = initial.find((image) => image.alt === alt);
  assert.ok(image.src);
  assert.equal(image.srcset, undefined);
  assert.equal(image['data-original-src'], image.src);
  assert.equal(image.width, undefined, 'foreign/missing resources do not borrow local image dimensions');
}

if (process.argv.includes('--check-generator')) {
  // Opt-in local encoder coverage; normal CI only needs Hugo and shipped files.
  for (const [name, fields] of [['draft', 'draft: true'], ['future', 'date: 2999-01-01'], ['protected', 'protected: true']]) {
    put(`content/posts/${name}/index.md`, `---\ntitle: ${name}\n${fields}\n---\n![ignored](/assets/img/${name}${path.extname(sourceUrl)})\n`);
    put(`static/assets/img/${name}${path.extname(sourceUrl)}`, fs.readFileSync(path.join(root, `static${sourceUrl}`)));
  }
  const animated = path.join(temporary, 'static/assets/img/animated.png');
  const animation = spawnSync(process.env.FFMPEG_PATH || 'ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc=size=800x450:rate=2', '-frames:v', '2', '-plays', '0', '-f', 'apng', animated], { encoding: 'utf8', windowsHide: true });
  assert.equal(animation.status, 0, animation.error?.message || animation.stderr);
  put('content/posts/animation/index.md', '---\ntitle: Animated image\ndate: 2020-01-01\n---\n![animated](/assets/img/animated.png)\n');
  const run = () => {
    const result = spawnSync(process.execPath, [path.join(root, 'scripts/optimize-images.mjs'), '--responsive', '--root', temporary], { encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
    return fs.readFileSync(path.join(temporary, 'data/image_variants.json'), 'utf8');
  };
  const first = run();
  assert.deepEqual(Object.keys(JSON.parse(first).images), [sourceUrl]);
  assert.equal(run(), first, 'generator is byte-for-byte repeatable');
  const candidateHashes = entry.candidates.map((candidate) => hash(fs.readFileSync(path.join(temporary, `static${candidate.url}`))));
  for (const candidate of entry.candidates) {
    const file = path.resolve(temporary, `static${candidate.url}`);
    assert.ok(file.startsWith(`${temporary}${path.sep}`));
    fs.unlinkSync(file);
  }
  assert.equal(run(), first, 'fresh encoding produces the same manifest');
  assert.deepEqual(entry.candidates.map((candidate) => hash(fs.readFileSync(path.join(temporary, `static${candidate.url}`)))), candidateHashes, 'fresh encoding reproduces shipped candidate bytes');
}

for (const candidate of entry.candidates) {
  const file = path.resolve(temporary, `static${candidate.url}`);
  assert.ok(file.startsWith(`${temporary}${path.sep}`));
  fs.unlinkSync(file);
}
const absent = build('absent-candidates').find((image) => image.alt === 'responsive');
assert.equal(absent.srcset, undefined);
assert.equal(absent.src, sourceUrl);
assert.equal(Number(absent.width), entry.width);
// Restore candidates, then change the source to another valid public image.
for (const candidate of entry.candidates) put(`static${candidate.url}`, fs.readFileSync(path.join(root, `static${candidate.url}`)));
const different = sourceEntries.find(([url]) => url !== sourceUrl);
assert.ok(different);
put(`static${sourceUrl}`, fs.readFileSync(path.join(root, `static${different[0]}`)));
assert.equal(build('stale-manifest').find((image) => image.alt === 'responsive').srcset, undefined, 'source hash changes disable stale candidates');
const manifestPath = path.resolve(temporary, 'data/image_variants.json');
assert.ok(manifestPath.startsWith(`${temporary}${path.sep}`));
fs.unlinkSync(manifestPath);
assert.equal(build('without-manifest').find((image) => image.alt === 'responsive').srcset, undefined);
console.log(`Responsive image regression passed: ${rendered} published image references, bounded/smaller candidates, original lightbox URLs, bundle images, missing/remote/stale-source/no-manifest fallbacks${process.argv.includes('--check-generator') ? ', repeatable generator' : ''}. Fixture: ${temporary}`);
