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

// ============================================
// 静态资源缓存策略
// ============================================
// 目标：国内用户首次访问快、二次访问近乎瞬时。
//
// 分三类处理：
//
// 1. 带版本号的资源（*.js?v=15 / style.css?v=15）
//    → 强缓存 1 年 + immutable。因为 URL 里已含版本戳，内容变了 URL 就变，
//      不存在「缓存了旧版本」的风险。这是性能收益最大的一类，
//      原先 max-age=0, must-revalidate 会导致每次访问都回源校验。
//
// 2. HTML（index.html、/、以及 SPA 回退页）
//    → 不缓存（no-cache），必须每次回源。否则用户永远看不到新版本，
//      而且 HTML 里引用的 ?v= 版本号也要能及时更新。
//
// 3. 图片 / 字体 / 图标（无版本号但内容稳定）
//    → 缓存 7 天。折中：内容基本不变，但偶尔换图能在一周内生效。
//
// 另外统一加：
//   X-Content-Type-Options: nosniff   防 MIME 嗅探
//   Referrer-Policy: strict-origin-when-cross-origin  限制 Referer 泄露
function applyCacheHeaders(request, response) {
    // 只处理成功响应；错误页/重定向不缓存
    if (!response || (response.status !== 200 && response.status !== 304)) return response;

    var url = new URL(request.url);
    var pathname = url.pathname;
    var hasVersion = url.searchParams.has('v');   // ?v=15 这类版本戳

    var contentType = response.headers.get('Content-Type') || '';

    // 判断是否为 HTML 页面。不能只看 Content-Type：
    //   · 根路径 "/" 在部分环境下不返回 Content-Type
    //   · SPA 路由（/about）没有扩展名，但返回的是 index.html
    // 所以同时用「路径无扩展名」来兜底，宁可把页面判为 HTML（不缓存）也不误缓存页面。
    var lastSegment = pathname.split('/').pop();
    var hasExt = /\.[a-z0-9]+$/i.test(lastSegment);
    var isHTML = /text\/html/i.test(contentType) ||
        pathname === '/' ||
        /\.html?$/i.test(pathname) ||
        !hasExt;   // 无扩展名 → 视为页面路由（SPA）

    var cacheControl;
    if (isHTML) {
        cacheControl = 'no-cache, must-revalidate';
    } else if (hasVersion) {
        // URL 带版本戳 → 内容不可变，可永久缓存
        cacheControl = 'public, max-age=31536000, immutable';
    } else if (/\.(js|css)$/i.test(pathname)) {
        // 没有版本戳的 JS/CSS 只能短缓存，避免更新不同步
        cacheControl = 'public, max-age=3600';
    } else if (/\.(png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf)$/i.test(pathname)) {
        cacheControl = 'public, max-age=604800';
    } else {
        // xml / txt / json 等（sitemap、robots、manifest）
        cacheControl = 'public, max-age=3600';
    }

    // Response 头是不可变的，需要重建
    var headers = new Headers(response.headers);
    headers.set('Cache-Control', cacheControl);
    if (!headers.has('X-Content-Type-Options')) headers.set('X-Content-Type-Options', 'nosniff');
    if (!headers.has('Referrer-Policy')) headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
    });
}

// ------------------------------------------------------------------
// Supabase 反向代理
// ------------------------------------------------------------------
// 把 /sb/<path> 转发到 https://<project>.supabase.co/<path>。
// 目的：绕开国内直连 supabase.co 不稳定的问题，让浏览器只与同域的 luoluo.fun 通信。
//
// 注意点：
//  1. 只转发白名单路径（rest/v1、auth/v1），不开放任意路径，避免变成开放代理
//  2. 透传 method / body / 需要的请求头（apikey、Authorization、Content-Type、Prefer）
//  3. 同源请求，不需要 CORS 头；但仍透传 Supabase 返回的必要头
//  4. 不缓存任何响应（数据实时性优先，且含用户私有数据）
var SB_PROXY_BASE = 'https://gxlykcseepskxccdxmxc.supabase.co';

// 允许转发的路径前缀（防止变成开放代理）
var SB_ALLOWED_PREFIXES = ['/rest/v1/', '/auth/v1/'];

// 需要透传给 Supabase 的请求头
var SB_FORWARD_HEADERS = [
    'apikey',
    'authorization',
    'content-type',
    'prefer',
    'accept',
    'accept-profile',
    'content-profile',
    'x-client-info',
    'range',
];

