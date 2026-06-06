# CHANGELOG

本文件记录「软推」(原「我的工具箱」) 项目的所有重要变更。

---

## [1.4.2] — 2026-06-02

### 🔒 安全修复
- **XSS 防护**：`ui.js`、`modal.js`、`features.js` 中所有 `innerHTML` 拼接用户数据处改用 `escHTML()` 转义输出，防止跨站脚本注入
- 新增 `safeColor()` 校验函数，防止 CSS 注入
- **密码加固**：管理密码改为 SHA-256 哈希比较，不再以 base64 明文存储

### 🐛 修复
- `t.tags` 为空时 `.map()` 崩溃 → `Array.isArray` 守卫（`ui.js`、`modal.js`）
- `theme.js` `querySelector('i')` 返回 null 时崩溃 → 添加 null 检查
- `renderTools` / `renderMgmtList` 入口添加 `if (!tools || !grid)` 守卫
- 分享推荐语 `t.rating` 为 undefined 时显示 `"⭐ undefined/5"` → `|| '?'` 兜底
- `symbol` 参数名 `prompt` 遮蔽 `window.prompt` → 重命名为 `userPrompt`
- `callDeepSeek` 非 JSON 响应体调用 `.json()` 崩溃 → 检查 Content-Type
- QR 图片内联 `onerror` + `nextElementSibling` 可能为 null → 改用 JS 事件绑定
- 分享面板 `document.onclick` 直接覆盖 → 改用 `addEventListener`
- `beforeinstallprompt` 重复监听 → 添加 `{ once: true }`

### 🔄 Service Worker
- CACHE 名从 `Date.now()` 改为固定 `mytoolbox-v5`，避免孤立缓存堆积
- `c.addAll` 改为逐个 `c.add` + `.catch` 容错，单文件 404 不再阻止 SW 安装

---

## [1.4.1] — 2026-06-02

### 💰 广告接入
- 接入 Google AdSense 广告
- 新建 `adsense.js` 广告初始化模块
- `<head>` 加入 AdSense 脚本，启用 Auto Ads
- 顶部/底部广告占位替换为手动广告单元
- 广告激活后自动隐藏占位虚线框

### 🐛 修复
- 修复 AdSense 广告不显示：补充 `data-ad-client` 和 inline push
- 修复分享按钮无效：`shareCopyText` 补充点击事件绑定
- 修复 `tags` 为空时页面崩溃：`renderTools` 增加 `Array.isArray` 防御性检查
- 修复浏览量无回滚：`incrementView` 改为服务器响应成功后再更新本地计数
- 清理 `showToast` 中无效的 `color:#fff` 死代码

### ✨ 新增
- 添加「回到顶部」按钮

---

## [1.4.0] — 2026-05-31

### 🔒 API Key 加密存储
- DeepSeek API Key 使用管理密码加密存储，外人不可见
- 加密采用 AES-GCM，密文写入 `apikey-config.js`
- 解密仅在管理面板输入密码后生效，前后端分离模式下保护密钥安全

### 🐛 修复
- 修复 401 未授权响应导致的无限循环刷新和竞态条件

---

## [1.3.1] — 2026-05-29

### ☁️ Cloudflare Pages 部署
- 新增 `wrangler.jsonc` — Cloudflare Pages 部署配置
- 新增 `.gitignore` — 排除 `.wrangler`、`node_modules`、`.env` 等无关文件
- 配置 SPA fallback（`not_found_404` → `/index.html`）

### 👁 工具浏览计数
- 卡片和弹窗新增浏览量显示
- 支持按浏览量热门排序
- 新增 `migration.sql` — 包含 `views` 字段迁移 SQL
- 新增 `incrementView` API（`supabase.js`）

### ☀️ 默认主题优化
- 默认主题改为白天模式，不再跟随系统暗色偏好
- 用户手动切换的暗色/亮色模式不受影响

### 🖼 其他
- 头像更换为 `img/touxiang.jpg`

---

## [1.3.0] — 2026-05-25

### 🏷️ 品牌升级
- 网站正式更名：**我的工具箱 → 软推**
- 新增 `README.md` 项目文档

### 🔍 SEO 全面优化
- 新增 `meta` / Open Graph / Twitter Card 标签
- 新增 JSON-LD 结构化数据
- 新增 `robots.txt` 和 `sitemap.xml`
- 添加 Google Site Auth 验证文件

