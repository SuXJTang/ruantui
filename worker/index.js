// ============================================
// Cloudflare Worker 鈥?绠＄悊绔?API
// 澶勭悊瀵嗙爜楠岃瘉 + CRUD 浠ｇ悊鍒?Supabase
// 浣跨敤 anon key + x-admin-token 澶撮€氳繃 RLS 鏍￠獙
// ============================================

// 鐜鍙橀噺锛堥€氳繃 wrangler secret 鎴?.dev.vars 娉ㄥ叆锛?// - ADMIN_PASSWORD_HASH: 绠＄悊鍛樺瘑鐮佺殑 SHA-256 鍝堝笇
// - SUPABASE_ADMIN_TOKEN: 涓?Supabase RLS is_admin() 鍖归厤鐨勪护鐗?// - TOKEN_SECRET: 浼氳瘽 token 绛惧悕瀵嗛挜

var SUPABASE_URL = 'https://gxlykcseepskxccdxmxc.supabase.co';
// 鍏紑鐨?anon key锛堜笌 supabase.js 涓€鑷达級锛孯LS 鍐欑瓥鐣ラ€氳繃 x-admin-token 澶存帶鍒?var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bHlrY3NlZXBza3hjY2R4bXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MDA2MjksImV4cCI6MjA5NTE3NjYyOX0.oc8MKQ56zk585KgKPXXah_fsLzC5VZqHihOsCWH_zhE';

// 绠€鍗曠殑 SHA-256 瀹炵幇 (浣跨敤 Web Crypto API)
async function sha256(msg) {
    var enc = new TextEncoder();
    var hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(msg));
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function(b) { return b.toString(16).padStart(2,'0'); }).join('');
}

// 鐢熸垚浼氳瘽 token
async function generateToken(password, secret) {
    var ts = Date.now().toString();
    var hmac = await sha256('admin' + ':' + secret + ':' + ts);
    var payload = ts + '.' + hmac;
    return btoa(payload);
}

// 楠岃瘉 token 鏄惁鏈夋晥锛? 灏忔椂鍐咃級
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
    } catch(e) {
        return false;
    }
}

// 浠庤姹傚ご鎻愬彇 Bearer token
function extractToken(request) {
    var auth = request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) return null;
    return auth.slice(7);
}

// Supabase REST 璇锋眰锛堜娇鐢?anon key + x-admin-token 澶撮€氳繃 RLS 鏍￠獙锛?async function supabaseRequest(method, path, body, adminToken) {
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

// JSON 鍝嶅簲杈呭姪
function jsonResponse(data, status) {
    return new Response(JSON.stringify(data), {
        status: status || 200,
        headers: { 'Content-Type': 'application/json' }
    });
}

function errorResponse(msg, status) {
    return jsonResponse({ error: msg }, status || 400);
}

