import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'lily-site-icon-'));
const bundledHugo = path.join(root, '.tools/hugo-0.165.0/hugo.exe');
const hugo = process.env.LILY_TEST_HUGO_PATH || process.env.LILY_HUGO_PATH || (fs.existsSync(bundledHugo) ? bundledHugo : 'hugo');
function write(file, content) {
  const target = path.join(fixture, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}
const source = fs.readFileSync(path.join(root, 'static/assets/img/optimized/b_d06ff1a0814bc6d063e847e30ce0fd8b.webp'));
write('static/assets/avatar.webp', source);
write('layouts/partials/site-icon.html', fs.readFileSync(path.join(root, 'themes/lily-epitaph/layouts/partials/site-icon.html')));
write('layouts/index.html', '{{ partial "site-icon.html" . }}');
function build(name, params, base = 'https://fixture.invalid/') {
  write('hugo.toml', `baseURL = ${JSON.stringify(base)}\ndisableKinds = ["taxonomy", "term", "RSS", "sitemap"]\n[params]\n${params}\n`);
  const destination = path.join(fixture, name);
  const result = spawnSync(hugo, ['--source', fixture, '--destination', destination, '--cacheDir', path.join(fixture, 'cache'), '--noBuildLock', '--minify', '--panicOnWarning'], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
  const html = fs.readFileSync(path.join(destination, 'index.html'), 'utf8');
  const attrs = Object.fromEntries([...html.matchAll(/(\w+)=(?:"([^"]*)"|([^\s>]+))/g)].map(([, key, quoted, bare]) => [key, quoted ?? bare]));
  return { destination, attrs };
}
const optimized = build('optimized', 'avatar="/assets/avatar.webp"');
assert.equal(optimized.attrs.type, 'image/png');
assert.equal(optimized.attrs.sizes, '48x48');
const bytes = fs.readFileSync(path.join(optimized.destination, optimized.attrs.href));
assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
assert.equal(bytes.readUInt32BE(16), 48);
assert.equal(bytes.readUInt32BE(20), 48);
assert.ok(bytes.length < source.length, 'The generated icon is smaller than the original avatar');
assert.deepEqual(fs.readFileSync(path.join(fixture, 'static/assets/avatar.webp')), source, 'The source avatar remains intact');
for (const [name, params, expected] of [
  ['explicit', 'avatar="/assets/avatar.webp"\nfavicon="/custom.svg"', '/custom.svg'],
  ['remote', 'avatar="https://images.example.invalid/avatar.webp"', 'https://images.example.invalid/avatar.webp'],
  ['protocol-relative', 'avatar="//images.example.invalid/assets/avatar.webp"', '//images.example.invalid/assets/avatar.webp'],
  ['missing', 'avatar="/assets/missing.webp"', '/assets/missing.webp'],
  ['animated', 'avatar="/assets/avatar.gif"', '/assets/avatar.gif'],
  ['query', 'avatar="/assets/avatar.webp?v=2"', '/assets/avatar.webp?v=2'],
]) {
  const { attrs } = build(name, params);
  assert.equal(attrs.href, expected, `${name} preserves the configured URL`);
  assert.equal(attrs.type, undefined);
}
const subpath = build('subpath', 'avatar="/assets/avatar.webp"', 'https://fixture.invalid/blog/');
assert.ok(subpath.attrs.href.startsWith('/blog/icons/'));
console.log(`Site icon regression passed: ${source.length} → ${bytes.length} bytes, PNG dimensions, explicit/remote/missing/animated/query fallbacks, and subpath URL. Fixture: ${fixture}`);
