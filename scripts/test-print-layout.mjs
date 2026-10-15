import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const theme = path.join(root, 'themes/lily-epitaph');
const cssSource = fs.readFileSync(path.join(theme, 'assets/css/theme/print.css'), 'utf8');
const withoutComments = cssSource.replace(/\/\*[\s\S]*?\*\//g, '').trim();
assert.match(withoutComments, /^@media\s+print\s*\{/);
// Prove the print guard wraps the entire sheet, even if it is later inlined.
let depth = 0;
let quote = '';
for (let index = withoutComments.indexOf('{'); index < withoutComments.length; index++) {
  const character = withoutComments[index];
  if (quote) {
    if (character === quote && withoutComments[index - 1] !== '\\') quote = '';
    continue;
  }
  if (character === '"' || character === "'") quote = character;
  else if (character === '{') depth++;
  else if (character === '}') {
    depth--;
    if (!depth) assert.equal(withoutComments.slice(index + 1).trim(), '', 'no screen declarations escape the print media');
  }
  assert.ok(depth >= 0);
}
assert.equal(depth, 0);

function declarationsFor(selector) {
  const rules = [...withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  return rules.filter(([, selectors]) => selectors.split(',').map((value) => value.trim()).includes(selector))
    .map(([, , declarations]) => declarations).join('\n');
}
assert.match(declarationsFor(':root[data-theme="dark"]'), /color-scheme:\s*light\s*!important/);
assert.match(declarationsFor('body'), /background:\s*#fff\s*!important/);
assert.match(declarationsFor('body'), /color:\s*#000\s*!important/);
assert.match(declarationsFor('body #app'), /filter:\s*none\s*!important/);
assert.match(declarationsFor('body #app'), /opacity:\s*1\s*!important/);
for (const selector of ['.welcome-splash', '.site-header', '.site-footer', '.toc-wrap', '.code-copy', '.tuanzi', '.lightbox',
  '[data-lily-slot$=".sidebar"]', '[data-lily-slot="article.after"]', 'html body #app [data-protected-layout][hidden]']) {
  assert.match(declarationsFor(selector), /display:\s*none\s*!important/, `${selector} cannot intrude into the printed article`);
}
assert.match(declarationsFor('.article-body pre'), /overflow:\s*visible\s*!important/);
assert.match(declarationsFor('.article-body pre'), /white-space:\s*pre-wrap\s*!important/);
assert.match(declarationsFor('.article-body pre'), /break-inside:\s*auto\s*!important/);
assert.match(declarationsFor('.article-body table'), /display:\s*table\s*!important/);
assert.match(declarationsFor('.article-body thead'), /display:\s*table-header-group\s*!important/);
assert.match(declarationsFor('.article-body td'), /overflow-wrap:\s*anywhere\s*!important/);
assert.match(declarationsFor('.article-body a[href]::after'), /content:\s*none\s*!important/);
assert.match(declarationsFor('.article-body a.print-url[href^="https://"]::after'), /content:\s*" \("\s+attr\(href\)/);

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([^\s=<>]+)=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
    .map(([, name, double, single, unquoted]) => [name, double ?? single ?? unquoted]));
}
function inspectPrintResource(directory, relative) {
  const html = fs.readFileSync(path.join(directory, relative), 'utf8');
  const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1];
  assert.ok(head, `${relative}: complete head exists`);
  const styles = [...head.matchAll(/<link\b[^>]*>/g)].map(([tag]) => ({ tag, attrs: attributes(tag), position: head.indexOf(tag) }))
    .filter(({ attrs }) => attrs.rel === 'stylesheet');
  const print = styles.filter(({ attrs }) => attrs.media === 'print' && /\/css\/theme\/print(?:\.min)?\./.test(attrs.href));
  assert.equal(print.length, 1, `${relative}: one dedicated print stylesheet`);
  assert.equal(styles.at(-1), print[0], 'print follows all theme/Hugo/module stylesheets');
  assert.ok(print[0].position > head.indexOf('</style>', head.indexOf('site-theme-overrides')), 'print follows inline theme variables');
  const pathname = decodeURIComponent(new URL(print[0].attrs.href, 'https://fixture.invalid').pathname);
  const file = path.resolve(directory, `.${pathname}`);
  assert.ok(file.startsWith(path.resolve(directory) + path.sep), 'the CSS URL stays inside the build output');
  const bytes = fs.readFileSync(file);
  assert.match(bytes.toString(), /@media print\{/);
  assert.equal(print[0].attrs.integrity, `sha256-${crypto.createHash('sha256').update(bytes).digest('base64')}`);
  return { html, printCss: file, bytes: bytes.length };
}

// Generate synthetic content only in a new temporary site. Repository articles
// and private-content are never read or modified by this fixture.
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'lily-print-layout-'));
const write = (relative, content) => {
  const target = path.join(fixture, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};
write('hugo.toml', `baseURL = "https://fixture.invalid/"
title = "Print fixture"
theme = "lily-epitaph"
themesDir = ${JSON.stringify(path.join(root, 'themes'))}
hasCJKLanguage = true
[params]
description = "Print fixture description"
author = "Fixture"
[params.theme]
paper = "#111111"
ink = "#eeeeee"
darkPaper = "#111111"
darkInk = "#eeeeee"
webFonts = false
[params.article]
toc = true
codeCopy = true
[params.protected]
enabled = true
[markup.highlight]
noClasses = false
`);
write('content/posts/long/index.md', `---
title: "打印夹具：长代码与表格"
date: 2020-01-01T08:00:00+08:00
lastmod: 2020-02-01T08:00:00+08:00
---
# 正文标题

PRINT_PUBLIC_SENTINEL 可打印正文与[外部链接](https://example.invalid/reference)。

\`\`\`js
${Array.from({ length: 120 }, (_, index) => `const line${index} = "${'long_code_token_'.repeat(14)}";`).join('\n')}
\`\`\`

| 第一列 | 第二列 | 第三列 |
| --- | --- | --- |
| 正文表格 | ${'long-cell-token-'.repeat(30)} | 末列 |

## 后续正文

${'打印分页检查段落，保留正文内容。\n\n'.repeat(30)}`);
write('content/posts/locked/index.md', `---
title: "Locked fixture"
date: 2020-01-02T08:00:00+08:00
protected: true
commentId: locked-fixture
---
PRINT_PRIVATE_SENTINEL must never enter a locked article's HTML.
`);
const bundledHugo = path.join(root, '.tools/hugo-0.165.0/hugo.exe');
const hugo = process.env.LILY_TEST_HUGO_PATH || process.env.LILY_HUGO_PATH || (fs.existsSync(bundledHugo) ? bundledHugo : 'hugo');
const output = path.join(fixture, 'public');
const build = spawnSync(hugo, ['build', '--source', fixture, '--destination', output, '--cacheDir', path.join(fixture, 'cache'),
  '--minify', '--panicOnWarning'], { encoding: 'utf8', windowsHide: true });
assert.equal(build.status, 0, build.error?.message || build.stderr || build.stdout);
const article = inspectPrintResource(output, 'posts/long/index.html');
assert.match(article.html, /PRINT_PUBLIC_SENTINEL/);
assert.match(article.html, /<table>/);
assert.match(article.html, /<thead>/);
assert.match(article.html, /long_code_token_/);
assert.match(article.html, /article-updated/);
assert.match(article.html, /site-theme-overrides/);
const locked = inspectPrintResource(output, 'posts/locked/index.html');
assert.doesNotMatch(locked.html, /PRINT_PRIVATE_SENTINEL/);
assert.match(locked.html, /data-protected-layout[^>]*\bhidden\b/);
assert.match(locked.html, /data-protected-body[^>]*><\/div>/);
inspectPrintResource(output, 'index.html');

if (process.env.LILY_TEST_PUBLIC_DIR) {
  const production = path.resolve(process.env.LILY_TEST_PUBLIC_DIR);
  const entries = JSON.parse(fs.readFileSync(path.join(production, 'index.json'), 'utf8'));
  for (const entry of entries) {
    const pathname = decodeURIComponent(new URL(entry.url, 'https://fixture.invalid').pathname);
    inspectPrintResource(production, path.join(`.${pathname}`, 'index.html'));
  }
  inspectPrintResource(production, 'index.html');
  console.log(`Print output check passed: ${entries.length} articles plus homepage in ${production}.`);
}
console.log(`Print regression passed: print-only/fingerprinted final stylesheet, print CSS safety contracts, real Hugo long-code/table fixture and locked-body exclusion. CSS ${article.bytes} bytes. Fixture: ${fixture}`);
console.log('Pagination, lazy-image readiness and printer/PDF appearance still require a browser print-preview check.');
