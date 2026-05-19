// ============================================
// 我的工具箱 — 个人软件推荐
// ============================================

// ---------- 工具数据 ----------
const BASE_TOOLS = [
    // 开发工具
    { id: 1, name: 'VS Code', category: '开发工具', rating: 5, comment: '每天离不开的代码编辑器，插件生态无敌。', detail: '微软出品的轻量级代码编辑器，内置 Git 支持、智能补全、调试器和海量扩展。无论是前端、后端还是全栈开发，VS Code 都能胜任。我已经用了 5 年，从 Sublime Text 转过来的，回不去了。插件生态是最大的优势，几乎任何语言或框架都能找到对应的扩展。', tags: ['日常必备', '免费'], slug: 'visualstudiocode', color: '#007ACC', url: 'https://code.visualstudio.com/', download: 'https://code.visualstudio.com/Download' },
    { id: 2, name: 'Warp', category: '开发工具', rating: 4, comment: '现代化终端，AI 辅助和智能补全太香了。', detail: '基于 Rust 构建的新一代终端，自带 AI 命令建议、智能补全和分屏功能。界面美观，输入体验流畅。最惊艳的是 AI 功能——输入自然语言描述，它会推荐对应的终端命令，对不熟悉命令行的人特别友好。', tags: ['效率提升', '免费'], slug: 'warp', color: '#01A4FF', url: 'https://www.warp.dev/', download: 'https://www.warp.dev/download' },
    { id: 3, name: 'GitHub Desktop', category: '开发工具', rating: 4, comment: '可视化 Git 操作，比命令行直观太多。', detail: 'GitHub 官方出品的可视化 Git 客户端。对于不习惯命令行的开发者来说，它把 commit、push、pull、branch 切换、merge 等操作都变成了点击操作。与 GitHub 的集成非常紧密，查看 Pull Request、Issue 都很方便。', tags: ['入门友好', '免费'], slug: 'github', color: '#18181b', url: 'https://desktop.github.com/', download: 'https://desktop.github.com/download/' },
    { id: 4, name: 'Sourcetree', category: '开发工具', rating: 3, comment: '另一个 Git 客户端，分支管理很清晰。', detail: 'Atlassian 出品的免费 Git 客户端。分支图谱可视化做得非常好，分支管理和冲突解决比 GitHub Desktop 更强大。如果你经常处理复杂的分支结构，Sourcetree 的图形化展示会很有帮助。不过界面略显臃肿。', tags: ['免费'], slug: 'sourcetree', color: '#0052CC', url: 'https://www.sourcetreeapp.com/' },
    { id: 5, name: 'Postman', category: '开发工具', rating: 4, comment: 'API 调试利器，团队协作功能也很强。', detail: '最流行的 API 开发和测试工具。支持各种 HTTP 请求方式、环境变量管理、自动化测试脚本。团队协作功能可以共享 API 集合和文档，对前后端分离的开发团队来说几乎是标配。', tags: ['必备', '免费'], slug: 'postman', color: '#FF6C37', url: 'https://www.postman.com/', download: 'https://www.postman.com/downloads/' },
    { id: 6, name: 'Docker Desktop', category: '开发工具', rating: 4, comment: '容器化开发环境，再也不怕环境问题了。', detail: 'Docker 官方桌面客户端，让容器化开发变得简单。一键创建、启动、管理容器，支持 Docker Compose。最大的好处是项目环境隔离——每个项目有自己的容器，不会互相污染依赖。配合 VS Code 的 Remote-Containers 插件体验极佳。', tags: ['必备'], slug: 'docker', color: '#2496ED', url: 'https://www.docker.com/products/docker-desktop/', download: 'https://www.docker.com/products/docker-desktop/' },
    { id: 7, name: 'iTerm2', category: '开发工具', rating: 4, comment: 'macOS 最强终端，分屏和配置都很赞。', detail: 'macOS 上最流行的终端模拟器。分屏功能、热键窗口、丰富的配置选项让它远超系统自带的 Terminal。配合 Oh My Zsh 使用，终端体验直接拉满。', tags: ['macOS', '免费'], icon: 'fa-window-maximize', color: '#1a1a2e', url: 'https://iterm2.com/', download: 'https://iterm2.com/downloads.html' },

    // 设计工具
    { id: 8, name: 'Figma', category: '设计工具', rating: 5, comment: '协作设计的天花板，UI/UX 设计首选。', detail: '基于浏览器的协作式 UI 设计工具。与 Sketch 和 Adobe XD 最大的区别是它天然支持多人实时协作——像 Google Docs 一样，设计师和开发可以同时在一个文件上工作。组件系统、自动布局和开发模式都是亮点。我所有 UI 设计工作都在 Figma 上完成。', tags: ['日常必备', '免费'], slug: 'figma', color: '#F24E1E', url: 'https://www.figma.com/' },
    { id: 9, name: 'Adobe Photoshop', category: '设计工具', rating: 4, comment: '图像处理的行业标准，功能无可替代。', detail: '图像处理的行业标准，功能之强大无可替代。从照片修图到数字绘画，从 UI 设计到海报制作，Photoshop 几乎能做任何与图像相关的工作。虽然现在有 Figma 等新工具，但在像素级图像处理上 PS 仍然是王者。', tags: ['专业', '付费'], slug: 'adobephotoshop', color: '#31A8FF', url: 'https://www.adobe.com/products/photoshop.html' },
    { id: 10, name: 'Adobe Illustrator', category: '设计工具', rating: 4, comment: '矢量设计标杆，Logo 和插画必备。', detail: '矢量图形设计的标杆工具。Logo、图标、插画、排版设计的最佳选择。与 Photoshop 的位图处理不同，Illustrator 专注于矢量图形，无限缩放不模糊。配合 Adobe Fonts 使用，字体选择也非常丰富。', tags: ['专业', '付费'], slug: 'adobeillustrator', color: '#FF9A00', url: 'https://www.adobe.com/products/illustrator.html' },
    { id: 11, name: 'Canva', category: '设计工具', rating: 4, comment: '快速出图的在线工具，非设计师也能用。', detail: '在线设计平台，主打简单快速。内置海量模板，社交媒体图片、演示文稿、海报等都能在几分钟内完成。虽然不是专业设计工具，但对于快速出图和没有设计基础的人来说非常实用。', tags: ['入门友好', '免费'], slug: 'canva', color: '#00C4CC', url: 'https://www.canva.com/' },
    { id: 12, name: 'Unsplash', category: '设计工具', rating: 4, comment: '高质量免费图库，找素材第一站。', detail: '全球最大的免费高质量图库。所有照片均可免费用于商业和非商业用途。API 接口也很方便，可以直接在应用或网站中集成。设计师找素材的第一站。', tags: ['免费', '资源'], icon: 'fa-images', color: '#333333', url: 'https://unsplash.com/' },

    // 效率工具
    { id: 13, name: 'Notion', category: '效率工具', rating: 5, comment: '第二大脑，笔记/文档/项目管理全搞定。', detail: 'All-in-one 的知识管理与协作平台。笔记、文档、数据库、看板、日历、Wiki 全部集成在一个工具里。最强大的是数据库功能——可以把任何页面变成结构化数据，用不同的视图（表格、看板、日历、画廊）展示。我用它管理个人知识库、项目进度和日常笔记。', tags: ['日常必备', '免费'], slug: 'notion', color: '#000000', url: 'https://www.notion.so/' },
    { id: 14, name: 'Raycast', category: '效率工具', rating: 5, comment: 'macOS 效率启动器，比 Spotlight 强一百倍。', detail: 'macOS 上的效率启动器，Alfred 的现代替代品。快速启动应用、文件搜索、剪贴板历史、计算器、颜色选择器等内置功能已经很强大了。更厉害的是它的扩展生态——可以直接管理 Git 分支、搜索 Notion 页面、控制 Spotify 音乐等，全部在键盘上完成。', tags: ['强烈推荐', '免费', 'macOS'], slug: 'raycast', color: '#FF6363', url: 'https://www.raycast.com/' },
    { id: 15, name: 'Arc Browser', category: '效率工具', rating: 4, comment: '重新定义浏览器的使用方式，分屏太优雅。', detail: '来自 The Browser Company 的创新浏览器。最大的特点是侧边栏标签管理和分屏功能——把浏览器重新想象成一个操作系统级别的工具。空间（Spaces）功能可以区分工作、个人等不同浏览场景。垂直标签页让浏览体验焕然一新。', tags: ['强烈推荐', '免费'], slug: 'arc', color: '#FCBFBD', url: 'https://arc.net/' },
    { id: 16, name: 'Obsidian', category: '效率工具', rating: 4, comment: '本地优先的知识管理，双向链接很强大。', detail: '本地优先的知识管理工具，基于 Markdown 文件。双向链接和图谱视图是其核心特色——像维基百科一样在笔记之间建立链接，形成知识网络。插件生态丰富，配合 Git 可以免费实现多端同步。', tags: ['免费', '笔记'], slug: 'obsidian', color: '#7C3FED', url: 'https://obsidian.md/', download: 'https://obsidian.md/download' },
    { id: 17, name: 'Alfred', category: '效率工具', rating: 4, comment: '老牌效率工具，Workflow 功能无敌。', detail: 'macOS 上老牌的效率启动器。核心功能与 Raycast 类似，但 Alfred 的 Workflow（工作流）是其独家优势——通过可视化编辑器创建自动化工作流，可以完成非常复杂的任务。Powerpack 付费版解锁全部功能，物有所值。', tags: ['macOS', '付费'], slug: 'alfred', color: '#5C5C5C', url: 'https://www.alfredapp.com/' },

    // 日常工具
    { id: 18, name: 'Spotify', category: '日常工具', rating: 5, comment: '写代码的最佳伴侣，歌单推荐越来越懂我。', detail: '全球最大的音乐流媒体平台。歌单推荐算法非常智能，Discover Weekly 每周都会推荐符合你口味的新歌。Podcast 和有声书内容也很丰富。写代码时听 Lo-fi 或 Deep Focus 歌单，效率翻倍。', tags: ['日常必备', '付费'], slug: 'spotify', color: '#1DB954', url: 'https://www.spotify.com/', download: 'https://www.spotify.com/download' },
    { id: 19, name: '1Password', category: '日常工具', rating: 5, comment: '密码管理，一个主密码管所有账号。', detail: '最好的密码管理器之一。只需要记住一个主密码，其他所有账号密码都由 1Password 生成和管理。自动填充、跨设备同步、安全检查（提醒你弱密码和重复使用的密码）。家庭计划还可以和家人共享部分密码。', tags: ['强烈推荐', '付费', '安全'], slug: '1password', color: '#3B66BC', url: 'https://1password.com/', download: 'https://1password.com/downloads' },
    { id: 20, name: 'CleanShot X', category: '日常工具', rating: 4, comment: 'macOS 截图工具，滚动截图和录屏都好用。', detail: 'macOS 上最好的截图和录屏工具。支持区域截图、窗口截图、滚动截图、录屏和 GIF 录制。标注功能也很强大——可以高亮、箭头、马赛克、文字标注等。截图后直接分享或保存，比系统自带截图工具好用太多。', tags: ['macOS', '付费'], icon: 'fa-camera', color: '#3B82F6', url: 'https://cleanshot.com/' },
    { id: 21, name: 'IINA', category: '日常工具', rating: 4, comment: 'macOS 上最好用的视频播放器，颜值和功能兼备。', detail: 'macOS 上现代化的视频播放器，基于 mpv 引擎。界面设计遵循 macOS 设计语言，颜值在线。支持几乎所有的视频格式，支持画中画、播放列表、字幕下载等功能。开源免费，是 macOS 上 VLC 的最佳替代品。', tags: ['macOS', '免费', '开源'], icon: 'fa-film', color: '#E91E63', url: 'https://iina.io/', download: 'https://iina.io/download' },
    { id: 22, name: 'Transmit', category: '日常工具', rating: 3, comment: '经典 FTP/SFTP 客户端，文件传输很稳定。', detail: 'macOS 上经典的 FTP/SFTP 客户端。支持多连接管理、同步功能、磁盘挂载。界面简洁优雅，传输速度快而稳定。虽然现在云存储越来越普及，但某些场景下 FTP 仍然是刚需。', tags: ['macOS', '付费'], icon: 'fa-upload', color: '#0D7A9E', url: 'https://panic.com/transmit/' },

    // 系统工具
    { id: 23, name: 'Bartender', category: '系统工具', rating: 4, comment: '管理菜单栏图标，桌面整洁度提升 100%。', detail: 'macOS 菜单栏管理工具。装了太多应用后，菜单栏会变得非常拥挤。Bartender 可以隐藏不常用的图标，只在需要时展开显示。让菜单栏保持整洁，心情也会变好。', tags: ['macOS', '付费'], icon: 'fa-bars', color: '#2563EB', url: 'https://www.macbartender.com/' },
    { id: 24, name: 'Stats', category: '系统工具', rating: 4, comment: '免费的系统监控工具，一目了然。', detail: 'macOS 上免费开源的系统监控工具。在菜单栏实时显示 CPU、内存、磁盘、网络、温度等系统状态。比 iStat Menus 便宜（免费），功能也足够日常使用。', tags: ['macOS', '免费', '开源'], icon: 'fa-chart-line', color: '#10B981', url: 'https://github.com/exelban/Stats' },
    { id: 25, name: 'Hidden Bar', category: '系统工具', rating: 3, comment: '简单实用的菜单栏隐藏工具，开源免费。', detail: 'Bartender 的免费开源替代品。功能简单直接——把不常用的菜单栏图标收起来，点击箭头展开。虽然没有 Bartender 那么强大，但完全免费，够用。', tags: ['macOS', '免费', '开源'], icon: 'fa-eye-slash', color: '#6B7280', url: 'https://github.com/dwarvesf/hidden' },
];

