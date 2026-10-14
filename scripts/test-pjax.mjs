import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const source = fs.readFileSync(path.join(root, 'themes/lily-epitaph/assets/js/features/pjax.js'), 'utf8')
  .replace('export function ', 'function ');

function classList() {
  const values = new Set();
  return { add: (...names) => names.forEach((name) => values.add(name)), remove: (...names) => names.forEach((name) => values.delete(name)), contains: (name) => values.has(name) };
}

function createFixture() {
  const handlers = new Map();
  const timers = new Map();
  const requests = [];
  const fallbacks = [];
  const events = [];
  let timerId = 0;
  let currentUrl = new URL('https://example.invalid/');
  const rootElement = { classList: classList() };
  const app = {
    classList: classList(), attributes: new Map(), children: ['initial'], focusCount: 0,
    setAttribute(name, value) { this.attributes.set(name, value); },
    removeAttribute(name) { this.attributes.delete(name); },
    replaceChildren(...nodes) { this.children = nodes; },
    focus() { this.focusCount += 1; },
  };
  const progress = { classList: classList(), offsetWidth: 1 };
  const document = {
    documentElement: rootElement, body: { dataset: {} }, title: 'Initial',
    getElementById: (id) => id === 'app' ? app : null,
    querySelector: (selector) => selector === '#navigation-progress' ? progress : null,
    querySelectorAll: () => [],
    addEventListener: (type, handler) => handlers.set(type, handler),
    dispatchEvent: (event) => events.push(event.type),
  };
  const location = {
    get href() { return currentUrl.href; },
    set href(value) { fallbacks.push(value); currentUrl = new URL(value, currentUrl); },
    get pathname() { return currentUrl.pathname; }, get search() { return currentUrl.search; },
    get origin() { return currentUrl.origin; },
  };
  const schedule = (handler) => { const id = ++timerId; timers.set(id, handler); return id; };
  const sandbox = {
    document, location, URL, AbortController, navigator: {}, Node: class {},
    history: {
      replaceState() {},
      pushState(state, title, url) { currentUrl = new URL(url, currentUrl); },
    },
    scrollY: 0, scrollTo() {}, addEventListener() {},
    matchMedia: (query) => ({ matches: query.includes('prefers-reduced-motion') }),
    CustomEvent: class { constructor(type) { this.type = type; } },
    DOMParser: class {
      parseFromString(html) {
        const page = JSON.parse(html);
        return { title: page.title, scripts: [], getElementById: (id) => id === 'app' && page.app !== false ? { childNodes: [page.route] } : null };
      }
    },
    setTimeout: schedule, clearTimeout: (id) => timers.delete(id),
    requestIdleCallback: schedule,
    fetch: (url, { signal }) => new Promise((resolve, reject) => {
      const request = { url, signal, resolve, reject, aborted: false };
      requests.push(request);
      signal?.addEventListener('abort', () => {
        request.aborted = true;
        reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
      });
    }),
    initialized: 0, scrollUpdates: 0,
  };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  vm.runInContext(`${source}\ninstallPjaxNavigation({ initPage() { initialized += 1; }, updateScroll() { scrollUpdates += 1; } });`, context);

  const link = (pathname) => ({ href: new URL(pathname, currentUrl).href, target: '', hasAttribute: () => false, getAttribute: () => pathname, contains: () => false });
  const click = (targetLink) => {
    let prevented = false;
    handlers.get('click')({ button: 0, target: { closest: () => targetLink }, preventDefault() { prevented = true; } });
    assert.equal(prevented, true, 'internal route uses PJAX');
  };
  const hover = (targetLink) => handlers.get('pointerover')({ target: { closest: () => targetLink }, relatedTarget: null });
  const flush = async () => {
    // Flush promise chains and the deterministic timer/idle queues. No network or
    // wall-clock sleeps are involved in these navigation race regressions.
    for (let turn = 0; turn < 12; turn += 1) {
      await Promise.resolve();
      const pending = [...timers.values()];
      timers.clear();
      for (const timer of pending) timer();
    }
  };
  const respond = (index, route, options = {}) => requests[index].resolve({
    ok: options.status == null || options.status === 200, status: options.status ?? 200,
    text: async () => JSON.stringify({ route, title: `Page ${route}`, app: options.app }),
  });
  const assertSettled = (route, navigations = 1) => {
    assert.equal(location.pathname, route);
    assert.deepEqual(app.children, [route]);
    assert.equal(document.title, `Page ${route}`);
    assert.equal(app.attributes.has('aria-busy'), false);
    assert.equal(rootElement.classList.contains('is-navigating'), false);
    assert.equal(progress.classList.contains('active'), false);
    assert.equal(app.focusCount, navigations);
    assert.equal(context.initialized, navigations);
    assert.deepEqual(events, Array(navigations).fill('lily:before-page-swap'));
    assert.deepEqual(fallbacks, []);
  };
  return { requests, fallbacks, app, rootElement, context, location, link, click, hover, flush, respond, assertSettled };
}