// -------------------------------------------------------
// 璺敱澶勭悊
// -------------------------------------------------------
async function handleRequest(request, env) {
    var url = new URL(request.url);
    var path = url.pathname;
    var method = request.method;

    // CORS 棰勬
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
        // ---- POST /api/admin/login 鈥?瀵嗙爜楠岃瘉 ----
        if (method === 'POST' && path === '/api/admin/login') {
            var body = await request.json();
            var password = body.password || '';
            var hash = await sha256(password);
            if (hash !== env.ADMIN_PASSWORD_HASH) {
                return errorResponse('瀵嗙爜閿欒', 401);
            }
            var token = await generateToken(password, env.TOKEN_SECRET || 'ruantui-secret');
            return jsonResponse({ token: token, ok: true });
        }

        // ---- 浠ヤ笅璺敱闇€瑕?Bearer token 楠岃瘉 ----
        var token = extractToken(request);
        if (!token || !(await verifyToken(token, env.TOKEN_SECRET || 'ruantui-secret'))) {
            return errorResponse('鏈巿鏉?, 401);
        }

        // ---- POST /api/admin/tools 鈥?娣诲姞宸ュ叿 ----
        if (method === 'POST' && path === '/api/admin/tools') {
            var toolData = await request.json();
            var result = await supabaseRequest('POST', 'tools', toolData, env.SUPABASE_ADMIN_TOKEN);
            if (!result.ok) return errorResponse('娣诲姞澶辫触: ' + result.status, 500);
            return jsonResponse({ ok: true });
        }

        // ---- PUT /api/admin/tools/:id 鈥?鏇存柊宸ュ叿 ----
        var match = path.match(/^\/api\/admin\/tools\/(\d+)$/);
        if (match) {
            var toolId = match[1];
            if (method === 'PUT') {
                var updateData = await request.json();
                var result = await supabaseRequest('PATCH', 'tools?id=eq.' + toolId, updateData, env.SUPABASE_ADMIN_TOKEN);
                if (!result.ok) return errorResponse('鏇存柊澶辫触: ' + result.status, 500);
                return jsonResponse({ ok: true });
            }
            if (method === 'DELETE') {
                var result = await supabaseRequest('DELETE', 'tools?id=eq.' + toolId, null, env.SUPABASE_ADMIN_TOKEN);
                if (!result.ok) return errorResponse('鍒犻櫎澶辫触: ' + result.status, 500);
                return jsonResponse({ ok: true });
            }
        }

        // ---- POST /api/admin/tools/:id/pin 鈥?鍒囨崲缃《 ----
        var pinMatch = path.match(/^\/api\/admin\/tools\/(\d+)\/pin$/);
        if (pinMatch && method === 'POST') {
            var pinId = pinMatch[1];
            var pinBody = await request.json();
            var result = await supabaseRequest('PATCH', 'tools?id=eq.' + pinId, { pinned: pinBody.pinned }, env.SUPABASE_ADMIN_TOKEN);
            if (!result.ok) return errorResponse('缃《澶辫触: ' + result.status, 500);
            return jsonResponse({ ok: true });
        }

        // ---- POST /api/admin/announcements 鈥?娣诲姞鍏憡 ----
        if (method === 'POST' && path === '/api/admin/announcements') {
            var annData = await request.json();
            var result = await supabaseRequest('POST', 'announcements', annData, env.SUPABASE_ADMIN_TOKEN);
            if (!result.ok) return errorResponse('娣诲姞鍏憡澶辫触: ' + result.status, 500);
            return jsonResponse({ ok: true });
        }

        // ---- PUT/DELETE /api/admin/announcements/:id 鈥?鏇存柊/鍒犻櫎鍏憡 ----
        var annMatch = path.match(/^\/api\/admin\/announcements\/(\d+)$/);
        if (annMatch) {
            var annId = annMatch[1];
            if (method === 'PUT') {
                var annUpdate = await request.json();
                var result = await supabaseRequest('PATCH', 'announcements?id=eq.' + annId, annUpdate, env.SUPABASE_ADMIN_TOKEN);
                if (!result.ok) return errorResponse('鏇存柊鍏憡澶辫触: ' + result.status, 500);
                return jsonResponse({ ok: true });
            }
            if (method === 'DELETE') {
                var result = await supabaseRequest('DELETE', 'announcements?id=eq.' + annId, null, env.SUPABASE_ADMIN_TOKEN);
                if (!result.ok) return errorResponse('鍒犻櫎鍏憡澶辫触: ' + result.status, 500);
                return jsonResponse({ ok: true });
            }
        }

        return errorResponse('鏈壘鍒拌矾鐢? ' + method + ' ' + path, 404);

    } catch(e) {
        return errorResponse('鏈嶅姟鍣ㄩ敊璇? ' + e.message, 500);
    }
}

// Worker 鍏ュ彛
export default {
    async fetch(request, env, ctx) {
        var url = new URL(request.url);
        // 鍙嫤鎴?/api/* 璺緞
        if (url.pathname.startsWith('/api/')) {
            return handleRequest(request, env);
        }
        // 闈?API 璇锋眰鐢遍潤鎬佽祫婧愬鐞?        // 鐢?ASSETS binding 鑾峰彇闈欐€佹枃浠讹紱濡傛灉 404 鍒欒繑鍥?index.html锛圫PA fallback锛?        var response = await env.ASSETS.fetch(request);
        if (response.status === 404) {
            url.pathname = '/index.html';
            return env.ASSETS.fetch(new Request(url));
        }
        return response;
    }
};
