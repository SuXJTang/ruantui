// ============================================
// features.js — Toast/分享/管理CRUD/AI/QQ/反馈/赞赏
// ============================================
(function() {

function showToast(msg, type) {
    var c = document.getElementById('tc');
    if (!c) {
        c = document.createElement('div'); c.id = 'tc';
        c.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
        document.body.appendChild(c);
    }
    var icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    var colors = { success: '#22c55e', error: '#ef4444', info: '#3B82F6' };
    var t = document.createElement('div');
    t.style.cssText = 'pointer-events:auto;display:flex;align-items:center;gap:10px;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:500;background:var(--card);color:var(--text);box-shadow:0 8px 32px rgba(0,0,0,0.15);border-left:4px solid ' + (colors[type] || '#6B7280') + ';animation:toastIn .35s ease forwards;max-width:360px;';
    t.innerHTML = '<i class="fas ' + (icons[type] || 'fa-info-circle') + '" style="color:' + (colors[type] || '#6B7280') + ';font-size:18px;flex-shrink:0;"></i><span>' + msg + '</span>';
    c.appendChild(t);
    setTimeout(function() {
        t.style.transition = 'all .3s ease';
        t.style.opacity = '0'; t.style.transform = 'translateX(40px)';
        setTimeout(function() { t.remove(); }, 300);
    }, 2500);
}

// 注入toast动画
(function() {
    if (document.getElementById('ts')) return;
    var s = document.createElement('style'); s.id = 'ts';
    s.textContent = '@keyframes toastIn{0%{opacity:0;transform:translateX(40px)}100%{opacity:1;transform:translateX(0)}}';
    document.head.appendChild(s);
})();

// 从 Supabase 加载工具列表
loadTools().then(function() {
    rebuildCategories();
    renderTools('all');
    // 显示最后更新日期
    var fd = document.getElementById('footerDate');
    if (fd) fd.textContent = '· ' + new Date().toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric' }) + ' 更新';
    // 深链接：数据加载完后再检查 URL 参数
    var p = new URLSearchParams(window.location.search);
    var toolId = p.get('tool');
    if (toolId) { var t = tools.find(function(x) { return x.id === parseInt(toolId); }); if (t) openModal(t); }
});

// 排序
var sortSelect = document.getElementById('sortSelect');
if (sortSelect) {
    sortSelect.onchange = function() {
        var val = this.value;
        if (val === 'name') tools.sort(function(a, b) { return a.name.localeCompare(b.name, 'zh'); });
        else if (val === 'popular') tools.sort(function(a, b) { return (b.views || 0) - (a.views || 0); });
        else if (val === 'newest') tools.sort(function(a, b) { return b.id - a.id; });
        else tools.sort(function(a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || a.id - b.id; });
        renderTools(currentFilter);
    };
}

// 分享面板
var sb = document.getElementById('shareBtn'), sp = document.getElementById('sharePanel');
if (sb && sp) {
    sb.onclick = function(e) { e.stopPropagation(); sp.classList.toggle('active'); };
    document.addEventListener('click', function(e) { if (!sp.contains(e.target) && e.target !== sb) sp.classList.remove('active'); });
}
['shareCopyLink', 'shareUrlCopyBtn'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.onclick = function() { copyToClipboard(window.location.origin + window.location.pathname, '链接已复制'); };
});
var shareCopyTextEl = document.getElementById('shareCopyText');
if (shareCopyTextEl) shareCopyTextEl.onclick = function() {
    copyToClipboard('🧰 软推 — 精选软件推荐\n🔗 ' + window.location.origin + window.location.pathname + '\n日常工作中沉淀下来的精选软件，每一个都经过长期使用检验。', '已复制');
};



function copyToClipboard(text, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() { showToast(msg || '已复制', 'success'); }).catch(function() { fallbackCopy(text); });
    } else { fallbackCopy(text); }
}
function fallbackCopy(text) {
    var ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); showToast('已复制', 'success'); } catch(e) { showToast('复制失败', 'error'); }
    document.body.removeChild(ta);
}
window.copyToolLink = function(id) { copyToClipboard(window.location.origin + window.location.pathname + '?tool=' + id, '链接已复制'); };
window.copyToolText = function(id) {
    var t = tools.find(function(x) { return x.id === id; });
    if (t) copyToClipboard('🔧 ' + t.name + '\n⭐ ' + (t.rating || '?') + '/5\n📂 ' + t.category + '\n💬 ' + t.comment + '\n🔗 ' + window.location.origin + window.location.pathname + '?tool=' + id, '已复制');
};
window.downloadQR = function(id) {
    var a = document.createElement('a');
    var shareUrl = window.location.origin + window.location.pathname + '?tool=' + id;
    a.href = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(shareUrl);
    a.download = 'tool-' + id + '-qrcode.png'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
};

