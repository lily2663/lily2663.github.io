// F1 稳定性验收：同一份源码重复构建，输出必须逐字节可重复。
//
// 背景（本轮实测到的真实缺陷）：
//   站点有 4 组"同一标签不同大小写写法"（wp/shell/python/php）。
//   Hugo 把它们合并成同一 term，但 term 的 .Title 取决于内部处理顺序；
//   当两种写法多寡相当时（wp 是 1:1）没有决胜规则，
//   实测连续 6 次构建 tags/wp 的 <title> 在 WP 与 Wp 之间摇摆。
//   这直接违反文档 F1-01「输出必须可重复」。
//
// 修复：layouts/partials/seo/term-title.html 用"次数多者优先，
//   同次数取码点序最小"的确定性规则派生显示名。
//
// 本测试做两件事：
//   1) 静态检查：该 partial 存在且被 head.html 调用。
//   2) 真实构建：连续构建 N 次，比对歧义 term 的标题必须完全一致。
//
// 用法：
//   node scripts/test-feed-stability.mjs
//   LILY_TEST_PUBLIC_DIR=<build> node scripts/test-feed-stability.mjs  # 只校验已有产物
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const partialPath = path.join(root, 'themes/lily-epitaph/layouts/partials/seo/term-title.html');
const headPath = path.join(root, 'themes/lily-epitaph/layouts/partials/head.html');

// ---- 1) 静态契约 ----
assert.ok(fs.existsSync(partialPath), 'term-title partial 必须存在');
const partialSrc = fs.readFileSync(partialPath, 'utf8');
assert.match(partialSrc, /return \$result/, 'partial 必须返回字符串');
assert.match(partialSrc, /lower/, '必须按小写归一比较');
assert.match(partialSrc, /lt \$raw \$best/, '必须有码点序决胜规则');
assert.ok(!/merge \$counts/.test(partialSrc), '不得用 merge 在 dict 里计数（大小写折叠会丢键）');
const headSrc = fs.readFileSync(headPath, 'utf8');
assert.match(headSrc, /partial "seo\/term-title\.html"/, 'head.html 必须调用 term-title partial');

// ---- 2) 已有产物校验（可选）----
const readTermTitle = (dir, term) => {
  const f = path.join(dir, 'tags', term, 'index.html');
  if (!fs.existsSync(f)) return null;
  const html = fs.readFileSync(f, 'utf8');
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return null;
  return m[1].replace(/\s*·\s*[^·]*$/, '').trim();
};

// 站点当前的 4 组歧义标签（由 tools/audit-tag-case.mjs 发现）
const AMBIGUOUS = ['wp', 'shell', 'python', 'php'];

if (process.env.LILY_TEST_PUBLIC_DIR) {
  const dir = path.resolve(process.env.LILY_TEST_PUBLIC_DIR);
  const titles = {};
  for (const term of AMBIGUOUS) {
    const t = readTermTitle(dir, term);
    if (t) titles[term] = t;
  }
  const found = Object.keys(titles).length;
  assert.ok(found > 0, `在 ${dir} 未找到任何歧义 tag 页`);
  for (const [term, title] of Object.entries(titles)) {
    assert.equal(title.toLowerCase(), term, `tags/${term} 标题应与 term 同名（仅大小写不同），实际 "${title}"`);
  }
  console.log(`Existing-output check passed: ${found} ambiguous terms have stable, case-consistent titles.`);
}

// ---- 3) 真实重复构建 ----
const tempRoot = fs.existsSync(`${root}/.cache/tmp`) ? `${root}/.cache/tmp` : os.tmpdir();
const fixture = fs.mkdtempSync(path.join(tempRoot, 'lily-stability-'));
const hugo = process.env.LILY_TEST_HUGO_PATH
  || process.env.LILY_HUGO_PATH
  || (fs.existsSync(`${root}/.tools/hugo-0.165.0/hugo.exe`) ? `${root}/.tools/hugo-0.165.0/hugo.exe` : 'hugo');

try {
  const write = (rel, content) => {
    const target = path.join(fixture, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };
  write('hugo.toml', `baseURL = "https://example.invalid/"
title = "Stability fixture"
theme = "lily-epitaph"
themesDir = ${JSON.stringify(path.join(root, 'themes'))}
[taxonomies]
  tag = "tags"
[outputs]
  home = ["HTML", "RSS"]
  taxonomy = ["HTML"]
  term = ["HTML", "RSS"]
`);
  write('layouts/index.html', '<!doctype html><html><head>{{ partial "head.html" . }}</head><body><main id="app">{{ block "main" . }}{{ end }}</main></body></html>');
  write('layouts/_default/single.html', '<!doctype html><html><head>{{ partial "head.html" . }}</head><body><main id="app">x</main></body></html>');
  write('layouts/_default/list.html', '<!doctype html><html><head>{{ partial "head.html" . }}</head><body><main id="app">y</main></body></html>');

  // 造 1:1 的歧义（最容易被随机性击穿的情形）
  write('content/posts/a/index.md', '---\ntitle: "A"\ndate: 2026-01-01\ntags:\n  - "WP"\n---\nbody a\n');
  write('content/posts/b/index.md', '---\ntitle: "B"\ndate: 2026-01-02\ntags:\n  - "Wp"\n---\nbody b\n');
  // 再造一组多数派，验证"次数优先"
  write('content/posts/c/index.md', '---\ntitle: "C"\ndate: 2026-01-03\ntags:\n  - "PHP"\n---\nbody c\n');
  write('content/posts/d/index.md', '---\ntitle: "D"\ndate: 2026-01-04\ntags:\n  - "PHP"\n---\nbody d\n');
  write('content/posts/e/index.md', '---\ntitle: "E"\ndate: 2026-01-05\ntags:\n  - "php"\n---\nbody e\n');

  const build = (name) => {
    const dest = path.join(fixture, name);
    const r = spawnSync(hugo, ['--source', fixture, '--destination', dest,
      '--cacheDir', path.join(fixture, 'cache'), '--minify', '--panicOnWarning'], { encoding: 'utf8', windowsHide: true });
    assert.equal(r.status, 0, r.error?.message || r.stderr || r.stdout);
    return dest;
  };

  const runs = [];
  const N = 5;
  for (let i = 0; i < N; i += 1) {
    const out = build(`run${i}`);
    runs.push({
      wp: readTermTitle(out, 'wp'),
      php: readTermTitle(out, 'php'),
    });
  }

  // 所有轮次必须完全一致
  const wpSet = [...new Set(runs.map((r) => r.wp))];
  const phpSet = [...new Set(runs.map((r) => r.php))];
  assert.equal(wpSet.length, 1, `1:1 并列时标题必须唯一，实际出现 ${wpSet.length} 种：${wpSet.join(' / ')}`);
  assert.equal(phpSet.length, 1, `多数派场景标题必须唯一，实际出现 ${phpSet.length} 种：${phpSet.join(' / ')}`);

  // 1:1 并列取码点序最小 → "WP"（大写 U+0057 小于小写 U+0077）
  assert.equal(wpSet[0], 'WP', `1:1 并列应取码点序最小 "WP"，实际 "${wpSet[0]}"`);
  // 多数派 2:1 → "PHP"
  assert.equal(phpSet[0], 'PHP', `多数派应取 "PHP"，实际 "${phpSet[0]}"`);

  console.log(`Stability regression passed: ${N} rebuilds produced identical term titles (wp="${wpSet[0]}", php="${phpSet[0]}").`);
} finally {
  assert.ok(path.basename(fixture).startsWith('lily-stability-'));
  fs.rmSync(fixture, { recursive: true, force: true });
}
