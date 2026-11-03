// 受保护文章在**公开 HTML 属性**里的摘要泄漏检查。
//
// 背景（用户独立复核发现，2026-10-29）：
//   themes/lily-epitaph/layouts/partials/post-card.html 第 4 行曾把
//   `.Params.summary` 直接拼进首页卡片的 `data-search` 属性。
//   页面上虽然显示"该文章已加密，需输入密码查看。"的占位，
//   但 data-search 是公开 HTML 属性，查看源码就能读到真实摘要。
//
//   `scripts/test-metadata.mjs` 原本只检查 <head>，因此漏掉了这个出口。
//
// 本测试专门守这类"不可见但公开"的属性出口。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const tempRoot = fs.existsSync(`${root}/.cache/tmp`) ? `${root}/.cache/tmp` : os.tmpdir();
const fixture = fs.mkdtempSync(path.join(tempRoot, 'lily-cardleak-'));
const hugo = process.env.LILY_TEST_HUGO_PATH
  || process.env.LILY_HUGO_PATH
  || (fs.existsSync(`${root}/.tools/hugo-0.165.0/hugo.exe`) ? `${root}/.tools/hugo-0.165.0/hugo.exe` : 'hugo');

const LOCK_TEXT = '该文章已加密，需访问网站输入密码查看。';

try {
  const write = (rel, content) => {
    const target = path.join(fixture, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };

  write('hugo.toml', `baseURL = "https://example.invalid/"
title = "Card leak fixture"
theme = "lily-epitaph"
themesDir = ${JSON.stringify(path.join(root, 'themes'))}
hasCJKLanguage = true
[params]
description = "Site fallback"
author = "Fixture"
[params.protected]
enabled = true
[outputs]
home = ["HTML"]
section = ["HTML"]
taxonomy = ["HTML"]
term = ["HTML"]
`);

  // 首页需要渲染 recent-posts 模块才会出现卡片
  write('data/lily/layouts/home.yaml', `kind: home
slots:
  main:
    - id: fixture-posts
      module: recent-posts
      config:
        section: posts
        sort: title
        pageSize: 10
        showCount: true
`);
  write('data/lily/layouts/global.yaml', 'kind: global\nslots: {}\n');

  const layout = '<!doctype html><html><head>{{ partial "head.html" . }}</head><body><main id="app">{{ block "main" . }}{{ end }}</main></body></html>';
  write('layouts/index.html', `{{ define "prepare" }}{{ .Store.Set "lily-list-body" (dict "html" (partial "lily/layout.html" (dict "kind" "home" "page" . "skipSlots" (slice "hero")))) }}{{ end }}{{ define "main" }}{{ with .Store.Get "lily-list-body" }}{{ .html }}{{ end }}{{ end }}`);
  write('layouts/_default/single.html', layout);
  write('layouts/_default/list.html', `{{ define "main" }}{{ partial "lily/layout.html" (dict "kind" "terms" "page" .) }}{{ end }}`);

  // 受保护文章：summary / description / 正文三处各放一个可检索 canary
  write('content/posts/a-protected/index.md', [
    '---',
    'title: "A protected"',
    'date: 2026-01-01',
    'summary: "CANARY_SUMMARY_card_7f21"',
    'description: "CANARY_DESC_card_9a3e"',
    'protected: true',
    'tags: ["fixturetag"]',
    'params:',
    '  protected: true',
    '---',
    'CANARY_BODY_card_4b8c must never appear in public HTML.',
    '',
  ].join('\n'));

  // 公开文章：作为对照，它的 summary 必须正常出现在 data-search
  write('content/posts/b-public/index.md', [
    '---',
    'title: "B public"',
    'date: 2026-01-02',
    'summary: "PUBLIC_SUMMARY_card_1c55"',
    'tags: ["fixturetag"]',
    '---',
    'body b',
    '',
  ].join('\n'));

  const out = path.join(fixture, 'public');
  const r = spawnSync(hugo, ['--source', fixture, '--destination', out,
    '--cacheDir', path.join(fixture, 'cache'), '--minify', '--panicOnWarning'],
  { encoding: 'utf8', windowsHide: true });
  assert.equal(r.status, 0, r.error?.message || r.stderr || r.stdout);

  const home = fs.readFileSync(path.join(out, 'index.html'), 'utf8');

  // ---- 核心断言：受保护文章的 canary 不得出现在首页任何位置 ----
  for (const canary of ['CANARY_SUMMARY_card_7f21', 'CANARY_DESC_card_9a3e', 'CANARY_BODY_card_4b8c']) {
    assert.ok(!home.includes(canary), `受保护 canary 泄漏到首页公开 HTML: ${canary}`);
  }
  // 大小写变体（data-search 会被 lower）
  assert.ok(!home.toLowerCase().includes('canary_summary_card_7f21'), '受保护 summary 以小写形式泄漏到 data-search');

  // ---- 受保护卡片仍应存在，但摘要字段是固定占位 ----
  // 注意：Hugo --minify 会把属性引号去掉（data-search="..." → 无引号形式），
  // 因此匹配必须同时兼容有引号与无引号两种形态。
  const cards = [...home.matchAll(/<article\b[^>]*\bclass="?post-item"?[^>]*>([\s\S]*?)<\/article>/g)];
  assert.ok(cards.length >= 2, `应至少渲染 2 张卡片，实际 ${cards.length}`);

  const protectedCard = cards.find((m) => m[1].includes('A protected') || m[1].includes('加密'));
  assert.ok(protectedCard, '受保护文章应有卡片');
  // 从整段卡片 HTML 里取 data-search 的值（可能是 "..." 或无引号）
  const dsFrom = (chunk) => {
    const m = chunk.match(/data-search=(?:"([^"]*)"|([^\s>]+))/);
    return m ? (m[1] ?? m[2] ?? '') : '';
  };
  const protectedSearch = dsFrom(protectedCard[0]);
  assert.ok(protectedSearch.length > 0, '受保护卡片应有 data-search 属性');
  assert.ok(protectedSearch.includes(LOCK_TEXT.toLowerCase()) || protectedSearch.includes(LOCK_TEXT),
    `受保护 data-search 应含固定锁定提示，实际 "${protectedSearch}"`);
  assert.ok(!/canary/i.test(protectedSearch), '受保护卡片的 data-search 不得含原文');

  // ---- 公开文章对照：summary 必须正常进入 data-search（不误伤正常功能）----
  const publicCard = cards.find((m) => m[1].includes('B public'));
  assert.ok(publicCard, '公开文章应有卡片');
  const publicSearch = dsFrom(publicCard[0]);
  assert.ok(publicSearch.includes('public_summary_card_1c55'),
    `公开文章的 summary 应保留在 data-search，实际 "${publicSearch}"`);

  // ---- 搜索索引同样不得泄漏 ----
  const indexPath = path.join(out, 'index.json');
  if (fs.existsSync(indexPath)) {
    const idx = fs.readFileSync(indexPath, 'utf8');
    for (const canary of ['CANARY_SUMMARY_card_7f21', 'CANARY_DESC_card_9a3e', 'CANARY_BODY_card_4b8c']) {
      assert.ok(!idx.includes(canary), `受保护 canary 泄漏到搜索索引: ${canary}`);
    }
  }

  console.log('Card-leak regression passed: protected summary/description/body never enter public HTML attributes; public article summary preserved.');
} finally {
  assert.ok(path.basename(fixture).startsWith('lily-cardleak-'));
  fs.rmSync(fixture, { recursive: true, force: true });
}
