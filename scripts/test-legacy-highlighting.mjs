import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(process.argv.slice(2).find((argument) => !argument.startsWith('--')) || path.join(import.meta.dirname, '..'));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const featurePath = 'themes/lily-epitaph/assets/js/features/';
// Run the production modules in fresh browser-like contexts so every scenario
// starts without an optional runtime or a cached request from an earlier case.
const source = read(`${featurePath}legacy-highlighter.js`).replace(/^export /gm, '')
  + '\n' + read(`${featurePath}article.js`).replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
const flush = () => new Promise((resolve) => setImmediate(resolve));

function fixture({ languages = [''], copy = true, existingScript = false,
  withObserver = true, idle = true, visibleCount = Infinity, highlightCost = 0, realClock = false } = {}) {
  const scripts = [];
  const timers = new Map();
  const idleCallbacks = new Map();
  const observers = [];
  const documentHandlers = new Map();
  let timerId = 0;
  let clock = 0;
  let requests = 0;
  let written;
  const highlighted = [];
  const makeNode = () => ({
    dataset: {}, isConnected: true, handlers: new Map(),
    addEventListener(type, handler) {
      if (!this.handlers.has(type)) this.handlers.set(type, new Set());
      this.handlers.get(type).add(handler);
    },
    removeEventListener(type, handler) { this.handlers.get(type)?.delete(handler); },
    emit(type) { for (const handler of [...(this.handlers.get(type) || [])]) handler({ type }); },
    dispatchEvent(event) { this.emit(event.type); },
    remove() { this.isConnected = false; },
  });
  const makeBlock = (language) => {
    const code = language === null ? null : {
      ...makeNode(), classList: new Set(language ? [`language-${language}`] : []),
      className: language ? `language-${language}` : '', children: [], textContent: 'const answer = 42;\n',
    };
    const pre = {
      ...makeNode(), code, children: [],
      querySelector(selector) { return selector === 'code' ? code : null; },
      contains(node) { return node === code; },
      append(node) { this.children.push(node); },
      cloneNode() { return { textContent: 'plain pre\n', querySelectorAll: () => [] }; },
    };
    if (code) code.parentNode = pre;
    return pre;
  };
  const blocks = languages.map(makeBlock);
  const document = {
    body: { dataset: { codeCopy: String(copy) } },
    querySelectorAll: () => [],
    querySelector: () => scripts.find((script) => script.isConnected) || null,
    createElement: () => makeNode(),
    head: { append(script) { scripts.push(script); requests++; } },
    addEventListener(type, handler) {
      if (!documentHandlers.has(type)) documentHandlers.set(type, new Set());
      documentHandlers.get(type).add(handler);
    },
  };
  if (existingScript) scripts.push({ ...makeNode(), src: '/assets/vendor/highlight.min.js' });
  const body = {
    querySelectorAll(selector) {
      if (selector === 'pre') return blocks;
      return [];
    },
  };
  const window = {};
  if (withObserver) window.IntersectionObserver = class {
    constructor(callback, options) { this.callback = callback; this.options = options; this.targets = new Set(); observers.push(this); }
    observe(pre) {
      this.targets.add(pre);
      this.callback([{ target: pre, isIntersecting: blocks.indexOf(pre) < visibleCount }]);
    }
    unobserve(pre) { this.targets.delete(pre); }
    disconnect() { this.targets.clear(); this.disconnected = true; }
  };
  const globals = {
    document, window, body, Promise, WeakSet, Event,
    performance: { now: () => realClock ? performance.now() : clock },
    navigator: { clipboard: { writeText: async (text) => { written = text; } } },
    setTimeout: (callback, delay) => { timers.set(++timerId, { callback, delay }); return timerId; },
    clearTimeout: (id) => timers.delete(id),
  };
  if (idle) {
    globals.requestIdleCallback = (callback) => { idleCallbacks.set(++timerId, callback); return timerId; };
    globals.cancelIdleCallback = (id) => idleCallbacks.delete(id);
  }
  const context = vm.createContext(globals);
  vm.runInContext(source + '\nwindow.enhance = enhanceArticleBody;', context);
  const result = {
    blocks, scripts, timers, highlighted, observers, idleCallbacks,
    enhance: () => window.enhance(body),
    get requests() { return requests; },
    get written() { return written; },
    ready() {
      window.hljs = { highlightElement(code) {
        clock += highlightCost;
        highlighted.push(code);
        code.dataset.highlighted = 'yes';
        code.result = { language: 'javascript' };
      } };
      scripts.find((script) => script.isConnected)?.emit('load');
    },
    readyWithVendor() {
      vm.runInContext(read('themes/lily-epitaph/static/assets/vendor/highlight.min.js') + '\nwindow.hljs = hljs;', context);
      scripts.find((script) => script.isConnected)?.emit('load');
    },
    timeoutScript() {
      const [id, timer] = [...timers].find(([, value]) => value.delay === 15000);
      timers.delete(id);
      timer.callback();
    },
    runSlice(timeRemaining = 50) {
      if (idleCallbacks.size) {
        const [id, callback] = idleCallbacks.entries().next().value;
        idleCallbacks.delete(id);
        callback({ didTimeout: false, timeRemaining: () => timeRemaining });
        return true;
      }
      const timer = [...timers].find(([, value]) => value.delay === 16);
      if (!timer) return false;
      timers.delete(timer[0]);
      timer[1].callback();
      return true;
    },
    async drain() {
      await flush();
      let slices = 0;
      while (result.runSlice()) {
        assert.ok(++slices < 1000, 'bounded scheduling makes progress');
        await flush();
      }
      return slices;
    },
    intersect(indices, visible = true) {
      for (const observer of observers) {
        if (!observer.disconnected) observer.callback(indices.map((index) => ({ target: blocks[index], isIntersecting: visible })));
      }
    },
    leavePage() { for (const handler of documentHandlers.get('lily:before-page-swap') || []) handler(); },
    nextPage(languages = ['']) {
      result.leavePage();
      for (const pre of blocks) { pre.isConnected = false; if (pre.code) pre.code.isConnected = false; }
      blocks.splice(0, blocks.length, ...languages.map(makeBlock));
      result.enhance();
    },
    setHighlighter(callback) { window.hljs = { highlightElement: callback }; },
  };
  return result;
}

