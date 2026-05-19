<div align="center">

# 🧰 我的工具箱

**个人软件推荐 & 使用心得**

分享我日常工作中沉淀下来的精选软件，每一个都经过长期使用检验。

[在线体验](https://suxjtang.github.io/ruantui/) · [反馈](https://github.com/SuXJTang/ruantui/issues)

</div>

---

## 📸 预览

| 亮色模式 | 暗色模式 |
|---------|---------|
| ![亮色](https://suxjtang.github.io/ruantui/) | ![暗色](https://suxjtang.github.io/ruantui/) |

> 图片占位，你可以截个图替换这里的链接

---

## ✨ 功能

- 🧰 **25 款精选工具** — 覆盖开发、设计、效率、日常等 6 个分类
- 🔍 **搜索过滤** — 按名称、标签、评语实时搜索
- 🎨 **5 色主题** — 暖阳、碧波、霓裳、翠微、红妆，一键切换
- 🌙 **暗色模式** — 护眼又好看
- 👆 **详情弹窗** — 点击卡片查看详细介绍、官网链接、下载地址
- 🔒 **管理员管理** — 增删改工具，本地持久化保存

---

## 🚀 快速开始

```bash
# 克隆仓库
git clone https://github.com/SuXJTang/ruantui.git

# 直接用浏览器打开
cd ruantui
open index.html
```

无需任何构建工具，纯 HTML + CSS + JS，开箱即用。

---

## 🗂️ 项目结构

```
ruantui/
├── index.html      # 主页面
├── style.css       # 样式文件（含 5 套主题 + 暗色模式）
├── script.js       # 交互逻辑 + 工具数据
└── README.md       # 本文件
```

---

## 🛠️ 技术栈

| 技术 | 说明 |
|------|------|
| 纯 HTML / CSS / JS | 零依赖，无需构建 |
| CSS 变量 | 5 套主题色 + 暗色模式 |
| Flexbox | 响应式自适应列数 |
| Simple Icons CDN | 真实品牌 SVG 图标 |
| Font Awesome | 兜底图标 |
| localStorage | 管理员增删改持久化 |
| GitHub Pages | 免费在线部署 |

---

## 🔧 管理员使用

1. 点击页面上 **⚙ 管理** 按钮
2. 输入密码：`ruantui2025`
3. 在管理面板中可以：
   - ✏️ 编辑已有工具
   - 🗑️ 删除工具
   - ➕ 添加自定义工具
4. 所有修改自动保存，刷新不丢失

> 密码可以在 `script.js` 中修改 `ADMIN_PASSWORD` 变量

---

## 📄 许可证

[MIT](LICENSE) © SuXJTang
