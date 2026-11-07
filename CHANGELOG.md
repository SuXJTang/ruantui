# 更新日志 (CHANGELOG)

## v3.1.1 — 2026-11-08

**凭据泄露修复**。本版只做安全加固，不改任何业务功能。

### 已确认的真实泄露（需你尽快轮换）

- **管理员密码可被反推**。`.dev.vars.example` 里提交了真实的 `ADMIN_PASSWORD_HASH`，
  实测其明文可被直接命中（弱口令，此处不再复述具体值），即管理面板等同于对所有人开放。
  该哈希自项目早期就存在于公开仓库中，历史版本还另有一个旧密码的哈希。
- **DeepSeek API Key 可被解密取走**。`apikey-config.js` 里的「管理密码加密」是假防护：
  解密用的密码就是上面那个公开可反推的管理员密码，实测可成功解出真实 Key（35 位）。
  该 Key 的明文在历史提交中曾直接以明文存在过，因此**无论如何改密码，
  Key 都必须视为已泄露并作废**。

> 这两个凭据都已进入 git 历史，仅改当前文件无法真正收回。
> 必须去对应平台**重新签发**，见文末「必须手动完成的处置」。

### 修复

- `.dev.vars.example`：三个变量全部改为空占位，删除真实哈希；补充「本文件只放占位符」的警示。
- `apikey-config.js`：删除内置的 API Key 密文与盐/IV，改为纯说明文件。
  仓库里不再存放任何 API Key（明文、密文都不放），Key 只留在使用者本机 `localStorage`。
- `features.js`：移除 `decryptApiKey` / `tryDecrypt` / `_hexToBytes` 等整套假加密逻辑
  （含登录成功后那次无意义的 `await tryDecrypt(v)`），以及首次使用时的
  「先输管理密码再输 Key」的冗余二次询问。现在直接询问一次 Key 并保存在本地。
  移除后 `_hexToBytes` 等已无引用，一并删除。
- `worker/index.js`：登录接口对 `ADMIN_PASSWORD_HASH` 增加**格式强校验**
  （必须为 64 位十六进制 SHA-256），空值或误填明文密码时直接返回 500 失败关闭，
  避免「未配置」被当成可登录状态。

### 验证

- 浏览器实测：40 张卡片正常渲染、AI 三个按钮入口存在、取消输入不抛异常并回退默认文案、
  管理面板按钮可点，全程无未捕获异常。
- Worker 实测 11 项：空哈希 / 未定义 / 明文冒充哈希 / 过短 hex 均 500 失败关闭；
  正确哈希放行签发 token；错误密码 401；缺失 `TOKEN_SECRET` 500；
  `/api/click` 免鉴权 204；管理路由无 token 401。
- 源文件扫描：`apikey-config.js`、`features.js` 中不再有 `sk-` 密钥或长 hex 密文；
  `.dev.vars.example` 无 64 位哈希。

### 必须手动完成的处置（代码改不了）

1. **作废并重新签发 DeepSeek API Key**：https://platform.deepseek.com/api_keys
   （旧 Key 已可从 git 历史还原，必须吊销）。
2. **改管理密码**（不要沿用任何历史用过的密码），重新生成哈希后设置：
   ```bash
   node -e "console.log(require('crypto').createHash('sha256').update('新密码').digest('hex'))"
   wrangler secret put ADMIN_PASSWORD_HASH
   wrangler secret put TOKEN_SECRET          # 随机 32 字节 hex
   wrangler secret put SUPABASE_ADMIN_TOKEN  # 与 Supabase app.admin_token 一致
   ```
3. **轮换 Supabase `app.admin_token`**（若曾写进过任何公开位置）。
4. **已执行：历史重写**。本次已用 `git filter-repo --replace-text` 对全部历史做了一次
   凭据替换，抹除了 2 个管理员密码哈希、1 个 DeepSeek Key 明文、以及该 Key 的密文 / 盐 / IV，
   共 6 处。**副作用**：所有提交哈希都已改变，已有克隆必须重新拉取：
   ```bash
   git fetch --all
   git reset --hard origin/master
   # 旧分支若报错，先 git remote prune origin 再核对
   ```
   > ⚠️ 重写历史**不能**替代轮换：泄露期间可能已被抓取、fork 或缓存。
   > 上面 1–3 项仍必须执行。

---

