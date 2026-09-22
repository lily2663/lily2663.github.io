import { scalar } from './value.mjs';

export function parseToml(raw) {
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

export function patchTomlValue(raw, fieldPath, value) {
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

export function patchMenus(raw, menus) {
  const lines = raw.split(/\r?\n/);
  const starts = lines.map((line, index) => line.trim() === '[[menus.main]]' ? index : -1).filter((index) => index >= 0);
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
