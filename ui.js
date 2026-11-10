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
    var list = Array.isArray(App.state.tools) ? App.state.tools : [];
    var cats = [...new Set(list.map(function(t) { return t.category; }))];
    filterBar.innerHTML = '<button class="filter-tag active" data-filter="all"><span>全部</span> <em class="filter-count">' + list.length + '</em></button>';
    cats.forEach(function(c) {
        var count = list.filter(function(t) { return t.category === c; }).length;
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

function loadLinks(tool) {
    var out = [];
    if (tool.affiliateUrl) out.push(tool.affiliateUrl);
    if (tool.link && out.indexOf(tool.link) < 0) out.push(tool.link);
    if (tool.url && out.indexOf(tool.url) < 0) out.push(tool.url);
    if (tool.download && out.indexOf(tool.download) < 0) out.push(tool.download);
    return out;
}

// 链接解析 — 优先级：联盟链接 > 直达 > 官网（Supabase url 字段）> 下载地址
// 数据库行只有 url（migration.sql 的 tools.url），没有 affiliateUrl/link
function getToolLink(tool) {
    var all = tool ? loadLinks(tool) : [];
    return all.length ? all[0] : null;
}

// 模糊搜索 — 支持拼音首字母匹配
function fuzzyMatch(text, query) {
    if (!text) return false;
    text = String(text).toLowerCase();
    query = String(query || '').trim().toLowerCase();
    if (!query) return false;
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
    if (query.length > text.length) return escHTML(text); // 查询比正文长，不可能命中
    var lower = text.toLowerCase();
    var idx = lower.indexOf(query.toLowerCase());
    if (idx < 0) return escHTML(text);
    return escHTML(text.substring(0, idx)) +
        '<mark style="background:rgba(var(--primary-rgb),0.2);color:var(--primary);padding:0 2px;border-radius:2px;">' +
        escHTML(text.substring(idx, idx + query.length)) + '</mark>' +
        escHTML(text.substring(idx + query.length));
}

function renderTools(filter) {
    // 注意：这里不能因为 tools 为空就提前 return —— 空/失败状态也要渲染提示界面。
    if (!grid) return;
    if (!Array.isArray(App.state.tools)) App.state.tools = [];
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

    // 服务端是否已经把卡片渲染进 HTML（Worker 的 injectToolList）。
    // 有的话，在「加载中」和「加载失败」两种状态下都要保留它，
    // 否则用户会看到本来完整的列表被清空。
    var hasSSR = grid.getAttribute('data-ssr') === '1' && grid.children.length > 0;

    if (App.state.loading) {
        // 有 SSR 卡片就不显示骨架屏，直接让用户先看到内容
        if (hasSSR) return;
        grid.innerHTML = '';
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

    // 数据加载失败 / 为空 / 离线缓存 —— 必须让使用者看见，绝不静默伪装成正常
    if (!App.state.tools || !App.state.tools.length) {
        // 有 SSR 卡片时不能清空换成错误页 ——
        // 用户其实能看到完整工具列表，只是「刷新数据」失败。
        // 保留内容 + 顶部轻提示，体验远好于一个空白的错误页。
        if (hasSSR) {
            ensureSSRBanner();
            if (resultBar) resultBar.style.display = 'none';
            return;
        }
        grid.innerHTML = renderDataErrorHTML();
        var tcN = document.getElementById('totalCount'); if (tcN) tcN.textContent = '0';
        var ccN = document.getElementById('categoryCount'); if (ccN) ccN.textContent = '0';
        if (resultBar) resultBar.style.display = 'none';
        return;
    }

    grid.innerHTML = '';

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
            // 广告填充统一由 adsense.js 负责：它的 MutationObserver 会自动接管新插入的
            // .ad-container（视口内才 push，每个 ins 只 push 一次）。这里绝不能再调用
            // adsbygoogle.push —— 会和观察者重复 push，导致同一位广告被填充两次。
            grid.appendChild(adSlot);
        }

        var card = document.createElement('article');
        card.className = 'tool-card';
        card.style.animationDelay = (idx * 0.04) + 's';
        card.dataset.id = t.id;

        var iconHTML = renderIconHTML(t, { eager: true });  // 卡片图标立即加载，避免滚动时空白
        var tagsArr = Array.isArray(t.tags) ? t.tags : [];
        var tagsHTML = tagsArr.map(function(tag) {
            return '<span class="tool-tag">' + highlightText(tag, App.state.currentSearch.trim()) + '</span>';
        }).join('');
        var isPinned = t.pinned;
        var toolLink = getToolLink(t);
        var allLinks = loadLinks(t);
        var nameHTML = highlightText(t.name, App.state.currentSearch.trim());
        // 主按钮文案按「链接的来源字段」决定，而不是按优先级顺序猜：
        //  - 只有 download（没有官网）→ ⬇️ 下载
        //  - 有官网 url → 🌐 去官网
        //  - 联盟链接 → 🔥 优惠直达
        var primaryHref = toolLink, primaryLabel = '🚀 去使用';
        if (t.affiliateUrl && primaryHref === t.affiliateUrl) {
            primaryLabel = '🔥 优惠直达';
        } else if (t.download && primaryHref === t.download) {
            primaryLabel = '⬇️ 下载';
        } else if (t.url && primaryHref === t.url) {
            primaryLabel = '🌐 去官网';
        }

        // 次按钮：再找一个与主按钮不同的链接
        var altLink = null;
        for (var li = 0; li < allLinks.length; li++) {
            if (allLinks[li] !== primaryHref) { altLink = allLinks[li]; break; }
        }
        var altLabel = '↗ 直达';
        if (altLink) {
            if (t.download && altLink === t.download) altLabel = '⬇️ 下载';
            else if (t.url && altLink === t.url) altLabel = '🌐 官网';
            else if (t.affiliateUrl && altLink === t.affiliateUrl) altLabel = '🔥 优惠';
        }

        // ---------- 下载权限：free / user / vip ----------
        // 无权限时把下载地址从所有按钮里摘掉，
        // 否则用户右键「复制链接地址」就能绕过限制。
        var tier = t.download_tier || 'free';
        var canDownload = true, lockedReason = '';

        if (tier === 'vip') {
            var vLogged = !!(window.Auth && window.Auth.isLoggedIn());
            var vIsVip = !!(App.state.vipInfo && App.state.vipInfo.isVip);
            if (!vLogged) { canDownload = false; lockedReason = 'login'; }
            else if (!vIsVip) { canDownload = false; lockedReason = 'vip'; }
        } else if (tier === 'user') {
            if (!(window.Auth && window.Auth.isLoggedIn())) {
                canDownload = false; lockedReason = 'login';
            }
        }

        if (!canDownload) {
            // 主按钮是下载链接 → 换成官网；没有官网就换成提示按钮
            if (primaryHref && t.download && primaryHref === t.download) {
                if (t.url) { primaryHref = t.url; primaryLabel = '🌐 去官网'; }
                else { primaryHref = null; primaryLabel = ''; }
            }
            // 次按钮是下载链接 → 丢掉它
            if (altLink && t.download && altLink === t.download) altLink = null;
        }

        // 按钮区：只有一个链接时保持原样；有两个时并排显示
        var actionsHTML;
        if (!canDownload && !primaryHref && !altLink) {
            // 完全没权限也没官网：显示一个引导按钮
            var lockText = lockedReason === 'vip' ? '👑 开通 VIP 下载' : '🔒 登录后下载';
            actionsHTML = '<button class="tool-visit-btn tool-visit-locked" type="button" ' +
                'data-locked-tool="' + escHTML(t.id) + '" data-locked-reason="' + escHTML(lockedReason) + '">' +
                lockText + '</button>';
        } else if (primaryHref && altLink) {
            actionsHTML = '<div class="tool-actions">' +
                '<a class="tool-visit-btn" href="' + escHTML(primaryHref) + '" target="_blank" rel="noopener" data-tool-id="' + escHTML(t.id) + '" data-tool-name="' + escHTML(t.name) + '">' + primaryLabel + '</a>' +
                '<a class="tool-visit-btn tool-visit-alt" href="' + escHTML(altLink) + '" target="_blank" rel="noopener" data-tool-id="' + escHTML(t.id) + '" data-tool-name="' + escHTML(t.name) + '">' + altLabel + '</a>' +
                '</div>';
        } else if (primaryHref) {
            actionsHTML = '<a class="tool-visit-btn" href="' + escHTML(primaryHref) + '" target="_blank" rel="noopener" data-tool-id="' + escHTML(t.id) + '" data-tool-name="' + escHTML(t.name) + '">' + primaryLabel + '</a>';
        } else {
            actionsHTML = '<div class="tool-visit-btn" style="background:rgba(128,128,128,0.2);color:var(--text-light);cursor:default;pointer-events:none;">📋 查看详情</div>';
        }

        // 有官网但下载被锁：在官网按钮旁边补一个提示
        if (!canDownload && primaryHref) {
            var tipText = lockedReason === 'vip' ? '👑 VIP 专属下载' : '🔒 登录后可下载';
            actionsHTML = '<div class="tool-actions">' + actionsHTML +
                '<button class="tool-visit-btn tool-visit-locked" type="button" ' +
                'data-locked-tool="' + escHTML(t.id) + '" data-locked-reason="' + escHTML(lockedReason) + '">' +
                tipText + '</button></div>';
        }

        // 收藏按钮直接渲染进 HTML（样式在 style.css，默认隐藏、悬停卡片时淡入）。
        // 之所以不交给 engagement.js 事后注入：那一轮 JS 没跑完时，
        // 卡片右上角会彻底空着，连悬停都触发不出按钮。
        var favOn = (typeof isFavorited === 'function') ? isFavorited(t.id) : false;
        var favBtnHTML = '<button class="card-fav-btn' + (favOn ? ' active' : '') + '" ' +
            'data-fav-id="' + escHTML(t.id) + '" ' +
            'aria-label="' + (favOn ? '取消收藏' : '收藏') + '" ' +
            'title="' + (favOn ? '取消收藏' : '收藏') + '">' +
            '<i class="' + (favOn ? 'fas' : 'far') + ' fa-heart"></i></button>';

        card.innerHTML =
            favBtnHTML +
            '<div class="tool-icon" style="background:' + safeColor(t.color) + '">' + iconHTML + '</div>' +
            '<div class="tool-body">' +
            '<h3>' + (isPinned ? '<span class="pinned-badge">推荐</span>' : '') + nameHTML + '</h3>' +
            '<div class="tool-meta">' +
            '<span class="tool-cat">' + escHTML(t.category) + '</span>' +
            '<span class="tool-views">👁 <span class="tool-views-num">' + (Number(t.views) || 0) + '</span></span>' +
            '</div>' +
            '<p>' + highlightText(t.comment, App.state.currentSearch.trim()) + '</p>' +
            '<div class="tool-tags">' + tagsHTML + '</div>' +
            (t.usage ? '<div class="tool-extra">' + escHTML(t.usage) + '</div>' : '') +
            '</div>' +
            actionsHTML +
            '</div>';

        grid.appendChild(card);
    });

    var tc = document.getElementById('totalCount'); if (tc) tc.textContent = App.state.tools.length;
    var cc = document.getElementById('categoryCount'); if (cc) cc.textContent = new Set(App.state.tools.map(function(t) { return t.category; })).size;

    syncJsonLd(filtered);
}

