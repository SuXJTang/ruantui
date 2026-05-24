// ============================================
// data.js — 工具数据 + localStorage 持久化
// ============================================
const BASE_TOOLS = [
    { id:1, name:'VS Code', category:'开发工具', rating:5, comment:'每天离不开的代码编辑器，插件生态无敌。', detail:'微软出品的轻量级代码编辑器，内置 Git 支持、智能补全、调试器和海量扩展。无论是前端、后端还是全栈开发，VS Code 都能胜任。我已经用了 5 年，从 Sublime Text 转过来的，回不去了。插件生态是最大的优势，几乎任何语言或框架都能找到对应的扩展。', tags:['日常必备','免费'], slug:'visualstudiocode', color:'#007ACC', url:'https://code.visualstudio.com/', download:'https://code.visualstudio.com/Download', usage:'推荐安装 Chinese 语言包、Prettier 和 ESLint 插件' },
    { id:2, name:'Warp', category:'开发工具', rating:4, comment:'现代化终端，AI 辅助和智能补全太香了。', detail:'基于 Rust 构建的新一代终端，自带 AI 命令建议、智能补全和分屏功能。界面美观，输入体验流畅。最惊艳的是 AI 功能——输入自然语言描述，它会推荐对应的终端命令，对不熟悉命令行的人特别友好。', tags:['效率提升','免费'], slug:'warp', color:'#01A4FF', url:'https://www.warp.dev/', download:'https://www.warp.dev/download' },
    { id:3, name:'GitHub Desktop', category:'开发工具', rating:4, comment:'可视化 Git 操作，比命令行直观太多。', detail:'GitHub 官方出品的可视化 Git 客户端。对于不习惯命令行的开发者来说，它把 commit、push、pull、branch 切换、merge 等操作都变成了点击操作。与 GitHub 的集成非常紧密，查看 Pull Request、Issue 都很方便。', tags:['入门友好','免费'], slug:'github', color:'#18181b', url:'https://desktop.github.com/', download:'https://desktop.github.com/download/' },
    { id:4, name:'Sourcetree', category:'开发工具', rating:3, comment:'另一个 Git 客户端，分支管理很清晰。', detail:'Atlassian 出品的免费 Git 客户端。分支图谱可视化做得非常好，分支管理和冲突解决比 GitHub Desktop 更强大。', tags:['免费'], slug:'sourcetree', color:'#0052CC', url:'https://www.sourcetreeapp.com/' },
    { id:5, name:'Postman', category:'开发工具', rating:4, comment:'API 调试利器，团队协作功能也很强。', detail:'最流行的 API 开发和测试工具。支持各种 HTTP 请求方式、环境变量管理、自动化测试脚本。团队协作功能可以共享 API 集合和文档。', tags:['必备','免费'], slug:'postman', color:'#FF6C37', url:'https://www.postman.com/', download:'https://www.postman.com/downloads/' },
    { id:6, name:'Docker Desktop', category:'开发工具', rating:4, comment:'容器化开发环境，再也不怕环境问题了。', detail:'Docker 官方桌面客户端，让容器化开发变得简单。一键创建、启动、管理容器，支持 Docker Compose。最大的好处是项目环境隔离。', tags:['必备'], slug:'docker', color:'#2496ED', url:'https://www.docker.com/products/docker-desktop/', download:'https://www.docker.com/products/docker-desktop/' },
    { id:7, name:'iTerm2', category:'开发工具', rating:4, comment:'macOS 最强终端，分屏和配置都很赞。', detail:'macOS 上最流行的终端模拟器。分屏功能、热键窗口、丰富的配置选项让它远超系统自带的 Terminal。', tags:['macOS','免费'], icon:'fa-window-maximize', color:'#1a1a2e', url:'https://iterm2.com/', download:'https://iterm2.com/downloads.html' },
    { id:8, name:'Figma', category:'设计工具', rating:5, comment:'协作设计的天花板，UI/UX 设计首选。', detail:'基于浏览器的协作式 UI 设计工具。天然支持多人实时协作——像 Google Docs 一样，设计师和开发可以同时在一个文件上工作。组件系统、自动布局和开发模式都是亮点。', tags:['日常必备','免费'], slug:'figma', color:'#F24E1E', url:'https://www.figma.com/' },
    { id:9, name:'Adobe Photoshop', category:'设计工具', rating:4, comment:'图像处理的行业标准，功能无可替代。', detail:'图像处理的行业标准，从照片修图到数字绘画，从 UI 设计到海报制作，Photoshop 几乎能做任何与图像相关的工作。', tags:['专业','付费'], slug:'adobephotoshop', color:'#31A8FF', url:'https://www.adobe.com/products/photoshop.html' },
    { id:10, name:'Adobe Illustrator', category:'设计工具', rating:4, comment:'矢量设计标杆，Logo 和插画必备。', detail:'矢量图形设计的标杆工具。Logo、图标、插画、排版设计的最佳选择。无限缩放不模糊。', tags:['专业','付费'], slug:'adobeillustrator', color:'#FF9A00', url:'https://www.adobe.com/products/illustrator.html' },
    { id:11, name:'Canva', category:'设计工具', rating:4, comment:'快速出图的在线工具，非设计师也能用。', detail:'在线设计平台，内置海量模板，社交媒体图片、演示文稿、海报等都能在几分钟内完成。', tags:['入门友好','免费'], slug:'canva', color:'#00C4CC', url:'https://www.canva.com/' },
    { id:12, name:'Unsplash', category:'设计工具', rating:4, comment:'高质量免费图库，找素材第一站。', detail:'全球最大的免费高质量图库。所有照片均可免费用于商业和非商业用途。API 接口也很方便。', tags:['免费','资源'], icon:'fa-images', color:'#333333', url:'https://unsplash.com/' },
    { id:13, name:'Notion', category:'效率工具', rating:5, comment:'第二大脑，笔记/文档/项目管理全搞定。', detail:'All-in-one 的知识管理与协作平台。笔记、文档、数据库、看板、日历、Wiki 全部集成。最强大的是数据库功能——可以把任何页面变成结构化数据。', tags:['日常必备','免费'], slug:'notion', color:'#000000', url:'https://www.notion.so/' },
    { id:14, name:'Raycast', category:'效率工具', rating:5, comment:'macOS 效率启动器，比 Spotlight 强一百倍。', detail:'macOS 上的效率启动器。快速启动应用、文件搜索、剪贴板历史、计算器等。更厉害的是扩展生态——可以直接管理 Git 分支、搜索 Notion 页面等。', tags:['强烈推荐','免费','macOS'], slug:'raycast', color:'#FF6363', url:'https://www.raycast.com/' },
    { id:15, name:'Arc Browser', category:'效率工具', rating:4, comment:'重新定义浏览器的使用方式，分屏太优雅。', detail:'创新的浏览器。侧边栏标签管理和分屏功能——把浏览器重新想象成操作系统级别的工具。空间（Spaces）功能区分工作、个人场景。', tags:['强烈推荐','免费'], slug:'arc', color:'#FCBFBD', url:'https://arc.net/' },
    { id:16, name:'Obsidian', category:'效率工具', rating:4, comment:'本地优先的知识管理，双向链接很强大。', detail:'本地优先的知识管理工具，基于 Markdown 文件。双向链接和图谱视图是其核心特色。插件生态丰富，配合 Git 可免费多端同步。', tags:['免费','笔记'], slug:'obsidian', color:'#7C3FED', url:'https://obsidian.md/', download:'https://obsidian.md/download' },
    { id:17, name:'Alfred', category:'效率工具', rating:4, comment:'老牌效率工具，Workflow 功能无敌。', detail:'macOS 上老牌效率启动器。Workflow（工作流）是其独家优势——通过可视化编辑器创建自动化工作流。', tags:['macOS','付费'], slug:'alfred', color:'#5C5C5C', url:'https://www.alfredapp.com/' },
    { id:18, name:'Spotify', category:'日常工具', rating:5, comment:'写代码的最佳伴侣，歌单推荐越来越懂我。', detail:'全球最大的音乐流媒体平台。歌单推荐算法非常智能，Discover Weekly 每周都会推荐符合你口味的新歌。写代码时听 Lo-fi 或 Deep Focus 歌单。', tags:['日常必备','付费'], slug:'spotify', color:'#1DB954', url:'https://www.spotify.com/', download:'https://www.spotify.com/download' },
    { id:19, name:'1Password', category:'日常工具', rating:5, comment:'密码管理，一个主密码管所有账号。', detail:'最好的密码管理器之一。只需要记住一个主密码，其他所有账号密码都由 1Password 生成和管理。自动填充、跨设备同步。', tags:['强烈推荐','付费','安全'], slug:'1password', color:'#3B66BC', url:'https://1password.com/', download:'https://1password.com/downloads' },
    { id:20, name:'CleanShot X', category:'日常工具', rating:4, comment:'macOS 截图工具，滚动截图和录屏都好用。', detail:'macOS 上最好的截图和录屏工具。支持区域截图、窗口截图、滚动截图、录屏和 GIF 录制。标注功能也很强大。', tags:['macOS','付费'], icon:'fa-camera', color:'#3B82F6', url:'https://cleanshot.com/' },
    { id:21, name:'IINA', category:'日常工具', rating:4, comment:'macOS 上最好用的视频播放器，颜值和功能兼备。', detail:'macOS 上现代化的视频播放器，基于 mpv 引擎。支持几乎所有的视频格式，支持画中画、播放列表、字幕下载。开源免费。', tags:['macOS','免费','开源'], icon:'fa-film', color:'#E91E63', url:'https://iina.io/', download:'https://iina.io/download' },
    { id:22, name:'Transmit', category:'日常工具', rating:3, comment:'经典 FTP/SFTP 客户端，文件传输很稳定。', detail:'macOS 上经典的 FTP/SFTP 客户端。支持多连接管理、同步功能、磁盘挂载。传输速度快而稳定。', tags:['macOS','付费'], icon:'fa-upload', color:'#0D7A9E', url:'https://panic.com/transmit/' },
    { id:23, name:'Bartender', category:'系统工具', rating:4, comment:'管理菜单栏图标，桌面整洁度提升 100%。', detail:'macOS 菜单栏管理工具。隐藏不常用的图标，只在需要时展开显示。让菜单栏保持整洁。', tags:['macOS','付费'], icon:'fa-bars', color:'#2563EB', url:'https://www.macbartender.com/' },
    { id:24, name:'Stats', category:'系统工具', rating:4, comment:'免费的系统监控工具，一目了然。', detail:'macOS 上免费开源的系统监控工具。在菜单栏实时显示 CPU、内存、磁盘、网络、温度等系统状态。', tags:['macOS','免费','开源'], icon:'fa-chart-line', color:'#10B981', url:'https://github.com/exelban/Stats' },
    { id:25, name:'Hidden Bar', category:'系统工具', rating:3, comment:'简单实用的菜单栏隐藏工具，开源免费。', detail:'Bartender 的免费开源替代品。功能简单直接——把不常用的菜单栏图标收起来，点击箭头展开。', tags:['macOS','免费','开源'], icon:'fa-eye-slash', color:'#6B7280', url:'https://github.com/dwarvesf/hidden' },
];