// 管理
// SHA-256 哈希的管理密码 — 防止明文泄露（原密码: ruantui2025）
var ADMIN_PASSWORD_HASH = 'dbe0050849070f4d12883d7b943ad59b65983a9e9946c26a0c20153064dc6285', AUTH_KEY = 'mytoolbox_admin';
function isAdmin() { return localStorage.getItem(AUTH_KEY) === 'true'; }
window.logoutAdmin = function() { localStorage.removeItem(AUTH_KEY); showToast('已退出管理', 'info'); };
function checkAdmin() {
    if (isAdmin()) { openMgmt(); return true; }
    // 弹出自定义密码输入框
    var box = document.createElement('div');
    box.id = '_pwdBox';
    box.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;';
    box.innerHTML = '<div style="background:var(--card);border-radius:16px;padding:28px;width:340px;box-shadow:0 20px 60px rgba(0,0,0,.3);text-align:center;">'
        + '<h3 style="font-size:18px;font-weight:700;margin-bottom:4px;">需要管理员密码</h3>'
        + '<p style="font-size:13px;color:var(--text-light);margin-bottom:16px;">输入密码后进入管理面板</p>'
        + '<input type="password" id="_pwdInput" style="width:100%;padding:10px 14px;border:2px solid var(--border);border-radius:10px;font-size:15px;background:var(--bg);color:var(--text);outline:none;box-sizing:border-box;" placeholder="输入密码">'
        + '<div style="display:flex;gap:8px;margin-top:14px;">'
        + '<button id="_pwdCancel" style="flex:1;padding:9px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--text);font-size:14px;font-weight:600;">取消</button>'
        + '<button id="_pwdSubmit" style="flex:1;padding:9px;border-radius:10px;border:none;background:var(--primary);color:#fff;font-size:14px;font-weight:600;">确认</button>'
        + '</div></div>';
    document.body.appendChild(box);
    var input = document.getElementById('_pwdInput');
    input.focus();
    input.onkeydown = function(e) { if (e.key === 'Enter') submitPwd(); };
    document.getElementById('_pwdCancel').onclick = function() { box.remove(); };
    document.getElementById('_pwdSubmit').onclick = submitPwd;
    async function submitPwd() {
        var v = input.value;
        var enc = new TextEncoder();
        var hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(v));
        var hashHex = Array.from(new Uint8Array(hashBuffer)).map(function(b) { return b.toString(16).padStart(2,'0'); }).join('');
        if (hashHex === ADMIN_PASSWORD_HASH) {
            localStorage.setItem(AUTH_KEY, 'true'); box.remove(); showToast('验证通过 ✓', 'success');
            await tryDecrypt(v);  // 同步解密 API Key
            openMgmt();
        }
        else { showToast('密码错误 ✗', 'error'); input.value = ''; input.focus(); input.style.borderColor = '#ef4444'; setTimeout(function() { input.style.borderColor = ''; }, 1500); }
    }
}

function openMgmt() {
    var o = document.getElementById('mgmtOverlay');
    if (o) { o.setAttribute('aria-hidden', 'false'); o.classList.add('active'); document.body.style.overflow = 'hidden'; }
    renderMgmtList();
}

var mgmtBtn = document.getElementById('mgmtBtn');
if (mgmtBtn) mgmtBtn.onclick = function() { checkAdmin(); };
var mgmtOverlay = document.getElementById('mgmtOverlay');
(function() {
    var c = document.querySelector('.mgmt-close');
    if (c && mgmtOverlay) c.onclick = function() { mgmtOverlay.classList.remove('active'); mgmtOverlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };
    if (mgmtOverlay) mgmtOverlay.onclick = function(e) { if (!e.target.closest('.modal')) { mgmtOverlay.classList.remove('active'); mgmtOverlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; } };
})();

