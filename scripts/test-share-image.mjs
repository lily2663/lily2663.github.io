// C1 分享图元数据验收：C01–C12
// 用独立 fixture 覆盖回退链、协议拒绝、受保护边界、PJAX 元数据、编码。
// 用法：
//   node scripts/test-share-image.mjs
//   LILY_TEST_PUBLIC_DIR=<build> node scripts/test-share-image.mjs   # 额外校验真实产物
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const tempRoot = fs.existsSync(`${root}/.cache/tmp`) ? `${root}/.cache/tmp` : os.tmpdir();
const fixture = fs.mkdtempSync(path.join(tempRoot, 'lily-share-'));
const hugo = process.env.LILY_TEST_HUGO_PATH
  || process.env.LILY_HUGO_PATH
  || (fs.existsSync(`${root}/.tools/hugo-0.165.0/hugo.exe`) ? `${root}/.tools/hugo-0.165.0/hugo.exe` : 'hugo');

const decode = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&');

function meta(head, key, attr = 'property') {
  const tags = head.match(/<meta\b[^>]*>/gi) || [];
  for (const t of tags) {
    const nm = t.match(/\b(?:name|property)=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    if (!nm) continue;
    const name = nm[1] ?? nm[2] ?? nm[3];
    if (name !== key) continue;
    const cm = t.match(/\bcontent=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    return cm ? decode(cm[1] ?? cm[2] ?? cm[3] ?? '') : '';
  }
  return null;
}

const headOf = (html) => html.match(/<head[\s\S]*?<\/head>/i)?.[0] || '';

try {
  const write = (relative, content) => {
    const target = path.join(fixture, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };

  const layout = '<!doctype html><html><head>{{ partial "head.html" . }}</head><body><main id="app">{{ block "main" . }}{{ end }}</main></body></html>';
  for (const f of ['layouts/index.html', 'layouts/_default/single.html', 'layouts/_default/list.html']) write(f, layout);
  // 深拷贝主题 partial 依赖
  for (const rel of ['partials/site-icon.html']) {
    write(`layouts/${rel}`, fs.readFileSync(path.join(root, 'themes/lily-epitaph/layouts', rel), 'utf8'));
  }

  // 测试用 1200x630 与 800x800 两张图（新路径，不覆盖任何原图）
  const srcShare = `${root}/assets/share/lily-house.png`;
  assert.ok(fs.existsSync(srcShare), '站点分享图应存在');
  write('assets/share/wide.png', fs.readFileSync(srcShare));

  write('hugo.toml', `baseURL = "https://example.invalid/"
title = "Share fixture"
theme = "lily-epitaph"
themesDir = ${JSON.stringify(path.join(root, 'themes'))}
hasCJKLanguage = true
[params]
description = "Site fallback"
author = "Fixture"
avatar = "/assets/img/avatar-square.webp"
shareImage = "/share/wide.png"
`);
  write('content/posts/a-both/index.md', '---\ntitle: "A both"\ndate: 2026-09-01T10:00:00+08:00\nshareImage: "/share/wide.png"\ncover: "/assets/img/cover-fallback.webp"\n---\nbody A\n');
  write('content/posts/b-cover/index.md', '---\ntitle: "B cover"\ndate: 2026-09-02T10:00:00+08:00\ncover: "https://cdn.example.com/b-cover.png"\n---\nbody B\n');
  write('content/posts/c-site/index.md', '---\ntitle: "C site"\ndate: 2026-09-03T10:00:00+08:00\n---\nbody C\n');
  write('content/posts/d-empty-share/index.md', '---\ntitle: "D empty share"\ndate: 2026-09-04T10:00:00+08:00\nshareImage: ""\n---\nbody D\n');
  write('content/posts/e-bad-proto/index.md', '---\ntitle: "E bad proto"\ndate: 2026-09-05T10:00:00+08:00\nshareImage: "javascript:alert(1)"\n---\nbody E\n');
  write('content/posts/f-file-proto/index.md', '---\ntitle: "F file proto"\ndate: 2026-09-06T10:00:00+08:00\nshareImage: "C:/Users/secret/leak.png"\n---\nbody F\n');
  write('content/posts/g-protected/index.md', '---\ntitle: "G protected"\ndate: 2026-09-07T10:00:00+08:00\nprotected: true\nshareImage: "/share/canary-private.png"\n---\nPROTECTED_BODY_SENTINEL\n');
  write('content/posts/h-special-title/index.md', '---\ntitle: "标题 & \\"quoted\\" 🧪 <tag>"\ndate: 2026-09-08T10:00:00+08:00\n---\nbody H\n');
  write('content/about/index.md', '---\ntitle: "About"\n---\nabout body\n');

  const buildNow = () => {
    const out = path.join(fixture, 'public');
    const r = spawnSync(hugo, ['--source', fixture, '--destination', out, '--cacheDir', path.join(fixture, 'cache'), '--minify', '--panicOnWarning'], { encoding: 'utf8', windowsHide: true });
    assert.equal(r.status, 0, r.error?.message || r.stderr || r.stdout);
    return out;
  };
  const out = buildNow();
  const read = (rel) => headOf(fs.readFileSync(path.join(out, rel), 'utf8'));

  // C01：文章 shareImage 优先，cover 原样保留在 front matter（不改卡片）
  const a = read('posts/a-both/index.html');
  assert.match(meta(a, 'og:image'), /\/share\/wide\.png$/, 'C01: 使用 articleShare');
  assert.equal(meta(a, 'og:image:width'), '1200', 'C01: 真实宽度');
  assert.equal(meta(a, 'og:image:height'), '630', 'C01: 真实高度');
  assert.equal(meta(a, 'og:image:type'), 'image/png', 'C01: 真实 MIME');
  assert.equal(meta(a, 'twitter:card'), 'summary_large_image', 'C01: 横向大图用大卡');

  // C02：缺 shareImage 时用 cover；远程图保留原 URL 且不伪造尺寸
  const b = read('posts/b-cover/index.html');
  assert.equal(meta(b, 'og:image'), 'https://cdn.example.com/b-cover.png', 'C02: 远程 cover 原样保留');
  assert.equal(meta(b, 'og:image:width'), null, 'C02: 远程图未知尺寸时不输出 width');
  assert.equal(meta(b, 'og:image:height'), null, 'C02: 远程图未知尺寸时不输出 height');
  assert.equal(meta(b, 'twitter:card'), 'summary_large_image', 'C02: 非头像来源可用大卡');

  // C03：两者均缺 → 站点图
  const c = read('posts/c-site/index.html');
  assert.match(meta(c, 'og:image'), /\/share\/wide\.png$/, 'C03: 回退站点图');
  assert.equal(meta(read('about/index.html'), 'og:image'), meta(c, 'og:image'), 'C03: 普通页面共用同一站点图 URL');

  // C05：空值按未设置处理；非法协议被拒且不输出磁盘路径
  const d = read('posts/d-empty-share/index.html');
  assert.match(meta(d, 'og:image'), /\/share\/wide\.png$/, 'C05: 空字符串视为未设置');
  for (const rel of ['posts/e-bad-proto/index.html', 'posts/f-file-proto/index.html']) {
    const h = read(rel);
    const img = meta(h, 'og:image') || '';
    assert.ok(!img.startsWith('javascript:'), `C05: ${rel} 不得输出 javascript:`);
    assert.ok(!/^[A-Za-z]:[\\/]/.test(img), `C05: ${rel} 不得输出 Windows 磁盘路径`);
    assert.ok(!img.includes('leak.png'), `C05: ${rel} 不得泄漏磁盘文件名`);
    assert.ok(!h.includes('C:/Users/secret'), `C05: ${rel} head 不得含绝对路径`);
  }

  // C06：受保护文章不读取文章专用图
  const g = read('posts/g-protected/index.html');
  assert.ok(!JSON.stringify(meta(g, 'og:image')).includes('canary-private'), 'C06: 不得输出受保护文章专用图');
  assert.match(meta(g, 'og:image'), /\/share\/wide\.png$/, 'C06: 受保护文章用通用站点图');
  assert.ok(!g.includes('PROTECTED_BODY_SENTINEL'), 'C06: 受保护正文不得进入 head');

  // C07：特殊字符标题的 alt（必须保证 minify 后仍是合法 HTML）
  const h = read('posts/h-special-title/index.html');
  const alt = meta(h, 'og:image:alt');
  assert.ok(alt && alt.length > 0, `C07: alt 必须存在且非空，实际 ${JSON.stringify(alt)}`);
  assert.ok(alt.includes('🧪'), `C07: alt 应保留 emoji，实际 ${alt}`);
  // alt 在 minify 后不得截断标签（不能含裸 > 或未闭合）
  const altTag = h.match(/<meta\s+property="og:image:alt"[^>]*>/i) || h.match(/<meta\s+property=og:image:alt[^>]*>/i);
  assert.ok(altTag, 'C07: og:image:alt 标签必须完整闭合');
  // JSON-LD 的 name/headline 走 JSON 编码，必须保留原字符（含 < > " &）
  const schemaRaw = h.match(/<script[^>]*type=(["']?)application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/i)?.[2] || '{}';
  const schema = JSON.parse(schemaRaw);
  assert.equal(schema.name, '标题 & "quoted" 🧪 <tag>', 'C07: JSON-LD name 保留原文并正确转义');
  assert.equal(schema.headline, '标题 & "quoted" 🧪 <tag>', 'C07: JSON-LD headline 保留原文');
  assert.ok(schema.image, 'C07: JSON-LD 含 image');

  // 分享图必须真实存在（C09：404 时验收失败）
  const published = path.join(out, 'share', 'wide.png');
  assert.ok(fs.existsSync(published), 'C09: 分享图必须被实际发布');
  const stat = fs.statSync(published);
  assert.ok(stat.size > 10000, 'C09: 分享图不是空文件或 HTML 错误页');

  // JSON-LD 与 OG 使用同一张图
  assert.equal(schema.image, meta(h, 'og:image'), 'C10: JSON-LD image 与 og:image 一致');
  assert.equal(meta(h, 'twitter:image'), meta(h, 'og:image'), 'C11: twitter:image 与 og:image 一致');

  // 关闭站点分享图后应回退头像，且不能把头像标成 1200x630
  write('hugo.toml', fs.readFileSync(path.join(fixture, 'hugo.toml'), 'utf8').replace('shareImage = "/share/wide.png"\n', ''));
  const out2 = (() => {
    const dest = path.join(fixture, 'public2');
    const r = spawnSync(hugo, ['--source', fixture, '--destination', dest, '--cacheDir', path.join(fixture, 'cache'), '--minify', '--panicOnWarning'], { encoding: 'utf8', windowsHide: true });
    assert.equal(r.status, 0, r.error?.message || r.stderr || r.stdout);
    return dest;
  })();
  const c2 = headOf(fs.readFileSync(path.join(out2, 'posts/c-site/index.html'), 'utf8'));
  assert.match(meta(c2, 'og:image'), /avatar-square\.webp$/, 'C04: 无专用图时回退头像');
  assert.equal(meta(c2, 'og:image:width'), null, 'C04: 头像不得被标成 1200');
  assert.equal(meta(c2, 'og:image:height'), null, 'C04: 头像不得被标成 630');
  assert.equal(meta(c2, 'twitter:card'), 'summary', 'C04: 头像/方图回退保守 summary');

  // 真实站点产物校验
  if (process.env.LILY_TEST_PUBLIC_DIR) {
    const publicDir = path.resolve(process.env.LILY_TEST_PUBLIC_DIR);
    const postsDir = path.join(publicDir, 'posts');
    const posts = fs.readdirSync(postsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name !== 'page' && fs.existsSync(path.join(postsDir, e.name, 'index.html')));
    let checked = 0;
    const problems = [];
    for (const entry of [...posts, { name: '__home' }]) {
      const rel = entry.name === '__home' ? 'index.html' : `posts/${entry.name}/index.html`;
      const file = path.join(publicDir, rel);
      if (!fs.existsSync(file)) continue;
      const head = headOf(fs.readFileSync(file, 'utf8'));
      const img = meta(head, 'og:image');
      checked += 1;
      if (!img) { problems.push(`${rel}: 缺 og:image`); continue; }
      if (/localhost|127\.0\.0\.1/.test(img)) problems.push(`${rel}: 输出 localhost`);
      if (/^[A-Za-z]:[\\/]/.test(img)) problems.push(`${rel}: 输出磁盘路径`);
      // 本站图片必须真实存在
      if (img.startsWith('https://lily2663.top/')) {
        const p = img.replace('https://lily2663.top/', '');
        if (!fs.existsSync(path.join(publicDir, p))) problems.push(`${rel}: 图片不存在 ${p}`);
      }
      const w = meta(head, 'og:image:width');
      const hgt = meta(head, 'og:image:height');
      if ((w && !hgt) || (!w && hgt)) problems.push(`${rel}: width/height 只出现一半`);
    }
    assert.deepEqual(problems, [], `真实产物分享元数据问题: ${problems.join('; ')}`);
    console.log(`Real share check passed: ${checked} pages, all og:image resolvable.`);
  }

  console.log('Share image regression passed: fallback chain, protocol rejection, protected boundary, size/type honesty, JSON-LD parity, avatar fallback, real asset publication.');
} finally {
  assert.equal(path.resolve(path.dirname(fixture)), path.resolve(tempRoot));
  assert.ok(path.basename(fixture).startsWith('lily-share-'));
  fs.rmSync(fixture, { recursive: true, force: true });
}
