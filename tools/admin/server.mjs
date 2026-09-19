import { createServer } from 'node:http';
import { createHash, randomUUID, randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv } from 'node:crypto';
import { promises as fs } from 'node:fs';
import fsSync from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inflateSync, gzipSync } from 'node:zlib';
import { networkInterfaces } from 'node:os';
import YAML from 'yaml';

// esbuild 打包成 cjs 后 __dirname 可用；dev 模式（node 直接跑 ESM）下 __dirname 不存在，
// 用 import.meta.url 兜底推导。
const adminDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
// 打包成 exe 后：静态界面与 server 代码一起被嵌入可执行文件快照（process.pkg 存在），
// 此时 adminDir 指向快照内虚拟路径。便携版优先把 exe 放在博客根目录；也可
// 在同目录 lilymap.json 中配置 repoRoot，或用 --project 指定另一个博客目录。
// esbuild 会把 `Boolean(process.pkg)` 常量折叠成 false 并 tree-shake 掉打包分支，
// 必须用括号访问 process["pkg"]，esbuild 无法静态分析，运行时才能正确判断是否打包。
const isPacked = typeof process !== 'undefined' && typeof process['pkg'] !== 'undefined';
const configDirectory = isPacked ? path.dirname(process.execPath) : adminDir;
const commandArguments = process.argv.slice(2);
function commandOption(name) {
  const index = commandArguments.indexOf(name);
  return index >= 0 ? String(commandArguments[index + 1] || '').trim() : '';
}
const explicitProject = commandOption('--project');
const shouldOpenBrowser = !commandArguments.includes('--no-open');
// 新包名使用 lilymap.json，同时兼容旧 Hugo Desk 安装，避免升级后丢失仓库定位。
const configPath = [path.join(configDirectory, 'lilymap.json'), path.join(configDirectory, 'hugo-desk.json')].find((candidate) => fsSync.existsSync(candidate)) || path.join(configDirectory, 'lilymap.json');
function resolveProjectPath(value) {
  if (!value || typeof value !== 'string') return '';
  return path.resolve(path.isAbsolute(value) ? value : path.join(configDirectory, value));
}
function isBlogRoot(value) {
  return Boolean(value) && fsSync.existsSync(path.join(value, 'hugo.toml')) && fsSync.existsSync(path.join(value, 'content'));
}
let repoRoot = '';
let configPort = 0;
let configProject = '';
let configOpenBrowser = true;
let configHugoPath = '';
try {
  const config = JSON.parse(fsSync.readFileSync(configPath, 'utf8'));
  configProject = String(config.repoRoot || '').trim();
  if (Number.isInteger(config.port) && config.port > 0) configPort = config.port;
  if (typeof config.openBrowser === 'boolean') configOpenBrowser = config.openBrowser;
  configHugoPath = String(config.hugoPath || '').trim();
} catch {}
const projectCandidates = [
  resolveProjectPath(explicitProject),
  resolveProjectPath(configProject),
  isPacked ? configDirectory : path.resolve(adminDir, '..', '..'),
];
repoRoot = projectCandidates.find(isBlogRoot) || '';
if (!repoRoot) throw new Error(`未找到 Hugo 博客项目。请把 LilyMap.exe 放入含 hugo.toml 与 content 的博客目录，或在 ${configPath} 设置 repoRoot，也可使用 --project "博客目录"。`);
const openBrowserOnStart = shouldOpenBrowser && configOpenBrowser;
function resolveToolPath(value) {
  if (!value) return '';
  return path.resolve(path.isAbsolute(value) ? value : path.join(repoRoot, value));
}
function detectThemeRoot(root) {
  const configured = String(process.env.LILY_THEME_PATH || '').trim();
  if (configured) {
    const absolute = path.resolve(path.isAbsolute(configured) ? configured : path.join(root, configured));
    if (fsSync.existsSync(path.join(absolute, 'theme-config.schema.json'))) return absolute;
  }
  let themeName = '';
  try {
    const config = fsSync.readFileSync(path.join(root, 'hugo.toml'), 'utf8');
    themeName = config.match(/^\s*theme\s*=\s*"([^"]+)"\s*$/m)?.[1] || '';
  } catch {}
  const candidates = [themeName, 'lily-epitaph'].filter(Boolean).map((name) => path.join(root, 'themes', name));
  for (const candidate of candidates) if (fsSync.existsSync(path.join(candidate, 'theme-config.schema.json'))) return candidate;
  try {
    const themes = fsSync.readdirSync(path.join(root, 'themes'), { withFileTypes: true });
    const compatible = themes.find((entry) => entry.isDirectory() && fsSync.existsSync(path.join(root, 'themes', entry.name, 'theme-config.schema.json')));
    if (compatible) return path.join(root, 'themes', compatible.name);
  } catch {}
  return candidates[0] || path.join(root, 'themes', 'lily-epitaph');
}
const contentRoot = path.join(repoRoot, 'content');
const staticRoot = path.join(repoRoot, 'static');
const siteAssetsRoot = path.join(staticRoot, 'assets');
const themeRoot = detectThemeRoot(repoRoot);
const themeName = path.basename(themeRoot);
const builtInLayoutsRoot = path.join(themeRoot, 'data', 'lily', 'layouts');
const userLayoutsRoot = path.join(repoRoot, 'data', 'lily', 'layouts');
const builtInModulesRoot = path.join(themeRoot, 'data', 'lily', 'modules');
const userModulesRoot = path.join(repoRoot, 'data', 'lily', 'modules');
const drawersFile = path.join(repoRoot, 'data', 'lily', 'drawers.yaml');
const siteDataFile = path.join(repoRoot, 'data', 'site.yaml');
const publicRoot = isPacked ? path.join(__dirname, 'public') : path.join(adminDir, 'public');
// Hugo 默认输出目录。dev server 从磁盘 serving，删除/重命名文章后旧的
// public 页面文件不会被自动清理，若不删会一直命中残留 HTML。
const hugoPublicRoot = path.join(repoRoot, 'public');
const trashRoot = path.join(repoRoot, '.admin-trash');
const bundledHugoExecutable = path.join(repoRoot, '.tools', 'hugo-0.165.0', 'hugo.exe');
const configuredHugoExecutable = resolveToolPath(process.env.LILY_HUGO_PATH || configHugoPath);
const hugoExecutable = configuredHugoExecutable && fsSync.existsSync(configuredHugoExecutable)
  ? configuredHugoExecutable : fsSync.existsSync(bundledHugoExecutable) ? bundledHugoExecutable : 'hugo';
const hugoSource = hugoExecutable === 'hugo' ? '系统 PATH' : hugoExecutable === bundledHugoExecutable ? '项目内置' : '本机配置';
const maxBodyBytes = 8 * 1024 * 1024;
const maxMediaBodyBytes = 160 * 1024 * 1024;
const maxDecodedImageBytes = 64 * 1024 * 1024;
const maxBuildOutputBytes = 16 * 1024;
// lilymap 管理的图片一律限制为栅格格式。SVG 是可执行文档，和管理 API
// 同源时会扩大本地 XSS 攻击面；已有的主题 SVG 仍可由静态站点正常使用。
const uploadImageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']);
const uploadVideoExtensions = new Set(['.mp4', '.webm', '.mov', '.m4v', '.mkv', '.avi']);
const browserVideoExtensions = new Set(['.mp4', '.webm']);
const mediaTargetNames = new Map([
  ['welcome', 'day'],
  ['night', 'night'],
]);

// 管理端的状态必须反映真实进程，而不是根据“服务启动过”猜测。状态对象只
// 保存低敏感、有限长度的诊断信息，供概览页和版本页展示。
const previewState = {
  status: 'starting',
  error: '',
  startedAt: null,
  stoppedAt: null,
};
const buildState = {
  status: 'idle',
  trigger: '',
  queuedAt: null,
  startedAt: null,
  finishedAt: null,
  code: null,
  output: '',
};
let publishState = null;

function publishSnapshot() {
  if (!publishState) return null;
  return {
    id: publishState.id,
    status: publishState.status,
    progress: publishState.progress,
    stage: publishState.stage,
    message: publishState.message,
    error: publishState.error,
    force: publishState.force,
    startedAt: publishState.startedAt,
    finishedAt: publishState.finishedAt,
  };
}

function trimBuildOutput(value) {
  const output = String(value || '');
  if (Buffer.byteLength(output, 'utf8') <= maxBuildOutputBytes) return output;
  return `…（输出已截断）\n${output.slice(-maxBuildOutputBytes)}`;
}

function buildSnapshot() {
  return { ...buildState, output: trimBuildOutput(buildState.output) };
}

function lanPreviewAddresses() {
  const virtual = /radmin|vethernet|virtual|vmware|loopback|tailscale/i;
  const candidates = [];
  for (const [name, addresses] of Object.entries(networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family !== 'IPv4' || address.internal) continue;
      const value = address.address;
      const isPrivate = /^10\./.test(value)
        || /^192\.168\./.test(value)
        || /^172\.(1[6-9]|2\d|3[01])\./.test(value);
      if (!isPrivate) continue;
      const interfaceRank = /^(wlan|wi-?fi|无线)/i.test(name) ? 0 : virtual.test(name) ? 20 : 5;
      const addressRank = value.startsWith('192.168.') ? 0 : value.startsWith('10.') ? 1 : 2;
      const rank = interfaceRank + addressRank;
      candidates.push({ value, rank });
    }
  }
  return [...new Set(candidates.sort((a, b) => a.rank - b.rank).map((item) => item.value))];
}

function previewSnapshot() {
  const addresses = lanPreviewAddresses();
  return {
    ...previewState,
    url: `http://localhost:${blogPort}`,
    lanUrl: addresses[0] ? `http://${addresses[0]}:${blogPort}` : '',
    lanUrls: addresses.map((address) => `http://${address}:${blogPort}`),
  };
}

function httpError(status, message) {
  const error = new Error(message);
  error.statusCode = status;
  return error;
}

function adminOriginAllowed(req) {
  const origin = req.headers.origin;
  const fetchSite = req.headers['sec-fetch-site'];
  // 命令行/本机自动化通常不带 Origin；管理页只接受自身的两个本地域名。
  // 现代浏览器还会发送 Sec-Fetch-Site；即使某个异常请求没有 Origin，
  // 也不能让 cross-site 页面借此调用本地写接口。
  if (fetchSite && !['same-origin', 'none'].includes(fetchSite)) return false;
  if (!origin) return true;
  return origin === `http://127.0.0.1:${port}` || origin === `http://localhost:${port}`;
}

function staticSecurityHeaders(target) {
  const extension = path.extname(target).toLowerCase();
  return {
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'same-origin',
    'x-frame-options': 'DENY',
    'cross-origin-resource-policy': 'same-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    // 管理页目前有内联样式和脚本；二进制/资源则使用更严格的隔离策略，
    // 即使仓库中已有 SVG 被直接打开，也不能在管理端 origin 执行脚本。
    'content-security-policy': extension === '.html'
      ? "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; form-action 'self'"
      : "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; sandbox",
  };
}

function isValidPng(bytes) {
  if (!bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return false;
  let offset = 8; let sawHeader = false; let sawEnd = false;
  const compressed = [];
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset); const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    const start = offset + 8; const end = start + length;
    if (end + 4 > bytes.length) return false;
    if (type === 'IHDR') { if (sawHeader || length !== 13) return false; sawHeader = true; }
    if (type === 'IDAT') compressed.push(bytes.subarray(start, end));
    if (type === 'IEND') { if (length !== 0) return false; sawEnd = true; offset = end + 4; break; }
    offset = end + 4;
  }
  if (!sawHeader || !sawEnd || !compressed.length || offset !== bytes.length) return false;
  try { inflateSync(Buffer.concat(compressed), { maxOutputLength: maxDecodedImageBytes }); return true; } catch { return false; }
}

function hasExpectedImageSignature(bytes, extension) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 12) return false;
  const ext = extension.toLowerCase();
  if (ext === '.png') return isValidPng(bytes);
  if (ext === '.jpg' || ext === '.jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (ext === '.gif') return bytes.subarray(0, 6).toString('ascii') === 'GIF87a' || bytes.subarray(0, 6).toString('ascii') === 'GIF89a';
  if (ext === '.webp') return bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  if (ext === '.avif') return bytes.subarray(4, 8).toString('ascii') === 'ftyp' && bytes.subarray(8, 12).toString('ascii').startsWith('avi');
  return false;
}

function send(res, status, payload, headers = {}) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': typeof payload === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'same-origin',
    'x-frame-options': 'DENY',
    'cross-origin-resource-policy': 'same-origin',
    ...headers,
  });
  res.end(body);
}

function fail(res, status, message) { send(res, status, { error: message }); }

async function readBody(req, limit = maxBodyBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('请求内容过大。');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function inside(root, candidate) {
  const target = path.resolve(root, candidate);
  return target === root || target.startsWith(`${root}${path.sep}`) ? target : null;
}

function repoPath(relative, allowedRoots = [contentRoot]) {
  if (!relative || path.isAbsolute(relative)) return null;
  const target = path.resolve(repoRoot, relative);
  return allowedRoots.some((root) => target === root || target.startsWith(`${root}${path.sep}`)) ? target : null;
}

function managedResourcePath(relative) {
  const target = repoPath(relative, [siteAssetsRoot, path.join(contentRoot, 'posts')]);
  if (!target || !['image', 'video'].includes(mediaKind(target))) return null;
  if (target.startsWith(`${path.join(contentRoot, 'posts')}${path.sep}`)) {
    const parts = path.relative(path.join(contentRoot, 'posts'), target).split(path.sep);
    if (parts.length !== 2 || !uploadImageExtensions.has(path.extname(target).toLowerCase())) return null;
  }
  return target;
}

function relativeToRepo(target) { return path.relative(repoRoot, target).split(path.sep).join('/'); }

function publicPathForRepoFile(target) {
  const resolved = path.resolve(target);
  if (resolved === staticRoot || resolved.startsWith(`${staticRoot}${path.sep}`)) {
    const relative = path.relative(staticRoot, resolved).split(path.sep).join('/');
    return relative ? `/${relative}` : '/';
  }
  return null;
}

function canonicalAssetDirectory(rawArea = 'static/assets/img') {
  let normalized = String(rawArea || '').trim().replaceAll('\\', '/').replace(/^\/+|\/+$/g, '');
  // 旧版 LilyMap 曾把 assets/ 当成可直接访问目录；继续接受旧输入，
  // 但统一重定向到 Hugo 真正公开的 static/assets/，杜绝“配置有 URL、线上无文件”。
  normalized = normalized.replace(/^static\//, '');
  if (normalized === 'assets') normalized = 'assets/img';
  if (!normalized.startsWith('assets/')) return null;
  const parts = normalized.split('/').filter(Boolean);
  if (parts.some((part) => part === '.' || part === '..' || !/^[\p{L}\p{N}._-]+$/u.test(part))) return null;
  return inside(staticRoot, parts.join(path.sep));
}

function mediaKind(target) {
  const extension = path.extname(String(target || '')).toLowerCase();
  if (uploadImageExtensions.has(extension)) return 'image';
  if (uploadVideoExtensions.has(extension)) return 'video';
  return 'other';
}

function safeMediaStem(value, fallback = 'media') {
  const stem = path.parse(path.basename(String(value || ''))).name
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  return stem || fallback;
}

async function exists(target) { try { await fs.access(target); return true; } catch { return false; } }

// 清理 Hugo 输出目录中某篇文章（post bundle 或单文件）对应的渲染产物。
// 依赖 permalink 结构为 /posts/{slug}/，与 hugo.toml 的 defaultContentLanguage 渲染一致。
async function cleanupHugoOutput(relativeBundle) {
  const slug = path.basename(relativeBundle);
  for (const leaf of [`index.html`, `index.xml`, `index.json`, `index.json.patch`]) {
    await fs.rm(path.join(hugoPublicRoot, 'posts', slug, leaf), { force: true }).catch(() => {});
  }
  await fs.rm(path.join(hugoPublicRoot, 'posts', slug), { recursive: true, force: true }).catch(() => {});
}

async function walk(root, predicate = () => true) {
  const entries = [];
  async function visit(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'public' || entry.name === '.admin-trash') continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(full);
      else if (entry.isFile() && predicate(full)) entries.push(full);
    }
  }
  await visit(root);
  return entries;
}

