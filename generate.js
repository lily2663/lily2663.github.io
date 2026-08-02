#!/usr/bin/env node
/**
 * 博客生成器：扫描 posts/*.md -> assets/data/articles.js
 * 用法：node generate.js
 *
 * 极简写法：只写正文也行，元信息全部自动推断：
 *   ---
 *   （front-matter 整个可省略，或只写部分字段）
 *   password: 你的密码      # 加了这行 => 该文章需输入密码才能看
 *   ---
 *   正文写在这里……
 *
 * 部分文章加密：在 front-matter 加 `password: xxx`，生成器会用 AES-256-GCM
 * 把正文加密为密文（salt/iv/cipher）写入数据文件，浏览器输入正确密码才解密。
 * 不写 password 的文章保持明文公开。
 *
 * 自动推断规则：
 *   - title ：优先用 front-matter；否则取正文第一个 # 标题；否则用文件名
 *   - date  ：优先用 front-matter；否则用文件修改时间
 *   - tags  ：优先用 front-matter；否则从正文代码块语言推断（js→JavaScript 等）；
 *             再没有就归入默认标签（见 DEFAULT_TAG）
 *   - excerpt：优先用 front-matter；否则自动截取正文首段
 *
 * 加新文章：在 posts/ 新建一个 .md 文件（文件名即文章 id），跑本脚本即可。
 * 部署/本地起服务器时，网站还会实时读取 .md，改完刷新即见，无需重跑。
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const POSTS_DIR = path.join(ROOT, "posts");
const OUT_FILE = path.join(ROOT, "assets", "data", "articles.js");

// 没写标签时的兜底标签
const DEFAULT_TAG = "随笔";

// 加密文章的列表摘要占位（不泄露任何正文）
const LOCK_EXCERPT = "该文章已加密，需输入密码查看。";

// 加密相关：AES-256-GCM + PBKDF2(密码派生密钥)
const ENC_MAGIC = "SSE1::";
const PBKDF2_ITER = 100000;

// 把正文用密码加密为 {salt, iv, cipher}（均为 base64），供浏览器端解密
function encryptContent(content, password) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(password, salt, PBKDF2_ITER, 32, "sha256");
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.from(ENC_MAGIC + content, "utf8");
  const enc = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    cipher: Buffer.concat([enc, tag]).toString("base64")
  };
}

// 代码块语言 -> 友好标签名
const LANG_MAP = {
  js: "JavaScript", javascript: "JavaScript",
  ts: "TypeScript", typescript: "TypeScript",
  jsx: "React", tsx: "React",
  py: "Python", python: "Python",
  go: "Go", rust: "Rust", java: "Java",
  c: "C/C++", cpp: "C/C++", "c++": "C/C++",
  html: "HTML", css: "CSS",
  sh: "Shell", bash: "Shell", shell: "Shell", zsh: "Shell",
  json: "JSON", yaml: "YAML", yml: "YAML",
  sql: "SQL", md: "Markdown", php: "PHP",
  rb: "Ruby", ruby: "Ruby", swift: "Swift",
  kt: "Kotlin", kotlin: "Kotlin", dart: "Dart",
  dockerfile: "Docker", vue: "Vue", svelte: "Svelte",
  rs: "Rust", lua: "Lua", r: "R", scala: "Scala"
};

// 站点元信息（想改站名/关于页，改这里）
const SITE_META = {
  title: "lily'epitaph",
  subtitle: "the house of the dead",
  author: "lilyzero",
  avatar: "assets/img/avatar.jpg",
  avatarText: "L",
  about: [
    "一个普通的web手"
  ],
  links: [
    { label: "GitHub", url: "https://github.com" },
    { label: "邮箱", url: "mailto:hi@example.com" }
  ],
  friends: [
    {
      name: "abababcd",
      url: "https://abababcdcd.github.io/",
      desc: "pwn 手 · CTF / 二进制安全",
      avatar: "assets/img/friends/abababcdcd.png"
    }
  ]
};

function parseFrontMatter(raw) {
  raw = raw.replace(/^\uFEFF/, "");
  const m = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, content: raw };
  const fm = m[1];
  const content = m[2];
  const data = {};
  const lines = fm.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const idx = line.indexOf(":");
    if (idx === -1) { i++; continue; }
    // 只认顶层 key（行首无缩进）；缩进行属于上级列表/值，跳过
    if (/^\s/.test(line)) { i++; continue; }
    const key = line.slice(0, idx).trim().toLowerCase();
    let val = line.slice(idx + 1).trim();
    if (val === "") {
      // 可能是块列表：后续缩进的 “- item”
      const items = [];
      let j = i + 1;
      while (j < lines.length) {
        const il = lines[j];
        if (/^\s*-\s+/.test(il)) {
          items.push(il.replace(/^\s*-\s+/, "").replace(/^["']|["']$/g, "").trim());
          j++;
        } else if (il.trim() === "") {
          j++;
        } else {
          break;
        }
      }
      if (items.length) { data[key] = items; i = j; continue; }
    }
    val = val.replace(/^["']|["']$/g, "");
    if (val.startsWith("[") && val.endsWith("]")) {
      data[key] = val.slice(1, -1).split(",").map(function (s) { return s.trim().replace(/^["']|["']$/g, ""); }).filter(Boolean);
    } else {
      data[key] = val;
    }
    i++;
  }
  return { meta: data, content: content };
}

// 支持数组（YAML 块列表）或逗号分隔字符串
function parseTags(s) {
  if (Array.isArray(s)) return s.map(function (t) { return String(t).trim(); }).filter(Boolean);
  if (!s) return [];
  s = s.trim();
  if (s.startsWith("[") && s.endsWith("]")) s = s.slice(1, -1);
  return s.split(",").map(function (t) { return t.trim(); }).filter(Boolean);
}

// 从正文代码块语言推断标签
function deriveTagsFromContent(content) {
  const langs = new Set();
  const re = /```([a-zA-Z0-9_+#-]+)/g;
  let mm;
  while ((mm = re.exec(content)) !== null) {
    const raw = mm[1].toLowerCase();
    const friendly = LANG_MAP[raw];
    if (friendly) langs.add(friendly);
  }
  if (langs.size > 0) return Array.from(langs);
  return [DEFAULT_TAG];
}

// 标题：front-matter -> 正文首个 # 标题 -> 文件名
function deriveTitle(metaTitle, content, filename) {
  if (metaTitle) return metaTitle;
  const h1 = content.match(/^\s*#\s+(.+)$/m);
  if (h1) return h1[1].trim();
  return filename;
}

// 日期：front-matter -> 文件修改时间（仅取 YYYY-MM-DD，忽略时分秒）
function deriveDate(metaDate, filePath) {
  if (metaDate) {
    const s = String(metaDate).trim();
    const mm = s.match(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/);
    return mm ? mm[0].replace(/\//g, "-") : s;
  }
  try {
    const stat = fs.statSync(filePath);
    const d = stat.mtime;
    const pad = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  } catch (e) {
    return "";
  }
}

function deriveExcerpt(content) {
  const text = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^---[\s\S]*?---/, "")
    .split(/\r?\n/)
    .map(function (l) { return l.replace(/[#>*_`~]/g, "").trim(); })
    .filter(Boolean)[0] || "";
  return text.slice(0, 120);
}

function slugify(name) {
  return name.replace(/\.md$/i, "");
}

function main() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.error("未找到 posts/ 目录，请先创建并放入 .md 文章。");
    process.exit(1);
  }
  const files = fs.readdirSync(POSTS_DIR).filter(function (f) {
    return /\.md$/i.test(f);
  });

  const articles = files.map(function (f) {
    const full = path.join(POSTS_DIR, f);
    const raw = fs.readFileSync(full, "utf8");
    const parsed = parseFrontMatter(raw);
    const m = parsed.meta;
    const password = m.password || m.密码;
    const userTags = parseTags(m.tags || m.标签);
    const tags = userTags.length > 0 ? userTags : deriveTagsFromContent(parsed.content);
    const base = {
      id: slugify(f),
      file: "posts/" + f,
      title: deriveTitle(m.title || m.标题, parsed.content, slugify(f)),
      date: deriveDate(m.date || m.日期, full),
      tags: tags
    };
    // 加密文章：正文只存密文，不写任何明文（含摘要）
    if (password) {
      const enc = encryptContent(parsed.content, password);
      return Object.assign(base, {
        encrypted: true,
        excerpt: LOCK_EXCERPT,
        salt: enc.salt,
        iv: enc.iv,
        cipher: enc.cipher
      });
    }
    return Object.assign(base, {
      encrypted: false,
      excerpt: m.excerpt || m.摘要 || deriveExcerpt(parsed.content),
      content: parsed.content.replace(/\s+$/, "")
    });
  });

  // 按日期倒序（无日期的排最后）
  articles.sort(function (a, b) {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date < b.date ? 1 : -1;
  });

  const out = "window.BLOG = " + JSON.stringify({ meta: SITE_META, articles: articles }, null, 2) + ";\n";
  fs.writeFileSync(OUT_FILE, out, "utf8");
  console.log("已生成 " + articles.length + " 篇文章 -> " + path.relative(ROOT, OUT_FILE));
}

main();
