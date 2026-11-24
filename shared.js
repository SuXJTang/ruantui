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
    t.innerHTML = '<i class="fas ' + (icons[type] || 'fa-info-circle') + '" style="color:' + (colors[type] || '#6B7280') + ';font-size:18px;flex-shrink:0;"></i><span></span>';
    t.querySelector('span').textContent = msg;
    c.appendChild(t);
    setTimeout(function() {
        t.style.transition = 'opacity .3s ease, transform .3s ease';
        t.style.opacity = '0'; t.style.transform = 'translateX(40px)';
        setTimeout(function() { t.remove(); }, 300);
    }, 2500);
}

// 下载权限判定（v4 灯塔 M2-2.4 收敛）
// ------------------------------------------------------------
// 卡片(ui.js)与详情弹窗(modal.js)原先各写一份 free/user/vip 判定，
// 容易漂移。这里收敛成唯一来源。语义：
//   free → 谁都能下；user → 登录才能下；vip → 登录且 VIP 才能下。
// 时序注意：VIP 状态异步加载，未知时先「不锁」，等状态到位再重渲染。
window.tierAccess = function (tier) {
    tier = tier || 'free';
    var vipState = (window.App && App.state && App.state.vipInfo) || {};
    var vipKnown = (vipState.loading === false) || (typeof vipState.isVip === 'boolean');
    var logged = !!(window.Auth && window.Auth.isLoggedIn());
    var isVip = !!vipState.isVip;

    var canDownload = true, lockReason = '';
    if (tier === 'vip') {
        if (!logged) { canDownload = false; lockReason = 'login'; }
        else if (!vipKnown) { canDownload = true; }
        else if (!isVip) { canDownload = false; lockReason = 'vip'; }
    } else if (tier === 'user') {
        if (!logged) { canDownload = false; lockReason = 'login'; }
    }
    return { tier: tier, canDownload: canDownload, lockReason: lockReason, logged: logged, isVip: isVip, vipKnown: vipKnown };
};

// 注入 Toast 动画
(function() {
    if (document.getElementById('ts')) return;
    var s = document.createElement('style'); s.id = 'ts';
    s.textContent = '@keyframes toastIn{0%{opacity:0;transform:translateX(40px)}100%{opacity:1;transform:translateX(0)}}';
    document.head.appendChild(s);
})();

// 把图标地址规范成浏览器能直接用的绝对地址。
// 背景：自托管的图标在数据库里存的是相对路径（img/tools/hongguo.png），
// 这样根路径部署和子路径部署都能用。但在 /t/56 这类子路径页面上，
// 相对路径会被解析成 /t/img/tools/xxx.png 导致 404，
// 所以统一在渲染时补成以 / 开头的根相对地址。
function normalizeIconUrl(u) {
    if (!u) return u;
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|data:)/i.test(u)) return u;
    return '/' + u.replace(/^\.\//, '').replace(/^\/+/, '');
}

// 渲染工具图标 HTML（卡片 / 弹窗 / 管理面板共用）
// opts.eager: 是否立即加载图片。
//   卡片列表用 eager —— 用户必然会滚动浏览，懒加载反而在快速滚动时看到空白方块，
//   而全部图标加起来只有几十 KB，预加载的代价可以忽略。
//   弹窗等按需出现的场景仍用 lazy。
// 图标本地镜像
// ----------------------------------------------------------------
// 数据库里有 9 条工具的 icon_url 指向第三方站点（apic.tvzhe.com / music.caij.xyz 等）。
// 这些外链在国内网络下经常慢或直接挂掉，用户看到的就是「没 logo」。
// 这里按工具 id 给一份自托管副本，渲染时优先使用。
// 维护提示：等管理面板把这些工具的 icon_url 改成 /img/tools/xxx 之后，
// 本表可以整段删掉，不带任何副作用。
var LOCAL_ICON_MAP = {
    33: '/img/tools/feiniao.png',        // 飞鸟听书
    36: '/img/tools/oktvzhe.png',        // ok影视
    37: '/img/tools/yscang.png',         // 影视仓
    39: '/img/tools/vmos.png',           // VMOS 云手机
    57: '/img/tools/mianhua.png',        // 棉花音乐
    58: '/img/tools/agentsanywhere.png', // Agents Anywhere
    60: '/img/tools/lyrico.svg',         // Lyrico
    61: '/img/tools/clashplus.png',      // Clash Plus
    63: '/img/tools/saltplayer.png'      // Salt Player
};

function renderIconHTML(tool, opts) {
    var eager = opts && opts.eager;
    var localSrc = LOCAL_ICON_MAP[tool.id] || '';
    var rawSrc = localSrc || tool.iconUrl || '';
    var imgSrc = escHTML(normalizeIconUrl(rawSrc));
    var hasImg = !!rawSrc;

    // 兜底：图标加载失败时用工具名首字（中文）或首字母（英文）顶上。
    // 早期版本这里是 <i class="fa-cube">，但 FontAwesome 的 cube 图标和「空白方块」
    // 在 40px 卡片里几乎分不出来，用户反馈"图标是空的"。首字明显得多。
    // 颜色用工具自己的 color，和卡片图标底色保持一致。
    var name = String(tool.name || '').trim();
    var initial = name ? name.charAt(0).toUpperCase() : '?';
    var fallbackHTML = '<span class="tool-icon-initial" aria-hidden="true">' + escHTML(initial) + '</span>';

    if (hasImg) {
        return '<img src="' + imgSrc + '" alt="' + escHTML(tool.name) + '"' +
            (eager ? '' : ' loading="lazy"') +
            ' decoding="async" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
            fallbackHTML.replace('class="tool-icon-initial"', 'class="tool-icon-initial" style="display:none"');
    }
    // 没有配图：直接用首字
    return fallbackHTML;
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

// 管理权限：已改为 Supabase 账号登录（见 auth.js），不再有密码校验函数。
// 是否可写由数据库 RLS 的 is_admin() 判定，前端无法绕过。
