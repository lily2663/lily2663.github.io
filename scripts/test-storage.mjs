import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const storageSource = read('themes/lily-epitaph/assets/js/features/storage.js').replaceAll('export function ', 'function ');
const shellSource = read('themes/lily-epitaph/assets/js/features/site-shell.js')
  .replace(/^import .* from '\.\/storage\.js';\r?\n/, '')
  .replace('export function ', 'function ');
const themeSource = read('themes/lily-epitaph/layouts/partials/head.html').match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(themeSource?.includes('blog-theme'), 'The actual early theme script must be tested.');

function classList() {
  const values = new Set();
  return { add: (...names) => names.forEach((name) => values.add(name)), remove: (...names) => names.forEach((name) => values.delete(name)), contains: (name) => values.has(name) };
}

function createFixture(mode, savedTheme = null) {
  const timers = [];
  const listeners = new Map();
  const values = new Map(savedTheme == null ? [] : [['blog-theme', savedTheme]]);
  const securityError = () => Object.assign(new Error('Storage access denied'), { name: 'SecurityError' });
  const storage = {
    getItem(key) { if (mode === 'read') throw securityError(); return values.get(key) ?? null; },
    setItem(key, value) { if (mode === 'write') throw securityError(); values.set(key, value); },
  };
  const button = () => ({
    handlers: new Map(), attributes: new Map(), focused: false,
    addEventListener(type, handler) { this.handlers.set(type, handler); },
    setAttribute(name, value) { this.attributes.set(name, value); },
    focus() { this.focused = true; },
  });
  const enter = button();
  const theme = button();
  const splash = {
    hidden: true, style: {}, classList: classList(),
    querySelector: (selector) => selector === '#welcome-enter' ? enter : null,
    addEventListener() {},
  };
  const video = (night) => ({
    classList: { contains: (name) => name === `site-background-video--${night ? 'night' : 'day'}` },
    played: 0, paused: 0,
    play() { this.played += 1; return Promise.resolve(); },
    pause() { this.paused += 1; },
  });
  const videos = [video(false), video(true)];
  const document = {
    documentElement: { dataset: { theme: 'light' } },
    body: { classList: classList() }, activeElement: null, hidden: false,
    querySelector: (selector) => ({ '#theme-toggle': theme, '#welcome-splash': splash })[selector] ?? null,
    querySelectorAll: (selector) => selector === '.site-background-video' ? videos : [],
    addEventListener: (type, handler) => listeners.set(type, handler),
  };
  const sandbox = {
    document, navigator: {}, location: { hash: '' }, HTMLElement: class {},
    matchMedia: (query) => ({ matches: query.includes('prefers-color-scheme') }),
    addEventListener() {}, setTimeout: (fn) => { timers.push(fn); },
  };
  for (const name of ['localStorage', 'sessionStorage']) {
    Object.defineProperty(sandbox, name, { get() { if (mode === 'getter') throw securityError(); return storage; } });
  }
  sandbox.window = sandbox;
  return { context: vm.createContext(sandbox), document, splash, enter, theme, videos, timers, values };
}

for (const mode of ['ok', 'getter', 'read', 'write']) {
  const fixture = createFixture(mode);
  vm.runInContext(`${storageSource}\n${shellSource}\ninitSiteShell({ root: document.documentElement, siteHeader: null });\nfollowupInitialized = true;`, fixture.context);
  assert.equal(fixture.context.followupInitialized, true, `${mode}: subsequent initialization continues`);
  assert.equal(fixture.splash.hidden, false, `${mode}: welcome remains usable`);
  assert.equal(fixture.enter.focused, true);
  fixture.enter.handlers.get('click')();
  assert.equal(fixture.document.body.classList.contains('splash-active'), false, `${mode}: welcome can close`);
  for (const timer of fixture.timers) timer();
  assert.equal(fixture.splash.style.display, 'none');
  fixture.theme.handlers.get('click')({});
  assert.equal(fixture.document.documentElement.dataset.theme, 'dark', `${mode}: theme still switches`);
  assert.equal(fixture.theme.attributes.get('aria-label'), '切换到日间模式');
  assert.equal(fixture.videos[1].played, 1, `${mode}: background sync continues after saving the preference`);
  if (mode === 'ok' || mode === 'read') {
    assert.equal(fixture.values.get('blog-theme'), 'dark');
    assert.equal(fixture.values.get('lily-welcomed'), '1');
  }
}

for (const [mode, savedTheme, expected] of [
  ['ok', 'light', 'light'], ['ok', 'dark', 'dark'], ['ok', 'unknown', 'dark'],
  ['ok', null, 'dark'], ['getter', 'light', 'dark'], ['read', 'light', 'dark'],
]) {
  const fixture = createFixture(mode, savedTheme);
  vm.runInContext(themeSource, fixture.context);
  assert.equal(fixture.document.documentElement.dataset.theme, expected, `${mode}/${savedTheme}: early theme choice`);
}

console.log('Storage regression passed: normal storage and getter/read/write SecurityErrors preserve initialization, welcome dismissal, theme/background updates; early theme accepts light/dark and falls back safely.');
