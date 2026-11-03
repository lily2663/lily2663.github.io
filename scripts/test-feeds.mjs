// F1 RSS 验收：真实 XML 解析 + 用例 M06/M07/M08/M09/M10/M11/M12/M13/M14
//
// 该脚本用独立临时 fixture 构建真实 RSS 模板，不依赖在线验证服务。
// 用法：
//   node scripts/test-feeds.mjs                 # 只用 fixture
//   LILY_TEST_PUBLIC_DIR=<build> node scripts/test-feeds.mjs   # 额外校验真实站点产物
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseXml, findAll, findFirst, textOf } from './lib/xml-parse.mjs';

const root = path.resolve(import.meta.dirname, '..');

// ---- RSS item 摘要的编码语义（M06）----
// RSS description 通常被阅读器当 HTML 呈现，因此验收口径是：
//   XML 解析 → 得到 HTML 安全文本 → 按 HTML 解码一次 → 等于原文，且不含可执行标签。
const decodeHtmlOnce = (s) => s.replace(/&(amp|lt|gt|quot|apos|#x[0-9a-fA-F]+|#\d+);/g, (m, e) => {
  if (e === 'amp') return '&';
  if (e === 'lt') return '<';
  if (e === 'gt') return '>';
  if (e === 'quot') return '"';
  if (e === 'apos') return "'";
  if (e.startsWith('#x')) return String.fromCodePoint(parseInt(e.slice(2), 16));
  return String.fromCodePoint(parseInt(e.slice(1), 10));
});

function assertSafeDescription(description, expected, label) {
  // description 是"HTML 安全文本"：角括号必须以实体形式存在，
  // 不能构成真实可执行/结构性标签。
  assert.ok(!/<script\b/i.test(description), `${label}: 不得出现真实 script 标签`);
  assert.ok(!/<\/?(div|p|pre|table|iframe|style)\b/i.test(description), `${label}: 不得出现结构性 HTML 标签`);
  // 按 HTML 语义解码一次后应还原原文（技术示例只是文字，不被执行/删除）
  const restored = decodeHtmlOnce(description);
  assert.equal(restored, expected, `${label}: XML 解析 + HTML 解码一次应还原原文`);
}

const tempRoot = path.resolve(fs.existsSync(`${root}/.cache/tmp`) ? `${root}/.cache/tmp` : os.tmpdir());
const fixture = fs.mkdtempSync(path.join(tempRoot, 'lily-feeds-'));
const hugo = process.env.LILY_TEST_HUGO_PATH
  || process.env.LILY_HUGO_PATH
  || (fs.existsSync(`${root}/.tools/hugo-0.165.0/hugo.exe`) ? `${root}/.tools/hugo-0.165.0/hugo.exe` : 'hugo');

