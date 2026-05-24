// ============================================
// supabase.js — Supabase 工具 API
// ============================================
var SUPABASE_URL = 'https://gxlykcseepskxccdxmxc.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bHlrY3NlZXBza3hjY2R4bXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MDA2MjksImV4cCI6MjA5NTE3NjYyOX0.oc8MKQ56zk585KgKPXXah_fsLzC5VZqHihOsCWH_zhE';

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

// 更新工具
function updateTool(id, data) {
    return supabaseFetch('PATCH', 'tools?id=eq.' + id, data)
        .then(function(res) {
            if (!res.ok) throw new Error('Failed to update: ' + res.status);
            return true;
        });
}

// 添加工具
function insertTool(data) {
    return supabaseFetch('POST', 'tools', data)
        .then(function(res) {
            if (!res.ok) throw new Error('Failed to insert: ' + res.status);
            return true;
        });
}

// 删除工具
function removeTool(id) {
    return supabaseFetch('DELETE', 'tools?id=eq.' + id)
        .then(function(res) {
            if (!res.ok) throw new Error('Failed to delete: ' + res.status);
            return true;
        });
}