// ---------- 数据持久化层 ----------
const STORAGE_KEY = 'mytoolbox_data';

function loadUserData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

function saveUserData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getNextId() {
    const data = loadUserData();
    return (data?.nextId || 1000);
}

function getMergedTools() {
    const data = loadUserData();
    const deleted = data?.deleted || [];
    const edited = data?.edited || {};
    const added = data?.added || [];

    // 种子工具：过滤掉已删除的，应用编辑
    let merged = BASE_TOOLS
        .filter(t => !deleted.includes(t.id))
        .map(t => edited[t.id] ? { ...t, ...edited[t.id] } : t);

    // 用户添加的工具
    added.forEach(t => {
        t._userAdded = true;
        merged.push(t);
    });

    return merged;
}

let tools = getMergedTools();

function refreshTools() {
    tools = getMergedTools();
    // 重新渲染分类按钮和卡片
    rebuildCategories();
    renderTools(currentFilter);
}

function rebuildCategories() {
    const cats = [...new Set(tools.map(t => t.category))];
    filterBar.innerHTML = '<button class="filter-tag active" data-filter="all">全部</button>';
    cats.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'filter-tag';
        btn.dataset.filter = cat;
        btn.textContent = cat;
        filterBar.appendChild(btn);
    });
    // 如果 currentFilter 还在，保留它
    const active = filterBar.querySelector(`[data-filter="${currentFilter}"]`);
    if (active) active.classList.add('active');
    else {
        const all = filterBar.querySelector('[data-filter="all"]');
        if (all) all.classList.add('active');
        currentFilter = 'all';
    }
}

