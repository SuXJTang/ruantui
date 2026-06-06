// ============================================
// shared.js — 全局状态 + 共享工具函数
// ============================================

// 全局命名空间 — 替代散布各文件的全局变量
var App = App || {};

App.state = {
    tools: [],
    announcements: [],
    currentFilter: 'all',
    currentSearch: '',
    loading: false,
    isAdmin: false,
    adminToken: null,     // Worker 返回的管理 token（session 有效）
    deferredPrompt: null, // PWA 安装
};

App.constants = {
    CACHE_KEY: 'mytoolbox_cache',
    ANNOUNCEMENT_CACHE_KEY: 'ruantui_announcements',
    AUTH_KEY: 'mytoolbox_admin',
    ADMIN_TOKEN_KEY: 'ruantui_admin_token',
    SORT_DEFAULT: 'default',
};

// HTML 转义 — 防 XSS
function escHTML(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 校验颜色值 — 防 CSS 注入
function safeColor(c) {
    if (!c) return '#3B82F6';
    if (/^#[0-9a-fA-F]{3,8}$/.test(c)) return c;
    if (/^(rgb|rgba|hsl|hsla)\(/.test(c)) return c;
    var knownNames = ['black','silver','gray','white','maroon','red','purple','fuchsia','green','lime','olive','yellow','navy','blue','teal','aqua','orange','aliceblue','antiquewhite','aquamarine','azure','beige','bisque','blanchedalmond','blueviolet','brown','burlywood','cadetblue','chartreuse','chocolate','coral','cornflowerblue','cornsilk','crimson','cyan','darkblue','darkcyan','darkgoldenrod','darkgray','darkgreen','darkkhaki','darkmagenta','darkolivegreen','darkorange','darkorchid','darkred','darksalmon','darkseagreen','darkslateblue','darkslategray','darkturquoise','darkviolet','deeppink','deepskyblue','dimgray','dodgerblue','firebrick','floralwhite','forestgreen','gainsboro','ghostwhite','gold','goldenrod','greenyellow','honeydew','hotpink','indianred','indigo','ivory','khaki','lavender','lavenderblush','lawngreen','lemonchiffon','lightblue','lightcoral','lightcyan','lightgoldenrodyellow','lightgreen','lightgray','lightpink','lightsalmon','lightseagreen','lightskyblue','lightslategray','lightsteelblue','lightyellow','limegreen','linen','magenta','mediumaquamarine','mediumblue','mediumorchid','mediumpurple','mediumseagreen','mediumslateblue','mediumspringgreen','mediumturquoise','mediumvioletred','midnightblue','mintcream','mistyrose','moccasin','navajowhite','oldlace','olivedrab','orangered','orchid','palegoldenrod','palegreen','paleturquoise','palevioletred','papayawhip','peachpuff','peru','pink','plum','powderblue','rosybrown','royalblue','saddlebrown','salmon','sandybrown','seagreen','seashell','sienna','skyblue','slateblue','slategray','snow','springgreen','steelblue','tan','thistle','tomato','turquoise','violet','wheat','whitesmoke','yellowgreen','rebeccapurple'];
    if (knownNames.indexOf(c.toLowerCase()) >= 0) return c;
    return '#3B82F6';
}

// Toast 通知
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
        t.style.transition = 'opacity .3s ease, transform .3s ease';
        t.style.opacity = '0'; t.style.transform = 'translateX(40px)';
        setTimeout(function() { t.remove(); }, 300);
    }, 2500);
}

// 注入 Toast 动画
(function() {
    if (document.getElementById('ts')) return;
    var s = document.createElement('style'); s.id = 'ts';
    s.textContent = '@keyframes toastIn{0%{opacity:0;transform:translateX(40px)}100%{opacity:1;transform:translateX(0)}}';
    document.head.appendChild(s);
})();

// 渲染工具图标 HTML（三处共享）
function renderIconHTML(tool) {
    var imgSrc = escHTML(tool.iconUrl || (tool.slug ? 'https://cdn.simpleicons.org/' + tool.slug + '/ffffff' : ''));
    var hasImg = tool.iconUrl || tool.slug;
    if (hasImg) {
        return '<img src="' + imgSrc + '" alt="' + escHTML(tool.name) + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'inline-block\'"><i class="' + escHTML(tool.icon || 'fa-cube') + '" style="display:none;"></i>';
    }
    return '<i class="' + escHTML(tool.icon || 'fa-cube') + '"></i>';
}

// 剪贴板工具
function copyToClipboard(text, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() { showToast(msg || '已复制', 'success'); }).catch(function() { fallbackCopy(text, msg); });
    } else { fallbackCopy(text, msg); }
}
function fallbackCopy(text, msg) {
    var ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); showToast(msg || '已复制', 'success'); } catch(e) { showToast('复制失败', 'error'); }
    document.body.removeChild(ta);
}

// 管理面板密码验证（走 Worker）
// 验证密码，返回 token（成功）或 null
async function verifyAdminPassword(password) {
    try {
        var r = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password })
        });
        if (!r.ok) return null;
        var d = await r.json();
        return d.token || null;
    } catch(e) {
        return null;
    }
}
