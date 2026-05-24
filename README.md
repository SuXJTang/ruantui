# 🧰 软推

> 精选软件推荐 — 开发工具、效率软件、设计工具，每款都经过长期使用检验。

🔗 **[suxjtang.github.io/ruantui](https://suxjtang.github.io/ruantui/)**

---

## ✨ 功能

- 📋 **精选工具展示** — VS Code、Figma、Notion 等 25+ 款工具卡片
- 🔍 **搜索 + 分类筛选** — 按名称、标签、分类快速定位
- 🔗 **分享** — 生成二维码、复制推荐语、深链接直达
- 🛠 **管理面板** — 密码保护，增删改工具、置顶，数据实时同步 Supabase
- 🤖 **AI 辅助** — DeepSeek 自动生成工具评语和使用说明
- 🌓 **暗色模式 + 5 色主题** — 暗色流星 / 亮色落花背景特效
- 📱 **PWA** — 可安装到桌面，离线可用
- 🔗 **一键导出** — JSON 格式数据备份

## 🏗 技术栈

| 分类 | 技术 |
|------|------|
| 前端 | HTML + CSS + Vanilla JS |
| 数据库 | Supabase (PostgreSQL) |
| 部署 | GitHub Pages |
| AI | DeepSeek API |
| PWA | Service Worker |

## 📂 项目结构

```
ruantui/
├── index.html        # 主页面
├── style.css          # 样式
├── data.js            # 数据加载（Supabase）
├── supabase.js        # Supabase API 封装
├── features.js        # 交互逻辑（搜索/CRUD/AI/分享）
├── ui.js              # 卡片渲染
├── modal.js           # 详情弹窗
├── theme.js           # 5 色主题 + 暗色模式
├── particles.js       # 背景特效（流星 / 落花）
├── sw.js              # Service Worker
├── manifest.json      # PWA 配置
├── migration.sql      # Supabase 建表脚本
└── img/               # 赞赏二维码
```

## 🚀 本地运行

```bash
npx serve . -p 8080
```

打开 http://localhost:8080

## 🔑 管理密码

点击页面「管理」按钮，输入密码进入管理面板。

## 📄 许可

MIT License