// ============================================
// 用真实数据同步 SEO 结构化数据（ItemList）
// 不写死在 HTML 里，避免收录到并不存在的工具。
// ============================================
function syncJsonLd(list) {
    var el = document.getElementById('toolListJsonLd');
    if (!el) return;
    try {
        var data = JSON.parse(el.textContent);
        data.itemListElement = (list || []).slice(0, 20).map(function(t, i) {
            var link = getToolLink(t) || t.url || '';
            var item = { '@type': 'ListItem', position: i + 1, name: String(t.name || '') };
            if (link) item.url = link;
            return item;
        });
        el.textContent = JSON.stringify(data);
    } catch (e) {
        console.warn('JSON-LD 同步失败:', e);
    }
}

// 点击追踪 — 仅本地统计 + 尽力而为的服务端埋点
// /api/click 在 GitHub Pages 部署下不存在（会 404）：任何失败都必须静默吞掉，
// 既不能让 Promise 悬空 reject，也不能阻塞「去使用」链接的跳转。
function trackToolClick(toolId, toolName) {
    try {
        var clicks = JSON.parse(localStorage.getItem('ruantui_clicks') || '{}');
        clicks[toolId] = (clicks[toolId] || 0) + 1;
        localStorage.setItem('ruantui_clicks', JSON.stringify(clicks));
    } catch(e) {}
    if (typeof fetch !== 'function') return;
    try {
        fetch('/api/click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toolId: parseInt(toolId, 10), toolName: toolName }),
            keepalive: true
        }).then(function(res) {
            if (!res || !res.ok) {
                // 404/401/5xx 等一律忽略：埋点失败不影响业务
            }
        }).catch(function() {});
    } catch(e) {}
}

