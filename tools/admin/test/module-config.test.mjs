import assert from 'node:assert/strict';
import test from 'node:test';
import { updateModulePlacement } from '../src/domain/module-config.mjs';

const registry = { weather: { allowedSlots: ['home.sidebar'], defaults: { title: '天气', latitude: 31 }, schema: { title: { type: 'string' }, latitude: { type: 'number', min: -90, max: 90 }, unit: { type: 'select', options: [{ value: 'celsius' }] } } } };
const layout = { kind: 'home', title: 'My home', custom: 'preserve', slots: { sidebar: [{ id: 'one', module: 'weather', config: { title: '上海', latitude: 31, customLegacy: 'keep' } }, { id: 'two', module: 'weather', config: { title: '北京' } }] }, slotOrder: ['sidebar'] };
const edit = () => ({ module: 'weather', slot: 'sidebar', instanceId: 'one', expected: structuredClone(layout.slots.sidebar[0]), enabled: false, config: { title: '新标题', latitude: 0 } });

test('module config changes only the selected placement and preserves unrelated data', () => {
  const result = updateModulePlacement(layout, registry, edit());
  assert.equal(result.placement.config.latitude, 0);
  assert.equal(result.placement.enabled, false);
  assert.equal(result.placement.config.customLegacy, 'keep');
  assert.deepEqual(result.layout.slots.sidebar[1], layout.slots.sidebar[1]);
  assert.equal(result.layout.custom, 'preserve');
  assert.equal(layout.slots.sidebar[0].config.title, '上海');
});
test('module config detects stale edits rather than overwriting a changed instance', () => {
  const request = edit(); request.expected.config.title = 'stale';
  assert.throws(() => updateModulePlacement(layout, registry, request), (error) => error.statusCode === 409);
});
test('module config rejects unsupported fields, slots and invalid schema values', () => {
  for (const config of [{ latitude: 91 }, { latitude: '' }, { unit: 'invalid' }, { unknown: true }]) {
    assert.throws(() => updateModulePlacement(layout, registry, { ...edit(), config }));
  }
  assert.throws(() => updateModulePlacement(layout, registry, { ...edit(), slot: 'missing' }));
  assert.throws(() => updateModulePlacement(layout, registry, { ...edit(), enabled: 'false' }));
});
test('new module placement receives defaults and a unique id', () => {
  const result = updateModulePlacement(layout, registry, { module: 'weather', slot: 'sidebar', config: { title: '新天气' }, enabled: true });
  assert.equal(result.layout.slots.sidebar.length, 3);
  assert.equal(result.placement.config.latitude, 31);
  assert.notEqual(result.placement.id, 'one');
});
