// ============================================
// supabase.js — Supabase / Worker API 封装
// 读操作直连 Supabase（公开可读）
// 写操作走 Cloudflare Worker（管理权限）
// ============================================
var SUPABASE_URL = 'https://gxlykcseepskxccdxmxc.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bHlrY3NlZXBza3hjY2R4bXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MDA2MjksImV4cCI6MjA5NTE3NjYyOX0.oc8MKQ56zk585KgKPXXah_fsLzC5VZqHihOsCWH_zhE';

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

// ---------- 写操作：走 Worker 代理（管理权限） ----------

function getAdminToken() {
    return sessionStorage.getItem(App.constants.ADMIN_TOKEN_KEY);
}

function workerFetch(method, path, body) {
    var token = getAdminToken();
    var opts = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + (token || '')
        }
    };
    if (body) {
        opts.body = JSON.stringify(body);
    }
    return fetch('/api/admin' + path, opts);
}

// 更新工具
function updateTool(id, data) {
    return workerFetch('PUT', '/tools/' + id, data)
        .then(function(res) {
            if (!res.ok) throw new Error('Failed to update: ' + res.status);
            return true;
        });
}

// 添加工具
function insertTool(data) {
    return workerFetch('POST', '/tools', data)
        .then(function(res) {
            if (!res.ok) throw new Error('Failed to insert: ' + res.status);
            return true;
        });
}

// 删除工具
function removeTool(id) {
    return workerFetch('DELETE', '/tools/' + id)
        .then(function(res) {
            if (!res.ok) throw new Error('Failed to delete: ' + res.status);
            return true;
        });
}

// 切换置顶
function toggleToolPin(id, pinned) {
    return workerFetch('POST', '/tools/' + id + '/pin', { pinned: pinned })
        .then(function(res) {
            if (!res.ok) throw new Error('Failed to toggle pin: ' + res.status);
            return true;
        });
}

// 添加公告
function insertAnnouncement(data) {
    return workerFetch('POST', '/announcements', data)
        .then(function(res) {
            if (!res.ok) throw new Error('Failed to insert announcement: ' + res.status);
            return true;
        });
}

// 更新公告
function updateAnnouncement(id, data) {
    return workerFetch('PUT', '/announcements/' + id, data)
        .then(function(res) {
            if (!res.ok) throw new Error('Failed to update announcement: ' + res.status);
            return true;
        });
}

// 删除公告
function removeAnnouncement(id) {
    return workerFetch('DELETE', '/announcements/' + id)
        .then(function(res) {
            if (!res.ok) throw new Error('Failed to delete announcement: ' + res.status);
            return true;
        });
}
