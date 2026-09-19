import { access, copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const adminRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(adminRoot, 'dist');
const example = path.join(adminRoot, 'lilymap.json.example');
const packagedExample = path.join(dist, 'lilymap.json.example');

function runNpm(script) {
  return new Promise((resolve, reject) => {
    const child = process.platform === 'win32'
      ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `npm.cmd run ${script}`], { cwd: adminRoot, stdio: 'inherit', windowsHide: false })
      : spawn('npm', ['run', script], { cwd: adminRoot, stdio: 'inherit', windowsHide: false });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`npm run ${script} exited with code ${code}.`)));
  });
}

try { await access(example); } catch { throw new Error('缺少 lilymap.json.example。'); }
await mkdir(dist, { recursive: true });
await rm(packagedExample, { force: true });
await runNpm('exe');
await copyFile(example, packagedExample);
console.log(`便携发布包已准备：${dist}`);
