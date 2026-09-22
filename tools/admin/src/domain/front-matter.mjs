import { scalar } from './value.mjs';

export function formatYamlValue(value) {
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  return `"${String(value ?? '').replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

export function parseFrontMatter(raw) {
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

function patchYamlBlock(lines, key, value) {
  const start = lines.findIndex((line) => new RegExp(`^${key}:`).test(line));
  const replacement = Array.isArray(value)
    ? [`${key}:`, ...value.map((item) => `  - ${formatYamlValue(item)}`)]
    : [`${key}: ${formatYamlValue(value)}`];
  if (start < 0) return [...lines, ...replacement];
  let end = start + 1;
  while (end < lines.length && (/^\s/.test(lines[end]) || lines[end] === '')) end += 1;
  return [...lines.slice(0, start), ...replacement, ...lines.slice(end)];
}

export function patchFrontMatter(raw, changes) {
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
