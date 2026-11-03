#!/usr/bin/env node
// RSS 配置体检（QA 一键入口）
//
// 用途：判定一份 RSS 产物的"时间与摘要数据是否可信"。
// 执行说明书 5.3 要求：非法或未来的 params.rss.updated 必须"报诊断、排除该值，
// 并由总 QA 认定为未通过"。构建本身仍应成功（能产出 vs 数据可信是两件事），
// 所以判定放在这里，而不是用 warnf 打断构建。
//
// 用法：
//   node scripts/check-feed-config.mjs <feed.xml> [更多 feed...]
//   node scripts/check-feed-config.mjs --dir <buildDir>     # 检查整个产物
//
// 退出码：
//   0 = 通过（无诊断、时间合法）
//   1 = 未通过（存在诊断 / 时间异常）
//   2 = 用法错误或文件缺失
//
// 检查项：
//   1. `<-- feed-diagnostics: ... -->` 注释：存在即未通过（模板主动标记了问题）
//   2. lastBuildDate：若存在，必须是合法 RFC1123Z，且不在未来
//   3. 每个 item 的 pubDate：必须是合法时间，且不在未来
//   4. item guid 必须等于 link（防止 GUID 漂移）
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
if (!args.length) {
  console.error('用法: node scripts/check-feed-config.mjs <feed.xml...> | --dir <buildDir>');
  process.exit(2);
}

const collect = () => {
  if (args[0] === '--dir') {
    const dir = args[1];
    if (!dir || !fs.existsSync(dir)) { console.error(`目录不存在: ${dir}`); process.exit(2); }
    const out = [];
    const walk = (d) => {
      for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, ent.name);
        if (ent.isDirectory()) walk(p);
        else if (ent.name.endsWith('.xml') && ent.name !== 'sitemap.xml') out.push(p);
      }
    };
    walk(dir);
    return out;
  }
  return args;
};

const files = collect();
if (!files.length) { console.error('未找到待检查的 feed'); process.exit(2); }

// RFC1123Z: "Thu, 15 Oct 2026 14:35:04 +0000"
const parseRfc1123 = (s) => {
  const t = Date.parse(s.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
  return Number.isFinite(t) ? new Date(t) : null;
};

const now = Date.now();
const problems = [];
const checked = [];

for (const file of files) {
  const rel = file;
  let xml;
  try { xml = fs.readFileSync(file, 'utf8'); }
  catch (e) { problems.push(`${rel}: 无法读取 (${e.code})`); continue; }

  // 1) 模板主动标记的诊断
  //    诊断用 <generator> 承载（不能用 HTML 注释：Hugo 的 RSS 输出会剥离注释，
  //    实测早期的 `<!-- feed-diagnostics -->` 从未出现在产物里）。
  const gen = xml.match(/<generator>([\s\S]*?)<\/generator>/);
  let diag = null;
  if (gen && /diagnostics=/i.test(gen[1])) {
    diag = [null, gen[1].replace(/^[\s\S]*?diagnostics=/i, '').trim()];
  }
  if (diag) problems.push(`${rel}: 模板诊断存在 → ${diag[1]}`);

  // 2) channel lastBuildDate
  const lb = xml.match(/<lastBuildDate>([^<]*)<\/lastBuildDate>/);
  if (lb) {
    const d = parseRfc1123(lb[1].trim());
    if (!d) problems.push(`${rel}: lastBuildDate 无法解析 → "${lb[1]}"`);
    else if (d.getTime() > now + 60_000) problems.push(`${rel}: lastBuildDate 位于未来 → "${lb[1]}"`);
  }

  // 3) item pubDate 与 4) guid/link 一致
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  for (const [i, item] of items.entries()) {
    const pd = item.match(/<pubDate>([^<]*)<\/pubDate>/);
    if (pd) {
      const d = parseRfc1123(pd[1].trim());
      if (!d) problems.push(`${rel}: item#${i + 1} pubDate 无法解析 → "${pd[1]}"`);
      else if (d.getTime() > now + 60_000) problems.push(`${rel}: item#${i + 1} pubDate 位于未来 → "${pd[1]}"`);
    } else {
      problems.push(`${rel}: item#${i + 1} 缺少 pubDate`);
    }
    const guid = item.match(/<guid[^>]*>([^<]*)<\/guid>/);
    const link = item.match(/<link>([^<]*)<\/link>/);
    if (guid && link && guid[1].trim() !== link[1].trim()) {
      problems.push(`${rel}: item#${i + 1} guid 与 link 不一致（GUID 漂移）`);
    }
  }

  checked.push({ file: rel, items: items.length, hasDiagnostics: Boolean(diag) });
}

console.log(`检查 ${checked.length} 份 feed：`);
for (const c of checked) {
  console.log(`  ${c.hasDiagnostics ? 'FAIL' : 'ok  '}  ${c.file}  (${c.items} items)`);
}

if (problems.length) {
  console.error(`\n未通过：${problems.length} 个问题`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log('\n通过：无诊断、时间合法、GUID 与 link 一致。');
