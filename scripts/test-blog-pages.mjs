import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const output = path.resolve(process.env.LILY_TEST_PUBLIC_DIR || path.join(root, 'public'));
const read = (name) => fs.readFileSync(path.join(output, name), 'utf8');
const form = read('posts/netdata2/index.html').match(/<form\b[^>]*data-site-search[^>]*>[\s\S]*?<\/form>/)?.[0];
assert.ok(form, 'articles expose a native search form');
assert.match(form, /action=["']?\/search\//);
assert.match(form, /method=["']?get/);
assert.match(form, /name=["']?q(?:[\s"'>])/);
assert.match(form, /name=["']?mode(?:[\s"'>])/);
const search = read('search/index.html');
assert.match(search, /data-search-page/);
assert.match(search, /data-post-grid/);
assert.match(search, /data-search-hint/);
assert.match(search, /<meta\s+name=["']?robots["']?\s+content=["']?noindex,follow/);
assert.match(search, /<noscript>/);
const missing = read('404.html');
assert.match(missing, /class=["']?not-found__search/);
assert.match(missing, /action=["']?\/search\//);
assert.match(missing, /href=["']?\/archives\//);
assert.match(missing, /href=["']?\/tags\//);
assert.match(missing, /<meta\s+name=["']?robots["']?\s+content=["']?noindex,follow/);
const sitemap = read('sitemap.xml');
assert.ok(sitemap.includes('/archives/'));
assert.ok(!sitemap.includes('/search/'), 'noindex search page is not advertised in the sitemap');
for (const route of ['lily-debug', 'lily-manager', 'lily-playground']) {
  assert.ok(!sitemap.includes(`/${route}/`), 'production sitemap excludes local workbench pages');
  // Existing public may retain old build output; clean builds must not emit it.
  if (process.env.LILY_TEST_PUBLIC_DIR) assert.ok(!fs.existsSync(path.join(output, route, 'index.html')));
}
assert.ok(!/lily-(?:debug|manager|playground)/.test(read('index.xml')));
const workflow = fs.readFileSync(path.join(root, '.github/workflows/hugo.yaml'), 'utf8');
assert.match(workflow, /hugo --gc --minify --panicOnWarning/);
assert.ok(workflow.indexOf('npm run test:runtime') > workflow.indexOf('name: Build public site'));
console.log('Blog pages regression passed: native global search, accessible search/404 paths, clean production sitemap, RSS and CI runtime checks.');
