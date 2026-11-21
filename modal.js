// ============================================
// modal.js — 工具详情面板 + 分享
// ------------------------------------------------------------
// v5：桌面端从 560px 小对话框改成 940px 双栏宽面板。
//     左栏放正文（详细介绍 / 使用说明 / 标签，完整显示不折叠），
//     右栏放操作（官网 / 下载 / 收藏 / 复制链接）+ 工具信息 + 二维码。
//     详细设计与功能矩阵见 docs/TOOL-DETAIL-V5-DESIGN.md
// ============================================
var overlay = document.getElementById('modalOverlay');
var modalBody = document.getElementById('modalBody');

// 收录时间 → YYYY-MM
function fmtMonths(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

// 下载权限 → 中文说明
function tierLabel(tier) {
    if (tier === 'vip') return '👑 VIP 专属';
    if (tier === 'user') return '登录后可下载';
    return '所有人可下载';
}

// 右栏「操作」区：主按钮 + 收藏 + 复制链接
// ------------------------------------------------------------
// 权限判断与卡片上的按钮保持同一套语义（ui.js renderTools 里的逻辑）：
//   tier=free → 谁都能下；tier=user → 登录才能下；tier=vip → 登录且 VIP 才能下。
// VIP 状态还没读到时（首屏异步）先不锁，等状态回来重开弹窗即可刷新。
function detailActionsHTML(tool) {
    var tier = tool.download_tier || 'free';
    var logged = !!(window.Auth && window.Auth.isLoggedIn());
    var vipState = (window.App && App.state && App.state.vipInfo) || {};
    var vipKnown = (vipState.loading === false) || (typeof vipState.isVip === 'boolean');
    var isVip = !!vipState.isVip;

    var canDownload = true, lockReason = '';
    if (tier === 'vip') {
        if (!logged) { canDownload = false; lockReason = 'login'; }
        else if (!vipKnown) { canDownload = true; }
        else if (!isVip) { canDownload = false; lockReason = 'vip'; }
    } else if (tier === 'user') {
        if (!logged) { canDownload = false; lockReason = 'login'; }
    }

    var out = [];
    if (tool.url) {
        out.push('<a class="detail-btn primary" href="' + escHTML(tool.url) + '" target="_blank" rel="noopener">' +
            '<i class="fas fa-globe"></i><span>前往官网</span><i class="fas fa-arrow-right detail-btn-arrow"></i></a>');
    }
    if (tool.download && canDownload) {
        out.push('<a class="detail-btn' + (tool.url ? '' : ' primary') + '" href="' + escHTML(tool.download) + '" target="_blank" rel="noopener" data-dl-id="' + escHTML(tool.id) + '">' +
            '<i class="fas fa-download"></i><span>立即下载</span></a>');
    }
    if (tool.download && !canDownload) {
        var lockText = lockReason === 'vip' ? '开通 VIP 下载' : '登录后下载';
        var lockIcon = lockReason === 'vip' ? 'fa-crown' : 'fa-lock';
        out.push('<button type="button" class="detail-btn locked" data-locked-reason="' + escHTML(lockReason) + '">' +
            '<i class="fas ' + lockIcon + '"></i><span>' + lockText + '</span></button>');
    }

    var favOn = (typeof isFavorited === 'function') ? isFavorited(tool.id) : false;

    var secondary = '<div class="detail-btn-row">' +
        '<button type="button" class="detail-btn ghost' + (favOn ? ' active' : '') + '" id="_detailFav" data-id="' + escHTML(tool.id) + '">' +
          '<i class="' + (favOn ? 'fas' : 'far') + ' fa-heart"></i><span>' + (favOn ? '已收藏' : '收藏') + '</span>' +
        '</button>' +
        '<button type="button" class="detail-btn ghost" onclick="window.copyToolLink(' + Number(tool.id) + ')">' +
          '<i class="fas fa-link"></i><span>复制链接</span>' +
        '</button>' +
        '</div>';

    // 一个外链都没有（例如只做 VIP 专属的工具）：给一句明确说明，
    // 别留一块空白让人以为坏了
    var empty = '';
    if (!tool.url && !tool.download) {
        empty = '<p class="detail-empty-tip"><i class="fas fa-circle-info"></i> 这个工具没有公开外链，' +
            (logged ? '下载入口见下方。' : '登录后可查看下载入口。') + '</p>';
    }

    // 专属下载区的占位：内容由 loadVipDownload() 异步填，id 不能改
    var vipSlot = '<div class="detail-vip" id="_vipDownloadSection"></div>';

    return (out.length ? '<div class="detail-btn-col">' + out.join('') + '</div>' : '') +
           empty + secondary + vipSlot;
}

// 右栏「工具信息」
// 累计下载 / 浏览次数 加一条相对全站最大值的迷你条，
// 让「3 次」和「12 万次」在视觉上立刻能分出量级
function heatBarHTML(val, max) {
    var v = Number(val) || 0;
    // 0 不画条：2% 的最小宽度在浅底上就是一条脏线，不如留空
    if (v <= 0) return '';
    var p = Math.max(6, Math.min(100, Math.round(v / (max || 1) * 100)));
    return '<span class="heat"><i style="width:' + p + '%"></i></span>';
}

function detailInfoHTML(tool) {
    var allTools = (window.App && App.state && App.state.tools) || [];
    var maxDl = 1, maxVw = 1;
    allTools.forEach(function (t) {
        if ((Number(t.downloads) || 0) > maxDl) maxDl = Number(t.downloads);
        if ((Number(t.views) || 0) > maxVw) maxVw = Number(t.views);
    });

    var rows = [];
    rows.push(['分类', escHTML(tool.category || '—')]);

    var rating = Number(tool.rating);
    if (rating > 0) {
        rows.push(['评分', '<span class="detail-rating">★ ' + rating.toFixed(1) + '</span>']);
    }
    rows.push(['累计下载', heatBarHTML(tool.downloads, maxDl) + (typeof formatCount === 'function' ? formatCount(tool.downloads) : (Number(tool.downloads) || 0)) + ' 次']);
    if (tool.views !== null && tool.views !== undefined) {
        rows.push(['浏览次数', heatBarHTML(tool.views, maxVw) + (typeof formatCount === 'function' ? formatCount(tool.views) : tool.views) + ' 次']);
    }
    var ym = fmtMonths(tool.created_at);
    if (ym) rows.push(['收录时间', ym]);
    rows.push(['下载权限', tierLabel(tool.download_tier)]);

    var body = rows.map(function (r) {
        return '<div class="info-row"><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>';
    }).join('');

    return '<div class="info-card"><h4>工具信息</h4><dl class="info-list">' + body + '</dl></div>';
}

function openModal(tool) {
    if (!tool || !modalBody) return;
    var iconHTML = renderIconHTML(tool);
    var tagsArr = Array.isArray(tool.tags) ? tool.tags : [];
    var tagsHTML = tagsArr.map(function(t) { return '<span class="modal-tag">' + escHTML(t) + '</span>'; }).join('');
    // 分享地址走独立页面路径 /t/{id}（Worker 已在服务端注入该工具的 meta），
    // 没有 toolShareUrl 时退回同形式，保证单独引用也不会坏。
    var shareUrl = window.toolShareUrl ? window.toolShareUrl(tool.id) : (window.location.origin + '/t/' + tool.id);
    var qrSrc = 'https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=' + encodeURIComponent(shareUrl);

    // 正文：桌面完整显示，窄屏才折叠（.detail-text.collapsed 只在媒体查询里生效）
    function blockHTML(title, text, prefix) {
        if (!text) return '';
        var body = (prefix || '') + escHTML(text);
        var needToggle = String(text).length > 66;
        return '<section class="detail-block">' +
            '<h4>' + escHTML(title) + '</h4>' +
            '<div class="detail-text' + (needToggle ? ' collapsed' : '') + '">' + body + '</div>' +
            (needToggle ? '<button type="button" class="modal-toggle" onclick="toggleModalText(this)">展开全文 <i class="fas fa-chevron-down"></i></button>' : '') +
            '</section>';
    }

    var iconBg = (typeof DARK_ICON_BG !== 'undefined' && DARK_ICON_BG[tool.id]) || tool.color;

    modalBody.innerHTML =
        // ---- 头部：大图标 + 名称 + 元信息 ----
        '<div class="detail-head">' +
            '<div class="detail-icon" style="background:' + safeColor(iconBg) + '">' + iconHTML + '</div>' +
            '<div class="detail-headinfo">' +
                '<h2>' + escHTML(tool.name) + '</h2>' +
                '<div class="detail-meta">' +
                    '<span class="tool-cat">' + escHTML(tool.category) + '</span>' +
                    (Number(tool.rating) > 0 ? '<span class="detail-stat"><i class="fas fa-star"></i>' + Number(tool.rating).toFixed(1) + '</span>' : '') +
                    '<span class="detail-stat" data-dl-stat><i class="fas fa-download"></i>' + (typeof formatCount === 'function' ? formatCount(tool.downloads) : (Number(tool.downloads) || 0)) + '</span>' +
                    (tool.views !== null && tool.views !== undefined ? '<span class="detail-stat"><i class="fas fa-eye"></i>' + (typeof formatCount === 'function' ? formatCount(tool.views) : tool.views) + '</span>' : '') +
                '</div>' +
            '</div>' +
        '</div>' +
        // ---- 双栏：左正文，右操作 ----
        '<div class="detail-grid">' +
            '<div class="detail-main">' +
                blockHTML('详细介绍', tool.detail || tool.comment, '') +
                blockHTML('使用说明', tool.usage, '📖 ') +
                (tagsHTML ? '<section class="detail-block"><h4>标签</h4><div class="modal-tags">' + tagsHTML + '</div></section>' : '') +
            '</div>' +
            '<aside class="detail-side">' +
                '<div class="action-card" id="_detailActions">' + detailActionsHTML(tool) + '</div>' +
                detailInfoHTML(tool) +
                '<div class="share-card">' +
                    '<div class="share-qr-col">' +
                        '<img src="' + qrSrc + '" alt="扫码在手机上打开" class="share-qr-img" loading="lazy">' +
                        '<span class="share-qr-label">扫码在手机上打开</span>' +
                    '</div>' +
                    '<button type="button" class="share-reco" onclick="window.copyToolText(' + Number(tool.id) + ')">' +
                        '<i class="fas fa-comment-dots"></i> 复制推荐语' +
                    '</button>' +
                '</div>' +
            '</aside>' +
        '</div>';

    // 二维码失败降级：换成纯文本链接，不要留破图
    var qrImg = modalBody.querySelector('.share-qr-img');
    if (qrImg) {
        qrImg.onerror = function () {
            var col = this.parentNode;
            this.remove();
            var a = document.createElement('a');
            a.href = shareUrl;
            a.textContent = '打开分享链接';
            a.className = 'share-qr-fallback';
            a.target = '_blank';
            a.rel = 'noopener';
            col.insertBefore(a, col.firstChild);
        };
    }

    // 锁定按钮：与卡片同一套引导（登录 / 开通 VIP）
    var lockedBtn = modalBody.querySelector('.detail-btn.locked');
    if (lockedBtn) {
        lockedBtn.onclick = function () {
            var reason = this.getAttribute('data-locked-reason');
            if (reason === 'login') {
                if (typeof window.showAuthBox === 'function') window.showAuthBox('login');
                else if (typeof window.showLoginBox === 'function') window.showLoginBox();
            } else if (typeof showVipRequiredTip === 'function') {
                showVipRequiredTip();
            }
        };
    }

    // 收藏：就地切换，不重开弹窗
    var favBtn = modalBody.querySelector('#_detailFav');
    if (favBtn && typeof toggleFavorite === 'function') {
        favBtn.onclick = function () {
            var id = parseInt(this.dataset.id, 10);
            var on = toggleFavorite(id);
            this.classList.toggle('active', on);
            var icon = this.querySelector('i');
            if (icon) icon.className = (on ? 'fas' : 'far') + ' fa-heart';
            var label = this.querySelector('span');
            if (label) label.textContent = on ? '已收藏' : '收藏';
            // 同步卡片角标与筛选栏计数
            var cardBtn = document.querySelector('.card-fav-btn[data-fav-id="' + id + '"]');
            if (cardBtn) {
                cardBtn.classList.toggle('active', on);
                var ci = cardBtn.querySelector('i');
                if (ci) ci.className = (on ? 'fas' : 'far') + ' fa-heart';
            }
            var favCountEl = document.querySelector('.filter-fav .filter-count');
            if (favCountEl && typeof getFavorites === 'function') favCountEl.textContent = getFavorites().length;
        };
    }

    // VIP 专属下载区：只有数据库里有专属链接、且当前用户有权限时才显示。
    // 链接本身不写进 HTML，必须调 get_download_url() 由数据库判断权限后返回，
    // 所以普通用户在页面源码里看不到 VIP 地址。
    loadVipDownload(tool.id);

    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    // 回顶按钮是 fixed 的，会浮在弹窗内容上（手机端尤其明显）——用 body 类关掉它
    document.body.classList.add('modal-open');
}

// 拉取并渲染 VIP 专属下载链接
// ------------------------------------------------------------
// 关键：必须用 sbFetch（返回真正的 Response），不能用 adminFetch。
// adminFetch 是写操作的封装，内部 Prefer: return=minimal，且返回 true
// 而不是 Response —— 用它读数据 .then(res => res.json()) 必然抛错。
// 这个 bug 从功能加上起就存在，导致「专属下载」区块从来没显示过。
function loadVipDownload(toolId) {
    var box = document.getElementById('_vipDownloadSection');
    if (!box) return;

    // 没登录就没有 VIP 概念，不显示这一块（不打扰游客）
    if (!window.Auth || !window.Auth.isLoggedIn()) {
        box.style.display = 'none';
        return;
    }
    if (typeof sbFetch !== 'function') {
        box.style.display = 'none';
        return;
    }

    box.style.display = '';
    box.innerHTML = '<p class="detail-vip-loading">检查专属下载…</p>';

    // 用用户自己的 JWT 调数据库函数，由 is_vip() 判断能给什么链接
    window.Auth.getAccessToken().then(function (token) {
        if (!token) throw new Error('登录已过期');

        return sbFetch('rpc/get_download_url', {
            method: 'POST',
            headers: {
                'apikey': (typeof SUPABASE_KEY !== 'undefined' ? SUPABASE_KEY : ''),
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ p_tool_id: toolId })
        });
    }).then(function (res) {
        if (!res.ok) {
            return res.text().then(function (t) {
                throw new Error('HTTP ' + res.status + (t ? '：' + t.slice(0, 100) : ''));
            });
        }
        return res.json();
    }).then(function (rows) {
        var target = document.getElementById('_vipDownloadSection');
        if (!target) return;   // 弹窗已关闭

        var row = Array.isArray(rows) && rows[0];
        if (!row || !row.url) {
            // 没有专属链接，或当前用户没有下载权限 —— 直接隐藏，
            // 不提示「你没权限」，避免暴露「有这个资源」给普通用户
            target.style.display = 'none';
            return;
        }

        target.style.display = '';
        target.innerHTML = '<div class="detail-vip-title">专属下载</div>' +
            '<a href="' + escHTML(row.url) + '" class="detail-btn vip" target="_blank" rel="noopener" data-dl-id="' + escHTML(toolId) + '">' +
            '<i class="fas fa-download"></i><span>' + (row.tier === 'vip' ? '👑 VIP 专属下载' : '登录下载') + '</span></a>';
    }).catch(function (e) {
        // 函数不存在（还没执行 migration-vip.sql）或网络问题：隐藏
        var target = document.getElementById('_vipDownloadSection');
        if (target) target.style.display = 'none';
        console.warn('[VIP 下载] 加载失败:', e && e.message);
    });
}

