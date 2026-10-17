import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const source = fs.readFileSync(path.join(root, 'themes/lily-epitaph/assets/lily/modules/weather.js'), 'utf8');
const flush = () => new Promise((resolve) => setImmediate(resolve));

function weatherNode(options = {}) {
  return {
    dataset: { latitude: '31.23', longitude: '121.47', unit: 'celsius', ...options.dataset },
    isConnected: true, hiddenAncestor: false, visibility: 'visible',
    rect: { top: 20, left: 20, width: 200, height: 80, bottom: 100, right: 220 },
    state: { textContent: '天气加载中…' },
    getBoundingClientRect() { return this.rect; },
    closest() { return this.hiddenAncestor ? {} : null; },
    querySelector() { return this.state; },
    ...options,
  };
}

function fixture(nodes = [weatherNode()], { withObserver = true, withAbort = true } = {}) {
  const observers = [];
  const requests = [];
  const timers = new Map();
  const documentEvents = new Map();
  const windowEvents = new Map();
  let clock = 0;
  let timerId = 0;
  let currentNodes = nodes;
  const events = (handlers) => ({
    addEventListener(type, callback) {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type).add(callback);
    },
    removeEventListener(type, callback) { handlers.get(type)?.delete(callback); },
  });
  const emit = (handlers, type) => [...(handlers.get(type) || [])].forEach((handler) => handler({ type }));
  const document = {
    ...events(documentEvents),
    querySelectorAll: () => currentNodes.filter((node) => node.isConnected && !node.dataset.lilyWeatherReady),
  };
  const window = {
    ...events(windowEvents), innerHeight: 844, innerWidth: 512,
    getComputedStyle: (node) => ({ visibility: node.visibility }),
  };
  if (withObserver) window.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; this.targets = new Set(); this.observeCalls = 0; observers.push(this); }
    observe(node) { this.targets.add(node); this.observeCalls += 1; }
    unobserve(node) { this.targets.delete(node); }
    disconnect() { this.targets.clear(); this.disconnected = true; }
  };
  vm.runInNewContext(source, {
    document, window, URL, URLSearchParams,
    AbortController: withAbort ? AbortController : undefined,
    Date: class extends Date { static now() { return clock; } },
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout: (id) => timers.delete(id),
    fetch: (url, options) => new Promise((resolve, reject) => {
      const request = { url, options, resolve, reject };
      requests.push(request);
      options.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
    }),
  });
  return {
    requests, observers, timers,
    ready: () => emit(documentEvents, 'lily:page-ready'),
    intersect(node, isIntersecting = true, observer = observers.at(-1)) {
      observer.callback([{ target: node, isIntersecting }]);
    },
    leave: () => emit(documentEvents, 'lily:before-page-swap'),
    nextPage(nextNodes) {
      emit(documentEvents, 'lily:before-page-swap');
      currentNodes.forEach((node) => { node.isConnected = false; });
      currentNodes = nextNodes;
      emit(documentEvents, 'lily:page-ready');
    },
    respond(index = 0, { ok = true, temperature = 21, code = 0 } = {}) {
      requests[index].resolve({ ok, json: async () => ({ current: { temperature_2m: temperature, weather_code: code } }) });
    },
    timeout() {
      assert.equal(timers.size, 1, 'only the shared request owns a timeout');
      const [id, timer] = timers.entries().next().value;
      assert.equal(timer.delay, 8000, 'weather requests have a finite eight-second deadline');
      timers.delete(id);
      timer.callback();
    },
    advance: (duration) => { clock += duration; },
    windowEvent: (type) => emit(windowEvents, type),
    click: () => emit(documentEvents, 'click'),
    transitionEnd: () => emit(documentEvents, 'transitionend'),
    listenerCount: (type) => (windowEvents.get(type)?.size || 0) + (documentEvents.get(type)?.size || 0),
  };
}