var mgmtList = document.getElementById('mgmtList');
function renderMgmtList() {
    if (!mgmtList) return;
    var q = ((document.getElementById('mgmtSearchInput') || {}).value || '').toLowerCase().trim();
    var filtered = q ? tools.filter(function(t) { return t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q); }) : tools;
    mgmtList.innerHTML = filtered.map(function(t) {
        var imgSrc = escHTML(t.iconUrl || (t.slug ? 'https://cdn.simpleicons.org/' + t.slug + '/ffffff' : ''));
        var icon = t.iconUrl ? '<img src="' + imgSrc + '" alt="">' : t.slug ? '<img src="' + imgSrc + '" alt="">' : '<i class="' + escHTML(t.icon || 'fa-cube') + '"></i>';
        var badge = t.is_custom ? '<span>[自定义]</span>' : '';
        var isPinned = t.pinned;
        return '<div class="mgmt-row"><div class="mgmt-row-icon" style="background:' + safeColor(t.color) + '">' + icon + '</div><div class="mgmt-row-info"><h4>' + (isPinned ? '<span class="pinned-badge">推荐</span>' : '') + escHTML(t.name) + badge + '</h4><p>' + escHTML(t.category) + '</p></div><div class="mgmt-row-actions"><button class="pin-btn" data-id="' + t.id + '" title="' + (isPinned ? '取消置顶' : '置顶') + '" style="color:' + (isPinned ? 'var(--primary)' : '') + '"><i class="fas fa-thumbtack"></i></button><button class="edit-btn" data-id="' + t.id + '" title="编辑"><i class="fas fa-pen"></i></button><button class="del-btn" data-id="' + t.id + '" title="删除"><i class="fas fa-trash"></i></button></div></div>';
    }).join('');
    mgmtList.querySelectorAll('.edit-btn').forEach(function(b) { b.onclick = function(e) { e.stopPropagation(); var t = tools.find(function(x) { return x.id === parseInt(this.dataset.id); }.bind(this)); if (t) openForm(t); }; });
    mgmtList.querySelectorAll('.del-btn').forEach(function(b) { b.onclick = function(e) { e.stopPropagation(); var id = parseInt(this.dataset.id); showConfirm('确定删除「' + (tools.find(function(x){return x.id===id})||{}).name + '」？', function() { deleteTool(id); }); }; });
    mgmtList.querySelectorAll('.pin-btn').forEach(function(b) { b.onclick = function(e) { e.stopPropagation(); togglePin(parseInt(this.dataset.id)); }; });
}
function deleteTool(id) {
    removeTool(id).then(function() {
        refreshTools().then(function() { renderMgmtList(); });
        showToast('已删除', 'info');
    }).catch(function() { showToast('删除失败', 'error'); });
}
function showConfirm(msg, onOk) {
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;';
    box.innerHTML = '<div style="background:var(--card);border-radius:16px;padding:24px 28px 20px;width:320px;box-shadow:0 20px 60px rgba(0,0,0,.3);text-align:center;animation:toastIn .25s ease;">'
        + '<p style="font-size:15px;font-weight:600;margin-bottom:4px;">' + msg + '</p>'
        + '<p style="font-size:12px;color:var(--text-light);margin-bottom:18px;">此操作不可撤销</p>'
        + '<div style="display:flex;gap:8px;">'
        + '<button class="confirm-cancel" style="flex:1;padding:9px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--text);font-size:14px;font-weight:600;">取消</button>'
        + '<button class="confirm-ok" style="flex:1;padding:9px;border-radius:10px;border:none;background:#ef4444;color:#fff;font-size:14px;font-weight:600;">删除</button>'
        + '</div></div>';
    document.body.appendChild(box);
    box.querySelector('.confirm-cancel').onclick = function() { box.remove(); };
    box.querySelector('.confirm-ok').onclick = function() { box.remove(); onOk(); };
    box.onclick = function(e) { if (e.target === box) box.remove(); };
}

function togglePin(id) {
    var t = tools.find(function(x) { return x.id === id; });
    if (!t) return;
    var newPinned = !t.pinned;
    updateTool(id, { pinned: newPinned }).then(function() {
        t.pinned = newPinned;
        refreshTools().then(function() { renderMgmtList(); });
        showToast(newPinned ? '已置顶' : '已取消置顶', 'success');
    }).catch(function() { showToast('操作失败', 'error'); });
}

