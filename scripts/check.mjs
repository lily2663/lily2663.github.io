import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const content = path.join(root, 'content', 'posts');
const privateContent = path.join(root, 'private-content');
const protectedDir = path.join(root, 'static', 'protected');
const secretPath = path.join(root, '.secrets', 'protected-posts.json');
const gitignorePath = path.join(root, '.gitignore');
const tracked = fs.readFileSync(gitignorePath, 'utf8');
const errors = [];

function frontMatter(source) {
  return source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)?.[1] || '';
}
function stripFrontMatter(source) {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}
function hasFrontMatter(source) {
  return /^---\r?\n/.test(source);
}
function isProtected(source) {
  return /^\s+protected\s*:\s*true\s*$/mi.test(frontMatter(source));
}
function commentId(source, fallback) {
  const raw = frontMatter(source).match(/^\s+commentId\s*:\s*(.+?)\s*$/mi)?.[1]?.trim();
  if (!raw) return fallback;
  return raw.replace(/^["']|["']$/g, '');
}
function decodeBase64(value, label, expectedLength = null) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new Error(`${label} is not valid base64`);
  }
  const bytes = Buffer.from(value, 'base64');
  if (expectedLength != null && bytes.length !== expectedLength) throw new Error(`${label} has invalid length`);
  return bytes;
}
function validatePayload(payload, expectedId, filename) {
  if (payload.version !== 2) throw new Error('unsupported payload version');
  if (payload.pageId !== expectedId) throw new Error('pageId mismatch');
  if (`${encodeURIComponent(payload.pageId)}.json` !== filename) throw new Error('payload filename mismatch');
  if (payload.kdf?.name !== 'PBKDF2' || payload.kdf?.hash !== 'SHA-256' || payload.kdf?.iterations !== 600000) throw new Error('invalid KDF schema');
  decodeBase64(payload.kdf?.salt, 'salt', 16);
  if (payload.cipher?.name !== 'AES-256-GCM') throw new Error('invalid cipher schema');
  decodeBase64(payload.cipher?.iv, 'iv', 12);
  const data = decodeBase64(payload.cipher?.data, 'ciphertext');
  if (!data.length) throw new Error('ciphertext is empty');
  decodeBase64(payload.cipher?.tag, 'tag', 16);
}
function decrypt(payload, password, tamper = false) {
  const key = crypto.pbkdf2Sync(password, Buffer.from(payload.kdf.salt, 'base64'), payload.kdf.iterations, 32, 'sha256');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(payload.cipher.iv, 'base64'));
  const tag = Buffer.from(payload.cipher.tag, 'base64');
  if (tamper) tag[0] ^= 1;
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(Buffer.from(payload.cipher.data, 'base64')), decipher.final()]).toString('utf8');
}

const ignoreRules = new Set(tracked.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#')));
for (const rule of ['private-content/', '.secrets/', '.token', '.lilymap-local.json', '.admin-trash/', '.backups/', 'lilymap.json', 'hugo-desk.json']) {
  if (!ignoreRules.has(rule)) errors.push(`Missing local-only ignore rule: ${rule}`);
}

for (const relative of [
  'static/assets/vendor/marked.min.js',
  'static/assets/vendor/highlight.min.js',
  'static/assets/vendor/highlight.github.min.css',
  'static/assets/vendor/highlight.github-dark.min.css',
  'static/sw.js',
]) {
  if (fs.existsSync(path.join(root, relative))) errors.push(`Theme-owned runtime asset must not be shadowed by the site: ${relative}`);
}

const slugs = new Set();
const publicById = new Map();
for (const dir of fs.readdirSync(content, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
  const file = path.join(content, dir.name, 'index.md');
  if (!fs.existsSync(file)) { errors.push(`Missing ${file}`); continue; }
  const source = fs.readFileSync(file, 'utf8');
  if (!hasFrontMatter(source)) errors.push(`Invalid front matter: ${dir.name}`);
  if (slugs.has(dir.name)) errors.push(`Duplicate slug: ${dir.name}`);
  slugs.add(dir.name);
  if (/^password\s*:/mi.test(frontMatter(source))) errors.push(`Password leaked in public front matter: ${dir.name}`);

  const id = commentId(source, dir.name);
  if (publicById.has(id)) errors.push(`Duplicate protected page id: ${id}`);
  publicById.set(id, { dir: dir.name, file, source });

  if (isProtected(source)) {
    const payloadPath = path.join(protectedDir, `${encodeURIComponent(id)}.json`);
    if (!fs.existsSync(payloadPath)) errors.push(`Protected post has no encrypted payload: ${dir.name} (${id})`);
  }

  for (const match of source.matchAll(/\/assets\/[^\s'"\`)>]+/g)) {
    const asset = decodeURI(match[0].replace(/\\/g, '/'));
    if (!fs.existsSync(path.join(root, 'static', asset.slice(1)))) errors.push(`Missing referenced asset: ${asset}`);
  }
}

const payloadFiles = fs.existsSync(protectedDir) ? fs.readdirSync(protectedDir).filter((name) => name.endsWith('.json')).sort() : [];
const payloads = new Map();
for (const filename of payloadFiles) {
  const payloadPath = path.join(protectedDir, filename);
  try {
    const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
    const id = String(payload.pageId || '');
    validatePayload(payload, id, filename);
    const post = publicById.get(id);
    if (!post) throw new Error('no matching public post');
    if (!isProtected(post.source)) throw new Error(`matching public post is not marked protected: ${post.dir}`);
    payloads.set(id, payload);
  } catch (error) {
    errors.push(`Invalid encrypted payload ${filename}: ${error.message}`);
  }
}

const secrets = fs.existsSync(secretPath) ? JSON.parse(fs.readFileSync(secretPath, 'utf8')) : null;
const privateFiles = fs.existsSync(privateContent) ? fs.readdirSync(privateContent).filter((name) => name.endsWith('.md')).sort() : [];
for (const file of privateFiles) {
  const id = file.slice(0, -3);
  const payload = payloads.get(id);
  if (!payload) { errors.push(`Missing encrypted payload: ${file}`); continue; }
  try {
    const rawPayload = fs.readFileSync(path.join(protectedDir, `${encodeURIComponent(id)}.json`), 'utf8');
    if (secrets?.[id]) {
      const expected = stripFrontMatter(fs.readFileSync(path.join(privateContent, file), 'utf8'));
      if (rawPayload.includes(expected)) throw new Error('plaintext leaked into encrypted payload');
      if (decrypt(payload, secrets[id]) !== expected) throw new Error('plaintext mismatch');
      try { decrypt(payload, `${secrets[id]}\u0000wrong`); throw new Error('wrong password accepted'); } catch (error) { if (error.message === 'wrong password accepted') throw error; }
      try { decrypt(payload, secrets[id], true); throw new Error('tampered payload accepted'); } catch (error) { if (error.message === 'tampered payload accepted') throw error; }
    }
  } catch (error) {
    errors.push(`Invalid encrypted payload ${id}: ${error.message}`);
  }
}

if (secrets) {
  for (const id of Object.keys(secrets)) {
    if (!privateFiles.includes(`${id}.md`)) errors.push(`Secret has no local private source: ${id}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Content check passed: ${slugs.size} public routes, ${payloadFiles.length} encrypted payloads, ${privateFiles.length} local protected sources, ${secrets ? 'AES regression tested' : 'public encryption schema tested'}.`);