// ---------- 主题系统 ----------
const savedTheme = localStorage.getItem('colorTheme') || 'sunrise';
const savedMode = localStorage.getItem('colorMode') || 'light';

document.body.setAttribute('data-theme', savedTheme);
if (savedMode === 'dark') document.body.setAttribute('data-mode', 'dark');

// 暗色模式
const toggleBtn = document.querySelector('.theme-toggle');
if (toggleBtn) {
    const icon = toggleBtn.querySelector('i');
    const updateIcon = (dark) => {
        icon.className = dark ? 'fas fa-sun' : 'fas fa-moon';
        toggleBtn.setAttribute('title', dark ? '切换亮色模式' : '切换暗色模式');
    };
    updateIcon(savedMode === 'dark');

    toggleBtn.addEventListener('click', () => {
        const isDark = document.body.getAttribute('data-mode') === 'dark';
        if (isDark) {
            document.body.removeAttribute('data-mode');
            localStorage.setItem('colorMode', 'light');
            updateIcon(false);
        } else {
            document.body.setAttribute('data-mode', 'dark');
            localStorage.setItem('colorMode', 'dark');
            updateIcon(true);
        }
    });
}

// 色板
const swatches = document.querySelectorAll('.theme-swatch');
swatches.forEach(s => {
    s.addEventListener('click', function() {
        const target = this.getAttribute('data-target');
        swatches.forEach(el => { el.classList.remove('active'); el.setAttribute('aria-checked', 'false'); });
        this.classList.add('active');
        this.setAttribute('aria-checked', 'true');
        document.body.setAttribute('data-theme', target);
        localStorage.setItem('colorTheme', target);
    });
    if (s.getAttribute('data-target') === savedTheme) {
        s.classList.add('active');
        s.setAttribute('aria-checked', 'true');
    }
});