async function handleSupabaseProxy(request, url) {
    // /sb/rest/v1/tools → /rest/v1/tools
    var subPath = url.pathname.slice(3); // 去掉 '/sb'
    if (!subPath.startsWith('/')) subPath = '/' + subPath;

    // 白名单校验
    var allowed = SB_ALLOWED_PREFIXES.some(function (p) {
        return subPath.startsWith(p);
    });
    if (!allowed) {
        return new Response(JSON.stringify({ error: 'path not allowed' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    var target = SB_PROXY_BASE + subPath + (url.search || '');

    // 构造转发请求头
    var headers = new Headers();
    SB_FORWARD_HEADERS.forEach(function (name) {
        var v = request.headers.get(name);
        if (v) headers.set(name, v);
    });

    // 构造转发请求
    var init = {
        method: request.method,
        headers: headers,
        redirect: 'manual',
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        init.body = await request.arrayBuffer();
    }

    var upstream;
    try {
        upstream = await fetch(target, init);
    } catch (e) {
        return new Response(JSON.stringify({
            error: 'upstream_unreachable',
            message: 'Supabase 转发失败：' + (e && e.message ? e.message : '网络错误'),
        }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // 透传响应（同源，无需 CORS 头）
    var outHeaders = new Headers();
    var passHeaders = ['content-type', 'content-range', 'x-total-count', 'location', 'www-authenticate'];
    passHeaders.forEach(function (name) {
        var v = upstream.headers.get(name);
        if (v) outHeaders.set(name, v);
    });
    // 代理响应一律不缓存
    outHeaders.set('Cache-Control', 'no-store');
    outHeaders.set('X-Proxy', 'sb');

    return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: outHeaders,
    });
}

// Worker 入口
export default {
    async fetch(request, env, ctx) {
        var url = new URL(request.url);

        // ---------- Supabase 转发 ----------
        // 背景：国内网络直连 <project>.supabase.co 很不稳定（时通时断），
        // 用户会看到「数据加载失败 / 网络连接失败」。
        // 而 luoluo.fun 走 Cloudflare，国内可访问。
        // 所以把 /sb/* 反向代理到 Supabase，前端改成请求同域的 /sb/...，
        // 由 Worker 在服务端转发 —— 浏览器不再需要直连 supabase.co。
        //
        // 路径映射：
        //   /sb/rest/v1/tools      → https://<proj>.supabase.co/rest/v1/tools
        //   /sb/auth/v1/token      → https://<proj>.supabase.co/auth/v1/token
        // 这样前端只要把 base URL 换成 '/sb' 即可，其余代码不用动。
        if (url.pathname === '/sb' || url.pathname.startsWith('/sb/')) {
            return handleSupabaseProxy(request, url);
        }

        // API 请求由 handleRequest 处理。
        // 注：assets.run_worker_first 已把 /api/* 交给 Worker 先行处理；
        // 下面的路径判断保留为兜底（本地 dev / 配置回退时同样正确）。
        if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
            return handleRequest(request, env);
        }

        // 首页：把工具列表以纯静态 HTML 塞进 #toolGrid。
        // 现状是 #toolGrid 为空、全靠 JS 渲染，而搜索引擎不执行 JS，
        // 抓到的首页只有「0 款工具 0 个分类」，收录质量很差。
        // 这里在服务端渲染一份卡片，JS 加载后再接管（用户看到的效果不变）。
        var isHome = url.pathname === '/' || url.pathname === '' || url.pathname === '/index.html';
        if (isHome) {
            var homeReq = new Request(new URL('/index.html', url), request);
            var homeRes = await env.ASSETS.fetch(homeReq);
            if (homeRes.status === 200) {
                var rendered = await injectToolList(homeRes, url, ctx);
                if (rendered) {
                    // SSR 内容随工具数据变化，不能长缓存；但也不能 no-store ——
                    // no-store 会让每次刷新都回源（Worker + Supabase 各一次往返），
                    // 用户体感就是「刷新很慢，一直转圈」。
                    // 折中：边缘缓存 60 秒 + 浏览器 30 秒后可用旧内容并在后台刷新。
                    //   60 秒内重复访问直接命中边缘缓存，秒开；
                    //   管理员改完数据最多 1 分钟生效，可接受。
                    var rHeaders = new Headers(rendered.headers);
                    rHeaders.set('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
                    return new Response(rendered.body, { status: 200, headers: rHeaders });
                }
            }
            return applyCacheHeaders(request, homeRes);
        }

        // 工具详情页 /t/{id}：服务 index.html，但把 <title>/<meta> 替换成该工具的信息。
        // 这样每种工具都有独立可被搜索引擎抓取的标题与描述，而不必静态生成 18 个 HTML。
        var toolId = matchToolPath(url.pathname);
        if (toolId !== null) {
            var htmlReq = new Request(new URL('/index.html', url), request);
            var htmlRes = await env.ASSETS.fetch(htmlReq);
            if (htmlRes.status === 200) {
                var page = await injectToolMeta(htmlRes, toolId, url, ctx);
                // 直接返回，不要经过 applyCacheHeaders ——
                // 后者会把 injectToolMeta 设好的 no-store 覆盖成 no-cache，
                // 而 no-cache 实测阻挡不住 Cloudflare 边缘缓存，
                // 导致改了注入逻辑后 /t/{id} 一直返回旧版本。
                if (page) return page;
            }
            // 取不到数据时退回普通首页，不要给用户 404
            var fb = new Request(new URL('/index.html', url), request);
            var fbRes = await env.ASSETS.fetch(fb);
            var fbHeaders = new Headers(fbRes.headers);
            fbHeaders.set('Cache-Control', 'no-store, must-revalidate');
            return new Response(fbRes.body, { status: 200, headers: fbHeaders });
        }

        // 非 API 请求由静态资源处理
        // html_handling 已设为 none，所以 "/" 不会再被自动解析成 index.html，
        // 这里显式处理，避免首页 404。
        var assetUrl = url;
        if (url.pathname === '/' || url.pathname === '') {
            assetUrl = new URL('/index.html', url);
        }
        var response = await env.ASSETS.fetch(assetUrl === url ? request : new Request(assetUrl, request));
        if (response.status === 404) {
            // SPA 回退：未知路径一律回 index.html（保留原始 method / headers / body，
            // 旧实现 new Request(url) 会丢成 GET）
            var fallbackUrl = new URL(request.url);
            fallbackUrl.pathname = '/index.html';
            return applyCacheHeaders(request, await env.ASSETS.fetch(new Request(fallbackUrl, request)));
        }
        return applyCacheHeaders(request, response);
    }
};

// ------------------------------------------------------------------
// 工具详情页支持
// ------------------------------------------------------------------
var SB_URL = 'https://gxlykcseepskxccdxmxc.supabase.co';
var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bHlrY3NlZXBza3hjY2R4bXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MDA2MjksImV4cCI6MjA5NTE3NjYyOX0.oc8MKQ56zk585KgKPXXah_fsLzC5VZqHihOsCWH_zhE';

// /t/56 或 /t/56-可可影视 都能识别
function matchToolPath(pathname) {
    var m = pathname.match(/^\/t\/(\d+)(?:[-/]|$)/);
    return m ? parseInt(m[1], 10) : null;
}

function escHTML(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 把 HTML 里的相对资源路径改成绝对路径。
// 背景：index.html 是给根路径写的，里面的 style.css、ui.js、manifest.json 都是相对路径。
// 当页面通过 /t/56 访问时，这些相对路径会被解析成 /t/style.css，全部 404，
// 导致整站脚本加载失败、页面只剩骨架。
// 只处理根目录下的相对引用（不含 / 开头、不含协议、不以 # 或 ? 开头），
// 已有的绝对路径与 data: 之类原样保留。
function absolutizeAssets(html, origin) {
    function abs(p) {
        if (!p) return p;
        if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#|\?)/i.test(p)) return p; // 已是绝对/锚点/查询
        return origin + '/' + p.replace(/^\.\//, '');
    }
    // <link href="...">
    html = html.replace(/<link\b[^>]*\bhref="([^"]+)"/gi, function (m, href) {
        return m.replace('href="' + href + '"', 'href="' + abs(href) + '"');
    });
    // <script src="...">
    html = html.replace(/<script\b[^>]*\bsrc="([^"]+)"/gi, function (m, src) {
        return m.replace('src="' + src + '"', 'src="' + abs(src) + '"');
    });
    // <img src="...">
    html = html.replace(/<img\b[^>]*\bsrc="([^"]+)"/gi, function (m, src) {
        return m.replace('src="' + src + '"', 'src="' + abs(src) + '"');
    });
    return html;
}