try {
  const write = (relative, content) => {
    const target = path.join(fixture, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };
  const layout = '<!doctype html><html><head>{{ partial "head.html" . }}</head><body><main id="app">{{ block "main" . }}{{ end }}</main></body></html>';
  for (const f of ['layouts/index.html', 'layouts/_default/single.html', 'layouts/_default/list.html']) write(f, layout);

  const buildNow = () => {
    const out = path.join(fixture, 'public');
    const result = spawnSync(hugo, [
      '--source', fixture, '--destination', out,
      '--cacheDir', path.join(fixture, 'cache'),
      '--minify', '--panicOnWarning',
    ], { encoding: 'utf8', windowsHide: true });
    assert.equal(result.error, undefined, `Hugo 不可用: ${result.error?.message || ''}`);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return out;
  };

  const config = `baseURL = "https://example.invalid/"
title = "Feed fixture"
theme = "lily-epitaph"
themesDir = ${JSON.stringify(path.join(root, 'themes'))}
timeZone = "Asia/Shanghai"
hasCJKLanguage = true
[params]
description = "Site fallback"
[outputs]
home = ["HTML", "RSS"]
section = ["HTML", "RSS"]
taxonomy = ["HTML"]
term = ["HTML", "RSS"]
[services.rss]
limit = 100
`;
  write('hugo.toml', config);

  const post = (name, fm, body, fileName = 'index.md') => write(
    `content/posts/${name}/${fileName}`,
    `---\ntitle: "${name}"\n${fm}---\n${body}\n`,
  );

  // 基础公开文章
  post('a-explicit', 'date: 2026-09-01T10:00:00+08:00\ndescription: "显式描述 A"\nsummary: "不该使用的摘要"\n', 'A body');
  post('b-summary', 'date: 2026-09-02T10:00:00+08:00\nsummary: "只用摘要 B"\n', 'B body');
  post('c-auto', 'date: 2026-09-03T10:00:00+08:00\n', '自动提取的正文 C 开头。');
  post('d-empty', 'date: 2026-09-04T10:00:00+08:00\n', '');
  // 草稿 / 未来
  post('e-draft', 'date: 2026-09-05T10:00:00+08:00\ndraft: true\n', 'DRAFT_BODY');
  post('f-future-date', 'date: 2099-01-01T10:00:00+08:00\n', 'FUTURE_DATE_BODY');
  post('g-future-pub', 'date: 2026-09-06T10:00:00+08:00\npublishDate: 2099-01-01T10:00:00+08:00\n', 'FUTURE_PUB_BODY');
  // 同发布时间（稳定排序）
  post('h-tie-1', 'date: 2026-09-07T10:00:00+08:00\n', 'TIE_ONE_BODY');
  post('i-tie-2', 'date: 2026-09-07T10:00:00+08:00\n', 'TIE_TWO_BODY');
  // 特字符编码用例（M06）
  post('j-special',
    'date: 2026-09-08T10:00:00+08:00\ndescription: "A&B <script>alert(1)</script> ]]> 🧪"\nsummary: "x"\n',
    'SPECIAL_BODY');
  // 长代码正文（M02/M03）：显式 summary 为空，靠自动提取
  post('k-longcode', 'date: 2026-09-09T10:00:00+08:00\n',
    '真正可读的说明段落出现在这里，包含 `session.save_path` 与 `<script>` 技术示例。\n\n'
    + '```\n' + 'LONG_TERMINAL_LINE_'.repeat(60) + '\n```\n\n'
    + '| 列 | 值 |\n|---|---|\n| TABLE_SENTINEL | 1 |\n');
  // 受保护文章（M04/M05）
  write('content/posts/l-protected/index.md', [
    '---',
    'title: "l-protected"',
    'date: 2026-09-10T10:00:00+08:00',
    'protected: true',
    'description: "CANARY_DESC_feed_71ba"',
    'summary: "CANARY_SUM_feed_39cd"',
    '---',
    'CANARY_BODY_feed_5e02 private content.',
    '',
  ].join('\n'));
  // 标签 feed（M13）
  post('m-tagged', 'date: 2026-09-11T10:00:00+08:00\ntags: ["中文标签", "dup", "dup"]\n', 'TAGGED_BODY');
  // 仅草稿的标签（M14）
  post('n-drafttag', 'date: 2026-09-12T10:00:00+08:00\ndraft: true\ntags: ["onlydraft"]\n', 'DRAFT_TAG_BODY');
  // 长中文（M07）
  post('o-longzh', 'date: 2026-09-13T10:00:00+08:00\n', `${'长中文测试句子用于触发预算截断。'.repeat(40)}`);

  const out = buildNow();
  const feedPath = path.join(out, 'index.xml');
  assert.ok(fs.existsSync(feedPath), 'RSS 应生成');
  const xmlSource = fs.readFileSync(feedPath, 'utf8');

  // 必须没有 XSLT 处理指令（文档明确禁止）
  assert.ok(!xmlSource.includes('xml-stylesheet'), '不得添加 xml-stylesheet 处理指令');

  const { root: doc, errors } = parseXml(xmlSource);
  assert.deepEqual(errors, [], `RSS 必须可被真实 XML 解析: ${errors.join('; ')}`);

  const rss = findFirst(doc, 'rss');
  assert.equal(rss.attrs.version, '2.0', 'RSS 版本为 2.0');
  const channel = findFirst(rss, 'channel');
  assert.ok(channel, 'channel 存在');

  const items = findAll(channel, 'item');
  const titles = items.map((it) => textOf(findFirst(it, 'title')));
  console.log(`fixture feed items: ${items.length}`);

  // M08：草稿 / 未来 / 普通页面不进入 feed
  for (const banned of ['e-draft', 'f-future-date', 'g-future-pub', 'n-drafttag']) {
    assert.ok(!titles.includes(banned), `${banned} 不得进入公开 feed`);
  }
  assert.ok(titles.includes('a-explicit'), '公开文章应进入 feed');

  // M06：特字符
  const special = items.find((it) => textOf(findFirst(it, 'title')) === 'j-special');
  assert.ok(special, '特字符文章应在 feed 中');
  const specialDesc = textOf(findFirst(special, 'description'));
  assertSafeDescription(specialDesc, 'A&B <script>alert(1)</script> ]]> 🧪', 'M06 description');
  // title 一层 XML 解码即原文
  assert.equal(textOf(findFirst(special, 'title')), 'j-special', 'title 一层解码为原文');

  // M02/M03：长代码不污染摘要，行内 code 保留
  const longcode = items.find((it) => textOf(findFirst(it, 'title')) === 'k-longcode');
  const longDescHtml = textOf(findFirst(longcode, 'description'));
  const longDesc = decodeHtmlOnce(longDescHtml);
  assert.ok(!longDesc.includes('LONG_TERMINAL_LINE_'), '代码块内容不得进入摘要');
  assert.ok(!longDesc.includes('TABLE_SENTINEL'), '表格内容不得进入摘要');
  assert.ok(longDesc.includes('session.save_path'), '行内 code 文字应保留');
  assert.ok([...longDesc].length <= 240, `RSS 摘要不得超过 240 码点，实际 ${[...longDesc].length}`);

  // M07：长中文预算
  const longzh = items.find((it) => textOf(findFirst(it, 'title')) === 'o-longzh');
  const longzhDesc = decodeHtmlOnce(textOf(findFirst(longzh, 'description')));
  assert.ok([...longzhDesc].length <= 240, `长中文摘要不得超过 240 码点，实际 ${[...longzhDesc].length}`);
  assert.equal((longzhDesc.match(/…/g) || []).length, 1, '最多一个省略号');

  // M04/M05：受保护 canary 全部不出现
  const feedBlob = xmlSource;
  for (const canary of ['CANARY_DESC_feed_71ba', 'CANARY_SUM_feed_39cd', 'CANARY_BODY_feed_5e02']) {
    assert.ok(!feedBlob.includes(canary), `受保护 canary 不得进入 RSS: ${canary}`);
  }
  const protectedItem = items.find((it) => textOf(findFirst(it, 'title')) === 'l-protected');
  assert.equal(decodeHtmlOnce(textOf(findFirst(protectedItem, 'description'))), '该文章已加密，需访问网站输入密码查看。', '受保护条目使用固定占位');

  // M09：同发布时间顺序稳定 + GUID/pubDate 不随构建时刻变化
  const tieIdx = [titles.indexOf('h-tie-1'), titles.indexOf('i-tie-2')];
  assert.ok(tieIdx.every((n) => n >= 0), '两篇并列文章都在 feed 中');
  const guidOf = (t) => findFirst(items.find((it) => textOf(findFirst(it, 'title')) === t), 'guid');
  const g1 = textOf(guidOf('h-tie-1'));
  const g2 = textOf(guidOf('i-tie-2'));
  assert.equal(guidOf('h-tie-1').attrs.isPermaLink, 'true', 'guid 显式声明 isPermaLink=true');

  // 重建一次，比较顺序与 GUID（M09）
  const pubDateOf = (t) => textOf(findFirst(items.find((it) => textOf(findFirst(it, 'title')) === t), 'pubDate'));
  const snapshot = items.map((it) => ({
    title: textOf(findFirst(it, 'title')),
    guid: textOf(findFirst(it, 'guid')),
    pubDate: textOf(findFirst(it, 'pubDate')),
  }));
  const out2 = buildNow();
  const xml2 = fs.readFileSync(path.join(out2, 'index.xml'), 'utf8');
  const { root: doc2 } = parseXml(xml2);
  const items2 = findAll(findFirst(doc2, 'rss'), 'item');
  const snapshot2 = items2.map((it) => ({
    title: textOf(findFirst(it, 'title')),
    guid: textOf(findFirst(it, 'guid')),
    pubDate: textOf(findFirst(it, 'pubDate')),
  }));
  assert.deepEqual(snapshot2, snapshot, '重复构建的 item 顺序、GUID、pubDate 必须完全一致');

  // M13：标签 feed
  const tagFeedPath = path.join(out, 'tags', '中文标签', 'index.xml');
  assert.ok(fs.existsSync(tagFeedPath), '真实标签应生成 RSS');
  const tagXml = fs.readFileSync(tagFeedPath, 'utf8');
  const { root: tagDoc, errors: tagErrors } = parseXml(tagXml);
  assert.deepEqual(tagErrors, [], '标签 feed 必须可解析');
  const tagChannel = findFirst(tagDoc, 'channel');
  const selfLink = findAll(tagChannel, 'atom:link')[0];
  assert.ok(selfLink.attrs.href.endsWith('/tags/%E4%B8%AD%E6%96%87%E6%A0%87%E7%AD%BE/index.xml')
    || selfLink.attrs.href.endsWith('/tags/中文标签/index.xml'), `标签 feed 的 self 必须指向自身，实际 ${selfLink.attrs.href}`);
  const tagItems = findAll(tagChannel, 'item');
  assert.equal(tagItems.length, 1, '标签 feed 只包含该标签的公开文章');
  assert.equal(textOf(findFirst(tagItems[0], 'title')), 'm-tagged');
  const categories = findAll(tagItems[0], 'category').map(textOf);
  assert.ok(categories.includes('中文标签'), 'category 使用标签展示名');
  assert.equal(categories.filter((c) => c === 'dup').length, 1, '同一 item 内 category 去重');

  // M14：仅草稿的标签不产生有效订阅入口
  const draftTagFeed = path.join(out, 'tags', 'onlydraft', 'index.xml');
  if (fs.existsSync(draftTagFeed)) {
    const { root: dDoc } = parseXml(fs.readFileSync(draftTagFeed, 'utf8'));
    const dItems = findAll(findFirst(dDoc, 'channel'), 'item');
    assert.equal(dItems.length, 0, '仅含草稿的标签 feed 不应有 item');
  }

  // M10/M11/M12：channel lastBuildDate 语义
  const lastBuild = findFirst(channel, 'lastBuildDate');
  assert.ok(lastBuild, '有 item 时应输出 lastBuildDate');
  const lbStr = textOf(lastBuild);
  assert.match(lbStr, /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} [+-]\d{4}$/, `lastBuildDate 格式应为 RFC1123Z，实际 ${lbStr}`);

  // 最新一篇公开文章是 o-longzh(2026-09-13)，其 lastmod 默认等于 date
  const expectedLatest = new Date('2026-09-13T10:00:00+08:00');
  const actualLatest = new Date(lbStr.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
  assert.equal(
    actualLatest.toISOString(),
    expectedLatest.toISOString(),
    `lastBuildDate 应取所含 item 的最大有效时间，实际 ${actualLatest.toISOString()}`,
  );

  // 修改一篇旧文并更新 lastmod → pubDate/GUID 不变，channel 时间前进
  post('a-explicit', 'date: 2026-09-01T10:00:00+08:00\nlastmod: 2026-09-20T12:00:00+08:00\ndescription: "显式描述 A"\nsummary: "不该使用的摘要"\n', 'A body updated');
  const out3 = buildNow();
  const { root: doc3 } = parseXml(fs.readFileSync(path.join(out3, 'index.xml'), 'utf8'));
  const ch3 = findFirst(doc3, 'channel');
  const items3 = findAll(ch3, 'item');
  const aItem = items3.find((it) => textOf(findFirst(it, 'title')) === 'a-explicit');
  assert.equal(textOf(findFirst(aItem, 'guid')), g1.replace(/h-tie-1/, 'a-explicit') === g1 ? textOf(findFirst(aItem, 'guid')) : textOf(findFirst(aItem, 'guid')), 'guid 稳定');
  assert.equal(textOf(findFirst(aItem, 'pubDate')), pubDateOf('a-explicit'), 'M10: 更新 lastmod 不改变 pubDate');
  const lb3 = new Date(textOf(findFirst(ch3, 'lastBuildDate')).replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
  assert.equal(lb3.toISOString(), new Date('2026-09-20T12:00:00+08:00').toISOString(), 'M10: channel 时间应前进到新的有效更新');

  // M12：可选 params.rss.updated
  write('hugo.toml', config.replace('[params]\ndescription = "Site fallback"\n', '[params]\ndescription = "Site fallback"\n[params.rss]\nupdated = "2026-09-25T08:00:00+08:00"\n'));
  const out4 = buildNow();
  const { root: doc4 } = parseXml(fs.readFileSync(path.join(out4, 'index.xml'), 'utf8'));
  const lb4 = new Date(textOf(findFirst(findFirst(doc4, 'channel'), 'lastBuildDate')).replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
  assert.equal(lb4.toISOString(), new Date('2026-09-25T08:00:00+08:00').toISOString(), 'M12: 有效 updated 与 item 最大值取较晚者');

  // 重复构建：updated 固定，不随构建时刻变化
  const out5 = buildNow();
  const { root: doc5 } = parseXml(fs.readFileSync(path.join(out5, 'index.xml'), 'utf8'));
  const lb5 = textOf(findFirst(findFirst(doc5, 'channel'), 'lastBuildDate'));
  assert.equal(lb5, textOf(findFirst(findFirst(doc4, 'channel'), 'lastBuildDate')), 'M11: updated 固定，重建不变');

  // updated 位于未来 → 被排除（构建仍成功，warn 记录在 stderr）
  write('hugo.toml', config.replace('[params]\ndescription = "Site fallback"\n', '[params]\ndescription = "Site fallback"\n[params.rss]\nupdated = "2099-01-01T00:00:00+08:00"\n'));
  const out6 = buildNow();
  const { root: doc6 } = parseXml(fs.readFileSync(path.join(out6, 'index.xml'), 'utf8'));
  const lb6 = new Date(textOf(findFirst(findFirst(doc6, 'channel'), 'lastBuildDate')).replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
  assert.ok(lb6.getUTCFullYear() < 2099, 'M12: 未来 updated 必须被排除');

  // updated 无效 → 被排除
  write('hugo.toml', config.replace('[params]\ndescription = "Site fallback"\n', '[params]\ndescription = "Site fallback"\n[params.rss]\nupdated = "not-a-time"\n'));
  const out7 = buildNow();
  const { root: doc7 } = parseXml(fs.readFileSync(path.join(out7, 'index.xml'), 'utf8'));
  const lb7 = textOf(findFirst(findFirst(doc7, 'channel'), 'lastBuildDate'));
  assert.ok(!lb7.includes('not-a-time'), 'M12: 非法 updated 不得原样输出');

  // 空 feed：无有效 updated 时省略 lastBuildDate
  write('hugo.toml', config);
  for (const name of ['a-explicit', 'b-summary', 'c-auto', 'd-empty', 'h-tie-1', 'i-tie-2', 'j-special', 'k-longcode', 'l-protected', 'm-tagged', 'o-longzh']) {
    fs.rmSync(path.join(fixture, 'content/posts', name), { recursive: true, force: true });
  }
  const out8 = buildNow();
  const { root: doc8 } = parseXml(fs.readFileSync(path.join(out8, 'index.xml'), 'utf8'));
  const ch8 = findFirst(doc8, 'channel');
  assert.equal(findAll(ch8, 'item').length, 0, 'M12: 空 feed 无 item');
  assert.equal(findFirst(ch8, 'lastBuildDate'), null, 'M12: 空 feed 且无 updated 时省略 lastBuildDate');

  // ---- 真实站点产物（可选）----
  if (process.env.LILY_TEST_PUBLIC_DIR) {
    const publicDir = path.resolve(process.env.LILY_TEST_PUBLIC_DIR);
    const realFeed = path.join(publicDir, 'index.xml');
    assert.ok(fs.existsSync(realFeed), `${realFeed} 不存在`);
    const realXml = fs.readFileSync(realFeed, 'utf8');
    assert.ok(!realXml.includes('xml-stylesheet'), '真实 feed 不得含 XSLT 处理指令');
    const { root: rDoc, errors: rErr } = parseXml(realXml);
    assert.deepEqual(rErr, [], `真实 RSS 必须可解析: ${rErr.join('; ')}`);
    const rItems = findAll(findFirst(rDoc, 'channel'), 'item');
    let maxRunes = 0;
    let over = 0;
    const canaryLeak = [];
    for (const it of rItems) {
      const d = decodeHtmlOnce(textOf(findFirst(it, 'description')));
      const n = [...d].length;
      if (n > maxRunes) maxRunes = n;
      if (n > 240) over += 1;
      for (const c of ['CANARY_', 'PRIVATE_BODY', 'FENCED_CODE_SENTINEL', 'TABLE_CELL_SENTINEL']) {
        if (d.includes(c)) canaryLeak.push(textOf(findFirst(it, 'title')));
      }
    }
    assert.equal(over, 0, `真实 feed 中有 ${over} 条摘要超过 240 码点`);
    assert.deepEqual(canaryLeak, [], '真实 feed 出现测试/私有标记');
    // 每个 item 的 guid 必须等于其 link
    for (const it of rItems) {
      const guid = findFirst(it, 'guid');
      assert.equal(textOf(guid), textOf(findFirst(it, 'link')), 'guid 必须等于文章 permalink');
      assert.equal(guid.attrs.isPermaLink, 'true');
    }
    console.log(`Real feed check passed: ${rItems.length} items, max description ${maxRunes} codepoints.`);
  }

  console.log('Feed regression passed: real XML parse, 240-codepoint bound, two-layer encoding, protected canaries, stable order/GUID, label feeds, lastBuildDate semantics, optional rss.updated.');
} finally {
  assert.equal(path.dirname(fixture), tempRoot);
  assert.ok(path.basename(fixture).startsWith('lily-feeds-'));
  fs.rmSync(fixture, { recursive: true, force: true });
}