// 系统暗色检测
if (!localStorage.getItem('colorMode') && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.setAttribute('data-mode', 'dark');
    localStorage.setItem('colorMode', 'dark');
    const icon = document.querySelector('.theme-toggle i');
    if (icon) icon.className = 'fas fa-sun';
}

// ---------- 渲染工具卡片 ----------
const grid = document.getElementById('toolGrid');
const filterBar = document.querySelector('.filter-bar');

let currentFilter = 'all';
let currentSearch = '';

// 提取分类列表
const categories = [...new Set(tools.map(t => t.category))];

// 渲染分类筛选按钮
categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-tag';
    btn.dataset.filter = cat;
    btn.textContent = cat;
    filterBar.appendChild(btn);
});

// 渲染卡片
function renderTools(filter) {
    const q = currentSearch.toLowerCase().trim();
    const filtered = tools.filter(t => {
        const matchCategory = filter === 'all' || t.category === filter;
        const matchSearch = !q || t.name.toLowerCase().includes(q)
            || t.tags.some(tag => tag.toLowerCase().includes(q))
            || t.category.toLowerCase().includes(q)
            || (t.comment && t.comment.toLowerCase().includes(q));
        return matchCategory && matchSearch;
    });
    grid.innerHTML = '';

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="grid-empty"><i class="fas fa-box-open"></i><p>这个分类还没有工具</p></div>`;
        return;
    }

    filtered.forEach((tool, i) => {
        const card = document.createElement('article');
        card.className = 'tool-card';
        card.style.animationDelay = `${i * 0.05}s`;

        const tagsHTML = tool.tags.map(t => `<span class="tool-tag">${t}</span>`).join('');

        // 有 slug 则从 Simple Icons CDN 加载真实 logo，否则用 Font Awesome 兜底
        const iconHTML = tool.slug
            ? `<img class="tool-logo" src="https://cdn.simpleicons.org/${tool.slug}/ffffff" alt="${tool.name}" loading="lazy">`
            : `<i class="${tool.icon}"></i>`;

        card.dataset.id = tool.id;
        card.innerHTML = `
            <div class="tool-card-icon" style="background:${tool.color}">
                ${iconHTML}
            </div>
            <div class="tool-card-body">
                <h3>${tool.name}</h3>
                <div class="tool-card-meta">
                    <span class="tool-card-category">${tool.category}</span>
                    <span class="tool-card-rating"><i class="fas fa-star"></i> ${tool.rating}</span>
                </div>
                <p>${tool.comment}</p>
                <div class="tool-card-tags">${tagsHTML}</div>
            </div>
        `;
        grid.appendChild(card);
    });

    // 更新统计
    document.getElementById('totalCount').textContent = tools.length;
    document.getElementById('categoryCount').textContent = categories.length;
}

// ---------- 筛选切换 ----------
filterBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-tag');
    if (!btn) return;

    filterBar.querySelectorAll('.filter-tag').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');

    currentFilter = btn.dataset.filter;
    renderTools(currentFilter);
});

// ---------- 搜索 ----------
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', () => {
        currentSearch = searchInput.value;
        // 有搜索词时切换到"全部"分类
        if (currentSearch.trim()) {
            filterBar.querySelectorAll('.filter-tag').forEach(el => el.classList.remove('active'));
            const allBtn = filterBar.querySelector('[data-filter="all"]');
            if (allBtn) allBtn.classList.add('active');
            currentFilter = 'all';
        }
        renderTools(currentFilter);
    });
}

// ---------- 初始化 ----------
// 默认高亮 "全部"
const allBtn = filterBar.querySelector('[data-filter="all"]');
if (allBtn) allBtn.classList.add('active');

renderTools('all');

// ============================================
// 6. 详情弹窗
// ============================================

const overlay = document.getElementById('modalOverlay');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');
let currentToolId = null;

// 点击卡片打开弹窗
document.getElementById('toolGrid').addEventListener('click', (e) => {
    const card = e.target.closest('.tool-card');
    if (!card) return;
    const id = parseInt(card.dataset.id);
    const tool = tools.find(t => t.id === id);
    if (!tool) return;
    openModal(tool);
});

function openModal(tool) {
    currentToolId = tool.id;
    const iconHTML = tool.slug
        ? `<img src="https://cdn.simpleicons.org/${tool.slug}/ffffff" alt="${tool.name}" loading="lazy">`
        : `<i class="${tool.icon}"></i>`;

    const stars = '★'.repeat(tool.rating) + '☆'.repeat(5 - tool.rating);
    const tagsHTML = tool.tags.map(t => `<span class="modal-tag">${t}</span>`).join('');

    const linksHTML = [];
    if (tool.url) linksHTML.push(`<a href="${tool.url}" class="modal-link primary" target="_blank" rel="noopener"><i class="fas fa-globe"></i> 访问官网</a>`);
    if (tool.download) linksHTML.push(`<a href="${tool.download}" class="modal-link" target="_blank" rel="noopener"><i class="fas fa-download"></i> 下载地址</a>`);

    modalBody.innerHTML = `
        <div class="modal-header">
            <div class="modal-icon" style="background:${tool.color}">
                ${iconHTML}
            </div>
            <div class="modal-header-info">
                <h2>${tool.name}</h2>
                <div class="modal-header-meta">
                    <span class="modal-rating"><i class="fas fa-star"></i> ${tool.rating}.0</span>
                    <span class="modal-category">${tool.category}</span>
                </div>
            </div>
        </div>
        <div class="modal-section">
            <h4>详细介绍</h4>
            <p>${tool.detail || tool.comment}</p>
        </div>
        ${linksHTML.length ? `<div class="modal-section"><h4>链接</h4><div class="modal-links">${linksHTML.join('')}</div></div>` : ''}
        <div class="modal-section">
            <h4>标签</h4>
            <div class="modal-tags">${tagsHTML}</div>
        </div>
        <div class="modal-section">
            <h4>个人评分</h4>
            <div class="modal-rating" style="font-size:20px;">${stars}</div>
        </div>
    `;

    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

// 关闭弹窗：点击 X
if (modalClose) modalClose.addEventListener('click', closeModal);
// 关闭弹窗：点击遮罩
if (overlay) overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
});
// 关闭弹窗：按 ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// ============================================
// 7. 工具管理 CRUD
// ============================================

const mgmtOverlay = document.getElementById('mgmtOverlay');
const mgmtList = document.getElementById('mgmtList');

// 打开管理弹窗
document.getElementById('mgmtBtn').addEventListener('click', () => {
    renderMgmtList();
    mgmtOverlay.setAttribute('aria-hidden', 'false');
    mgmtOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
});
document.querySelector('.mgmt-close').addEventListener('click', () => {
    mgmtOverlay.classList.remove('active');
    mgmtOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
});
mgmtOverlay.addEventListener('click', (e) => {
    if (e.target === mgmtOverlay) {
        mgmtOverlay.classList.remove('active');
        mgmtOverlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
});

function renderMgmtList() {
    const list = tools.map(t => {
        const iconHTML = t.slug
            ? `<img src="https://cdn.simpleicons.org/${t.slug}/ffffff" alt="">`
            : `<i class="${t.icon || 'fa-cube'}"></i>`;
        const badge = t._userAdded ? '<span style="font-size:10px;color:var(--primary-color);margin-left:6px;">[自定义]</span>' : '';
        return `
            <div class="mgmt-row" data-id="${t.id}">
                <div class="mgmt-row-icon" style="background:${t.color}">${iconHTML}</div>
                <div class="mgmt-row-info">
                    <h4>${t.name}${badge}</h4>
                    <p>${t.category} · ${t.rating}星 · ${t.comment}</p>
                </div>
                <div class="mgmt-row-actions">
                    <button class="edit-btn" data-id="${t.id}" title="编辑"><i class="fas fa-pen"></i></button>
                    <button class="del-btn" data-id="${t.id}" title="删除"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');
    mgmtList.innerHTML = list;

    // 编辑
    mgmtList.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            const tool = tools.find(t => t.id === id);
            if (tool) openForm(tool);
        });
    });
    // 删除
    mgmtList.querySelectorAll('.del-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            const tool = tools.find(t => t.id === id);
            if (tool && confirm(`确定删除「${tool.name}」？`)) deleteTool(id);
        });
    });
}

