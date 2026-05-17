<div align="center">

# 软推 (RuanTui)

**专业的软件推荐平台 — 网站 + 安卓 APP**

</div>

## 项目简介

软推是一款致力于帮助用户快速找到优质软件的推荐平台。通过专业评测、多维对比和个性化推荐算法，解决软件选择过程中的信息过载问题。

项目包含完整的**需求分析、系统架构设计、UI 设计指南**以及可交互的**网站概念原型**。

## 功能概览

| 模块 | 网站 | 安卓 APP |
|------|------|----------|
| 软件检索与分类 | ✅ | ✅ |
| 软件详情与评测 | ✅ | ✅ |
| 个性化推荐 | ✅ | ✅ |
| 用户社区 | ✅ | ✅ |
| 本地应用扫描 | — | ✅ |
| 离线阅读 | — | ✅ |
| 推送通知 | — | ✅ |

## 技术栈

| 层 | 技术 |
|---|------|
| 网站前端 | React.js + Redux + Ant Design |
| 移动 APP | React Native + React Navigation |
| 后端 API | Node.js + Express.js |
| 数据库 | PostgreSQL + Redis |
| 搜索引擎 | Elasticsearch |
| 部署 | Docker + Kubernetes |
| CI/CD | GitHub Actions |
| 监控 | Prometheus + Grafana |

## 目录结构

```
ruantui/
├── docs/                       # 项目文档
│   └── 软件推荐系统/
│       ├── 说明文档.md          # 文档索引
│       ├── 开发流程.md          # 41 阶段开发流程
│       ├── 项目规划/
│       │   └── 需求分析.md      # 完整需求分析
│       ├── 技术文档/
│       │   └── 系统架构.md      # 微服务架构设计
│       └── 设计文档/
│           └── UI设计指南.md     # UI/UX 设计规范
├── prototype/                  # 网站概念原型
│   ├── index.html              # 首页原型
│   ├── script.js               # 交互脚本
│   └── styles.css              # 样式系统
├── static/                     # 静态资源
│   └── image/                  # SVG 素材
├── ginkgo-leaf-pngsvg-demo.*   # 银杏叶动态背景演示
├── CHANGELOG.md                # 变更日志
├── .gitignore
└── LICENSE
```

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/SuXJTang/ruantui.git
cd ruantui

# 直接打开网站原型
open prototype/index.html
```

> ⚠️ 项目目前处于**设计规划阶段**，代码实现尚未开始。

## 许可证

[MIT](./LICENSE) © SuXJTang
