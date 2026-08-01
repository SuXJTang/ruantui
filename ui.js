// ============================================
// ui.js — 卡片渲染 + 搜索 + 分类 + 智能广告 v2
// ============================================

var grid = document.getElementById('toolGrid');
var filterBar = document.querySelector('.filter-bar');

var AD_CONFIG = {
    interval: 6,
    minTools: 8,
    enabled: true
};

function rebuildCategories() {
    if (!filterBar) return;
    var cats = [...new Set(App.state.tools.map(function(t) { return t.category; }))];
    filterBar.innerHTML = '<button class="filter-tag active" data-filter="all"><span>全部</span> <em class="filter-count">' + App.state.tools.length + '</em></button>';
    cats.forEach(function(c) {
        var count = App.state.tools.filter(function(t) { return t.category === c; }).length;
        var b = document.createElement('button'); b.className = 'filter-tag'; b.dataset.filter = c;
        b.innerHTML = '<span>' + escHTML(c) + '</span> <em class="filter-count">' + count + '</em>';
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

function getToolLink(tool) {
    if (tool.affiliateUrl) return tool.affiliateUrl;
    if (tool.link) return tool.link;
    return null;
}

// 模糊搜索 — 支持拼音首字母匹配
function fuzzyMatch(text, query) {
    if (!text) return false;
    text = text.toLowerCase();
    // 直接包含
    if (text.includes(query)) return true;
    // 首字母匹配（简单的连续匹配）
    var ti = 0;
    for (var qi = 0; qi < query.length; qi++) {
        var found = false;
        while (ti < text.length) {
            if (text[ti] === query[qi]) { found = true; ti++; break; }
            ti++;
        }
        if (!found) return false;
    }
    return true;
}

// 搜索高亮
function highlightText(text, query) {
    if (!query || !text) return escHTML(text);
    var lower = text.toLowerCase();
    var idx = lower.indexOf(query.toLowerCase());
    if (idx < 0) return escHTML(text);
    return escHTML(text.substring(0, idx)) +
        '<mark style="background:rgba(var(--primary-rgb),0.2);color:var(--primary);padding:0 2px;border-radius:2px;">' +
        escHTML(text.substring(idx, idx + query.length)) + '</mark>' +
        escHTML(text.substring(idx + query.length));
}

function renderTools(filter) {
    if (!App.state.tools || !grid) return;
    var q = App.state.currentSearch.toLowerCase().trim();
    var filtered = App.state.tools.filter(function(t) {
        var matchFilter = (filter === 'all' || t.category === filter);
        if (!matchFilter) return false;
        if (!q) return true;
        // 搜索名称、标签、评语、分类
        return fuzzyMatch(t.name, q) ||
            fuzzyMatch(t.comment, q) ||
            fuzzyMatch(t.category, q) ||
            (Array.isArray(t.tags) && t.tags.some(function(tag) { return fuzzyMatch(tag, q); })) ||
            (t.detail && fuzzyMatch(t.detail, q));
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
    } else if (sortBy === 'rating') {
        filtered.sort(function(a, b) { return (b.rating || 0) - (a.rating || 0); });
    }

    grid.innerHTML = '';

    if (App.state.loading) {
        var sk = '';
        for (var i = 0; i < 8; i++) sk += '<div class="skeleton-card"><div class="sk-icon"></div><div class="sk-body"><div class="sk-line sk-line-1"></div><div class="sk-line sk-line-2"></div><div class="sk-line sk-line-3"></div></div></div>';
        grid.innerHTML = sk; return;
    }

    // 搜索结果计数
    var resultBar = document.getElementById('resultCount');
    if (resultBar) {
        if (q) {
            resultBar.textContent = '找到 ' + filtered.length + ' 个结果';
            resultBar.style.display = 'block';
        } else {
            resultBar.style.display = 'none';
        }
    }

    if (!filtered.length) {
        grid.innerHTML = '<div class="grid-empty"><i class="fas fa-search"></i><p>没有找到匹配的工具</p><p style="font-size:12px;color:var(--text-light);margin-top:8px;">试试其他关键词或清除筛选条件</p></div>'; return;
    }

    var toolCount = filtered.length;
    var shouldInsertAds = AD_CONFIG.enabled && toolCount >= AD_CONFIG.minTools;

    filtered.forEach(function(t, idx) {
        if (shouldInsertAds && idx > 0 && idx % AD_CONFIG.interval === 0) {
            var adSlot = document.createElement('div');
            adSlot.className = 'ad-container ad-inline';
            adSlot.innerHTML = '<ins class="adsbygoogle" style="display:block" data-ad-client="' + (typeof ADSENSE_CLIENT !== 'undefined' ? ADSENSE_CLIENT : '') + '" data-ad-format="fluid" data-ad-layout-key="+2z+q6-2w-1h+2n" data-ad-slot=""><div style="text-align:center;padding:20px;color:var(--text-light);font-size:12px;opacity:0.4">赞助内容</div></ins>';
            grid.appendChild(adSlot);
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
            return '<span class="tool-tag">' + highlightText(tag, App.state.currentSearch.trim()) + '</span>';
        }).join('');
        var isPinned = t.pinned;
        var toolLink = getToolLink(t);
        var nameHTML = highlightText(t.name, App.state.currentSearch.trim());

        card.innerHTML =
            '<div class="tool-icon" style="background:' + safeColor(t.color) + '">' + iconHTML + '</div>' +
            '<div class="tool-body">' +
            '<h3>' + (isPinned ? '<span class="pinned-badge">推荐</span>' : '') + nameHTML + '</h3>' +
            '<div class="tool-meta">' +
            '<span class="tool-cat">' + escHTML(t.category) + '</span>' +
            '<span class="tool-views">👁 <span class="tool-views-num">' + (t.views || 0) + '</span></span>' +
            '</div>' +
            '<p>' + highlightText(t.comment, App.state.currentSearch.trim()) + '</p>' +
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

// 搜索（防抖 250ms）
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
        window._st = setTimeout(function() { renderTools(App.state.currentFilter); }, 250);
    });
    // Ctrl+K 快捷搜索
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
    });
}