// 卡片点击 → 打开详情：由 modal.js 统一处理（唯一入口），这里不再注册开卡监听，
// 否则与 modal.js 重复，并且历史上留下的 openDetail() 未定义会抛 ReferenceError。

// ============================================
// 数据加载失败界面
// 设计原则：故障必须可见。绝不能拿假数据把错误「填平」。
// ============================================

// 当页面已有 SSR 卡片、但实时数据没拿到时，在列表上方显示一条轻提示。
// 目的是既保留可用的内容，又如实告知「这是缓存/静态版本」，
// 不让用户以为看到的是最新数据。
function ensureSSRBanner() {
    var existing = document.getElementById('_ssrBanner');
    if (existing) return existing;

    var bar = document.createElement('div');
    bar.id = '_ssrBanner';
    bar.style.cssText = [
        'grid-column:1/-1',
        'display:flex', 'align-items:center', 'gap:10px',
        'padding:10px 14px', 'margin-bottom:4px',
        'border-radius:12px',
        'background:rgba(var(--primary-rgb),0.08)',
        'border:1px solid rgba(var(--primary-rgb),0.22)',
        'font-size:12.5px', 'color:var(--text)',
        'line-height:1.5'
    ].join(';');
    bar.innerHTML =
        '<i class="fas fa-circle-info" style="color:var(--primary);flex-shrink:0"></i>' +
        '<span style="flex:1">当前显示的是最近一次保存的工具列表，最新数据正在后台获取。</span>' +
        '<button type="button" id="_ssrRetry" style="flex-shrink:0;padding:5px 14px;border-radius:999px;border:none;' +
        'background:linear-gradient(135deg,var(--primary),var(--accent));color:#fff;font-size:12px;font-weight:600;cursor:pointer">' +
        '重试</button>';

    var gridEl = document.getElementById('toolGrid');
    if (gridEl) gridEl.insertBefore(bar, gridEl.firstChild);

    var retryBtn = bar.querySelector('#_ssrRetry');
    if (retryBtn) {
        retryBtn.onclick = function () {
            retryBtn.disabled = true;
            retryBtn.textContent = '获取中…';
            if (typeof refreshTools === 'function') {
                refreshTools().then(function () {
                    var still = document.getElementById('_ssrBanner');
                    if (still) {
                        retryBtn.disabled = false;
                        retryBtn.textContent = '重试';
                        if (typeof showToast === 'function') showToast('仍然无法获取最新数据', 'error');
                    }
                });
            } else {
                location.reload();
            }
        };
    }
    return bar;
}

