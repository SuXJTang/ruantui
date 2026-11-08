# AGENTS.md — 软推项目开发规范

> 本文件是给 AI 编码助手（以及新加入的开发者）的**必读约束**。
> 这里记录的都是**真实踩过的坑**，每一条对应一次线上事故或返工。
> 改动本项目前请完整读一遍，尤其是「CSS 修改铁律」和「缓存版本」两节。

---

## 一、项目性质（先理解再动手）

- 这是一个**纯静态站点**：HTML + CSS + 原生 JS，**没有构建步骤**。
  改完文件直接生效，不要引入 webpack / vite / npm 依赖。
- 数据库是 **Supabase**（PostgreSQL + Auth + RLS）。
- 主部署是 **Cloudflare Workers**，域名 `luoluo.fun`。
- 另有 GitHub Pages、Vercel 两个备用部署。

**关键影响**：没有构建步骤意味着**浏览器会长期缓存 JS/CSS**，
所以每次改动必须手动递增缓存版本号（见第五节）。

---

## 二、CSS 修改铁律 ⚠️ 最重要

### 2.1 改一个类之前，必须先完整读一遍它的原有定义

**事故记录**：为了给工具卡片做对齐，加了

```css
.tool-icon { height: 56px; flex-shrink: 0; }
```

原有的 `.tool-icon` 定义里包含 `width: 56px`，
新规则只写 `height` 却覆盖了整个规则块 → 宽度丢失 → **全站图标消失**。

**规则**：
- 用 `grep` 或 `read` 找到该类的**完整原始定义**再动手
- 只覆盖真正需要改的那几个属性，其余原样保留
- 需要覆盖时优先用**更具体的选择器**，而不是重写整个规则块

### 2.2 删除 CSS 规则时，逐项确认删掉的是什么

**事故记录**：调整 `.account-menu` 定位时，把

```css
background: var(--card-solid);
border: 1px solid var(--border);
border-radius: 14px;
box-shadow: var(--shadow-lg);
```

连同 `right:` 一起删掉了 → 下拉菜单变成**完全透明**，文字透出看不清。

**规则**：
- 删除任何属性前，先问「删掉后这个元素还有没有背景/边框/阴影」
- 定位类属性（`position` / `top` / `left` / `right`）和外观类属性
  （`background` / `border` / `box-shadow`）**分开改**
- 浮动层（菜单、弹窗、tooltip）必须有**不透明背景**，
  不能依赖父元素或页面背景

### 2.3 用行号批量删 CSS 时，必须验证删除范围

**事故记录**：用 PowerShell 按行号删除一段 CSS，行号算错，
只删掉了一半，残留的 `.tool-icon { height: 56px }` 反而把图标搞没了。

**规则**：
- 批量删除优先按**内容匹配**（找到注释块起点到文件末尾），
  不要用硬编码行号
- 删完必须验证：括号配对（`{` 数 == `}` 数）、
  关键类仍存在、被删的残留字符串已消失

### 2.4 每次改完 CSS 必须做的三项检查

```powershell
# 1. 括号配对
$c = Get-Content style.css -Raw
"{(match)} / }{(match)}"   # 数量必须相等

# 2. 关键类的原始属性还在
Select-String -Path style.css -Pattern "\.tool-icon \{" -Context 0,6

# 3. 没有语法错误的残留
node --check 对应.js
```

---

## 三、JavaScript 修改规范

### 3.1 改完必须跑 `node --check`

所有 JS 文件（含 `worker/index.js`）改完立刻 `node --check <file>`。
没有构建步骤，语法错误会直接让线上白屏。

### 3.2 事件监听不要重复绑定

**事故记录**：卡片点击监听累积到 13 个，点一次触发多次。

**规则**：
- 给元素绑定事件前，先确认它是否已经被绑过
- 列表重渲染时，用 `querySelectorAll().forEach` 重新绑定是安全的
  （元素是新的），但给**常驻元素**（顶栏按钮等）绑定要放在初始化里只执行一次

### 3.3 用 `byId()` 而不是依赖 `this`

**事故记录**：管理面板「编辑」按钮无效，因为 `.bind(this)` 绑定的是
调用方而回调里拿到的是别的对象。

**规则**：回调里需要操作 DOM 时，用 `document.getElementById()` 现查，
不要依赖闭包外的 `this`。

### 3.4 不要伪造数据兜底

**事故记录**：曾内置 40 条 `FALLBACK_TOOLS` 假数据，
后端挂了用户看到的是假列表，问题被掩盖。

**规则**：数据加载失败就**明确报错**（「数据加载失败 + 重试按钮」），
不要用假数据糊弄。

### 3.5 中文文案必须写成完整的用户可读提示

不要写 `Failed to fetch`、`HTTP 500` 这种直接抛给用户。
所有错误信息都要翻译成「发生了什么 + 用户该怎么做」。

