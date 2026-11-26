#!/usr/bin/env node
// scripts/bump-version.js — 一次性递增三处缓存版本号（v4 灯塔地基）
// 用法：node scripts/bump-version.js
// 作用：
//   index.html  所有 ?v=N  →  ?v=N+1
//   sw.js       CACHE_VERSION = 'vN'  →  'vN+1'
//   README.md   表格里的示例值同步为新的 v=N / 'vN'
// 只要改动 JS/CSS，发布前跑一次即可，避免三处漂移（历史上多次版本不一致）。
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function read(f) { return fs.readFileSync(path.join(root, f), 'utf8'); }
function write(f, s) { fs.writeFileSync(path.join(root, f), s); }

// 1) index.html —— 找到现有 ?v=NN 的最大值，统一 +1
let html = read('index.html');
const vNums = [...html.matchAll(/\?v=(\d+)/g)].map(m => parseInt(m[1], 10));
if (!vNums.length) { console.error('index.html 里没找到 ?v=NN'); process.exit(1); }
const oldV = Math.max(...vNums);
const newV = oldV + 1;
html = html.replace(/\?v=\d+/g, '?v=' + newV);
write('index.html', html);

// 2) sw.js —— CACHE_VERSION 'vN' +1
let sw = read('sw.js');
const m = sw.match(/CACHE_VERSION\s*=\s*'v(\d+)'/);
if (!m) { console.error('sw.js 里没找到 CACHE_VERSION'); process.exit(1); }
const oldCache = m[1];
const newCache = String(parseInt(oldCache, 10) + 1);
sw = sw.replace(/CACHE_VERSION\s*=\s*'v\d+'/, "CACHE_VERSION = 'v" + newCache + "'");
sw = sw.replace(/\?v=\d+/g, '?v=' + newV); // 注释里的旧版本号也顺手对齐
write('sw.js', sw);

// 3) README.md —— 同步表格示例（v=数字 / 'v数字'）
let readme = read('README.md');
readme = readme.replace(/`v=\d+`/g, '`v=' + newV + '`');
readme = readme.replace(/`'v\d+'`/g, "`'v" + newCache + "'`");
write('README.md', readme);

// 4) AGENTS.md —— 尾注的「最后更新 / 对应版本」必须由脚本写。
//    这份文件是给 AI 助手读的规范，基线版本号写错会让下次 bump 算错、
//    或者撞回旧号导致 SW 缓存混乱。手抄必然漂移。
try {
  let agents = read('AGENTS.md');
  const today = new Date();
  const stamp = today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0');
  agents = agents
    .replace(/^\*\*最后更新\*\*：.*$/m, '**最后更新**：' + stamp)
    .replace(/^\*\*对应版本\*\*：.*$/m, '**对应版本**：?v=' + newV + ' / CACHE_VERSION v' + newCache)
    // 速查命令里的示例 URL 也跟着走，避免复制粘贴验了个旧版本
    .replace(/luoluo\.fun\/style\.css\?v=\d+/g, 'luoluo.fun/style.css?v=' + newV);
  write('AGENTS.md', agents);
} catch (e) {
  console.warn('提示：AGENTS.md 未同步（' + e.message + '）');
}

console.log('版本已递增：');
console.log('  index.html  ?v=' + oldV + ' → ?v=' + newV + '（' + vNums.length + ' 处）');
console.log('  sw.js       v' + oldCache + ' → v' + newCache);
console.log('  README.md   已同步');
console.log('  AGENTS.md   尾注已同步');
