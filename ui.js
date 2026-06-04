// ============================================
// ui.js 鈥?鍗＄墖娓叉煋 + 鎼滅储 + 鍒嗙被
// ============================================
// HTML 杞箟 鈥?闃?XSS
function escHTML(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
// 鏍￠獙棰滆壊鍊?鈥?闃?CSS 娉ㄥ叆
function safeColor(c) {
    if (!c) return '#3B82F6';
    // 仅接受 hex / rgb() / rgba() / hsl() / hsla() 或已知 CSS 颜色名
    if (/^#[0-9a-fA-F]{3,8}$/.test(c)) return c;
    if (/^(rgb|rgba|hsl|hsla)\(/.test(c)) return c;
    var knownNames = ['black','silver','gray','white','maroon','red','purple','fuchsia','green','lime','olive','yellow','navy','blue','teal','aqua','orange','aliceblue','antiquewhite','aquamarine','azure','beige','bisque','blanchedalmond','blueviolet','brown','burlywood','cadetblue','chartreuse','chocolate','coral','cornflowerblue','cornsilk','crimson','cyan','darkblue','darkcyan','darkgoldenrod','darkgray','darkgreen','darkkhaki','darkmagenta','darkolivegreen','darkorange','darkorchid','darkred','darksalmon','darkseagreen','darkslateblue','darkslategray','darkturquoise','darkviolet','deeppink','deepskyblue','dimgray','dodgerblue','firebrick','floralwhite','forestgreen','gainsboro','ghostwhite','gold','goldenrod','greenyellow','honeydew','hotpink','indianred','indigo','ivory','khaki','lavender','lavenderblush','lawngreen','lemonchiffon','lightblue','lightcoral','lightcyan','lightgoldenrodyellow','lightgreen','lightgray','lightpink','lightsalmon','lightseagreen','lightskyblue','lightslategray','lightsteelblue','lightyellow','limegreen','linen','magenta','mediumaquamarine','mediumblue','mediumorchid','mediumpurple','mediumseagreen','mediumslateblue','mediumspringgreen','mediumturquoise','mediumvioletred','midnightblue','mintcream','mistyrose','moccasin','navajowhite','oldlace','olivedrab','orangered','orchid','palegoldenrod','palegreen','paleturquoise','palevioletred','papayawhip','peachpuff','peru','pink','plum','powderblue','rosybrown','royalblue','saddlebrown','salmon','sandybrown','seagreen','seashell','sienna','skyblue','slateblue','slategray','snow','springgreen','steelblue','tan','thistle','tomato','turquoise','violet','wheat','whitesmoke','yellowgreen','rebeccapurple'];
    if (knownNames.indexOf(c.toLowerCase()) >= 0) return c;
    return '#3B82F6';
}

var grid = document.getElementById('toolGrid');
var filterBar = document.querySelector('.filter-bar');

function rebuildCategories() {
    var cats = [...new Set(tools.map(function(t) { return t.category; }))];
    filterBar.innerHTML = '<button class="filter-tag active" data-filter="all">鍏ㄩ儴</button>';
    cats.forEach(function(c) {
        var b = document.createElement('button'); b.className = 'filter-tag'; b.dataset.filter = c; b.textContent = c;
        filterBar.appendChild(b);
    });
    var active = filterBar.querySelector('[data-filter="' + escHTML(currentFilter) + '"]');
    if (active) active.classList.add('active');
    else { var all = filterBar.querySelector('[data-filter="all"]'); if (all) all.classList.add('active'); currentFilter = 'all'; }
}

function renderTools(filter) {
    if (!tools || !grid) return;
    var q = currentSearch.toLowerCase().trim();
    var filtered = tools.filter(function(t) {
        return (filter === 'all' || t.category === filter) && (!q || t.name.toLowerCase().includes(q) || (Array.isArray(t.tags) && t.tags.some(function(tag) { return tag.toLowerCase().includes(q); })) || (t.comment && t.comment.toLowerCase().includes(q)));
    });
    grid.innerHTML = '';
    if (loading) {
        var sk = '';
        for (var i = 0; i < 6; i++) sk += '<div class="skeleton-card"><div class="sk-icon"></div><div class="sk-body"><div class="sk-line sk-line-1"></div><div class="sk-line sk-line-2"></div><div class="sk-line sk-line-3"></div></div></div>';
        grid.innerHTML = sk; return;
    }
    if (!filtered.length) { grid.innerHTML = '<div class="grid-empty"><i class="fas fa-box-open"></i><p>娌℃湁鎵惧埌鍖归厤鐨勫伐鍏?/p></div>'; return; }
    filtered.forEach(function(t, i) {
        var card = document.createElement('article'); card.className = 'tool-card'; card.style.animationDelay = (i * 0.05) + 's';
        var imgSrc = escHTML(t.iconUrl || (t.slug ? 'https://cdn.simpleicons.org/' + t.slug + '/ffffff' : ''));
        var iconHTML = t.iconUrl ? '<img src="' + imgSrc + '" alt="">' : t.slug ? '<img src="' + imgSrc + '" alt="">' : '<i class="' + escHTML(t.icon || 'fa-cube') + '"></i>';
        var tagsArr = Array.isArray(t.tags) ? t.tags : [];
        var tagsHTML = tagsArr.map(function(tag) { return '<span class="tool-tag">' + escHTML(tag) + '</span>'; }).join('');
        var isPinned = t.pinned;
        card.dataset.id = t.id;
        card.innerHTML = '<div class="tool-icon" style="background:' + safeColor(t.color) + '">' + iconHTML + '</div><div class="tool-body"><h3>' + (isPinned ? '<span class="pinned-badge">鎺ㄨ崘</span>' : '') + escHTML(t.name) + '</h3><div class="tool-meta"><span class="tool-cat">' + escHTML(t.category) + '</span><span class="tool-views">馃憗 <span class="tool-views-num">' + (t.views || 0) + '</span></span></div><p>' + escHTML(t.comment) + '</p><div class="tool-tags">' + tagsHTML + '</div>' + (t.usage ? '<div class="tool-extra">' + escHTML(t.usage) + '</div>' : '') + '</div>';
        grid.appendChild(card);
    });
    document.getElementById('totalCount').textContent = tools.length;
    document.getElementById('categoryCount').textContent = new Set(tools.map(function(t) { return t.category; })).size;
}

// 鍒嗙被鐐瑰嚮
filterBar.addEventListener('click', function(e) {
    var btn = e.target.closest('.filter-tag'); if (!btn) return;
    filterBar.querySelectorAll('.filter-tag').forEach(function(el) { el.classList.remove('active'); });
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTools(currentFilter);
});

// 鎼滅储
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
