import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const pjaxSource = fs.readFileSync(path.join(root, 'themes/lily-epitaph/assets/js/features/pjax.js'), 'utf8');

function decodeHtml(value = '') {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|hellip);/gi, (_, entity) => {
    if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(entity[1].toLowerCase() === 'x' ? 2 : 1), entity[1].toLowerCase() === 'x' ? 16 : 10));
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", hellip: '…' }[entity.toLowerCase()];
  });
}

class HeadNode {
  constructor(tag, attributes = {}, text = '') {
    this.tagName = tag.toLowerCase();
    this.attributes = { ...attributes };
    this.textContent = text;
  }
  getAttribute(name) { return this.attributes[name] ?? null; }
  cloneNode() { return new HeadNode(this.tagName, this.attributes, this.textContent); }
  remove() { this.parent.children.splice(this.parent.children.indexOf(this), 1); }
}

function matches(node, selector) {
  const tag = selector.match(/^[a-z]+/i)?.[0];
  if (tag && node.tagName !== tag.toLowerCase()) return false;
  return [...selector.matchAll(/\[([^\s\]=^]+)(?:(\^?=)"([^"]*)")?\]/g)].every(([, name, operator, value]) => {
    const attribute = node.getAttribute(name);
    if (!operator) return attribute !== null;
    return operator === '^=' ? attribute?.startsWith(value) : attribute === value;
  });
}

class Head {
  constructor(nodes = []) { this.children = []; this.append(...nodes); }
  append(...nodes) { nodes.forEach((node) => { node.parent = this; this.children.push(node); }); }
  querySelectorAll(selector) { return this.children.filter((node) => selector.split(',').some((part) => matches(node, part.trim()))); }
}

