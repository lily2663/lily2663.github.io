import { copyFile, mkdir, rm, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const admin = path.join(root, 'tools', 'admin');
const output = path.join(root, 'LilyMap.exe');
const packaged = path.join(admin, 'dist', 'LilyMap.exe');
const localConfig = path.join(root, 'lilymap.json');

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = process.platform === 'win32'
      ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `${command} ${args.join(' ')}`], { cwd, shell: false, stdio: 'inherit', windowsHide: false })
      : spawn(command, args, { cwd, shell: false, stdio: 'inherit', windowsHide: false });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with code ${code}.`)));
  });
}

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

if (process.platform !== 'win32') throw new Error('LilyMap.exe 仅能在 Windows 上构建。');
await mkdir(path.dirname(packaged), { recursive: true });
await rm(packaged, { force: true });
await run('npm.cmd', ['run', 'exe'], admin);
await copyFile(packaged, output);

if (!(await exists(localConfig))) {
  await writeFile(localConfig, `${JSON.stringify({ repoRoot: '.', port: 5174, openBrowser: true }, null, 2)}\n`, 'utf8');
}

console.log(`LilyMap EXE 已生成：${output}`);
console.log(`项目配置：${localConfig}`);
