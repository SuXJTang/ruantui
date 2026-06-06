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
    var hmac = await sha256('admin:' + secret + ':' + ts);
    return btoa(ts + '.' + hmac);
}

async function verifyToken(token, secret) {
    try {
        var decoded = atob(token);
        var parts = decoded.split('.');
        if (parts.length !== 2) return false;
        if (Date.now() - parseInt(parts[0]) > 3600000) return false;
        return parts[1] === await sha256('admin:' + secret + ':' + parts[0]);
    } catch (e) { return false; }
}

function extractToken(request) {
    var auth = request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) return null;
    return auth.slice(7);
}

function json(data, status) {
    return new Response(JSON.stringify(data), {
        status: status || 200,
        headers: { 'Content-Type': 'application/json' }
    });
}

export default {
    async fetch(request, env) {
        var url = new URL(request.url);
        var method = request.method;
        var path = url.pathname;

        if (!path.startsWith('/api/')) {
            var res = await env.ASSETS.fetch(request);
            if (res.status === 404) {
                url.pathname = '/index.html';
                return env.ASSETS.fetch(new Request(url));
            }
            return res;
        }

        if (method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            });
        }

        try {
            if (method === 'POST' && path === '/api/admin/login') {
                var body = await request.json();
                var hash = await sha256(body.password || '');
                if (hash !== env.ADMIN_PASSWORD_HASH) return json({ error: 'wrong password' }, 401);
                var token = await generateToken(env.TOKEN_SECRET || 'ruantui-secret');
                return json({ token: token, ok: true });
            }

            var bearer = extractToken(request);
            if (!bearer || !(await verifyToken(bearer, env.TOKEN_SECRET || 'ruantui-secret'))) {
                return json({ error: 'unauthorized' }, 401);
            }

            var adminHeaders = {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
                'x-admin-token': env.SUPABASE_ADMIN_TOKEN || ''
            };

            var supabase = async function(m, p, b) {
                var opts = { method: m, headers: adminHeaders };
                if (b) opts.body = JSON.stringify(b);
                var r = await fetch(SUPABASE_URL + '/rest/v1/' + p, opts);
                var t = await r.text();
                return { ok: r.ok, status: r.status, data: t ? JSON.parse(t) : null };
            };

            if (method === 'POST' && path === '/api/admin/tools') {
                var d = await request.json();
                var r = await supabase('POST', 'tools', d);
                return r.ok ? json({ ok: true }) : json({ error: 'insert failed' }, 500);
            }

            var m = path.match(/^\/api\/admin\/tools\/(\d+)$/);
            if (m) {
                var id = m[1];
                if (method === 'PUT') {
                    var d = await request.json();
                    var r = await supabase('PATCH', 'tools?id=eq.' + id, d);
                    return r.ok ? json({ ok: true }) : json({ error: 'update failed' }, 500);
                }
                if (method === 'DELETE') {
                    var r = await supabase('DELETE', 'tools?id=eq.' + id);
                    return r.ok ? json({ ok: true }) : json({ error: 'delete failed' }, 500);
                }
            }

            return json({ error: 'not found' }, 404);
        } catch (e) {
            return json({ error: e.message }, 500);
        }
    }
};
