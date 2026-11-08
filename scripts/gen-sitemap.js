'use strict';
// 根据数据库里的工具生成 sitemap.xml
const { execFileSync } = require('child_process');
const fs = require('fs');

const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bHlrY3NlZXBza3hjY2R4bXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MDA2MjksImV4cCI6MjA5NTE3NjYyOX0.oc8MKQ56zk585KgKPXXah_fsLzC5VZqHihOsCWH_zhE';
const HOST = 'gxlykcseepskxccdxmxc.supabase.co';
const IP = '104.18.38.10';
const BASE = 'https://luoluo.fun';

function q(path) {
    const out = execFileSync('curl.exe', ['-s', '-m', '30', '--proxy', 'http://127.0.0.1:7897',
        '--resolve', HOST + ':443:' + IP, '-H', 'apikey: ' + KEY, '-H', 'Authorization: Bearer ' + KEY,
        'https://' + HOST + path], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    return JSON.parse(out);
}

const rows = q('/rest/v1/tools?select=id,name,category,updated_at&order=id.asc');
console.log('获取到 ' + rows.length + ' 个工具');

// 统一的更新日期
const today = new Date();
const ymd = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  软推 sitemap
  由 scripts/gen-sitemap.js 根据数据库内容生成，请勿手工编辑。
  包含：首页 + 每个工具的独立页面 /t/{id}
  注意：本站是单页应用，分类筛选没有独立 URL（/#ai 这类带 fragment 的
  地址会被搜索引擎忽略），所以不列入。
-->
<urlset xmlns="${'http://www.sitemaps.org/schemas/sitemap/0.9'}">
  <url>
    <loc>${BASE}/</loc>
    <lastmod>${ymd}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
`;

// 工具页：按 id 排序，priority 依评分微调
rows.forEach(r => {
    xml += `  <url>
    <loc>${BASE}/t/${r.id}</loc>
    <lastmod>${ymd}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
`;
});

xml += '</urlset>\n';

fs.writeFileSync('D:\\GitHub\\ruantui\\sitemap.xml', xml, 'utf8');
console.log('已生成 sitemap.xml，共 ' + (rows.length + 1) + ' 个 URL');

// 同步更新 robots.txt 里的 sitemap 地址（已存在则跳过）
const robotsPath = 'D:\\GitHub\\ruantui\\robots.txt';
if (fs.existsSync(robotsPath)) {
    let robots = fs.readFileSync(robotsPath, 'utf8');
    if (robots.indexOf('Sitemap:') < 0) {
        robots = robots.trimEnd() + '\n\nSitemap: ' + BASE + '/sitemap.xml\n';
        fs.writeFileSync(robotsPath, robots, 'utf8');
        console.log('已补充 robots.txt 的 Sitemap 声明');
    } else {
        console.log('robots.txt 已有 Sitemap 声明，跳过');
    }
}
