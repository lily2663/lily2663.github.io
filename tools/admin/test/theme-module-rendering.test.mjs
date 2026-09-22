import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const theme = process.env.LILY_TEST_THEME_PATH;
const hugo = process.env.LILY_TEST_HUGO_PATH;
test('theme modules honor disabled controls and welcome instance overrides', { skip: !theme || !hugo }, async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'lilymap-theme-modules-'));
  const put = async (name, value) => { const target = path.join(root, name); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, value); };
  try {
    await put('hugo.toml', 'baseURL="http://localhost/"\ntitle="Fixture"\n[params.search]\nenabled=true\n[params.footer]\nnote="FOOTER-NOTE"\n[params.comments]\nenabled=true\napi="/comments"\n[params.welcome]\nenabled=true\ntitleBefore="LEGACY-WELCOME"\nparticles=12\nbackground="/legacy.jpg"\n');
    await put('content/posts/fixture.md', '---\ntitle: Fixture\n---\nBody');
    await put('layouts/index.html', `HEADER-OFF{{ partial "lily/modules/header/render.html" (dict "Page" . "Config" (dict "showSearch" false "showThemeToggle" false)) }}END-HEADER-OFF
HEADER-ON{{ partial "lily/modules/header/render.html" (dict "Page" . "Config" (dict "showSearch" true "showThemeToggle" true)) }}END-HEADER-ON
FOOTER-OFF{{ partial "lily/modules/footer/render.html" (dict "Page" . "Config" (dict "showCopyright" false "showNote" false)) }}END-FOOTER-OFF
WELCOME-OVERRIDE{{ partial "lily/runtime/resolve.html" (dict "page" . "layout" "home" "slot" "home.hero" "instance" (dict "id" "fixture" "module" "welcome" "config" (dict "titleBefore" "MODULE-WELCOME" "particles" 0 "background" "/module.jpg"))) }}END-WELCOME-OVERRIDE
WELCOME-OFF{{ partial "lily/runtime/resolve.html" (dict "page" . "layout" "home" "slot" "home.hero" "instance" (dict "id" "off" "module" "welcome" "config" (dict "enabled" false))) }}END-WELCOME-OFF
WELCOME-LEGACY{{ partial "lily/runtime/resolve.html" (dict "page" . "layout" "home" "slot" "home.hero" "instance" (dict "id" "legacy" "module" "welcome")) }}END-WELCOME-LEGACY`);
    await put('layouts/_default/single.html', '{{ partial "lily/modules/comments/render.html" (dict "Page" . "Config" (dict "enabled" false)) }}{{ partial "lily/modules/article-content/render.html" (dict "Page" . "Config" (dict "layout" "full")) }}');
    const built = spawnSync(hugo, ['--source', root, '--themesDir', path.dirname(theme), '--theme', path.basename(theme), '--noBuildLock'], { encoding: 'utf8', windowsHide: true, env: { ...process.env, HUGO_BUILD_NOJSCONFIGINASSETS: 'true' } });
    assert.equal(built.status, 0, built.stdout + built.stderr);
    const html = await readFile(path.join(root, 'public/index.html'), 'utf8');
    const part = (name) => html.split(name)[1].split(`END-${name}`)[0];
    assert.doesNotMatch(part('HEADER-OFF'), /id="search"|id="theme-toggle"/);
    assert.match(part('HEADER-ON'), /id="search"/); assert.match(part('HEADER-ON'), /id="theme-toggle"/);
    assert.doesNotMatch(part('FOOTER-OFF'), /FOOTER-NOTE|©/);
    assert.match(part('WELCOME-OVERRIDE'), /MODULE-WELCOME/);
    assert.match(part('WELCOME-OVERRIDE'), /module\.jpg/);
    assert.doesNotMatch(part('WELCOME-OVERRIDE'), /legacy\.jpg/);
    assert.doesNotMatch(part('WELCOME-OVERRIDE'), /LEGACY-WELCOME|class="watercolor-dot"/);
    assert.doesNotMatch(part('WELCOME-OFF'), /id="welcome-splash"/);
    assert.match(part('WELCOME-LEGACY'), /LEGACY-WELCOME/);
    assert.match(part('WELCOME-LEGACY'), /legacy\.jpg/);
    const article = await readFile(path.join(root, 'public/posts/fixture/index.html'), 'utf8');
    assert.doesNotMatch(article, /id="comment-container"/); assert.match(article, /data-content-layout="full"/);
  } finally {
    assert.ok(path.basename(root).startsWith('lilymap-theme-modules-'));
    await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});
