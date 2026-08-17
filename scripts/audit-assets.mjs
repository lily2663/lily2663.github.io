import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const assetRoot = path.join(root, 'static', 'assets', 'img');
const reportPath = path.join(root, 'reports', 'asset-audit.json');
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.md', '.mjs', '.toml', '.yaml', '.yml']);
const sourceRoots = ['content', 'data', 'docs', 'private-content', 'scripts', 'static', 'themes'];

function walk(directory, predicate = () => true) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (!predicate(file)) return [];
    return entry.isDirectory() ? walk(file, predicate) : [file];
  });
}

const textSources = sourceRoots.flatMap((folder) => walk(path.join(root, folder), (file) => !file.startsWith(assetRoot)))
  .filter((file) => textExtensions.has(path.extname(file).toLowerCase()))
  .map((file) => ({ file: path.relative(root, file).replace(/\\/g, '/'), text: fs.readFileSync(file, 'utf8') }));
const files = walk(assetRoot).map((file) => ({
  file,
  relative: path.relative(assetRoot, file).replace(/\\/g, '/'),
  bytes: fs.statSync(file).size,
  hash: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}));
const duplicateGroups = [...Map.groupBy(files, (item) => item.hash).values()].filter((group) => group.length > 1);
const groups = duplicateGroups.map((group) => ({
  bytesPerFile: group[0].bytes,
  files: group.map((item) => {
    const url = `/assets/img/${item.relative}`;
    return { url, references: textSources.filter((source) => source.text.includes(url)).map((source) => source.file) };
  })
}));
const removable = groups.flatMap((group) => group.files.filter((item) => item.references.length === 0));
const report = { generatedAt: new Date().toISOString(), imageFiles: files.length, imageBytes: files.reduce((sum, item) => sum + item.bytes, 0), duplicateGroups: groups.length, duplicateFiles: duplicateGroups.reduce((sum, group) => sum + group.length, 0), removableCandidates: removable, groups };
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`Audited ${report.imageFiles} images (${report.imageBytes} bytes): ${report.duplicateGroups} duplicate groups, ${report.removableCandidates.length} unreferenced duplicate candidates.`);
console.log(`Report: ${path.relative(root, reportPath)}`);