// Neither a hidden mobile panel nor a widget below the fold fetches on startup.
{
  const hidden = weatherNode({ rect: { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 } });
  const below = weatherNode({ rect: { top: 1500, left: 20, width: 200, height: 80, bottom: 1580, right: 220 } });
  const view = fixture([hidden, below]);
  assert.equal(view.requests.length, 0);
  view.ready();
  assert.equal(view.observers[0].observeCalls, 2, 'page-ready does not observe pending widgets twice');
  view.intersect(hidden);
  view.intersect(below, false);
  assert.equal(view.requests.length, 0, 'zero-sized hidden widgets never request weather');
  below.rect = weatherNode().rect;
  view.intersect(below);
  view.intersect(below);
  view.ready();
  assert.equal(view.requests.length, 1, 'repeated visibility events share one load');
  hidden.rect = weatherNode().rect;
  view.intersect(hidden);
  assert.equal(view.requests.length, 1, 'visible widgets at the same coordinates share an in-flight request');
  assert.equal(view.observers[0].disconnected, true, 'finished widgets leave no observed targets');
  view.respond();
  await flush();
  assert.equal(hidden.state.textContent, '晴朗 · 21°C');
  assert.equal(below.state.textContent, '晴朗 · 21°C');
  assert.equal(view.timers.size, 0, 'successful requests clear their timeout');
  const revisit = weatherNode();
  view.nextPage([revisit]);
  view.intersect(revisit);
  await flush();
  assert.equal(view.requests.length, 1, 'PJAX revisit reuses fresh weather');
  assert.equal(revisit.state.textContent, '晴朗 · 21°C');
  view.advance(15 * 60000);
  const stale = weatherNode();
  view.nextPage([stale]);
  view.intersect(stale);
  assert.equal(view.requests.length, 2, 'weather refreshes after fifteen minutes');
  view.respond(1, { temperature: 25 });
  await flush();
  assert.equal(stale.state.textContent, '晴朗 · 25°C');
}

// Departed pages release observers, including callbacks already queued by the browser.
{
  const old = weatherNode();
  const view = fixture([old]);
  const previous = view.observers[0];
  view.leave();
  assert.equal(previous.disconnected, true);
  assert.equal(previous.targets.size, 0);
  view.intersect(old, true, previous);
  assert.equal(view.requests.length, 0, 'a queued observer cannot start a request after page cleanup');
  const next = weatherNode({ dataset: { latitude: '40.71', longitude: '-74.01', unit: 'fahrenheit' } });
  view.nextPage([next]);
  view.intersect(next);
  assert.equal(view.requests[0].url.searchParams.get('temperature_unit'), 'fahrenheit');
  view.nextPage([]);
  view.respond(0, { temperature: 65, code: 3 });
  await flush();
  assert.equal(next.state.textContent, '天气加载中…', 'late responses do not update disconnected page widgets');
}

// Failure cooldown applies to separate PJAX instances; no automatic retry loop runs.
for (const failure of ['network', 'http', 'timeout', 'body-timeout']) {
  const node = weatherNode();
  const view = fixture([node]);
  view.intersect(node);
  if (failure === 'network') view.requests[0].reject(new Error('Offline'));
  if (failure === 'http') view.respond(0, { ok: false });
  if (failure === 'body-timeout') {
    view.requests[0].resolve({ ok: true, json: () => new Promise(() => {}) });
    await flush();
  }
  if (failure.includes('timeout')) view.timeout();
  await flush();
  assert.equal(node.state.textContent, '暂时无法获取天气', `${failure}: display the failure instead of loading forever`);
  assert.equal(view.timers.size, 0);
  if (failure.includes('timeout')) assert.equal(view.requests[0].options.signal.aborted, true);
  for (let visit = 0; visit < 3; visit += 1) {
    const again = weatherNode();
    view.nextPage([again]);
    view.intersect(again);
    await flush();
    assert.equal(again.state.textContent, '暂时无法获取天气');
  }
  assert.equal(view.requests.length, 1, `${failure}: repeated visits do not hammer an unavailable service`);
  view.advance(60000);
  const retry = weatherNode();
  view.nextPage([retry]);
  view.intersect(retry);
  assert.equal(view.requests.length, 2, `${failure}: a later visible widget can retry after the cooldown`);
  view.respond(1);
  await flush();
  assert.equal(retry.state.textContent, '晴朗 · 21°C');
}

