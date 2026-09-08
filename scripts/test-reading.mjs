import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Run after npm run build. Optional root argument supports isolated verification.
const root = path.resolve(process.argv[2] || path.join(import.meta.dirname, '..'));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('public/posts/index.html');
const article = read('public/posts/netdata2/index.html');
assert.match(index, /data-lily-module=["']?taxonomy-terms/);
assert.match(index, /href=["']?\/posts\/netdata2\//);
assert.match(article, /toc-wrap--sticky/);
const webFontsEnabled = /^\s*webFonts\s*=\s*true\s*$/m.test(read('hugo.toml'));
assert.equal(/fonts\.googleapis\.com/.test(article), webFontsEnabled);
const images = [...article.matchAll(/<img\b[^>]*src=["']?\/assets\/img\/optimized\/typora\/[^>]*>/g)];
assert.ok(images.length >= 2);
for (const [image] of images) {
  assert.match(image, /\bwidth=["']?\d+/);
  assert.match(image, /\bheight=["']?\d+/);
}
const contract = JSON.parse(read('themes/lily-epitaph/theme-config.schema.json'));
assert.ok(contract.sections.flatMap(s => s.fields).some(f => f.path === 'params.theme.webFonts' && f.type === 'boolean'));

// Exercise the actual enhancement function with a small DOM fixture, including
// successful, rejected and unavailable clipboard APIs (not just source matching).
const source = read('themes/lily-epitaph/assets/js/site.js');
const start = source.indexOf('  function enhanceArticleBody(');
const end = source.indexOf('\n  // 完整保留', start);
assert.ok(start > 0 && end > start);
async function checkCopy(mode, withCode = true) {
  let handler;
  let written;
  const code = { textContent: 'const answer = 42;\n', classList: ['language-js'] };
  const button = { addEventListener: (_, fn) => { handler = fn; } };
  const clone = { textContent: code.textContent + '复制', querySelectorAll: () => [{ remove: () => { clone.textContent = code.textContent; } }] };
  const pre = {
    dataset: {}, querySelector: () => withCode ? code : null,
    cloneNode: () => clone, append: () => {}, innerText: code.textContent + '复制',
  };
  const body = { querySelectorAll: selector => selector === 'pre' ? [pre] : [] };
  const clipboard = mode === 'unavailable' ? undefined : { writeText: async text => {
    if (mode === 'rejected') throw new Error('permission denied');
    written = text;
  } };
  const context = vm.createContext({ document: { body: { dataset: {} }, createElement: () => button },
    navigator: { clipboard }, window: {}, ensureHeadingIds: () => [], setTimeout: () => {}, body });
  vm.runInContext(source.slice(start, end) + '\nenhanceArticleBody(body);', context);
  await handler();
  assert.equal(button.textContent, mode === 'ok' ? '已复制' : '请手动复制');
  assert.equal(written, mode === 'ok' ? code.textContent : undefined);
}
await checkCopy('ok');
await checkCopy('ok', false);
await checkCopy('rejected');
await checkCopy('unavailable');
console.log('Reading regression passed: article index, TOC rendering, local fonts, reserved image dimensions, configuration contract, and 4 clipboard cases.');
