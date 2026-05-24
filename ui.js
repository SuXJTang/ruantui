// ============================================
// ui.js — 卡片渲染 + 搜索 + 分类
// ============================================
var grid = document.getElementById('toolGrid');
var filterBar = document.querySelector('.filter-bar');

function rebuildCategories() {
    var cats = [...new Set(tools.map(function(t) { return t.category; }))];
    filterBar.innerHTML = '<button class="filter-tag active" data-filter="all">全部</button>';
    cats.forEach(function(c) {
        var b = document.createElement('button'); b.className = 'filter-tag'; b.dataset.filter = c; b.textContent = c;
        filterBar.appendChild(b);
    });
    var active = filterBar.querySelector('[data-filter="' + currentFilter + '"]');
    if (active) active.classList.add('active');
    else { var all = filterBar.querySelector('[data-filter="all"]'); if (all) all.classList.add('active'); currentFilter = 'all'; }
}

function renderTools(filter) {
    var q = currentSearch.toLowerCase().trim();
    var filtered = tools.filter(function(t) {
        return (filter === 'all' || t.category === filter) && (!q || t.name.toLowerCase().includes(q) || t.tags.some(function(tag) { return tag.toLowerCase().includes(q); }) || (t.comment && t.comment.toLowerCase().includes(q)));
    });
    grid.innerHTML = '';
    if (loading) {
        var sk = '';
        for (var i = 0; i < 6; i++) sk += '<div class="skeleton-card"><div class="sk-icon"></div><div class="sk-body"><div class="sk-line sk-line-1"></div><div class="sk-line sk-line-2"></div><div class="sk-line sk-line-3"></div></div></div>';
        grid.innerHTML = sk; return;
    }
    if (!filtered.length) { grid.innerHTML = '<div class="grid-empty"><i class="fas fa-box-open"></i><p>没有找到匹配的工具</p></div>'; return; }
    filtered.forEach(function(t, i) {
        var card = document.createElement('article'); card.className = 'tool-card'; card.style.animationDelay = (i * 0.05) + 's';
        var iconHTML = t.iconUrl ? '<img src="' + t.iconUrl + '" alt="">' : t.slug ? '<img src="https://cdn.simpleicons.org/' + t.slug + '/ffffff" alt="">' : '<i class="' + (t.icon || 'fa-cube') + '"></i>';
        var tagsHTML = t.tags.map(function(tag) { return '<span class="tool-tag">' + tag + '</span>'; }).join('');
        var isPinned = t.pinned;
        card.dataset.id = t.id;
        card.innerHTML = '<div class="tool-icon" style="background:' + t.color + '">' + iconHTML + '</div><div class="tool-body"><h3>' + (isPinned ? '<i class="fas fa-thumbtack" style="color:var(--primary);font-size:10px;margin-right:2px;"></i>' : '') + t.name + '</h3><div class="tool-meta"><span class="tool-cat">' + t.category + '</span></div><p>' + t.comment + '</p><div class="tool-tags">' + tagsHTML + '</div>' + (t.usage ? '<div class="tool-extra">📖 ' + t.usage + '</div>' : '') + '</div>';
        grid.appendChild(card);
    });
    document.getElementById('totalCount').textContent = tools.length;
    document.getElementById('categoryCount').textContent = new Set(tools.map(function(t) { return t.category; })).size;
}

// 分类点击
filterBar.addEventListener('click', function(e) {
    var btn = e.target.closest('.filter-tag'); if (!btn) return;
    filterBar.querySelectorAll('.filter-tag').forEach(function(el) { el.classList.remove('active'); });
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTools(currentFilter);
});

// 搜索
var searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', function() {
        currentSearch = this.value;
        if (currentSearch.trim()) {
            filterBar.querySelectorAll('.filter-tag').forEach(function(el) { el.classList.remove('active'); });
            var all = filterBar.querySelector('[data-filter="all"]'); if (all) all.classList.add('active');
            currentFilter = 'all';
        }
        clearTimeout(window._st);
        window._st = setTimeout(function() { renderTools(currentFilter); }, 120);
    });
}
