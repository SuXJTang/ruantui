// ============================================
// Cloudflare Worker — 静态资源服务 + 公开埋点
// ============================================
// v3.2.0 起，管理权限改为 Supabase Auth 账号登录 + 数据库 RLS 白名单，
// 前端带用户 JWT 直连 Supabase 读写。Worker 不再参与权限控制与数据代理。
//
// 目前仅剩两个职责：
//   1. 静态资源服务（ASSETS binding），带 SPA 回退
//   2. POST /api/click —— 公开的点击埋点，无鉴权、不落库，只写 Workers Logs
//
// 旧的 /api/admin/* 已全部返回 410 Gone。

// 允许的前端来源（CORS 白名单）
var ALLOWED_ORIGINS = [
    'https://suxjtang.github.io',
    'https://luoluo.fun',
    'https://www.luoluo.fun',
    'https://ruantui.vercel.app',
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

// ------------------------------------------------------------------
// 注：以下旧的管理端实现已于 v3.2.0 整体删除：
//   timingSafeEqual / validateToolData / tokenSecret / generateToken /
//   verifyToken / extractToken / supabaseRequest / sha256，以及全部
//   /api/admin/* 路由。管理权限改为 Supabase Auth + 数据库 RLS，
//   前端带用户 JWT 直连 Supabase，不再经过 Worker。
// ------------------------------------------------------------------

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
// 注：v3.2.0 起管理权限改为 Supabase Auth 账号登录 + 数据库 RLS 白名单，
// 下面的登录限流 / 密码哈希比对 / token 签发等旧逻辑已被整体移除。
// Worker 现在只保留 /api/click 一个公开埋点接口。
// ------------------------------------------------------------------

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

        // POST /api/admin/login —— 已废弃（v3.2.0）
        //
        // 管理权限已改为 Supabase Auth 账号登录 + 数据库 RLS 的 admins 白名单，
        // 前端不再调用本接口，写操作也改为浏览器带用户 JWT 直连 Supabase。
        //
        // 之所以在这里彻底关掉而不是「留着但改密码」：
        //   1. 旧 ADMIN_PASSWORD_HASH 的明文早已公开，改密码不改变「单一共享口令」
        //      这个本质缺陷——无法区分是谁在操作，也无法单独撤销某个人
        //   2. 前端已不再使用，保留只会多一个可被攻击的入口
        //   3. 即使拿到 token，写库也会被 Supabase RLS 拒绝（实测 401），
        //      但不应让攻击者拿到看似有效的 token
        //
        // 返回 410 Gone 明确表达「该接口已被移除」。
        if (path === '/api/admin/login') {
            return errorResponse('该接口已废弃，请使用 Supabase 账号登录', 410, cors);
        }

        // 以下路由：旧的 token 鉴权写接口，v3.2.0 起整体废弃。
        // 写操作现由浏览器带 Supabase 用户 JWT 直连，不经过 Worker。
        // 相关实现（generateToken / verifyToken / validateToolData / supabaseRequest
        // 以及全部 /api/admin/* 处理器）已删除，避免留下死代码与误用的入口。
        if (path.indexOf('/api/admin/') === 0) {
            return errorResponse('该接口已废弃，写操作请使用 Supabase 账号登录后直连', 410, cors);
        }

        return errorResponse('未找到路由: ' + method + ' ' + path, 404, cors);

    } catch(e) {
        // 不回显内部错误细节
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
