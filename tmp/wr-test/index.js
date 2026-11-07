var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/index.js
var ALLOWED_ORIGINS = [
  "https://suxjtang.github.io",
  "https://luoluo.fun",
  "https://www.luoluo.fun",
  "https://ruantui.vercel.app",
  "http://localhost:8080",
  "http://127.0.0.1:8787"
];
function getCORSHeaders(request) {
  var origin = request.headers.get("Origin");
  var headers = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    // 响应随 Origin 变化，必须声明，否则 CDN 可能把 A 源的响应发给 B 源
    "Vary": "Origin"
  };
  if (origin && ALLOWED_ORIGINS.indexOf(origin) >= 0) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}
__name(getCORSHeaders, "getCORSHeaders");
function withCORS(headers, cors) {
  var out = headers || {};
  for (var k in cors) out[k] = cors[k];
  return out;
}
__name(withCORS, "withCORS");
function jsonResponse(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: withCORS({ "Content-Type": "application/json" }, cors)
  });
}
__name(jsonResponse, "jsonResponse");
function errorResponse(msg, status, cors) {
  return jsonResponse({ error: msg }, status || 400, cors);
}
__name(errorResponse, "errorResponse");
function emptyResponse(status, cors) {
  return new Response(null, { status, headers: withCORS({}, cors) });
}
__name(emptyResponse, "emptyResponse");
async function handleClick(request, cors) {
  var body;
  try {
    body = await request.json();
  } catch (e) {
    return emptyResponse(204, cors);
  }
  var toolId = body && body.toolId;
  if (typeof toolId !== "number" || !Number.isSafeInteger(toolId) || toolId <= 0) {
    return emptyResponse(204, cors);
  }
  var toolName = typeof body.toolName === "string" ? body.toolName.slice(0, 100) : "";
  console.log(JSON.stringify({ evt: "tool_click", toolId, toolName, ts: Date.now() }));
  return emptyResponse(204, cors);
}
__name(handleClick, "handleClick");
async function handleRequest(request, env) {
  var url = new URL(request.url);
  var path = url.pathname;
  var method = request.method;
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCORSHeaders(request) });
  }
  var cors = getCORSHeaders(request);
  try {
    if (path === "/api/click") {
      return handleClick(request, cors);
    }
    if (path === "/api/admin/login") {
      return errorResponse("\u8BE5\u63A5\u53E3\u5DF2\u5E9F\u5F03\uFF0C\u8BF7\u4F7F\u7528 Supabase \u8D26\u53F7\u767B\u5F55", 410, cors);
    }
    if (path.indexOf("/api/admin/") === 0) {
      return errorResponse("\u8BE5\u63A5\u53E3\u5DF2\u5E9F\u5F03\uFF0C\u5199\u64CD\u4F5C\u8BF7\u4F7F\u7528 Supabase \u8D26\u53F7\u767B\u5F55\u540E\u76F4\u8FDE", 410, cors);
    }
    return errorResponse("\u672A\u627E\u5230\u8DEF\u7531: " + method + " " + path, 404, cors);
  } catch (e) {
    console.error("worker error:", e && e.message);
    return errorResponse("\u670D\u52A1\u5668\u9519\u8BEF", 500, cors);
  }
}
__name(handleRequest, "handleRequest");
function applyCacheHeaders(request, response) {
  if (!response || response.status !== 200 && response.status !== 304) return response;
  var url = new URL(request.url);
  var pathname = url.pathname;
  var hasVersion = url.searchParams.has("v");
  var contentType = response.headers.get("Content-Type") || "";
  var lastSegment = pathname.split("/").pop();
  var hasExt = /\.[a-z0-9]+$/i.test(lastSegment);
  var isHTML = /text\/html/i.test(contentType) || pathname === "/" || /\.html?$/i.test(pathname) || !hasExt;
  var cacheControl;
  if (isHTML) {
    cacheControl = "no-cache, must-revalidate";
  } else if (hasVersion) {
    cacheControl = "public, max-age=31536000, immutable";
  } else if (/\.(js|css)$/i.test(pathname)) {
    cacheControl = "public, max-age=3600";
  } else if (/\.(png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf)$/i.test(pathname)) {
    cacheControl = "public, max-age=604800";
  } else {
    cacheControl = "public, max-age=3600";
  }
  var headers = new Headers(response.headers);
  headers.set("Cache-Control", cacheControl);
  if (!headers.has("X-Content-Type-Options")) headers.set("X-Content-Type-Options", "nosniff");
  if (!headers.has("Referrer-Policy")) headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
__name(applyCacheHeaders, "applyCacheHeaders");
var index_default = {
  async fetch(request, env, ctx) {
    var url = new URL(request.url);
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return handleRequest(request, env);
    }
    var response = await env.ASSETS.fetch(request);
    if (response.status === 404) {
      var fallbackUrl = new URL(request.url);
      fallbackUrl.pathname = "/index.html";
      return applyCacheHeaders(request, await env.ASSETS.fetch(new Request(fallbackUrl, request)));
    }
    return applyCacheHeaders(request, response);
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
