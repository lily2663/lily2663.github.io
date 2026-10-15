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
  set textContent(value) { this.children = []; this.text = String(value); }
  get textContent() { return this.text ?? this.children.map(node => node.textContent).join(''); }
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
  let currentUrl = new URL(`${dedicated ? '/search/' : '/'}${queryString}`, 'https://example.invalid');
  let historyWrites = 0;
  const history = { state: { scroll: 123 }, replaceState(state, unused, url) {
    historyWrites++;
    this.state = state;
    currentUrl = new URL(url, currentUrl);
  } };
  const location = {
    get origin() { return currentUrl.origin; },
    get search() { return currentUrl.search; },
    get href() { return currentUrl.href; },
  };
  const context = vm.createContext({ document: {
    querySelector: key => nodes[key], querySelectorAll: () => modes,
    addEventListener() {}, dispatchEvent() {}, createElement: () => new Element(),
    createTextNode: text => ({ textContent: text }),
  }, URL, URLSearchParams, location, history, HTMLElement: Element,
  CustomEvent: class { constructor(type) { this.type = type; } },
  fetch: (...args) => { calls++; return fetcher(...args); }, setTimeout, clearTimeout });
  // Track actual card rendering separately from the fixture's DOM nodes.
  context.rendered = () => { sprites++; };
  const tracked = vm.runInContext(source.replace('export function', 'function') + '\ncreatePostSearch({attachPixelSprite: rendered})', context);
  tracked.refreshPageBindings();
  return { api: tracked, nodes, original, modes, location, history,
    navigate(url) { currentUrl = new URL(url, currentUrl); tracked.refreshPageBindings(); },
    get historyWrites() { return historyWrites; }, get calls() { return calls; }, get sprites() { return sprites; } };
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
// Editing a dedicated search keeps a shareable URL and preserves navigation state.
{
  const f = fixture(async () => ok(), { dedicated: true, queryString: '?q=Python&mode=article' });
  await tick();
  f.nodes['#search'].value = '  Netdata  ';
  await f.api.filterPosts();
  assert.equal(new URL(f.location.href).searchParams.get('q'), 'Netdata');
  assert.equal(f.history.state.scroll, 123);
  const writes = f.historyWrites;
  await f.api.filterPosts();
  assert.equal(f.historyWrites, writes, 'same query does not rewrite history');
  f.api.refreshPageBindings();
  await tick();
  assert.equal(f.nodes['#search'].value, 'Netdata', 'page refresh restores the current query');
  f.modes[1].handlers.click();
  await tick();
  assert.equal(new URL(f.location.href).searchParams.get('mode'), 'text');
  const savedUrl = f.location.href;
  f.navigate('/posts/netdata2/');
  f.navigate(savedUrl);
  await tick();
  assert.equal(f.nodes['#search'].value, 'Netdata');
  assert.equal(f.nodes['[data-search-mode-field]'].value, 'text');
  f.nodes['#search'].value = '';
  await f.api.filterPosts();
  assert.equal(new URL(f.location.href).searchParams.has('q'), false);
  assert.equal(f.nodes['[data-search-hint]'].hidden, false);
}
// Inline home filtering never changes the home URL into an implicit search URL.
{
  const f = fixture(async () => ok());
  f.nodes['#search'].value = 'Netdata';
  await f.api.filterPosts();
  assert.equal(f.historyWrites, 0);
}
// Composing text must not issue a search, intercept candidate selection or submit.
{
  const f = fixture(async () => ok());
  f.nodes['#search'].handlers.compositionstart();
  f.nodes['#search'].value = 'Netdata';
  f.nodes['#search'].handlers.input({ isComposing: true });
  let keyPrevented = false;
  f.nodes['#search'].handlers.keydown({ key: 'Enter', isComposing: true, preventDefault() { keyPrevented = true; } });
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(keyPrevented, false, 'IME owns its Enter key');
  assert.equal(f.calls, 0);
  let submitPrevented = false;
  f.nodes['[data-site-search]'].handlers.submit({ preventDefault() { submitPrevented = true; } });
  assert.equal(submitPrevented, true, 'an implicit submit cannot navigate away during composition');
  f.nodes['#search'].handlers.compositionend();
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(f.calls, 1);
  assert.equal(f.nodes['[data-search-count]'].textContent, '1 个结果');
}
// Full-text results reveal a matching context and render markup as text, not HTML.
{
  const text = `${'前文'.repeat(120)} <img onerror=alert(1)> only-full-text 后文`;
  const f = fixture(async () => ok([{ ...entry, text }]), { dedicated: true, queryString: '?q=only-full-text&mode=text' });
  await tick();
  const excerpt = f.nodes['[data-post-grid]'].children[0].children[0].children[2];
  assert.match(excerpt.textContent, /^…/);
  assert.match(excerpt.textContent, /only-full-text/);
  assert.match(excerpt.textContent, /<img onerror=alert\(1\)>/);
  assert.equal(excerpt.children.filter(node => node.textContent === 'only-full-text').length, 1);
  assert.ok(excerpt.textContent.length < 160);
}
// Protected articles keep only their existing access hint, even if malformed index text matches.
{
  const f = fixture(async () => ok([{ ...entry, protected: true, text: 'private-only-full-text', summary: 'do-not-expose' }]),
    { dedicated: true, queryString: '?q=only-full-text&mode=text' });
  await tick();
  const excerpt = f.nodes['[data-post-grid]'].children[0].children[0].children[2];
  assert.match(excerpt.textContent, /输入密码/);
  assert.ok(!excerpt.textContent.includes('private') && !excerpt.textContent.includes('do-not-expose'));
}
console.log('Search regression passed: failures/retry, concurrent queries, PJAX, native forms, shareable URL/scope, history state, IME composition, safe matching snippets and protected hints.');