示例：
- ❌ `网络错误：Failed to fetch`
- ✅ `网络连接失败，请检查网络后重试（如反复失败，可切换 Wi-Fi / 流量再试）`

- ❌ `操作过于频繁，请稍后再试`
- ✅ `验证邮件发送额度已用完（临时限制），请过 1 小时后再注册`

---

## 四、Supabase 相关

### 4.1 前端不直连 supabase.co

**事故记录**：国内网络直连 `<project>.supabase.co` 时通时断，
用户在手机上看到「数据加载失败」。

**现状**：请求走同域反代 `/sb/*`，由 Worker 转发到 Supabase。

```
浏览器 → luoluo.fun/sb/rest/v1/tools → Worker → supabase.co
```

**规则**：
- `supabase.js` 里的 `SUPABASE_URL` 在正式域名下自动指向 `/sb`
- 新增 API 调用时用 `SUPABASE_URL` 变量，**不要硬编码 `https://xxx.supabase.co`**
- Worker 的代理白名单只放行 `/rest/v1/` 和 `/auth/v1/`，新增路径要同步加白名单

### 4.2 重复注册不会报错（防账号枚举）

**事实**：已注册的邮箱再注册，Supabase 返回 **200 成功**，不报错。
唯一可靠的判据是 `identities` 字段：

```
新注册 → identities 是长度 ≥1 的数组
已存在 → identities 是空数组 []
```

**规则**：处理注册结果时必须检查 `identities`，否则用户会误以为注册成功。

### 4.3 错误码要区分对待

| error_code | 含义 | 用户提示方向 |
|---|---|---|
| `email_not_confirmed` | 邮箱未验证 | 引导去邮箱点链接 + 提供重发按钮 |
| `over_email_send_rate_limit` | 站点发信额度用尽 | 说明是临时限制，等 1 小时 |
| `email_address_invalid` | 邮箱格式/域名被拒 | 换真实邮箱（测试时别用 `@example.com`）|
| `invalid_credentials` | 密码错或账号不存在 | 统一提示「邮箱或密码错误」 |

### 4.4 管理 API 已全部下线

`worker/index.js` 里所有 `/api/admin/*` 都返回 **410 Gone**，
管理员操作直接由前端带 user JWT 写 Supabase（受 RLS 保护）。
不要重新启用这些接口。

### 4.5 凭据绝不进代码

历史上有过泄露事故（`ADMIN_PASSWORD_HASH`、DeepSeek key 被提交，
后用 `git filter-repo` 清洗全部提交历史）。

**规则**：
- 不要在代码里写密码、密钥、service_role key
- 测试脚本里的密码从环境变量读（`$env:SB_PASSWORD`），不落盘
- `.assetsignore` 里已排除 `*.sql`，新增敏感文件要同步排除

---

## 五、缓存版本（每次改动必做）

站点无构建步骤，浏览器 / Service Worker 会长期缓存静态资源。
**每次改动 JS 或 CSS，必须同时递增两个版本号**：

| 文件 | 改什么 |
|---|---|
| `index.html` | 所有资源的 `?v=N` → `?v=N+1` |
| `sw.js` | `CACHE_VERSION = 'vX'` → `'vX+1'` |
| `README.md` | 同步更新文档里的版本号 |

**只改一个会导致**：用户拿不到新文件，或 SW 缓存混乱（历史上出现过
「改了但用户看不到变化」，排查很久）。

---

## 六、Cloudflare Worker 注意事项

### 6.1 部署命令

```bash
wrangler deploy          # 正确
wrangler deploy --non-interactive   # ❌ 会报 Unknown arguments
```

GitHub Actions 里用裸 `wrangler deploy`。

### 6.2 `wrangler.jsonc` 的关键配置

```jsonc
"html_handling": "none"
```

**必须是 `none`**。用 `auto-trailing-slash` 会导致 `/t/56` 被 307 重定向到 `/`，
所有工具详情页失效。

### 6.3 排除文件只能用 `.assetsignore`

`.assetsignore`（gitignore 语法）是**唯一**能把文件排除出 Worker assets 的方式。
`wrangler.jsonc` 里的 ignore 配置对它无效。

### 6.4 相对路径要转绝对

`/t/{id}` 这类子路径页面，HTML 里的相对路径会被解析到 `/t/` 下导致 404。
Worker 里有 `absolutizeAssets()` 统一转成绝对路径，新增资源时注意。

### 6.5 只改 Markdown 不会触发部署

GitHub Actions 的 `paths` 过滤排除了 `*.md`。
想让改动上线，**必须动到实际代码文件**。

---

## 七、下载链接规则

| 链接特征 | 处理方式 |
|---|---|
| 公开、无签名、长期有效 | ✅ 直接给 `downloadUrl` |
| 含 `auth_key` / `Signature` / `Expires` | ❌ 会过期，改用下载页 |
| `release-assets.githubusercontent.com` | ❌ 签名链接，用 GitHub Releases 页 |
| 夸克 / 蓝奏云分享页 | ✅ 用分享页链接 |