{
  const fixture = createFixture();
  const about = fixture.link('/about/');
  fixture.click(about);
  fixture.click(about);
  assert.equal(fixture.requests.length, 2, 'a repeated click replaces the aborted request');
  assert.equal(fixture.requests[0].aborted, true);
  fixture.respond(1, '/about/');
  await fixture.flush();
  fixture.assertSettled('/about/');
}

{
  const fixture = createFixture();
  fixture.click(fixture.link('/about/'));
  fixture.respond(0, '/about/');
  await fixture.flush();
  fixture.assertSettled('/about/');
  fixture.click(fixture.link('/posts/'));
  assert.equal(fixture.requests.length, 2);
  fixture.respond(1, '/posts/');
  await fixture.flush();
  fixture.assertSettled('/posts/', 2);
  fixture.click(fixture.link('/about/'));
  assert.equal(fixture.requests.length, 2, 'a completed page survives later cancellation and is reused on revisit');
  await fixture.flush();
  fixture.assertSettled('/about/', 3);
}

{
  const fixture = createFixture();
  fixture.click(fixture.link('/about/'));
  fixture.click(fixture.link('/posts/'));
  assert.equal(fixture.requests[0].aborted, true, 'a new route cancels the old route');
  fixture.respond(1, '/posts/');
  await fixture.flush();
  fixture.assertSettled('/posts/');
}

{
  const fixture = createFixture();
  const about = fixture.link('/about/');
  fixture.hover(about);
  await fixture.flush();
  assert.equal(fixture.requests.length, 1, 'hover starts prefetch');
  assert.equal(fixture.requests[0].signal, undefined, 'prefetch is independent of navigation cancellation');
  fixture.click(about);
  assert.equal(fixture.requests.length, 1, 'navigation reuses its pending prefetch');
  fixture.respond(0, '/about/');
  await fixture.flush();
  fixture.assertSettled('/about/');
}

for (const failure of ['network', 'http', 'missing-app']) {
  const fixture = createFixture();
  const about = fixture.link('/about/');
  fixture.click(about);
  if (failure === 'network') fixture.requests[0].reject(new Error('Network unavailable'));
  else fixture.respond(0, '/about/', failure === 'http' ? { status: 503 } : { app: false });
  await fixture.flush();
  assert.deepEqual(fixture.fallbacks, [about.href], `${failure}: use ordinary navigation`);
  assert.equal(fixture.app.attributes.has('aria-busy'), false, `${failure}: clear busy state`);
  assert.equal(fixture.rootElement.classList.contains('is-navigating'), false);
  assert.deepEqual(fixture.app.children, ['initial']);
  assert.equal(fixture.context.initialized, 0);
}

console.log('PJAX regression passed: repeated-route cancellation, A-to-B cancellation, completed-page revisit cache, pending hover prefetch reuse, and network/HTTP/missing-container fallbacks with navigation state cleanup.');
