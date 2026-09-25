import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const strictCrossRoot = process.argv.includes('--strict-cross-root');
const publishAssetRoot = path.join(root, 'static', 'assets', 'img');
const assetRoots = [
  ['static/assets/img', publishAssetRoot],
  ['assets/img', path.join(root, 'assets', 'img')],
];
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

const textSources = sourceRoots.flatMap((folder) => walk(path.join(root, folder), (file) => !assetRoots.some(([, assetRoot]) => file.startsWith(assetRoot))))
  .filter((file) => textExtensions.has(path.extname(file).toLowerCase()))
  .map((file) => ({ file: path.relative(root, file).replace(/\\/g, '/'), text: fs.readFileSync(file, 'utf8') }));
const files = assetRoots.flatMap(([area, assetRoot]) => walk(assetRoot).map((file) => ({
  file,
  area,
  relative: path.relative(assetRoot, file).replace(/\\/g, '/'),
  repoRelative: path.relative(root, file).replace(/\\/g, '/'),
  bytes: fs.statSync(file).size,
  hash: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
})));
const duplicateGroups = [...Map.groupBy(files, (item) => item.hash).values()].filter((group) => group.length > 1);
const groups = duplicateGroups.map((group) => ({
  bytesPerFile: group[0].bytes,
  files: group.map((item) => {
    const url = item.area === 'static/assets/img' ? `/assets/img/${item.relative}` : '';
    const references = url ? textSources.filter((source) => source.text.includes(url)).map((source) => source.file) : [];
    return { file: item.repoRelative, url, references };
  })
}));
const removable = groups.flatMap((group) => group.files.filter((item) => item.references.length === 0));
const duplicateBytes = duplicateGroups.reduce((sum, group) => sum + group[0].bytes * (group.length - 1), 0);
const crossRootDuplicateGroups = groups.filter((group) => new Set(group.files.map((item) => item.file.split('/').slice(0, 2).join('/'))).size > 1);
const report = { generatedAt: new Date().toISOString(), imageFiles: files.length, imageBytes: files.reduce((sum, item) => sum + item.bytes, 0), duplicateGroups: groups.length, duplicateFiles: duplicateGroups.reduce((sum, group) => sum + group.length, 0), duplicateBytes, crossRootDuplicateGroups: crossRootDuplicateGroups.length, removableCandidates: removable, groups };
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`Audited ${report.imageFiles} images (${report.imageBytes} bytes): ${report.duplicateGroups} duplicate groups (${report.duplicateBytes} duplicate bytes), ${report.crossRootDuplicateGroups} cross-root groups, ${report.removableCandidates.length} unreferenced duplicate candidates.`);
console.log(`Report: ${path.relative(root, reportPath)}`);

if (strictCrossRoot && crossRootDuplicateGroups.length) {
  console.error('Cross-root duplicate assets are not allowed; keep public copies under static/assets/img and remove identical pipeline copies:');
  for (const group of crossRootDuplicateGroups) console.error(`- ${group.files.map((item) => item.file).join(' | ')}`);
  process.exitCode = 1;
}