**用户明确要求**：长期稳定优先，不要为了「直接下载」用会过期的签名链接。

### 官网优先

工具条目的 `url` 字段**优先填官网/主页**，没有官网才用 GitHub 仓库页。

---

## 八、界面约定

### 8.1 账号入口在顶栏最右侧

`.topbar-right` 必须有 `margin-left: auto`，
否则会被中间带 `flex: 1` 的搜索框挤到中间。

### 8.2 管理面板只对管理员可见

`#mgmtBtn` 默认 `display: none`，
只有 `setAdminFlag(true)` 后才显示。
不要为了调试方便把它改成默认可见后忘记改回来。

### 8.3 登录态刷新后要恢复

`restoreSession()` 必须在**会话存在时立即**显示已登录状态（不等网络请求），
否则用户刷新后会看到自己「被登出」。

### 8.4 浮动层不透明

菜单、弹窗、提示框必须有实色背景（见 2.2）。

### 8.5 安装提示不能悬浮

PWA 安装提示条要在文档流内，**不能 `position: fixed` 浮在内容上**。

### 8.6 弹窗长文本折叠

使用说明 / 介绍超过 3 行要折叠（`.modal-toggle`），不要撑满屏幕。

---

## 九、验证要求（不要凭感觉说「好了」）

### 9.1 必须实证，不能假设

历史上有多次「以为改好了其实没有」：
- 以为 `assets.ignore` 生效（实际无效，要用 `.assetsignore`）
- 以为 `renderIconHTML` 没问题（实际图标类名错了）
- 以为缓存会刷新（实际 SW 版本没递增）

**规则**：改完要**实际跑一遍**，给出可复现的证据（数值、截图、HTTP 响应）。

### 9.2 改动 CSS / 布局时必须检查多种视口

至少验证：
- 手机 390×844
- 桌面 1440×900

移动端还容易出问题的地方：`position: fixed` 的定位基准、`flex` 塌缩。

### 9.3 用无头 Chrome + CDP 做真实验证

本机可用方式（原生 WebSocket 手写，不装 puppeteer）：

```powershell
# 启动
chrome --headless=new --remote-debugging-port=9222 --user-data-dir=$env:TEMP\rru-xxx
# 然后通过 http://127.0.0.1:9222/json/list 拿 ws 地址，发 CDP 命令
```

### 9.4 临时脚本必须清理

所有诊断 / 测试脚本写在 `D:\GitHub`（项目目录之外），
用完删除，确保 `git status` 干净。

---

## 十、提交规范

### 10.1 Git 身份

本机没有全局 git 身份，提交时显式指定：

```bash
git -c user.name="SuXJTang" -c user.email="1557003690@qq.com" commit -F msg.txt
```

### 10.2 提交信息要写清「为什么」

格式：`<type>(<scope>): <一句话结论>`

正文必须包含：
1. **问题**：具体现象 + 根因
2. **改动**：改了什么文件、怎么改
3. **验证**：跑了什么、结果如何

不要写「修复 bug」这种无信息量的描述。

### 10.3 提交信息用 `-F` 传文件

消息里含引号、反引号、中文时，用 `git commit -F <file>`
而不是 `-m`，避免 shell 转义问题。

---

## 十一、安全

- 仓库曾是**公开**的，任何提交的内容都视为已公开
- 泄露过的凭据**必须视为永久失效**，改密码不够，要换新凭据
- 用户的 Supabase anon key 是**设计上公开**的，安全边界在 RLS，
  不要试图隐藏 anon key
- `service_role` key **绝对不能**出现在前端代码里

---

## 十二、沟通风格

- 用户是站长的身份，技术细节可以直说，但**不要堆砌术语**
- 报告问题时先给结论，再给证据
- 出错要**明确承认**，说明原因和补救措施，不要含糊
- 用户的截图经常圈出重点，优先看圈出的部分

---

## 附：常用命令速查

```powershell
# 语法检查
node --check features.js
node --check worker/index.js

# CSS 括号配对
$c = Get-Content style.css -Raw
"$(([regex]::Matches($c,'\{')).Count) / $(([regex]::Matches($c,'\}')).Count)"

# 版本递增（index.html + sw.js + README.md 三处）
# 参考历史 commit 里的 bump*.js 脚本

# 提交
git add -A
git -c user.name="SuXJTang" -c user.email="1557003690@qq.com" commit -F msg.txt
git push origin master

# 线上验证（清缓存）
curl.exe -sS --noproxy "*" -H "Cache-Control: no-cache" "https://luoluo.fun/style.css?v=42"
```

---

**最后更新**：2026-11-09
**对应版本**：?v=42 / CACHE_VERSION v50
