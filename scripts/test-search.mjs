import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../themes/lily-epitaph/assets/js/features/search.js', import.meta.url), 'utf8');
class Element {
  constructor() { this.dataset = {}; this.children = []; this.handlers = {}; this.value = ''; this.hidden = true; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  addEventListener(type, fn) { this.handlers[type] = fn; }
  attributes = {};
  setAttribute(name, value) { this.attributes[name] = value; }
  removeAttribute(name) { delete this.attributes[name]; }
  classList = { toggle() {} };
}
const entry = { title: 'Netdata2', tags: ['Python'], summary: '文章摘要', text: 'only-full-text', url: '/posts/netdata2/' };
const ok = (entries = [entry]) => ({ ok: true, json: async () => entries });
const tick = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function fixture(fetcher, { dedicated = false, queryString = '', withGrid = true } = {}) {
  const nodes = Object.fromEntries(['#search', '#search-status', '[data-post-grid]', '[data-search-title]', '[data-search-count]', '.search-empty', '[data-post-pagination]', '[data-site-search]', '[data-search-mode-field]', '[data-search-hint]'].map(key => [key, new Element()]));
  const original = new Element();
  nodes['[data-post-grid]'].children = [original];
  nodes['[data-post-grid]'].dataset.postTotal = '21';
  if (dedicated) {
    nodes['[data-search-page]'] = new Element();
    nodes['[data-post-grid]'].children = [];
  }
  if (!withGrid) nodes['[data-post-grid]'] = null;
  const modes = ['article', 'text'].map(mode => { const button = new Element(); button.dataset.searchMode = mode; return button; });
  let calls = 0;
  let sprites = 0;
  const context = vm.createContext({ document: {
    querySelector: key => nodes[key], querySelectorAll: () => modes,
    addEventListener() {}, createElement: () => new Element(),
  }, URL, URLSearchParams, location: { origin: 'https://example.invalid', search: queryString }, HTMLElement: Element,
  fetch: (...args) => { calls++; return fetcher(...args); }, setTimeout, clearTimeout });
  // Track actual card rendering separately from the fixture's DOM nodes.
  context.rendered = () => { sprites++; };
  const tracked = vm.runInContext(source.replace('export function', 'function') + '\ncreatePostSearch({attachPixelSprite: rendered})', context);
  tracked.refreshPageBindings();
  return { api: tracked, nodes, original, modes, get calls() { return calls; }, get sprites() { return sprites; } };
}

// A transient failure must be visible and retryable without reloading the page.
{
  let attempt = 0;
  const f = fixture(async () => { if (++attempt === 1) throw new Error('offline'); return ok(); });
  f.nodes['#search'].value = 'Netdata';
  await f.api.filterPosts();
  assert.match(f.nodes['#search-status'].textContent, /Enter/);
  assert.equal(f.nodes['[data-search-count]'].textContent, '暂不可用');
  assert.equal(f.nodes['.search-empty'].hidden, false);
  f.nodes['#search'].handlers.keydown({ key: 'Enter', preventDefault() {} });
  await tick();
  assert.equal(f.calls, 2);
  assert.equal(f.nodes['[data-post-grid]'].children.length, 1);
  assert.equal(f.nodes['[data-search-count]'].textContent, '1 个结果');
}
// HTTP errors, invalid JSON and invalid index shapes are failures, not empty results.
for (const response of [{ ok: false, status: 503 }, { ok: true, json: async () => { throw new Error('bad JSON'); } }, ok({})]) {
  let attempt = 0;
  const f = fixture(async () => ++attempt === 1 ? response : ok());
  f.nodes['#search'].value = 'Python';
  await f.api.filterPosts();
  assert.match(f.nodes['#search-status'].textContent, /暂时不可用/);
  await f.api.filterPosts();
  assert.equal(f.calls, 2);
  assert.equal(f.nodes['[data-search-count]'].textContent, '1 个结果');
}
// Concurrent inputs share one fetch; only the newest query can render.
{
  let resolve;
  const f = fixture(() => new Promise(done => { resolve = done; }));
  f.nodes['#search'].value = 'absent';
  const old = f.api.filterPosts();
  f.nodes['#search'].value = 'Netdata';
  const latest = f.api.filterPosts();
  resolve(ok());
  await Promise.all([old, latest]);
  assert.equal(f.calls, 1);
  assert.equal(f.sprites, 1);
  f.nodes['#search'].value = '';
  await f.api.filterPosts();
  assert.equal(f.nodes['[data-post-grid]'].children[0], f.original);
  assert.equal(f.nodes['[data-post-pagination]'].hidden, false);
}
// A pending request cannot paint an old page after PJAX binds a new grid.
{
  let resolve;
  const f = fixture(() => new Promise(done => { resolve = done; }));
  f.nodes['#search'].value = 'Netdata';
  const old = f.api.filterPosts();
  const nextGrid = new Element();
  f.nodes['[data-post-grid]'] = nextGrid;
  f.api.refreshPageBindings();
  resolve(ok());
  await old;
  await tick();
  assert.equal(f.sprites, 1);
  assert.equal(nextGrid.children.length, 1);
}
// Clearing a query cancels its pending render, and full-text mode keeps its scope.
{
  let resolve;
  const f = fixture(() => new Promise(done => { resolve = done; }));
  f.nodes['#search'].value = 'Netdata';
  const pending = f.api.filterPosts();
  f.nodes['#search'].value = '';
  await f.api.filterPosts();
  resolve(ok());
  await pending;
  assert.equal(f.sprites, 0);
  assert.equal(f.nodes['[data-post-grid]'].children[0], f.original);
  f.nodes['#search'].value = 'only-full-text';
  await f.api.filterPosts();
  assert.equal(f.nodes['[data-post-grid]'].children.length, 0);
  f.modes[1].handlers.click();
  await tick();
  assert.equal(f.nodes['[data-post-grid]'].children.length, 1);
  assert.equal(f.calls, 1);
}
// Moving to an article without a results grid clears pending global status.
{
  let resolve;
  const f = fixture(() => new Promise(done => { resolve = done; }));
  f.nodes['#search'].value = 'Netdata';
  const pending = f.api.filterPosts();
  f.nodes['[data-post-grid]'] = null;
  f.api.refreshPageBindings();
  assert.equal(f.nodes['#search-status'].textContent, '');
  resolve(ok());
  await pending;
  assert.equal(f.sprites, 0);
  assert.equal(f.nodes['#search-status'].textContent, '');
}
// On article/404/tag pages the header form retains native GET navigation.
{
  const f = fixture(async () => ok(), { withGrid: false });
  f.nodes['#search'].value = 'Netdata';
  await f.api.filterPosts();
  assert.match(f.nodes['#search-status'].textContent, /Enter/);
  let prevented = false;
  f.nodes['#search'].handlers.keydown({ key: 'Enter', preventDefault() { prevented = true; } });
  f.nodes['[data-site-search]'].handlers.submit({ preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
  assert.equal(f.calls, 0);
  assert.equal(f.nodes['#search'].attributes['aria-controls'], undefined);
  f.modes[1].handlers.click();
  assert.equal(f.nodes['[data-search-mode-field]'].value, 'text');
}
// A dedicated search URL restores both query and scope before filtering.
{
  const f = fixture(async () => ok(), { dedicated: true, queryString: '?q=only-full-text&mode=text' });
  await tick();
  assert.equal(f.nodes['#search'].value, 'only-full-text');
  assert.equal(f.nodes['[data-search-mode-field]'].value, 'text');
  assert.equal(f.nodes['[data-post-grid]'].children.length, 1);
  assert.equal(f.nodes['[data-search-hint]'].hidden, true);
  f.nodes['#search'].value = '';
  await f.api.filterPosts();
  assert.equal(f.nodes['[data-search-title]'].textContent, '搜索文章');
  assert.equal(f.nodes['[data-search-hint]'].hidden, false);
}
// Native form submission on an inline results page runs its local search.
{
  const f = fixture(async () => ok());
  f.nodes['#search'].value = 'Netdata';
  let prevented = false;
  f.nodes['[data-site-search]'].handlers.submit({ preventDefault() { prevented = true; } });
  await tick();
  assert.equal(prevented, true);
  assert.equal(f.nodes['[data-post-grid]'].children.length, 1);
}
console.log('Search regression passed: retry, HTTP/JSON failures, request sharing, stale queries, PJAX grid changes, global native forms, URL query/scope, clear and full-text mode.');