// ---------- 删除 ----------
function deleteTool(id) {
    const data = loadUserData() || { deleted: [], edited: {}, added: [], nextId: 1000 };
    if (!data.deleted) data.deleted = [];
    if (!data.deleted.includes(id)) data.deleted.push(id);
    // 如果删除的是用户添加的工具，从 added 中移除
    if (data.added) {
        data.added = data.added.filter(t => t.id !== id);
    }
    delete data.edited[id];
    saveUserData(data);
    refreshTools();
    renderMgmtList();
    showToast(`已删除`, 'info');
}

// ---------- 添加/编辑表单 ----------
const formOverlay = document.getElementById('formOverlay');
const toolForm = document.getElementById('toolForm');
const formTitle = document.getElementById('formTitle');

document.getElementById('mgmtAddBtn').addEventListener('click', () => openForm(null));
document.getElementById('formCancel').addEventListener('click', closeForm);
document.querySelector('.form-close').addEventListener('click', closeForm);
formOverlay.addEventListener('click', (e) => {
    if (e.target === formOverlay) closeForm();
});

function openForm(tool) {
    const isEdit = !!tool;
    formTitle.textContent = isEdit ? '编辑工具' : '添加工具';
    document.getElementById('formId').value = isEdit ? tool.id : '';
    document.getElementById('formName').value = isEdit ? tool.name : '';
    document.getElementById('formCategory').value = isEdit ? tool.category : '';
    document.getElementById('formRating').value = isEdit ? tool.rating : '4';
    document.getElementById('formColor').value = isEdit ? tool.color : '#3B82F6';
    document.getElementById('formComment').value = isEdit ? tool.comment : '';
    document.getElementById('formDetail').value = isEdit ? (tool.detail || '') : '';
    document.getElementById('formTags').value = isEdit ? (tool.tags || []).join(', ') : '';
    document.getElementById('formUrl').value = isEdit ? (tool.url || '') : '';
    document.getElementById('formDownload').value = isEdit ? (tool.download || '') : '';

    formOverlay.setAttribute('aria-hidden', 'false');
    formOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeForm() {
    formOverlay.classList.remove('active');
    formOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

toolForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const idStr = document.getElementById('formId').value;
    const isEdit = !!idStr;

    const name = document.getElementById('formName').value.trim();
    const category = document.getElementById('formCategory').value.trim();
    if (!name || !category) { showToast('请填写名称和分类', 'error'); return; }

    const tags = document.getElementById('formTags').value
        .split(/[,，、\s]+/)
        .map(t => t.trim())
        .filter(Boolean);

    const toolData = {
        name,
        category,
        rating: parseInt(document.getElementById('formRating').value) || 4,
        color: document.getElementById('formColor').value || '#3B82F6',
        comment: document.getElementById('formComment').value.trim(),
        detail: document.getElementById('formDetail').value.trim(),
        tags: tags,
        url: document.getElementById('formUrl').value.trim() || undefined,
        download: document.getElementById('formDownload').value.trim() || undefined,
    };

    let data = loadUserData() || { deleted: [], edited: {}, added: [], nextId: 1000 };
    if (!data.edited) data.edited = {};
    if (!data.added) data.added = [];
    if (!data.deleted) data.deleted = [];
    if (!data.nextId) data.nextId = 1000;

    if (isEdit) {
        const id = parseInt(idStr);
        const baseTool = BASE_TOOLS.find(t => t.id === id);
        if (baseTool) {
            // 种子工具 → 存 diff
            data.edited[id] = toolData;
        } else {
            // 用户自定义工具 → 直接修改 added
            const idx = data.added.findIndex(t => t.id === id);
            if (idx !== -1) {
                data.added[idx] = { ...data.added[idx], ...toolData };
            }
        }
        showToast(`「${name}」已更新`, 'success');
    } else {
        // 新增
        toolData.id = data.nextId++;
        toolData._userAdded = true;
        data.added.push(toolData);
        showToast(`「${name}」已添加`, 'success');
    }

    saveUserData(data);
    closeForm();
    refreshTools();
    renderMgmtList();
});

// ---------- Toast 通知封装 ----------
function showToast(msg, type) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = `
        padding: 8px 18px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 500;
        color: #fff;
        background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : 'var(--secondary-color)'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: toastIn 0.3s ease forwards;
        margin-top: 8px;
        pointer-events: none;
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// 如果还没有 toastContainer，创建一个
if (!document.getElementById('toastContainer')) {
    const tc = document.createElement('div');
    tc.id = 'toastContainer';
    tc.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(tc);
}

// toast 动画
if (!document.getElementById('toastStyles')) {
    const s = document.createElement('style');
    s.id = 'toastStyles';
    s.textContent = `
        @keyframes toastIn { from { opacity:0; transform:translateY(20px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes toastOut { from { opacity:1; transform:translateY(0) scale(1); } to { opacity:0; transform:translateY(20px) scale(0.95); } }
    `;
    document.head.appendChild(s);
}