{
  const f = fixture({ languages: ['js', null] });
  f.enhance();
  assert.equal(f.requests, 0, 'server-highlighted and plain pre content need no runtime');
  assert.equal(f.blocks[0].dataset.language, 'js');
  assert.equal(f.blocks[0].children.length, 1);
}
{
  const f = fixture({ languages: ['', ''] });
  f.enhance();
  f.enhance();
  assert.equal(f.requests, 1, 'concurrent blocks and repeated initialization share one request');
  assert.equal(f.blocks[0].children.length, 1, 'copy controls are not duplicated');
  const copyButton = f.blocks[0].children[0];
  await [...copyButton.handlers.get('click')][0]();
  assert.equal(f.written, 'const answer = 42;\n', 'copy works before optional runtime loads');
  f.ready();
  await f.drain();
  assert.equal(f.highlighted.length, 2);
  assert.equal(f.blocks[0].dataset.language, 'javascript');
  f.enhance();
  await f.drain();
  assert.equal(f.highlighted.length, 2, 'already highlighted blocks are left alone');
}
{
  const f = fixture({ copy: false });
  f.enhance();
  assert.equal(f.requests, 1, 'copy preference does not disable highlighting');
  assert.equal(f.blocks[0].children.length, 0);
  f.ready();
  await f.drain();
  assert.equal(f.highlighted.length, 1);
}
{
  const f = fixture();
  f.enhance();
  f.scripts[0].emit('error');
  await flush();
  assert.equal(f.blocks[0].code.textContent, 'const answer = 42;\n');
  assert.equal(f.blocks[0].children.length, 1);
  assert.equal(f.scripts[0].isConnected, false, 'failed script cannot poison future attempts');
  f.enhance();
  assert.equal(f.requests, 2, 'a later page enhancement can retry a failed load');
  f.ready();
  await f.drain();
  assert.equal(f.highlighted.length, 1);
}
{
  const f = fixture({ existingScript: true });
  let protectedRejected = false;
  f.scripts[0].addEventListener('error', () => { protectedRejected = true; });
  f.enhance();
  f.timeoutScript();
  await flush();
  assert.equal(protectedRejected, true, 'timeout also notifies a protected loader waiting for the same script');
  f.enhance();
  assert.equal(f.requests, 1);
  f.ready();
  await f.drain();
  assert.equal(f.highlighted.length, 1);
}
{
  const f = fixture();
  f.enhance();
  f.readyWithVendor();
  await f.drain();
  assert.equal(f.blocks[0].code.dataset.highlighted, 'yes', 'the bundled vendor highlights legacy code');
  assert.match(f.blocks[0].code.innerHTML, /hljs-/);
}
{
  const f = fixture();
  f.readyWithVendor();
  f.enhance();
  await f.drain();
  assert.equal(f.requests, 0, 'an already loaded protected runtime is reused without another script');
  assert.equal(f.blocks[0].code.dataset.highlighted, 'yes');
}
{
  const f = fixture();
  f.enhance();
  f.blocks[0].isConnected = false;
  f.blocks[0].code.isConnected = false;
  f.ready();
  await f.drain();
  assert.equal(f.highlighted.length, 0, 'completed requests do not mutate detached PJAX articles');
}
{
  const f = fixture({ existingScript: true });
  f.enhance();
  assert.equal(f.requests, 0, 'reuse an in-flight protected article runtime');
  f.ready();
  await f.drain();
  assert.equal(f.highlighted.length, 1);
}
{
  const f = fixture();
  f.enhance();
  f.timeoutScript();
  await flush();
  f.enhance();
  assert.equal(f.requests, 2, 'a stalled runtime times out and can be retried');
  f.ready();
  await f.drain();
  assert.equal(f.highlighted.length, 1);
}

