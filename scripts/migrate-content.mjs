import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const postsDir = path.join(root, 'posts');
const contentDir = path.join(root, 'content', 'posts');
const privateDir = path.join(root, 'private-content');
const secretDir = path.join(root, '.secrets');
const articlePath = path.join(root, 'assets', 'data', 'articles.js');
const rawIndex = fs.readFileSync(articlePath, 'utf8');
const index = JSON.parse(rawIndex.replace(/^window\.BLOG\s*=\s*/, '').replace(/;\s*$/, ''));

function yaml(value) {
  return JSON.stringify(String(value));
}

function stripFrontMatter(source) {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

function normaliseImages(source) {
  return source.replace(/(!\[[^\]]*\]\(|<img[^>]+src=["'])([^"')\s]+)/g, (all, prefix, src) => {
    const found = src.replace(/\\/g, '/').match(/assets\/.+/);
    return prefix + (found ? `/${found[0]}` : src.replace(/\\/g, '/'));
  });
}

function isoDate(value) {
  const text = String(value || '').trim();
  if (!text) return '2026-01-01T00:00:00+08:00';
  if (/T/.test(text)) return text;
  const match = text.match(/^(\d{4}-\d{1,2}-\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return '2026-01-01T00:00:00+08:00';
  const date = match[1].split('-').map((part) => part.padStart(2, '0')).join('-');
  const hour = (match[2] || '00').padStart(2, '0');
  const minute = (match[3] || '00').padStart(2, '0');
  const second = (match[4] || '00').padStart(2, '0');
  return `${date}T${hour}:${minute}:${second}+08:00`;
}

function frontMatter(article, protectedPost) {
  const tags = article.tags?.length ? article.tags : ['随笔'];
  const lines = [
    '---',
    `title: ${yaml(article.title)}`,
    `date: ${yaml(isoDate(article.date))}`,
    `lastmod: ${yaml(isoDate(article.date))}`,
    `slug: ${yaml(article.id)}`,
    `summary: ${yaml(article.excerpt || '')}`,
    'tags:',
    ...tags.map((tag) => `  - ${yaml(tag)}`),
    'params:',
    `  protected: ${protectedPost ? 'true' : 'false'}`,
    `  commentId: ${yaml(article.id)}`,
    `  legacyId: ${yaml(article.id)}`,
    '---',
    ''
  ];
  return lines.join('\n');
}

fs.mkdirSync(contentDir, { recursive: true });
fs.mkdirSync(privateDir, { recursive: true });
fs.mkdirSync(secretDir, { recursive: true });
const secrets = {};
let count = 0;

for (const filename of fs.readdirSync(postsDir).filter((file) => file.endsWith('.md'))) {
  const id = filename.replace(/\.md$/i, '');
  const article = index.articles.find((item) => item.id === id);
  if (!article) throw new Error(`No article metadata found for ${filename}`);
  const raw = fs.readFileSync(path.join(postsDir, filename), 'utf8');
  const password = raw.match(/^password\s*:\s*(.+)$/mi)?.[1]?.trim();
  const body = normaliseImages(stripFrontMatter(raw));
  if (article.encrypted || password) {
    if (!password) throw new Error(`Protected article ${id} has no local password`);
    secrets[id] = password;
    fs.writeFileSync(path.join(privateDir, `${id}.md`), frontMatter(article, true) + body, 'utf8');
    const target = path.join(contentDir, id, 'index.md');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, frontMatter(article, true) + '这是一篇受保护文章。\n', 'utf8');
  } else {
    const target = path.join(contentDir, id, 'index.md');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, frontMatter(article, false) + body, 'utf8');
  }
  count++;
}

fs.writeFileSync(path.join(secretDir, 'protected-posts.json'), JSON.stringify(secrets, null, 2) + '\n', 'utf8');
console.log(`Migrated ${count} articles; protected source and passwords remain local.`);
