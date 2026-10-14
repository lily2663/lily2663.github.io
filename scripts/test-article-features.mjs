import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import YAML from 'yaml';
import Ajv from 'ajv';

// Run after a site build. LILY_TEST_PUBLIC_DIR points at a clean destination;
// --fixture-only runs synthetic Hugo and browser-behavior cases independently.
const root = path.resolve(import.meta.dirname, '..');
const theme = path.join(root, 'themes/lily-epitaph');
const publicDir = path.resolve(process.env.LILY_TEST_PUBLIC_DIR || path.join(root, 'public'));
const read = (file) => fs.readFileSync(file, 'utf8');
const readTheme = (relative) => read(path.join(theme, relative));
const protocol = JSON.parse(readTheme('docs/protocol/module-manifest.v1.schema.json'));
const validateManifest = new Ajv({ allErrors: true }).compile(protocol);
const footerManifest = YAML.parse(readTheme('data/lily/modules/article-footer.yaml'));
const metaManifest = YAML.parse(readTheme('data/lily/modules/article-meta.yaml'));
for (const manifest of [footerManifest, metaManifest]) {
  assert.ok(validateManifest(manifest), JSON.stringify(validateManifest.errors));
}
assert.equal(metaManifest.defaults.showUpdate, true);
assert.equal(metaManifest.schema.showUpdate.type, 'boolean');
assert.equal(footerManifest.schema.relatedLimit.max, 3);
const siteArticleLayout = path.join(root, 'data/lily/layouts/article.yaml');
const articleLayout = YAML.parse(fs.existsSync(siteArticleLayout) ? fs.readFileSync(siteArticleLayout, 'utf8') : readTheme('data/lily/layouts/article.yaml'));
const footerPosition = articleLayout.slots.after.findIndex((instance) => instance.module === 'article-footer');
assert.ok(footerPosition >= 0 && footerPosition < articleLayout.slots.after.findIndex((instance) => instance.module === 'comments'));

function attribute(tag, name) {
  const match = tag?.match(new RegExp(`(?:^|\\s)${name}=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`));
  const value = match ? match[1] ?? match[2] ?? match[3] : null;
  return value?.replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&#x([a-f0-9]+);/gi, (_, number) => String.fromCodePoint(parseInt(number, 16)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"') ?? null;
}
function markedTags(html, tag, marker) {
  return [...html.matchAll(new RegExp(`<${tag}\\b[^>]*\\b${marker}\\b[^>]*>`, 'g'))].map(([value]) => value);
}
function linkFor(html, marker) {
  return attribute(markedTags(html, 'a', marker)[0], 'href');
}
function outputHtml(directory, url) {
  const pathname = decodeURIComponent(new URL(url, 'https://fixture.invalid/').pathname);
  const resolved = path.resolve(directory, `.${pathname}`, 'index.html');
  assert.ok(resolved.startsWith(path.resolve(directory) + path.sep), 'article URL stays inside the build destination');
  return read(resolved);
}
function relatedLinks(html) {
  return markedTags(html, 'a', 'data-article-related').map((tag) => attribute(tag, 'href'));
}

