# 动效 v7 实施清单（给 Claude Code）

> 制定：Hermes。上位计划见 `docs/MOTION-V7-PLAN.md`，本文只挑出**这轮要做的四项**，
> 并写到「改哪个文件、哪个函数、加什么类名」的粒度。
> 视觉验收由 Hermes 做（用浏览器截图），你只负责代码正确 + 静态检查。

---

## 0. 硬约束

1. **只做增量修改**，禁止整文件重写 `style.css`（3298 行）和 `ui.js`。
2. **不改版本号**：`index.html` 里的 `?v=94`、`sw.js` 里的 `CACHE_VERSION 'v102'` 由我最后统一改。
3. 新增类名统一 `v7-` 前缀（`v7-sk-fade` / `v7-stagger` / `v7-sw-toast` / `v7-icon-par`），
   不要复用已有类名造成语义混淆。
4. 所有新动效必须能在 `prefers-reduced-motion: reduce` 下关掉；
   hover 类动效必须圈在 `@media (hover: hover) and (pointer: fine)` 里。
5. 动效时长 ≤ 400ms，禁止无限循环的装饰动画。
6. 不要动 `sw.js` 的预缓存列表结构（只在末尾追加，如果需要）。

---

## 1. 骨架屏 → 内容过渡

**现状**：`ui.js:202` 会渲染 8 张 `.skeleton-card`，数据到达后直接 `innerHTML` 替换，
中间是一瞬间的硬切。样式层已有 `.skeleton-card` + `skShimmer`。

**改 `ui.js`**（渲染真实卡片的那个函数，搜 `.skeleton-card` 往上找）：
- 数据到达、准备替换前，先给当前网格容器加类 `v7-sk-fade`
- 用 `setTimeout(..., 180)` 再执行原本的 `innerHTML` 替换
- 加一个保护：如果 500ms 内又被调用（比如快速切分类），清掉上一个 timer，避免竞态

**改 `style.css`**（追加到文件末尾的 `/* v7 */` 段）：
```css
.tool-grid.v7-sk-fade .skeleton-card,
.tool-grid.v7-sk-fade .skeleton-card::after { opacity: 0; transition: opacity .18s ease; }
```
> 注意：真实容器类名以 `ui.js` 里实际的网格容器为准，不要凭空写 `.tool-grid`。

**验收**：加载过程中网格区不出现「空白一瞬间」；数据请求失败时骨架被现有的
`.data-error` 块替换（这个逻辑已存在，别破坏）。

---

## 2. 详情面板分段入场

**现状**：`.overlay.active .modal { transform: translateY(0) scale(1); }` —— 整个面板一次性进场。

**只改 `style.css`**（不改 `modal.js`）：
- 新增 `@keyframes v7FadeUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }`
- 只对**详情面板**生效：`.overlay.active .modal-detail` 下的五个区块依次入场
  - `.modal-head`：0ms
  - `.action-card`：40ms
  - `.detail-main`：80ms
  - `.info-card`：120ms
  - `.share-card`：160ms
- 每个 `animation: v7FadeUp .28s var(--ease) both; animation-delay: <上面值>`
- **左栏正文（`.detail-main` 内的长文本）不要单独再入场**，只让容器整体一次
- **移动端（`max-width: 768px`）全部关闭**，因为 `.detail-side` 用 `display:contents` 重排过，
  分区块入场会乱序

**验收**：打开详情面板，200ms 内五块全部到位；关闭时无残留延迟。

---

## 3. Service Worker 新版本提示条

**现状**：完全没有。

**改 `sw.js` 或 `features.js`**（看你判断哪个更合适，只用一处）：
- `navigator.serviceWorker.register()` 之后监听 `registration.addEventListener('updatefound')`
- 新 worker 的 `statechange` 变成 `installed` 且 `navigator.serviceWorker.controller` 存在时，
  说明是「更新」而不是「首次安装」→ 显示提示条
- 提示条 DOM 用 JS 创建，**不要改 index.html 的静态结构**
- 文案：`有新版本 · 点击刷新`
- 点击 → `location.reload()`
- 12 秒后自动淡出（用户可能正在阅读，别一直挂着）

**CSS（追加）**：
```css
.v7-sw-toast { position: fixed; left: 50%; transform: translateX(-50%);
  bottom: calc(16px + env(safe-area-inset-bottom)); z-index: 999;
  background: var(--s3); border: 1px solid var(--border); color: var(--ink1);
  padding: 10px 16px; border-radius: 99px; font-size: 13px; cursor: pointer;
  box-shadow: 0 8px 28px rgba(0,0,0,.28); opacity: 0; transition: opacity .2s; }
.v7-sw-toast.show { opacity: 1; }
```
> `--s3` / `--border` / `--ink1` 是这套设计系统里已有的变量（`style.css` 顶部 token 段），
> 用它们，不要写死颜色。底部要留出跟「回顶按钮」不重叠的距离，回顶按钮在右下。

**验收**：DevTools → Application → Service Workers 点 Update 后提示条出现；点击后刷新到新版。

---

## 4. 卡片图标轻微视差

**现状**：`effects.js:40` 已经算了 `--mx` / `--my`（鼠标相对卡片的 px 坐标），但只有光斑在用。

**改 `effects.js`**（同一个 mousemove 处理里追加两行）：
- 算归一化偏移：`--dx` = `(x / width - .5) * 2`，`--dy` = `(y / height - .5) * 2`，范围 -1 ~ 1

**改 `style.css`**：
```css
@media (hover: hover) and (pointer: fine) {
  .tool-card:hover .tool-icon {
    transform: translate(calc(var(--dx, 0) * -3px), calc(var(--dy, 0) * -3px));
  }
}
```
- **方向要反向**（鼠标往右，图标往左），位移 ≤ 3px
- 卡片本身的 hover 上浮不要动
- `prefers-reduced-motion: reduce` 下这条规则整个不生效

**验收**：鼠标在卡片上移动时图标有轻微逆向偏移；触屏设备无变化；不影响点击。

---

## 5. 交付要求（10 行内）

1. 四项各自改了哪些文件、哪些函数
2. `python -c "import re; ..."` 之类的静态检查结果（CSS 括号配平、JS 语法）
3. 有没有哪一项你判断「这样做会带来副作用」——直说，可以只做一部分
4. 你没做的事（明确列出来，不要含糊）

> 不要写「已完成」「验证通过」这种结论词，只列事实和具体位置（文件:行号）。
> 视觉部分你看不到，我会用浏览器验收，你不需要声称视觉上没问题。
