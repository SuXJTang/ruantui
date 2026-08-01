// ============================================
// ui.js — 卡片渲染 + 搜索 + 分类 + 智能广告
// ============================================

var grid = document.getElementById('toolGrid');
var filterBar = document.querySelector('.filter-bar');

// 智能广告配置 — 每 N 个卡片插入一条广告
var AD_CONFIG = {
    interval: 6,        // 每 6 个工具卡片后插入 1 条广告
    minTools: 8,        // 工具数 >= 8 才启用内嵌广告
    enabled: true
};

function rebuildCategories() {
    if (!filterBar) return;
    var cats = [...new Set(App.state.tools.map(function(t) { return t.category; }))];
    filterBar.innerHTML = '<button class="filter-tag active" data-filter="all"><span>全部</span></button>';
    cats.forEach(function(c) {
        var b = document.createElement('button'); b.className = 'filter-tag'; b.dataset.filter = c;
        b.innerHTML = '<span>' + escHTML(c) + '</span>';
        filterBar.appendChild(b);
    });
    var active = null;
    filterBar.querySelectorAll('.filter-tag').forEach(function(el) {
        if (el.dataset.filter === App.state.currentFilter) active = el;
    });
    if (active) active.classList.add('active');
    else {
        var all = filterBar.querySelector('[data-filter="all"]');
        if (all) all.classList.add('active');
        App.state.currentFilter = 'all';
    }
}

// 获取工具的访问链接（优先联盟链接）
function getToolLink(tool) {
    if (tool.affiliateUrl) return tool.affiliateUrl;
    if (tool.link) return tool.link;
    return null;
}

function renderTools(filter) {
    if (!App.state.tools || !grid) return;
    var q = App.state.currentSearch.toLowerCase().trim();
    var filtered = App.state.tools.filter(function(t) {
        return (filter === 'all' || t.category === filter) &&
            (!q || t.name.toLowerCase().includes(q) ||
             (Array.isArray(t.tags) && t.tags.some(function(tag) { return tag.toLowerCase().includes(q); })) ||
             (t.comment && t.comment.toLowerCase().includes(q)));
    });

    // 排序
    var sortSel = document.getElementById('sortSelect');
    var sortBy = sortSel ? sortSel.value : 'default';
    if (sortBy === 'name') {
        filtered.sort(function(a, b) { return a.name.localeCompare(b.name, 'zh'); });
    } else if (sortBy === 'popular') {
        filtered.sort(function(a, b) { return (b.views || 0) - (a.views || 0); });
    } else if (sortBy === 'newest') {
        filtered.sort(function(a, b) { return b.id - a.id; });
    }

    grid.innerHTML = '';

    if (App.state.loading) {
        var sk = '';
        for (var i = 0; i < 6; i++) sk += '<div class="skeleton-card"><div class="sk-icon"></div><div class="sk-body"><div class="sk-line sk-line-1"></div><div class="sk-line sk-line-2"></div><div class="sk-line sk-line-3"></div></div></div>';
        grid.innerHTML = sk; return;
    }

    if (!filtered.length) {
        grid.innerHTML = '<div class="grid-empty"><i class="fas fa-box-open"></i><p>没有找到匹配的工具</p></div>'; return;
    }

    var toolCount = filtered.length;
    var shouldInsertAds = AD_CONFIG.enabled && toolCount >= AD_CONFIG.minTools;

    filtered.forEach(function(t, idx) {
        // 智能广告插入
        if (shouldInsertAds && idx > 0 && idx % AD_CONFIG.interval === 0) {
            var adSlot = document.createElement('div');
            adSlot.className = 'ad-container ad-inline';
            adSlot.innerHTML = '<ins class="adsbygoogle" style="display:block" data-ad-client="' + (typeof ADSENSE_CLIENT !== 'undefined' ? ADSENSE_CLIENT : '') + '" data-ad-format="fluid" data-ad-layout-key="+2z+q6-2w-1h+2n" data-ad-slot=""><div style="text-align:center;padding:20px;color:var(--text-light);font-size:12px;opacity:0.4">赞助内容</div></ins>';
            grid.appendChild(adSlot);
            // 尝试初始化广告（如果有 adsbygoogle）
            if (typeof window.adsbygoogle !== 'undefined' && window.adsbygoogle.push) {
                try { window.adsbygoogle.push({}); } catch(e) {}
            }
        }

        var card = document.createElement('article');
        card.className = 'tool-card';
        card.style.animationDelay = (idx * 0.04) + 's';
        card.dataset.id = t.id;

        var iconHTML = renderIconHTML(t);
        var tagsArr = Array.isArray(t.tags) ? t.tags : [];
        var tagsHTML = tagsArr.map(function(tag) {
            return '<span class="tool-tag">' + escHTML(tag) + '</span>';
        }).join('');
        var isPinned = t.pinned;
        var toolLink = getToolLink(t);

        card.innerHTML =
            '<div class="tool-icon" style="background:' + safeColor(t.color) + '">' + iconHTML + '</div>' +
            '<div class="tool-body">' +
            '<h3>' + (isPinned ? '<span class="pinned-badge">推荐</span>' : '') + escHTML(t.name) + '</h3>' +
            '<div class="tool-meta">' +
            '<span class="tool-cat">' + escHTML(t.category) + '</span>' +
            '<span class="tool-views">👁 <span class="tool-views-num">' + (t.views || 0) + '</span></span>' +
            '</div>' +
            '<p>' + escHTML(t.comment) + '</p>' +
            '<div class="tool-tags">' + tagsHTML + '</div>' +
            (t.usage ? '<div class="tool-extra">' + escHTML(t.usage) + '</div>' : '') +
            '</div>' +
            (toolLink
                ? '<a class="tool-visit-btn" href="' + escHTML(toolLink) + '" target="_blank" rel="noopener" data-tool-id="' + t.id + '" data-tool-name="' + escHTML(t.name) + '">' +
                  (t.affiliateUrl ? '🔥 优惠直达' : '🚀 去使用') + '</a>'
                : '<div class="tool-visit-btn" style="background:rgba(128,128,128,0.2);color:var(--text-light);cursor:default;pointer-events:none;">📋 查看详情</div>') +
            '</div>';

        grid.appendChild(card);
    });

    // 点击卡片打开详情
    grid.addEventListener('click', function(e) {
        var card = e.target.closest('.tool-card');
        if (!card) return;
        // 点击访问按钮时，不打开弹窗
        if (e.target.closest('.tool-visit-btn')) return;
        var id = parseInt(card.dataset.id);
        openDetail(id);
    });

    // 访问链接埋点
    grid.addEventListener('click', function(e) {
        var btn = e.target.closest('.tool-visit-btn[data-tool-id]');
        if (!btn) return;
        trackToolClick(btn.dataset.toolId, btn.dataset.toolName);
    });

    var tc = document.getElementById('totalCount'); if (tc) tc.textContent = App.state.tools.length;
    var cc = document.getElementById('categoryCount'); if (cc) cc.textContent = new Set(App.state.tools.map(function(t) { return t.category; })).size;
}

