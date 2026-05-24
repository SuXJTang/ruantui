// ============================================
// features.js — Toast/分享/管理CRUD/AI/QQ/反馈/赞赏
// ============================================
(function() {

function showToast(msg, type) {
    var c = document.getElementById('tc');
    if (!c) {
        c = document.createElement('div'); c.id = 'tc';
        c.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;';
        document.body.appendChild(c);
    }
    var t = document.createElement('div');
    t.textContent = msg;
    var colors = { error: '#ef4444', success: '#22c55e', info: '#3B82F6' };
    t.style.cssText = 'padding:10px 24px;border-radius:999px;font-size:14px;font-weight:500;color:#fff;background:' + (colors[type] || '#6B7280') + ';box-shadow:0 8px 24px rgba(0,0,0,0.2);animation:ti .35s ease forwards;margin-top:4px;';
    c.appendChild(t);
    setTimeout(function() {
        t.style.transition = 'all .3s ease';
        t.style.opacity = '0';
        t.style.transform = 'translateY(-10px)';
        setTimeout(function() { t.remove(); }, 300);
    }, 2200);
}

// 注入toast动画
(function() {
    if (document.getElementById('ts')) return;
    var s = document.createElement('style'); s.id = 'ts';
    s.textContent = '@keyframes ti{0%{opacity:0;transform:translateY(15px) scale(.9)}100%{opacity:1;transform:translateY(0) scale(1)}}';
    document.head.appendChild(s);
})();

// 立即渲染卡片
tools = getMergedTools();
rebuildCategories();
renderTools('all');

// 分享面板
var sb = document.getElementById('shareBtn'), sp = document.getElementById('sharePanel');
if (sb && sp) {
    sb.onclick = function(e) { e.stopPropagation(); sp.classList.toggle('active'); };
    document.onclick = function(e) { if (!sp.contains(e.target) && e.target !== sb) sp.classList.remove('active'); };
}
['shareCopyLink', 'shareUrlCopyBtn'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.onclick = function() { copyToClipboard(window.location.href, '链接已复制'); };
});

// 深链接
(function() {
    var p = new URLSearchParams(window.location.search);
    var id = p.get('tool');
    if (id) setTimeout(function() { var t = tools.find(function(x) { return x.id === parseInt(id); }); if (t) openModal(t); }, 600);
})();

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
window.copyToolLink = function(id) { copyToClipboard(window.location.href + '?tool=' + id, '链接已复制'); };
window.copyToolText = function(id) {
    var t = tools.find(function(x) { return x.id === id; });
    if (t) copyToClipboard('🔧 ' + t.name + '\n⭐ ' + t.rating + '/5\n📂 ' + t.category + '\n💬 ' + t.comment + '\n🔗 ' + window.location.href + '?tool=' + id, '已复制');
};
window.downloadQR = function(id) {
    var a = document.createElement('a');
    a.href = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(window.location.href + '?tool=' + id);
    a.download = 'tool-' + id + '-qrcode.png'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
};

// 管理
var ADMIN_PASSWORD = 'ruantui2025', AUTH_KEY = 'mytoolbox_admin';
var GITHUB_TOKEN = localStorage.getItem('github_token') || '';
var GITHUB_REPO = 'SuXJTang/ruantui';
var GITHUB_BRANCH = 'master';
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
    function submitPwd() {
        var v = input.value;
        if (v === ADMIN_PASSWORD) { localStorage.setItem(AUTH_KEY, 'true'); box.remove(); showToast('验证通过 ✓', 'success'); openMgmt(); }
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
    if (mgmtOverlay) mgmtOverlay.onclick = function(e) { if (e.target === mgmtOverlay) { mgmtOverlay.classList.remove('active'); mgmtOverlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; } };
})();