{
  const f = fixture({ languages: Array(109).fill(''), visibleCount: 0 });
  f.enhance();
  assert.equal(f.requests, 0, 'offscreen legacy blocks do not download or run the runtime');
  assert.equal(f.blocks.every((pre) => pre.children.length === 1), true, 'offscreen blocks remain copyable');
  f.leavePage();
  assert.equal(f.observers[0].disconnected, true);
}
{
  const f = fixture({ languages: Array(109).fill(''), visibleCount: 2 });
  f.enhance();
  f.ready();
  await flush();
  assert.equal(f.highlighted.length, 0, 'runtime completion never synchronously highlights the entire article');
  assert.equal(f.runSlice(), true);
  assert.equal(f.highlighted.length, 2);
  assert.equal(await f.drain(), 0, 'remaining offscreen blocks wait for an intersection');
  f.intersect([108]);
  await f.drain();
  assert.equal(f.highlighted.length, 3, 'a jump to the end prioritizes that nearby block');
  assert.equal(f.highlighted[2], f.blocks[108].code);
  f.leavePage();
}
{
  const f = fixture();
  f.enhance();
  f.intersect([0], false);
  f.ready();
  await f.drain();
  assert.equal(f.highlighted.length, 0, 'scrolling away during download removes the block from the eligible queue');
  f.intersect([0]);
  await f.drain();
  assert.equal(f.highlighted.length, 1);
}
{
  const f = fixture({ languages: Array(109).fill(''), withObserver: false, idle: false });
  f.enhance();
  f.ready();
  await flush();
  let slices = 0;
  while (true) {
    const before = f.highlighted.length;
    if (!f.runSlice()) break;
    slices++;
    assert.ok(f.highlighted.length - before <= 2, 'timer fallback also yields after at most two blocks');
  }
  assert.equal(f.highlighted.length, 109);
  assert.equal(slices, 55, '109 blocks are split across 55 fallback tasks');
}
for (const [withObserver, idle] of [[false, true], [true, false]]) {
  const f = fixture({ languages: ['', '', '', '', ''], withObserver, idle, visibleCount: 2 });
  f.enhance();
  f.ready();
  await f.drain();
  assert.equal(f.highlighted.length, withObserver ? 2 : 5, 'each optional API can be absent independently');
  if (withObserver) {
    f.intersect([2, 3, 4]);
    await f.drain();
    assert.equal(f.highlighted.length, 5);
  }
}
for (const options of [{ highlightCost: 5 }, {}]) {
  const f = fixture({ languages: ['', '', ''], ...options });
  f.enhance();
  f.ready();
  await flush();
  f.runSlice(options.highlightCost ? 50 : 0);
  assert.equal(f.highlighted.length, 1, 'elapsed-time and idle-deadline limits yield after one costly block');
  await f.drain();
  assert.equal(f.highlighted.length, 3);
}
{
  const f = fixture({ languages: ['', '', ''] });
  f.enhance();
  f.ready();
  await flush();
  assert.equal(f.idleCallbacks.size, 1);
  f.leavePage();
  assert.equal(f.idleCallbacks.size, 0, 'PJAX cancels the old scheduled task');
  await f.drain();
  assert.equal(f.highlighted.length, 0);
  assert.equal(f.observers[0].disconnected, true);
  f.nextPage();
  await f.drain();
  assert.equal(f.requests, 1, 'the next article reuses the runtime without restarting the old queue');
  assert.equal(f.highlighted.length, 1);
}
{
  const f = fixture();
  f.enhance();
  f.leavePage();
  f.ready();
  await f.drain();
  assert.equal(f.highlighted.length, 0, 'late downloads cannot schedule work for a cancelled page');
}
{
  const f = fixture();
  f.blocks[0].code.dataset.highlighted = 'yes';
  f.enhance();
  assert.equal(f.requests, 0, 'protected/already-highlighted DOM is preserved');
}

