import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const publicDir = path.resolve(process.env.LILY_TEST_PUBLIC_DIR || path.join(root, 'public'));
const read = (relative) => fs.readFileSync(path.join(publicDir, relative), 'utf8');
const decode = (text) => text.replace(/&#(x[\da-f]+|\d+);/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code)))
  .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function attributes(source) {
  return Object.fromEntries([...source.matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)]
    .map((match) => [match[1], decode(match[2] ?? match[3] ?? match[4] ?? '')]));
}
const hasClass = (attrs, name) => (attrs.class || '').split(/\s+/).includes(name);
const pathname = (url) => new URL(url, 'https://example.invalid').pathname;
const anchors = (html) => [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((match) => ({ attrs: attributes(match[1]), text: decode(match[2].replace(/<[^>]+>/g, '')).trim() }));
const feedLinks = (xml) => [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => decode(match[1].match(/<link>([\s\S]*?)<\/link>/)?.[1] || ''));
function checkArchive(html, expectedUrls) {
  const entries = [...html.matchAll(/<li\b([^>]*)>([\s\S]*?)<\/li>/g)].filter((match) => hasClass(attributes(match[1]), 'archive-entry'));
  const years = [...html.matchAll(/<section\b([^>]*)>/g)].map((match) => ({ start: match.index, year: attributes(match[1])['data-archive-year'] })).filter((item) => item.year);
  const urls = entries.map((entry) => {
    const link = anchors(entry[2]).find((item) => hasClass(item.attrs, 'archive-link'));
    assert.ok(link?.attrs.href && link.text, 'each archive row has a readable linked title/date');
    const time = entry[2].match(/<time\b([^>]*)>([\s\S]*?)<\/time>/);
    assert.ok(time, 'each archive entry uses a semantic time element');
    const date = attributes(time[1]).datetime;
    assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(decode(time[2]), /^\d{2}月\d{2}日$/);
    const year = years.filter((item) => item.start < entry.index).at(-1)?.year;
    assert.equal(year, date.slice(0, 4), 'entry appears under its own year');
    assert.ok(anchors(entry[2]).length === 1, 'one article link per archive row');
    return pathname(link.attrs.href);
  });
  assert.equal(new Set(urls).size, urls.length, 'archive does not duplicate articles');
  assert.deepEqual([...urls].sort(), expectedUrls.map(pathname).sort(), 'archive covers every currently published post exactly once');
  assert.deepEqual(years.map((item) => item.year), years.map((item) => item.year).sort().reverse(), 'years are descending');
  if (!expectedUrls.length) {
    assert.match(html, /还没有已发布的文章/);
    assert.ok(anchors(html).some((link) => link.text === '回到首页' && pathname(link.attrs.href) === '/'));
  }
}

const index = JSON.parse(read('index.json'));
checkArchive(read('archives/index.html'), index.map((item) => item.url));
const home = read('index.html');
const footer = home.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/)?.[1] || '';
assert.ok(anchors(footer).some((link) => pathname(link.attrs.href) === '/archives/' && /归档/.test(link.text)));
assert.ok(anchors(footer).some((link) => pathname(link.attrs.href) === '/index.xml' && link.attrs.type === 'application/rss+xml' && 'data-no-pjax' in link.attrs));
assert.ok([...home.matchAll(/<link\b([^>]*)>/g)].some((match) => {
  const attrs = attributes(match[1]);
  return attrs.rel === 'alternate' && attrs.type === 'application/rss+xml' && pathname(attrs.href) === '/index.xml';
}), 'homepage advertises its RSS feed to readers');
const rssUrls = feedLinks(read('index.xml'));
assert.ok(rssUrls.length > 0 || index.length === 0);
assert.ok(rssUrls.every((url) => pathname(url).startsWith('/posts/')), 'home RSS contains posts, not about/links/utility pages');

