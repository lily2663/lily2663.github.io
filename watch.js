#!/usr/bin/env node
/**
 * 文件监听：posts/ 下任意 .md 变动 -> 自动跑 generate.js
 * 用法：node watch.js   （Ctrl+C 退出）
 *
 * 适合本地边写边看：把 .md 甩进 posts/，几秒后刷新浏览器即可看到新文章，
 * 不用手动敲构建命令。部署到 GitHub 后则无需本脚本，推送即自动构建发布。
 */
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const ROOT = __dirname;
const POSTS_DIR = path.join(ROOT, "posts");
const GENERATE = path.join(ROOT, "generate.js");
const NODE = process.execPath;

if (!fs.existsSync(POSTS_DIR)) fs.mkdirSync(POSTS_DIR, { recursive: true });

let timer = null;
function rebuild() {
  clearTimeout(timer);
  timer = setTimeout(function () {
    execFile(NODE, [GENERATE], function (err, stdout) {
      if (err) { console.error("构建失败：", err.message); return; }
      process.stdout.write(stdout);
    });
  }, 300);
}

console.log("👀 监听 posts/ 中的 .md 变化，自动重建中…（Ctrl+C 退出）");
fs.watch(POSTS_DIR, { recursive: false }, function (event, filename) {
  if (!filename || !/\.md$/i.test(filename)) return;
  console.log("· 检测到 " + filename + " 变化，重建中…");
  rebuild();
});
