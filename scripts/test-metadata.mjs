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
  // 分享图现在按"文章 shareImage → cover → 站点 shareImage → 头像"解析。
  // fixture 未配置任何分享图来源时，og:image / twitter:image 可以都不输出；
  // 一旦输出，两者必须一致，且尺寸/类型不得只有一半。
  const ogImages = head.querySelectorAll('meta[property="og:image"]');
  const twImages = head.querySelectorAll('meta[name="twitter:image"]');
  assert.equal(ogImages.length, twImages.length, 'og:image 与 twitter:image 数量必须一致');
  if (ogImages.length) {
    assert.equal(ogImages.length, 1, '只允许一个 og:image');
    assert.equal(one(head, 'meta[name="twitter:image"]').getAttribute('content'), one(head, 'meta[property="og:image"]').getAttribute('content'));
    const w = head.querySelectorAll('meta[property="og:image:width"]').length;
    const h = head.querySelectorAll('meta[property="og:image:height"]').length;
    assert.equal(w, h, 'og:image:width 与 height 必须成对出现');
  }
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
      // schema.image 与 og:image 必须使用同一份解析结果（可能都不存在）
      const ogImage = ogImages.length ? ogImages[0].getAttribute('content') : null;
      assert.equal(schema.image ?? null, ogImage, 'JSON-LD image 必须与 og:image 同源');
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
  // 受保护文章即使显式提供 description / summary，也不得采信（M05）
  write('content/posts/zz-protected-explicit/index.md', [
    '---',
    'title: zz-protected-explicit',
    'date: 2026-10-01T10:00:00+08:00',
    'protected: true',
    'description: "CANARY_DESC_4a91"',
    'summary: "CANARY_SUM_8c27"',
    '---',
    'CANARY_BODY_2f60 must never be published.',
    '',
  ].join('\n'));
  // 自动提取必须剔除块级噪声，但保留行内 code 文字（M03）
  write('content/posts/zz-blocks/index.md', [
    '---',
    'title: zz-blocks',
    'date: 2026-10-01T10:00:00+08:00',
    '---',
    '',
    '可读首句提到 `session.save_path` 与 `nmap -sV` 两个技术词。',
    '',
    '```',
    'FENCED_CODE_SENTINEL_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'FENCED_CODE_SENTINEL_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    '```',
    '',
    '| 列 | 值 |',
    '|---|---|',
    '| TABLE_CELL_SENTINEL | x |',
    '',
  ].join('\n'));
  // 中文超长正文：验证回退预算不超过 160 码点且以单个省略号结尾（M07）
  post('zz-longzh', '', `开头一句可见文案。${'这是一段用于测试回退预算的中文正文。'.repeat(30)}`);
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

  // M04/M05：受保护文章的固定公开提示，且显式 description/summary/正文三处 canary 均不出现
  const LOCK_TEXT = '该文章已加密，需访问网站输入密码查看。';
  const protectedHead = readHead('posts/protected/index.html');
  assert.equal(assertMetadata(protectedHead, { description: LOCK_TEXT, article: true }), LOCK_TEXT, '受保护文章使用固定公开提示');
  assert.ok(protectedHead.children.every((node) => !JSON.stringify(node.attributes).includes('PRIVATE_BODY_SENTINEL') && !node.textContent.includes('PRIVATE_BODY_SENTINEL')));
  const protectedExplicitHead = readHead('posts/zz-protected-explicit/index.html');
  assert.equal(assertMetadata(protectedExplicitHead, { description: LOCK_TEXT, article: true }), LOCK_TEXT, '显式 description/summary 不得绕过保护占位');
  const protectedSchema = JSON.parse(one(protectedExplicitHead, 'script[type="application/ld+json"]').textContent);
  const protectedBlob = JSON.stringify(protectedSchema) + protectedExplicitHead.children.map((n) => JSON.stringify(n.attributes) + n.textContent).join('');
  for (const canary of ['CANARY_DESC_4a91', 'CANARY_SUM_8c27', 'CANARY_BODY_2f60']) {
    assert.ok(!protectedBlob.includes(canary), `受保护 canary 不得进入 head: ${canary}`);
  }

  // M03：块级噪声剔除 + 行内 code 文字保留
  const blocksDescription = assertMetadata(readHead('posts/zz-blocks/index.html'), { article: true });
  assert.ok(blocksDescription.includes('session.save_path'), '行内 code 的技术文字应保留');
  assert.ok(blocksDescription.includes('nmap -sV'), '行内 code 的命令名应保留');
  assert.ok(!blocksDescription.includes('FENCED_CODE_SENTINEL'), '代码块不得进入摘要');
  assert.ok(!blocksDescription.includes('TABLE_CELL_SENTINEL'), '表格不得进入摘要');

  // M07：中文超长回退不超过 160 码点，且只有一个省略号
  const longzhDescription = assertMetadata(readHead('posts/zz-longzh/index.html'), { article: true });
  assert.ok([...longzhDescription].length <= 160, `自动回退不得超过 160 码点，实际 ${[...longzhDescription].length}`);
  assert.equal((longzhDescription.match(/…/g) || []).length, 1, '最多一个省略号');
  assert.ok(longzhDescription.startsWith('开头一句可见文案。'), '应从正文开头提取');

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
  // 固定名单断言（pinned=summary, limit=5, pageSize=2）依赖此处的文章集合。
  // 本轮为描述/保护边界新增的 fixture 文章必须落在此名单之外，
  // 因此用 zz- 前缀把它们推到排序末尾，而不是改动既有断言。
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
