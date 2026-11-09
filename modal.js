// ============================================
// modal.js — 详情弹窗 + 工具分享
// ============================================
var overlay = document.getElementById('modalOverlay');
var modalBody = document.getElementById('modalBody');

function openModal(tool) {
    if (!tool || !modalBody) return;
    var iconHTML = renderIconHTML(tool);
    var tagsArr = Array.isArray(tool.tags) ? tool.tags : [];
    var tagsHTML = tagsArr.map(function(t) { return '<span class="modal-tag">' + escHTML(t) + '</span>'; }).join('');
    var links = [];
    // 联盟链接优先
    if (tool.affiliateUrl) links.push('<a href="' + escHTML(tool.affiliateUrl) + '" class="modal-link affiliate" target="_blank" rel="noopener" data-aff-id="' + escHTML(tool.id) + '"><i class="fas fa-fire"></i> 优惠购买</a>');
    if (tool.url) links.push('<a href="' + escHTML(tool.url) + '" class="modal-link primary" target="_blank" rel="noopener"><i class="fas fa-globe"></i> 官网</a>');
    if (tool.download) links.push('<a href="' + escHTML(tool.download) + '" class="modal-link" target="_blank" rel="noopener"><i class="fas fa-download"></i> 下载</a>');
    if (tool.link && tool.link !== tool.url && tool.link !== tool.affiliateUrl) links.push('<a href="' + escHTML(tool.link) + '" class="modal-link" target="_blank" rel="noopener"><i class="fas fa-external-link-alt"></i> 直达</a>');

    // 分享地址走独立页面路径 /t/{id}（Worker 已在服务端注入该工具的 meta），
    // 没有 toolShareUrl 时退回同形式，保证单独引用也不会坏。
    var shareUrl = window.toolShareUrl ? window.toolShareUrl(tool.id) : (window.location.origin + '/t/' + tool.id);
    var qrSrc = 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=' + encodeURIComponent(shareUrl);

    // 长文本折叠：默认只显示 3 行，超出时提供「展开」。
    // 之前详细介绍和使用说明全文铺开，手机上要滑好几屏才看得到链接和分享。
    function sectionHTML(title, text, prefix) {
        if (!text) return '';
        var body = prefix ? prefix + escHTML(text) : escHTML(text);
        // 粗略判断是否需要折叠按钮：按全角字符估算，3 行大约能放 60-75 字
        var needToggle = String(text).length > 66;
        return '<div class="modal-section">' +
            '<h4>' + escHTML(title) + '</h4>' +
            '<div class="modal-text' + (needToggle ? ' collapsed' : '') + '">' + body + '</div>' +
            (needToggle ? '<button type="button" class="modal-toggle" onclick="toggleModalText(this)">展开全文 <i class="fas fa-chevron-down"></i></button>' : '') +
            '</div>';
    }

    modalBody.innerHTML = '<div class="modal-header"><div class="modal-icon" style="background:' + safeColor(tool.color) + '">' + iconHTML + '</div><div class="modal-hinfo"><h2>' + escHTML(tool.name) + '</h2><div class="modal-hmeta"><span class="tool-cat">' + escHTML(tool.category) + '</span><span class="modal-views">👁 ' + (tool.views || 0) + ' 次浏览</span></div></div></div>'
        + sectionHTML('详细介绍', tool.detail || tool.comment, '')
        + sectionHTML('使用说明', tool.usage, '📖 ')
        + (links.length ? '<div class="modal-section"><h4>链接</h4><div class="modal-links">' + links.join('') + '</div></div>' : '')
        + '<div class="modal-section" id="_vipDownloadSection"></div>'
        + '<div class="modal-section"><h4>标签</h4><div class="modal-tags">' + tagsHTML + '</div></div>'

        + '<div class="modal-section modal-share"><h4>分享此工具</h4><div class="share-body">'
        + '<div class="share-qr-col"><img src="' + qrSrc + '" alt="二维码" class="share-qr-img" loading="lazy" onerror="this.onerror=null;this.style.display=\'none\';this.nextElementSibling.style.display=\'block\'"><span class="share-qr-label">扫码查看</span></div>'
        + '<div class="share-actions"><button class="share-act-btn" onclick="window.copyToolLink(' + tool.id + ')"><i class="fas fa-link"></i> 复制链接</button>'
        + '<button class="share-act-btn" onclick="window.copyToolText(' + tool.id + ')"><i class="fas fa-comment-dots"></i> 复制推荐语</button>'
        + '<button class="share-act-btn" onclick="window.downloadQR(' + tool.id + ')"><i class="fas fa-download"></i> 保存二维码</button></div></div></div>';

    // QR 图片加载失败降级：显示纯文本链接
    var qrImg = modalBody.querySelector('.share-qr-img');
    if (qrImg) {
        qrImg.onerror = function() {
            this.style.display = 'none';
            var label = this.nextElementSibling;
            if (label) label.textContent = shareUrl;
        };
    }

    // VIP 专属下载区：只有数据库里有专属链接、且当前用户有权限时才显示。
    // 链接本身不写进 HTML，必须调 get_download_url() 由数据库判断权限后返回，
    // 所以普通用户在页面源码里看不到 VIP 地址。
    loadVipDownload(tool.id);

    overlay.setAttribute('aria-hidden', 'false'); overlay.classList.add('active'); document.body.style.overflow = 'hidden';
}

