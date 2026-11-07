// ============================================
// Cloudflare Worker — 管理端 API
// 处理密码验证 + CRUD 代理到 Supabase
// ============================================

// Supabase 配置（anon key 是公开客户端密钥，前端 supabase.js 同样内置）
var SUPABASE_URL = 'https://gxlykcseepskxccdxmxc.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bHlrY3NlZXBza3hjY2R4bXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MDA2MjksImV4cCI6MjA5NTE3NjYyOX0.oc8MKQ56zk585KgKPXXah_fsLzC5VZqHihOsCWH_zhE';

// 简单的 SHA-256 实现 (使用 Web Crypto API)
async function sha256(msg) {
    var enc = new TextEncoder();
    var hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(msg));
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function(b) { return b.toString(16).padStart(2,'0'); }).join('');
}

// 允许的前端来源（CORS 白名单）
var ALLOWED_ORIGINS = [
    'https://suxjtang.github.io',
    'http://localhost:8080',
    'http://127.0.0.1:8787',
];

function getCORSHeaders(request) {
    var origin = request.headers.get('Origin');
    var headers = {
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        // 响应随 Origin 变化，必须声明，否则 CDN 可能把 A 源的响应发给 B 源
        'Vary': 'Origin',
    };
    if (origin && ALLOWED_ORIGINS.indexOf(origin) >= 0) {
        headers['Access-Control-Allow-Origin'] = origin;
    }
    return headers;
}

// 常量时间字符串比较 — 防时序攻击（先摘要再比较，长度恒定，且不泄露长度）
async function timingSafeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    var da = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(a)));
    var db = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(b)));
    var diff = 0;
    for (var i = 0; i < da.length; i++) diff |= da[i] ^ db[i];
    return diff === 0;
}

// 工具数据输入校验
function validateToolData(data, isUpdate) {
    if (!data || typeof data !== 'object') return '无效数据';
    if (!isUpdate) {
        if (!data.name || typeof data.name !== 'string' || !data.name.trim()) return '名称不能为空';
        if (!data.category || typeof data.category !== 'string' || !data.category.trim()) return '分类不能为空';
    }
    var MAX = { name: 100, category: 50, comment: 500, detail: 5000, url: 2000, download: 2000, usage: 500, slug: 100, icon: 50, color: 30, iconUrl: 2000 };
    for (var k in MAX) {
        if (data[k] && typeof data[k] === 'string' && data[k].length > MAX[k]) return k + ' 过长';
    }
    if (data.rating !== undefined && (typeof data.rating !== 'number' || data.rating < 1 || data.rating > 5)) return '评分无效';
    return null;
}

// token 签名用的密钥 —— 未显式配置时不再回落到源码里的公开字面量
function tokenSecret(env) {
    if (env && typeof env.TOKEN_SECRET === 'string' && env.TOKEN_SECRET.length > 0) return env.TOKEN_SECRET;
    throw new Error('TOKEN_SECRET 未配置（请用 `wrangler secret put TOKEN_SECRET` 设置）');
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
        if (!/^\d+$/.test(parts[0])) return false;
        if (Date.now() - parseInt(parts[0], 10) > 3600000) return false;
        return timingSafeEqual(parts[1], await sha256('admin:' + secret + ':' + parts[0]));
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
    if (body) opts.body = JSON.stringify(body);
    var url = SUPABASE_URL + '/rest/v1/' + path;
    var res = await fetch(url, opts);
    var text = await res.text();
    try {
        return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null };
    } catch(e) {
        return { ok: res.ok, status: res.status, data: text };
    }
}

// ------------------------------------------------------------------
// 响应辅助 —— CORS 头由调用方显式传入，不使用任何模块级请求状态。
// （旧实现用模块全局 `_currentRequest`，同一 isolate 内并发请求会串源。）
// ------------------------------------------------------------------
function withCORS(headers, cors) {
    var out = headers || {};
    for (var k in cors) out[k] = cors[k];
    return out;
}

function jsonResponse(data, status, cors) {
    return new Response(JSON.stringify(data), {
        status: status || 200,
        headers: withCORS({ 'Content-Type': 'application/json' }, cors),
    });
}

function errorResponse(msg, status, cors) {
    return jsonResponse({ error: msg }, status || 400, cors);
}

// 空响应（用于 /api/click 的 204，避免多余体积）
function emptyResponse(status, cors) {
    return new Response(null, { status: status, headers: withCORS({}, cors) });
}

// ------------------------------------------------------------------
// 登录尝试限流（内存态，尽力而为）
// Worker isolate 是每个实例一份的内存：不跨 isolate/地域共享，
// 冷启动或扩容即清零，因此这只是抬高暴力破解成本的减速带，
// 不是可靠的账号锁。真正的硬上限应交给 Cloudflare Rate Limiting 规则。
// ------------------------------------------------------------------
var LOGIN_MAX_ATTEMPTS = 10;
var LOGIN_WINDOW_MS = 10 * 60 * 1000;   // 10 分钟
var LOGIN_MAX_KEYS = 1000;              // 防内存膨胀：超限即整体重置