// 取工具数据（走 Supabase 公开只读接口，anon key 只能读不能写）
async function fetchTool(id, ctx) {
    var endpoint = SB_URL + '/rest/v1/tools?id=eq.' + id +
        '&select=id,name,category,comment,detail,rating,iconUrl,color,tags&limit=1';
    var rows = await fetchListCached(endpoint, ctx);
    return rows && rows[0] ? rows[0] : null;
}

// 带缓存地拉 Supabase 列表，返回数组或 null
async function fetchListCached(endpoint, ctx) {
    var cacheKey = new Request(endpoint, { method: 'GET' });
    var cache = caches.default;
    var hit = await cache.match(cacheKey);
    if (hit) {
        try { return await hit.json(); } catch (e) { return null; }
    }
    var res = await fetch(endpoint, {
        headers: {
            'apikey': SB_KEY,
            'Authorization': 'Bearer ' + SB_KEY,
        },
    });
    if (!res.ok) return null;
    var rows = await res.json();
    if (!Array.isArray(rows)) return null;
    // 缓存 10 分钟：工具信息改动不频繁，管理员编辑后最多 10 分钟生效
    if (ctx && ctx.waitUntil) {
        var toCache = new Response(JSON.stringify(rows), {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' },
        });
        ctx.waitUntil(cache.put(cacheKey, toCache));
    }
    return rows;
}

