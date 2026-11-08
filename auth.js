// ============================================
// auth.js — Supabase Auth 账号登录（管理员）
// ============================================
// 为什么不再用「管理密码」：
//   旧的密码弹窗把密码哈希硬编码在公开仓库里，谁都能反推出密码进而拿到管理权限；
//   而且写操作要经过 Cloudflare Worker 中转，两个站点（GitHub Pages / Vercel）
//   都没有后端，管理面板实际上一直是坏的。
//
// 现在改成 Supabase 官方 Auth：
//   管理员用邮箱 + 密码登录 → 拿到 Supabase 用户 JWT → 直连 Supabase 写表。
//   是否允许写由数据库 RLS 的 is_admin()（比对 admins 表里的 UID）决定，
//   前端就算被篡改也改不了数据。
//
// 安全要点：
//   - 本项目允许自由注册，所以不能只判断「已登录」，必须判断「是管理员」。
//   - 会话存在 localStorage（Supabase 默认），刷新页面免重复登录。
//   - 登出会清除本地会话。

(function() {
    'use strict';

    var SESSION_KEY = 'ruantui_admin_session';  // { access_token, refresh_token, expires_at, email, user_id }

    // ---------- 会话存取 ----------
    function readSession() {
        try {
            var raw = localStorage.getItem(SESSION_KEY);
            if (!raw) return null;
            var s = JSON.parse(raw);
            if (!s || !s.access_token) return null;
            return s;
        } catch (e) { return null; }
    }

    function writeSession(s) {
        try {
            if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
            else localStorage.removeItem(SESSION_KEY);
        } catch (e) {}
    }

    // 把 Supabase /auth/v1/token 的返回转成我们的会话结构
    function toSession(d, emailHint) {
        if (!d || !d.access_token) return null;
        var expiresIn = typeof d.expires_in === 'number' ? d.expires_in : 3600;
        var user = d.user || {};
        return {
            access_token: d.access_token,
            refresh_token: d.refresh_token || '',
            // 提前 60 秒视为过期，避免边界情况下拿着刚过期的 token 请求
            expires_at: Date.now() + Math.max(0, expiresIn - 60) * 1000,
            email: user.email || emailHint || '',
            user_id: user.id || ''
        };
    }

    function authHeaders(token) {
        var h = { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY };
        if (token) h['Authorization'] = 'Bearer ' + token;
        return h;
    }

    // ---------- 登录 ----------
    // 返回 Promise<{ok:true} | {ok:false, error:string}>
    function signIn(email, password) {
        return fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
            method: 'POST',
            headers: authHeaders(null),
            body: JSON.stringify({ email: email, password: password })
        }).then(function(res) {
            return res.json().catch(function() { return {}; }).then(function(d) {
                if (!res.ok) {
                    var msg = d.error_description || d.msg || d.error || ('HTTP ' + res.status);
                    // 常见错误翻译成人话
                    if (/Invalid login credentials/i.test(msg)) msg = '邮箱或密码错误';
                    else if (/Email not confirmed/i.test(msg)) msg = '邮箱尚未验证，请先在邮箱里点确认链接';
                    else if (/too many requests/i.test(msg)) msg = '尝试过于频繁，请稍后再试';
                    return { ok: false, error: msg };
                }
                var s = toSession(d, email);
                if (!s) return { ok: false, error: '登录响应异常' };
                writeSession(s);
                // 登录后把本地收藏合并上云（engagement.js 提供；缺失时静默跳过）
                if (window.syncFavorites) { try { window.syncFavorites(); } catch(e) {} }
                return { ok: true, session: s };
            });
        }).catch(function(e) {
            return { ok: false, error: '网络错误：' + (e && e.message ? e.message : '无法连接') };
        });
    }

    function signOut() {
        var s = readSession();
        writeSession(null);
        if (s && s.access_token) {
            // 尽力通知服务端作废该 token；失败也不影响本地登出
            fetch(SUPABASE_URL + '/auth/v1/logout', {
                method: 'POST',
                headers: authHeaders(s.access_token)
            }).catch(function() {});
        }
        App.state.isAdmin = false;
        App.state.adminToken = null;
    }

    // ---------- 刷新 ----------
    // 用 refresh_token 换新的 access_token。失败返回 null。
    function refresh() {
        var s = readSession();
        if (!s || !s.refresh_token) return Promise.resolve(null);
        return fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
            method: 'POST',
            headers: authHeaders(null),
            body: JSON.stringify({ refresh_token: s.refresh_token })
        }).then(function(res) {
            if (!res.ok) { writeSession(null); return null; }
            return res.json().then(function(d) {
                var ns = toSession(d, s.email);
                if (!ns) { writeSession(null); return null; }
                writeSession(ns);
                return ns;
            });
        }).catch(function() { return null; });
    }

    // 取得一个可能仍然有效的 access_token（必要时先刷新）
    function getAccessToken() {
        var s = readSession();
        if (!s) return Promise.resolve(null);
        if (s.expires_at && Date.now() < s.expires_at) return Promise.resolve(s.access_token);
        return refresh().then(function(ns) { return ns ? ns.access_token : null; });
    }

    // ---------- 当前用户 ----------
    function currentUser() {
        var s = readSession();
        if (!s) return null;
        return { email: s.email, id: s.user_id };
    }

    // 是否已登录（注意：这不代表是管理员。写权限由数据库 RLS 判定）
    function isLoggedIn() {
        return !!readSession();
    }

    // 校验 token 是否被服务端认可，并顺便确认是否在 admins 名单里
    // 返回 Promise<{loggedIn, isAdmin, email}>
    function verifyAdmin() {
        return getAccessToken().then(function(token) {
            if (!token) return { loggedIn: false, isAdmin: false };
            // 查 admins 表：RLS 只允许本人看到自己的行，所以能查到 == 是管理员
            return fetch(SUPABASE_URL + '/rest/v1/admins?select=user_id&limit=1', {
                headers: authHeaders(token)
            }).then(function(res) {
                if (res.status === 401) {
                    writeSession(null);
                    return { loggedIn: false, isAdmin: false };
                }
                return res.json().then(function(rows) {
                    var u = currentUser();
                    return {
                        loggedIn: true,
                        isAdmin: Array.isArray(rows) && rows.length > 0,
                        email: u ? u.email : ''
                    };
                });
            });
        }).catch(function() {
            return { loggedIn: false, isAdmin: false };
        });
    }

    // ---------- 注册 ----------
    // 返回 Promise<{ok:true} | {ok:true, needsConfirm:true} | {ok:false, error}>
    // needsConfirm 表示 Supabase 开启了「邮箱验证」，需要用户点邮件链接后才能登录。
    // Supabase 的 signUp 在邮箱已存在时也会返回 200（不报错，防止账号枚举），
    // 这种情况拿不到 session，按「需要验证」处理并提示用户。
    function signUp(email, password) {
        return fetch(SUPABASE_URL + '/auth/v1/signup', {
            method: 'POST',
            headers: authHeaders(null),
            body: JSON.stringify({ email: email, password: password })
        }).then(function(res) {
            return res.json().catch(function() { return {}; }).then(function(d) {
                if (!res.ok) {
                    var msg = d.error_description || d.msg || d.error || ('HTTP ' + res.status);
                    if (/already registered|already been registered|User already/i.test(msg)) msg = '该邮箱已注册，请直接登录';
                    else if (/Password should be at least/i.test(msg)) msg = '密码太短，至少 6 位';
                    else if (/Invalid email/i.test(msg)) msg = '邮箱格式不正确';
                    else if (/too many requests|rate limit/i.test(msg)) msg = '操作过于频繁，请稍后再试';
                    else if (/signups not allowed|Email signups are disabled/i.test(msg)) msg = '站点已关闭注册';
                    return { ok: false, error: msg };
                }
                // 有 session 说明直接注册并登录成功；没有则需邮件验证
                if (d.access_token) {
                    var s = toSession(d, email);
                    if (s) {
                        writeSession(s);
                        if (window.syncFavorites) { try { window.syncFavorites(); } catch(e) {} }
                        return { ok: true, session: s };
                    }
                }
                return { ok: true, needsConfirm: true };
            });
        }).catch(function(e) {
            return { ok: false, error: '网络错误：' + (e && e.message ? e.message : '无法连接') };
        });
    }

    // ---------- 导出 ----------
    window.Auth = {
        signIn: signIn,
        signUp: signUp,
        signOut: signOut,
        refresh: refresh,
        getAccessToken: getAccessToken,
        currentUser: currentUser,
        isLoggedIn: isLoggedIn,
        verifyAdmin: verifyAdmin
    };
})();