// Compile the real templates in a small isolated site. This proves the archive
// and feeds exclude drafts/future posts even in preview builds, do not render
// protected bodies, and retain usable empty/configuration states.
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lily-discovery-test-'));
const write = (relative, source) => { const target = path.join(fixtureRoot, relative); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, source); };
const moveFixture = (from, to) => {
  const sourcePath = path.resolve(fixtureRoot, from);
  const targetPath = path.resolve(fixtureRoot, to);
  assert.ok(sourcePath.startsWith(`${fixtureRoot}${path.sep}`) && targetPath.startsWith(`${fixtureRoot}${path.sep}`), 'fixture moves stay inside the generated temporary directory');
  fs.renameSync(sourcePath, targetPath);
};
for (const relative of ['_default/archives.html', '_default/rss.xml', 'partials/footer.html']) {
  write(`layouts/${relative}`, fs.readFileSync(path.join(root, 'themes/lily-epitaph/layouts', relative), 'utf8'));
}
write('layouts/_default/baseof.html', '<!doctype html><html><body>{{ block "main" . }}{{ end }}{{ partial "footer.html" (dict "Page" . "Config" (site.Params.testFooter | default dict)) }}</body></html>');
write('layouts/_default/single.html', '{{ define "main" }}<h1>{{ .Title }}</h1>{{ end }}');
write('layouts/index.html', '{{ define "main" }}Home{{ end }}');
write('layouts/_default/list.html', '{{ define "main" }}List{{ end }}');
write('hugo.toml', 'baseURL = "https://example.invalid/"\ntitle = "Discovery fixture"\nlocale = "zh-CN"\n[outputs]\nhome = ["HTML", "RSS"]\n');
write('content/archives/index.md', '---\ntitle: 归档\nlayout: archives\n---\n');
write('content/posts/published/index.md', '---\ntitle: Published\ndate: 2020-02-03\n---\nPublic content.\n');
write('content/posts/protected/index.md', '---\ntitle: Protected\ndate: 2019-01-02\nprotected: true\n---\nPROTECTED_BODY_SENTINEL\n');
write('content/posts/draft/index.md', '---\ntitle: Draft\ndate: 2018-01-01\ndraft: true\n---\nDRAFT_BODY_SENTINEL\n');
write('content/posts/future/index.md', '---\ntitle: Future\ndate: 2999-01-01\n---\nFUTURE_BODY_SENTINEL\n');
write('content/about/index.md', '---\ntitle: About\n---\nABOUT_BODY_SENTINEL\n');
const bundledHugo = path.join(root, '.tools/hugo-0.165.0/hugo.exe');
const hugo = process.env.LILY_TEST_HUGO_PATH || process.env.LILY_HUGO_PATH || (fs.existsSync(bundledHugo) ? bundledHugo : 'hugo');
function build(name, extra = []) {
  const destination = path.join(fixtureRoot, name);
  const result = spawnSync(hugo, ['--source', fixtureRoot, '--destination', destination, '--cacheDir', path.join(fixtureRoot, 'cache'), '--minify', '--panicOnWarning', ...extra], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
  return (file) => fs.readFileSync(path.join(destination, file), 'utf8');
}
const preview = build('preview', ['--buildDrafts', '--buildFuture']);
checkArchive(preview('archives/index.html'), ['/posts/published/', '/posts/protected/']);
assert.doesNotMatch(preview('archives/index.html'), /(?:PROTECTED|DRAFT|FUTURE)_BODY_SENTINEL/);
assert.deepEqual(feedLinks(preview('index.xml')).map(pathname).sort(), ['/posts/protected/', '/posts/published/']);
assert.doesNotMatch(preview('index.xml'), /(?:PROTECTED|DRAFT|FUTURE|ABOUT)_BODY_SENTINEL/);
moveFixture('content/posts', 'unpublished-fixture-posts');
const empty = build('empty');
checkArchive(empty('archives/index.html'), []);
write('hidden-links.toml', '[params.testFooter]\nshowArchives = false\nshowRSS = false\n');
const hidden = build('hidden', ['--config', `${path.join(fixtureRoot, 'hugo.toml')},${path.join(fixtureRoot, 'hidden-links.toml')}`]);
assert.doesNotMatch(hidden('index.html'), /site-footer__discovery/, 'footer link visibility is configurable');
// Only test-owned fixture files are moved; repository content remains untouched.
moveFixture('content/archives/index.md', 'archive-page-fixture.md');
write('no-rss.toml', '[outputs]\nhome = ["HTML"]\n');
const disabled = build('disabled', ['--config', `${path.join(fixtureRoot, 'hugo.toml')},${path.join(fixtureRoot, 'no-rss.toml')}`]);
assert.doesNotMatch(disabled('index.html'), /site-footer__discovery/, 'footer omits entries when their destinations are absent');
console.log(`Discovery regression passed: ${index.length} published posts once, year/date semantics, RSS entry/discovery, and isolated draft/future/protected/empty/disabled-destination fixtures. Fixture: ${fixtureRoot}`);
