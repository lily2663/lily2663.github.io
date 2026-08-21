import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const content = path.join(root, 'content', 'posts');
const privateContent = path.join(root, 'private-content');
const protectedDir = path.join(root, 'static', 'protected');
const secretPath = path.join(root, '.secrets', 'protected-posts.json');
const tracked = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
const errors = [];

function stripFrontMatter(source) {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}
function decrypt(payload, password, tamper = false) {
  const key = crypto.pbkdf2Sync(password, Buffer.from(payload.kdf.salt, 'base64'), payload.kdf.iterations, 32, 'sha256');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(payload.cipher.iv, 'base64'));
  const tag = Buffer.from(payload.cipher.tag, 'base64');
  if (tamper) tag[0] ^= 1;
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(Buffer.from(payload.cipher.data, 'base64')), decipher.final()]).toString('utf8');
}

if (!tracked.includes('private-content/') || !tracked.includes('.secrets/')) errors.push('Private source ignore rules are missing.');
const slugs = new Set();
for (const dir of fs.readdirSync(content, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
  const file = path.join(content, dir.name, 'index.md');
  if (!fs.existsSync(file)) { errors.push(`Missing ${file}`); continue; }
  const source = fs.readFileSync(file, 'utf8');
  if (!source.startsWith('---\n')) errors.push(`Invalid front matter: ${dir.name}`);
  if (slugs.has(dir.name)) errors.push(`Duplicate slug: ${dir.name}`);
  slugs.add(dir.name);
  if (/^password\s*:/mi.test(source)) errors.push(`Password leaked in public content: ${dir.name}`);
  for (const match of source.matchAll(/\/assets\/[^\s'"`)>]+/g)) {
    const asset = decodeURI(match[0].replace(/\\/g, '/'));
    if (!fs.existsSync(path.join(root, 'static', asset.slice(1)))) errors.push(`Missing referenced asset: ${asset}`);
  }
}
const secrets = fs.existsSync(secretPath) ? JSON.parse(fs.readFileSync(secretPath, 'utf8')) : null;
const privateFiles = fs.existsSync(privateContent) ? fs.readdirSync(privateContent).filter((name) => name.endsWith('.md')) : [];
for (const file of privateFiles) {
  const id = file.slice(0, -3);
  const payloadPath = path.join(protectedDir, `${encodeURIComponent(id)}.json`);
  if (!fs.existsSync(payloadPath)) { errors.push(`Missing encrypted payload: ${file}`); continue; }
  try {
    const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
    if (payload.version !== 2 || payload.pageId !== id || payload.kdf?.iterations !== 600000 || payload.cipher?.name !== 'AES-256-GCM') throw new Error('invalid encryption schema');
    if (secrets?.[id]) {
      const expected = stripFrontMatter(fs.readFileSync(path.join(privateContent, file), 'utf8'));
      if (fs.readFileSync(payloadPath, 'utf8').includes(expected)) throw new Error('plaintext leaked into encrypted payload');
      if (decrypt(payload, secrets[id]) !== expected) throw new Error('plaintext mismatch');
      try { decrypt(payload, `${secrets[id]}\u0000wrong`); throw new Error('wrong password accepted'); } catch (error) { if (error.message === 'wrong password accepted') throw error; }
      try { decrypt(payload, secrets[id], true); throw new Error('tampered payload accepted'); } catch (error) { if (error.message === 'tampered payload accepted') throw error; }
    }
  } catch (error) { errors.push(`Invalid encrypted payload ${id}: ${error.message}`); }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Content check passed: ${slugs.size} public routes, ${privateFiles.length} protected sources, ${secrets ? 'AES regression tested' : 'encryption schema tested'}.`);