## v3.1.0 — 2026-11-07

维护性修复：只修 bug，不新增功能、不改视觉与交互。共修复 30+ 处真实缺陷，
其中 5 处会直接导致线上功能不可用（详见「严重」小节）。

### 修复 — AdSense 初始化
- 删除广告位 ① / ② 两处内联 `(adsbygoogle = window.adsbygoogle || []).push({})`。
  库到位前 `window.adsbygoogle` 只是普通数组，`push` 仅入队、不会报错，但**每多一次 push
  就会去填下一个 ins**，于是同一个广告位被填两次，触发
  "All ins elements in the adsbygoogle array are already filled"。
  现在 `index.html` 里零内联 push，推送只发生在 `adsense.js`。
- `adsense.js` 改为**每个 `<ins class="adsbygoogle">` 各 push 一次**（v3 只 push 一次，
  顶/底/内嵌 3+ 个广告位里其余 ins 永远空白）。
- 广告拦截检测不再往 `<body>` 塞一个 `class="adsbygoogle"` 的探测元素——它会被当成一个
  「未填充的 ins」，把 push 吞掉并造成错位填充。改用 Google 自身的能力探测，零 DOM 污染。
- 内嵌广告位由 `MutationObserver` 自动接管：`ui.js` 动态插入后无需自己 push（见下「需要其他文件配合」）。

### 修复 — Service Worker 缓存策略（sw.js）
- 导航请求（HTML）由 cache-first 改为 **network-first**：旧逻辑永远先返回缓存里的旧 `index.html`，
  部署后要「访问第二次」才能看到新版本。
- 静态资源由 `return cached || fetchPromise` 改为 **stale-while-revalidate**：先秒开缓存，
  同时后台拉取新版本并写回，下次访问即最新。旧写法让后台那次写缓存完全失去意义。
- 缓存 key 统一经过 `cacheKey()` 归一化（剥掉 `?` 与 `#`）：页面请求 `style.css?v=11`、
  预缓存的是 `./style.css`，query 不同导致每次访问都 MISS 并重复缓存同一文件。
  归一化同时作用于读取与写入，所以不会出现 `style.css` 的两份缓存。
  （`caches.match` 的 `ignoreSearch` 只解决读、不解决写，因此没有采用它。）
- 预缓存清单去掉 `sitemap.xml` / `robots.txt`（搜索引擎抓取用，非页面依赖）。
- 跨域资源（FontAwesome / AdSense / 二维码 API）不再进 SW 缓存路径，交给浏览器处理。
- `CACHE_VERSION` 由 `v17` 递增至 `v19`（v18 为中间态）。

### 修复 — 缓存版本号约定（index.html / README）
- 原来各资源版本号手工维护且互不相同（`shared.js?v=2`、`ui.js?v=6`、`adsense.js?v=5` …），
  必然与 SW 版本漂移。现在统一为**单一版本号 `?v=11`**，与 `sw.js` 的 `CACHE_VERSION`
  （`'v19'`）成对递增；约定写入 README「缓存版本号」一节的表格与发版流程。
- `shared.js` 的 `rel=preload as=script` 删除：`shared.js` 是同步阻塞脚本，preload 之后
  还要再解析一次，纯属浪费一次预加载（还会和紧随其后的真实 `<script>` 重复下载风险）。
- `style.css` 保留 preload，但补上配套的 `onload="this.rel='stylesheet'"` + `<noscript>` 回退
  （原来只有 `preload` 没有消费逻辑，属「preloaded but not used」告警源）。

### 修复 — PWA 图标（manifest.json）
- 删掉 `192x192` / `512x512` / `144x144` 等**仓库中并不存在**的尺寸声明——都指向同一个
  `icon.svg`，浏览器会按声明的尺寸找 PNG 而 404。统一改为 `sizes: "any"`（`any` + `maskable` 两条）。
- 新增 `id` 字段，避免以后改 `start_url` 时被识别为另一个应用、产生重复安装。
- `shortcuts` 第一条 `?action=search` 改成可用地址：代码里从未读取 `action` 参数。

### 修复 — SEO
- `sitemap.xml` 删掉 `#development` / `#ai` / `#design` / `#efficiency` 四条带 fragment 的地址：
  搜索引擎会忽略 `#` 之后的部分，这几条实际都指向同一个首页，属重复内容；`lastmod` 同步更新。