// A real Hugo fixture uses production resolver, manifests and templates. Drafts
// and scheduled posts are deliberately built, so filtering cannot rely on Hugo
// silently omitting their output pages in a normal production build.
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lily-article-features-'));
function writeFixture(relative, text) {
  const destination = path.join(fixtureRoot, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, text);
}
for (const relative of [
  'layouts/partials/lily/layout.html', 'layouts/partials/lily/slot.html',
  'layouts/partials/lily/runtime/resolve.html', 'layouts/partials/lily/utils/kind.html',
  'layouts/partials/lily/utils/merge.html', 'layouts/partials/lily/utils/warn.html',
  'layouts/partials/lily/modules/article-meta/render.html', 'layouts/partials/lily/modules/article-footer/render.html',
  'data/lily/modules/article-meta.yaml', 'data/lily/modules/article-footer.yaml',
]) writeFixture(relative, readTheme(relative));
writeFixture('hugo.toml', 'baseURL = "https://fixture.invalid/"\ntimeZone = "Asia/Shanghai"\n');
writeFixture('layouts/_default/single.html', '<!doctype html><html><body>{{ partial "lily/layout.html" (dict "kind" "article" "page" .) }}</body></html>');
writeFixture('layouts/index.html', '<!doctype html><title>Article fixture</title>');
const fixtureLayout = {
  kind: 'article', slotOrder: ['header', 'after'],
  slots: { header: [{ id: 'meta', module: 'article-meta' }], after: [{ id: 'footer', module: 'article-footer' }] },
};
function saveLayout() { writeFixture('data/lily/layouts/article.yaml', YAML.stringify(fixtureLayout)); }
saveLayout();
const posts = [
  { slug: 'older', date: '2020-01-01T08:00:00+08:00', tags: ['alpha'] },
  { slug: 'strong-related', date: '2020-01-02T08:00:00+08:00', tags: ['alpha', 'beta'] },
  { slug: 'current', date: '2020-01-03T08:00:00+08:00', lastmod: '2020-02-03T08:00:00+08:00', tags: ['alpha', 'beta'] },
  { slug: 'z-same-date', date: '2020-01-03T08:00:00+08:00', tags: [] },
  { slug: 'weak-recent', date: '2020-01-04T08:00:00+08:00', tags: ['alpha'] },
  { slug: 'newer', date: '2020-01-05T08:00:00+08:00', tags: ['gamma'] },
  { slug: 'protected', date: '2020-01-06T08:00:00+08:00', tags: ['alpha'], protected: true, summary: 'PRIVATE_SUMMARY_MUST_NOT_APPEAR' },
  { slug: 'unrelated', date: '2020-01-07T08:00:00+08:00', tags: ['other'] },
  { slug: 'draft', date: '2020-01-03T09:00:00+08:00', tags: ['alpha', 'beta'], draft: true },
  { slug: 'future-date', date: '2099-01-01T08:00:00+08:00', tags: ['alpha', 'beta'] },
  { slug: 'future-publish', date: '2020-01-03T10:00:00+08:00', publishDate: '2099-01-01T08:00:00+08:00', tags: ['alpha', 'beta'] },
];
for (const post of posts) {
  writeFixture(`content/posts/${post.slug}/index.md`, `---\n${YAML.stringify({ title: post.slug, ...post })}---\nPRIVATE_BODY_MUST_NOT_APPEAR\n`);
}
const bundledHugo = path.join(root, '.tools/hugo-0.165.0/hugo.exe');
const hugo = process.env.LILY_TEST_HUGO_PATH || process.env.LILY_HUGO_PATH || (fs.existsSync(bundledHugo) ? bundledHugo : 'hugo');
function buildFixture(name) {
  const destination = path.join(fixtureRoot, name);
  const built = spawnSync(hugo, ['build', '--source', fixtureRoot, '--destination', destination,
    '--cacheDir', path.join(fixtureRoot, 'cache'), '--buildDrafts', '--buildFuture', '--quiet'], { encoding: 'utf8' });
  assert.equal(built.status, 0, built.stdout + built.stderr);
  return destination;
}
const synthetic = buildFixture('public');
const current = outputHtml(synthetic, '/posts/current/');
assert.match(current, /data-lily-module="article-footer"/);
assert.equal(linkFor(current, 'data-article-previous'), '/posts/strong-related/');
assert.equal(linkFor(current, 'data-article-next'), '/posts/z-same-date/');
assert.deepEqual(relatedLinks(current), ['/posts/strong-related/', '/posts/protected/', '/posts/weak-recent/']);
assert.match(current, /共同标签：alpha、beta/);
assert.match(current, /受保护文章，需密码阅读。/);
assert.doesNotMatch(current, /PRIVATE_SUMMARY_MUST_NOT_APPEAR|PRIVATE_BODY_MUST_NOT_APPEAR/);
assert.equal(attribute(current.match(/article-updated[\s\S]*?<time\b[^>]*>/)?.[0], 'datetime'), '2020-02-03T08:00:00+08:00');
assert.equal(attribute(markedTags(current, 'input', 'data-permalink-input')[0], 'value'), 'https://fixture.invalid/posts/current/');
assert.equal(linkFor(outputHtml(synthetic, '/posts/older/'), 'data-article-previous'), null);
assert.equal(linkFor(outputHtml(synthetic, '/posts/unrelated/'), 'data-article-next'), null);
assert.doesNotMatch(outputHtml(synthetic, '/posts/older/'), /article-updated/);
assert.deepEqual(relatedLinks(outputHtml(synthetic, '/posts/newer/')), []);
for (const slug of ['draft', 'future-date', 'future-publish']) {
  assert.doesNotMatch(outputHtml(synthetic, `/posts/${slug}/`), /class="article-footer"/);
  assert.doesNotMatch(current, new RegExp(`href="/posts/${slug}/"`));
}
fixtureLayout.slots.after[0].config = { relatedLimit: 1 };
saveLayout();
assert.deepEqual(relatedLinks(outputHtml(buildFixture('one-related'), '/posts/current/')), ['/posts/strong-related/']);
fixtureLayout.slots.after[0].config = { showPermalink: false, showNavigation: false, showRelated: false };
fixtureLayout.slots.header[0].config = { showUpdate: false };
saveLayout();
const disabled = outputHtml(buildFixture('disabled'), '/posts/current/');
assert.doesNotMatch(disabled, /data-copy-permalink|data-article-previous|data-article-next|data-article-related|article-updated/);

