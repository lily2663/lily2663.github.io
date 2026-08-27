import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const root = path.resolve(import.meta.dirname, '..');
const themeRoot = path.join(root, 'themes', 'lily-epitaph');
const moduleRoots = [
  [path.join(themeRoot, 'data', 'lily', 'modules'), 'built-in'],
  [path.join(root, 'data', 'lily', 'modules'), 'site'],
];
const layoutRoots = [
  [path.join(themeRoot, 'data', 'lily', 'layouts'), 'built-in'],
  [path.join(root, 'data', 'lily', 'layouts'), 'site'],
];
const partialRoots = [path.join(root, 'layouts', 'partials'), path.join(themeRoot, 'layouts', 'partials')];
const assetRoots = [path.join(root, 'assets'), path.join(themeRoot, 'assets')];
const errors = [];

function isObject(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function files(rootPath) { return fs.existsSync(rootPath) ? fs.readdirSync(rootPath).filter((name) => name.endsWith('.yaml')).sort().map((name) => path.join(rootPath, name)) : []; }
function readYaml(file, label) {
  const document = YAML.parseDocument(fs.readFileSync(file, 'utf8'), { prettyErrors: true, uniqueKeys: true });
  if (document.errors.length) throw new Error(`${label}: ${document.errors[0].message}`);
  const value = document.toJS({ mapAsMap: false });
  if (!isObject(value)) throw new Error(`${label}: YAML 根节点必须是对象`);
  return value;
}
function existsIn(roots, relative) { return roots.some((rootPath) => fs.existsSync(path.join(rootPath, relative))); }
function validValue(value, definition) {
  const type = definition?.type || 'string';
  if (type === 'boolean') return typeof value === 'boolean';
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (type === 'select') return typeof value === 'string' && (!Array.isArray(definition.options) || definition.options.some((option) => option?.value === value));
  return typeof value === 'string';
}

const modules = new Map();
for (const [directory, source] of moduleRoots) {
  for (const file of files(directory)) {
    try {
      const id = path.basename(file, '.yaml'); const manifest = readYaml(file, `模块 ${id}`);
      if (manifest.id !== id) throw new Error(`id 必须与文件名 ${id} 一致`);
      if (manifest.apiVersion && manifest.apiVersion !== 'lily-module/v1') throw new Error(`不支持的 apiVersion: ${manifest.apiVersion}`);
      if (!Array.isArray(manifest.allowedSlots) || !manifest.allowedSlots.every((slot) => typeof slot === 'string')) throw new Error('allowedSlots 必须是字符串数组');
      const partial = manifest.template?.partial || `lily/modules/${id}/render.html`;
      if (typeof partial !== 'string' || partial.startsWith('/') || partial.includes('..') || !existsIn(partialRoots, partial)) throw new Error(`模板不存在或不安全: ${partial}`);
      for (const resource of [...(manifest.assets?.styles || []), ...(manifest.assets?.scripts || [])]) {
        if (typeof resource !== 'string' || resource.includes('..') || !existsIn(assetRoots, resource)) throw new Error(`资源不存在或不安全: ${resource}`);
      }
      // 模块自带的约定资源必须由 manifest 显式声明；否则资源文件虽在仓库，
      // 但不会进入 manifest 驱动的 CSS/JS bundle，页面会退化为无样式 HTML。
      for (const [kind, extension] of [['styles', 'css'], ['scripts', 'js']]) {
        const conventional = `lily/modules/${id}.${extension}`;
        if (existsIn(assetRoots, conventional) && !((manifest.assets?.[kind] || []).includes(conventional))) {
          throw new Error(`存在 ${conventional}，但 assets.${kind} 未声明它`);
        }
      }
      modules.set(id, { ...manifest, source });
    } catch (error) { errors.push(`${file}: ${error.message}`); }
  }
}

for (const [directory] of layoutRoots) {
  for (const file of files(directory)) {
    try {
      const name = path.basename(file, '.yaml'); const layout = readYaml(file, `布局 ${name}`);
      if (!isObject(layout.slots)) throw new Error('缺少 slots 对象');
      const ids = new Set();
      for (const [slot, rawInstances] of Object.entries(layout.slots)) {
        const instances = rawInstances == null ? [] : rawInstances;
        if (!Array.isArray(instances)) throw new Error(`slot ${slot} 必须是数组`);
        for (const instance of instances) {
          if (!isObject(instance) || typeof instance.id !== 'string' || typeof instance.module !== 'string') throw new Error(`slot ${slot} 含无效模块实例`);
          if (ids.has(instance.id)) throw new Error(`重复实例 id: ${instance.id}`);
          ids.add(instance.id);
          const manifest = modules.get(instance.module);
          const fullSlot = `${layout.kind}.${slot}`;
          if (!manifest) throw new Error(`未知模块: ${instance.module}`);
          if (!manifest.allowedSlots.includes(fullSlot)) throw new Error(`模块 ${instance.module} 不允许放入 ${fullSlot}`);
          for (const [key, value] of Object.entries(instance.config || {})) if (manifest.schema?.[key] && !validValue(value, manifest.schema[key])) throw new Error(`模块 ${instance.module} 的 ${key} 类型不正确`);
        }
      }
    } catch (error) { errors.push(`${file}: ${error.message}`); }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Lily protocol check passed: ${modules.size} modules, ${layoutRoots.reduce((count, [directory]) => count + files(directory).length, 0)} layout files.`);
