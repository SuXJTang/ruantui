// ============================================
// ui.js — 卡片渲染 + 搜索 + 分类
// ============================================

var grid = document.getElementById('toolGrid');
var filterBar = document.querySelector('.filter-bar');

function rebuildCategories() {
    var cats = [...new Set(App.state.tools.map(function(t) { return t.category; }))];
    filterBar.innerHTML = '<button class="filter-tag active" data-filter="all">全部</button>';
    cats.forEach(function(c) {
        var b = document.createElement('button'); b.className = 'filter-tag'; b.dataset.filter = c; b.textContent = c;
        filterBar.appendChild(b);
    });
    var active = filterBar.querySelector('[data-filter="' + escHTML(App.state.currentFilter) + '"]');
    if (active) active.classList.add('active');
    else { var all = filterBar.querySelector('[data-filter="all"]'); if (all) all.classList.add('active'); App.state.currentFilter = 'all'; }
}

function renderTools(filter) {
    if (!App.state.tools || !grid) return;
    var q = App.state.currentSearch.toLowerCase().trim();
    var filtered = App.state.tools.filter(function(t) {
        return (filter === 'all' || t.category === filter) && (!q || t.name.toLowerCase().includes(q) || (Array.isArray(t.tags) && t.tags.some(function(tag) { return tag.toLowerCase().includes(q); })) || (t.comment && t.comment.toLowerCase().includes(q)));
    });
    grid.innerHTML = '';
    if (App.state.loading) {
        var sk = '';
        for (var i = 0; i < 6; i++) sk += '<div class="skeleton-card"><div class="sk-icon"></div><div class="sk-body"><div class="sk-line sk-line-1"></div><div class="sk-line sk-line-2"></div><div class="sk-line sk-line-3"></div></div></div>';
        grid.innerHTML = sk; return;
    }
    if (!filtered.length) { grid.innerHTML = '<div class="grid-empty"><i class="fas fa-box-open"></i><p>没有找到匹配的工具</p></div>'; return; }
    filtered.forEach(function(t, i) {
        var card = document.createElement('article'); card.className = 'tool-card'; card.style.animationDelay = (i * 0.05) + 's';
        var iconHTML = renderIconHTML(t);
        var tagsArr = Array.isArray(t.tags) ? t.tags : [];
        var tagsHTML = tagsArr.map(function(tag) { return '<span class="tool-tag">' + escHTML(tag) + '</span>'; }).join('');
        var isPinned = t.pinned;
        card.dataset.id = t.id;
        card.innerHTML = '<div class="tool-icon" style="background:' + safeColor(t.color) + '">' + iconHTML + '</div><div class="tool-body"><h3>' + (isPinned ? '<span class="pinned-badge">推荐</span>' : '') + escHTML(t.name) + '</h3><div class="tool-meta"><span class="tool-cat">' + escHTML(t.category) + '</span><span class="tool-views">👁 <span class="tool-views-num">' + (t.views || 0) + '</span></span></div><p>' + escHTML(t.comment) + '</p><div class="tool-tags">' + tagsHTML + '</div>' + (t.usage ? '<div class="tool-extra">' + escHTML(t.usage) + '</div>' : '') + '</div>';
        grid.appendChild(card);
    });
    document.getElementById('totalCount').textContent = App.state.tools.length;
    document.getElementById('categoryCount').textContent = new Set(App.state.tools.map(function(t) { return t.category; })).size;
}

// 分类点击
filterBar.addEventListener('click', function(e) {
    var btn = e.target.closest('.filter-tag'); if (!btn) return;
    filterBar.querySelectorAll('.filter-tag').forEach(function(el) { el.classList.remove('active'); });
    btn.classList.add('active');
    App.state.currentFilter = btn.dataset.filter;
    renderTools(App.state.currentFilter);
});

// 搜索（防抖 300ms）
var searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', function() {
        App.state.currentSearch = this.value;
        if (App.state.currentSearch.trim()) {
            filterBar.querySelectorAll('.filter-tag').forEach(function(el) { el.classList.remove('active'); });
            var all = filterBar.querySelector('[data-filter="all"]'); if (all) all.classList.add('active');
            App.state.currentFilter = 'all';
        }
        clearTimeout(window._st);
        window._st = setTimeout(function() { renderTools(App.state.currentFilter); }, 300);
    });
}