// Exercise event delegation and asynchronous clipboard behavior across simulated
// page swaps. No network or browser package is needed for these failure paths.
const footerSource = readTheme('assets/lily/modules/article-footer.js');
function clipboardFixture(mode) {
  const handlers = [];
  const copied = [];
  let resolveWrite;
  const clipboard = mode === 'missing' ? undefined : { writeText: async (value) => {
    copied.push(value);
    if (mode === 'reject') throw new Error('permission denied');
    if (mode === 'pending') await new Promise((resolve) => { resolveWrite = resolve; });
  } };
  const document = { addEventListener: (event, handler) => { assert.equal(event, 'click'); handlers.push(handler); } };
  const context = vm.createContext({ document, navigator: { clipboard } });
  vm.runInContext(footerSource, context);
  vm.runInContext(footerSource, context);
  assert.equal(handlers.length, 1, 're-evaluation cannot duplicate delegated bindings');
  function share(url) {
    const input = { value: url, focus() { this.focused = true; }, select() { this.selected = true; } };
    const status = { textContent: '' };
    const fallback = { hidden: true };
    const nodes = { '[data-permalink-input]': input, '[data-permalink-status]': status, '[data-permalink-fallback]': fallback };
    const root = { isConnected: true, querySelector: (selector) => nodes[selector] };
    const button = { disabled: false, isConnected: true, closest: (selector) => selector === '[data-copy-permalink]' ? button : root };
    return { root, button, input, status, fallback, click: () => handlers[0]({ target: button }) };
  }
  return { copied, share, resolve: () => resolveWrite() };
}
{
  const f = clipboardFixture('success');
  const first = f.share('https://fixture.invalid/posts/first/');
  await first.click();
  assert.equal(first.status.textContent, '链接已复制。');
  first.root.isConnected = first.button.isConnected = false;
  const next = f.share('https://fixture.invalid/posts/next/');
  await next.click();
  assert.deepEqual(f.copied, ['https://fixture.invalid/posts/first/', 'https://fixture.invalid/posts/next/']);
  assert.equal(next.button.disabled, false);
}
for (const mode of ['reject', 'missing']) {
  const f = clipboardFixture(mode);
  const page = f.share('https://fixture.invalid/posts/selectable/');
  await page.click();
  assert.equal(page.fallback.hidden, false);
  assert.equal(page.input.focused, true);
  assert.equal(page.input.selected, true);
  assert.match(page.status.textContent, /手动复制/);
  assert.equal(page.input.value, 'https://fixture.invalid/posts/selectable/');
  assert.equal(page.button.disabled, false);
}
{
  const f = clipboardFixture('pending');
  const page = f.share('https://fixture.invalid/posts/leaving/');
  const work = page.click();
  await page.click();
  assert.equal(f.copied.length, 1, 'pending clicks do not create duplicate clipboard operations');
  page.root.isConnected = page.button.isConnected = false;
  f.resolve();
  await work;
  assert.equal(page.status.textContent, '', 'completed copy does not change a detached page');
}

if (!process.argv.includes('--fixture-only')) {
  const index = JSON.parse(read(path.join(publicDir, 'index.json')));
  const articles = index.map((entry) => {
    const html = outputHtml(publicDir, entry.url);
    const head = html.match(/<header\b[^>]*class=(?:"article-head"|'article-head'|article-head)[^>]*>[\s\S]*?<\/header>/)?.[0];
    assert.ok(head, `${entry.url}: article header exists`);
    const date = attribute(head.match(/<time\b[^>]*>/)?.[0], 'datetime');
    assert.ok(Number.isFinite(Date.parse(date)), `${entry.url}: semantic publication date`);
    assert.match(html, /data-lily-module=(?:"article-footer"|'article-footer'|article-footer)/);
    const permalink = attribute(markedTags(html, 'input', 'data-permalink-input')[0], 'value');
    assert.equal(new URL(permalink).pathname, new URL(entry.url, 'https://fixture.invalid').pathname);
    return { ...entry, date, html };
  }).sort((left, right) => Date.parse(left.date) - Date.parse(right.date) || (left.url < right.url ? -1 : left.url > right.url ? 1 : 0));
  for (const [position, article] of articles.entries()) {
    assert.equal(linkFor(article.html, 'data-article-previous'), articles[position - 1]?.url || null, `${article.url}: previous is chronologically older`);
    assert.equal(linkFor(article.html, 'data-article-next'), articles[position + 1]?.url || null, `${article.url}: next is chronologically newer`);
    const matches = articles.filter((candidate) => candidate.url !== article.url && (candidate.tags || []).some((tag) => (article.tags || []).includes(tag)));
    const links = relatedLinks(article.html);
    assert.equal(links.length, Math.min(3, matches.length), `${article.url}: bounded tag matches`);
    assert.equal(new Set(links).size, links.length);
    for (const link of links) {
      assert.ok(matches.some((candidate) => candidate.url === link), `${article.url}: ${link} has a real shared tag`);
      assert.ok(outputHtml(publicDir, link).length > 0, `${link}: linked build output exists`);
    }
  }
  console.log(`Built article checks passed: ${articles.length} articles in ${publicDir}.`);
}
console.log(`Article feature regression passed: protocol manifests, chronological/tag fixtures, filters, config switches, semantic dates, clipboard fallback and PJAX delegation. Fixture: ${fixtureRoot}`);