// 把卡片 HTML 注入到页面的 #toolGrid，并把统计数字填上。
// 首页和详情页共用这份逻辑 —— 两处都要有 SSR 内容，
// 否则 JS 一旦加载失败（国内网络抖动时常见），用户看到的就是
// 一个「0 款工具 0 个分类」的空白页。
function injectCardsIntoHTML(html, cards, tools, catCountNum) {
    html = html.replace('<section class="grid" id="toolGrid"></section>',
        '<section class="grid" id="toolGrid" data-ssr="1">' + cards + '</section>');
    html = html.replace(/(<strong[^>]*id="totalCount"[^>]*>)0(<\/strong>)/, '$1' + tools.length + '$2');
    html = html.replace(/(<strong[^>]*id="categoryCount"[^>]*>)0(<\/strong>)/, '$1' + catCountNum + '$2');
    return html;
}

// 生成静态卡片 HTML。
// 渲染的是「完整卡片」—— 图标、分类、标签、下载按钮全都有。
// 原因：国内用户偶发连不上 Supabase 或脚本加载失败时，前端拿不到数据，
// #toolGrid 会保留这份内容。渲染成完整卡片后，即使数据接口完全不可用，
// 用户依然能正常浏览和下载。
// JS 拿到数据后会整体重建 #toolGrid 覆盖掉，所以不影响正常流程。
function renderSSRCards(tools, origin) {
    return tools.map(function (t) {
        var icon = t.iconUrl || '';
        if (icon && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(icon)) icon = '/' + icon;
        var cat = escHTML(t.category || '');
        var name = escHTML(t.name || '');
        var comment = escHTML((t.comment || '').slice(0, 60));
        var detailUrl = escHTML(origin + '/t/' + t.id);

        var color = t.color || '#FF7D20';
        var iconHTML = icon
            ? '<div class="tool-icon" style="background:' + escHTML(color) + '14">' +
              '<img src="' + escHTML(icon) + '" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">' +
              '</div>'
            : '<div class="tool-icon" style="background:' + escHTML(color) + ';color:#fff;font-weight:700;font-size:22px">' +
              escHTML((t.name || '?').charAt(0)) + '</div>';

        var pinnedHTML = t.pinned ? '<span class="pinned-badge">推荐</span>' : '';

        var tags = Array.isArray(t.tags) ? t.tags : [];
        var tagHTML = tags.length
            ? '<div class="tool-tags">' + tags.slice(0, 4).map(function (g) {
                return '<span class="tool-tag">' + escHTML(g) + '</span>';
              }).join('') + '</div>'
            : '';

        // 按钮指向的地址要和前端 renderTools() 一致：
        //   · 有 download → 直接指向下载地址（用户点「下载」就该下载，不该绕到详情页）
        //   · 有 url（官网）→ 指向官网
        //   · 都没有 → 指向详情页
        // 之前这里一律指向 detailUrl，导致用户点「⬇️ 下载」跳到 /t/{id} 详情页 —— 明显不对。
        // SSR 阶段无法知道访客是不是 VIP，所以：
        //   free → 直接放下载地址
        //   user / vip → 不把下载地址写进 HTML（否则看源码就能拿到），
        //                改为链接到详情页，由前端按登录态/会员态决定能否下载
        var tier = t.download_tier || 'free';
        var primaryLink, btnLabel, btnClass = 'tool-visit-btn';

        if (tier === 'free') {
            primaryLink = t.download || t.url || (origin + '/t/' + t.id);
            btnLabel = t.download ? '⬇️ 下载' : (t.url ? '🌐 去官网' : '查看详情');
        } else if (t.url) {
            // 有官网就先给官网，详情页里有下载入口
            primaryLink = t.url;
            btnLabel = '🌐 去官网';
        } else {
            primaryLink = origin + '/t/' + t.id;
            btnLabel = tier === 'vip' ? '👑 VIP 专属' : '🔒 登录后下载';
            btnClass += ' tool-visit-locked-link';
        }

        var btnHTML = '<a class="' + btnClass + '" href="' + escHTML(primaryLink) + '"' +
            (tier === 'free' ? ' target="_blank" rel="noopener"' : '') + '>' + btnLabel + '</a>';

        return '<article class="tool-card ssr-card">' +
            iconHTML +
            '<div class="tool-body">' +
            '<h3>' + pinnedHTML + '<a href="' + detailUrl + '" style="color:inherit;text-decoration:none">' + name + '</a></h3>' +
            '<div class="tool-meta"><span class="tool-cat">' + cat + '</span>' +
            // 与前端卡片保持一致：下载次数（主）+ 浏览次数（次）
            '<span class="tool-metrics">' +
              '<span class="tool-dl" title="下载次数"><i class="fas fa-download"></i>' +
              '<span class="tool-dl-num">' + (Number(t.downloads) || 0) + '</span></span>' +
            '</span>' +
            '</div>' +
            '<p>' + comment + '</p>' +
            tagHTML +
            '</div>' +
            btnHTML +
            '</article>';
    }).join('');
}

