import { isDeepStrictEqual } from 'node:util';
import { randomUUID } from 'node:crypto';
import { isObject } from './value.mjs';
import { normalizeLayout, validateLayoutAgainstRegistry } from './layout.mjs';

// Update one placement while preserving every other module and custom layout field.
export function updateModulePlacement(source, registry, request) {
  const module = registry[request.module];
  if (!module) throw new Error('模块不存在。');
  if (!isObject(request.config)) throw new Error('模块配置必须是对象。');
  if (typeof request.enabled !== 'boolean') throw new Error('模块启用状态必须是布尔值。');
  const layout = normalizeLayout(structuredClone(source), '模块布局');
  if (!Object.hasOwn(layout.slots, request.slot)) throw new Error('目标位置不存在。');
  if (!module.allowedSlots.includes(`${layout.kind}.${request.slot}`)) throw new Error('模块不支持这个位置。');
  const known = new Set([...Object.keys(module.schema || {}), ...Object.keys(module.defaults || {})]);
  for (const key of Object.keys(request.config)) {
    if (!known.has(key) || ['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error(`不支持的模块参数：${key}`);
  }
  const placements = layout.slots[request.slot];
  let placement;
  if (request.instanceId) {
    placement = placements.find((item) => item.id === request.instanceId && item.module === request.module);
    if (!placement || !isDeepStrictEqual(placement, request.expected)) {
      const error = new Error('这个模块已被其他编辑更新或移除，请重新打开后再保存。');
      error.statusCode = 409;
      throw error;
    }
    placement.config = { ...placement.config, ...request.config };
    placement.enabled = request.enabled;
  } else {
    placement = { id: `${request.module}-${randomUUID()}`, module: request.module, enabled: request.enabled, config: { ...module.defaults, ...request.config } };
    placements.push(placement);
  }
  validateLayoutAgainstRegistry(layout, registry);
  return { layout, placement };
}
