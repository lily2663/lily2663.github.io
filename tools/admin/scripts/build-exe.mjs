import { copyFile, mkdir, mkdtemp, readFile, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { rcedit } from 'rcedit';

if (process.platform !== 'win32' || process.arch !== 'x64') {
  throw new Error('Windows x64 is required to build LilyMap.exe.');
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const pkgRequire = createRequire(require.resolve('@yao-pkg/pkg'));
const { need } = pkgRequire('@yao-pkg/pkg-fetch');
const metadata = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const temporary = await mkdtemp(path.join(tmpdir(), 'lilymap-exe-'));
const brandedBase = path.join(temporary, 'node-lilymap.exe');

try {
  // Brand a private copy BEFORE pkg appends its payload and records file offsets.
  // Editing resources on the finished EXE can invalidate those offsets.
  delete process.env.PKG_NODE_PATH;
  const originalBase = await need({ nodeRange: 'node22', platform: 'win', arch: 'x64' });
  await copyFile(originalBase, brandedBase);
  await rcedit(brandedBase, {
    icon: path.join(root, 'public', 'favicon.ico'),
    'file-version': metadata.version,
    'product-version': metadata.version,
    'version-string': {
      ProductName: 'LilyMap',
      FileDescription: 'LilyMap · 博客编排工作台',
      InternalName: 'LilyMap',
      OriginalFilename: 'LilyMap.exe',
      CompanyName: 'LilyMap',
      LegalCopyright: 'LilyMap contributors · MIT',
    },
  });
  await mkdir(path.join(root, 'dist'), { recursive: true });
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      require.resolve('@yao-pkg/pkg/lib-es5/bin.js'), '--config', 'package.json',
      'server.cjs', '--targets=node22-win-x64', '--output=dist/LilyMap.exe',
    ], { cwd: root, env: { ...process.env, PKG_NODE_PATH: brandedBase }, stdio: 'inherit', windowsHide: true });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`pkg exited with code ${code}`)));
  });
  console.log('LilyMap.exe built with the Lily icon and Windows product metadata.');
} finally {
  await rm(brandedBase, { force: true });
  await rmdir(temporary);
}