---

## [1.2.0] — 2026-05-24

### 🐛 修复
- 修复选框退出交互问题
- 自定义删除确认弹窗（替代原生 `confirm`）
- 修复小屏设备图标尺寸
- 修复三项：favicon 显示、SW 即时激活、密码 base64 编码
- 修复支付宝二维码文件扩展名
- 修复二维码分享 URL 查询参数叠加问题

### 🔄 Service Worker
- SW 缓存名自动生成（不再需要手动升级版本号）
- SW v4 强制刷新缓存
- SW v5

### 🔍 UI 细节
- 卡片图标放大（img 22→28→32px，i 18→24→28px）
- 置顶图标改为精美「推荐」渐变徽章

### 📱 PWA
- manifest 使用相对路径，兼容 localhost 和 GitHub Pages
- 修复 GitHub Pages PWA `start_url` 路径
- 重写 PWA 安装逻辑：按钮按需显示、去除自动弹窗、iOS/Chrome 安装指引

### 💰 赞赏
- 更新赞赏二维码图片
- 赞赏码点击放大 — 丝滑缩放动画

### 🔧 功能完善
- 分享面板 URL 修复
- 深链接支持
- 图标字段完善
- 卡片 Grid 布局 + 排序 + 页脚日期

### ✨ 背景特效
- 暗色模式：流星特效
- 亮色模式：落花特效

---

## [1.1.0] — 2026-05-24

### 🗑️ 移除评分
- 卡片和弹窗均不再显示星级/评分
- 移除卡片星级星星渲染

### ✨ UI 全面优化
- 卡片图标渐变遮罩
- 骨架屏脉冲动画替代 loading spinner
- 搜索栏聚焦撑开 + 品牌 hover 动画
- 暗色模式卡片提亮 + 对比度增强
- Toast 顶部滑入 + 彩色左边框 + 图标
- 移动端触控区域 ≥36px + 管理弹窗全宽适配

### 🔧 修复与改进
- GitHub 导出改为 JSON 下载
- 下载链接改为可选
- 添加加载 spinner 动画
- 离线时 localStorage 缓存兜底

---

## [1.0.0] — 2026-05-24

### 🗄️ 数据架构重构（重大变更）
- **迁移到纯 Supabase 数据源**，移除 `BASE_TOOLS` 硬编码和 localStorage 合并逻辑
- 新增 `tools` 表替代 `toolbox_data`
- `supabase.js` 重构为 `fetchTools` / `updateTool` / `insertTool` / `removeTool` API
- `features.js` CRUD 操作改为直接调 Supabase
- `ui.js` 渲染改用 `t.pinned` 替代 localStorage 读取
- Service Worker 缓存版本升级到 v2
- 修复 `icon_url` → `iconUrl` 列名匹配

### ☁️ Supabase 接入
- 接入 Supabase 云端数据同步

### 🔗 推广链接
- 移除推广链接，官网和下载默认不显示

### 📱 PWA 安装引导
- 完善安装引导流程
- 优化安装提示文案
- 安装按钮适配 iOS 提示
- 添加安装 APP 按钮
- PWA 修复：SVG 图标 + 安装提示
- 添加 PWA 支持 + 手机适配优化

### 🐛 修复
- 修复移除评分导致的编辑功能失效

### 📌 置顶功能
- 添加置顶功能
- Notion 默认置顶

### 🏗 架构
- v2 重建完成

---

## [0.2.0] — 2026-05-20

### 📖 文档
- 完善 README 项目说明
- 添加 MIT 开源许可证

### 🔧 部署
- 改回相对路径，适配 GitHub Pages
- 使用 Gitee raw 绝对路径

### 🔒 安全
- 管理员认证持久化 + 退出登录功能
- 管理功能增加管理员密码保护

### 🧰 项目启动
- 「我的工具箱」— 个人软件推荐工具上线

---

## [0.1.1] — 2026-05-17

### 🎯 仓库标准化
- 仓库标准化整理
- 新增 `CHANGELOG.md`
- 清空仓库，准备从头开始

---

## [0.1.0] — 2025-05-27

### ✨ 初始版本
- 银杏叶 PNG-SVG 动态背景演示页面
- 银杏叶精美拖尾特效
- 鼠标交互效果
- 响应式设计
- 性能优化、内存占用降低

---

> 格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，  
> 版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。
