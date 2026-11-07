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

    var shareUrl = window.location.origin + window.location.pathname + '?tool=' + tool.id;
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

    overlay.setAttribute('aria-hidden', 'false'); overlay.classList.add('active'); document.body.style.overflow = 'hidden';
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
        if (typeof incrementView === 'function') {
            incrementView(tool.id).then(function() {
                var numEl = card.querySelector('.tool-views-num');
                if (numEl) numEl.textContent = tool.views;
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
