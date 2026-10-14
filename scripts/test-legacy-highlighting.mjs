import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(process.argv[2] || path.join(import.meta.dirname, '..'));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const featurePath = 'themes/lily-epitaph/assets/js/features/';
// Run the production modules in fresh browser-like contexts so every scenario
// starts without an optional runtime or a cached request from an earlier case.
const source = read(`${featurePath}legacy-highlighter.js`).replace(/^export /gm, '')
  + '\n' + read(`${featurePath}article.js`).replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
const flush = () => new Promise((resolve) => setImmediate(resolve));

function fixture({ languages = [''], copy = true, existingScript = false } = {}) {
  const scripts = [];
  const timers = new Map();
  let timerId = 0;
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
  const blocks = languages.map((language) => {
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
  });
  const document = {
    body: { dataset: { codeCopy: String(copy) } },
    querySelectorAll: () => [],
    querySelector: () => scripts.find((script) => script.isConnected) || null,
    createElement: () => makeNode(),
    head: { append(script) { scripts.push(script); requests++; } },
  };
  if (existingScript) scripts.push({ ...makeNode(), src: '/assets/vendor/highlight.min.js' });
  const body = {
    querySelectorAll(selector) {
      if (selector === 'pre') return blocks;
      return [];
    },
  };
  const window = {};
  const context = vm.createContext({
    document, window, body, Promise, WeakSet, Event,
    navigator: { clipboard: { writeText: async (text) => { written = text; } } },
    setTimeout: (callback) => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: (id) => timers.delete(id),
  });
  vm.runInContext(source + '\nwindow.enhance = enhanceArticleBody;', context);
  return {
    blocks, scripts, timers, highlighted,
    enhance: () => window.enhance(body),
    get requests() { return requests; },
    get written() { return written; },
    ready() {
      window.hljs = { highlightElement(code) {
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
  };
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
  await flush();
  assert.equal(f.highlighted.length, 2);
  assert.equal(f.blocks[0].dataset.language, 'javascript');
  f.enhance();
  await flush();
  assert.equal(f.highlighted.length, 2, 'already highlighted blocks are left alone');
}
{
  const f = fixture({ copy: false });
  f.enhance();
  assert.equal(f.requests, 1, 'copy preference does not disable highlighting');
  assert.equal(f.blocks[0].children.length, 0);
  f.ready();
  await flush();
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
  await flush();
  assert.equal(f.highlighted.length, 1);
}
{
  const f = fixture({ existingScript: true });
  let protectedRejected = false;
  f.scripts[0].addEventListener('error', () => { protectedRejected = true; });
  f.enhance();
  [...f.timers.values()][0]();
  await flush();
  assert.equal(protectedRejected, true, 'timeout also notifies a protected loader waiting for the same script');
  f.enhance();
  assert.equal(f.requests, 1);
  f.ready();
  await flush();
  assert.equal(f.highlighted.length, 1);
}
{
  const f = fixture();
  f.enhance();
  f.readyWithVendor();
  await flush();
  assert.equal(f.blocks[0].code.dataset.highlighted, 'yes', 'the bundled vendor highlights legacy code');
  assert.match(f.blocks[0].code.innerHTML, /hljs-/);
}
{
  const f = fixture();
  f.readyWithVendor();
  f.enhance();
  await flush();
  assert.equal(f.requests, 0, 'an already loaded protected runtime is reused without another script');
  assert.equal(f.blocks[0].code.dataset.highlighted, 'yes');
}
{
  const f = fixture();
  f.enhance();
  f.blocks[0].isConnected = false;
  f.blocks[0].code.isConnected = false;
  f.ready();
  await flush();
  assert.equal(f.highlighted.length, 0, 'completed requests do not mutate detached PJAX articles');
}
{
  const f = fixture({ existingScript: true });
  f.enhance();
  assert.equal(f.requests, 0, 'reuse an in-flight protected article runtime');
  f.ready();
  await flush();
  assert.equal(f.highlighted.length, 1);
}
{
  const f = fixture();
  f.enhance();
  [...f.timers.values()][0]();
  await flush();
  f.enhance();
  assert.equal(f.requests, 2, 'a stalled runtime times out and can be retried');
  f.ready();
  await flush();
  assert.equal(f.highlighted.length, 1);
}

assert.doesNotMatch(read('themes/lily-epitaph/layouts/partials/scripts.html'), /highlight\.min\.js/);
const vendorBytes = fs.statSync(path.join(root, 'themes/lily-epitaph/static/assets/vendor/highlight.min.js')).size;
console.log(`Legacy highlighting regression passed: typed code skips ${vendorBytes.toLocaleString('en-US')} runtime bytes; concurrent/PJAX enhancement, copy-disabled, failure/retry, detached DOM, existing script, timeout and real bundled vendor cases passed.`);