function renderDataErrorHTML() {
    var err = App.state.dataError;
    var usingCache = App.state.usingCache;

    var title, desc, icon, showRetry;

    if (err === 'offline' || usingCache) {
        // 有缓存但网络失败：仍显示内容（缓存是真实数据），外加一条提示均由页面顶部横幅承担
        icon = 'fa-wifi';
        title = '当前为离线缓存数据';
        desc = '无法连接数据服务，正在展示上次成功加载的内容，可能与最新数据有差异。';
        showRetry = true;
    } else if (err === 'empty') {
        icon = 'fa-inbox';
        title = '暂无工具数据';
        desc = '已成功连接数据服务，但其中还没有任何工具记录。请到管理面板添加。';
        showRetry = false;
    } else if (err === 'failed') {
        icon = 'fa-triangle-exclamation';
        title = '数据加载失败';
        desc = '暂时无法获取工具列表。如果是本站站长，请检查 Supabase 项目是否处于运行状态（免费版闲置会被自动暂停）。';
        showRetry = true;
    } else {
        icon = 'fa-circle-info';
        title = '数据未加载';
        desc = '暂时没有可显示的工具。';
        showRetry = true;
    }

    return '<div class="data-error" role="alert">' +
        '<i class="fas ' + icon + '"></i>' +
        '<h3>' + escHTML(title) + '</h3>' +
        '<p>' + escHTML(desc) + '</p>' +
        (showRetry ? '<button type="button" class="data-retry-btn" onclick="retryLoadData()">重新加载</button>' : '') +
        '</div>';
}