// 表单
var formOverlay = document.getElementById('formOverlay');
function openForm(tool) {
    if (!formOverlay) return;
    document.getElementById('formTitle').textContent = tool ? '编辑工具' : '添加工具';
    document.getElementById('formId').value = tool ? tool.id : '';
    document.getElementById('formName').value = tool ? tool.name : '';
    document.getElementById('formCategory').value = tool ? tool.category : '';
    document.getElementById('formColor').value = tool ? tool.color : '#3B82F6';
    document.getElementById('formComment').value = tool ? tool.comment : '';
    document.getElementById('formDetail').value = tool ? (tool.detail || '') : '';
    document.getElementById('formTags').value = tool ? (tool.tags || []).join(', ') : '';
    document.getElementById('formUrl').value = tool ? (tool.url || '') : '';
    document.getElementById('formDownload').value = tool ? (tool.download || '') : '';
    document.getElementById('formUsage').value = tool ? (tool.usage || '') : '';
    document.getElementById('formSlug').value = tool ? (tool.slug || '') : '';
    document.getElementById('formIconUrl').value = tool ? (tool.iconUrl || '') : '';
    document.getElementById('formIcon').value = tool ? (tool.icon || '') : '';
    updateIconPreview();
    formOverlay.setAttribute('aria-hidden', 'false'); formOverlay.classList.add('active'); document.body.style.overflow = 'hidden';
}
function closeForm() { if (formOverlay) { formOverlay.classList.remove('active'); formOverlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; } }

