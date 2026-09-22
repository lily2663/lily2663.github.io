import YAML from 'yaml';
import { isObject, parseYaml } from './value.mjs';

export function normalizeLayout(value, label) {
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

export function parseLayout(raw, label = '布局') {
  return normalizeLayout(parseYaml(raw, label), label);
}

export function serializeLayout(layout) {
  return YAML.stringify(normalizeLayout(layout, '布局'));
}

export function normalizeModuleManifest(fileId, raw, source) {
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

export function validateLayoutAgainstRegistry(layout, modules) {
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
