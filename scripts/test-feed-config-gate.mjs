// RSS 配置诊断的**质量门槛**测试。
//
// 用户独立复核指出（2026-10-29 第 6 条）：
//   当前实现对非法/未来的 params.rss.updated 只在 feed 里输出一条 XML 注释，
//   构建照样成功；而执行说明书 5.3 要求这种情形"必须报诊断、排除该值，
//   并由总 QA 认定为未通过，不能静默声称功能完成"。
//
// 本测试把"什么叫未通过"变成机器可判定的断言：
//   1. 非法或未来的 rss.updated **必须**在产物里留下可机读的诊断标记；
//   2. 诊断必须带字段名与实际值，不能只有一句"有问题"；
//   3. 被排除后 channel 时间必须回退到 item 最大值（不能拿非法值凑数）；
//   4. 提供一个"配置体检"入口，让总 QA 能一键判定 —— 见 scripts/check-feed-config.mjs。
//
// 注意：本测试**不**要求构建失败。构建失败会让整站无法发布，
// 而说明书要的是"诊断可见 + QA 判未通过"，两者职责不同：
//   构建 = 能否产出；诊断 = 数据是否可信。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const tempRoot = fs.existsSync(`${root}/.cache/tmp`) ? `${root}/.cache/tmp` : os.tmpdir();
const fixture = fs.mkdtempSync(path.join(tempRoot, 'lily-feedcfg-'));
const hugo = process.env.LILY_TEST_HUGO_PATH
  || process.env.LILY_HUGO_PATH
  || (fs.existsSync(`${root}/.tools/hugo-0.165.0/hugo.exe`) ? `${root}/.tools/hugo-0.165.0/hugo.exe` : 'hugo');

