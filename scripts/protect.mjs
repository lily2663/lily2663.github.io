import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const privateDir = path.join(root, 'private-content');
const secretPath = path.join(root, '.secrets', 'protected-posts.json');
const outputDir = path.join(root, 'static', 'protected');
const secrets = JSON.parse(fs.readFileSync(secretPath, 'utf8'));
const requested = process.argv.slice(2).filter((value) => !value.startsWith('-'));
const ids = requested.length ? requested : Object.keys(secrets);

function stripFrontMatter(source) {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

fs.mkdirSync(outputDir, { recursive: true });
for (const id of ids) {
  const password = secrets[id];
  if (!password) throw new Error(`No local password is configured for ${id}`);
  const sourcePath = path.join(privateDir, `${id}.md`);
  if (!fs.existsSync(sourcePath)) throw new Error(`Missing private source for ${id}`);
  const plaintext = Buffer.from(stripFrontMatter(fs.readFileSync(sourcePath, 'utf8')), 'utf8');
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(password, salt, 600000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const payload = {
    version: 2,
    pageId: id,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 600000, salt: salt.toString('base64') },
    cipher: { name: 'AES-256-GCM', iv: iv.toString('base64'), data: data.toString('base64'), tag: cipher.getAuthTag().toString('base64') }
  };
  fs.writeFileSync(path.join(outputDir, `${encodeURIComponent(id)}.json`), JSON.stringify(payload) + '\n', 'utf8');
  console.log(`Protected ${id}`);
}