const DEFAULT_PINNED = [13];

const STORAGE_KEY = 'mytoolbox_data';
var tools = [];
var currentFilter = 'all';
var currentSearch = '';

function loadUserData() {
    // Try cloud first
    var cloud = typeof loadCloudData === 'function' ? loadCloudData() : null;
    if (cloud) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cloud));
        return cloud;
    }
    // Fallback to local
    try { var r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch(e) { return null; }
}
function saveUserData(d) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    // Sync to cloud
    if (typeof saveCloudData === 'function') {
        saveCloudData(d);
    }
}

function getMergedTools() {
    var d = loadUserData() || {};
    var deleted = d.deleted || [], edited = d.edited || {}, added = d.added || [];
    var pinned = d.pinned || []; if (!d.pinned) pinned = pinned.concat(DEFAULT_PINNED.filter(function(id) { return pinned.indexOf(id) === -1; }));
    console.log('Loaded from localStorage - pinned:', JSON.stringify(pinned));
    var m = BASE_TOOLS.filter(function(t) { return !deleted.includes(t.id); }).map(function(t) { return Object.assign({}, t, edited[t.id] || {}); });
    added.forEach(function(t) { t._userAdded = true; m.push(t); });
    m.sort(function(a, b) {
        var ap = pinned.includes(a.id) ? 0 : 1;
        var bp = pinned.includes(b.id) ? 0 : 1;
        return ap - bp;
    });
    return m;
}

function refreshTools() { tools = getMergedTools(); rebuildCategories(); renderTools(currentFilter); }