var addBtn = document.getElementById('mgmtAddBtn');
if (addBtn) addBtn.onclick = function() { openForm(null); };
var exportBtn = document.getElementById('mgmtExportBtn');
if (exportBtn) exportBtn.onclick = function() {
    var blob = new Blob([JSON.stringify(tools, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mytoolbox-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    showToast('已导出 ' + tools.length + ' 个工具', 'success');
};
var cancelBtn = document.getElementById('formCancel');
if (cancelBtn) cancelBtn.onclick = closeForm;
var formClose = document.querySelector('.form-close');
if (formClose) formClose.onclick = closeForm;
if (formOverlay) formOverlay.onclick = function(e) { if (!e.target.closest('.modal')) closeForm(); };

var toolForm = document.getElementById('toolForm');
if (toolForm) toolForm.onsubmit = function(e) {
    e.preventDefault();
    var name = document.getElementById('formName').value.trim(), cat = document.getElementById('formCategory').value.trim();
    var dl = document.getElementById('formDownload').value.trim();
    if (!name || !cat) { showToast('请填写名称和分类', 'error'); return; }
    var data = {
        name: name, category: cat, color: document.getElementById('formColor').value || '#3B82F6',
        comment: document.getElementById('formComment').value.trim(),
        detail: document.getElementById('formDetail').value.trim(),
        tags: document.getElementById('formTags').value.split(/[,，、\s]+/).filter(Boolean),
    };
    ['url','download','usage','slug','iconUrl','icon'].forEach(function(k) { var v = document.getElementById('form' + k.charAt(0).toUpperCase() + k.slice(1)).value.trim(); data[k] = v || null; });
    var isEdit = !!document.getElementById('formId').value;
    var savePromise;
    if (isEdit) {
        var id = parseInt(document.getElementById('formId').value);
        savePromise = updateTool(id, data);
    } else {
        data.is_custom = true;
        savePromise = insertTool(data);
    }
    savePromise.then(function() {
        closeForm(); refreshTools().then(function() { renderMgmtList(); });
        showToast(isEdit ? '已更新 ✓' : '已添加 ✓', 'success');
    }).catch(function() { showToast('保存失败，请重试', 'error'); });
};

['formSlug', 'formIconUrl', 'formColor'].forEach(function(id) { var el = document.getElementById(id); if (el) el.oninput = updateIconPreview; });
var search = document.getElementById('mgmtSearchInput');
if (search) search.oninput = function() { renderMgmtList(); };

function updateIconPreview() {
    var slug = (document.getElementById('formSlug') || {}).value || '';
    var url = (document.getElementById('formIconUrl') || {}).value || '';
    var color = (document.getElementById('formColor') || {}).value || '#3B82F6';
    var p = document.getElementById('iconPreview'), img = document.getElementById('previewImg'), ic = document.getElementById('previewIcon');
    if (!p) return;
    p.style.background = color;
    if (url && img) { img.src = url; img.style.display = 'block'; if (ic) ic.style.display = 'none'; }
    else if (slug && img) { img.src = 'https://cdn.simpleicons.org/' + slug + '/ffffff'; img.style.display = 'block'; if (ic) ic.style.display = 'none'; }
    else { if (img) img.style.display = 'none'; if (ic) ic.style.display = 'block'; }
}

// 弹窗绑定
function bindModal(btnId, overlayId, closeClass) {
    var b = document.getElementById(btnId), o = document.getElementById(overlayId);
    if (!b || !o) return;
    b.onclick = function() { o.setAttribute('aria-hidden', 'false'); o.classList.add('active'); document.body.style.overflow = 'hidden'; };
    var c = document.querySelector('.' + closeClass);
    if (c) c.onclick = function() { o.classList.remove('active'); o.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };
    o.onclick = function(e) { if (!e.target.closest('.modal')) { o.classList.remove('active'); o.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; } };
}
bindModal('qqBtn', 'qqOverlay', 'qq-close');
bindModal('feedbackBtn', 'feedbackOverlay', 'feedback-close');
bindModal('donateBtn', 'donateOverlay', 'donate-close');

// 赞赏码点击放大
(function() {
    var qrOverlay = document.createElement('div');
    qrOverlay.id = 'qrZoomOverlay';
    qrOverlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:10000;display:flex;align-items:center;justify-content:center;opacity:0;visibility:hidden;transition:opacity .3s,visibility .3s;cursor:pointer;';
    var qrImg = document.createElement('img');
    qrImg.style.cssText = 'max-width:80vw;max-height:80vh;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.5);transform:scale(.5);transition:transform .35s cubic-bezier(.25,.46,.45,.94);background:#fff;padding:12px;';
    qrOverlay.appendChild(qrImg);
    document.body.appendChild(qrOverlay);
    qrOverlay.onclick = function() { qrOverlay.style.opacity = '0'; qrOverlay.style.visibility = 'hidden'; qrImg.style.transform = 'scale(.5)'; };
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') qrOverlay.click(); });

    var donateOverlay = document.getElementById('donateOverlay');
    if (donateOverlay) {
        donateOverlay.addEventListener('click', function(e) {
            var qr = e.target.closest('.donate-qr');
            if (!qr) return;
            qrImg.src = qr.src;
            qrOverlay.style.visibility = 'visible'; qrOverlay.style.opacity = '1';
            requestAnimationFrame(function() { qrImg.style.transform = 'scale(1)'; });
        });
    }
})();
window.copyQQNumber = function() { copyToClipboard(document.getElementById('qqNumber').textContent, 'QQ 群号已复制'); };

// AI
var DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 解密：用管理密码从 apikey-config.js 密文恢复 API Key
var _cachedKey = null;
async function decryptApiKey(password) {
    try {
        var enc = new TextEncoder();
        var salt = _hexToBytes(API_KEY_SALT);
        var iv = _hexToBytes(API_KEY_IV);
        var ct = _hexToBytes(ENCRYPTED_API_KEY);
        var km = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
        var ak = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
            km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
        );
        var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, ak, ct);
        return new TextDecoder().decode(pt);
    } catch(e) { return null; }
}
// 尝试用密码解密，成功则缓存并返回
async function tryDecrypt(pw) {
    if (!ENCRYPTED_API_KEY || !API_KEY_SALT || !API_KEY_IV) return null;
    var dk = await decryptApiKey(pw);
    if (dk) { _cachedKey = dk; return dk; }
    return null;
}

async function getApiKey() {
    if (_cachedKey) return _cachedKey;
    var k = localStorage.getItem('deepseek_api_key');
    if (k) return k;
    // 密码解密（与管理密码一致）
    var pw = prompt('🔐 输入管理密码：');
    if (pw && pw.trim()) {
        k = await tryDecrypt(pw.trim());
        if (k) { showToast('解密成功 ✓', 'success'); return k; }
        showToast('密码错误', 'error');
    }
    // 回退
    k = prompt('输入 DeepSeek API Key：\nhttps://platform.deepseek.com/api_keys');
    if (k && k.trim()) { localStorage.setItem('deepseek_api_key', k.trim()); return k.trim(); }
    return null;
}
window.resetApiKey = function() { localStorage.removeItem('deepseek_api_key'); _cachedKey = null; showToast('已清除', 'info'); };

function _hexToBytes(hex) { var b = new Uint8Array(hex.length/2); for (var i=0;i<hex.length;i+=2) b[i/2]=parseInt(hex.substr(i,2),16); return b; }

async function callDeepSeek(userPrompt) {
    var k = await getApiKey(); if (!k) return null;
    try { var r = await fetch(DEEPSEEK_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + k }, body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'system', content: '你是一个软件推荐专家，用简洁生动的中文写推荐语。直接输出内容。' }, { role: 'user', content: userPrompt }], temperature: .7, max_tokens: 500 }) });
        if (!r.ok) { var ct = r.headers.get('Content-Type') || ''; var e = ct.includes('application/json') ? await r.json().catch(function() {}) : null; showToast('AI 失败：' + ((e && e.error && e.error.message) || 'HTTP ' + r.status), 'error'); if (r.status === 401) { localStorage.removeItem('deepseek_api_key'); _cachedKey = null; } return null; }
        var d = await r.json(); return (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content.trim()) || null;
    } catch(e) { showToast('网络错误', 'error'); return null; }
}
function gv() { return { name: (document.getElementById('formName') || {}).value || '', category: (document.getElementById('formCategory') || {}).value || '' }; }
window.aiGenerateComment = async function() {
    var v = gv(); if (!v.name) { showToast('请先填名称', 'error'); return; }
    var el = document.getElementById('formComment'); if (!el) return;
    el.value = '⏳ 生成中...'; var t = await callDeepSeek('用一句话推荐「' + v.name + '」这款' + v.category + '，20字以内。');
    if (t) { el.value = t.replace(/^[""'']|[""'']$/g, ''); showToast('已生成 ✓', 'success'); } else { el.value = v.name + '：好用，推荐。'; }
};
window.aiGenerateDetail = async function() {
    var v = gv(); if (!v.name) { showToast('请先填名称', 'error'); return; }
    var el = document.getElementById('formDetail'); if (!el) return;
    el.value = '⏳ 生成中...'; var t = await callDeepSeek('写一段100-150字推荐「' + v.name + '」（' + v.category + '），口语化。');
    if (t) { el.value = t.replace(/^[""'']|[""'']$/g, ''); showToast('已生成 ✓', 'success'); } else { el.value = v.name + ' 是一款实用的' + v.category + '工具。'; }
};
window.aiGenerateUsage = async function() {
    var v = gv(); if (!v.name) { showToast('请先填名称', 'error'); return; }
    var el = document.getElementById('formUsage'); if (!el) return;
    el.value = '⏳ 生成中...'; var t = await callDeepSeek('用2-3句话写「' + v.name + '」的使用说明。');
    if (t) { el.value = t.replace(/^[""'']|[""'']$/g, ''); showToast('已生成 ✓', 'success'); } else { el.value = '下载安装后按向导配置即可使用。'; }
};

})();

