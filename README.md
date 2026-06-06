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
| 后端 | Cloudflare Worker（管理 API）|
| 数据库 | Supabase (PostgreSQL) |
| 部署 | Cloudflare Workers + GitHub Pages |
| AI | DeepSeek API |
| PWA | Service Worker |

## 📂 项目结构

```
ruantui/
├── worker/
│   └── index.js          # Cloudflare Worker — 管理端 API 代理
├── index.html             # 主页面
├── style.css              # 样式
├── shared.js              # 全局状态 + 共享工具函数
├── data.js                # 数据加载（Supabase + localStorage 缓存）
├── supabase.js            # Supabase / Worker API 封装
├── ui.js                  # 卡片渲染 + 搜索 + 分类
├── modal.js               # 详情弹窗
├── features.js            # 交互逻辑（管理 CRUD / AI / 分享 / 公告）
├── theme.js               # 5 色主题 + 暗色模式
├── particles.js           # 背景特效（流星 / 落花）
├── apikey-config.js       # DeepSeek API Key 加密存储
├── adsense.js             # Google AdSense
├── sw.js                  # Service Worker
├── manifest.json          # PWA 配置
├── migration.sql          # Supabase 建表脚本
├── wrangler.jsonc         # Cloudflare Workers 部署配置
├── .dev.vars.example      # Worker 环境变量模板
└── img/                   # 赞赏二维码
```

## 🚀 本地开发

### 前端调试（静态页面）
```bash
npx serve . -p 8080
```
打开 http://localhost:8080 — 页面正常浏览，但管理面板需要 Worker 服务。

### 完整环境（含 Worker API）
```bash
# 1. 安装 wrangler
npm install -g wrangler

# 2. 配置环境变量
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars 填入 Supabase Service Role Key + Token Secret

# 3. 启动本地开发服务器
wrangler dev
```

## 🔑 管理密码

点击页面「管理」按钮，输入密码进入管理面板。  
密码验证由 Cloudflare Worker 服务端完成（SHA-256 哈希比对，避免前端明文泄露）。

### 部署前设置 Worker 环境变量
```bash
# 生成密码哈希（Node.js）
node -e "console.log(require('crypto').createHash('sha256').update('你的密码').digest('hex'))"

# 设置 Worker 密钥（推荐用 wrangler secret，不写进代码）
wrangler secret put ADMIN_PASSWORD_HASH
wrangler secret put SUPABASE_SERVICE_KEY
wrangler secret put TOKEN_SECRET
```

## 🏗 架构概要

**读写分离架构**：
- **读操作**：浏览器直连 Supabase REST API（公开可读 RLS 策略），无需认证
- **写操作**：浏览器 → Cloudflare Worker（密码验证）→ Supabase Service Role Key（绕过 RLS）

**关键安全措施**：
- 管理密码验证在服务端完成（Worker），前端不存储明文或哈希
- Supabase 写操作走 Service Role Key，不受 RLS 限制
- DeepSeek API Key 使用 AES-256-GCM 加密硬编码，仅管理密码可解密

## 📄 许可

MIT License
