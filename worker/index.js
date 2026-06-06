// ============================================
// Cloudflare Worker - admin API
// ============================================

var SUPABASE_URL = 'https://gxlykcseepskxccdxmxc.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bHlrY3NlZXBza3hjY2R4bXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MDA2MjksImV4cCI6MjA5NTE3NjYyOX0.oc8MKQ56zk585KgKPXXah_fsLzC5VZqHihOsCWH_zhE';

async function sha256(msg) {
    var enc = new TextEncoder();
    var hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(msg));
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function(b) { return b.toString(16).padStart(2,'0'); }).join('');
}

async function generateToken(secret) {
    var ts = Date.now().toString();
    var hmac = await sha256('admin' + ':' + secret + ':' + ts);
    var payload = ts + '.' + hmac;
    return btoa(payload);
}

async function verifyToken(token, secret) {
    try {
        var decoded = atob(token);
        var parts = decoded.split('.');
        if (parts.length !== 2) return false;
        var ts = parts[0];
        var hmac = parts[1];
        if (Date.now() - parseInt(ts) > 3600000) return false;
        var expectedHmac = await sha256('admin' + ':' + secret + ':' + ts);
        if (hmac !== expectedHmac) return false;
        return true;
    } catch(e) { return false; }
}

function extractToken(request) {
    var auth = request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) return null;
    return auth.slice(7);
}

async function supabaseRequest(method, path, body, adminToken) {
    var opts = {
        method: method,
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'x-admin-token': adminToken || ''
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

function jsonResponse(data, status) {
    return new Response(JSON.stringify(data), {
        status: status || 200,
        headers: { 'Content-Type': 'application/json' }
    });
}

function errorResponse(msg, status) {
    return jsonResponse({ error: msg }, status || 400);
}

async function handleRequest(request, env) {
    var url = new URL(request.url);
    var path = url.pathname;
    var method = request.method;

    if (method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    }

    try {
        if (method === 'POST' && path === '/api/admin/login') {
            var body = await request.json();
            var password = body.password || '';
            var hash = await sha256(password);
            if (hash !== env.ADMIN_PASSWORD_HASH) {
                return errorResponse('Incorrect password', 401);
            }
            var token = await generateToken(env.TOKEN_SECRET || 'ruantui-secret');
            return jsonResponse({ token: token, ok: true });
        }

        var token = extractToken(request);
        if (!token || !(await verifyToken(token, env.TOKEN_SECRET || 'ruantui-secret'))) {
            return errorResponse('Not authorized', 401);
        }

        if (method === 'POST' && path === '/api/admin/tools') {
            var toolData = await request.json();
            var result = await supabaseRequest('POST', 'tools', toolData, env.SUPABASE_ADMIN_TOKEN);
            if (!result.ok) return errorResponse('Insert failed: ' + result.status, 500);
            return jsonResponse({ ok: true });
        }

        var match = path.match(/^\/api\/admin\/tools\/(\d+)$/);
        if (match) {
            var toolId = match[1];
            if (method === 'PUT') {
                var updateData = await request.json();
                var result = await supabaseRequest('PATCH', 'tools?id=eq.' + toolId, updateData, env.SUPABASE_ADMIN_TOKEN);
                if (!result.ok) return errorResponse('Update failed: ' + result.status, 500);
                return jsonResponse({ ok: true });
            }
            if (method === 'DELETE') {
                var result = await supabaseRequest('DELETE', 'tools?id=eq.' + toolId, null, env.SUPABASE_ADMIN_TOKEN);
                if (!result.ok) return errorResponse('Delete failed: ' + result.status, 500);
                return jsonResponse({ ok: true });
            }
        }

        var pinMatch = path.match(/^\/api\/admin\/tools\/(\d+)\/pin$/);
        if (pinMatch && method === 'POST') {
            var pinId = pinMatch[1];
            var pinBody = await request.json();
            var result = await supabaseRequest('PATCH', 'tools?id=eq.' + pinId, { pinned: pinBody.pinned }, env.SUPABASE_ADMIN_TOKEN);
            if (!result.ok) return errorResponse('Pin failed: ' + result.status, 500);
            return jsonResponse({ ok: true });
        }

        if (method === 'POST' && path === '/api/admin/announcements') {
            var annData = await request.json();
            var result = await supabaseRequest('POST', 'announcements', annData, env.SUPABASE_ADMIN_TOKEN);
            if (!result.ok) return errorResponse('Insert announcement failed: ' + result.status, 500);
            return jsonResponse({ ok: true });
        }

        var annMatch = path.match(/^\/api\/admin\/announcements\/(\d+)$/);
        if (annMatch) {
            var annId = annMatch[1];
            if (method === 'PUT') {
                var annUpdate = await request.json();
                var result = await supabaseRequest('PATCH', 'announcements?id=eq.' + annId, annUpdate, env.SUPABASE_ADMIN_TOKEN);
                if (!result.ok) return errorResponse('Update announcement failed: ' + result.status, 500);
                return jsonResponse({ ok: true });
            }
            if (method === 'DELETE') {
                var result = await supabaseRequest('DELETE', 'announcements?id=eq.' + annId, null, env.SUPABASE_ADMIN_TOKEN);
                if (!result.ok) return errorResponse('Delete announcement failed: ' + result.status, 500);
                return jsonResponse({ ok: true });
            }
        }

        return errorResponse('Not found: ' + method + ' ' + path, 404);

    } catch(e) {
        return errorResponse('Server error: ' + e.message, 500);
    }
}

export default {
    async fetch(request, env, ctx) {
        var url = new URL(request.url);
        if (url.pathname.startsWith('/api/')) {
            return handleRequest(request, env);
        }
        var response = await env.ASSETS.fetch(request);
        if (response.status === 404) {
            url.pathname = '/index.html';
            return env.ASSETS.fetch(new Request(url));
        }
        return response;
    }
};