try {
  const write = (rel, content) => {
    const target = path.join(fixture, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };

  const baseConfig = (rssUpdated) => `baseURL = "https://example.invalid/"
title = "Feed config fixture"
theme = "lily-epitaph"
themesDir = ${JSON.stringify(path.join(root, 'themes'))}
[params]
description = "Site fallback"
${rssUpdated === null ? '' : `[params.rss]\nupdated = "${rssUpdated}"\n`}
[outputs]
home = ["HTML", "RSS"]
section = ["HTML"]
taxonomy = ["HTML"]
term = ["HTML"]
`;

  write('layouts/index.html', '<!doctype html><html><head>{{ partial "head.html" . }}</head><body><main id="app">x</main></body></html>');
  write('layouts/_default/single.html', '<!doctype html><html><head>{{ partial "head.html" . }}</head><body><main id="app">x</main></body></html>');
  write('layouts/_default/list.html', '<!doctype html><html><head>{{ partial "head.html" . }}</head><body><main id="app">x</main></body></html>');
  write('content/posts/only/index.md', '---\ntitle: "only"\ndate: 2026-05-01T10:00:00+08:00\n---\nbody\n');

  const build = (tag) => {
    const dest = path.join(fixture, tag);
    const r = spawnSync(hugo, ['--source', fixture, '--destination', dest,
      '--cacheDir', path.join(fixture, 'cache'), '--minify', '--panicOnWarning'],
    { encoding: 'utf8', windowsHide: true });
    assert.equal(r.status, 0, `${tag} 构建应成功（诊断不等于构建失败）：${r.stderr || r.stdout}`);
    return fs.readFileSync(path.join(dest, 'index.xml'), 'utf8');
  };

  // 诊断用 <generator> 承载：Hugo 的 RSS 输出会剥离 HTML 注释，
  // 实测早期的注释形式从未出现在产物里（属静默失效，已被用户复核发现）。
  const diagOf = (xml) => {
    const m = xml.match(/<generator>([\s\S]*?)<\/generator>/);
    if (!m) return null;
    return /diagnostics=/i.test(m[1]) ? m[1].replace(/^[\s\S]*?diagnostics=/i, '').trim() : null;
  };
  const lastBuildOf = (xml) => {
    const m = xml.match(/<lastBuildDate>([^<]*)<\/lastBuildDate>/);
    return m ? m[1] : null;
  };

  // ---- 1) 合法 updated：不应有任何诊断 ----
  write('hugo.toml', baseConfig('2026-06-01T00:00:00+08:00'));
  const okXml = build('ok');
  assert.equal(diagOf(okXml), null, '合法 updated 不应产生诊断');
  assert.ok(lastBuildOf(okXml), '合法 updated 应有 lastBuildDate');
  assert.match(lastBuildOf(okXml), /2026/, 'lastBuildDate 应反映 updated 或 item 时间');

  // ---- 2) 非法格式：必须诊断，且带字段名与原始值 ----
  write('hugo.toml', baseConfig('not-a-time'));
  const badXml = build('bad');
  const badDiag = diagOf(badXml);
  assert.ok(badDiag, '非法 updated 必须留下可机读诊断（不能静默）');
  assert.match(badDiag, /params\.rss\.updated/, '诊断必须指明字段名');
  assert.match(badDiag, /not-a-time/, '诊断必须带原始值，便于定位');
  assert.match(badDiag, /无法解析|invalid/i, '诊断应说明是无法解析');
  // 被排除后应回退到 item 时间（2026-05-01），不能输出非法值
  assert.ok(!badXml.includes('not-a-time<'), '非法值不得进入 XML 元素');
  const badLast = lastBuildOf(badXml);
  assert.ok(badLast, '非法 updated 被排除后应回退到 item 最大值');
  assert.match(badLast, /2026/, 'lastBuildDate 应回退到 item 时间');

  // ---- 3) 未来时间：必须诊断并排除 ----
  write('hugo.toml', baseConfig('2099-01-01T00:00:00+08:00'));
  const futureXml = build('future');
  const futureDiag = diagOf(futureXml);
  assert.ok(futureDiag, '未来 updated 必须留下诊断');
  assert.match(futureDiag, /params\.rss\.updated/, '诊断必须指明字段名');
  assert.match(futureDiag, /2099/, '诊断必须带原始值');
  assert.match(futureDiag, /未来|future/i, '诊断应说明位于未来');
  const futureLast = lastBuildOf(futureXml);
  assert.ok(futureLast && !futureLast.includes('2099'), '未来值必须被排除，不得进入 lastBuildDate');

  // ---- 4) 一份"体检"应能区分通过/未通过 ----
  // 通过调用外部脚本 check-feed-config.mjs 实现，保证 QA 有一键入口。
  const checker = path.join(root, 'scripts', 'check-feed-config.mjs');
  assert.ok(fs.existsSync(checker), '应存在 scripts/check-feed-config.mjs 供 QA 一键判定');

  const runCheck = (xml) => {
    const tmp = path.join(fixture, `feed-${Math.random().toString(36).slice(2)}.xml`);
    fs.writeFileSync(tmp, xml, 'utf8');
    const r = spawnSync(process.execPath, [checker, tmp], { encoding: 'utf8', windowsHide: true });
    return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
  };

  const okCheck = runCheck(okXml);
  assert.equal(okCheck.code, 0, `合法配置体检应通过，实际退出码 ${okCheck.code}：${okCheck.out.slice(0, 200)}`);

  const badCheck = runCheck(badXml);
  assert.notEqual(badCheck.code, 0, '非法配置体检必须判未通过（非 0 退出）');

  const futureCheck = runCheck(futureXml);
  assert.notEqual(futureCheck.code, 0, '未来时间体检必须判未通过（非 0 退出）');

  console.log('Feed config gate passed: invalid/future rss.updated always leaves machine-readable diagnostics, and the QA checker fails them.');
} finally {
  assert.ok(path.basename(fixture).startsWith('lily-feedcfg-'));
  fs.rmSync(fixture, { recursive: true, force: true });
}