var mgmtList = document.getElementById('mgmtList');
function renderMgmtList() {
    if (!mgmtList) return;
    var q = ((document.getElementById('mgmtSearchInput') || {}).value || '').toLowerCase().trim();
    var filtered = q ? tools.filter(function(t) { return t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q); }) : tools;
    var pinned = (loadUserData() || {}).pinned || [];
    mgmtList.innerHTML = filtered.map(function(t) {
        var icon = t.iconUrl ? '<img src="' + t.iconUrl + '" alt="">' : t.slug ? '<img src="https://cdn.simpleicons.org/' + t.slug + '/ffffff" alt="">' : '<i class="' + (t.icon || 'fa-cube') + '"></i>';
        var badge = t._userAdded ? '<span>[自定义]</span>' : '';
        var isPinned = pinned.includes(t.id);
        return '<div class="mgmt-row"><div class="mgmt-row-icon" style="background:' + t.color + '">' + icon + '</div><div class="mgmt-row-info"><h4>' + (isPinned ? '<i class="fas fa-thumbtack" style="color:var(--primary);font-size:11px;margin-right:3px;"></i>' : '') + t.name + badge + '</h4><p>' + t.category + '</p></div><div class="mgmt-row-actions"><button class="pin-btn" data-id="' + t.id + '" title="' + (isPinned ? '取消置顶' : '置顶') + '" style="color:' + (isPinned ? 'var(--primary)' : '') + '"><i class="fas fa-thumbtack"></i></button><button class="edit-btn" data-id="' + t.id + '" title="编辑"><i class="fas fa-pen"></i></button><button class="del-btn" data-id="' + t.id + '" title="删除"><i class="fas fa-trash"></i></button></div></div>';
    }).join('');
    mgmtList.querySelectorAll('.edit-btn').forEach(function(b) { b.onclick = function(e) { e.stopPropagation(); var t = tools.find(function(x) { return x.id === parseInt(this.dataset.id); }.bind(this)); if (t) openForm(t); }; });
    mgmtList.querySelectorAll('.del-btn').forEach(function(b) { b.onclick = function(e) { e.stopPropagation(); var id = parseInt(this.dataset.id); if (confirm('确定删除？')) deleteTool(id); }; });
    mgmtList.querySelectorAll('.pin-btn').forEach(function(b) { b.onclick = function(e) { e.stopPropagation(); togglePin(parseInt(this.dataset.id)); }; });
}
function deleteTool(id) {
    var d = loadUserData() || { deleted: [], edited: {}, added: [], nextId: 1000 };
    if (!d.deleted.includes(id)) d.deleted.push(id); if (d.added) d.added = d.added.filter(function(t) { return t.id !== id; }); delete d.edited[id];
    saveUserData(d); refreshTools(); renderMgmtList(); showToast('已删除', 'info');
}
function togglePin(id) {
    var d = loadUserData() || { deleted: [], edited: {}, added: [], nextId: 1000 };
    if (!d.pinned) d.pinned = [];
    var idx = d.pinned.indexOf(id);
    if (idx > -1) d.pinned.splice(idx, 1);
    else d.pinned.push(id);
    console.log('Saving to localStorage:', JSON.stringify(d));
    saveUserData(d); refreshTools(); renderMgmtList();
    showToast(idx > -1 ? '已取消置顶' : '已置顶', 'success');
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
    document.getElementById('formSponsor').value = tool ? (tool.sponsor || '') : '';
    document.getElementById('formUsage').value = tool ? (tool.usage || '') : '';
    document.getElementById('formSlug').value = tool ? (tool.slug || '') : '';
    document.getElementById('formIconUrl').value = tool ? (tool.iconUrl || '') : '';
    updateIconPreview();
    formOverlay.setAttribute('aria-hidden', 'false'); formOverlay.classList.add('active'); document.body.style.overflow = 'hidden';
}
function closeForm() { if (formOverlay) { formOverlay.classList.remove('active'); formOverlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; } }

var addBtn = document.getElementById('mgmtAddBtn');
if (addBtn) addBtn.onclick = function() { openForm(null); };
var exportBtn = document.getElementById('mgmtExportBtn');
if (exportBtn) exportBtn.onclick = function() {
    if (!GITHUB_TOKEN) {
        var t = prompt('输入 GitHub Personal Access Token（repo 权限）：\nhttps://github.com/settings/tokens');
        if (t && t.trim()) { GITHUB_TOKEN = t.trim(); localStorage.setItem('github_token', GITHUB_TOKEN); }
        else { showToast('需要 Token 才能同步到 GitHub', 'error'); return; }
    }
    showToast('正在同步到 GitHub...', 'info');
    var merged = getMergedTools();
    var newData = 'const BASE_TOOLS = ' + JSON.stringify(merged, null, 4) + ';\n\n' +
        'const STORAGE_KEY = \'mytoolbox_data\';\nvar tools = [];\nvar currentFilter = \'all\';\nvar currentSearch = \'\';\n\n' +
        'function loadUserData() { try { var r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch(e) { return null; } }\n' +
        'function saveUserData(d) { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }\n\n' +
        'function getMergedTools() {\n    var d = loadUserData() || {};\n    var deleted = d.deleted || [], edited = d.edited || {}, added = d.added || [];\n    var pinned = d.pinned || [];\n    var m = BASE_TOOLS.filter(function(t) { return !deleted.includes(t.id); }).map(function(t) { return Object.assign({}, t, edited[t.id] || {}); });\n    added.forEach(function(t) { t._userAdded = true; m.push(t); });\n    m.sort(function(a, b) { var ap = pinned.includes(a.id) ? 0 : 1; var bp = pinned.includes(b.id) ? 0 : 1; return ap - bp; });\n    return m;\n}\n\nfunction refreshTools() { tools = getMergedTools(); rebuildCategories(); renderTools(currentFilter); }\n';

    var url = 'https://api.github.com/repos/' + GITHUB_REPO + '/contents/data.js';
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Authorization', 'token ' + GITHUB_TOKEN);
    xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
    xhr.onload = function() {
        if (xhr.status === 200 || xhr.status === 404) {
            var sha = xhr.status === 200 ? JSON.parse(xhr.responseText).sha : null;
            var putXhr = new XMLHttpRequest();
            putXhr.open('PUT', url, true);
            putXhr.setRequestHeader('Authorization', 'token ' + GITHUB_TOKEN);
            putXhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
            putXhr.setRequestHeader('Content-Type', 'application/json');
            putXhr.onload = function() {
                if (putXhr.status === 200 || putXhr.status === 201) {
                    showToast('同步成功！GitHub Pages 1-2 分钟后更新', 'success');
                    localStorage.setItem('mytoolbox_synced', JSON.stringify({ time: Date.now(), count: merged.length }));
                } else {
                    showToast('同步失败：' + putXhr.status, 'error');
                }
            };
            putXhr.send(JSON.stringify({
                message: '🔄 从管理面板同步工具数据',
                content: btoa(unescape(encodeURIComponent(newData))),
                sha: sha,
                branch: GITHUB_BRANCH
            }));
        } else {
            showToast('获取文件失败：' + xhr.status + ' - Token 可能无效', 'error');
        }
    };
    xhr.send();
};
var cancelBtn = document.getElementById('formCancel');
if (cancelBtn) cancelBtn.onclick = closeForm;
var formClose = document.querySelector('.form-close');
if (formClose) formClose.onclick = closeForm;
if (formOverlay) formOverlay.onclick = function(e) { if (e.target === formOverlay) closeForm(); };