// 服务端渲染首页工具列表。
// 目标：让不执行 JS 的爬虫也能看到全部工具的名字/分类/简介/链接，
// 而不是只看到一个空的「0 款工具」。
// 渲染出来的卡片与前端 renderTools() 的结构一致，JS 接管时直接覆盖，不会闪烁错乱。
async function injectToolList(htmlRes, url, ctx) {
    var endpoint = SB_URL + '/rest/v1/tools?select=id,name,category,comment,rating,iconUrl,color,tags,url,download,pinned,download_tier,downloads,views&order=pinned.desc,created_at.asc';
    var tools = await fetchListCached(endpoint, ctx);
    if (!tools || !tools.length) return null;

    var html = await htmlRes.text();
    var origin = url.origin;

    // 生成静态卡片。
    // 关键设计：这里渲染的是「完整卡片」而不是简化版 —— 图标、分类、标签、下载按钮全都有。
    //
    // 原因：国内用户偶发连不上 Supabase 时，前端拿不到数据，
    // #toolGrid 会保留这份 SSR 内容。如果这里只渲染「名称 + 查看详情」，
    // 用户看到的就是一个没有图标、没有下载按钮的残缺页面（真实发生过）。
    // 渲染成完整卡片后，即使数据接口完全不可用，用户依然能正常浏览和下载。
    //
    // JS 拿到数据后会整体重建 #toolGrid 覆盖掉，所以不影响正常流程。
    // 刻意不含：收藏按钮、点击特效等强交互元素（避免与 JS 绑定冲突）。
    var cards = renderSSRCards(tools, origin);

    // 统计数字也补上，否则爬虫看到的是「0 款工具 0 个分类」
    // 注意 index.html 里是 <strong id="totalCount">0</strong>，不是 span
    var catCount = {};
    tools.forEach(function (t) { var c = t.category || '未分类'; catCount[c] = (catCount[c] || 0) + 1; });

    html = injectCardsIntoHTML(html, cards, tools, Object.keys(catCount).length);

    // 详情页同样注入 SSR 卡片。
    // 这一步很关键：/t/{id} 之前是纯骨架页面（toolGrid 空、统计为 0），
    // 一旦 JS 加载失败，用户看到的就是「0 款工具 0 个分类」的空白页。
    // 注入卡片后，即使脚本挂了也能看到完整列表。
    try {
        var listEndpoint = SB_URL + '/rest/v1/tools?select=id,name,category,comment,rating,iconUrl,color,tags,url,download,pinned,download_tier,downloads,views&order=pinned.desc,created_at.asc';
        var allTools = await fetchListCached(listEndpoint, ctx);
        if (allTools && allTools.length) {
            var catSet = {};
            allTools.forEach(function (x) { var c = x.category || '未分类'; catSet[c] = (catSet[c] || 0) + 1; });
            html = injectCardsIntoHTML(html, renderSSRCards(allTools, origin), allTools, Object.keys(catSet).length);
        }
    } catch (e) {
        console.error('injectToolMeta: SSR 卡片注入失败', e && e.message);
    }

    // 详情页同理：短缓存而不是 no-store。
    // no-store 会导致每次刷新都回源，用户体感很慢（截图里那个一直转的圈）。
    var metaHeaders = new Headers(htmlRes.headers);
    metaHeaders.set('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
    // 这里不再经过 applyCacheHeaders，所以安全头要自己补上
    if (!metaHeaders.has('X-Content-Type-Options')) metaHeaders.set('X-Content-Type-Options', 'nosniff');
    if (!metaHeaders.has('Referrer-Policy')) metaHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return new Response(html, { status: 200, headers: metaHeaders });
}

// 把首页 HTML 里的 title / description / og / canonical / JSON-LD 换成具体工具的信息
async function injectToolMeta(htmlRes, toolId, url, ctx) {
    var tool;
    try {
        tool = await fetchTool(toolId, ctx);
    } catch (e) {
        console.error('fetchTool 抛错', toolId, e && e.message);
        return null;
    }
    if (!tool) {
        console.error('fetchTool 返回空, id=' + toolId);
        return null;
    }

    var html = await htmlRes.text();
    var origin = url.origin;
    var pageUrl = origin + '/t/' + tool.id;

    // ⚠️ 关键：index.html 里全是相对路径（style.css、ui.js、manifest.json…）。
    // 一旦页面挂在 /t/56 这样的子路径下，浏览器会把它们解析成 /t/style.css 而全部 404，
    // 结果是页面只有骨架、所有脚本都加载失败。
    // 所以这里必须把根目录资源引用改成绝对路径。
    html = absolutizeAssets(html, origin);

    // 标题用「工具名 + 用途」，比单纯堆关键词更像给人看的
    var title = tool.name + ' — ' + (tool.category || '工具') + '推荐 | 软推';
    var desc = (tool.comment || '').slice(0, 110);
    if (!desc && tool.detail) desc = tool.detail.slice(0, 110);
    var img = tool.iconUrl || (origin + '/icon.svg');
    if (img.indexOf('http') !== 0 && img.indexOf('//') !== 0) img = origin + '/' + img.replace(/^\/+/, '');

    var t = escHTML(title), d = escHTML(desc), u = escHTML(pageUrl), im = escHTML(img), n = escHTML(tool.name);

    html = html.replace(/<title>[^<]*<\/title>/i, '<title>' + t + '</title>');
    html = html.replace(
        /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
        '<meta name="description" content="' + d + '">'
    );
    html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, '<link rel="canonical" href="' + u + '">');
    html = html.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, '<meta property="og:title" content="' + t + '">');
    html = html.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, '<meta property="og:description" content="' + d + '">');
    html = html.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, '<meta property="og:url" content="' + u + '">');
    html = html.replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, '<meta property="og:image" content="' + im + '">');
    html = html.replace(/<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i, '<meta property="og:type" content="article">');
    html = html.replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, '<meta name="twitter:title" content="' + t + '">');
    html = html.replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, '<meta name="twitter:description" content="' + d + '">');
    html = html.replace(/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i, '<meta name="twitter:image" content="' + im + '">');

    // 每条工具页注入 SoftwareApplication 结构化数据，搜索结果里能显示评分
    var rating = Number(tool.rating) || 0;
    var ratingBlock = rating > 0
        ? ',"aggregateRating":{"@type":"AggregateRating","ratingValue":"' + rating + '","bestRating":"5","worstRating":"1","ratingCount":"1"}'
        : '';
    var ld = '{"@context":"https://schema.org","@type":"SoftwareApplication","name":"' + n +
        '","applicationCategory":"' + escHTML(tool.category || 'Utility') + '"' +
        ',"operatingSystem":"Android, iOS, Windows, macOS, Linux, Web"' +
        ',"description":"' + escHTML(desc) + '"' +
        ',"url":"' + u + '"' +
        ',"image":"' + im + '"' + ratingBlock + '}';
    html = html.replace('</head>',
        '<script type="application/ld+json">' + ld + '</script>\n' +
        '<script>window.__RUANTUI_TOOL_ID__=' + tool.id + ';</script>\n</head>');

    // 内链：爬虫进到 /t/{id} 后如果没有出链就成了死胡同，
    // 权重传不回首页、后续抓取频率也会下降。
    // 这里注入两块内容：
    //   1. 面包屑（首页 > 分类 > 工具名），带 BreadcrumbList 结构化数据
    //   2. 底部「同类工具」导航，链接到同分类的其他工具页
    var breadcrumb = '<nav class="ssr-crumb" aria-label="面包屑导航" style="max-width:1200px;margin:16px auto 0;padding:0 max(16px,4vw);font-size:13px;color:var(--text-light);">' +
        '<a href="' + escHTML(origin + '/') + '" style="color:var(--primary);text-decoration:none;">软推首页</a>' +
        ' <span style="opacity:.5;">›</span> ' +
        '<span>' + escHTML(tool.category || '工具') + '</span>' +
        ' <span style="opacity:.5;">›</span> ' +
        '<span style="color:var(--text);">' + n + '</span>' +
        '</nav>';
    html = html.replace(/<body([^>]*)>/i, '<body$1>' + breadcrumb);

    // 同类工具：拉同分类的其他工具（最多 8 个）
    // 分类里只有它自己时（比如「效率工具」只有 Syncthing），related 为空，
    // 但仍要输出「返回首页」链接，否则这个页面又变回死胡同。
    var related = await fetchRelatedTools(tool, ctx);
    var relItems = related.map(function (r) {
        return '<a class="ssr-rel-item" href="' + escHTML(origin + '/t/' + r.id) + '" ' +
            'style="display:inline-block;padding:8px 14px;margin:6px 8px 6px 0;border:1px solid var(--border);' +
            'border-radius:999px;font-size:13px;color:var(--text);text-decoration:none;background:rgba(128,128,128,.05);">' +
            escHTML(r.name) + '</a>';
    }).join('');
    var relHeading = related.length
        ? '更多' + escHTML(tool.category || '') + '工具'
        : '浏览更多工具';
    var relBlock = '<section class="ssr-related" style="max-width:1200px;margin:32px auto 48px;padding:0 max(16px,4vw);">' +
        '<h2 style="font-size:15px;font-weight:700;margin-bottom:10px;color:var(--text);">' + relHeading + '</h2>' +
        (relItems ? '<div>' + relItems + '</div>' : '') +
        '<a href="' + escHTML(origin + '/') + '" style="display:inline-block;margin-top:16px;font-size:13px;color:var(--primary);text-decoration:none;">← 返回首页查看全部工具</a>' +
        '</section>';
    html = html.replace(/<\/body>/i, relBlock + '</body>');

    // 面包屑结构化数据，搜索结果里会显示层级路径
    var crumbLd = '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[' +
        '{"@type":"ListItem","position":1,"name":"软推","item":"' + escHTML(origin + '/') + '"},' +
        '{"@type":"ListItem","position":2,"name":"' + escHTML(tool.category || '工具') + '"},' +
        '{"@type":"ListItem","position":3,"name":"' + n + '","item":"' + u + '"}' +
        ']}';
    html = html.replace('</head>',
        '<script type="application/ld+json">' + crumbLd + '</script>\n</head>');

    return new Response(html, {
        status: 200,
        headers: htmlRes.headers,
    });
}

// 取同分类的其他工具，用于详情页底的「更多 XX 工具」内链
async function fetchRelatedTools(tool, ctx) {
    var cat = encodeURIComponent(tool.category || '');
    if (!cat) return [];
    var endpoint = SB_URL + '/rest/v1/tools?select=id,name&category=eq.' + cat +
        '&id=neq.' + tool.id + '&order=pinned.desc,id.asc&limit=8';
    var rows = await fetchListCached(endpoint, ctx);
    return Array.isArray(rows) ? rows : [];
}