- `robots.txt` 本身已经正确（绝对 URL 指向 sitemap），未改动。
- 文案统一：页面/结构化数据中的「40+ 款」改为「40 款」，与 `data.js` 中
  `FALLBACK_TOOLS` 的实际条数（40）一致；README 中「25+ 款工具」同步修正为「40 款，7 大分类」。
  （已发布的 v3.0.0 条目里的历史表述保留不动。）

### 修复 — 其他
- 广告位占位骨架的 CSS 由 `.ad-container .adsbygoogle` 改为 `index.html` 内的
  `.ad-container:not(.ad-active)::after`：不再给 Google 的 `<ins>` 打样式。
- 广告位 `checkAndHideEmpty` 重写：原逻辑用 `textContent.length > 3` 判断「有没有广告」，
  而 `<ins>` 内正留着「赞助内容」占位文字，该判断恒为真 —— 没有广告时容器永远不会被隐藏
  （与提交 `def641a fix: 广告未加载时自动隐藏容器不留空白` 的意图相反）。现改为看
  Google 打的 `data-ad-status` / 是否有 iframe。

### 复核后确认「不是 bug」的点
- **AdSense 加载器的 `async` 标记本身没问题。** Google 官方文档 [An async script for AdSense
  tagging](https://developers.googleblog.com/en/an-async-script-for-adsense-tagging/) 明确给出
  的写法就是 `<script async src=".../adsbygoogle.js">` 加 `push({})`：库到位前
  `window.adsbygoogle` 是普通数组，push 只是入队，库加载后自动消费。真正的问题在于
  **push 次数与 ins 数量不匹配**（见上），不是「push 早于 async 加载器」。
- **`<link rel="preload" href="style.css" as="style">` 与随后同 URL 的 `<link rel="stylesheet">`
  配对是正确的**，不会触发 "preloaded but not used"；本次只额外补了 `onload` 消费与
  `<noscript>` 回退，让它在 JS 关闭时也成立。
- **`robots.txt` 原本就是对的**（绝对 URL 指向 sitemap），未改动。
- **页脚日期的 `id="footerDate"` 原本就是对的**（`features.js` 查的正是这个 id），未改动。
- **`icon.svg` 中引用的 `.png` 图标从来不存在** —— 但 manifest 里写的是 `icon.svg`，
  没有引用任何缺失的 PNG 文件；问题在于把 SVG 谎报成 `192x192` / `512x512`。

### 严重 — 导致功能直接不可用
- **每次渲染都重复注册卡片点击监听（ui.js）**。`renderTools()` 里的两个
  `grid.addEventListener('click', <新函数>)` 每渲染一次就多挂两个。DOM 规范只会在
  type + 监听器**同一函数对象** + capture 全相同时才去重，而每次都是新的函数表达式，
  所以无限累积。实测同一会话内点击卡片：1 次渲染后 3 个监听、4 次渲染后 9 个、
  再加两次搜索 13 个。现改为模块作用域注册一次，实测恒定 2 个（`modal.js` 开卡片 +
  `ui.js` 埋点）。
- **`openDetail()` 从未定义**。ui.js 的卡片点击处理器调用它，导致每次点卡片都抛
  `ReferenceError: openDetail is not defined`（实测于 HEAD）。现已删除该处理器，
  卡片点击由 `modal.js` 唯一负责。
- **Supabase 数据行的「去使用」按钮全部失效**。`getToolLink()` 只看
  `affiliateUrl || link`，而 `migration.sql` 的 `tools` 表只有 `url` / `download`，
  所以线上每一行都渲染成不可点的「📋 查看详情」。现优先级为
  `affiliateUrl > link > url > download`。
- **管理面板「编辑」按钮完全无反应**。`App.state.tools.find(function(x){…}.bind(this))`
  里 `bind` 绑的是**回调**而不是外层函数，`this` 成了 `window`，`this.dataset` 取不到，
  `parseInt(undefined)` 得 `NaN`，查不到工具就静默 `return`。改用 `byId()` 辅助函数。
- **公告管理「编辑」必然崩溃**。`openAnnForm` 对同一个元素先设 `.textContent` 再读 `.value`，
  对 `<h2>` 取 `.value` 得 `undefined`，后续 `ann.title` 拼接抛 TypeError，弹窗永远打不开。
  已拆成标题用 `textContent`、输入框用 `.value`。

### 安全 — Worker 静态资源暴露（wrangler.jsonc / .assetsignore）
`assets.directory` 指向仓库根目录，而 Wrangler **没有** `assets.ignore` 配置字段
（只有 `directory` / `binding` / `html_handling` / `not_found_handling` / `base_path` /
`run_worker_first`；写别的键只会得到 "Unexpected fields found" 警告然后**照常部署**，
即静默失效）。真正的排除机制是 assets 目录根部的 `.assetsignore`（gitignore 语法，
见[官方文档](https://developers.cloudflare.com/workers/static-assets/binding/#ignoring-assets)）。

- 新增仓库根 `.assetsignore`：排除 `worker/index.js`（Worker 源码）、`migration.sql`
  （完整库结构 + RLS 策略）、`wrangler.jsonc`、`README.md` / `CHANGELOG.md`、
  所有根目录隐藏文件与目录（`.*`，gitignore 的 `*` 不匹配 dotfile，必须单独写）。
  实测 27 个运行时资源照常下发，敏感文件全部排除。
- **保留 `img/`**：`touxiang.jpg`（头像）、`vx.jpeg` / `zhifub.jpeg`（收款码）都是线上资源。

### 安全 — Worker 鉴权
- **删除硬编码兜底密钥**。原 `env.TOKEN_SECRET || 'ruantui-secret'` 的兜底值明文写在
  公开仓库里，任何人都能伪造管理员 token。现在缺失 `TOKEN_SECRET` 时直接失败关闭
  （login 返回 500、管理路由 401）。**部署前必须执行 `wrangler secret put TOKEN_SECRET`**。
- **登录接口加限流**：同一 IP 10 次失败 / 10 分钟，返回 `429` + `Retry-After`；
  成功登录清零计数。仅内存态、不跨 isolate，属尽力而为的减速带（真正的硬限流应交给
  Cloudflare Rate Limiting 规则）。
- **`timingSafeEqual` 提前返回泄露长度**：先做 SHA-256 摘要再比较，消除长度差异。
- **错误响应不再回显 `e.message`**，避免把内部细节吐给客户端。
- **CORS 头跨请求串源**：`jsonResponse` 原先读模块全局 `_currentRequest`，同一 isolate
  并发请求会拿到别人的 `Origin`。改为每请求计算一次并显式传入。
- **404 回退丢请求体**：`new Request(url)` 会把方法重置成 GET 并丢掉头/体，
  改为 `new Request(fallbackUrl, request)`。

### 修复 — `/api/click` 埋点接口
- `ui.js` 一直在 POST `/api/click`，但 Worker 里**没有这个路由**，每次点击都 401/404。
  现补上公开路由（无需鉴权、不触碰 Supabase、返回 204）。
- 刻意**不限制 HTTP 方法**：任何方法都回 204 而不是 401，避免客户端把它误当鉴权失败去重试。
- 客户端侧同步加固：`keepalive: true` 让 beacon 在跳转后仍能发出；`!res.ok` 与网络异常
  一律静默吞掉（GitHub Pages 部署下 `/api/*` 必然 404，绝不能影响「去使用」跳转）。

### 修复 — 图标
- 4 个工具补上正确的 simple-icons slug：`photopea`、`virustotal`、`ffmpeg`、
  `ublockorigin`（注意不是 `ublock-origin`）。原先这些工具只靠 FontAwesome 字形。
- `Everything` / `Rectangle` / `PotPlayer` / `Vimium` 在 simple-icons 目录中确实不存在，
  保留 FontAwesome 字形作为兜底（`icon` 字段仍是 `<img>` 失败时的备选）。

### 修复 — 其他前端缺陷
- **排序被重复监听**：ui.js 与 features.js 都挂了 `sortSelect` 的监听，features.js 的
  `onchange` 会先从 `_originalTools` 还原再排序，而 ui.js 的监听又基于已排序数组重渲染，
  把「恢复默认顺序」抵消掉。现由 features.js 单独负责。
- **名称含引号时内联 `onclick` 语法错误**：`trackToolClick(id,'NAME')` 由 `escHTML`
  拼接（`'` 变 `&#39;`），工具名带引号就把属性截断。改为 `data-aff-id` + 委托监听。
- **`fuzzyMatch(x, '')` 恒为 true**：空查询会走完零长度的子序列循环并返回 true，
  搜索框清空后仍按「匹配」处理。现空/纯空白查询直接返回 false。
- **`highlightText` 查询比正文长时切片错位**：补长度前置判断。
- **模态框缺元素时整个文件挂掉**：`openModal` / `closeModal` / 事件绑定全部加空值保护
  （原先缺 `#modalClose` 会在加载期抛错，导致 modal.js 后面所有绑定失效）。
- **广告位重复 push**：`ui.js` 动态插入内嵌广告后又手动 `window.adsbygoogle.push({})`，
  与 `adsense.js` 的 `MutationObserver`（按 ins 去重、视口内懒加载）重复，同一个 ins
  被填两次。现已删除手动 push，广告填充统一由 `adsense.js` 负责。

---

## v3.0.0 — 2026-08-02

十次大迭代完整升级，从工具推荐页进化为高交互、高性能、可分析的 PWA 应用。

### 迭代 1/10 — 内容大扩张
- 工具数量从 9 款扩展至 40+ 款
- 新增 7 大分类：AI 工具、开发工具、设计工具、效率工具、安全工具、影音工具、浏览器插件
- 每款工具配有详细评语、标签、使用场景说明
- FALLBACK_TOOLS 本地数据集，Supabase 不可用时自动降级

### 迭代 2/10 — SEO 深度优化
- 新增 sitemap.xml 和 robots.txt
- 双 JSON-LD 结构化数据（WebSite + ItemList）
- 完善 meta 标签：description、keywords、og、twitter card
- 预连接（preconnect/dns-prefetch/preload）优化资源加载

### 迭代 3/10 — 视觉动效全面升级
- 页面加载动画（loader-orb 旋转光球）
- 品牌文字打字机效果
- 滚动进度条
- 点击粒子爆炸特效
- 视差滚动背景
- 暗夜模式极光（Aurora）流光动效
- 粒子数量提升（桌面 100 / 移动 50）

### 迭代 4/10 — 搜索筛选系统增强
- 模糊搜索（子序列匹配）
- 搜索关键词高亮
- 分类筛选标签数量徽章
- 评分排序选项
- Ctrl+K 快捷键聚焦搜索
- 搜索防抖降至 250ms
- 空结果引导提示

### 迭代 5/10 — 用户互动功能
- 收藏功能（localStorage 持久化）
- 浏览历史记录（最近 12 条）
- 工具评分系统（1-5 星）
- MutationObserver 自动注入收藏按钮
- 收藏心跳动画 + 飞心特效

### 迭代 6/10 — 性能优化
- 广告位 IntersectionObserver 懒加载（视口外不渲染）
- 资源预连接与预加载
- 搜索防抖优化
- Service Worker 缓存策略完善

### 迭代 7/10 — 主题系统增强
- 三态主题切换：自动 / 亮色 / 暗色
- 跟随系统 prefers-color-scheme
- 系统暗色模式变化实时监听
- 主题切换涟漪动画 + Toast 反馈

### 迭代 8/10 — PWA 与移动端优化
- 模态框滑动关闭手势（阈值 100px）
- 卡片长按预览 + 震动反馈
- 智能 PWA 安装引导横幅
- 离线状态检测提示
- manifest.json 增强：分类、语言、方向、maskable 图标、应用快捷方式

### 迭代 9/10 — 数据分析仪表盘
- 每日访问记录（localStorage）
- 仪表盘 5 大模块：数据概览、热门工具 Top 5、7 日访问趋势、最近浏览、收藏列表
- 浮动操作按钮入口
- 历史与收藏项目可点击直达详情

### 迭代 10/10 — 最终打磨与发布
- 全部 JS 文件语法验证通过
- .gitignore 完善（排除 .reasonix 等非项目文件）
- Service Worker 缓存版本递增至 v17
- CHANGELOG 文档
- Git 提交并推送至 GitHub

---

## v2.0.0 — 2026-08-01

- 赛博玻璃态未来科技风设计系统重构
- 智能广告位系统 + 反拦截策略
- 联盟营销工具推荐 + 点击变现
- 5 套主题色方案
- 粒子背景 + 暗夜模式星星拟真化

## v1.0.0

- 基础工具推荐页面
- Supabase 数据后端
- Cloudflare Worker 写操作
- DeepSeek AI 生成评语
- PWA 基础支持