// Lightbox selection must keep the original image when srcset picks a thumbnail.
{
  const handlers = new Map();
  const preview = {};
  const button = { addEventListener() {}, focus() {} };
  const dialog = {
    setAttribute() {}, addEventListener() {}, showModal() {},
    classList: { add() {} }, querySelector: (selector) => selector === 'img' ? preview : button,
  };
  const document = {
    createElement: () => dialog, body: { append() {} },
    addEventListener: (type, handler) => handlers.set(type, handler),
  };
  const context = vm.createContext({ document, window: {} });
  vm.runInContext(source + '\ninstallArticleLightbox();', context);
  for (const [dataset, currentSrc, src, expected] of [
    [{ originalSrc: '/full.webp' }, '/small.webp', '/fallback.webp', '/full.webp'],
    [{}, '/small.webp', '/fallback.webp', '/small.webp'],
    [{}, '', '/fallback.webp', '/fallback.webp'],
  ]) {
    const image = { dataset, currentSrc, src, alt: 'Example', closest: () => null };
    handlers.get('click')({ target: { closest: () => image } });
    assert.equal(preview.src, expected);
  }
}

assert.doesNotMatch(read('themes/lily-epitaph/layouts/partials/scripts.html'), /highlight\.min\.js/);
if (process.argv.includes('--benchmark-public')) {
  const output = path.resolve(process.env.LILY_TEST_PUBLIC_DIR || path.join(root, 'public'));
  const html = fs.readFileSync(path.join(output, 'posts/ssti/index.html'), 'utf8');
  const snippets = [...html.matchAll(/<pre\b[^>]*>[\s\S]*?<\/pre>/g)].map(([pre]) => pre)
    .filter((pre) => /<code\b/.test(pre) && !/<code\b[^>]*\bclass=(?:"[^"]*language-|[^\s>]*language-)/.test(pre))
    .map((pre) => pre.replace(/<[^>]*>/g, '').replace(/&#(x[\da-f]+|\d+);/gi, (_, number) => String.fromCodePoint(number[0].toLowerCase() === 'x' ? parseInt(number.slice(1), 16) : Number(number)))
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
  const f = fixture({ languages: snippets.map(() => ''), withObserver: false, idle: false, realClock: true });
  snippets.forEach((snippet, index) => { f.blocks[index].code.textContent = snippet; });
  f.enhance();
  f.readyWithVendor();
  await flush();
  const durations = [];
  while (true) {
    const before = f.blocks.filter((pre) => pre.code.dataset.highlighted).length;
    const started = performance.now();
    if (!f.runSlice()) break;
    durations.push(performance.now() - started);
    assert.ok(f.blocks.filter((pre) => pre.code.dataset.highlighted).length - before <= 2);
  }
  assert.equal(f.blocks.filter((pre) => pre.code.dataset.highlighted).length, snippets.length);
  console.log(`Local Node vendor benchmark (not browser INP): ${JSON.stringify({ article: '/posts/ssti/', blocks: snippets.length, slices: durations.length,
    totalWorkMs: Number(durations.reduce((sum, value) => sum + value, 0).toFixed(1)), maxSliceMs: Number(Math.max(...durations).toFixed(1)) })}`);
}
const vendorBytes = fs.statSync(path.join(root, 'themes/lily-epitaph/static/assets/vendor/highlight.min.js')).size;
console.log(`Legacy highlighting regression passed: typed code skips ${vendorBytes.toLocaleString('en-US')} runtime bytes; viewport-only priority, 109 blocks in 55 bounded fallback tasks, idle/time budgets, PJAX cancellation, copy, retries, protected runtime, real vendor and original-image lightbox cases passed.`);
