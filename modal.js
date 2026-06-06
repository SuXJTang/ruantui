// ============================================
// modal.js — 详情弹窗 + 工具分享
// ============================================
var overlay = document.getElementById('modalOverlay');
var modalBody = document.getElementById('modalBody');

function openModal(tool) {
    if (!tool) return;
    var iconHTML = renderIconHTML(tool);
    var tagsArr = Array.isArray(tool.tags) ? tool.tags : [];
    var tagsHTML = tagsArr.map(function(t) { return '<span class="modal-tag">' + escHTML(t) + '</span>'; }).join('');
    var links = [];
    if (tool.url) links.push('<a href="' + escHTML(tool.url) + '" class="modal-link primary" target="_blank" rel="noopener"><i class="fas fa-globe"></i> 官网</a>');
    if (tool.download) links.push('<a href="' + escHTML(tool.download) + '" class="modal-link" target="_blank" rel="noopener"><i class="fas fa-download"></i> 下载</a>');

    var shareUrl = window.location.origin + window.location.pathname + '?tool=' + tool.id;
    var qrSrc = 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=' + encodeURIComponent(shareUrl);

    modalBody.innerHTML = '<div class="modal-header"><div class="modal-icon" style="background:' + safeColor(tool.color) + '">' + iconHTML + '</div><div class="modal-hinfo"><h2>' + escHTML(tool.name) + '</h2><div class="modal-hmeta"><span class="tool-cat">' + escHTML(tool.category) + '</span><span class="modal-views">👁 ' + (tool.views || 0) + ' 次浏览</span></div></div></div>'
        + '<div class="modal-section"><h4>详细介绍</h4><p>' + escHTML(tool.detail || tool.comment) + '</p></div>'
        + (tool.usage ? '<div class="modal-section"><h4>使用说明</h4><p>📖 ' + escHTML(tool.usage) + '</p></div>' : '')
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

function closeModal() { overlay.classList.remove('active'); overlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }

// 点击卡片打开
document.getElementById('toolGrid').addEventListener('click', function(e) {
    var card = e.target.closest('.tool-card'); if (!card) return;
    var tool = App.state.tools.find(function(t) { return t.id === parseInt(card.dataset.id); });
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
document.getElementById('modalClose').addEventListener('click', closeModal);
overlay.addEventListener('click', function(e) { if (!e.target.closest('.modal')) closeModal(); });
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeModal(); });