function scalar(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (value.startsWith('[') && value.endsWith(']')) return value.slice(1, -1).split(',').map((item) => scalar(item)).filter(Boolean);
  return value.replace(/^(['"])(.*)\1$/, '$2');
}

function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontMatter: {}, body: raw, rawFrontMatter: '' };
  const frontMatter = {};
  let currentList = null;
  let currentObject = null;
  for (const line of match[1].split(/\r?\n/)) {
    const list = line.match(/^\s+-\s+(.+)$/);
    if (list && currentList) { frontMatter[currentList].push(scalar(list[1])); continue; }
    const nested = line.match(/^\s{2,}([\w-]+):\s*(.*)$/);
    if (nested && currentObject) { frontMatter[currentObject][nested[1]] = scalar(nested[2]); continue; }
    const pair = line.match(/^([\w-]+):\s*(.*)$/);
    if (!pair) { currentList = null; currentObject = null; continue; }
    const [, key, value] = pair;
    if (!value) {
      frontMatter[key] = [];
      currentList = key;
      currentObject = key === 'params' ? key : null;
      if (currentObject) frontMatter[key] = {};
    } else {
      frontMatter[key] = scalar(value);
      currentList = null;
      currentObject = null;
    }
  }
  return { frontMatter, body: match[2], rawFrontMatter: match[1] };
}

function formatYamlValue(value) {
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  return `"${String(value ?? '').replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

function patchYamlBlock(lines, key, value) {
  const start = lines.findIndex((line) => new RegExp(`^${key}:`).test(line));
  const replacement = Array.isArray(value) ? [`${key}:`, ...value.map((item) => `  - ${formatYamlValue(item)}`)] : [`${key}: ${formatYamlValue(value)}`];
  if (start < 0) return [...lines, ...replacement];
  let end = start + 1;
  while (end < lines.length && (/^\s/.test(lines[end]) || lines[end] === '')) end += 1;
  return [...lines.slice(0, start), ...replacement, ...lines.slice(end)];
}

function patchFrontMatter(raw, changes) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n?)([\s\S]*)$/);
  const body = match ? match[3] : raw;
  let lines = match ? match[1].split(/\r?\n/) : [];
  for (const key of ['title', 'date', 'lastmod', 'slug', 'summary', 'description', 'cover', 'draft', 'tags', 'categories']) {
    if (Object.hasOwn(changes, key)) lines = patchYamlBlock(lines, key, changes[key]);
  }
  if (Object.hasOwn(changes, 'protected') || Object.hasOwn(changes, 'commentId')) {
    if (!lines.some((line) => /^params:\s*$/.test(line))) lines.push('params:');
    const start = lines.findIndex((line) => /^params:\s*$/.test(line));
    for (const [field, value] of Object.entries(changes).filter(([key]) => key === 'protected' || key === 'commentId')) {
      const formatted = field === 'protected' ? String(Boolean(value)) : formatYamlValue(value);
      let end = start + 1;
      while (end < lines.length && /^\s/.test(lines[end])) end += 1;
      const fieldLine = lines.slice(start + 1, end).findIndex((line) => new RegExp(`^\\s+${field}:`).test(line));
      if (fieldLine < 0) lines.splice(start + 1, 0, `  ${field}: ${formatted}`);
      else lines[start + 1 + fieldLine] = `  ${field}: ${formatted}`;
    }
  }
  return `---\n${lines.join('\n')}\n---\n${body}`;
}

function encryptProtectedBody(id, body, password) {
  const salt = randomBytes(16), iv = randomBytes(12);
  const key = pbkdf2Sync(password, salt, 600000, 32, 'sha256');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(body, 'utf8'), cipher.final()]);
  return {
    version: 2, pageId: id,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 600000, salt: salt.toString('base64') },
    cipher: { name: 'AES-256-GCM', iv: iv.toString('base64'), data: data.toString('base64'), tag: cipher.getAuthTag().toString('base64') },
  };
}

function decryptProtectedBody(payload, password) {
  if (payload.version !== 2 || payload.kdf?.iterations !== 600000 || payload.cipher?.name !== 'AES-256-GCM') throw httpError(400, '加密文章格式不受支持。');
  try {
    const key = pbkdf2Sync(password, Buffer.from(payload.kdf.salt, 'base64'), 600000, 32, 'sha256');
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(payload.cipher.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(payload.cipher.tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(payload.cipher.data, 'base64')), decipher.final()]).toString('utf8');
  } catch { throw httpError(400, '密码错误或加密文章已损坏。'); }
}

function parseToml(raw) {
  const values = {}; const menus = []; let section = '';
  for (const line of raw.split(/\r?\n/)) {
    const array = line.match(/^\[\[menus\.main\]\]/);
    if (array) { section = 'menus.main'; menus.push({ name: '', url: '/', weight: menus.length * 10 + 10 }); continue; }
    const heading = line.match(/^\[([^\]]+)\]$/);
    if (heading) { section = heading[1]; continue; }
    const pair = line.match(/^\s*([\w-]+)\s*=\s*(.+?)\s*$/);
    if (!pair) continue;
    const value = scalar(pair[2]);
    if (section === 'menus.main') Object.assign(menus.at(-1), { [pair[1]]: value });
    else values[section ? `${section}.${pair[1]}` : pair[1]] = value;
  }
  return { values, menus };
}

function formatTomlValue(value) {
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  return `"${String(value ?? '').replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

function patchTomlValue(raw, fieldPath, value) {
  const parts = fieldPath.split('.'); const key = parts.pop(); const section = parts.join('.');
  const lines = raw.split(/\r?\n/); const heading = section ? `[${section}]` : null;
  let start = heading ? lines.findIndex((line) => line.trim() === heading) : 0;
  if (start < 0 && heading) { lines.push('', heading); start = lines.length - 1; }
  const end = lines.findIndex((line, index) => index > start && /^\[/.test(line));
  const stop = end < 0 ? lines.length : end;
  const lineIndex = lines.findIndex((line, index) => index >= start && index < stop && new RegExp(`^${key}\\s*=`).test(line.trim()));
  const formatted = `${key} = ${formatTomlValue(value)}`;
  if (lineIndex >= 0) lines[lineIndex] = formatted;
  else lines.splice(stop, 0, formatted);
  return lines.join('\n');
}

function patchMenus(raw, menus) {
  const lines = raw.split(/\r?\n/); const starts = lines.map((line, index) => line.trim() === '[[menus.main]]' ? index : -1).filter((index) => index >= 0);
  const first = starts[0] ?? -1;
  let end = first >= 0 ? first + 1 : lines.length;
  if (first >= 0) {
    while (end < lines.length) {
      const table = lines[end].trim();
      if (/^\[/.test(table) && table !== '[[menus.main]]') break;
      end += 1;
    }
  }
  const output = menus.map((menu) => `[[menus.main]]\n  name = ${formatTomlValue(menu.name)}\n  url = ${formatTomlValue(menu.url)}\n  weight = ${Number(menu.weight) || 10}`).join('\n\n');
  if (first < 0) return `${raw.trimEnd()}\n\n${output}\n`;
  return [...lines.slice(0, first), output, ...lines.slice(end)].join('\n');
}

function isObject(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }

function parseYaml(raw, label) {
  const document = YAML.parseDocument(raw, { prettyErrors: true, uniqueKeys: true });
  if (document.errors.length) throw new Error(`${label} YAML 无效：${document.errors[0].message}`);
  const value = document.toJS({ mapAsMap: false });
  if (!isObject(value)) throw new Error(`${label} 必须是 YAML 对象。`);
  return value;
}

async function readFriends() {
  const raw = await fs.readFile(siteDataFile, 'utf8');
  const site = parseYaml(raw, '站点数据');
  if (site.friends != null && !Array.isArray(site.friends)) throw new Error('站点数据中的 friends 必须是列表。');
  return { friends: site.friends || [], version: createHash('sha256').update(raw).digest('hex') };
}

async function readProfile() {
  const raw = await fs.readFile(siteDataFile, 'utf8');
  const site = parseYaml(raw, '站点数据');
  return {
    profile: { author: site.author || '', aboutTitle: site.aboutTitle || '', about: site.about || [], links: site.links || [] },
    version: createHash('sha256').update(raw).digest('hex'),
  };
}

async function lilymapSourceArchive() {
  const names = ['server.mjs', 'package.json', 'package-lock.json', 'README.md', 'CONTRIBUTING.md', 'LICENSE', '.gitignore', 'lilymap.config.schema.json', 'lilymap.json.example', 'scripts/prepare-release.mjs', '.github/workflows/validate.yml', 'public/index.html', 'public/favicon.png', 'public/favicon.ico'];
  const sourceRoot = await exists(path.join(repoRoot, 'tools', 'admin', 'server.mjs'))
    ? path.join(repoRoot, 'tools', 'admin') : adminDir;
  const blocks = [];
  for (const name of names) {
    const data = await fs.readFile(path.join(sourceRoot, ...name.split('/')));
    const header = Buffer.alloc(512);
    const entryName = `tools/admin/${name}`;
    header.write(entryName, 0, 100, 'utf8');
    header.write('0000644\0', 100, 8, 'ascii');
    header.write('0000000\0', 108, 8, 'ascii');
    header.write('0000000\0', 116, 8, 'ascii');
    header.write(data.length.toString(8).padStart(11, '0') + '\0', 124, 12, 'ascii');
    header.write('00000000000\0', 136, 12, 'ascii');
    header.fill(32, 148, 156);
    header.write('0', 156, 1, 'ascii');
    header.write('ustar\0', 257, 6, 'ascii');
    header.write('00', 263, 2, 'ascii');
    const sum = header.reduce((total, value) => total + value, 0);
    header.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
    blocks.push(header, data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks));
}

function validProfileLink(input) {
  try {
    const url = new URL(input);
    return ['https:', 'http:', 'mailto:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

function validateProfile(value) {
  if (!isObject(value)) throw httpError(400, '个人资料无效。');
  const author = typeof value.author === 'string' ? value.author.trim() : '';
  const aboutTitle = typeof value.aboutTitle === 'string' ? value.aboutTitle.trim() : '';
  if (!author || author.length > 80 || aboutTitle.length > 80) throw httpError(400, '作者名或关于页标题长度无效。');
  if (!Array.isArray(value.about) || value.about.length > 20 || value.about.some((item) => typeof item !== 'string' || item.length > 500)) throw httpError(400, '简介段落无效。');
  if (!Array.isArray(value.links) || value.links.length > 30) throw httpError(400, '社交链接列表无效。');
  const links = value.links.map((link, index) => {
    const label = typeof link?.label === 'string' ? link.label.trim() : '';
    const url = typeof link?.url === 'string' ? link.url.trim() : '';
    if (!label || label.length > 60 || !validProfileLink(url)) throw httpError(400, `第 ${index + 1} 条社交链接无效。`);
    return { label, url };
  });
  return { author, aboutTitle, about: value.about.map((item) => item.trim()).filter(Boolean), links };
}

function validateFriends(value) {
  if (!Array.isArray(value) || value.length > 200) throw httpError(400, '友链列表无效或超过 200 条。');
  const urls = new Set();
  return value.map((friend, index) => {
    if (!isObject(friend)) throw httpError(400, `第 ${index + 1} 条友链无效。`);
    const name = typeof friend.name === 'string' ? friend.name.trim() : '';
    const url = typeof friend.url === 'string' ? friend.url.trim() : '';
    const desc = typeof friend.desc === 'string' ? friend.desc.trim() : '';
    const avatar = typeof friend.avatar === 'string' ? friend.avatar.trim() : '';
    if (!name || name.length > 80 || desc.length > 240) throw httpError(400, `第 ${index + 1} 条友链的名称或简介长度无效。`);
    const validRemote = (input) => { try { const parsed = new URL(input); return ['http:', 'https:'].includes(parsed.protocol) && Boolean(parsed.hostname) && !parsed.username && !parsed.password; } catch { return false; } };
    if (!validRemote(url)) throw httpError(400, `第 ${index + 1} 条友链需要 http(s) 网站地址。`);
    if (avatar && !validRemote(avatar) && !/^\/(?!\/)[^\s?#]+(?:\?[^\s#]*)?$/.test(avatar)) throw httpError(400, `第 ${index + 1} 条友链的头像地址无效。`);
    const key = new URL(url).href;
    if (urls.has(key)) throw httpError(400, `第 ${index + 1} 条友链的网站地址重复。`);
    urls.add(key);
    return { name, url, desc, avatar };
  });
}

function normalizeLayout(value, label) {
  if (!isObject(value.slots)) throw new Error(`${label} 缺少 slots 对象。`);
  const slots = {};
  for (const [slot, instances] of Object.entries(value.slots)) {
    const normalizedInstances = instances == null ? [] : instances;
    if (!/^[A-Za-z_][\w-]*$/.test(slot) || !Array.isArray(normalizedInstances)) throw new Error(`${label} 的 slot ${slot} 无效。`);
    slots[slot] = normalizedInstances.map((instance, index) => {
      if (!isObject(instance) || !String(instance.id || '').trim() || !String(instance.module || '').trim()) throw new Error(`${label} 的 ${slot}[${index}] 缺少 id 或 module。`);
      if (Object.hasOwn(instance, 'enabled') && typeof instance.enabled !== 'boolean') throw new Error(`${label} 的 ${slot}[${index}].enabled 必须是布尔值。`);
      if (Object.hasOwn(instance, 'order') && (typeof instance.order !== 'number' || !Number.isFinite(instance.order))) throw new Error(`${label} 的 ${slot}[${index}].order 必须是数字。`);
      return { ...instance, id: String(instance.id), module: String(instance.module), config: isObject(instance.config) ? instance.config : {} };
    });
  }
  const declared = Array.isArray(value.slotOrder) ? value.slotOrder.map(String) : Object.keys(slots);
  const slotOrder = [...new Set([...declared.filter((slot) => Object.hasOwn(slots, slot)), ...Object.keys(slots)])];
  return { ...value, kind: String(value.kind || 'page'), slots, slotOrder };
}

function parseLayout(raw, label = '布局') { return normalizeLayout(parseYaml(raw, label), label); }
function serializeLayout(layout) { return YAML.stringify(normalizeLayout(layout, '布局')); }

function layoutRevisionRoot(name) { return path.join(trashRoot, 'layouts', name); }

async function snapshotLayout(name, target) {
  if (!(await exists(target))) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destination = path.join(layoutRevisionRoot(name), `${stamp}.yaml`);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(target, destination);
  return relativeToRepo(destination);
}

async function layoutHistory(name) {
  if (!/^[\w-]+$/.test(name)) throw new Error('布局名称不合法。');
  const root = layoutRevisionRoot(name);
  if (!(await exists(root))) return [];
  const files = (await fs.readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /^\d{4}-\d{2}-\d{2}T[\d-]+Z\.yaml$/.test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .reverse();
  return Promise.all(files.map(async (file) => {
    const target = path.join(root, file);
    const stat = await fs.stat(target);
    return { revision: file, savedAt: stat.mtime.toISOString(), path: relativeToRepo(target) };
  }));
}

function normalizeModuleManifest(fileId, raw, source) {
  const manifest = parseYaml(raw, `模块 ${fileId}`);
  const id = String(manifest.id || fileId).trim();
  if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error(`模块 ${fileId} 的 id 不合法。`);
  if (id !== fileId) throw new Error(`模块文件 ${fileId}.yaml 与 manifest id ${id} 不一致。`);
  if (!Array.isArray(manifest.allowedSlots) || !manifest.allowedSlots.every((slot) => typeof slot === 'string' && /^[a-z][\w-]*\.[A-Za-z_][\w-]*$/.test(slot))) throw new Error(`模块 ${id} 缺少合法的 allowedSlots。`);
  const partial = manifest.template?.partial || `lily/modules/${id}/render.html`;
  if (typeof partial !== 'string' || partial.startsWith('/') || partial.includes('..')) throw new Error(`模块 ${id} 的模板路径不安全。`);
  const assets = isObject(manifest.assets) ? manifest.assets : {};
  for (const key of ['styles', 'scripts']) {
    if (assets[key] != null && (!Array.isArray(assets[key]) || !assets[key].every((resource) => typeof resource === 'string' && !resource.startsWith('/') && !resource.includes('..')))) throw new Error(`模块 ${id} 的 assets.${key} 无效。`);
  }
  return { ...manifest, id, apiVersion: manifest.apiVersion || 'lily-module/v1', name: manifest.name || id, description: manifest.description || '', category: manifest.category || 'general', version: String(manifest.version || '0.1.0'), context: manifest.context || 'any', defaults: isObject(manifest.defaults) ? manifest.defaults : {}, schema: isObject(manifest.schema) ? manifest.schema : {}, template: { ...(isObject(manifest.template) ? manifest.template : {}), partial }, assets, capabilities: isObject(manifest.capabilities) ? manifest.capabilities : {}, source };
}

async function yamlFiles(root) { return (await exists(root)) ? (await fs.readdir(root)).filter((name) => name.endsWith('.yaml')).sort().map((name) => path.join(root, name)) : []; }

async function loadModuleRegistry() {
  const modules = {};
  for (const [root, source] of [[builtInModulesRoot, 'built-in'], [userModulesRoot, 'site']]) {
    for (const file of await yamlFiles(root)) { const id = path.basename(file, '.yaml'); modules[id] = normalizeModuleManifest(id, await fs.readFile(file, 'utf8'), source); }
  }
  return modules;
}

async function loadLayoutEditor() {
  const layouts = new Map();
  for (const [root, source] of [[builtInLayoutsRoot, 'built-in'], [userLayoutsRoot, 'site']]) {
    for (const file of await yamlFiles(root)) { const name = path.basename(file, '.yaml'); const raw = await fs.readFile(file, 'utf8'); layouts.set(name, { name, parsed: parseLayout(raw, `布局 ${name}`), raw, source }); }
  }
  return { layouts: [...layouts.values()].sort((a, b) => a.name.localeCompare(b.name)), modules: await loadModuleRegistry() };
}

function validateModuleValue(value, definition, label) {
  const type = definition?.type || 'string';
  if (type === 'boolean' && typeof value !== 'boolean') throw new Error(`${label} 必须是布尔值。`);
  if (type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} 必须是数字。`);
    if (Number.isFinite(definition?.min) && value < definition.min) throw new Error(`${label} 不能小于 ${definition.min}。`);
    if (Number.isFinite(definition?.max) && value > definition.max) throw new Error(`${label} 不能大于 ${definition.max}。`);
  }
  if ((type === 'string' || type === 'color' || type === 'url') && typeof value !== 'string') throw new Error(`${label} 必须是文本。`);
  if (type === 'select') {
    if (typeof value !== 'string') throw new Error(`${label} 必须是选项值。`);
    const options = Array.isArray(definition.options) ? definition.options : [];
    if (options.length && !options.some((option) => option?.value === value)) throw new Error(`${label} 不在允许选项中。`);
  }
  if (type === 'url' && value && !/^(?:https?:\/\/|\/|\.\/|\.\.\/)/i.test(value)) throw new Error(`${label} 必须是 http(s) 地址或站内相对路径。`);
}

function validateLayoutAgainstRegistry(layout, modules) {
  const ids = new Set();
  for (const [slot, instances] of Object.entries(layout.slots)) {
    const fullSlot = `${layout.kind}.${slot}`;
    for (const instance of instances) {
      if (ids.has(instance.id)) throw new Error(`布局实例 id 重复：${instance.id}`);
      ids.add(instance.id);
      const manifest = modules[instance.module];
      if (!manifest) throw new Error(`未知模块：${instance.module}`);
      if (!manifest.allowedSlots.includes(fullSlot)) throw new Error(`模块 ${instance.module} 不能放入 ${fullSlot}。`);
      for (const [key, value] of Object.entries(instance.config || {})) {
        if (manifest.schema?.[key]) validateModuleValue(value, manifest.schema[key], `模块 ${instance.module} 的 ${key}`);
      }
    }
  }
}

function siteModulePaths(id, manifest) {
  const relative = [
    `data/lily/modules/${id}.yaml`,
    manifest.template?.partial ? `layouts/partials/${manifest.template.partial}` : `layouts/partials/lily/modules/${id}/render.html`,
    ...(manifest.assets?.styles || []).map((file) => `assets/${file}`),
    ...(manifest.assets?.scripts || []).map((file) => `assets/${file}`),
  ];
  return [...new Set(relative.map((file) => repoPath(file, [repoRoot])).filter(Boolean))];
}

async function moduleUsage() {
  const { layouts, modules } = await loadLayoutEditor();
  const usage = {};
  for (const layout of layouts) {
    for (const [slot, instances] of Object.entries(layout.parsed.slots)) {
      for (const instance of instances) (usage[instance.module] ||= []).push({ layout: layout.name, slot, instance: instance.id });
    }
  }
  return { modules, layouts, usage };
}

async function installSiteModule(request) {
  if (typeof request.manifest !== 'string' || request.manifest.length > maxBodyBytes) throw new Error('模块 manifest 无效。');
  const rawManifest = request.manifest.replace(/^\uFEFF/, '');
  const preview = parseYaml(rawManifest, '模块 manifest');
  const id = String(preview.id || '').trim();
  const manifest = normalizeModuleManifest(id, rawManifest, 'site');
  if (manifest.template.partial !== `lily/modules/${id}/render.html`) throw new Error('本地模块模板必须位于 lily/modules/<id>/render.html。');
  if (typeof request.template !== 'string' || !request.template.trim() || request.template.length > maxBodyBytes) throw new Error('模块必须提供 render.html 模板。');
  const registry = await loadModuleRegistry();
  if (registry[id] && registry[id].source === 'built-in') throw new Error('不能覆盖内置模块；请使用新的模块 id。');
  if (registry[id] && request.replace !== true) throw new Error('该本地模块已存在；确认更新后再覆盖。');
  const stylePath = `lily/modules/${id}.css`; const scriptPath = `lily/modules/${id}.js`;
  for (const file of manifest.assets.styles || []) if (file !== stylePath) throw new Error(`CSS 必须命名为 ${stylePath}。`);
  for (const file of manifest.assets.scripts || []) if (file !== scriptPath) throw new Error(`JS 必须命名为 ${scriptPath}。`);
  if ((manifest.assets.styles || []).includes(stylePath) && typeof request.style !== 'string') throw new Error('manifest 声明了 CSS，但未提供样式内容。');
  if ((manifest.assets.scripts || []).includes(scriptPath) && typeof request.script !== 'string') throw new Error('manifest 声明了 JS，但未提供脚本内容。');
  await atomicWrite(path.join(userModulesRoot, `${id}.yaml`), rawManifest);
  await atomicWrite(path.join(repoRoot, 'layouts', 'partials', manifest.template.partial), request.template);
  if ((manifest.assets.styles || []).includes(stylePath)) await atomicWrite(path.join(repoRoot, 'assets', stylePath), request.style);
  if ((manifest.assets.scripts || []).includes(scriptPath)) await atomicWrite(path.join(repoRoot, 'assets', scriptPath), request.script);
  return { id, manifest };
}

async function importNeteasePlaylist(request) {
  const playlistInput = String(request?.playlistId || '').trim();
  let playlistId = playlistInput;
  if (/^https?:\/\//i.test(playlistInput)) {
    let parsed;
    try { parsed = new URL(playlistInput); } catch { throw new Error('歌单链接格式无效。'); }
    if (!['music.163.com', 'y.music.163.com'].includes(parsed.hostname.toLowerCase())) throw new Error('只支持网易云音乐歌单链接。');
    playlistId = parsed.searchParams.get('id') || parsed.hash.match(/[?&]id=(\d+)/)?.[1] || '';
  }
  if (!/^\d{5,20}$/.test(playlistId)) throw new Error('请输入正确的网易云歌单 ID。');
  const cookie = String(request?.cookie || '').trim().replace(/^cookie\s*:\s*/i, '').replace(/\\([_*])/g, '$1');
  if (cookie.length > 8192 || /[\r\n\0]/.test(cookie)) throw new Error('Cookie 格式无效。');

  let response;
  try {
    response = await fetch(`https://music.163.com/api/v6/playlist/detail?id=${encodeURIComponent(playlistId)}&n=1000&s=0`, {
      headers: {
        accept: 'application/json, text/plain, */*',
        cookie,
        referer: `https://music.163.com/playlist?id=${encodeURIComponent(playlistId)}`,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 LilyMap/1.0',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error('连接网易云超时，请检查网络后重试。');
  }
  if (!response.ok) throw new Error(`网易云返回 HTTP ${response.status}，请稍后重试。`);
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > 8 * 1024 * 1024) throw new Error('网易云返回内容过大，已停止导入。');

  let payload;
  try { payload = JSON.parse(await response.text()); }
  catch { throw new Error('网易云返回了无法识别的数据。'); }
  const playlist = payload?.playlist || payload?.result;
  if (!playlist || !Array.isArray(playlist.tracks)) {
    if (payload?.code === 401 || payload?.code === 20001) {
      throw new Error(cookie
        ? '网易云拒绝访问这个隐私歌单。当前 Cookie 未获得访问权限或已经过期，请在网易云重新登录后复制完整 Cookie。原有歌单快照不会被覆盖。'
        : '这是隐私歌单。请填写有访问权限且仍有效的网易云登录 Cookie，或把歌单设为公开。原有歌单快照仍可使用。');
    }
    throw new Error(String(payload?.message || payload?.msg || '没有读取到歌单；请检查歌单 ID 与 Cookie。').slice(0, 180));
  }

  const tracks = playlist.tracks.slice(0, 500).map((track) => {
    const id = String(track?.id || '').trim();
    const artists = track?.ar || track?.artists || [];
    const album = track?.al || track?.album || {};
    return {
      id,
      title: String(track?.name || '未命名音乐').slice(0, 160),
      artist: artists.map((artist) => String(artist?.name || '')).filter(Boolean).join(' / ').slice(0, 200),
      album: String(album?.name || '').slice(0, 160),
      cover: String(album?.picUrl || '').replace(/^http:/i, 'https:').slice(0, 1000),
      duration: Number(track?.dt || track?.duration || 0),
      source: `https://music.163.com/song/media/outer/url?id=${encodeURIComponent(id)}.mp3`,
    };
  }).filter((track) => /^\d{1,20}$/.test(track.id));
  if (!tracks.length) throw new Error('歌单中没有可导入的歌曲。');

  const snapshot = {
    provider: 'netease',
    playlistId,
    name: String(playlist.name || `网易云歌单 ${playlistId}`).slice(0, 160),
    cover: String(playlist.coverImgUrl || '').replace(/^http:/i, 'https:').slice(0, 1000),
    importedAt: new Date().toISOString(),
    tracks,
  };
  const target = inside(path.join(repoRoot, 'data', 'lily', 'music'), `p${playlistId}.yaml`);
  if (!target) throw new Error('歌单保存路径无效。');
  if (await exists(target)) {
    const previous = parseYaml(await fs.readFile(target, 'utf8'), `歌单 ${playlistId}`);
    const availableIds = new Set(tracks.map((track) => track.id));
    snapshot.excludedTrackIds = Array.isArray(previous.excludedTrackIds)
      ? previous.excludedTrackIds.map(String).filter((id) => availableIds.has(id))
      : [];
  }
  await atomicWrite(target, YAML.stringify(snapshot), { schedule: false });
  const activated = request?.activate === true;
  if (activated) await activateNeteasePlaylist(playlistId, { build: false });
  const build = await runBuild(false, 'netease-playlist');
  if (build.code !== 0) throw new Error(`歌单已保存${activated ? '并设为当前歌单' : ''}，但博客构建失败：${build.output || '请查看系统诊断。'}`);
  return { playlistId, name: snapshot.name, trackCount: tracks.length, path: relativeToRepo(target), activated, build: build.build };
}

async function activeNeteasePlaylistId() {
  const target = path.join(userLayoutsRoot, 'home.yaml');
  const source = await exists(target) ? target : path.join(builtInLayoutsRoot, 'home.yaml');
  if (!(await exists(source))) return '';
  const layout = parseLayout(await fs.readFile(source, 'utf8'), '首页布局');
  for (const instances of Object.values(layout.slots)) {
    const music = instances.find((instance) => instance.module === 'music' && instance.enabled !== false);
    if (music) return String(music.config?.playlistId || '');
  }
  return '';
}

async function activateNeteasePlaylist(rawPlaylistId, { build = true } = {}) {
  const playlistId = String(rawPlaylistId || '').trim();
  if (!/^\d{5,20}$/.test(playlistId)) throw new Error('请输入正确的网易云歌单 ID。');
  const snapshot = inside(path.join(repoRoot, 'data', 'lily', 'music'), `p${playlistId}.yaml`);
  if (!snapshot || !(await exists(snapshot))) throw new Error('该歌单尚未导入，请先同步歌单。');
  const target = path.join(userLayoutsRoot, 'home.yaml');
  const source = await exists(target) ? target : path.join(builtInLayoutsRoot, 'home.yaml');
  if (!(await exists(source))) throw new Error('未找到首页布局，请先在页面布局中添加 Lily Radio。');
  const document = YAML.parseDocument(await fs.readFile(source, 'utf8'), { prettyErrors: true, uniqueKeys: true });
  if (document.errors.length) throw new Error(`首页布局 YAML 无效：${document.errors[0].message}`);
  const layout = normalizeLayout(document.toJS({ mapAsMap: false }), '首页布局');
  const instances = Object.entries(layout.slots).flatMap(([slot, items]) => items.map((item, index) => ({ slot, item, index })));
  const music = instances.filter(({ item }) => item.module === 'music' && item.enabled !== false);
  if (!music.length) throw new Error('首页没有启用的 Lily Radio；请先在页面布局中添加模块。');
  const previousPlaylistId = String(music[0].item.config?.playlistId || '');
  for (const { slot, index } of music) document.setIn(['slots', slot, index, 'config', 'playlistId'], playlistId);
  const updated = parseLayout(String(document), '首页布局');
  validateLayoutAgainstRegistry(updated, await loadModuleRegistry());
  if (await exists(target)) await snapshotLayout('home', target);
  await atomicWrite(target, String(document), { schedule: false });
  if (build) {
    const result = await runBuild(false, 'netease-activate');
    if (result.code !== 0) throw new Error(`歌单已设为当前歌单，但博客构建失败：${result.output || '请查看系统诊断。'}`);
  }
  return { playlistId, previousPlaylistId, active: true };
}

async function neteaseSnapshotStatus(rawPlaylistId) {
  const playlistId = String(rawPlaylistId || '').trim();
  if (!/^\d{5,20}$/.test(playlistId)) throw new Error('请输入正确的网易云歌单 ID。');
  const activePlaylistId = await activeNeteasePlaylistId();
  const target = inside(path.join(repoRoot, 'data', 'lily', 'music'), `p${playlistId}.yaml`);
  if (!target || !(await exists(target))) return { exists: false, playlistId, trackCount: 0, activePlaylistId, active: playlistId === activePlaylistId };
  const snapshot = parseYaml(await fs.readFile(target, 'utf8'), `歌单 ${playlistId}`);
  const stat = await fs.stat(target);
  const trackCount = Array.isArray(snapshot.tracks) ? snapshot.tracks.length : 0;
  const excludedCount = Array.isArray(snapshot.excludedTrackIds) ? snapshot.excludedTrackIds.length : 0;
  return {
    exists: true,
    playlistId,
    activePlaylistId,
    active: playlistId === activePlaylistId,
    name: String(snapshot.name || `网易云歌单 ${playlistId}`).slice(0, 160),
    trackCount,
    excludedCount,
    playableCount: Math.max(0, trackCount - excludedCount),
    importedAt: snapshot.importedAt || stat.mtime.toISOString(),
    path: relativeToRepo(target),
  };
}

async function neteaseSnapshotTracks(rawPlaylistId) {
  const playlistId = String(rawPlaylistId || '').trim();
  if (!/^\d{5,20}$/.test(playlistId)) throw new Error('请输入正确的网易云歌单 ID。');
  const target = inside(path.join(repoRoot, 'data', 'lily', 'music'), `p${playlistId}.yaml`);
  if (!target || !(await exists(target))) throw new Error('该歌单尚未导入。');
  const snapshot = parseYaml(await fs.readFile(target, 'utf8'), `歌单 ${playlistId}`);
  if (!Array.isArray(snapshot.tracks)) throw new Error('歌单快照缺少歌曲列表。');
  const excludedTrackIds = Array.isArray(snapshot.excludedTrackIds) ? snapshot.excludedTrackIds.map(String) : [];
  return {
    playlistId,
    name: String(snapshot.name || `网易云歌单 ${playlistId}`),
    tracks: snapshot.tracks.map((track) => ({ id: String(track.id), title: String(track.title || ''), artist: String(track.artist || '') })),
    excludedTrackIds,
  };
}

async function checkNeteaseTrackAvailability(request) {
  const snapshot = await neteaseSnapshotTracks(request?.playlistId);
  const trackIds = request?.trackIds;
  if (!Array.isArray(trackIds) || trackIds.length < 1 || trackIds.length > 8) throw new Error('每次只能检测 1–8 首歌曲。');
  const known = new Set(snapshot.tracks.map((track) => track.id));
  if (!trackIds.every((id) => typeof id === 'string' && known.has(id))) throw new Error('检测列表包含不属于该歌单的歌曲。');
  const results = await Promise.all(trackIds.map(async (id) => {
    try {
      const response = await fetch(`https://music.163.com/song/media/outer/url?id=${encodeURIComponent(id)}.mp3`, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      });
      const type = String(response.headers.get('content-type') || '').toLowerCase();
      const state = response.ok && type.startsWith('audio/') ? 'playable'
        : response.url.includes('/404') || type.includes('text/html') || response.status === 404 ? 'unavailable'
          : 'unknown';
      return { id, state };
    } catch { return { id, state: 'unknown' }; }
  }));
  return { playlistId: snapshot.playlistId, results };
}

async function saveNeteaseExclusions(request) {
  const snapshot = await neteaseSnapshotTracks(request?.playlistId);
  const ids = request?.excludedTrackIds;
  if (!Array.isArray(ids) || ids.length > 500 || !ids.every((id) => typeof id === 'string')) throw new Error('剔除列表格式无效。');
  const known = new Set(snapshot.tracks.map((track) => track.id));
  const excludedTrackIds = [...new Set(ids)];
  if (!excludedTrackIds.every((id) => known.has(id))) throw new Error('剔除列表包含不属于该歌单的歌曲。');
  if (excludedTrackIds.length >= snapshot.tracks.length) throw new Error('请至少保留一首歌曲供博客播放。');
  const target = inside(path.join(repoRoot, 'data', 'lily', 'music'), `p${snapshot.playlistId}.yaml`);
  const document = YAML.parseDocument(await fs.readFile(target, 'utf8'), { prettyErrors: true, uniqueKeys: true });
  if (document.errors.length) throw new Error(`歌单 YAML 无效：${document.errors[0].message}`);
  document.set('excludedTrackIds', excludedTrackIds);
  await atomicWrite(target, String(document), { schedule: false });
  const build = await runBuild(false, 'netease-exclusions');
  if (build.code !== 0) throw new Error(`剔除设置已保存，但博客构建失败：${build.output || '请查看系统诊断。'}`);
  return { playlistId: snapshot.playlistId, total: snapshot.tracks.length, excludedCount: excludedTrackIds.length, playableCount: snapshot.tracks.length - excludedTrackIds.length };
}

async function listNeteaseSnapshots() {
  const root = path.join(repoRoot, 'data', 'lily', 'music');
  const activePlaylistId = await activeNeteasePlaylistId();
  const files = (await yamlFiles(root)).filter((file) => /^p\d{5,20}\.yaml$/.test(path.basename(file)));
  const playlists = await Promise.all(files.map(async (file) => {
    const playlistId = path.basename(file).slice(1, -5);
    return neteaseSnapshotStatus(playlistId);
  }));
  playlists.sort((a, b) => String(b.importedAt || '').localeCompare(String(a.importedAt || '')));
  return { activePlaylistId, playlists };
}

async function uninstallSiteModule(id) {
  const registry = await loadModuleRegistry(); const manifest = registry[id];
  if (!manifest) throw new Error('模块不存在。');
  if (manifest.source !== 'site') throw new Error('内置模块不能卸载；可以从布局中移除。');
  const { usage } = await moduleUsage();
  if (usage[id]?.length) throw new Error(`模块仍被 ${usage[id].map((item) => `${item.layout}.${item.slot}`).join('、')} 使用，请先从布局移除。`);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destinationRoot = path.join(trashRoot, 'modules', `${stamp}-${id}`);
  for (const source of siteModulePaths(id, manifest)) {
    if (!(await exists(source))) continue;
    const destination = inside(destinationRoot, relativeToRepo(source));
    if (!destination) throw new Error('模块回收路径无效。');
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.rename(source, destination);
  }
  scheduleBuild();
  return { id, trashedTo: relativeToRepo(destinationRoot) };
}

function imageReferences(raw) {
  return [...raw.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g)].map((match) => match[1]).filter((reference) => !/^https?:|^\//i.test(reference));
}

function importFileName(name) { return String(name || '').replaceAll('\\', '/').split('/').filter(Boolean); }

function versionFor(raw, stat) { return `${stat.size}:${createHash('sha256').update(raw).digest('hex').slice(0, 16)}`; }

async function git(args) {
  return new Promise((resolve) => {
    const child = spawn('git', args, {
      cwd: repoRoot,
      windowsHide: true,
      shell: false,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', (data) => { stdout += data; });
    child.stderr.on('data', (data) => { stderr += data; });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.on('error', (error) => resolve({ code: 1, stdout, stderr: error.message }));
  });
}

function runLocalCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: repoRoot, windowsHide: true, shell: false });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', (data) => { stdout += data; });
    child.stderr.on('data', (data) => { stderr += data; });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.on('error', (error) => resolve({ code: 1, stdout, stderr: error.message }));
  });
}

const ffmpegCommand = process.env.FFMPEG_PATH || 'ffmpeg';
const ffprobeCommand = process.env.FFPROBE_PATH || 'ffprobe';
let mediaToolsPromise;

async function mediaToolsStatus() {
  if (!mediaToolsPromise) {
    mediaToolsPromise = Promise.all([
      runLocalCommand(ffmpegCommand, ['-version']),
      runLocalCommand(ffprobeCommand, ['-version']),
    ]).then(([ffmpeg, ffprobe]) => ({
      available: ffmpeg.code === 0 && ffprobe.code === 0,
      ffmpeg: ffmpeg.code === 0,
      ffprobe: ffprobe.code === 0,
      version: (ffmpeg.stdout.match(/^ffmpeg version\s+([^\s]+)/m)?.[1] || '').slice(0, 80),
    }));
  }
  return mediaToolsPromise;
}

async function inspectMedia(source) {
  const result = await runLocalCommand(ffprobeCommand, [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=codec_name,width,height,avg_frame_rate:format=duration,size,format_name',
    '-of', 'json', source,
  ]);
  if (result.code !== 0) throw httpError(400, '无法读取媒体文件：文件可能损坏，或不是受支持的视频格式。');
  try {
    const parsed = JSON.parse(result.stdout);
    const stream = parsed.streams?.[0];
    if (!stream?.width || !stream?.height) throw new Error('missing video stream');
    return {
      codec: stream.codec_name || '',
      width: Number(stream.width) || 0,
      height: Number(stream.height) || 0,
      frameRate: stream.avg_frame_rate || '',
      duration: Number(parsed.format?.duration) || 0,
      size: Number(parsed.format?.size) || 0,
      format: parsed.format?.format_name || '',
    };
  } catch {
    throw httpError(400, '媒体探测结果无效，无法安全导入。');
  }
}

async function syncStaticPreview(sourcePath) {
  const publicPath = publicPathForRepoFile(sourcePath);
  if (!publicPath) return { previewSynced: false, warning: '资源不在 static 目录，无法生成公开路径。' };
  const destination = inside(hugoPublicRoot, publicPath.slice(1).split('/').join(path.sep));
  if (!destination) return { previewSynced: false, warning: '预览目标路径不安全。' };
  try {
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(sourcePath, destination);
    return { previewSynced: true, warning: '' };
  } catch (error) {
    scheduleBuild();
    return { previewSynced: false, warning: error.message || '本地预览同步失败，已安排 Hugo 重建。' };
  }
}

async function importWallpaperMedia(sourcePath, targetName) {
  const targetPrefix = mediaTargetNames.get(String(targetName || ''));
  if (!targetPrefix) throw httpError(400, '壁纸目标只能是日间或夜间。');
  if (!path.isAbsolute(sourcePath)) throw httpError(400, '请输入完整的本机绝对路径。');
  const source = path.resolve(sourcePath);
  let stat;
  try { stat = await fs.stat(source); } catch { throw httpError(404, '没有找到这个本机文件，请检查盘符和路径。'); }
  if (!stat.isFile()) throw httpError(400, '该路径不是文件。');
  if (stat.size > 1024 * 1024 * 1024) throw httpError(413, '媒体文件超过 1 GB，不适合作为网页壁纸。');
  const extension = path.extname(source).toLowerCase();
  const kind = mediaKind(source);
  if (!['image', 'video'].includes(kind)) throw httpError(400, '支持 PNG、JPG、WebP、GIF、AVIF、MP4、WebM、MOV、M4V、MKV、AVI。');
  const directory = path.join(siteAssetsRoot, kind === 'video' ? 'media' : 'img', 'wallpapers');
  await fs.mkdir(directory, { recursive: true });
  const stamp = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  if (kind === 'image') {
    const bytes = await fs.readFile(source);
    if (!hasExpectedImageSignature(bytes, extension)) throw httpError(400, '图片内容与扩展名不匹配或文件已损坏。');
    const destination = path.join(directory, `${targetPrefix}-wallpaper-${stamp}${extension}`);
    await atomicCreate(destination, bytes);
    const preview = await syncStaticPreview(destination);
    return {
      ok: true, kind, path: publicPathForRepoFile(destination), file: relativeToRepo(destination),
      sourceSize: stat.size, outputSize: stat.size, optimized: false, ...preview,
    };
  }

  const tools = await mediaToolsStatus();
  if (!tools.available) throw httpError(503, '没有找到 FFmpeg/FFprobe，暂时无法安全转换视频壁纸。');
  const input = await inspectMedia(source);
  const destination = path.join(directory, `${targetPrefix}-wallpaper-${stamp}.mp4`);
  const temporary = `${destination}.${randomUUID()}.tmp.mp4`;
  const result = await runLocalCommand(ffmpegCommand, [
    '-hide_banner', '-loglevel', 'error', '-i', source,
    '-map', '0:v:0', '-vf', 'scale=w=min(1920\\,iw):h=-2:flags=lanczos,fps=30',
    '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '24',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-map_metadata', '-1',
    '-y', temporary,
  ]);
  if (result.code !== 0) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw httpError(400, `视频转换失败：${String(result.stderr || result.stdout || '未知错误').trim().slice(-500)}`);
  }
  await fs.rename(temporary, destination);
  const outputStat = await fs.stat(destination);
  const output = await inspectMedia(destination);
  const preview = await syncStaticPreview(destination);
  const posterPath = destination.replace(/\.mp4$/i, '.poster.webp');
  const temporaryPoster = `${posterPath}.${randomUUID()}.tmp.webp`;
  let poster = null;
  const posterResult = await runLocalCommand(ffmpegCommand, [
    '-hide_banner', '-loglevel', 'error', '-ss', '0.2', '-i', destination,
    '-frames:v', '1', '-vf', 'scale=w=min(1920\\,iw):h=-2:flags=lanczos',
    '-c:v', 'libwebp', '-quality', '78', '-compression_level', '4', '-y', temporaryPoster,
  ]);
  if (posterResult.code === 0) {
    await fs.rename(temporaryPoster, posterPath);
    const posterStat = await fs.stat(posterPath);
    const posterPreview = await syncStaticPreview(posterPath);
    poster = { path: publicPathForRepoFile(posterPath), file: relativeToRepo(posterPath), size: posterStat.size, ...posterPreview };
  } else {
    await fs.rm(temporaryPoster, { force: true }).catch(() => {});
  }
  return {
    ok: true, kind, path: publicPathForRepoFile(destination), file: relativeToRepo(destination),
    sourceSize: stat.size, outputSize: outputStat.size, optimized: true, input, output, poster, ...preview,
  };
}

let systemProxyCache;
async function systemGitProxy() {
  if (systemProxyCache !== undefined) return systemProxyCache;
  const environmentProxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
  if (environmentProxy) {
    try {
      const parsed = new URL(environmentProxy);
      if (/^https?:$/.test(parsed.protocol) && parsed.hostname) return (systemProxyCache = parsed.href);
    } catch {}
  }
  if (process.platform !== 'win32') return (systemProxyCache = '');
  const registryKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';
  const [enabled, configured] = await Promise.all([
    runLocalCommand('reg.exe', ['query', registryKey, '/v', 'ProxyEnable']),
    runLocalCommand('reg.exe', ['query', registryKey, '/v', 'ProxyServer']),
  ]);
  if (enabled.code !== 0 || configured.code !== 0 || !/ProxyEnable\s+REG_DWORD\s+0x1\b/i.test(enabled.stdout)) return (systemProxyCache = '');
  const raw = configured.stdout.match(/ProxyServer\s+REG_SZ\s+(.+)$/im)?.[1]?.trim() || '';
  const entries = raw.split(';').map((entry) => entry.trim()).filter(Boolean);
  const selected = entries.find((entry) => /^https=/i.test(entry)) || entries.find((entry) => /^http=/i.test(entry)) || entries[0] || '';
  const address = selected.replace(/^[a-z]+=/i, '');
  if (!address || /[\r\n]/.test(address)) return (systemProxyCache = '');
  const normalized = /^[a-z]+:\/\//i.test(address) ? address : `http://${address}`;
  try {
    const parsed = new URL(normalized);
    if (!/^https?:$/.test(parsed.protocol) || !parsed.hostname) return (systemProxyCache = '');
    return (systemProxyCache = parsed.href);
  } catch { return (systemProxyCache = ''); }
}

function isTransientGitNetworkFailure(result) {
  return /failed to connect|could not resolve|connection (?:was )?reset|timed? out|tls connect|http\/2 stream|schannel/i.test(`${result.stderr}\n${result.stdout}`);
}

async function gitNetwork(args) {
  const proxy = await systemGitProxy();
  const transport = proxy ? ['-c', `http.proxy=${proxy}`] : [];
  let result = await git([...transport, ...args]);
  if (result.code !== 0 && isTransientGitNetworkFailure(result)) {
    result = await git(['-c', 'http.version=HTTP/1.1', ...transport, ...args]);
    result.retried = true;
  }
  result.proxyDetected = Boolean(proxy);
  return result;
}

function safeGitFailure(result, token = '') {
  let detail = String(result.stderr || result.stdout || '未知 Git 错误').trim();
  if (token) detail = detail.split(token).join('[REDACTED]');
  detail = detail.replace(/https:\/\/[^\s@]+@github\.com/gi, 'https://[REDACTED]@github.com');
  if (isTransientGitNetworkFailure(result)) {
    const route = result.proxyDetected ? '已读取 Windows 系统代理并重试一次' : '未检测到可用系统代理，已用 HTTP/1.1 重试一次';
    return `无法连接 GitHub 主站（${route}）。请确认代理正在运行后再点发布。`;
  }
  if (/authentication failed|invalid username or password|403|401/i.test(detail)) return 'GitHub 认证失败，请更新博客根目录的 .token。';
  return detail.slice(0, 800);
}

async function gitChanges() {
  const result = await git(['-c', 'core.quotepath=false', 'status', '--short']);
  return result.stdout.split(/\r?\n/).filter(Boolean).map((line) => ({ status: line.slice(0, 2).trim() || '??', path: line.slice(3).trim().replaceAll('\\', '/') }));
}

const localConfigFile = path.join(repoRoot, '.lilymap-local.json');
function validBlogRemote(value) {
  return typeof value === 'string' && /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(value);
}
function validPublishBranch(value) {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/.test(value)
    && !value.includes('..') && !value.includes('//') && !value.endsWith('/') && !value.endsWith('.lock');
}
async function readPublishConfig() {
  if (!(await exists(localConfigFile))) return {};
  return JSON.parse(await fs.readFile(localConfigFile, 'utf8'));
}
async function publishRemote() {
  const config = await readPublishConfig();
  if (validBlogRemote(config.publishRemote)) return config.publishRemote;
  const current = await git(['remote', 'get-url', 'github']);
  return current.code === 0 && validBlogRemote(current.stdout.trim()) ? current.stdout.trim() : '';
}
async function publishBranch() {
  const config = await readPublishConfig();
  return validPublishBranch(config.publishBranch) ? config.publishBranch : 'main';
}

async function findTokenFile() {
  const candidates = [path.join(repoRoot, '.token')];
  for (const candidate of candidates) if (await exists(candidate)) return candidate;
  return null;
}

async function ensureBlogRemote(expected) {
  if (!validBlogRemote(expected)) throw new Error('尚未设置有效的 GitHub 发布目标。');
  const current = await git(['remote', 'get-url', 'github']);
  if (current.code === 0) {
    const url = current.stdout.trim();
    if (url.toLowerCase().replace(/\.git$/, '') !== expected.toLowerCase().replace(/\.git$/, '')) throw new Error(`github 远程与 LilyMap 发布目标不一致：${url}`);
    return;
  }
  const add = await git(['remote', 'add', 'github', expected]);
  if (add.code !== 0) throw new Error(`无法添加 github 远程：${add.stderr.trim()}`);
}

async function publishToBlog(commitMessage, force, report = () => {}) {
  report(5, '正在检查 GitHub 凭据');
  const tokenFile = await findTokenFile();
  if (!tokenFile) throw new Error('未找到 GitHub 认证 token（.token）。');
  const token = (await fs.readFile(tokenFile, 'utf8')).trim();
  if (!token) throw new Error('token 为空。');
  report(12, '正在确认目标仓库');
  await ensureBlogRemote(await publishRemote());
  const targetBranch = await publishBranch();
  report(20, '正在整理本地变更');
  const add = await git(['add', '-A']);
  if (add.code !== 0) throw new Error(`git add 失败：${add.stderr.trim()}`);
  const staged = await git(['diff', '--cached', '--quiet']);
  report(30, staged.code !== 0 ? '正在创建本次提交' : '没有新文件需要提交');
  if (staged.code !== 0) {
    // 默认英文 conventional commit；用户可在发布界面自定义（UTF-8 临时文件 -F 提交，避免 Windows 编码丢失）
    const message = String(commitMessage || '').slice(0, 200).trim() || 'chore: publish blog updates';
    const msgFile = path.join(trashRoot, `commit-msg-${Date.now()}.txt`);
    await fs.mkdir(trashRoot, { recursive: true });
    await fs.writeFile(msgFile, message, 'utf8');
    // 不覆盖 user.name/user.email，使用仓库/全局配置的真实身份提交
    const commit = await git(['-c', 'i18n.commitencoding=utf-8', 'commit', '-F', msgFile]);
    await fs.rm(msgFile, { force: true }).catch(() => {});
    if (commit.code !== 0) throw new Error(`git commit 失败：${commit.stderr.trim()}`);
  }
  const ref = `${force ? '+' : ''}HEAD:refs/heads/${targetBranch}`;
  const rewrite = `url.https://oauth2:${token}@github.com/.insteadOf=https://github.com/`;
  // Reconcile remote-first changes (e.g. edits made directly on GitHub web)
  // so a stale local branch never blocks publishing with a non-fast-forward.
  report(46, '正在获取 GitHub 上的最新版本');
  const fetch = await gitNetwork(['-c', rewrite, 'fetch', 'github', targetBranch]);
  let newRemoteBranch = false;
  if (fetch.code !== 0 && force) {
    const probe = await gitNetwork(['-c', rewrite, 'ls-remote', 'github', `refs/heads/${targetBranch}`]);
    newRemoteBranch = probe.code === 0 && !probe.stdout.trim();
  }
  if (fetch.code !== 0 && !newRemoteBranch) throw new Error(`git fetch 失败：${safeGitFailure(fetch, token)}`);
  if (!newRemoteBranch) {
    report(64, '正在检查远程差异');
    const remoteOnly = await git(['rev-list', '--count', 'FETCH_HEAD', '--not', 'HEAD']);
    if (Number(remoteOnly.stdout.trim() || '0') > 0) {
      report(73, '正在安全整合远程修改');
      const rebase = await git(['rebase', 'FETCH_HEAD']);
      if (rebase.code !== 0) {
        await git(['rebase', '--abort']);
        throw new Error('远程包含与本地冲突的修改，已安全中止。请先在 GitHub 上查看远程改动再发布。');
      }
    }
  }
  report(86, force ? '正在强制推送当前源码' : '正在推送到 GitHub');
  const push = await gitNetwork(['-c', rewrite, 'push', 'github', ref]);
  if (push.code !== 0) throw new Error(`push 失败：${safeGitFailure(push, token)}`);
  report(100, '源码已推送，GitHub Actions 正在构建');
  return { message: commitMessage ? `已推送 ${commitMessage}` : `已推送到 ${targetBranch} 分支` };
}

// 博客预览由 admin server 自己托管 public/（见底部 blogServer），
// 不再探测外部 hugo server，因此恒为运行中。
const blogPort = Number(process.env.BLOG_PORT || 1414);
const blogHost = process.env.BLOG_HOST || '0.0.0.0';

async function blogStatus() {
  const running = previewState.status === 'running';
  const ready = running && await exists(path.join(hugoPublicRoot, 'index.html'));
  return { ...previewSnapshot(), running, ready };
}

async function articleRecord(file, changes) {
  const raw = await fs.readFile(file, 'utf8');
  const stat = await fs.stat(file);
  const { frontMatter, body } = parseFrontMatter(raw);
  const relative = relativeToRepo(file);
  const bundle = path.basename(file).toLowerCase() === 'index.md';
  const params = frontMatter.params && typeof frontMatter.params === 'object' ? frontMatter.params : {};
  const change = changes.find((item) => item.path === relative || item.path.endsWith(`/${relative}`));
  return {
    path: relative,
    fileName: path.basename(file),
    directory: relativeToRepo(path.dirname(file)),
    kind: bundle ? 'bundle' : 'file',
    title: frontMatter.title || path.basename(file, path.extname(file)),
    slug: frontMatter.slug || path.basename(bundle ? path.dirname(file) : file, path.extname(file)),
    date: frontMatter.date || '', lastmod: frontMatter.lastmod || '', draft: frontMatter.draft === true,
    tags: Array.isArray(frontMatter.tags) ? frontMatter.tags : [], categories: Array.isArray(frontMatter.categories) ? frontMatter.categories : [],
    description: frontMatter.description || frontMatter.summary || '', summary: frontMatter.summary || '', cover: frontMatter.cover || frontMatter.image || '',
    legacyId: params.legacyId || frontMatter.legacyId || '', protected: params.protected === true || frontMatter.protected === true,
    wordCount: body.trim() ? body.trim().split(/\s+/).length : 0, size: stat.size, modifiedAt: stat.mtime.toISOString(),
    git: change?.status || '', version: versionFor(raw, stat), frontMatter,
  };
}

async function listPosts(changes = null) {
  const currentChanges = changes || await gitChanges();
  const files = await walk(contentRoot, (file) => /\.md$/i.test(file));
  const posts = await Promise.all(files.map((file) => articleRecord(file, currentChanges)));
  return posts.sort((a, b) => String(b.lastmod || b.date || b.modifiedAt).localeCompare(String(a.lastmod || a.date || a.modifiedAt)));
}

async function readDrawers() {
  if (!(await exists(drawersFile))) return { drawers: [], version: '' };
  const raw = await fs.readFile(drawersFile, 'utf8');
  const data = parseYaml(raw, '分类抽屉');
  if (!Array.isArray(data.drawers)) throw httpError(500, '分类抽屉文件无效：drawers 必须是数组。');
  const stat = await fs.stat(drawersFile);
  return { drawers: data.drawers, version: versionFor(raw, stat) };
}

function validateDrawers(value, posts) {
  if (!Array.isArray(value) || value.length > 100) throw httpError(400, '抽屉数量不能超过 100 个。');
  const available = new Set(posts.filter((post) => post.path.startsWith('content/posts/')).map((post) => post.path));
  const ids = new Set();
  return value.map((drawer, index) => {
    if (!isObject(drawer)) throw httpError(400, `第 ${index + 1} 个抽屉无效。`);
    const id = String(drawer.id || '').trim();
    const title = String(drawer.title || '').trim();
    const description = String(drawer.description || '').trim();
    if (!/^[a-z][a-z0-9-]{0,39}$/.test(id) || ids.has(id)) throw httpError(400, `第 ${index + 1} 个抽屉 ID 无效或重复。`);
    if (!title || title.length > 60 || description.length > 200) throw httpError(400, `抽屉 ${id} 的名称或说明长度无效。`);
    if (!Array.isArray(drawer.posts) || drawer.posts.length > 1000) throw httpError(400, `抽屉 ${id} 的文章列表无效。`);
    if (drawer.posts.some((postPath) => typeof postPath !== 'string' || !available.has(postPath))) throw httpError(400, `抽屉 ${id} 引用了不存在的文章。请先刷新页面。`);
    if (new Set(drawer.posts).size !== drawer.posts.length) throw httpError(400, `抽屉 ${id} 含有重复文章。`);
    ids.add(id);
    return { id, title, description, posts: drawer.posts };
  });
}

async function remapDrawerPostPath(previous, next = '') {
  if (!(await exists(drawersFile))) return;
  const current = await readDrawers();
  let changed = false;
  const drawers = current.drawers.map((drawer) => {
    const original = Array.isArray(drawer.posts) ? drawer.posts : [];
    const posts = original.map((item) => item === previous ? next : item).filter(Boolean);
    if (posts.length !== original.length || posts.some((item, index) => item !== original[index])) changed = true;
    return { ...drawer, posts };
  });
  if (changed) await atomicWrite(drawersFile, YAML.stringify({ drawers }), { schedule: false });
}

// 构建管理：admin server 自己持有 Hugo 构建，不再依赖外部 hugo server。
// 每次内容/配置变更后延迟触发一次一次性构建（约 1.4s），比外部 hugo server
// 的全量重建更快，且不存在多实例抢 public/ 锁导致的失败。
// 站点图片上传走 static→public 直拷，即时可见，不触发构建。
let buildTimer = null;
let buildChain = Promise.resolve();

function scheduleBuild(delay = 500) {
  if (buildTimer) clearTimeout(buildTimer);
  buildState.queuedAt = new Date().toISOString();
  if (buildState.status !== 'running') buildState.status = 'queued';
  buildState.trigger = 'scheduled';
  buildTimer = setTimeout(() => { buildTimer = null; void runBuild(); }, delay);
}

async function runBuild(minify = false, trigger = 'manual') {
  if (buildState.status !== 'running') buildState.status = 'queued';
  buildState.queuedAt ||= new Date().toISOString();
  buildState.trigger = trigger;
  const task = buildChain.then(async () => {
    buildState.status = 'running';
    buildState.startedAt = new Date().toISOString();
    buildState.finishedAt = null;
    buildState.code = null;
    buildState.output = '';
    buildState.queuedAt = null;
    let result;
    try {
      // 不碰 Hugo 的构建锁：它也可能属于用户在另一个终端运行的 Hugo 实例。
      // 本服务自身的构建已由 buildChain 串行化，遇到外部锁时把 Hugo 的诊断原样返回。
      const args = minify
        ? ['--gc', '--minify', '--cacheDir', path.join(repoRoot, '.cache', 'hugo')]
        : ['--cacheDir', path.join(repoRoot, '.cache', 'hugo')];
      result = await new Promise((resolve) => {
        const child = spawn(hugoExecutable, args, { cwd: repoRoot, windowsHide: true, shell: false });
        let output = '';
        child.stdout.on('data', (data) => { output += data; });
        child.stderr.on('data', (data) => { output += data; });
        child.on('close', (code) => resolve({ code: Number.isInteger(code) ? code : 1, output }));
        child.on('error', (error) => resolve({ code: 1, output: error.message === 'spawn hugo ENOENT' ? '未找到 Hugo。请安装 Hugo，或在 lilymap.json 中设置 hugoPath。' : error.message }));
      });
    } catch (error) {
      result = { code: 1, output: error.message || 'Hugo 构建过程异常。' };
    }
    buildState.code = result.code;
    buildState.output = trimBuildOutput(result.output);
    buildState.finishedAt = new Date().toISOString();
    buildState.status = result.code === 0 ? 'success' : 'error';
    if (result.code !== 0) console.error(`Hugo 构建失败：${buildState.output}`);
    return { ...result, output: trimBuildOutput(result.output), build: buildSnapshot() };
  });
  buildChain = task.catch(() => {});
  return task;
}

async function stageFile(target, content) {
  const directory = path.dirname(target);
  const temporary = path.join(directory, `.${path.basename(target)}.${randomUUID()}.tmp`);
  await fs.mkdir(directory, { recursive: true });
  const handle = await fs.open(temporary, 'wx');
  try {
    if (typeof content === 'string') await handle.writeFile(content, 'utf8');
    else await handle.writeFile(content);
    await handle.sync();
  } catch (error) {
    await handle.close().catch(() => {});
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
  await handle.close();
  return temporary;
}

async function atomicWrite(target, content, { schedule = true } = {}) {
  const temporary = await stageFile(target, content);
  try {
    await fs.rename(temporary, target);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
  if (schedule) scheduleBuild();
}

// 以硬链接把已经 fsync 的临时文件一次性挂到目标路径，目标存在时原子失败，
// 从而避免上传两个同名资源时后一个请求静默覆盖前一个文件。
async function atomicCreate(target, content) {
  const temporary = await stageFile(target, content);
  try {
    await fs.link(temporary, target);
  } catch (error) {
    if (error.code === 'EEXIST' || (await exists(target))) throw httpError(409, `同名资源已存在：${relativeToRepo(target)}。`);
    throw error;
  } finally {
    await fs.rm(temporary, { force: true }).catch(() => {});
  }
}

async function copyWithoutClobber(source, target) {
  const bytes = await fs.readFile(source);
  try {
    await atomicCreate(target, bytes);
    return 'created';
  } catch (error) {
    if (error.statusCode !== 409) throw error;
    const current = await fs.readFile(target).catch(() => null);
    if (current && current.equals(bytes)) return 'existing';
    throw httpError(409, `目标资源已存在且内容不同：${relativeToRepo(target)}。`);
  }
}

async function prepareImport(request) {
  const files = Array.isArray(request.files) ? request.files : [];
  const markdown = files.filter((file) => /\.md(?:own)?$/i.test(file.name || '') || /\.markdown$/i.test(file.name || ''));
  if (markdown.length !== 1) throw new Error('一次导入请选择一个 Markdown 文件（可同时包含它的图片目录）。');
  const source = markdown[0];
  const raw = Buffer.from(String(source.content || ''), 'base64').toString('utf8').replace(/^\uFEFF/, '');
  const parsed = parseFrontMatter(raw);
  const fileStem = path.basename(source.name, path.extname(source.name));
  const title = parsed.frontMatter.title || request.title || fileStem;
  const inferredSlug = String(title || fileStem).trim().toLowerCase().replace(/\s+/g, '-');
  const slug = safeSlug(parsed.frontMatter.slug || request.slug || inferredSlug || fileStem);
  if (!slug) throw new Error('无法生成安全的 Slug。');
  const sourceParts = importFileName(source.relativePath || source.name);
  const sourceDirectory = sourceParts.slice(0, -1).join('/');
  const body = parsed.body;
  const references = imageReferences(body);
  // Typora often embeds absolute Windows paths for images. Resolve them
  // against the repo: files under static/ keep their public URL, files under
  // root assets/ are copied into static/assets/ for deployment, other local
  // files become bundle images, and missing ones fall back to a bundle
  // basename so the pick-missing flow can still match them.
  const absolutePattern = /^(?:[A-Za-z]:[\\/]|\\\\)/;
  const rewrites = [];
  const staticCopies = [];
  const diskAssets = [];
  for (const reference of [...new Set(references)]) {
    if (!absolutePattern.test(reference)) continue;
    let diskPath = null;
    try {
      const candidate = path.resolve(reference);
      if ((await fs.stat(candidate)).isFile()) diskPath = candidate;
    } catch {}
    if (!diskPath) { rewrites.push({ from: reference, to: path.basename(reference.replaceAll('\\', '/')) }); continue; }
    const relativeToRoot = path.relative(repoRoot, diskPath);
    const inRepo = relativeToRoot && !relativeToRoot.startsWith('..') && !path.isAbsolute(relativeToRoot);
    const normalized = inRepo ? relativeToRoot.replaceAll('\\', '/') : '';
    if (inRepo && normalized.startsWith('static/')) {
      rewrites.push({ from: reference, to: `/${normalized.slice('static/'.length)}` });
    } else if (inRepo && normalized.startsWith('assets/')) {
      staticCopies.push({ from: diskPath, to: normalized.replace(/^assets\//, 'static/assets/') });
      rewrites.push({ from: reference, to: `/${normalized}` });
    } else {
      const base = path.basename(diskPath);
      if (!diskAssets.some((asset) => asset.diskPath === diskPath)) diskAssets.push({ name: base, diskPath, parts: [base], targetParts: [base] });
      rewrites.push({ from: reference, to: base });
    }
  }
  rewrites.sort((a, b) => b.from.length - a.from.length);
  let rewritten = raw;
  for (const rewrite of rewrites) rewritten = rewritten.split(rewrite.from).join(rewrite.to);
  const referencesClean = references.map((reference) => reference.replace(/^\.\//, ''));
  const bundleRefs = [];
  for (const reference of referencesClean) {
    const rewrite = rewrites.find((item) => item.from === reference);
    const effective = rewrite ? rewrite.to : reference;
    if (!/^(?:https?:)?\/\//i.test(effective) && !effective.startsWith('/')) bundleRefs.push(effective);
  }
  const referenceByBase = new Map();
  for (const reference of bundleRefs) {
    const base = reference.split('/').pop();
    if (base && !referenceByBase.has(base)) referenceByBase.set(base, reference);
  }
  const selected = files.filter((file) => file !== source).map((file) => {
    const parts = importFileName(file.relativePath || file.name);
    const relativeParts = sourceDirectory && parts.slice(0, sourceParts.length - 1).join('/') === sourceDirectory ? parts.slice(sourceParts.length - 1) : parts;
    let targetParts = relativeParts;
    const joined = relativeParts.join('/');
    if (!bundleRefs.includes(joined) && relativeParts.length === 1 && referenceByBase.has(relativeParts[0])) targetParts = referenceByBase.get(relativeParts[0]).split('/');
    return { ...file, parts, targetParts };
  });
  const selectedNames = new Set();
  for (const file of selected) { selectedNames.add(file.parts.join('/')); selectedNames.add(file.parts.at(-1)); selectedNames.add(file.targetParts.join('/')); }
  for (const asset of diskAssets) selectedNames.add(asset.targetParts.join('/'));
  const missing = bundleRefs.filter((reference) => !selectedNames.has(reference) && !selectedNames.has(reference.split('/').pop()));
  // Windows 文件系统大小写不敏感；在导入确认阶段就拦截两个输入归到同一
  // 个目标路径的情况，避免后写入的图片覆盖先写入的图片。
  const uniqueAssets = [];
  const assetTargets = new Map();
  for (const asset of [...selected, ...diskAssets]) {
    const targetParts = Array.isArray(asset.targetParts) ? asset.targetParts : [];
    const targetKey = targetParts.join('/').replaceAll('\\', '/').toLowerCase();
    if (!targetKey || targetKey === 'index.md') continue;
    const previous = assetTargets.get(targetKey);
    if (previous) {
      const sameDiskFile = previous.diskPath && asset.diskPath && path.resolve(previous.diskPath) === path.resolve(asset.diskPath);
      if (sameDiskFile) continue;
      throw httpError(409, `导入资源同名冲突：${targetParts.join('/')}。请重命名后再导入。`);
    }
    assetTargets.set(targetKey, asset);
    uniqueAssets.push(asset);
  }
  const changes = [];
  const content = parsed.rawFrontMatter ? rewritten : `---\ntitle: ${formatYamlValue(title)}\ndate: ${new Date().toISOString()}\nlastmod: ${new Date().toISOString()}\nslug: ${formatYamlValue(slug)}\nsummary: ""\ntags: []\ncategories: []\ndraft: ${request.draft === false ? 'false' : 'true'}\n---\n\n${rewritten}`;
  return { slug, title, raw: content, hasFrontMatter: Boolean(parsed.rawFrontMatter), sourceDirectory, assets: uniqueAssets, references, missing, rewrites, staticCopies, changes };
}

function safeSlug(input) {
  const slug = String(input || '').trim().replace(/\s+/g, '-');
  if (!slug || slug.length > 100 || /[\\/:*?"<>|]/.test(slug) || slug === '.' || slug === '..' || slug.includes('..')) return null;
  return slug;
}

async function handleApi(req, res, url) {
  const pathname = url.pathname;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !adminOriginAllowed(req)) {
    return fail(res, 403, '仅允许从本机 lilymap 页面发起写入请求。');
  }
  if (req.method === 'POST' && pathname === '/api/import/inspect') {
    try {
      const request = JSON.parse((await readBody(req, 20 * 1024 * 1024)).toString('utf8'));
      const plan = await prepareImport(request);
      return send(res, 200, { ...plan, raw: undefined, assetCount: plan.assets.length, rewriteCount: (plan.rewrites || []).length });
    } catch (error) { return fail(res, 400, error.message || '导入内容无效。'); }
  }
  if (req.method === 'POST' && pathname === '/api/import') {
    let plan;
    try {
      const request = JSON.parse((await readBody(req, 20 * 1024 * 1024)).toString('utf8'));
      plan = await prepareImport(request);
    } catch (error) { return fail(res, 400, error.message || '导入内容无效。'); }
    const destination = path.join(contentRoot, 'posts', plan.slug);
    if (await exists(destination)) return fail(res, 409, '目标文章目录已存在。');
    await fs.mkdir(destination, { recursive: true });
    try {
      // 先验证会写入的 static 资源，防止导入完成一半才发现同名文件冲突。
      for (const copy of plan.staticCopies || []) {
        const dest = inside(repoRoot, copy.to);
        if (!dest) throw new Error('资源路径不安全。');
        if (await exists(dest)) {
          const sourceBytes = await fs.readFile(copy.from);
          const currentBytes = await fs.readFile(dest);
          if (!currentBytes.equals(sourceBytes)) throw httpError(409, `目标资源已存在且内容不同：${relativeToRepo(dest)}。`);
        }
      }
      await atomicWrite(path.join(destination, 'index.md'), plan.raw, { schedule: false });
      for (const asset of plan.assets) {
        const relative = asset.targetParts.join('/');
        if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('资源路径不安全。');
        const target = inside(destination, relative);
        if (!target || !uploadImageExtensions.has(path.extname(target).toLowerCase())) continue;
        const bytes = asset.diskPath ? await fs.readFile(asset.diskPath) : Buffer.from(String(asset.content || ''), 'base64');
        if (!hasExpectedImageSignature(bytes, path.extname(target))) throw new Error(`图片 ${path.basename(target)} 的内容与扩展名不匹配或已损坏。`);
        await atomicCreate(target, bytes);
      }
      for (const copy of plan.staticCopies || []) {
        const dest = inside(repoRoot, copy.to);
        if (!dest) continue;
        await copyWithoutClobber(copy.from, dest);
        const publicDest = path.join(repoRoot, 'public', ...copy.to.replace(/^static\//, '').split('/'));
        await atomicWrite(publicDest, await fs.readFile(copy.from), { schedule: false });
      }
      scheduleBuild();
    } catch (error) {
      await fs.rename(destination, path.join(trashRoot, `failed-import-${randomUUID()}`)).catch(() => {});
      throw error;
    }
    return send(res, 201, { ok: true, path: relativeToRepo(path.join(destination, 'index.md')), assetCount: plan.assets.length, missing: plan.missing, rewriteCount: (plan.rewrites || []).length });
  }
  if (req.method === 'GET' && pathname === '/api/status') {
    const [changes, branch, head, blog, mediaTools] = await Promise.all([gitChanges(), git(['branch', '--show-current']), git(['log', '-1', '--format=%h%x00%s%x00%aI']), blogStatus(), mediaToolsStatus()]);
    const postCount = (await listPosts(changes)).filter((post) => post.path.startsWith('content/posts/')).length;
    return send(res, 200, {
      apiVersion: 6,
      repoRoot,
      paths: {
        repository: repoRoot,
        content: contentRoot,
        static: staticRoot,
        siteAssets: siteAssetsRoot,
        public: hugoPublicRoot,
        publicAssetPrefix: '/assets/',
      },
      theme: { name: themeName, root: themeRoot, compatible: await exists(path.join(themeRoot, 'theme-config.schema.json')) },
      hugo: { executable: hugoExecutable, source: hugoSource, bundled: await exists(bundledHugoExecutable) },
      mediaTools,
      branch: branch.stdout.trim(), changes, postCount, blogUrl: blog.url, blogLanUrl: blog.lanUrl,
      blogRunning: blog.running, blogStatus: blog.status, preview: blog, build: buildSnapshot(),
      head: head.stdout.trim().split('\0'),
    });
  }
  if (req.method === 'GET' && pathname === '/api/posts') return send(res, 200, { posts: await listPosts() });
  if (req.method === 'GET' && pathname === '/api/admin/export') {
    const archive = await lilymapSourceArchive();
    res.writeHead(200, { 'content-type': 'application/gzip', 'content-disposition': 'attachment; filename="lilymap-source.tar.gz"', 'content-length': archive.length, 'cache-control': 'no-store' });
    res.end(archive);
    return;
  }
  if (req.method === 'GET' && pathname === '/api/drawers') return send(res, 200, await readDrawers());
  if (req.method === 'GET' && pathname === '/api/friends') return send(res, 200, await readFriends());
  if (req.method === 'GET' && pathname === '/api/profile') return send(res, 200, await readProfile());
  if (req.method === 'PUT' && pathname === '/api/profile') {
    const request = JSON.parse((await readBody(req)).toString('utf8'));
    const raw = await fs.readFile(siteDataFile, 'utf8');
    if (request.version !== createHash('sha256').update(raw).digest('hex')) return fail(res, 409, '个人资料已在别处修改，请刷新后重试。');
    const profile = validateProfile(request.profile);
    const document = YAML.parseDocument(raw, { prettyErrors: true, uniqueKeys: true });
    if (document.errors.length) throw httpError(400, `站点数据 YAML 无效：${document.errors[0].message}`);
    for (const [key, value] of Object.entries(profile)) document.set(key, value);
    const tomlPath = path.join(repoRoot, 'hugo.toml');
    const toml = await fs.readFile(tomlPath, 'utf8');
    await atomicWrite(siteDataFile, String(document), { schedule: false });
    await atomicWrite(tomlPath, patchTomlValue(toml, 'params.author', profile.author), { schedule: false });
    scheduleBuild();
    return send(res, 200, { ok: true, ...await readProfile() });
  }
  if (req.method === 'PUT' && pathname === '/api/friends') {
    const request = JSON.parse((await readBody(req)).toString('utf8'));
    const raw = await fs.readFile(siteDataFile, 'utf8');
    const version = createHash('sha256').update(raw).digest('hex');
    if (request.version !== version) return fail(res, 409, '友链配置已在别处修改，请刷新后重试。');
    const friends = validateFriends(request.friends);
    const document = YAML.parseDocument(raw, { prettyErrors: true, uniqueKeys: true });
    if (document.errors.length) throw httpError(400, `站点数据 YAML 无效：${document.errors[0].message}`);
    document.set('friends', friends);
    await atomicWrite(siteDataFile, String(document));
    return send(res, 200, { ok: true, ...await readFriends() });
  }
  if (req.method === 'PUT' && pathname === '/api/drawers') {
    const request = JSON.parse((await readBody(req)).toString('utf8'));
    const current = await readDrawers();
    if (request.version !== current.version) return fail(res, 409, '抽屉已在别处修改，请刷新后重试。');
    const drawers = validateDrawers(request.drawers, await listPosts());
    await atomicWrite(drawersFile, YAML.stringify({ drawers }));
    return send(res, 200, { ok: true, ...await readDrawers() });
  }
  if (req.method === 'GET' && pathname === '/api/post') {
    const target = repoPath(url.searchParams.get('path'));
    if (!target || !(await exists(target)) || !/\.md$/i.test(target)) return fail(res, 404, '文章不存在。');
    const raw = await fs.readFile(target, 'utf8'); const stat = await fs.stat(target);
    return send(res, 200, { raw, version: versionFor(raw, stat), article: await articleRecord(target, await gitChanges()) });
  }
  if (req.method === 'PUT' && pathname === '/api/post') {
    const target = repoPath(url.searchParams.get('path'));
    if (!target || !(await exists(target)) || !/\.md$/i.test(target)) return fail(res, 404, '文章不存在。');
    const request = JSON.parse((await readBody(req)).toString('utf8'));
    if (typeof request.raw !== 'string' || request.raw.length > maxBodyBytes) return fail(res, 400, 'Markdown 内容无效。');
    const previous = await fs.readFile(target, 'utf8'); const stat = await fs.stat(target);
    if (request.version && request.version !== versionFor(previous, stat)) return send(res, 409, { error: '文件已被 Typora 或其他程序修改，请先重新载入或比较。', currentVersion: versionFor(previous, stat) });
    await atomicWrite(target, request.raw.replace(/^\uFEFF/, ''));
    const savedRaw = await fs.readFile(target, 'utf8'); const savedStat = await fs.stat(target);
    return send(res, 200, { ok: true, version: versionFor(savedRaw, savedStat), article: await articleRecord(target, await gitChanges()) });
  }
  if (req.method === 'PATCH' && pathname === '/api/article') {
    const target = repoPath(url.searchParams.get('path'));
    if (!target || !(await exists(target)) || !/\.md$/i.test(target)) return fail(res, 404, '文章不存在。');
    const request = JSON.parse((await readBody(req)).toString('utf8'));
    const previous = await fs.readFile(target, 'utf8'); const stat = await fs.stat(target);
    if (request.version && request.version !== versionFor(previous, stat)) return send(res, 409, { error: '文件已被外部修改，请重新载入后再保存。' });
    if (Object.hasOwn(request.changes || {}, 'protected')) return fail(res, 400, '请使用加密文章操作；单独修改保护标记不会加密正文。');
    const allowed = ['title', 'date', 'lastmod', 'slug', 'summary', 'description', 'cover', 'draft', 'tags', 'categories'];
    const changes = Object.fromEntries(Object.entries(request.changes || {}).filter(([key]) => allowed.includes(key)));
    await atomicWrite(target, patchFrontMatter(previous, changes));
    const saved = await fs.readFile(target, 'utf8'); const savedStat = await fs.stat(target);
    return send(res, 200, { ok: true, version: versionFor(saved, savedStat), article: await articleRecord(target, await gitChanges()) });
  }
  if (req.method === 'POST' && pathname === '/api/protected') {
    const request = JSON.parse((await readBody(req, 16 * 1024)).toString('utf8'));
    const target = repoPath(request.path, [path.join(contentRoot, 'posts')]);
    if (!target || path.basename(target).toLowerCase() !== 'index.md' || !(await exists(target))) return fail(res, 404, '文章不存在。');
    const raw = await fs.readFile(target, 'utf8');
    const stat = await fs.stat(target);
    if (request.version !== versionFor(raw, stat)) return fail(res, 409, '文章已被修改，请重新打开后再操作。');
    const password = typeof request.password === 'string' ? request.password : '';
    if (password.length < 8 || password.length > 256) return fail(res, 400, '密码长度须为 8 到 256 个字符。');
    const parsed = parseFrontMatter(raw);
    if (!parsed.rawFrontMatter) return fail(res, 400, '文章缺少 Front Matter。');
    const id = String(parsed.frontMatter.params?.commentId || path.basename(path.dirname(target)));
    if (!/^[\p{L}\p{N}._-]{1,100}$/u.test(id)) return fail(res, 400, '文章 ID 无效。');
    const privatePath = path.join(repoRoot, 'private-content', `${id}.md`);
    const payloadPath = path.join(staticRoot, 'protected', `${encodeURIComponent(id)}.json`);
    const secretsPath = path.join(repoRoot, '.secrets', 'protected-posts.json');
    if (request.action === 'encrypt') {
      if (parsed.frontMatter.params?.protected === true || await exists(privatePath) || await exists(payloadPath)) return fail(res, 409, '文章已受保护，或加密文件已存在。');
      if (!parsed.body.trim()) return fail(res, 400, '正文为空，无法加密。');
      const originalSecrets = await exists(secretsPath) ? await fs.readFile(secretsPath, 'utf8') : null;
      const secrets = originalSecrets ? JSON.parse(originalSecrets) : {};
      if (Object.hasOwn(secrets, id)) return fail(res, 409, '该文章 ID 已有密码记录。');
      const payload = encryptProtectedBody(id, parsed.body, password);
      const marked = patchFrontMatter(raw, { protected: true, commentId: id });
      const stub = marked.replace(/^(---\n[\s\S]*?\n---\n)[\s\S]*$/, '$1这是一篇受保护文章。\n');
      payload.publicStubHash = createHash('sha256').update(stub).digest('hex');
      await fs.mkdir(path.dirname(privatePath), { recursive: true });
      await fs.mkdir(path.dirname(secretsPath), { recursive: true });
      let wroteSecrets = false, createdPrivate = false, createdPayload = false;
      try {
        await atomicCreate(privatePath, raw);
        createdPrivate = true;
        await atomicCreate(payloadPath, `${JSON.stringify(payload)}\n`);
        createdPayload = true;
        await atomicWrite(secretsPath, `${JSON.stringify({ ...secrets, [id]: password }, null, 2)}\n`, { schedule: false });
        wroteSecrets = true;
        await atomicWrite(target, stub);
      } catch (error) {
        if (wroteSecrets) {
          if (originalSecrets == null) await fs.rm(secretsPath, { force: true }).catch(() => {});
          else await atomicWrite(secretsPath, originalSecrets, { schedule: false }).catch(() => {});
        }
        if (createdPrivate) await fs.rm(privatePath, { force: true }).catch(() => {});
        if (createdPayload) await fs.rm(payloadPath, { force: true }).catch(() => {});
        throw error;
      }
      return send(res, 200, { ok: true, note: '正文已转入本机私有目录；若旧版本曾公开，Git 历史中的明文仍需另外处理。' });
    }
    if (request.action === 'decrypt') {
      if (parsed.frontMatter.params?.protected !== true || !(await exists(payloadPath))) return fail(res, 409, '文章没有可用的加密内容。');
      const payload = JSON.parse(await fs.readFile(payloadPath, 'utf8'));
      if (payload.pageId !== id) return fail(res, 400, '加密文章 ID 不匹配。');
      const body = decryptProtectedBody(payload, password);
      const unmarked = patchFrontMatter(raw, { protected: false });
      const originalSource = await exists(privatePath) ? await fs.readFile(privatePath, 'utf8') : null;
      const unchangedStub = payload.publicStubHash === createHash('sha256').update(raw).digest('hex');
      const restored = originalSource && unchangedStub
        ? originalSource
        : unmarked.replace(/^(---\n[\s\S]*?\n---\n)[\s\S]*$/, (_, header) => header + body);
      await atomicWrite(target, restored);
      const archived = path.join(trashRoot, 'protected', `${randomUUID()}-${id}`);
      await fs.mkdir(archived, { recursive: true });
      if (await exists(privatePath)) await fs.rename(privatePath, path.join(archived, `${id}.md`));
      await fs.rename(payloadPath, path.join(archived, `${encodeURIComponent(id)}.json`));
      if (await exists(secretsPath)) {
        const secrets = JSON.parse(await fs.readFile(secretsPath, 'utf8'));
        delete secrets[id];
        await atomicWrite(secretsPath, `${JSON.stringify(secrets, null, 2)}\n`, { schedule: false });
      }
      return send(res, 200, { ok: true, note: '正文已恢复为公开内容，加密文件已移入回收区。' });
    }
    return fail(res, 400, '未知加密操作。');
  }
  if (req.method === 'POST' && pathname === '/api/posts') {
    const request = JSON.parse((await readBody(req)).toString('utf8'));
    const slug = safeSlug(request.slug || request.title);
    if (!slug) return fail(res, 400, 'Slug 只能包含正常文件名字符，且不能包含路径。');
    const directory = inside(path.join(contentRoot, 'posts'), slug);
    const target = directory && path.join(directory, 'index.md');
    if (!target || await exists(directory)) return fail(res, 409, '该文章路径已存在。');
    const archetype = await fs.readFile(path.join(repoRoot, 'archetypes', 'default.md'), 'utf8');
    const now = new Date().toISOString();
    const title = String(request.title || slug).trim().replaceAll('"', '\\"');
    const raw = archetype.replace(/\{\{ replace \.Name "-" " " \| title \}\}/g, title).replace(/\{\{ \.Date \}\}/g, now).replace(/\{\{ \.Name \}\}/g, slug);
    await fs.mkdir(directory, { recursive: true });
    await atomicWrite(target, raw);
    return send(res, 201, { ok: true, path: relativeToRepo(target) });
  }
  if (req.method === 'POST' && pathname === '/api/pages') {
    const request = JSON.parse((await readBody(req)).toString('utf8'));
    const slug = safeSlug(request.slug);
    const title = typeof request.title === 'string' ? request.title.trim() : '';
    if (!slug || !title || title.length > 120 || ['posts', 'tags', 'categories'].includes(slug.toLowerCase())) return fail(res, 400, '页面标题或路径无效。');
    const directory = inside(contentRoot, slug);
    if (!directory || await exists(directory)) return fail(res, 409, '该页面路径已存在。');
    await fs.mkdir(directory, { recursive: true });
    const target = path.join(directory, 'index.md');
    await atomicWrite(target, `---\n${YAML.stringify({ title, draft: true }).trimEnd()}\n---\n\n`);
    return send(res, 201, { ok: true, path: relativeToRepo(target) });
  }
  if (req.method === 'DELETE' && pathname === '/api/post') {
    const target = repoPath(url.searchParams.get('path'));
    if (!target || !(await exists(target))) return fail(res, 404, '文章不存在。');
    const source = path.basename(target).toLowerCase() === 'index.md' ? path.dirname(target) : target;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destination = path.join(trashRoot, `${stamp}-${path.basename(source)}`);
    await fs.mkdir(trashRoot, { recursive: true });
    // 同一卷内 rename 是原子移动，秒级完成；页面清理由 cleanupHugoOutput +
    // scheduleBuild 显式完成，不再依赖 watcher 感知目录删除（旧 cp+rm 全量复制太慢）。
    try {
      await fs.rename(source, destination);
    } catch {
      await fs.cp(source, destination, { recursive: true });
      await fs.rm(source, { recursive: true, force: true });
    }
    await cleanupHugoOutput(relativeToRepo(source));
    await remapDrawerPostPath(relativeToRepo(target));
    scheduleBuild();
    return send(res, 200, { ok: true, trashedTo: relativeToRepo(destination) });
  }
  if (req.method === 'POST' && pathname === '/api/post/rename') {
    const request = JSON.parse((await readBody(req)).toString('utf8'));
    const target = repoPath(request.path); const slug = safeSlug(request.slug);
    if (!target || !slug || path.basename(target).toLowerCase() !== 'index.md') return fail(res, 400, '仅支持重命名 Page Bundle，且 Slug 必须安全。');
    const sourceDirectory = path.dirname(target); const destination = path.join(path.dirname(sourceDirectory), slug);
    if (await exists(destination)) return fail(res, 409, '目标目录已存在。');
    await cleanupHugoOutput(relativeToRepo(sourceDirectory));
    await fs.rename(sourceDirectory, destination);
    await remapDrawerPostPath(relativeToRepo(target), relativeToRepo(path.join(destination, 'index.md')));
    scheduleBuild();
    return send(res, 200, { ok: true, path: relativeToRepo(path.join(destination, 'index.md')) });
  }
  if (req.method === 'POST' && pathname === '/api/post/upload') {
    const target = repoPath(url.searchParams.get('path'));
    const name = path.basename(url.searchParams.get('name') || '');
    if (!target || path.basename(target).toLowerCase() !== 'index.md' || !name || !uploadImageExtensions.has(path.extname(name).toLowerCase())) return fail(res, 400, '仅允许上传 PNG、JPG、WebP、GIF 或 AVIF 图片资源。');
    const bytes = await readBody(req, 12 * 1024 * 1024); const destination = path.join(path.dirname(target), name);
    if (!hasExpectedImageSignature(bytes, path.extname(name))) return fail(res, 400, '图片内容与扩展名不匹配或文件已损坏。');
    try { await atomicCreate(destination, bytes); }
    catch (error) { if (error.statusCode === 409) return fail(res, 409, error.message); throw error; }
    scheduleBuild();
    return send(res, 201, { ok: true, markdown: `![${path.parse(name).name}](${name})`, path: relativeToRepo(destination) });
  }
  if (req.method === 'POST' && pathname === '/api/asset/upload') {
    const name = path.basename(url.searchParams.get('name') || '');
    const area = String(url.searchParams.get('area') || 'static/assets/img');
    if (!name || !uploadImageExtensions.has(path.extname(name).toLowerCase())) return fail(res, 400, '仅允许上传 PNG、JPG、WebP、GIF 或 AVIF 图片资源。');
    const dirInRepo = canonicalAssetDirectory(area);
    if (!dirInRepo) return fail(res, 400, '站点资源统一写入 static/assets，请选择该目录下的安全子目录。');
    await fs.mkdir(dirInRepo, { recursive: true });
    const bytes = await readBody(req, 24 * 1024 * 1024);
    if (!hasExpectedImageSignature(bytes, path.extname(name))) return fail(res, 400, '图片内容与扩展名不匹配或文件已损坏。');
    const sourcePath = path.join(dirInRepo, name);
    await atomicCreate(sourcePath, bytes);
    const preview = await syncStaticPreview(sourcePath);
    return send(res, 201, { ok: true, path: publicPathForRepoFile(sourcePath), file: relativeToRepo(sourcePath), ...preview });
  }
  if (req.method === 'POST' && pathname === '/api/media/import') {
    try {
      const request = JSON.parse((await readBody(req, 64 * 1024)).toString('utf8'));
      return send(res, 201, await importWallpaperMedia(String(request.sourcePath || ''), request.target));
    } catch (error) {
      return fail(res, Number.isInteger(error.statusCode) ? error.statusCode : 400, error.message || '媒体导入失败。');
    }
  }
  if (req.method === 'POST' && pathname === '/api/media/upload') {
    const name = path.basename(url.searchParams.get('name') || '');
    const targetName = String(url.searchParams.get('target') || '');
    const extension = path.extname(name).toLowerCase();
    if (!mediaTargetNames.has(targetName) || !uploadVideoExtensions.has(extension)) return fail(res, 400, '视频壁纸支持 MP4、WebM、MOV、M4V、MKV 或 AVI。');
    const temporaryRoot = path.join(repoRoot, '.admin-tmp');
    const temporary = path.join(temporaryRoot, `${randomUUID()}${extension}`);
    try {
      await fs.mkdir(temporaryRoot, { recursive: true });
      await fs.writeFile(temporary, await readBody(req, maxMediaBodyBytes), { flag: 'wx' });
      return send(res, 201, await importWallpaperMedia(temporary, targetName));
    } catch (error) {
      return fail(res, Number.isInteger(error.statusCode) ? error.statusCode : 400, error.message || '视频上传失败。');
    } finally {
      await fs.rm(temporary, { force: true }).catch(() => {});
    }
  }
  if (req.method === 'GET' && pathname === '/api/files') {
    const roots = [contentRoot, staticRoot, path.join(repoRoot, 'assets'), path.join(repoRoot, 'data')];
    const availableRoots = [];
    for (const root of roots) if (await exists(root)) availableRoots.push(root);
    const files = (await Promise.all(availableRoots.map(async (root) => walk(root, () => true)))).flat();
    const entries = await Promise.all(files.map(async (file) => {
      const stat = await fs.stat(file);
      const relative = relativeToRepo(file);
      return {
        path: relative,
        publicPath: publicPathForRepoFile(file),
        scope: relative.startsWith('static/') ? 'public' : relative.startsWith('assets/') ? 'pipeline' : relative.startsWith('content/') ? 'content' : 'data',
        kind: mediaKind(file),
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        extension: path.extname(file).slice(1).toLowerCase(),
      };
    }));
    return send(res, 200, { files: entries.sort((a, b) => a.path.localeCompare(b.path)) });
  }
  if (['PUT', 'PATCH', 'DELETE'].includes(req.method) && pathname === '/api/file') {
    const target = managedResourcePath(url.searchParams.get('path'));
    if (!target || !(await exists(target)) || !(await fs.stat(target)).isFile()) return fail(res, 404, '可管理的图片或视频不存在。');
    if (req.method === 'PATCH') {
      const request = JSON.parse((await readBody(req, 4096)).toString('utf8'));
      const name = String(request.name || '').trim();
      if (!name || path.basename(name) !== name || !/^[\p{L}\p{N}._-]+$/u.test(name) || path.extname(name).toLowerCase() !== path.extname(target).toLowerCase()) return fail(res, 400, '新文件名无效；请保持原扩展名。');
      const destination = path.join(path.dirname(target), name);
      if (await exists(destination)) return fail(res, 409, '新文件名已存在。');
      await fs.rename(target, destination);
      scheduleBuild();
      return send(res, 200, { ok: true, path: relativeToRepo(destination) });
    }
    const backup = path.join(trashRoot, 'resources', `${randomUUID()}-${path.basename(target)}`);
    await fs.mkdir(path.dirname(backup), { recursive: true });
    if (req.method === 'DELETE') {
      await fs.rename(target, backup);
      scheduleBuild();
      return send(res, 200, { ok: true, trashedTo: relativeToRepo(backup) });
    }
    const bytes = await readBody(req, mediaKind(target) === 'video' ? maxMediaBodyBytes : 24 * 1024 * 1024);
    if (mediaKind(target) === 'image' && !hasExpectedImageSignature(bytes, path.extname(target))) return fail(res, 400, '新图片内容与原扩展名不匹配。');
    if (mediaKind(target) === 'video') {
      if (path.extname(target).toLowerCase() !== '.mp4') return fail(res, 400, '视频替换目前只支持 MP4；其他格式可先上传新文件。');
      const probeFile = path.join(trashRoot, 'resources', `${randomUUID()}.mp4`);
      await fs.writeFile(probeFile, bytes, { flag: 'wx' });
      try { await inspectMedia(probeFile); } finally { await fs.rm(probeFile, { force: true }); }
    }
    await fs.rename(target, backup);
    try { await atomicWrite(target, bytes); }
    catch (error) { await fs.rename(backup, target).catch(() => {}); throw error; }
    return send(res, 200, { ok: true, backup: relativeToRepo(backup) });
  }
  if (req.method === 'GET' && pathname === '/api/settings') {
    const raw = await fs.readFile(path.join(repoRoot, 'hugo.toml'), 'utf8');
    const schema = JSON.parse(await fs.readFile(path.join(themeRoot, 'theme-config.schema.json'), 'utf8'));
    return send(res, 200, { raw, ...parseToml(raw), schema });
  }
  if (req.method === 'PATCH' && pathname === '/api/settings') {
    const request = JSON.parse((await readBody(req)).toString('utf8')); let raw = await fs.readFile(path.join(repoRoot, 'hugo.toml'), 'utf8');
    for (const [fieldPath, value] of Object.entries(request.values || {})) raw = patchTomlValue(raw, fieldPath, value);
    if (Array.isArray(request.menus)) raw = patchMenus(raw, request.menus);
    await atomicWrite(path.join(repoRoot, 'hugo.toml'), raw);
    // The about page renders the avatar from data/site.yaml (hugo.Data.site),
    // so keep it in sync whenever params.avatar changes.
    const avatar = request.values && request.values['params.avatar'];
    const author = request.values && request.values['params.author'];
    if ((typeof avatar === 'string' && avatar) || (typeof author === 'string' && author)) {
      const siteRaw = await fs.readFile(siteDataFile, 'utf8');
      const document = YAML.parseDocument(siteRaw, { prettyErrors: true, uniqueKeys: true });
      if (document.errors.length) throw httpError(400, `站点数据 YAML 无效：${document.errors[0].message}`);
      if (typeof avatar === 'string' && avatar) document.set('avatar', avatar);
      if (typeof author === 'string' && author) document.set('author', author);
      await atomicWrite(siteDataFile, String(document));
    }
    scheduleBuild();
    return send(res, 200, { ok: true, ...parseToml(raw) });
  }
  if (req.method === 'PUT' && pathname === '/api/settings') {
    const request = JSON.parse((await readBody(req)).toString('utf8'));
    if (typeof request.raw !== 'string' || request.raw.length > maxBodyBytes) return fail(res, 400, '配置内容无效。');
    await atomicWrite(path.join(repoRoot, 'hugo.toml'), request.raw);
    scheduleBuild();
    return send(res, 200, { ok: true });
  }
  if (req.method === 'GET' && pathname === '/api/modules') {
    const { modules, usage } = await moduleUsage();
    return send(res, 200, { protocol: 'lily-module/v1', modules: Object.values(modules).sort((a, b) => a.name.localeCompare(b.name)), usage });
  }
  if (req.method === 'POST' && pathname === '/api/modules/install') {
    try { return send(res, 201, { ok: true, ...(await installSiteModule(JSON.parse((await readBody(req)).toString('utf8')))) }); }
    catch (error) { return fail(res, 400, error.message || '模块安装失败。'); }
  }
  if (req.method === 'POST' && pathname === '/api/music/netease/import') {
    try { return send(res, 201, { ok: true, ...(await importNeteasePlaylist(JSON.parse((await readBody(req, 32 * 1024)).toString('utf8')))) }); }
    catch (error) { return fail(res, 400, error.message || '网易云歌单导入失败。'); }
  }
  if (req.method === 'GET' && pathname === '/api/music/netease/status') {
    try { return send(res, 200, await neteaseSnapshotStatus(url.searchParams.get('id'))); }
    catch (error) { return fail(res, 400, error.message || '读取网易云歌单状态失败。'); }
  }
  if (req.method === 'GET' && pathname === '/api/music/netease/list') {
    try { return send(res, 200, await listNeteaseSnapshots()); }
    catch (error) { return fail(res, 500, error.message || '读取网易云歌单列表失败。'); }
  }
  if (req.method === 'GET' && pathname === '/api/music/netease/tracks') {
    try { return send(res, 200, await neteaseSnapshotTracks(url.searchParams.get('id'))); }
    catch (error) { return fail(res, 400, error.message || '读取歌单歌曲失败。'); }
  }
  if (req.method === 'POST' && pathname === '/api/music/netease/check') {
    try { return send(res, 200, await checkNeteaseTrackAvailability(JSON.parse((await readBody(req, 8 * 1024)).toString('utf8')))); }
    catch (error) { return fail(res, 400, error.message || '检测歌曲音源失败。'); }
  }
  if (req.method === 'POST' && pathname === '/api/music/netease/exclusions') {
    try { return send(res, 200, { ok: true, ...(await saveNeteaseExclusions(JSON.parse((await readBody(req, 32 * 1024)).toString('utf8')))) }); }
    catch (error) { return fail(res, 400, error.message || '保存歌单剔除设置失败。'); }
  }
  if (req.method === 'POST' && pathname === '/api/music/netease/activate') {
    try { return send(res, 200, { ok: true, ...(await activateNeteasePlaylist(JSON.parse((await readBody(req, 8 * 1024)).toString('utf8')).playlistId)) }); }
    catch (error) { return fail(res, 400, error.message || '启用网易云歌单失败。'); }
  }
  if (req.method === 'DELETE' && pathname === '/api/modules') {
    try { return send(res, 200, { ok: true, ...(await uninstallSiteModule(String(url.searchParams.get('id') || ''))) }); }
    catch (error) { return fail(res, 400, error.message || '模块卸载失败。'); }
  }
  if (req.method === 'GET' && pathname === '/api/layouts') {
    try { return send(res, 200, await loadLayoutEditor()); }
    catch (error) { return fail(res, 500, error.message || '读取布局失败。'); }
  }
  if (req.method === 'PUT' && pathname === '/api/layouts') {
    const request = JSON.parse((await readBody(req)).toString('utf8'));
    const name = String(request.name || '');
    if (!/^[\w-]+$/.test(name)) return fail(res, 400, '布局名称不合法。');
    const candidate = typeof request.raw === 'string' ? request.raw : (request.parsed ? YAML.stringify(request.parsed) : '');
    if (!candidate || candidate.length > maxBodyBytes) return fail(res, 400, '布局内容无效。');
    try {
      const layout = parseLayout(candidate, `布局 ${name}`);
      const modules = await loadModuleRegistry();
      validateLayoutAgainstRegistry(layout, modules);
      const target = inside(userLayoutsRoot, `${name}.yaml`);
      if (!target) return fail(res, 400, '布局路径不安全。');
      const backup = await snapshotLayout(name, target);
      await atomicWrite(target, serializeLayout(layout));
      return send(res, 200, { ok: true, path: relativeToRepo(target), source: 'site', backup });
    } catch (error) { return fail(res, 400, error.message || '布局内容无效。'); }
  }
  if (req.method === 'GET' && pathname === '/api/layouts/history') {
    try { return send(res, 200, { history: await layoutHistory(String(url.searchParams.get('name') || '')) }); }
    catch (error) { return fail(res, 400, error.message || '读取布局历史失败。'); }
  }
  if (req.method === 'POST' && pathname === '/api/layouts/restore') {
    try {
      const request = JSON.parse((await readBody(req)).toString('utf8'));
      const name = String(request.name || ''); const revision = String(request.revision || '');
      if (!/^[\w-]+$/.test(name) || !/^\d{4}-\d{2}-\d{2}T[\d-]+Z\.yaml$/.test(revision)) throw new Error('布局历史版本无效。');
      const source = inside(layoutRevisionRoot(name), revision);
      const target = inside(userLayoutsRoot, `${name}.yaml`);
      if (!source || !target || !(await exists(source))) throw new Error('布局历史版本不存在。');
      const layout = parseLayout(await fs.readFile(source, 'utf8'), `布局历史 ${name}`);
      validateLayoutAgainstRegistry(layout, await loadModuleRegistry());
      const backup = await snapshotLayout(name, target);
      await atomicWrite(target, serializeLayout(layout));
      return send(res, 200, { ok: true, path: relativeToRepo(target), backup });
    } catch (error) { return fail(res, 400, error.message || '恢复布局失败。'); }
  }
  if (req.method === 'POST' && pathname === '/api/layouts/reset') {
    try {
      const request = JSON.parse((await readBody(req)).toString('utf8'));
      const name = String(request.name || '');
      if (!/^[\w-]+$/.test(name)) throw new Error('布局名称不合法。');
      const target = inside(userLayoutsRoot, `${name}.yaml`);
      const builtIn = inside(builtInLayoutsRoot, `${name}.yaml`);
      if (!target || !builtIn || !(await exists(target)) || !(await exists(builtIn))) throw new Error('该布局没有可恢复的主题默认版本。');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const destination = path.join(layoutRevisionRoot(name), `override-${stamp}.yaml`);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.rename(target, destination);
      scheduleBuild();
      return send(res, 200, { ok: true, restoredSource: 'built-in', trashedTo: relativeToRepo(destination) });
    } catch (error) { return fail(res, 400, error.message || '恢复主题默认失败。'); }
  }
  if (req.method === 'GET' && pathname === '/api/git/diff') {
    const target = url.searchParams.get('path');
    const args = target && !path.isAbsolute(target) && !target.includes('..') ? ['diff', '--', target] : ['diff', '--stat'];
    const result = await git(args); return send(res, 200, { diff: result.stdout || result.stderr, code: result.code });
  }
  if (req.method === 'POST' && pathname === '/api/build') {
    if (buildTimer) { clearTimeout(buildTimer); buildTimer = null; }
    const result = await runBuild(true, 'manual');
    return send(res, result.code === 0 ? 200 : 500, {
      ok: result.code === 0,
      error: result.code === 0 ? undefined : 'Hugo 构建失败。',
      ...result,
    });
  }
  if (req.method === 'GET' && pathname === '/api/publish/status') {
    const remote = await git(['remote', 'get-url', 'github']);
    const targetRemote = await publishRemote();
    const remoteOk = Boolean(targetRemote) && remote.code === 0 && remote.stdout.trim().toLowerCase().replace(/\.git$/, '') === targetRemote.toLowerCase().replace(/\.git$/, '');
    let commitsAhead = '0';
    try { const ahead = await git(['rev-list', '--count', 'HEAD', '--not', '--remotes=github']); commitsAhead = ahead.stdout.trim() || '0'; } catch {}
    return send(res, 200, {
      allowedRemote: targetRemote.replace(/\.git$/, ''),
      allowedBranch: await publishBranch(),
      remote: remote.code === 0 ? remote.stdout.trim() : '',
      remoteOk,
      tokenPresent: Boolean(await findTokenFile()),
      systemProxyDetected: Boolean(await systemGitProxy()),
      workflowPresent: await exists(path.join(repoRoot, '.github', 'workflows', 'hugo.yaml')),
      branch: (await git(['branch', '--show-current'])).stdout.trim(),
      changes: await gitChanges(),
      commitsAhead,
      publishJob: publishSnapshot(),
    });
  }
  if (req.method === 'PUT' && pathname === '/api/publish/target') {
    const request = JSON.parse((await readBody(req, 4096)).toString('utf8'));
    const targetRemote = String(request.remote || '').trim();
    const targetBranch = String(request.branch || 'main').trim();
    if (!validBlogRemote(targetRemote)) return fail(res, 400, '请输入完整的 GitHub HTTPS 仓库地址。');
    if (!validPublishBranch(targetBranch)) return fail(res, 400, '发布分支名无效。');
    if (publishState?.status === 'running') return fail(res, 409, '发布进行中，暂不能切换目标。');
    const current = await git(['remote', 'get-url', 'github']);
    const previous = current.code === 0 ? current.stdout.trim() : '';
    const expected = await publishRemote();
    if (previous && previous.toLowerCase().replace(/\.git$/, '') !== expected.toLowerCase().replace(/\.git$/, '')) return fail(res, 409, 'Git 远程已被其他程序修改，请先核对当前地址。');
    const update = await git(previous ? ['remote', 'set-url', 'github', targetRemote] : ['remote', 'add', 'github', targetRemote]);
    if (update.code !== 0) return fail(res, 500, update.stderr || '无法更新 Git 远程。');
    try { await atomicWrite(localConfigFile, `${JSON.stringify({ ...(await readPublishConfig()), publishRemote: targetRemote, publishBranch: targetBranch }, null, 2)}\n`, { schedule: false }); }
    catch (error) {
      await git(previous ? ['remote', 'set-url', 'github', previous] : ['remote', 'remove', 'github']);
      throw error;
    }
    return send(res, 200, { ok: true, remote: targetRemote, branch: targetBranch });
  }
  if (req.method === 'PUT' && pathname === '/api/publish/token') {
    if (publishState?.status === 'running') return fail(res, 409, '发布进行中，暂不能修改认证令牌。');
    const request = JSON.parse((await readBody(req, 4096)).toString('utf8'));
    const token = String(request.token || '').trim();
    if (token.length < 20 || token.length > 2048 || !/^[A-Za-z0-9_]+$/.test(token)) return fail(res, 400, '令牌格式无效：应为只含字母、数字或下划线的 20–2048 个字符。');
    const tokenFile = path.join(repoRoot, '.token');
    await atomicWrite(tokenFile, `${token}\n`, { schedule: false });
    await fs.chmod(tokenFile, 0o600).catch(() => {});
    return send(res, 200, { ok: true, tokenPresent: true });
  }
  if (req.method === 'GET' && pathname === '/api/publish/progress') {
    const id = url.searchParams.get('id');
    if (!publishState || (id && id !== publishState.id)) return fail(res, 404, '没有找到这次发布任务。');
    return send(res, 200, publishSnapshot());
  }
  if (req.method === 'POST' && pathname === '/api/publish') {
    let request = {}; try { request = JSON.parse((await readBody(req)).toString('utf8')); } catch {}
    const force = request.force === true;
    const commitMessage = String(request.commit || '').trim();
    if (publishState?.status === 'running') return fail(res, 409, '已有发布任务正在执行，请等待当前进度完成。');
    publishState = {
      id: randomUUID(), status: 'running', progress: 2, stage: '正在准备发布',
      message: '', error: '', force, startedAt: new Date().toISOString(), finishedAt: null,
    };
    const report = (progress, stage) => {
      if (publishState?.status !== 'running') return;
      publishState.progress = Math.max(publishState.progress, Math.min(100, Number(progress) || 0));
      publishState.stage = String(stage || publishState.stage).slice(0, 160);
    };
    void publishToBlog(commitMessage, force, report).then((result) => {
      publishState.status = 'complete';
      publishState.progress = 100;
      publishState.stage = '发布完成';
      publishState.message = result.message;
      publishState.finishedAt = new Date().toISOString();
    }).catch((error) => {
      publishState.status = 'failed';
      publishState.stage = '发布失败';
      publishState.error = String(error?.message || '发布失败。').slice(0, 1000);
      publishState.finishedAt = new Date().toISOString();
    });
    return send(res, 202, { ok: true, ...publishSnapshot() });
  }
  return fail(res, 404, '未知 API。');
}

const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf',
};

async function streamFile(req, res, target, headers = {}) {
  const stat = await fs.stat(target);
  const common = {
    'content-type': mime[path.extname(target)] || 'application/octet-stream',
    'content-length': stat.size,
    'accept-ranges': 'bytes',
    ...headers,
  };
  const match = String(req.headers.range || '').match(/^bytes=(\d*)-(\d*)$/);
  if (match) {
    let start = match[1] ? Number(match[1]) : NaN;
    let end = match[2] ? Number(match[2]) : NaN;
    if (!Number.isFinite(start) && Number.isFinite(end)) {
      start = Math.max(0, stat.size - end);
      end = stat.size - 1;
    } else {
      if (!Number.isFinite(start)) start = 0;
      if (!Number.isFinite(end)) end = stat.size - 1;
    }
    if (start < 0 || end < start || start >= stat.size) {
      res.writeHead(416, { ...common, 'content-range': `bytes */${stat.size}`, 'content-length': 0 });
      res.end();
      return;
    }
    end = Math.min(end, stat.size - 1);
    res.writeHead(206, { ...common, 'content-range': `bytes ${start}-${end}/${stat.size}`, 'content-length': end - start + 1 });
    if (req.method === 'HEAD') return res.end();
    fsSync.createReadStream(target, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, common);
  if (req.method === 'HEAD') return res.end();
  fsSync.createReadStream(target).pipe(res);
}
// 打包后 public 位于 exe 快照；源码模式从 tools/admin/public 读取。最后一个候选
// 兼容旧版便携包，便于仍与源码项目放在一起的用户完成升级。
const publicCandidates = [publicRoot, path.join(repoRoot, 'tools', 'admin', 'public')].filter(Boolean);
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    const requested = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    let target = null;
    // Admin image previews: public site paths (/assets/..., /content/...,
    // /<theme-name>/...) resolve against repo static/, theme static/ and the
    // repo root so <img> tags render on the admin origin without a build.
    if (new RegExp(`^(assets|content|${themeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})/`).test(requested)) {
      const previewRoots = [path.join(repoRoot, 'static'), path.join(themeRoot, 'static'), repoRoot];
      for (const root of previewRoots) {
        const candidate = inside(root, decodeURIComponent(requested));
        if (candidate && await exists(candidate) && !(await fs.stat(candidate)).isDirectory()) { target = candidate; break; }
      }
    }
    if (!target) for (const root of publicCandidates) {
      const candidate = inside(root, decodeURIComponent(requested));
      if (candidate && await exists(candidate)) { target = candidate; break; }
    }
    if (!target) return fail(res, 404, '文件不存在。');
    await streamFile(req, res, target, { 'cache-control': 'no-store', ...staticSecurityHeaders(target) });
  } catch (error) {
    const status = Number.isInteger(error.statusCode) ? error.statusCode : 500;
    fail(res, status, error.message || '服务器错误。');
  }
});

const port = Number(process.env.ADMIN_PORT || configPort || 5174);
let browserOpened = false;
function openLocalPage(targetPort = port) {
  if (!openBrowserOnStart || browserOpened) return;
  browserOpened = true;
  const address = `http://localhost:${targetPort}/`;
  const command = process.platform === 'win32' ? 'cmd.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', address] : [address];
  try {
    const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
    child.unref();
  } catch (error) { console.error(`无法自动打开浏览器：${error.message}`); }
}
// 博客预览：admin server 直接托管 public/，不再需要外部 hugo server。
// 不终止外部 Hugo 进程，也不删除共享构建锁，避免干扰其他终端或项目。
scheduleBuild(600);

// 监听 content/data 的外部改动（如 Typora 保存），防抖后自动重建，
// 与原版 watch.js 的“边写边看”体验一致。static/ 不监听：站点图片上传走
// static→public 直拷即时可见，若再触发构建会拖慢上传体验。
function watchForChanges() {
  const roots = [contentRoot, path.join(repoRoot, 'data')];
  for (const root of roots) {
    if (!fsSync.existsSync(root)) continue;
    try {
      fsSync.watch(root, { recursive: true }, (event, filename) => {
        if (!filename) return;
        const name = String(filename).replaceAll('\\', '/');
        if (name.startsWith('.admin-trash/') || name.includes('/.git/') || name.endsWith('.tmp')) return;
        scheduleBuild(600);
      });
    } catch {}
  }
}
watchForChanges();

const blogServer = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    let requested = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    let target = inside(hugoPublicRoot, decodeURIComponent(requested));
    if (target && (await exists(target)) && (await fs.stat(target)).isDirectory()) target = path.join(target, 'index.html');
    if (!target || !(await exists(target))) {
      // 本地预览也应与生产静态站一致：未知路径显示主题的 404，而不是裸文本。
      const notFound = path.join(hugoPublicRoot, '404.html');
      if (await exists(notFound)) {
        res.writeHead(404, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
        res.end(await fs.readFile(notFound));
      } else {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('Not Found');
      }
      return;
    }
    await streamFile(req, res, target, { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  } catch (error) { console.error('博客预览错误：', error.message); res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }); res.end('Server Error'); }
});
blogServer.on('listening', () => {
  previewState.status = 'running';
  previewState.error = '';
  previewState.startedAt = new Date().toISOString();
  previewState.stoppedAt = null;
  console.log(`Blog preview: http://localhost:${blogPort}/`);
  for (const address of lanPreviewAddresses()) console.log(`Phone preview: http://${address}:${blogPort}/`);
});
blogServer.on('close', () => {
  previewState.status = 'stopped';
  previewState.stoppedAt = new Date().toISOString();
});
blogServer.on('error', (error) => {
  previewState.status = 'error';
  previewState.error = error.message || '博客预览服务启动失败。';
  previewState.stoppedAt = new Date().toISOString();
  console.error(`博客预览端口 ${blogPort} 被占用：${error.message}（可设置 BLOG_PORT 换端口）`);
});
blogServer.listen(blogPort, blogHost);

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`管理端口 ${port} 已被占用：请先关闭旧的 lilymap 窗口（或任务管理器结束残留 node.exe），也可设置 ADMIN_PORT 换端口。`);
    console.error(`若只是想打开管理页：http://localhost:${port}/ 可能已在运行。`);
    openLocalPage(port);
    blogServer.close(() => process.exit(0));
    return;
  } else {
    console.error(`管理服务启动失败：${error.message}`);
  }
  process.exit(1);
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Lily Admin local mode: http://localhost:${port}/`);
  openLocalPage(port);
});
