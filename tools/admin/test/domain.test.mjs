import assert from 'node:assert/strict';
import test from 'node:test';

import { formatYamlValue, parseFrontMatter, patchFrontMatter } from '../src/domain/front-matter.mjs';
import { decryptProtectedBody, encryptProtectedBody } from '../src/domain/protected-content.mjs';
import { normalizeLayout, normalizeModuleManifest, validateLayoutAgainstRegistry } from '../src/domain/layout.mjs';
import { validateFriends, validateProfile } from '../src/domain/profile.mjs';
import { parseToml, patchMenus, patchTomlValue } from '../src/domain/toml.mjs';
import { parseYaml } from '../src/domain/value.mjs';

test('front matter round-trips article metadata without changing the body', () => {
  const source = '---\ntitle: "Before"\ntags:\n  - "one"\nparams:\n  protected: false\n---\nBody\n';
  const patched = patchFrontMatter(source, { title: 'After', tags: ['two'], protected: true });
  const parsed = parseFrontMatter(patched);
  assert.equal(parsed.frontMatter.title, 'After');
  assert.deepEqual(parsed.frontMatter.tags, ['two']);
  assert.equal(parsed.frontMatter.params.protected, true);
  assert.equal(parsed.body, 'Body\n');
});

test('YAML values remain quoted and escaped', () => {
  assert.equal(formatYamlValue('a "quote" \\ path'), '"a \\"quote\\" \\\\ path"');
});

test('TOML settings and menus can be patched independently', () => {
  const source = '[params]\nauthor = "Lily"\n\n[[menus.main]]\n  name = "Home"\n  url = "/"\n  weight = 10\n';
  const setting = patchTomlValue(source, 'params.author', 'Lily Zero');
  const menus = patchMenus(setting, [{ name: 'Posts', url: '/posts/', weight: 20 }]);
  const parsed = parseToml(menus);
  assert.equal(parsed.values['params.author'], 'Lily Zero');
  assert.deepEqual(parsed.menus, [{ name: 'Posts', url: '/posts/', weight: 20 }]);
});

test('protected article encryption is reversible and rejects a wrong password', () => {
  const payload = encryptProtectedBody('page', 'secret body', 'correct');
  assert.equal(decryptProtectedBody(payload, 'correct'), 'secret body');
  assert.throws(() => decryptProtectedBody(payload, 'wrong'), (error) => error.status === 400);
});

test('YAML domain parser rejects non-object roots', () => {
  assert.deepEqual(parseYaml('title: Lily\n', '测试'), { title: 'Lily' });
  assert.throws(() => parseYaml('- one\n', '测试'), /必须是 YAML 对象/);
});

test('profiles and friend links are normalized at the domain boundary', () => {
  assert.deepEqual(validateProfile({ author: ' Lily ', aboutTitle: '', about: [' hello '], links: [{ label: 'Site', url: 'https://example.com/' }] }), {
    author: 'Lily', aboutTitle: '', about: ['hello'], links: [{ label: 'Site', url: 'https://example.com/' }],
  });
  assert.equal(validateFriends([{ name: 'Friend', url: 'https://example.com', desc: '', avatar: '/avatar.png' }])[0].name, 'Friend');
  assert.throws(() => validateFriends([{ name: 'Bad', url: 'javascript:alert(1)', desc: '', avatar: '' }]), (error) => error.statusCode === 400);
});

test('layout modules enforce slot and schema contracts', () => {
  const layout = normalizeLayout({ kind: 'home', slots: { main: [{ id: 'hero', module: 'welcome', config: { enabled: true } }] } }, '首页');
  const manifest = normalizeModuleManifest('welcome', 'id: welcome\nallowedSlots:\n  - home.main\nschema:\n  enabled:\n    type: boolean\n', 'built-in');
  assert.doesNotThrow(() => validateLayoutAgainstRegistry(layout, { welcome: manifest }));
  assert.throws(() => validateLayoutAgainstRegistry({ ...layout, slots: { main: [{ ...layout.slots.main[0], config: { enabled: 'yes' } }] } }, { welcome: manifest }), /必须是布尔值/);
});
