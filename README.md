# 🧰 软推

> 精选软件推荐 — 开发工具、效率软件、设计工具，每款都经过长期使用检验。

🔗 **[suxjtang.github.io/ruantui](https://suxjtang.github.io/ruantui/)**

---

## ✨ 功能

- 📋 **精选工具展示** — 工具卡片按分类展示，数量由数据库实时决定
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
├── effects.js             # 点击特效 / 视差
├── interactions.js        # 收藏 / 历史 / 评分等轻交互
├── engagement.js          # 阅读进度 / 仪表盘数据
├── mobile.js              # 移动端手势 / 安装引导
├── analytics.js           # 本地访问统计
├── apikey-config.js       # DeepSeek Key 说明（仓库内不存放任何 Key）
├── adsense.js             # Google AdSense（唯一的广告推送入口）
├── sw.js                  # Service Worker
├── manifest.json          # PWA 配置
├── sitemap.xml            # 搜索引擎站点地图
├── robots.txt             # 爬虫规则
├── icon.svg               # 站点 / PWA 图标（唯一图标源文件）
├── migration.sql          # Supabase 建表脚本
├── wrangler.jsonc         # Cloudflare Workers 部署配置
├── .dev.vars.example      # Worker 环境变量模板
├── .assetsignore          # 部署到 Worker 时不上传的文件（gitignore 语法）
├── .github/workflows/
│   └── keep-alive.yml     # 每日保活，防止 Supabase 免费版项目被暂停
└── img/                   # 头像 + 赞赏二维码
```

## 💾 数据来源与故障显示

工具数据**只有一个真实来源：Supabase 的 `tools` 表**。仓库里不存任何内置工具数据。

`data.js` 的加载策略：

| 情况 | 表现 |
|------|------|
| 正常 | 渲染数据库内容，并写入浏览器缓存 |
| 数据库不可用 + 有本地缓存 | 渲染缓存内容，标记为「离线数据」 |
| 数据库不可用 + 无缓存 | **显示「数据加载失败」+ 重试按钮** |
| 数据库为空 | 显示「暂无工具数据」 |

> **为什么不做「兜底假数据」**：v3.0 曾内置一份 40 条的兜底列表，其中 30 条是从未
> 真实推荐过的编造内容。Supabase 一旦不可用，页面不报错而是静默显示这 40 条假数据，
> 导致故障被伪装成「正常」，站长长期没发现。现在任何异常都会明确显示，绝不伪造数据。

### ⚠️ Supabase 免费版会自动暂停

免费版项目**7 天内活动过少就会被自动暂停**。暂停后：

- 域名解析失效（DNS 返回 NXDOMAIN）
- 网站显示「数据加载失败」
- 需要登录 Supabase 控制台点 **Resume project** 才能恢复（一年内可恢复，数据不丢）

本站流量低，很容易触发。仓库已带 `.github/workflows/keep-alive.yml` 每天请求一次
数据库来保活。启用方式：在仓库 **Settings → Secrets and variables → Actions** 添加：

| Secret | 值 |
|--------|-----|
| `SUPABASE_URL` | `https://你的项目id.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase 的 anon key（公开的客户端 key） |

未配置时工作流只输出警告，不会失败。

## 🔁 缓存版本号

站内所有同源静态资源都带版本查询串，**约定是「一个版本号，改两处」**：

| 位置 | 内容 | 本次值 |
|------|------|--------|
| `index.html` | 所有 `style.css?v=` / `*.js?v=` | `v=23` |
| `sw.js` | `CACHE_VERSION` | `'v31'` |

发版流程：

1. 把 `index.html` 里**全部** `?v=23` 统一改成新号（例如 `?v=23`）——新值必须全局一致，
   不要一个文件一个号（旧版本正是这样：`shared.js?v=2` … `adsense.js?v=5`，极易漂移）。
2. 把 `sw.js` 的 `CACHE_VERSION` 同时递增（例如 `'v31'`）。

两步必须成对执行。只改 `?v=` 不改 `CACHE_VERSION`，旧 SW 会继续用旧缓存；
只改 `CACHE_VERSION` 不改 `?v=`，浏览器 HTTP 缓存仍可能吐旧文件。

> `sw.js` 的预缓存清单里刻意不带 `?v=`，缓存 key 统一经 `cacheKey()` 剥掉 query，
> 所以页面 URL 的 `?v=` 与缓存 key 不一致也不会产生双份缓存。

`sw.js` 的取用策略：**导航（HTML）走 network-first**，部署后第一次访问就能拿到新页面；
**静态资源走 stale-while-revalidate**，首屏直接读缓存、后台静默更新。


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

## 🔑 管理员登录

点击页面「管理」按钮 → 用**管理员账号（邮箱 + 密码）**登录 → 进入管理面板。

权限完全由数据库控制，前端没有任何硬编码密码：

- 账号来自 Supabase Auth
- 是否可写由 RLS 的 `is_admin()` 判定：**当前登录用户的 UID 是否在 `admins` 表里**
- 前端就算被篡改，也只能被 RLS 拒绝

### 首次配置（一次性）

1. **建管理员账号**：Supabase Dashboard → Authentication → Users → **Add user**
   - 填邮箱和强密码，勾选 **Auto Confirm User**
2. **复制该用户的 UID**（形如 `8cb3a0dc-1ee1-4f19-a4b0-474e3957ac8f`）
3. **执行 `migration-auth.sql`**：把里面 `<管理员UID>` 换成你的 UID，
   然后粘贴到 SQL Editor 运行
4. 打开网站 → 点「管理」→ 用该账号登录

执行后可用这条 SQL 自检：

```sql
SELECT * FROM admins;   -- 应该有你那一行
```

> ⚠️ 本项目允许自由注册（Supabase 默认），所以**必须**用 `admins` 白名单判定，
> 不能只判断「已登录」——否则任何人注册个账号就能改你的数据。
> 如需彻底关闭注册：Dashboard → Authentication → Providers → Email
> → 关掉 "Allow new users to sign up"。

### 与旧「管理密码」的区别

| | 旧方案（已废弃） | 新方案 |
|---|---|---|
| 凭据 | 硬编码密码哈希 | Supabase 账号 |
| 校验位置 | Cloudflare Worker | 数据库 RLS |
| 需要后端 | 是（两个部署都没有，实际不可用） | 否 |
| 能否区分身份 | 否 | 是（能知道是谁改的） |
| 泄露后果 | 永久可登录 | 可单独停用某个账号 |

### 关于 `migration.sql`

`migration.sql` 是**早期的建表脚本**，其中预置的 25 条示例数据（VS Code、Figma 等）
与当前数据库中实际的内容**不是同一批**。如果是从零重建数据库，可以执行它来创建表结构，
但**务必用 `migration-auth.sql` 覆盖其中的写策略**（旧的是 x-admin-token 方案，已弃用），
并且不要直接导入那 25 条示例数据。

分类没有硬编码在代码里，由数据库每行的 `category` 字段动态生成筛选标签。

### Cloudflare Worker（可选，已不再是必需）

写操作已改为浏览器带用户 JWT 直连 Supabase，**Worker 不再参与权限控制**。
它目前只剩两个可选用途：`/api/click` 点击埋点、保活探测。若不需要可直接删除
`worker/` 与 `wrangler.jsonc`，项目即为纯静态站点。

### 静态资源公开范围（`.assetsignore`）
`wrangler.jsonc` 的 `assets.directory` 是仓库根目录，**默认会把整个仓库上传成公开资源**。
排除清单写在仓库根的 **`.assetsignore`**（gitignore 语法），已排除 `worker/index.js`
（Worker 源码）、`migration.sql`（完整库结构与 RLS 策略）、`wrangler.jsonc`、
`README.md` / `CHANGELOG.md` 以及所有根目录隐藏文件/目录。

> Wrangler 的 `assets` 配置**没有** `ignore` 字段，写进去只会得到一条
> "Unexpected fields found" 警告然后照常部署（静默失效）。排除只能靠 `.assetsignore`。
> 新增构建产物或敏感文件时，记得同步更新该文件。

## 🏗 架构概要

**读写分离架构**：
- **读操作**：浏览器直连 Supabase REST API（`anon` key + 公开可读 RLS 策略），无需认证
- **写操作**：浏览器 → Cloudflare Worker（密码验证 → 签发短时 token）→ Supabase REST
  （`anon` key + `x-admin-token` 请求头，由 RLS 的 `is_admin()` 放行）

**关键安全措施**：
- 管理密码验证在服务端完成（Worker），前端只保存会话级 token，不存储明文或哈希
- Supabase 写操作的授权由 RLS `is_admin()` 完成，凭据不下发到浏览器
- 管理 token 由 `TOKEN_SECRET` 签名、1 小时过期；缺失密钥时失败关闭
- 登录接口带按 IP 的失败限流（尽力而为）
- DeepSeek API Key **不存放于仓库**（明文、密文都不放），仅保存在使用者本机 `localStorage`，
  首次使用 AI 功能时手动输入一次

## 🤖 AI 功能与 DeepSeek Key

仓库里**不含任何** DeepSeek API Key。第一次点管理面板里的 🤖 按钮时会提示输入一次，
随后保存在本机 `localStorage`（键名 `deepseek_api_key`），不会上传，也不进仓库。

> 以前的做法是「把 Key 用管理密码加密后硬编码进 `apikey-config.js`」——**那层保护是假的**：
> 管理密码的哈希就写在同一个公开仓库里，而密码本身是弱口令，任何人都能反推出密码、
> 再解开密文取走 Key。所以该方案已被移除，且旧 Key 必须作废重签。

想让 AI 功能开箱即用又不想暴露 Key，正确做法是**由 Worker 代调用**：

```bash
wrangler secret put DEEPSEEK_API_KEY
```

然后在 `worker/index.js` 增加一个 `/api/ai` 路由，服务端带上 Key 请求 DeepSeek，
前端只调用自己的 `/api/ai`，永远拿不到 Key。实现之后可以删掉 `apikey-config.js`
及 `index.html` 里对它的 `<script>` 引用。

## 📄 许可

MIT License

## ⚠️ 已知限制

- **PWA 图标只有 `icon.svg`**。`manifest.json` 之前声明了 `192x192` / `512x512` 的等尺寸图标，
  但仓库里从来没有对应的 PNG 文件，浏览器会按 404 处理。现在统一改用矢量
  `{ "sizes": "any", "type": "image/svg+xml" }`，Chrome / Edge / Firefox 均可正确安装。
  iOS 主屏图标（Safari 不支持 SVG manifest 图标）暂缺，如需完美支持请补
  `icon-180.png` 并加 `<link rel="apple-touch-icon" href="icon-180.png">`。

