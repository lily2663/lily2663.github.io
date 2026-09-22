import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import YAML from 'yaml';

async function unusedPort() {
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port; await new Promise((resolve) => server.close(resolve)); return port;
}
test('module config HTTP saves, reloads, detects conflict, validates and records history', { timeout: 20000 }, async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'lilymap-module-http-'));
  const theme = path.join(root, 'themes', 'fixture');
  const put = async (name, content) => { const target = path.join(root, name); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, content); };
  let child;
  try {
    await mkdir(path.join(root, 'content'), { recursive: true });
    await put('hugo.toml', 'baseURL = "http://localhost/"\ntheme = "fixture"\n');
    await put('themes/fixture/theme-config.schema.json', '{"sections":[]}');
    await put('themes/fixture/data/lily/modules/quote.yaml', YAML.stringify({ id: 'quote', allowedSlots: ['home.sidebar'], defaults: { text: 'default' }, schema: { text: { type: 'string' } } }));
    await put('themes/fixture/data/lily/layouts/home.yaml', YAML.stringify({ kind: 'home', slots: { sidebar: [{ id: 'quote-one', module: 'quote', config: { text: 'before' } }, { id: 'quote-two', module: 'quote', config: { text: 'untouched' } }] } }));
    const adminPort = await unusedPort(); let blogPort = await unusedPort(); while (blogPort === adminPort) blogPort = await unusedPort();
    child = spawn(process.execPath, [fileURLToPath(new URL('../server.mjs', import.meta.url)), '--project', root, '--no-open'], { env: { ...process.env, ADMIN_PORT: String(adminPort), BLOG_PORT: String(blogPort), LILY_THEME_PATH: theme }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = ''; child.stdout.on('data', (chunk) => { output += chunk; }); child.stderr.on('data', (chunk) => { output += chunk; });
    const base = `http://127.0.0.1:${adminPort}`;
    const request = async (body) => fetch(`${base}/api/modules/config`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify(body) });
    let response;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { response = await fetch(`${base}/api/layouts`); if (response.ok) break; } catch {}
      if (child.exitCode !== null) throw new Error(output);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.ok(response?.ok, output);
    const initial = (await response.json()).layouts[0].parsed;
    const payload = { module: 'quote', layout: 'home', slot: 'sidebar', instanceId: 'quote-one', expected: initial.slots.sidebar[0], enabled: false, config: { text: 'saved locally' } };
    const saved = await request(payload); assert.equal(saved.status, 200, await saved.text());
    const loaded = (await (await fetch(`${base}/api/layouts`)).json()).layouts[0].parsed;
    assert.equal(loaded.slots.sidebar[0].config.text, 'saved locally');
    assert.equal(loaded.slots.sidebar[0].enabled, false);
    assert.equal(loaded.slots.sidebar[1].config.text, 'untouched');
    assert.equal((await request(payload)).status, 409);
    assert.equal((await request({ ...payload, expected: loaded.slots.sidebar[0], config: { invalid: true } })).status, 400);
    const again = await request({ ...payload, expected: loaded.slots.sidebar[0], enabled: true, config: { text: 'second save' } });
    assert.equal(again.status, 200); assert.ok((await again.json()).backup);
    const disk = YAML.parse(await readFile(path.join(root, 'data/lily/layouts/home.yaml'), 'utf8'));
    assert.equal(disk.slots.sidebar[0].config.text, 'second save');
    const history = await (await fetch(`${base}/api/layouts/history?name=home`)).json(); assert.ok(history.history.length >= 1);
  } finally {
    if (child && child.exitCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; }
    assert.ok(path.basename(root).startsWith('lilymap-module-http-'));
    await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});