var loginFailures = new Map();          // ip -> { count, resetAt }

function clientIP(request) {
    // Cloudflare 边缘写入的 CF-Connecting-IP，客户端无法伪造
    return request.headers.get('CF-Connecting-IP') || 'unknown';
}

function pruneLoginFailures(now) {
    loginFailures.forEach(function(entry, key) {
        if (now >= entry.resetAt) loginFailures.delete(key);
    });
}

// 返回 0 表示放行，否则返回需要等待的秒数
function loginRetryAfter(ip, now) {
    if (loginFailures.size > LOGIN_MAX_KEYS) loginFailures.clear();
    var entry = loginFailures.get(ip);
    if (!entry) return 0;
    if (now >= entry.resetAt) { loginFailures.delete(ip); return 0; }
    if (entry.count < LOGIN_MAX_ATTEMPTS) return 0;
    return Math.ceil((entry.resetAt - now) / 1000);
}

function recordLoginFailure(ip, now) {
    var entry = loginFailures.get(ip);
    if (!entry || now >= entry.resetAt) {
        entry = { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    }
    entry.count += 1;
    loginFailures.set(ip, entry);
}

// 成功登录后清空该 IP 的计数，避免正常管理员被自己的历史失败拖累
function clearLoginFailures(ip) {
    loginFailures.delete(ip);
}

// ------------------------------------------------------------------
// /api/click —— 公开的埋点 ping（ui.js trackToolClick 调用）
// 不触碰 Supabase：写入需要 SECURITY DEFINER RPC，migration.sql 未定义
// 点击表，而 increment_tool_view 的语义是「打开详情」，不能挪用来记外链点击。
// 这里只做输入校验并在 Workers Logs 留一行结构化日志，供后续接入 Analytics。
// ------------------------------------------------------------------
async function handleClick(request, cors) {
    var body;
    try {
        body = await request.json();
    } catch (e) {
        return emptyResponse(204, cors);
    }
    var toolId = body && body.toolId;
    // 只接受正整数 toolId；其余一律静默丢弃（客户端用 .catch 吞掉任何错误）
    if (typeof toolId !== 'number' || !Number.isSafeInteger(toolId) || toolId <= 0) {
        return emptyResponse(204, cors);
    }
    var toolName = (typeof body.toolName === 'string') ? body.toolName.slice(0, 100) : '';
    console.log(JSON.stringify({ evt: 'tool_click', toolId: toolId, toolName: toolName, ts: Date.now() }));
    return emptyResponse(204, cors);
}

// API 路由处理
async function handleRequest(request, env) {
    var url = new URL(request.url);
    var path = url.pathname;
    var method = request.method;

    // CORS 预检
    if (method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: getCORSHeaders(request) });
    }

    // 在该请求内算一次，显式往下传（不再依赖模块全局）
    var cors = getCORSHeaders(request);

    try {
        // /api/click —— 公开埋点，无需鉴权；放在 token 校验之前。
        // 刻意不限制 HTTP 方法：这是 fire-and-forget 的公开 ping，
        // 任何方法都应得到 204 而不是 401，避免客户端把它当成鉴权失败去重试。
        if (path === '/api/click') {
            return handleClick(request, cors);
        }

        // POST /api/admin/login — 密码验证
        if (method === 'POST' && path === '/api/admin/login') {
            var ip = clientIP(request);
            var now = Date.now();
            pruneLoginFailures(now);

            var wait = loginRetryAfter(ip, now);
            if (wait > 0) {
                var limited = errorResponse('尝试过于频繁，请稍后再试', 429, cors);
                limited.headers.set('Retry-After', String(wait));
                return limited;
            }

            // 未配置管理员密码哈希时**直接失败关闭**，避免任何「空值比较恰好成立」的意外。
            // 另外强校验格式：必须是 64 位十六进制 SHA-256。有人可能误把明文密码填进
            // ADMIN_PASSWORD_HASH，那样登录会永久失败（比误放行安全，但要在部署时立刻发现）。
            var expectedHash = (typeof env.ADMIN_PASSWORD_HASH === 'string')
                ? env.ADMIN_PASSWORD_HASH.trim().toLowerCase() : '';
            if (!/^[0-9a-f]{64}$/.test(expectedHash)) {
                return errorResponse('服务端未正确配置 ADMIN_PASSWORD_HASH', 500, cors);
            }

            var body;
            try {
                body = await request.json();
            } catch (e) {
                return errorResponse('无效请求体', 400, cors);
            }
            var hash = await sha256(typeof body.password === 'string' ? body.password : '');
            if (!(await timingSafeEqual(hash, expectedHash))) {
                recordLoginFailure(ip, now);
                return errorResponse('密码错误', 401, cors);
            }
            clearLoginFailures(ip);
            var token = await generateToken(tokenSecret(env));
            return jsonResponse({ token: token, ok: true }, 200, cors);
        }

        // 以下路由需要 Bearer token 验证
        var bearer = extractToken(request);
        if (!bearer || !(await verifyToken(bearer, tokenSecret(env)))) {
            return errorResponse('未授权', 401, cors);
        }

        // POST /api/admin/tools — 添加工具
        if (method === 'POST' && path === '/api/admin/tools') {
            var toolData = await request.json();
            var verr = validateToolData(toolData, false);
            if (verr) return errorResponse(verr, 400, cors);
            var result = await supabaseRequest('POST', 'tools', toolData, env.SUPABASE_ADMIN_TOKEN);
            if (!result.ok) return errorResponse('添加失败: ' + result.status, 500, cors);
            return jsonResponse({ ok: true }, 200, cors);
        }

        // PUT/DELETE /api/admin/tools/:id — 更新/删除工具
        var match = path.match(/^\/api\/admin\/tools\/(\d+)$/);
        if (match) {
            var toolId = match[1];
            if (method === 'PUT') {
                var updateData = await request.json();
                var verr2 = validateToolData(updateData, true);
                if (verr2) return errorResponse(verr2, 400, cors);
                var resultUpd = await supabaseRequest('PATCH', 'tools?id=eq.' + toolId, updateData, env.SUPABASE_ADMIN_TOKEN);
                if (!resultUpd.ok) return errorResponse('更新失败: ' + resultUpd.status, 500, cors);
                return jsonResponse({ ok: true }, 200, cors);
            }
            if (method === 'DELETE') {
                var resultDel = await supabaseRequest('DELETE', 'tools?id=eq.' + toolId, null, env.SUPABASE_ADMIN_TOKEN);
                if (!resultDel.ok) return errorResponse('删除失败: ' + resultDel.status, 500, cors);
                return jsonResponse({ ok: true }, 200, cors);
            }
        }

        // POST /api/admin/tools/:id/pin — 切换置顶
        var pinMatch = path.match(/^\/api\/admin\/tools\/(\d+)\/pin$/);
        if (pinMatch) {
            if (method === 'POST') {
                var pinBody = await request.json();
                if (!pinBody || typeof pinBody.pinned !== 'boolean') return errorResponse('pinned 必须是布尔值', 400, cors);
                var resultPin = await supabaseRequest('PATCH', 'tools?id=eq.' + pinMatch[1], { pinned: pinBody.pinned }, env.SUPABASE_ADMIN_TOKEN);
                if (!resultPin.ok) return errorResponse('置顶失败: ' + resultPin.status, 500, cors);
                return jsonResponse({ ok: true }, 200, cors);
            }
        }

        // POST /api/admin/announcements — 添加公告
        if (method === 'POST' && path === '/api/admin/announcements') {
            var annData = await request.json();
            var resultAnn = await supabaseRequest('POST', 'announcements', annData, env.SUPABASE_ADMIN_TOKEN);
            if (!resultAnn.ok) return errorResponse('添加公告失败: ' + resultAnn.status, 500, cors);
            return jsonResponse({ ok: true }, 200, cors);
        }

        // PUT/DELETE /api/admin/announcements/:id — 更新/删除公告
        var annMatch = path.match(/^\/api\/admin\/announcements\/(\d+)$/);
        if (annMatch) {
            if (method === 'PUT') {
                var annUpdate = await request.json();
                var resultAnnUpd = await supabaseRequest('PATCH', 'announcements?id=eq.' + annMatch[1], annUpdate, env.SUPABASE_ADMIN_TOKEN);
                if (!resultAnnUpd.ok) return errorResponse('更新公告失败: ' + resultAnnUpd.status, 500, cors);
                return jsonResponse({ ok: true }, 200, cors);
            }
            if (method === 'DELETE') {
                var resultAnnDel = await supabaseRequest('DELETE', 'announcements?id=eq.' + annMatch[1], null, env.SUPABASE_ADMIN_TOKEN);
                if (!resultAnnDel.ok) return errorResponse('删除公告失败: ' + resultAnnDel.status, 500, cors);
                return jsonResponse({ ok: true }, 200, cors);
            }
        }

        return errorResponse('未找到路由: ' + method + ' ' + path, 404, cors);

    } catch(e) {
        // 不回显内部错误细节；配置缺失（如 TOKEN_SECRET）按服务端故障处理
        console.error('worker error:', e && e.message);
        return errorResponse('服务器错误', 500, cors);
    }
}

// Worker 入口
export default {
    async fetch(request, env, ctx) {
        var url = new URL(request.url);
        // API 请求由 handleRequest 处理。
        // 注：assets.run_worker_first 已把 /api/* 交给 Worker 先行处理；
        // 下面的路径判断保留为兜底（本地 dev / 配置回退时同样正确）。
        if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
            return handleRequest(request, env);
        }
        // 非 API 请求由静态资源处理
        var response = await env.ASSETS.fetch(request);
        if (response.status === 404) {
            // 保留原始 method / headers / body 等（旧实现 new Request(url) 会丢成 GET）
            var fallbackUrl = new URL(request.url);
            fallbackUrl.pathname = '/index.html';
            return env.ASSETS.fetch(new Request(fallbackUrl, request));
        }
        return response;
    }
};