// 点击追踪
function trackToolClick(toolId, toolName) {
    try {
        var clicks = JSON.parse(localStorage.getItem('ruantui_clicks') || '{}');
        clicks[toolId] = (clicks[toolId] || 0) + 1;
        localStorage.setItem('ruantui_clicks', JSON.stringify(clicks));
    } catch(e) {}
    // 上报到 Worker（如果有）
    if (typeof fetch === 'function') {
        try {
            fetch('/api/click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toolId: parseInt(toolId), toolName: toolName })
            }).catch(function(){});
        } catch(e) {}
    }
}

// 分类点击
if (filterBar) filterBar.addEventListener('click', function(e) {
    var btn = e.target.closest('.filter-tag'); if (!btn) return;
    filterBar.querySelectorAll('.filter-tag').forEach(function(el) { el.classList.remove('active'); });
    btn.classList.add('active');
    App.state.currentFilter = btn.dataset.filter;
    renderTools(App.state.currentFilter);
});

// 排序切换
var sortSelectEl = document.getElementById('sortSelect');
if (sortSelectEl) {
    sortSelectEl.addEventListener('change', function() {
        renderTools(App.state.currentFilter);
    });
}

// 搜索（防抖 300ms）
var searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', function() {
        App.state.currentSearch = this.value;
        if (App.state.currentSearch.trim() && filterBar) {
            filterBar.querySelectorAll('.filter-tag').forEach(function(el) { el.classList.remove('active'); });
            var all = filterBar.querySelector('[data-filter="all"]'); if (all) all.classList.add('active');
            App.state.currentFilter = 'all';
        }
        clearTimeout(window._st);
        window._st = setTimeout(function() { renderTools(App.state.currentFilter); }, 300);
    });
}