// 拉取并渲染 VIP 专属下载链接
function loadVipDownload(toolId) {
    var box = document.getElementById('_vipDownloadSection');
    if (!box) return;

    // 没登录就没有 VIP 概念，不显示这一块（不打扰游客）
    if (!window.Auth || !window.Auth.isLoggedIn()) {
        box.style.display = 'none';
        return;
    }
    if (typeof adminFetch !== 'function') {
        box.style.display = 'none';
        return;
    }

    box.style.display = '';
    box.innerHTML = '<h4>专属下载</h4><p style="font-size:12.5px;color:var(--text-light);">检查中…</p>';

    // get_download_url 是数据库函数：内部判断身份，无权限时返回空集
    adminFetch('POST', 'rpc/get_download_url', { p_tool_id: toolId })
        .then(function (res) { return res.json(); })
        .then(function (rows) {
            var target = document.getElementById('_vipDownloadSection');
            if (!target) return;   // 弹窗已关闭
            var row = Array.isArray(rows) && rows[0];
            if (!row || !row.url) {
                // 没有专属链接，或当前用户没有下载权限 —— 直接隐藏这一块，
                // 不提示「你没权限」，避免把「有这个资源」的事实暴露给普通用户
                target.style.display = 'none';
                return;
            }
            target.style.display = '';
            target.innerHTML = '<h4>专属下载</h4>' +
                '<div class="modal-links">' +
                '<a href="' + escHTML(row.url) + '" class="modal-link primary" target="_blank" rel="noopener">' +
                '<i class="fas fa-download"></i> ' +
                (row.tier === 'vip' ? 'VIP 专属下载' : '登录下载') +
                '</a></div>';
        })
        .catch(function () {
            // 函数不存在（还没执行 migration-vip.sql）或网络问题：静默隐藏
            var target = document.getElementById('_vipDownloadSection');
            if (target) target.style.display = 'none';
        });
}

function closeModal() {
    if (!overlay) return;
    overlay.classList.remove('active'); overlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = '';
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
    // 「去使用」是站外链接：只记录点击并正常跳转，不要同时弹出详情
    if (e.target.closest('.tool-visit-btn')) return;
    var id = parseInt(card.dataset.id, 10);
    var tool = App.state.tools.find(function(t) { return t.id === id; });
    if (tool) {
        openModal(tool);
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
    // 优惠购买埋点（替代原先内联 onclick 字符串：名字含引号会把属性截断成语法错误）
    overlay.addEventListener('click', function(e) {
        var a = e.target.closest('.modal-link[data-aff-id]');
        if (a) trackToolClick(a.dataset.affId, '');
    });
}
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeModal(); });