// The compatibility path waits for the mobile panel toggle without needing a scroll.
{
  const node = weatherNode({ hiddenAncestor: true });
  const view = fixture([node], { withObserver: false, withAbort: false });
  assert.equal(view.requests.length, 0);
  view.ready();
  assert.equal(view.listenerCount('click'), 1, 'reinitialization does not duplicate fallback listeners');
  node.hiddenAncestor = false;
  node.visibility = 'hidden';
  view.click();
  assert.equal(view.requests.length, 0, 'inherited visibility:hidden is not a visible panel');
  node.visibility = 'visible';
  view.click();
  assert.equal(view.requests.length, 1, 'opening the panel starts weather without waiting for scroll or resize');
  for (const type of ['scroll', 'resize', 'click', 'transitionend']) assert.equal(view.listenerCount(type), 0, `${type}: no listener remains after loading`);
  view.timeout();
  await flush();
  assert.equal(node.state.textContent, '暂时无法获取天气', 'timeout also settles when AbortController is unavailable');
  view.respond();
  await flush();
  assert.equal(node.state.textContent, '暂时无法获取天气', 'a late response cannot overwrite timeout failure');
  const below = weatherNode({ rect: { top: 1500, left: 20, width: 200, height: 80, bottom: 1580, right: 220 } });
  view.nextPage([below]);
  assert.equal(view.listenerCount('scroll'), 1);
  view.leave();
  for (const type of ['scroll', 'resize', 'click', 'transitionend']) assert.equal(view.listenerCount(type), 0, `${type}: page cleanup removes fallback listeners`);
}

// A mobile drawer can still be outside the viewport when its opening click runs.
{
  const node = weatherNode({ rect: { top: 900, left: 20, width: 200, height: 80, bottom: 980, right: 220 } });
  const view = fixture([node], { withObserver: false });
  view.click();
  assert.equal(view.requests.length, 0);
  node.rect = weatherNode().rect;
  view.transitionEnd();
  assert.equal(view.requests.length, 1, 'the completed drawer transition starts weather without another click');
  assert.equal(view.listenerCount('transitionend'), 0);
  view.respond();
  await flush();
  assert.equal(node.state.textContent, '晴朗 · 21°C');
}

// A remembered tab already intersects while the closed drawer is visibility:hidden.
// Opening it changes visibility without necessarily emitting another IO entry.
{
  const node = weatherNode({ visibility: 'hidden' });
  const view = fixture([node]);
  view.intersect(node);
  assert.equal(view.requests.length, 0);
  node.visibility = 'visible';
  view.click();
  assert.equal(view.requests.length, 1, 'opening a remembered tab loads without a new intersection callback');
  for (const type of ['click', 'transitionend']) assert.equal(view.listenerCount(type), 0);
  view.respond();
  await flush();
  assert.equal(node.state.textContent, '晴朗 · 21°C');
}

for (const mode of ['observer', 'fallback']) {
  const node = weatherNode({ hiddenAncestor: true });
  const view = fixture([node], { withObserver: mode === 'observer' });
  if (mode === 'observer') view.intersect(node);
  assert.equal(view.requests.length, 0, `${mode}: hidden ancestors suppress requests`);
  node.hiddenAncestor = false;
  node.visibility = 'hidden';
  if (mode === 'observer') view.intersect(node);
  else view.windowEvent('resize');
  assert.equal(view.requests.length, 0, `${mode}: visibility:hidden suppresses requests`);
  node.visibility = 'visible';
  if (mode === 'observer') view.intersect(node);
  else view.windowEvent('scroll');
  assert.equal(view.requests.length, 1, `${mode}: visible widget eventually loads`);
  view.respond();
  await flush();
}

console.log('Weather regression passed: visibility gating, shared requests, PJAX cleanup, cache expiry, failure cooldown, bounded timeouts, and click/scroll/resize compatibility.');
