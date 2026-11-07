// ============================================
// features.js — 分享/管理CRUD/AI/QQ/反馈/赞赏
// ============================================
(function() {

// ---------- 初始化：加载数据 ----------
loadTools().then(function() {
    App.state._originalTools = App.state.tools.slice();
    rebuildCategories();
    renderTools('all');
    // 显示最后更新日期
    var fd = document.getElementById('footerDate');
    if (fd) fd.textContent = '· ' + new Date().toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric' }) + ' 更新';
    // 深链接：数据加载完后再检查 URL 参数
    var p = new URLSearchParams(window.location.search);
    var toolId = p.get('tool');
    if (toolId) { var t = App.state.tools.find(function(x) { return x.id === parseInt(toolId); }); if (t) openModal(t); }
});

// ---------- 排序 ----------
// 排序由这里唯一负责（ui.js 不再挂重复的 change 监听）。
// 注意：过滤（名称/分类/标签/新建行等）只设置 currentFilter/currentSearch 后调用
// renderTools()，从不重新渲染本列表，所以不存在“过滤被重置”的问题。
var sortSelect = document.getElementById('sortSelect');
if (sortSelect) {
    sortSelect.onchange = function() {
        var val = this.value;
        // 始终从原始顺序开始，避免多次排序累积偏差
        if (App.state._originalTools) App.state.tools = App.state._originalTools.slice();
        if (val === 'name') App.state.tools.sort(function(a, b) { return a.name.localeCompare(b.name, 'zh'); });
        else if (val === 'popular') App.state.tools.sort(function(a, b) { return (b.views || 0) - (a.views || 0); });
        else if (val === 'newest') App.state.tools.sort(function(a, b) { return b.id - a.id; });
        // default: 已恢复原始顺序（数据库 pinned.desc, created_at.asc），无需排序
        renderTools(App.state.currentFilter);
    };
}

// ---------- 分享面板 ----------
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

window.copyToolLink = function(id) { copyToClipboard(window.location.origin + window.location.pathname + '?tool=' + id, '链接已复制'); };
window.copyToolText = function(id) {
    var t = App.state.tools.find(function(x) { return x.id === id; });
    if (t) copyToClipboard('🔧 ' + t.name + '\n⭐ ' + (t.rating || '?') + '/5\n📂 ' + t.category + '\n💬 ' + t.comment + '\n🔗 ' + window.location.origin + window.location.pathname + '?tool=' + id, '已复制');
};
window.downloadQR = function(id) {
    var a = document.createElement('a');
    var shareUrl = window.location.origin + window.location.pathname + '?tool=' + id;
    a.href = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(shareUrl);
    a.download = 'tool-' + id + '-qrcode.png'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
};

// ---------- 管理面板 ----------
// 权限模型：Supabase Auth 账号登录，是否可写由数据库 RLS 的 is_admin() 判定。
// 前端不做「管理员」这个判断，只负责发起登录并展示结果。

window.logoutAdmin = function() {
    if (window.Auth) window.Auth.signOut();
    setAdminFlag(false);
    var o = document.getElementById('mgmtOverlay');
    if (o) { o.classList.remove('active'); o.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
    showToast('已退出登录', 'info');
};

function setAdminFlag(v) {
    App.state.isAdmin = !!v;
    App.state.adminToken = v ? 'session' : null;
    // 管理按钮在未登录时显示「管理」，已登录时显示「管理面板」
    var b = document.getElementById('mgmtBtn');
    if (b) {
        b.innerHTML = v ? '<i class="fas fa-cog"></i> 管理面板' : '<i class="fas fa-cog"></i> 管理';
    }
}

// 弹出登录框
function showLoginBox() {
    var box = document.createElement('div');
    box.id = '_loginBox';
    box.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;';
    box.innerHTML = '<div style="background:var(--card);border-radius:16px;padding:28px;width:360px;box-shadow:0 20px 60px rgba(0,0,0,.3);text-align:center;">'
        + '<h3 style="font-size:18px;font-weight:700;margin-bottom:4px;">管理员登录</h3>'
        + '<p style="font-size:13px;color:var(--text-light);margin-bottom:18px;">使用管理员账号登录后即可管理工具</p>'
        + '<input type="email" id="_loginEmail" autocomplete="username" style="width:100%;padding:10px 14px;border:2px solid var(--border);border-radius:10px;font-size:14px;background:var(--bg);color:var(--text);outline:none;box-sizing:border-box;margin-bottom:10px;" placeholder="管理员邮箱">'
        + '<input type="password" id="_loginPwd" autocomplete="current-password" style="width:100%;padding:10px 14px;border:2px solid var(--border);border-radius:10px;font-size:14px;background:var(--bg);color:var(--text);outline:none;box-sizing:border-box;" placeholder="密码">'
        + '<div id="_loginErr" style="color:#ef4444;font-size:12px;margin-top:10px;min-height:16px;"></div>'
        + '<div style="display:flex;gap:8px;margin-top:8px;">'
        + '<button id="_loginCancel" style="flex:1;padding:9px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--text);font-size:14px;font-weight:600;cursor:pointer;">取消</button>'
        + '<button id="_loginSubmit" style="flex:1;padding:9px;border-radius:10px;border:none;background:var(--primary);color:#fff;font-size:14px;font-weight:600;cursor:pointer;">登录</button>'
        + '</div></div>';
    document.body.appendChild(box);

    var emailEl = document.getElementById('_loginEmail');
    var pwdEl = document.getElementById('_loginPwd');
    var errEl = document.getElementById('_loginErr');
    var btnEl = document.getElementById('_loginSubmit');
    emailEl.focus();

    function fail(msg) {
        errEl.textContent = msg || '';
        pwdEl.style.borderColor = '#ef4444';
        setTimeout(function() { pwdEl.style.borderColor = ''; }, 1500);
    }

    async function submit() {
        var email = (emailEl.value || '').trim();
        var pwd = pwdEl.value || '';
        if (!email || !pwd) { fail('请填写邮箱和密码'); return; }
        errEl.textContent = '';
        btnEl.disabled = true;
        btnEl.textContent = '登录中…';
        var r = await window.Auth.signIn(email, pwd);
        if (!r.ok) {
            btnEl.disabled = false;
            btnEl.textContent = '登录';
            fail(r.error);
            return;
        }
        // 登录成功：再确认是否在管理员名单（RLS 只让本人读到自己的 admins 行）
        var v = await window.Auth.verifyAdmin();
        if (!v.isAdmin) {
            await window.Auth.signOut();
            btnEl.disabled = false;
            btnEl.textContent = '登录';
            fail('该账号不在管理员名单中（请让站长在 admins 表登记）');
            return;
        }
        box.remove();
        setAdminFlag(true);
        showToast('登录成功 ✓', 'success');
        openMgmt();
    }

    document.getElementById('_loginCancel').onclick = function() { box.remove(); };
    btnEl.onclick = submit;
    [emailEl, pwdEl].forEach(function(el) {
        el.onkeydown = function(e) { if (e.key === 'Enter') submit(); };
    });
}

// 点击「管理」：已登录且是管理员 → 直接进面板；否则弹登录框
async function checkAdmin() {
    if (!window.Auth) { showToast('登录模块未加载', 'error'); return; }
    if (window.Auth.isLoggedIn()) {
        var v = await window.Auth.verifyAdmin();
        if (v.isAdmin) { setAdminFlag(true); openMgmt(); return; }
        // 有会话但不是管理员（或已过期）：清掉并重新登录
        await window.Auth.signOut();
        setAdminFlag(false);
    }
    showLoginBox();
}

function openMgmt() {
    var o = document.getElementById('mgmtOverlay');
    if (o) { o.setAttribute('aria-hidden', 'false'); o.classList.add('active'); document.body.style.overflow = 'hidden'; }
    renderMgmtList();
}

var mgmtBtn = document.getElementById('mgmtBtn');
if (mgmtBtn) mgmtBtn.onclick = function() { checkAdmin(); };

// 页面加载时若已有会话，静默恢复「已登录」状态（不弹窗）
(function restoreSession() {
    if (!window.Auth || !window.Auth.isLoggedIn()) return;
    window.Auth.verifyAdmin().then(function(v) {
        if (v.isAdmin) setAdminFlag(true);
        else if (!v.loggedIn) setAdminFlag(false);
    });
})();

// 导出全部工具为 JSON 备份（用于迁移 / 灾备，不再伪装成 data.js 兜底）
var mgmtExportBtn = document.getElementById('mgmtExportBtn');
if (mgmtExportBtn) mgmtExportBtn.onclick = function() {
    var payload = {
        exportedAt: new Date().toISOString(),
        count: (App.state.tools || []).length,
        tools: App.state.tools || []
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    var stamp = new Date().toISOString().slice(0, 10);
    a.download = 'ruantui-tools-' + stamp + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    showToast('已导出 ' + payload.count + ' 条工具数据', 'success');
};

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
    var list = Array.isArray(App.state.tools) ? App.state.tools : [];
    // 按 id 查工具：原先写成 App.state.tools.find(function(x){...}.bind(this)) —— bind 绑的是
    // 匿名回调的 this（严格模式下 undefined，本文件非严格所以是 window），this.dataset 取不到，
    // parseInt(undefined) = NaN，查不到就直接 return，点「编辑」完全没反应。
    var byId = function(id) {
        for (var i = 0; i < list.length; i++) { if (String(list[i].id) === String(id)) return list[i]; }
        return null;
    };
    var filtered = q ? list.filter(function(t) { return String(t.name || '').toLowerCase().includes(q) || String(t.category || '').toLowerCase().includes(q); }) : list;
    mgmtList.innerHTML = filtered.map(function(t) {
        var icon = renderIconHTML(t);
        var badge = t.is_custom ? '<span>[自定义]</span>' : '';
        var isPinned = t.pinned;
        return '<div class="mgmt-row"><div class="mgmt-row-icon" style="background:' + safeColor(t.color) + '">' + icon + '</div><div class="mgmt-row-info"><h4>' + (isPinned ? '<span class="pinned-badge">推荐</span>' : '') + escHTML(t.name) + badge + '</h4><p>' + escHTML(t.category) + '</p></div><div class="mgmt-row-actions"><button class="pin-btn" data-id="' + escHTML(t.id) + '" title="' + (isPinned ? '取消置顶' : '置顶') + '" style="color:' + (isPinned ? 'var(--primary)' : '') + '"><i class="fas fa-thumbtack"></i></button><button class="edit-btn" data-id="' + escHTML(t.id) + '" title="编辑"><i class="fas fa-pen"></i></button><button class="del-btn" data-id="' + escHTML(t.id) + '" title="删除"><i class="fas fa-trash"></i></button></div></div>';
    }).join('');
    mgmtList.querySelectorAll('.edit-btn').forEach(function(b) { b.onclick = function(e) { e.stopPropagation(); var t = byId(this.dataset.id); if (t) openForm(t); }; });
    mgmtList.querySelectorAll('.del-btn').forEach(function(b) { b.onclick = function(e) { e.stopPropagation(); var id = parseInt(this.dataset.id, 10); var t = byId(this.dataset.id); showConfirm('确定删除「' + (t ? t.name : '') + '」？', function() { deleteTool(id); }); }; });
    mgmtList.querySelectorAll('.pin-btn').forEach(function(b) { b.onclick = function(e) { e.stopPropagation(); togglePin(parseInt(this.dataset.id, 10)); }; });
}

function deleteTool(id) {
    var t = App.state.tools.find(function(x) { return x.id === id; });
    var tName = t ? t.name : '';
    var tCat = t ? t.category : '';
    removeTool(id).then(function() {
        refreshTools().then(function() { App.state._originalTools = App.state.tools.slice(); renderMgmtList(); });
        showToast('已删除', 'info');
        if (tName) createAnnouncement('已移除工具', '移除了「' + tName + '」(' + tCat + ')', 'delete');
    }).catch(function() { showToast('删除失败', 'error'); });
}

function showConfirm(msg, onOk) {
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;';
    box.innerHTML = '<div style="background:var(--card);border-radius:16px;padding:24px 28px 20px;width:320px;box-shadow:0 20px 60px rgba(0,0,0,.3);text-align:center;animation:toastIn .25s ease;">'
        + '<p class="confirm-msg" style="font-size:15px;font-weight:600;margin-bottom:4px;"></p>'
        + '<p style="font-size:12px;color:var(--text-light);margin-bottom:18px;">此操作不可撤销</p>'
        + '<div style="display:flex;gap:8px;">'
        + '<button class="confirm-cancel" style="flex:1;padding:9px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--text);font-size:14px;font-weight:600;">取消</button>'
        + '<button class="confirm-ok" style="flex:1;padding:9px;border-radius:10px;border:none;background:#ef4444;color:#fff;font-size:14px;font-weight:600;">删除</button>'
        + '</div></div>';
    box.querySelector('.confirm-msg').textContent = msg;
    document.body.appendChild(box);
    box.querySelector('.confirm-cancel').onclick = function() { box.remove(); };
    box.querySelector('.confirm-ok').onclick = function() { box.remove(); onOk(); };
    box.onclick = function(e) { if (e.target === box) box.remove(); };
}

function togglePin(id) {
    var t = App.state.tools.find(function(x) { return x.id === id; });
    if (!t) return;
    var newPinned = !t.pinned;
    // 走 Worker API
    if (typeof toggleToolPin === 'function') {
        toggleToolPin(id, newPinned).then(function() {
            t.pinned = newPinned;
            refreshTools().then(function() { App.state._originalTools = App.state.tools.slice(); renderMgmtList(); });
            showToast(newPinned ? '已置顶' : '已取消置顶', 'success');
        }).catch(function() { showToast('操作失败', 'error'); });
    } else {
        showToast('管理 API 不可用', 'error');
    }
}

// ---------- 编辑表单 ----------
var formOverlay = document.getElementById('formOverlay');
// 表单控件的安全访问：缺元素时返回 null / 空串，而不是抛 TypeError 让整个弹窗炸掉
function _fInput(id) { return document.getElementById(id); }
function _fVal(id) { var el = _fInput(id); return el ? el.value : ''; }
function _fSet(id, v) { var el = _fInput(id); if (el) el.value = v; }
// 标题是 <h2>，没有 .value：误用 _fSet 会让「添加工具 / 编辑工具」永远不更新
function _fText(id, v) { var el = _fInput(id); if (el) el.textContent = v; }
function openForm(tool) {
    if (!formOverlay) return;
    _fText('formTitle', tool ? '编辑工具' : '添加工具');
    _fSet('formId', tool ? tool.id : '');
    _fSet('formName', tool ? tool.name : '');
    _fSet('formCategory', tool ? tool.category : '');
    _fSet('formColor', tool ? tool.color : '#3B82F6');
    _fSet('formComment', tool ? tool.comment : '');
    _fSet('formDetail', tool ? (tool.detail || '') : '');
    _fSet('formTags', tool ? (tool.tags || []).join(', ') : '');
    _fSet('formUrl', tool ? (tool.url || '') : '');
    _fSet('formDownload', tool ? (tool.download || '') : '');
    _fSet('formUsage', tool ? (tool.usage || '') : '');
    _fSet('formSlug', tool ? (tool.slug || '') : '');
    _fSet('formIconUrl', tool ? (tool.iconUrl || '') : '');
    _fSet('formIcon', tool ? (tool.icon || '') : '');
    updateIconPreview();

    formOverlay.setAttribute('aria-hidden', 'false');
    formOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function updateIconPreview() {
    var color = _fVal('formColor') || '#3B82F6';
    var iconPreview = _fInput('iconPreview');
    if (iconPreview) iconPreview.style.background = color;
    var slug = _fVal('formSlug').trim();
    var iconUrl = _fVal('formIconUrl').trim();
    var icon = _fVal('formIcon').trim();
    var previewImg = _fInput('previewImg');
    var previewIcon = _fInput('previewIcon');
    if (!previewImg || !previewIcon) return;
    previewImg.style.display = 'none';
    previewIcon.style.display = 'none';
    if (iconUrl) { previewImg.src = iconUrl; previewImg.style.display = 'inline-block'; }
    else if (slug) { previewImg.src = 'https://cdn.simpleicons.org/' + slug + '/ffffff'; previewImg.style.display = 'inline-block'; }
    else if (icon) { previewIcon.className = 'fas ' + icon; previewIcon.style.display = 'inline-block'; }
    else { previewIcon.className = 'fas fa-cube'; previewIcon.style.display = 'inline-block'; }
}

[['formSlug', updateIconPreview], ['formIconUrl', updateIconPreview], ['formIcon', updateIconPreview], ['formColor', updateIconPreview]]
    .forEach(function(p) { var el = _fInput(p[0]); if (el) el.oninput = p[1]; });

var _fc = document.getElementById('formCancel');
if (_fc) _fc.onclick = function() { formOverlay.classList.remove('active'); formOverlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };
var _fcx = document.querySelector('.form-close');
if (_fcx) _fcx.onclick = function() { formOverlay.classList.remove('active'); formOverlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };
if (formOverlay) formOverlay.onclick = function(e) { if (!e.target.closest('.modal')) { formOverlay.classList.remove('active'); formOverlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; } };

var toolForm = document.getElementById('toolForm');
if (toolForm) {
    toolForm.onsubmit = function(e) {
        e.preventDefault();
        var id = _fVal('formId');
        var data = {
            name: _fVal('formName').trim(),
            category: _fVal('formCategory').trim(),
            color: _fVal('formColor'),
            comment: _fVal('formComment').trim(),
            detail: _fVal('formDetail').trim(),
            tags: _fVal('formTags').split(/\s*,\s*/).filter(Boolean),
            url: _fVal('formUrl').trim(),
            download: _fVal('formDownload').trim(),
            usage: _fVal('formUsage').trim(),
            slug: _fVal('formSlug').trim(),
            iconUrl: _fVal('formIconUrl').trim(),
            icon: _fVal('formIcon').trim() || 'fa-cube'
        };
        if (!data.name || !data.category) { showToast('请填写名称和分类', 'error'); return; }
        var savePromise = id ? updateTool(parseInt(id), data) : insertTool(data);
        savePromise.then(function() {
            formOverlay.classList.remove('active');
            formOverlay.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            refreshTools().then(function() { App.state._originalTools = App.state.tools.slice(); renderMgmtList(); });
            showToast(id ? '已更新 ✓' : '已添加 ✓', 'success');
        }).catch(function() { showToast('保存失败，请重试', 'error'); });
    };
}

// ---------- QQ 群 ----------
(function() {
    var qqBtn = document.getElementById('qqBtn');
    var qqOverlay = document.getElementById('qqOverlay');
    if (qqBtn && qqOverlay) {
        qqBtn.onclick = function() { qqOverlay.setAttribute('aria-hidden', 'false'); qqOverlay.classList.add('active'); document.body.style.overflow = 'hidden'; };
        var c = qqOverlay.querySelector('.modal-close');
        if (c) c.onclick = function() { qqOverlay.classList.remove('active'); qqOverlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };
        qqOverlay.onclick = function(e) { if (!e.target.closest('.modal')) { qqOverlay.classList.remove('active'); qqOverlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; } };
    }
})();

// ---------- 反馈 ----------
(function() {
    var fbBtn = document.getElementById('feedbackBtn');
    var fbOverlay = document.getElementById('feedbackOverlay');
    if (fbBtn && fbOverlay) {
        fbBtn.onclick = function() { fbOverlay.setAttribute('aria-hidden', 'false'); fbOverlay.classList.add('active'); document.body.style.overflow = 'hidden'; };
        var c = fbOverlay.querySelector('.modal-close');
        if (c) c.onclick = function() { fbOverlay.classList.remove('active'); fbOverlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };
        fbOverlay.onclick = function(e) { if (!e.target.closest('.modal')) { fbOverlay.classList.remove('active'); fbOverlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; } };
    }
})();

// ---------- 赞赏 ----------
(function() {
    var donateBtn = document.getElementById('donateBtn');
    var donateOverlay = document.getElementById('donateOverlay');
    if (donateBtn && donateOverlay) {
        donateBtn.onclick = function() { donateOverlay.setAttribute('aria-hidden', 'false'); donateOverlay.classList.add('active'); document.body.style.overflow = 'hidden'; };
        var c = donateOverlay.querySelector('.modal-close');
        if (c) c.onclick = function() { donateOverlay.classList.remove('active'); donateOverlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };
        donateOverlay.onclick = function(e) { if (!e.target.closest('.modal')) { donateOverlay.classList.remove('active'); donateOverlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; } };
        // 点击二维码放大
        var qrOverlay = null;
        donateOverlay.querySelectorAll('.donate-qr').forEach(function(qr) {
            qr.style.cursor = 'pointer';
            qr.onclick = function(e) {
                if (!qrOverlay) {
                    qrOverlay = document.createElement('div');
                    qrOverlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;transition:opacity .3s;visibility:hidden;';
                    var img = document.createElement('img');
                    img.style.cssText = 'max-width:80vw;max-height:80vh;border-radius:12px;transition:transform .3s;transform:scale(.8);';
                    qrOverlay.appendChild(img);
                    qrOverlay.onclick = function() { qrOverlay.style.opacity = '0'; qrOverlay.style.visibility = 'hidden'; };
                    document.body.appendChild(qrOverlay);
                }
                var qrImg = qrOverlay.querySelector('img');
                qrImg.src = qr.src;
                qrOverlay.style.visibility = 'visible'; qrOverlay.style.opacity = '1';
                requestAnimationFrame(function() { qrImg.style.transform = 'scale(1)'; });
            };
        });
    }
})();
window.copyQQNumber = function() { copyToClipboard(document.getElementById('qqNumber').textContent, 'QQ 群号已复制'); };

// ---------- AI：DeepSeek 集成 ----------
var DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// Key 只存本机 localStorage，仓库里不放任何 Key（见 apikey-config.js 顶部说明）。
// 原先那套「用管理密码解密内置密文」的逻辑已移除：管理密码哈希是公开的，
// 那层加密挡不住任何人，留着只会让人误以为密文安全。
var _cachedKey = null;

async function getApiKey() {
    if (_cachedKey) return _cachedKey;
    var k = localStorage.getItem('deepseek_api_key');
    if (k) return k;
    // 仓库里不再内置任何 API Key（明文和密文都不放），所以直接向使用者索取一次。
    // 之前是「先要管理密码 → 解密内置密文 → 失败再要 Key」，仓库侧已不再有密文，
    // 那个分支只会让用户白输一次密码，故移除。
    k = prompt('输入 DeepSeek API Key（仅保存在本机浏览器，不会上传）\n申请地址：https://platform.deepseek.com/api_keys');
    if (k === null) return null;   // 用户点了「取消」：本次直接放弃，不再追问
    k = k.trim();
    if (!k) return null;
    // DeepSeek 的 Key 以 sk- 开头。这里只提醒不拦截，避免误粘贴整段别的文本后毫无提示。
    if (k.indexOf('sk-') !== 0) {
        showToast('格式看起来不像 DeepSeek Key（应以 sk- 开头）', 'error');
    }
    localStorage.setItem('deepseek_api_key', k);
    return k;
}
window.resetApiKey = function() { localStorage.removeItem('deepseek_api_key'); _cachedKey = null; showToast('已清除，下次使用时会重新询问', 'info'); };

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

// ============================================
// 公告系统
// ============================================

// 自动创建公告
function createAnnouncement(title, content, type) {
    if (typeof insertAnnouncement !== 'function') return;
    insertAnnouncement({ title: title, content: content, type: type }).then(function() {
        loadAnnouncements().then(function() { renderAnnouncements(); });
    }).catch(function() {});
}

// 管理标签页切换
(function() {
    var tabs = document.querySelectorAll('.mgmt-tab');
    tabs.forEach(function(tab) {
        tab.onclick = function() {
            tabs.forEach(function(t) { t.classList.remove('active'); });
            this.classList.add('active');
            document.querySelectorAll('.mgmt-tab-content').forEach(function(c) { c.classList.remove('active'); });
            var target = document.getElementById('mgmtTab' + this.dataset.tab.charAt(0).toUpperCase() + this.dataset.tab.slice(1));
            if (target) target.classList.add('active');
            if (this.dataset.tab === 'announcements') renderAnnouncementList();
        };
    });
})();

// 渲染公告管理列表
var annMgmtList = document.getElementById('annMgmtList');
var typeLabels = { manual: '📢 公告', update: '🔄 更新', fix: '🐛 修复', add: '✨ 新增', delete: '🗑 移除' };

function renderAnnouncementList() {
    if (!annMgmtList) return;
    var countEl = document.getElementById('annCount');
    if (countEl) countEl.textContent = App.state.announcements.length;
    if (!App.state.announcements.length) {
        annMgmtList.innerHTML = '<div class="grid-empty" style="padding:30px 20px;"><i class="fas fa-bullhorn"></i><p>暂无公告</p></div>';
        return;
    }
    annMgmtList.innerHTML = App.state.announcements.map(function(a) {
        return '<div class="mgmt-row" style="align-items:flex-start;"><div class="mgmt-row-info" style="flex:1;"><h4>' + escHTML(a.title) + ' <span style="font-size:10px;font-weight:500;color:var(--text-light);">' + (typeLabels[a.type] || '📢') + '</span></h4><p style="white-space:normal;font-size:12px;margin-top:2px;">' + escHTML(a.content) + '</p><span style="font-size:10px;color:var(--text-light);opacity:.5;">' + new Date(a.created_at).toLocaleDateString('zh-CN') + '</span></div><div class="mgmt-row-actions"><button class="del-btn ann-del-btn" data-id="' + a.id + '" title="删除"><i class="fas fa-trash"></i></button></div></div>';
    }).join('');
    annMgmtList.querySelectorAll('.ann-del-btn').forEach(function(b) {
        b.onclick = function(e) { e.stopPropagation(); var id = parseInt(this.dataset.id); showConfirm('确定删除此公告？', function() { deleteAnnouncement(id); }); };
    });
}

function deleteAnnouncement(id) {
    removeAnnouncement(id).then(function() {
        App.state.announcements = App.state.announcements.filter(function(a) { return a.id !== id; });
        renderAnnouncementList();
        renderAnnouncements();
        showToast('公告已删除', 'info');
    }).catch(function() { showToast('删除失败', 'error'); });
}

// 公告编辑表单
var annFormOverlay = document.getElementById('annFormOverlay');
var annAddBtn = document.getElementById('annAddBtn');
if (annAddBtn) annAddBtn.onclick = function() { openAnnForm(null); };

function openAnnForm(ann) {
    if (!annFormOverlay) return;
    var t = _fInput('annFormTitle'); if (t) t.textContent = ann ? '编辑公告' : '发布公告';
    _fSet('annFormId', ann ? ann.id : '');
    _fSet('annFormTitleInput', ann ? ann.title : '');
    _fSet('annFormContent', ann ? ann.content : '');
    _fSet('annFormType', ann ? ann.type : 'manual');
    annFormOverlay.setAttribute('aria-hidden', 'false'); annFormOverlay.classList.add('active'); document.body.style.overflow = 'hidden';
}
function closeAnnForm() { if (annFormOverlay) { annFormOverlay.classList.remove('active'); annFormOverlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; } }

var _afc = document.getElementById('annFormCancel'); if (_afc) _afc.onclick = closeAnnForm;
var _afcx = document.querySelector('.ann-form-close'); if (_afcx) _afcx.onclick = closeAnnForm;
if (annFormOverlay) annFormOverlay.onclick = function(e) { if (!e.target.closest('.modal')) closeAnnForm(); };

var annForm = document.getElementById('annForm');
if (annForm) annForm.onsubmit = function(e) {
    e.preventDefault();
    var title = _fVal('annFormTitleInput').trim();
    var content = _fVal('annFormContent').trim();
    var type = _fVal('annFormType');
    if (!title || !content) { showToast('请填写标题和内容', 'error'); return; }
    var annIdVal = _fVal('annFormId');
    var isEdit = !!annIdVal;
    var data = { title: title, content: content, type: type };
    var savePromise;
    if (isEdit) {
        savePromise = updateAnnouncement(parseInt(annIdVal, 10), data);
    } else {
        savePromise = insertAnnouncement(data);
    }
    savePromise.then(function() {
        closeAnnForm();
        loadAnnouncements().then(function() {
            renderAnnouncementList();
            renderAnnouncements();
        });
        showToast(isEdit ? '公告已更新 ✓' : '公告已发布 ✓', 'success');
    }).catch(function() { showToast('发布失败', 'error'); });
};

// 通知浮窗交互
var annFloat = document.getElementById('annFloat');
var annPanel = document.getElementById('annPanel');
var annBadge = document.getElementById('annBadge');

function renderAnnouncements() {
    var body = document.getElementById('annPanelBody');
    if (!body) return;
    if (!App.state.announcements.length) {
        body.innerHTML = '<div class="ann-empty">📢 暂无公告</div>';
        if (annBadge) annBadge.style.display = 'none';
        return;
    }
    var html = App.state.announcements.slice(0, 10).map(function(a) {
        var typeClass = a.type || 'manual';
        var typeLabel = typeLabels[a.type] || '📢';
        var time = new Date(a.created_at).toLocaleDateString('zh-CN');
        return '<div class="ann-item"><div class="ann-item-header"><span class="ann-item-type ' + typeClass + '">' + typeLabel + '</span><span class="ann-item-title">' + escHTML(a.title) + '</span></div><div class="ann-item-content">' + escHTML(a.content) + '</div><div class="ann-item-time">' + time + '</div></div>';
    }).join('');
    body.innerHTML = html;
    // 点击展开/收起公告全文
    body.querySelectorAll('.ann-item-content').forEach(function(el) {
        el.onclick = function(e) {
            e.stopPropagation();
            this.classList.toggle('expanded');
        };
    });
    if (annBadge) {
        annBadge.textContent = App.state.announcements.length;
        annBadge.style.display = '';
    }
}

if (annFloat) {
    annFloat.onclick = function(e) {
        e.stopPropagation();
        annPanel.classList.toggle('active');
    };
}
var annPanelClose = document.getElementById('annPanelClose');
if (annPanelClose) annPanelClose.onclick = function() { annPanel.classList.remove('active'); };
document.addEventListener('click', function(e) {
    if (annPanel && annFloat && !annPanel.contains(e.target) && e.target !== annFloat && !annFloat.contains(e.target)) {
        annPanel.classList.remove('active');
    }
});

// 页面加载时加载公告
loadAnnouncements().then(function() { renderAnnouncements(); });

})();

// ---------- PWA （在 IIFE 外部，需挂在 window） ----------
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
        showToast('Safari 点底部「分享」按钮 → 添加到主屏幕', 'info');
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
