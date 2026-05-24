// ============================================
// modal.js — 详情弹窗 + 工具分享
// ============================================
var overlay = document.getElementById('modalOverlay');
var modalBody = document.getElementById('modalBody');

function openModal(tool) {
    if (!tool) return;
    var iconHTML = tool.iconUrl ? '<img src="' + tool.iconUrl + '" alt="">' : tool.slug ? '<img src="https://cdn.simpleicons.org/' + tool.slug + '/ffffff" alt="">' : '<i class="' + (tool.icon || 'fa-cube') + '"></i>';
    var tagsHTML = tool.tags.map(function(t) { return '<span class="modal-tag">' + t + '</span>'; }).join('');
    var links = [];
    if (tool.url) links.push('<a href="' + tool.url + '" class="modal-link primary" target="_blank"><i class="fas fa-globe"></i> 官网</a>');
    if (tool.download) links.push('<a href="' + tool.download + '" class="modal-link" target="_blank"><i class="fas fa-download"></i> 下载</a>');
    
    var stars = '★'.repeat(tool.rating) + '☆'.repeat(5 - tool.rating);
    var pageUrl = window.location.href;

    modalBody.innerHTML = '<div class="modal-header"><div class="modal-icon" style="background:' + tool.color + '">' + iconHTML + '</div><div class="modal-hinfo"><h2>' + tool.name + '</h2><div class="modal-hmeta"><span class="tool-rating"><i class="fas fa-star"></i> ' + tool.rating + '.0</span><span class="tool-cat">' + tool.category + '</span></div></div></div>'
        + '<div class="modal-section"><h4>详细介绍</h4><p>' + (tool.detail || tool.comment) + '</p></div>'
        + (tool.usage ? '<div class="modal-section"><h4>使用说明</h4><p>📖 ' + tool.usage + '</p></div>' : '')
        + (links.length ? '<div class="modal-section"><h4>链接</h4><div class="modal-links">' + links.join('') + '</div></div>' : '')
        + '<div class="modal-section"><h4>标签</h4><div class="modal-tags">' + tagsHTML + '</div></div>'

        + '<div class="modal-section modal-share"><h4>分享此工具</h4><div class="share-body">'
        + '<div class="share-qr-col"><img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=' + encodeURIComponent(pageUrl + '?tool=' + tool.id) + '" alt="" class="share-qr-img"><span class="share-qr-label">扫码查看</span></div>'
        + '<div class="share-actions"><button class="share-act-btn" onclick="window.copyToolLink(' + tool.id + ')"><i class="fas fa-link"></i> 复制链接</button>'
        + '<button class="share-act-btn" onclick="window.copyToolText(' + tool.id + ')"><i class="fas fa-comment-dots"></i> 复制推荐语</button>'
        + '<button class="share-act-btn" onclick="window.downloadQR(' + tool.id + ')"><i class="fas fa-download"></i> 保存二维码</button></div></div></div>';

    overlay.setAttribute('aria-hidden', 'false'); overlay.classList.add('active'); document.body.style.overflow = 'hidden';
}

function closeModal() { overlay.classList.remove('active'); overlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }

// 点击卡片打开
document.getElementById('toolGrid').addEventListener('click', function(e) {
    var card = e.target.closest('.tool-card'); if (!card) return;
    var tool = tools.find(function(t) { return t.id === parseInt(card.dataset.id); });
    if (tool) openModal(tool);
});
document.getElementById('modalClose').addEventListener('click', closeModal);
overlay.addEventListener('click', function(e) { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeModal(); });
