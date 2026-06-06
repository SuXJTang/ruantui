// ============================================
// Cloudflare Worker — 管理端 API
// 处理密码验证 + CRUD 代理到 Supabase
// ============================================

// Supabase 配置
var SUPABASE_URL = 'https://gxlykcseepskxccdxmxc.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bHlrY3NlZXBza3hjY2R4bXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MDA2MjksImV4cCI6MjA5NTE3NjYyOX0.oc8MKQ56zk585KgKPXXah_fsLzC5VZqHihOsCWH_zhE';

// 简单的 SHA-256 实现 (使用 Web Crypto API)
async function sha256(msg) {
    var enc = new TextEncoder();
    var hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(msg));
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function(b) { return b.toString(16).padStart(2,'0'); }).join('');
}

// 生成会话 token（1 小时内有效）
async function generateToken(secret) {
    var ts = Date.now().toString();
    var hmac = await sha256('admin:' + secret + ':' + ts);
    return btoa(ts + '.' + hmac);
}

// 验证 token 是否有效（1 小时内）
async function verifyToken(token, secret) {
    try {
        var decoded = atob(token);
        var parts = decoded.split('.');
        if (parts.length !== 2) return false;
        if (Date.now() - parseInt(parts[0]) > 3600000) return false;
        return parts[1] === await sha256('admin:' + secret + ':' + parts[0]);
    } catch (e) { return false; }
}

// 从请求头提取 Bearer token
function extractToken(request) {
    var auth = request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) return null;
    return auth.slice(7);
}

// Supabase REST 请求（使用 anon key + x-admin-token 头通过 RLS 校验）
async function supabaseRequest(method, path, body, adminToken) {
    var opts = {
        method: method,
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'x-admin-token': adminToken || '',
        }
    };
    if (body && (method === 'POST' || method === 'PATCH')) {
        opts.body = JSON.stringify(body);
    }
    var url = SUPABASE_URL + '/rest/v1/' + path;
    var res = await fetch(url, opts);
    var text = await res.text();
    try {
        return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null };
    } catch(e) {
        return { ok: res.ok, status: res.status, data: text };
    }
}

// JSON 响应辅助
function jsonResponse(data, status) {
    return new Response(JSON.stringify(data), {
        status: status || 200,
        headers: { 'Content-Type': 'application/json' }
    });
}

function errorResponse(msg, status) {
    return jsonResponse({ error: msg }, status || 400);
}

// API 路由处理
async function handleRequest(request, env) {
    var url = new URL(request.url);
    var path = url.pathname;
    var method = request.method;

    // CORS 预检
    if (method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        });
    }

    try {
        // POST /api/admin/login — 密码验证
        if (method === 'POST' && path === '/api/admin/login') {
            var body = await request.json();
            var hash = await sha256(body.password || '');
            if (hash !== env.ADMIN_PASSWORD_HASH) {
                return errorResponse('密码错误', 401);
            }
            var token = await generateToken(env.TOKEN_SECRET || 'ruantui-secret');
            return jsonResponse({ token: token, ok: true });
        }

        // 以下路由需要 Bearer token 验证
        var bearer = extractToken(request);
        if (!bearer || !(await verifyToken(bearer, env.TOKEN_SECRET || 'ruantui-secret'))) {
            return errorResponse('未授权', 401);
        }

        // POST /api/admin/tools — 添加工具
        if (method === 'POST' && path === '/api/admin/tools') {
            var toolData = await request.json();
            var result = await supabaseRequest('POST', 'tools', toolData, env.SUPABASE_ADMIN_TOKEN);
            if (!result.ok) return errorResponse('添加失败: ' + result.status, 500);
            return jsonResponse({ ok: true });
        }

        // PUT/DELETE /api/admin/tools/:id — 更新/删除工具
        var match = path.match(/^\/api\/admin\/tools\/(\d+)$/);
        if (match) {
            var toolId = match[1];
            if (method === 'PUT') {
                var updateData = await request.json();
                var result = await supabaseRequest('PATCH', 'tools?id=eq.' + toolId, updateData, env.SUPABASE_ADMIN_TOKEN);
                if (!result.ok) return errorResponse('更新失败: ' + result.status, 500);
                return jsonResponse({ ok: true });
            }
            if (method === 'DELETE') {
                var result = await supabaseRequest('DELETE', 'tools?id=eq.' + toolId, null, env.SUPABASE_ADMIN_TOKEN);
                if (!result.ok) return errorResponse('删除失败: ' + result.status, 500);
                return jsonResponse({ ok: true });
            }
        }

        // POST /api/admin/tools/:id/pin — 切换置顶
        var pinMatch = path.match(/^\/api\/admin\/tools\/(\d+)\/pin$/);
        if (pinMatch && method === 'POST') {
            var pinBody = await request.json();
            var result = await supabaseRequest('PATCH', 'tools?id=eq.' + pinMatch[1], { pinned: pinBody.pinned }, env.SUPABASE_ADMIN_TOKEN);
            if (!result.ok) return errorResponse('置顶失败: ' + result.status, 500);
            return jsonResponse({ ok: true });
        }

        // POST /api/admin/announcements — 添加公告
        if (method === 'POST' && path === '/api/admin/announcements') {
            var annData = await request.json();
            var result = await supabaseRequest('POST', 'announcements', annData, env.SUPABASE_ADMIN_TOKEN);
            if (!result.ok) return errorResponse('添加公告失败: ' + result.status, 500);
            return jsonResponse({ ok: true });
        }

        // PUT/DELETE /api/admin/announcements/:id — 更新/删除公告
        var annMatch = path.match(/^\/api\/admin\/announcements\/(\d+)$/);
        if (annMatch) {
            if (method === 'PUT') {
                var annUpdate = await request.json();
                var result = await supabaseRequest('PATCH', 'announcements?id=eq.' + annMatch[1], annUpdate, env.SUPABASE_ADMIN_TOKEN);
                if (!result.ok) return errorResponse('更新公告失败: ' + result.status, 500);
                return jsonResponse({ ok: true });
            }
            if (method === 'DELETE') {
                var result = await supabaseRequest('DELETE', 'announcements?id=eq.' + annMatch[1], null, env.SUPABASE_ADMIN_TOKEN);
                if (!result.ok) return errorResponse('删除公告失败: ' + result.status, 500);
                return jsonResponse({ ok: true });
            }
        }

        return errorResponse('未找到路由: ' + method + ' ' + path, 404);

    } catch(e) {
        return errorResponse('服务器错误: ' + e.message, 500);
    }
}

// Worker 入口
export default {
    async fetch(request, env, ctx) {
        var url = new URL(request.url);
        // API 请求由 handleRequest 处理
        if (url.pathname.startsWith('/api/')) {
            return handleRequest(request, env);
        }
        // 非 API 请求由静态资源处理
        var response = await env.ASSETS.fetch(request);
        if (response.status === 404) {
            url.pathname = '/index.html';
            return env.ASSETS.fetch(new Request(url));
        }
        return response;
    }
};