// 重新加载（供错误界面按钮调用）
window.retryLoadData = function() {
    var grid2 = document.getElementById('toolGrid');
    if (grid2) grid2.innerHTML = '<div class="grid-empty"><i class="fas fa-spinner fa-spin"></i><p>正在重新加载…</p></div>';
    try { localStorage.removeItem(App.constants.CACHE_KEY); } catch(e) {}
    loadTools().then(function() {
        rebuildCategories();
        renderTools(App.state.currentFilter);
        if (App.state.dataError) showToast('仍然无法获取数据', 'error');
        else showToast('数据已更新', 'success');
    });
};


// 访问链接埋点 — 模块作用域只注册一次（renderTools 会反复重建卡片，但监听器不需重建）
if (grid) grid.addEventListener('click', function(e) {
    // 被锁的下载按钮：引导用户登录 / 开通 VIP
    var locked = e.target.closest('.tool-visit-locked');
    if (locked) {
        e.preventDefault();
        e.stopPropagation();
        var reason = locked.dataset.lockedReason;
        if (reason === 'login') {
            if (typeof window.showAuthBox === 'function') window.showAuthBox('login');
            else if (typeof window.showLoginBox === 'function') window.showLoginBox();
        } else if (reason === 'vip') {
            // 显示开通说明：告诉用户怎么成为 VIP
            showVipRequiredTip();
        }
        return;
    }

    var btn = e.target.closest('.tool-visit-btn[data-tool-id]');
    if (!btn) return;
    trackToolClick(btn.dataset.toolId, btn.dataset.toolName);
});

// VIP 专属资源的开通提示
function showVipRequiredTip() {
    var existing = document.getElementById('_vipTipModal');
    if (existing) existing.remove();

    var box = document.createElement('div');
    box.id = '_vipTipModal';
    box.className = 'auth-overlay';
    box.innerHTML =
        '<div class="auth-card" role="dialog" aria-modal="true">' +
          '<button class="auth-close" type="button" aria-label="关闭">' +
            '<i class="fas fa-times"></i>' +
          '</button>' +
          '<div class="auth-logo">👑</div>' +
          '<h3 class="auth-title">VIP 专属资源</h3>' +
          '<p class="auth-sub">这个工具的下载需要 VIP 会员</p>' +
          '<div style="font-size:13px;line-height:1.9;color:var(--text);text-align:left;' +
            'background:rgba(var(--primary-rgb),0.06);padding:14px 16px;border-radius:12px;margin:16px 0;">' +
            '<div>· 联系站长开通（微信 / 支付宝转账）</div>' +
            '<div>· 开通后立即可用，无需重新登录</div>' +
            '<div>· 已开通但看不到？刷新页面再试</div>' +
          '</div>' +
          '<button type="button" class="auth-submit" id="_vipTipOk">知道了</button>' +
        '</div>';

    document.body.appendChild(box);
    requestAnimationFrame(function () { box.classList.add('active'); });

    function close() {
        box.classList.remove('active');
        setTimeout(function () { box.remove(); }, 200);
    }
    box.querySelector('.auth-close').onclick = close;
    box.querySelector('#_vipTipOk').onclick = close;
    box.onclick = function (e) { if (e.target === box) close(); };
}

// 分类点击
if (filterBar) filterBar.addEventListener('click', function(e) {
    var btn = e.target.closest('.filter-tag'); if (!btn) return;
    filterBar.querySelectorAll('.filter-tag').forEach(function(el) { el.classList.remove('active'); });
    btn.classList.add('active');
    App.state.currentFilter = btn.dataset.filter;
    renderTools(App.state.currentFilter);
});

// 排序切换 — onchange 由 features.js 负责（它会先恢复原始顺序再排序）。
// 这里不再重复挂 change 监听：两个监听并存时，第二个（旧的这里）会用排序后的数组
// 再渲染一次，把「default」顺序的恢复效果抵消掉。

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