function parseHead(html) {
  const source = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '';
  const nodes = [];
  for (const match of source.matchAll(/<(meta|link)\b([^>]*)>|<(script|style|title)\b([^>]*)>([\s\S]*?)<\/\3>/gi)) {
    const attributes = {};
    for (const [, name, double, single, unquoted] of (match[2] ?? match[4]).matchAll(/([^\s=/>]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      attributes[name.toLowerCase()] = decodeHtml(double ?? single ?? unquoted ?? '');
    }
    nodes.push(new HeadNode(match[1] || match[3], attributes, match[5] || ''));
  }
  return new Head(nodes);
}

function one(head, selector) {
  const nodes = head.querySelectorAll(selector);
  assert.equal(nodes.length, 1, `Expected one ${selector}`);
  return nodes[0];
}

function assertMetadata(head, { description, article } = {}) {
  const actual = one(head, 'meta[name="description"]').getAttribute('content');
  assert.ok(actual.trim(), 'A rendered page has a nonempty description');
  if (description !== undefined) assert.equal(actual, description);
  assert.equal(one(head, 'meta[property="og:description"]').getAttribute('content'), actual);
  assert.equal(one(head, 'meta[name="twitter:description"]').getAttribute('content'), actual);
  const schema = JSON.parse(one(head, 'script[type="application/ld+json"]').textContent);
  assert.equal(schema.description, actual);
  assert.equal(one(head, 'meta[property="og:title"]').getAttribute('content'), schema.name);
  assert.equal(one(head, 'meta[name="twitter:title"]').getAttribute('content'), schema.name);
  assert.equal(one(head, 'meta[name="twitter:image"]').getAttribute('content'), one(head, 'meta[property="og:image"]').getAttribute('content'));
  const canonical = one(head, 'link[rel="canonical"]').getAttribute('href');
  assert.match(canonical, /^https?:\/\//);
  assert.equal(one(head, 'meta[property="og:url"]').getAttribute('content'), canonical);
  assert.equal(schema.url, canonical);
  if (article !== undefined) {
    assert.equal(schema['@type'] === 'BlogPosting', article);
    assert.equal(one(head, 'meta[property="og:type"]').getAttribute('content'), article ? 'article' : 'website');
    assert.equal(head.querySelectorAll('meta[property^="article:"]').length, article ? 2 : 0);
    if (article) {
      assert.equal(schema.headline, schema.name);
      assert.equal(one(head, 'meta[property="article:published_time"]').getAttribute('content'), schema.datePublished);
      assert.equal(one(head, 'meta[property="article:modified_time"]').getAttribute('content'), schema.dateModified);
      assert.equal(one(head, 'meta[property="og:image"]').getAttribute('content'), schema.image);
    }
  }
  return actual;
}

function navigationFixture(initialHead) {
  const handlers = new Map();
  const timers = [];
  let current = new URL('https://example.invalid/');
  let nextDocument;
  let fetchCount = 0;
  const classList = { add() {}, remove() {}, contains: () => false };
  const app = { classList, setAttribute() {}, removeAttribute() {}, replaceChildren() {}, focus() {} };
  const document = {
    head: initialHead, documentElement: { classList }, body: { dataset: {} },
    getElementById: (id) => id === 'app' ? app : null,
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener: (type, handler) => handlers.set(type, handler), dispatchEvent() {},
  };
  const location = {
    get href() { return current.href; }, set href(value) { throw new Error(`Unexpected full navigation to ${value}`); },
    get pathname() { return current.pathname; }, get search() { return current.search; }, get origin() { return current.origin; },
  };
  const context = vm.createContext({
    document, location, URL, AbortController, navigator: {}, Node: class {},
    history: { replaceState() {}, pushState(_, __, url) { current = new URL(url, current); } },
    scrollY: 0, scrollTo() {}, addEventListener() {},
    matchMedia: (query) => ({ matches: query.includes('prefers-reduced-motion') }),
    CustomEvent: class {}, DOMParser: class { parseFromString() { return nextDocument; } },
    setTimeout: (handler) => { timers.push(handler); return timers.length; }, clearTimeout() {},
    requestIdleCallback: (handler) => timers.push(handler),
    fetch: async () => { fetchCount += 1; return { ok: true, text: async () => '<fixture>' }; },
  });
  context.window = context;
  vm.runInContext(`${pjaxSource.replace('export function ', 'function ')}\ninstallPjaxNavigation({ initPage() {}, updateScroll() {} });`, context);
  const link = (pathname, attributes = []) => ({ target: '', href: new URL(pathname, current).href, hasAttribute: (name) => attributes.includes(name), getAttribute: () => pathname });
  return {
    document,
    assertNativeLink(pathname, attributes = []) {
      const target = link(pathname, attributes);
      const before = fetchCount;
      let prevented = false;
      handlers.get('click')({ button: 0, target: { closest: () => target }, preventDefault() { prevented = true; } });
      assert.equal(prevented, false, 'Native resource links are not intercepted');
      handlers.get('pointerover')({ target: { closest: () => target }, relatedTarget: null });
      timers.splice(0).forEach((handler) => handler());
      assert.equal(fetchCount, before, 'Native resource links are not prefetched as HTML');
    },
    async navigate(head, pathname) {
      nextDocument = { head, title: `Page ${pathname}`, scripts: [], getElementById: () => ({ childNodes: [] }) };
      const target = link(pathname);
      handlers.get('click')({ button: 0, target: { closest: () => target }, preventDefault() {} });
      for (let turn = 0; turn < 16; turn += 1) {
        await Promise.resolve();
        timers.splice(0).forEach((handler) => handler());
      }
      assert.equal(current.pathname, pathname);
      assert.equal(document.title, `Page ${pathname}`);
    },
  };
}

const tempRoot = path.resolve(os.tmpdir());
const fixture = fs.mkdtempSync(path.join(tempRoot, 'lily-metadata-'));
try {
  const write = (relative, content) => {
    const target = path.join(fixture, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };
  const config = `baseURL = "https://example.invalid/"
title = "Metadata fixture"
theme = "lily-epitaph"
themesDir = ${JSON.stringify(path.join(root, 'themes'))}
hasCJKLanguage = true
[params]
description = "Site fallback"
author = "Fixture author"
[outputs]
home = ["HTML", "RSS"]
`;
  write('hugo.toml', config);
  const layout = '<!doctype html><html><head>{{ partial "head.html" . }}</head><body><main id="app">Fixture</main></body></html>';
  for (const file of ['layouts/index.html', 'layouts/_default/single.html', 'layouts/_default/list.html', 'layouts/_default/search.html', 'layouts/404.html']) write(file, layout);
  // Keep this fixture independent of RSS body rendering: it tests head discovery.
  write('layouts/_default/rss.xml', '<rss version="2.0"><channel><title>{{ .Title }}</title></channel></rss>');
  const post = (name, fields, body) => write(`content/posts/${name}/index.md`, `---\ntitle: ${name}\ndate: 2026-10-01T10:00:00+08:00\n${fields}---\n${body}\n`);
  post('explicit', 'description: "  Explicit   description  "\nsummary: "Unused summary"\n', 'UNUSED_EXPLICIT_BODY');
  post('summary', 'description: "   "\nsummary: "  Editorial   summary  "\n', 'UNUSED_SUMMARY_BODY');
  post('inferred', '', `Public article body has **rendered text** and multiple\n whitespace. ${'中文正文内容'.repeat(40)}`);
  post('other', '', 'A different public article has its own useful description.');
  post('protected', 'protected: true\n', 'PRIVATE_BODY_SENTINEL must never become metadata.');
  post('empty', '', '');
  write('content/about.md', '---\ntitle: About\n---\nAbout page body should not replace the site fallback.');
  write('content/search.md', '---\ntitle: Search\nlayout: search\n---\nSearch page.');
  const bundledHugo = path.join(root, '.tools/hugo-0.165.0/hugo.exe');
  const hugo = process.env.LILY_TEST_HUGO_PATH || process.env.LILY_HUGO_PATH || (fs.existsSync(bundledHugo) ? bundledHugo : 'hugo');
  const build = (destination) => {
    const result = spawnSync(hugo, ['--source', fixture, '--destination', destination, '--cacheDir', path.join(fixture, 'cache'), '--minify', '--panicOnWarning'], { encoding: 'utf8', windowsHide: true });
    assert.equal(result.error, undefined, `Hugo is required for metadata fixtures: ${result.error?.message || ''}`);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  };
  const output = path.join(fixture, 'public');
  build(output);
  const readHead = (relative, folder = output) => parseHead(fs.readFileSync(path.join(folder, relative), 'utf8'));
  const explicit = readHead('posts/explicit/index.html');
  assertMetadata(explicit, { description: 'Explicit description', article: true });
  assertMetadata(readHead('posts/summary/index.html'), { description: 'Editorial summary', article: true });
  const inferred = readHead('posts/inferred/index.html');
  const inferredDescription = assertMetadata(inferred, { article: true });
  assert.match(inferredDescription, /^Public article body has rendered text and multiple whitespace\./);
  assert.ok([...inferredDescription].length <= 161, 'The automatic description is bounded');
  assert.notEqual(assertMetadata(readHead('posts/other/index.html')), inferredDescription);
  const protectedHead = readHead('posts/protected/index.html');
  assertMetadata(protectedHead, { description: 'Site fallback', article: true });
  assert.ok(protectedHead.children.every((node) => !JSON.stringify(node.attributes).includes('PRIVATE_BODY_SENTINEL') && !node.textContent.includes('PRIVATE_BODY_SENTINEL')));
  assertMetadata(readHead('posts/empty/index.html'), { description: 'Site fallback', article: true });
  const about = readHead('about/index.html');
  assertMetadata(about, { description: 'Site fallback', article: false });
  const search = readHead('search/index.html');
  assert.equal(one(search, 'meta[name="robots"]').getAttribute('content'), 'noindex,follow');
  assert.equal(one(readHead('404.html'), 'meta[name="robots"]').getAttribute('content'), 'noindex,follow');
  const rssSelector = 'link[rel="alternate"][type="application/rss+xml"]';
  assert.equal(one(explicit, rssSelector).getAttribute('href'), 'https://example.invalid/index.xml');
  assert.equal(one(readHead('posts/index.html'), rssSelector).getAttribute('href'), 'https://example.invalid/posts/index.xml');

  const stable = [
    new HeadNode('link', { rel: 'stylesheet', href: '/theme.css' }),
    new HeadNode('script', { src: '/runtime.js' }),
    new HeadNode('script', {}, 'window.themeInitialized = true;'),
    new HeadNode('style', { id: 'theme-settings' }, ':root { color: black; }'),
    new HeadNode('meta', { name: 'theme-color', content: '#7fb5b0' }),
  ];
  explicit.append(...stable);
  const navigation = navigationFixture(explicit);
  await navigation.navigate(inferred, '/posts/inferred/');
  assertMetadata(navigation.document.head, { description: inferredDescription, article: true });
  await navigation.navigate(readHead('posts/index.html'), '/posts/');
  assert.equal(one(navigation.document.head, rssSelector).getAttribute('href'), 'https://example.invalid/posts/index.xml', 'PJAX updates page-specific RSS discovery');
  await navigation.navigate(about, '/about/');
  assertMetadata(navigation.document.head, { description: 'Site fallback', article: false });
  assert.equal(navigation.document.head.querySelectorAll('meta[property^="article:"]').length, 0, 'Leaving an article removes obsolete publication metadata');
  await navigation.navigate(search, '/search/');
  assert.equal(one(navigation.document.head, 'meta[name="robots"]').getAttribute('content'), 'noindex,follow');
  await navigation.navigate(readHead('about/index.html'), '/about-again/');
  assert.equal(navigation.document.head.querySelectorAll('meta[name="robots"]').length, 0, 'Leaving search removes its noindex directive');
  for (const node of stable) assert.ok(navigation.document.head.children.includes(node), 'PJAX preserves existing styles and runtime initialization nodes');
  assert.equal(navigation.document.head.querySelectorAll('link[rel="stylesheet"]').filter((node) => node.getAttribute('href') === '/theme.css').length, 1);

  write('hugo.toml', `${config.replace('home = ["HTML", "RSS"]', 'home = ["HTML"]')}section = ["HTML"]\ntaxonomy = ["HTML"]\nterm = ["HTML"]\n`);
  const noRssOutput = path.join(fixture, 'without-rss');
  build(noRssOutput);
  const noRssHead = readHead('index.html', noRssOutput);
  assert.equal(noRssHead.querySelectorAll(rssSelector).length, 0, 'A disabled RSS output has no discovery link');
  await navigation.navigate(noRssHead, '/no-rss/');
  assert.equal(navigation.document.head.querySelectorAll(rssSelector).length, 0, 'PJAX removes the previous RSS link when the next page has none');
  navigation.assertNativeLink('/index.xml');
  navigation.assertNativeLink('/feed.rss');
  navigation.assertNativeLink('/resource/', ['data-no-pjax']);

  // Exercise the real list templates: the head must not initialize a default
  // paginator before a module applies its pinned posts, ordering and page size.
  write('hugo.toml', config);
  for (const relative of ['layouts/index.html', 'layouts/_default/list.html']) {
    write(relative, fs.readFileSync(path.join(root, 'themes/lily-epitaph', relative), 'utf8'));
  }
  const homeLayout = `kind: home
slotOrder: [main]
slots:
  main:
    - id: fixture-posts
      module: recent-posts
      config:
        section: posts
        sort: title
        pinned: summary
        limit: 5
        pageSize: 2
        showCount: true
`;
  write('data/lily/layouts/home.yaml', homeLayout);
  write('data/lily/layouts/global.yaml', 'kind: global\nslots: {}\n');
  for (let index = 0; index < 12; index += 1) post(`z-extra-${index}`, 'tags: [fixture]\n', `Extra article ${index}.`);
  const paginatedOutput = path.join(fixture, 'paginated');
  build(paginatedOutput);
  const listUrls = (relative, folder = paginatedOutput) => {
    const html = fs.readFileSync(path.join(folder, relative), 'utf8');
    const grid = html.match(/<div\b[^>]*id=["']?post-grid["']?[^>]*>([\s\S]*?)<nav\b/)?.[1] || '';
    return [...grid.matchAll(/<a\b[^>]*href=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map((match) => decodeHtml(match[1] ?? match[2] ?? match[3]));
  };
  assert.deepEqual(listUrls('index.html'), ['/posts/summary/', '/posts/empty/'], 'Pinned ordering and custom page size survive head rendering');
  assert.deepEqual(listUrls('page/2/index.html'), ['/posts/explicit/', '/posts/inferred/']);
  assert.deepEqual(listUrls('page/3/index.html'), ['/posts/other/'], 'The configured list limit is preserved');
  assert.ok(!fs.existsSync(path.join(paginatedOutput, 'page/4/index.html')), 'Metadata does not add unwanted pagination');
  for (const [relative, url, title] of [
    ['index.html', '/', 'Metadata fixture'],
    ['page/2/index.html', '/page/2/', 'Metadata fixture · 第 2 页'],
    ['page/3/index.html', '/page/3/', 'Metadata fixture · 第 3 页'],
    ['posts/page/2/index.html', '/posts/page/2/', 'Posts · 第 2 页'],
    ['tags/fixture/page/2/index.html', '/tags/fixture/page/2/', 'Fixture · 第 2 页'],
  ]) {
    const head = readHead(relative, paginatedOutput);
    assertMetadata(head, { article: false });
    assert.equal(one(head, 'link[rel="canonical"]').getAttribute('href'), `https://example.invalid${url}`, `${relative} has its own canonical URL`);
    assert.equal(one(head, 'meta[property="og:title"]').getAttribute('content'), title);
    assert.equal(decodeHtml(one(head, 'title').textContent), relative.startsWith('posts/') || relative.startsWith('tags/') ? `${title} · Metadata fixture` : title);
  }
  assert.equal(readHead('tags/index.html', paginatedOutput).querySelectorAll('meta[name="robots"]').length, 0);
  assert.ok(!fs.existsSync(path.join(paginatedOutput, 'tags/page/2/index.html')), 'The tag directory remains unpaginated');
  await navigation.navigate(readHead('page/2/index.html', paginatedOutput), '/page/2/');
  assert.equal(one(navigation.document.head, 'link[rel="canonical"]').getAttribute('href'), 'https://example.invalid/page/2/', 'PJAX retains the destination pager canonical');

  write('hugo.toml', config.replace('https://example.invalid/', 'https://example.invalid/blog/'));
  const subpathOutput = path.join(fixture, 'subpath');
  build(subpathOutput);
  assert.equal(one(readHead('page/2/index.html', subpathOutput), 'link[rel="canonical"]').getAttribute('href'), 'https://example.invalid/blog/page/2/', 'Pager canonicals preserve a site base path exactly once');

  write('data/lily/layouts/home.yaml', homeLayout.replace('module: recent-posts', 'module: recent-posts\n      enabled: false'));
  const unpaginatedOutput = path.join(fixture, 'unpaginated');
  build(unpaginatedOutput);
  assert.ok(!fs.existsSync(path.join(unpaginatedOutput, 'page/2/index.html')), 'Disabling the list does not leave a metadata-created paginator');
  assert.equal(one(readHead('index.html', unpaginatedOutput), 'link[rel="canonical"]').getAttribute('href'), 'https://example.invalid/blog/');

  // A site may still override baseof with a template predating the prepare block.
  // Such overrides retain their body, even though their head has no early pager.
  write('hugo.toml', config);
  write('data/lily/layouts/home.yaml', homeLayout);
  write('layouts/_default/baseof.html', '<!doctype html><html><head>{{ partial "head.html" . }}</head><body><main id="app">{{ block "main" . }}{{ end }}</main></body></html>');
  const legacyBaseOutput = path.join(fixture, 'legacy-base');
  build(legacyBaseOutput);
  assert.deepEqual(listUrls('index.html', legacyBaseOutput), ['/posts/summary/', '/posts/empty/'], 'A legacy base override keeps the homepage list');
  assert.deepEqual(listUrls('page/2/index.html', legacyBaseOutput), ['/posts/explicit/', '/posts/inferred/']);
  assert.ok(listUrls('posts/page/2/index.html', legacyBaseOutput).length > 0, 'A legacy base override keeps section lists');
  assert.ok(listUrls('tags/fixture/page/2/index.html', legacyBaseOutput).length > 0, 'A legacy base override keeps tag lists');
  assert.match(fs.readFileSync(path.join(legacyBaseOutput, 'tags/index.html'), 'utf8'), /tag-cloud/, 'A legacy base override keeps the taxonomy directory');

  // Cache an intentionally empty body as a record, so it is not mistaken for
  // an absent prepare block and rendered a second time with repeated effects.
  write('layouts/_default/baseof.html', '<!doctype html><html><head>{{ block "prepare" . }}{{ end }}{{ partial "head.html" . }}</head><body><main id="app">{{ block "main" . }}{{ end }}</main><output data-render-count>{{ .Store.Get "fixture-list-renders" }}</output></body></html>');
  write('layouts/partials/lily/layout.html', '{{ $page := .page }}{{ $count := $page.Store.Get "fixture-list-renders" | default 0 }}{{ $page.Store.Set "fixture-list-renders" (add $count 1) }}');
  const emptyBodyOutput = path.join(fixture, 'empty-body');
  build(emptyBodyOutput);
  for (const relative of ['index.html', 'posts/index.html', 'tags/index.html', 'tags/fixture/index.html']) {
    assert.match(fs.readFileSync(path.join(emptyBodyOutput, relative), 'utf8'), /<output\b[^>]*data-render-count[^>]*>1<\/output>/, `${relative} prepares an empty body exactly once`);
  }

  if (process.env.LILY_TEST_PUBLIC_DIR) {
    const publicDir = path.resolve(process.env.LILY_TEST_PUBLIC_DIR);
    const home = readHead('index.html', publicDir);
    assertMetadata(home, { article: false });
    const feed = new URL(one(home, rssSelector).getAttribute('href'));
    const homeUrl = new URL(one(home, 'link[rel="canonical"]').getAttribute('href'));
    assert.equal(feed.origin, homeUrl.origin, 'The advertised home feed uses the current site origin');
    const feedPath = path.posix.relative(decodeURIComponent(homeUrl.pathname), decodeURIComponent(feed.pathname));
    assert.ok(feedPath && !feedPath.startsWith('..'), 'The advertised feed stays under the site base path');
    assert.ok(fs.existsSync(path.join(publicDir, feedPath)), 'The advertised home feed exists in the selected output');
    const postsDir = path.join(publicDir, 'posts');
    const posts = fs.readdirSync(postsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory() && entry.name !== 'page' && fs.existsSync(path.join(postsDir, entry.name, 'index.html')));
    for (const entry of posts) assertMetadata(readHead(`posts/${entry.name}/index.html`, publicDir), { article: true });
    const pagers = fs.readdirSync(publicDir, { recursive: true }).map((file) => file.replaceAll('\\', '/')).filter((file) => /(?:^|\/)page\/(?:[2-9]|[1-9]\d+)\/index\.html$/.test(file));
    for (const relative of pagers) {
      const head = readHead(relative, publicDir);
      assertMetadata(head, { article: false });
      const url = new URL(relative.replace(/index\.html$/, ''), homeUrl);
      assert.equal(one(head, 'link[rel="canonical"]').getAttribute('href'), url.href, `${relative} advertises its own URL`);
    }
    console.log(`Metadata output check passed: homepage, ${posts.length} article routes and ${pagers.length} paginated routes in ${publicDir}.`);
  }
  console.log('Metadata regression passed: descriptions, protected-body exclusion, RSS discovery, pager canonicals/titles, custom list ordering/limits, subpath sites, legacy base templates, empty-body preparation, and PJAX metadata updates.');
} finally {
  // mkdtemp owns this exact directory; verify its boundary before recursive cleanup.
  assert.equal(path.dirname(fixture), tempRoot);
  assert.ok(path.basename(fixture).startsWith('lily-metadata-'));
  fs.rmSync(fixture, { recursive: true, force: true });
}
