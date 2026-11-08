// ============================================
// supabase.js — Supabase 数据访问层
// ============================================
// 读：用 anon key 直连（RLS 允许公开读）
// 写：用管理员登录后的用户 JWT 直连（RLS 的 is_admin() 放行）
//
// 历史：早期写操作走 Cloudflare Worker 中转，靠请求头 x-admin-token 通过 RLS。
// 但 GitHub Pages 和 Vercel 两个部署都没有后端，/api/admin/* 必然 404/405，
// 管理面板实际不可用。现改为浏览器带用户 JWT 直连 Supabase，
// 不需要任何后端，写权限完全由数据库 RLS 控制。
// ============================================
// Supabase 的直连地址（国内访问不稳定，仅作兜底）
var SUPABASE_DIRECT = 'https://gxlykcseepskxccdxmxc.supabase.co';
// 同域反代地址：由 Cloudflare Worker 转发到 Supabase，见 worker/index.js handleSupabaseProxy。
// 浏览器只与 luoluo.fun 通信，不再需要直连 supabase.co，
// 这是国内网络下能稳定加载数据的关键。
//
// 只在正式域名下启用代理；本地 file:// 或 127.0.0.1 调试时没有 Worker，
// 仍走直连，避免本地开发时全部请求 404。
var SUPABASE_URL = (function () {
    try {
        var h = location.hostname;
        if (h === 'luoluo.fun' || h === 'www.luoluo.fun' || /\.luoluo\.fun$/.test(h)) {
            return location.origin + '/sb';
        }
    } catch (e) {}
    return SUPABASE_DIRECT;
})();

var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bHlrY3NlZXBza3hjY2R4bXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MDA2MjksImV4cCI6MjA5NTE3NjYyOX0.oc8MKQ56zk585KgKPXXah_fsLzC5VZqHihOsCWH_zhE';

// 暴露给 engagement.js / auth.js 复用（避免多处重复硬编码）
window.RuantuiSupabase = { url: SUPABASE_URL, key: SUPABASE_KEY, direct: SUPABASE_DIRECT };

// ---------- 读操作：直连 Supabase（公开可读） ----------

function supabaseFetch(method, path, body) {
    var opts = {
        method: method,
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
        }
    };
    if (body) {
        opts.headers['Content-Type'] = 'application/json';
        opts.headers['Prefer'] = 'return=minimal';
        opts.body = JSON.stringify(body);
    }
    return fetch(SUPABASE_URL + '/rest/v1/' + path, opts);
}

// 获取所有工具（置顶优先、按创建时间排序）
function fetchTools() {
    return supabaseFetch('GET', 'tools?order=pinned.desc,created_at.asc')
        .then(function(res) {
            if (!res.ok) throw new Error('Failed to fetch: ' + res.status);
            return res.json();
        });
}

// 获取所有公告（最新优先）
function fetchAnnouncements() {
    return supabaseFetch('GET', 'announcements?order=created_at.desc&active=eq.true')
        .then(function(res) {
            if (!res.ok) throw new Error('Failed to fetch announcements: ' + res.status);
            return res.json();
        });
}

// 递增浏览量（使用 RPC 函数原子递增，避免竞态条件）
function incrementView(id) {
    var t = (App && App.state && App.state.tools) ? App.state.tools.find(function(x) { return x.id === id; }) : null;
    if (!t) return Promise.resolve();
    return fetch(SUPABASE_URL + '/rest/v1/rpc/increment_tool_view', {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tool_id: id })
    }).then(function(res) {
        if (!res.ok) throw new Error('Failed to increment view: ' + res.status);
        return res.text().then(function(v) { return parseInt(v); });
    }).then(function(newViews) {
        t.views = newViews;
        return newViews;
    });
}

// ---------- 写操作：带管理员 JWT 直连 Supabase ----------
// 权限由数据库 RLS 的 is_admin() 判定：只认 admins 表里登记过的 UID。
// 前端篡改无效，最坏情况只是被 RLS 拒绝（403）。

// 统一的写请求：自动带当前登录用户的 token，401 时尝试刷新一次再重试
function adminFetch(method, path, body, isRetry) {
    if (!window.Auth) return Promise.reject(new Error('auth.js 未加载'));
    return window.Auth.getAccessToken().then(function(token) {
        if (!token) throw new Error('未登录或登录已过期，请重新登录');

        var headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        };
        var opts = { method: method, headers: headers };
        if (body !== undefined && body !== null) opts.body = JSON.stringify(body);

        return fetch(SUPABASE_URL + '/rest/v1/' + path, opts).then(function(res) {
            if (res.status === 401 && !isRetry) {
                // token 失效：刷新后重试一次
                return window.Auth.refresh().then(function(ns) {
                    if (!ns) throw new Error('登录已过期，请重新登录');
                    return adminFetch(method, path, body, true);
                });
            }
            if (res.status === 401) throw new Error('登录已过期，请重新登录');
            if (res.status === 403 || res.status === 401) throw new Error('没有管理权限（该账号不在管理员名单中）');
            if (!res.ok) {
                return res.text().then(function(t) {
                    throw new Error('操作失败 ' + res.status + (t ? '：' + t.slice(0, 200) : ''));
                });
            }
            return true;
        });
    });
}

// 更新工具
function updateTool(id, data) {
    // 顺手维护 updated_at
    data = Object.assign({}, data, { updated_at: new Date().toISOString() });
    return adminFetch('PATCH', 'tools?id=eq.' + encodeURIComponent(id), data);
}

// 添加工具
function insertTool(data) {
    return adminFetch('POST', 'tools', data);
}

// 删除工具
function removeTool(id) {
    return adminFetch('DELETE', 'tools?id=eq.' + encodeURIComponent(id), null);
}

// 切换置顶
function toggleToolPin(id, pinned) {
    return adminFetch('PATCH', 'tools?id=eq.' + encodeURIComponent(id), { pinned: !!pinned });
}

// 添加公告
function insertAnnouncement(data) {
    return adminFetch('POST', 'announcements', data);
}

// 更新公告
function updateAnnouncement(id, data) {
    data = Object.assign({}, data, { updated_at: new Date().toISOString() });
    return adminFetch('PATCH', 'announcements?id=eq.' + encodeURIComponent(id), data);
}

// 删除公告
function removeAnnouncement(id) {
    return adminFetch('DELETE', 'announcements?id=eq.' + encodeURIComponent(id), null);
}