// PWA
var deferredPrompt = null;
var installBtn = document.querySelector('.install-btn');
if (installBtn) installBtn.style.display = 'none';

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(function(reg) {
        console.log('SW registered');
    }).catch(function() {});
}

window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.style.display = '';
}, { once: true });

window.installApp = function() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function(r) {
            deferredPrompt = null;
            if (r.outcome === 'accepted') showToast('安装成功 🎉', 'success');
        });
        return;
    }
    var ua = navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua)) {
        showToast('Safari 点底部 <img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Crect x=%222%22 y=%226%22 width=%2220%22 height=%2212%22 rx=%222%22 fill=%22none%22 stroke=%22%23fff%22 stroke-width=%222%22/%3E%3Cpath d=%22M8 12l-5 8h18l-4-8%22 fill=%22%23fff%22 opacity=%220.3%22/%3E%3C/svg%3E" style="width:14px;vertical-align:middle;"> 分享 → 添加到主屏幕', 'info');
    } else if (/chrome|edg/i.test(ua)) {
        showToast('地址栏右侧 ⋮ → 安装「软推」', 'info');
    } else {
        showToast('浏览器菜单 → 添加到主屏幕', 'info');
    }
};

// 回到顶部
(function() {
    var btn = document.getElementById('backTop');
    if (!btn) return;
    var ticking = false;
    window.addEventListener('scroll', function() {
        if (!ticking) { requestAnimationFrame(function() { btn.classList.toggle('visible', window.scrollY > 300); ticking = false; }); ticking = true; }
    });
    btn.addEventListener('click', function() { window.scrollTo({ top: 0, behavior: 'smooth' }); });
})();