var toolForm = document.getElementById('toolForm');
if (toolForm) toolForm.onsubmit = function(e) {
    e.preventDefault();
    var name = document.getElementById('formName').value.trim(), cat = document.getElementById('formCategory').value.trim();
    if (!name || !cat) { showToast('请填写名称和分类', 'error'); return; }
    var data = {
        name: name, category: cat, color: document.getElementById('formColor').value || '#3B82F6',
        comment: document.getElementById('formComment').value.trim(),
        detail: document.getElementById('formDetail').value.trim(),
        tags: document.getElementById('formTags').value.split(/[,，、\s]+/).filter(Boolean),
    };
    ['url','download','sponsor','usage','slug','iconUrl'].forEach(function(k) { var v = document.getElementById('form' + k.charAt(0).toUpperCase() + k.slice(1)).value.trim(); if (v) data[k] = v; });
    var store = loadUserData() || { deleted: [], edited: {}, added: [], nextId: 1000 };
    if (!store.edited) store.edited = {}; if (!store.added) store.added = []; if (!store.deleted) store.deleted = []; if (!store.nextId) store.nextId = 1000;
    var isEdit = !!document.getElementById('formId').value;
    if (isEdit) {
        var id = parseInt(document.getElementById('formId').value);
        if (BASE_TOOLS.find(function(t) { return t.id === id; })) store.edited[id] = data;
        else { var idx = store.added.findIndex(function(t) { return t.id === id; }); if (idx > -1) store.added[idx] = Object.assign({}, store.added[idx], data); }
    } else { data.id = store.nextId++; data._userAdded = true; store.added.push(data); }
    saveUserData(store); closeForm(); refreshTools(); renderMgmtList(); showToast(isEdit ? '已更新 ✓' : '已添加 ✓', 'success');
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
    o.onclick = function(e) { if (e.target === o) { o.classList.remove('active'); o.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; } };
}
bindModal('qqBtn', 'qqOverlay', 'qq-close');
bindModal('feedbackBtn', 'feedbackOverlay', 'feedback-close');
bindModal('donateBtn', 'donateOverlay', 'donate-close');
window.copyQQNumber = function() { copyToClipboard(document.getElementById('qqNumber').textContent, 'QQ 群号已复制'); };

// AI
var DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
function getApiKey() {
    var k = localStorage.getItem('deepseek_api_key');
    if (!k) { k = prompt('输入 DeepSeek API Key：\nhttps://platform.deepseek.com/api_keys'); if (k && k.trim()) { localStorage.setItem('deepseek_api_key', k.trim()); return k.trim(); } return null; }
    return k;
}
window.resetApiKey = function() { localStorage.removeItem('deepseek_api_key'); showToast('已清除', 'info'); };
async function callDeepSeek(prompt) {
    var k = getApiKey(); if (!k) return null;
    try { var r = await fetch(DEEPSEEK_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + k }, body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'system', content: '你是一个软件推荐专家，用简洁生动的中文写推荐语。直接输出内容。' }, { role: 'user', content: prompt }], temperature: .7, max_tokens: 500 }) });
        if (!r.ok) { var e = await r.json().catch(function() {}); showToast('AI 失败：' + ((e && e.error && e.error.message) || 'HTTP ' + r.status), 'error'); if (r.status === 401) localStorage.removeItem('deepseek_api_key'); return null; }
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
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function() {});
}
window.installApp = function() {
    var isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isiOS) {
        showToast('iOS 请点分享按钮 → 添加到主屏幕', 'info');
        return;
    }
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function() { deferredPrompt = null; });
    } else {
        showToast('请用 Chrome 浏览器打开，或使用菜单中的「添加到主屏幕」', 'info');
    }
};
var deferredPrompt = null;
window.addEventListener('beforeinstallprompt', function(e) {
    console.log('beforeinstallprompt fired');
    e.preventDefault();
    deferredPrompt = e;
    setTimeout(function() {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(function() { deferredPrompt = null; });
        }
    }, 30000);
});