function closeModal() {
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
}

// 展开 / 收起长文本
window.toggleModalText = function(btn) {
    var box = btn.previousElementSibling;
    if (!box) return;
    var collapsed = box.classList.toggle('collapsed');
    btn.innerHTML = collapsed
        ? '展开全文 <i class="fas fa-chevron-down"></i>'
        : '收起 <i class="fas fa-chevron-up"></i>';
};

// 点击卡片打开详情 — 全站唯一的卡片点击入口（ui.js 不再注册卡片点击监听）
if (overlay) document.getElementById('toolGrid').addEventListener('click', function(e) {
    var card = e.target.closest('.tool-card'); if (!card) return;
    // 受限工具（VIP / 登录专属）的「下载」按钮：真实链接在 tool_downloads 表里，
    // 只能由详情弹窗通过 get_download_url() 拿到，所以这里和点卡片本体同路 ——
    // 打开弹窗，不要被下面的站外链接判断拦掉。
    var dlBtn = e.target.closest('[data-dl-tool]');
    // 「去使用」是站外链接：只记录点击并正常跳转，不要同时弹出详情
    if (!dlBtn && e.target.closest('.tool-visit-btn')) return;
    var id = parseInt(card.dataset.id, 10);
    var tool = App.state.tools.find(function(t) { return t.id === id; });
    if (tool) {
        openModal(tool);
        // 从卡片的「下载」按钮进来时，把右栏操作卡闪一下，
        // 让注意力落在下载按钮上（原来是滚到「专属下载」区块）
        if (dlBtn) {
            setTimeout(function () {
                var sec = document.getElementById('_detailActions');
                if (!sec) return;
                sec.classList.add('flash');
                setTimeout(function () { sec.classList.remove('flash'); }, 1200);
            }, 300);
        }
        // 递增浏览量 + 更新卡片计数
        // 注意：incrementView 返回的是新的浏览量数字（也可能是 undefined），
        // 用它来写 DOM，而不是用 tool.views —— 后者在「找不到对象引用」时
        // 可能仍是 undefined，直接写进去卡片上就会显示 NaN。
        if (typeof incrementView === 'function') {
            incrementView(tool.id).then(function (newViews) {
                var numEl = card.querySelector('.tool-views-num');
                if (!numEl) return;
                var n = Number(newViews);
                if (!isNaN(n)) {
                    numEl.textContent = n;
                    tool.views = n;
                }
            }).catch(function() {});
        }
    }
});
if (document.getElementById('modalClose')) document.getElementById('modalClose').addEventListener('click', closeModal);
if (overlay) {
    overlay.addEventListener('click', function(e) { if (!e.target.closest('.modal')) closeModal(); });
    // 详情里的「下载」也计入下载次数（与卡片按钮同一份统计）
    // 注意：这里用 [data-dl-id] 而不是旧的 .modal-link[data-dl-id]，
    // 新版按钮换了类名，只认类名会让统计悄悄失效。
    overlay.addEventListener('click', function(e) {
        var dl = e.target.closest('[data-dl-id]');
        if (dl && typeof incrementDownload === 'function') {
            incrementDownload(parseInt(dl.dataset.dlId, 10)).then(function (n) {
                // 顺手把弹窗头部的下载数刷新掉，否则点完还显示旧值
                var stat = document.querySelector('.detail-stat[data-dl-stat]');
                if (stat && !isNaN(Number(n)) && typeof formatCount === 'function') {
                    stat.innerHTML = '<i class="fas fa-download"></i>' + formatCount(n);
                }
            }).catch(function () {});
        }
    });
}
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeModal(); });
