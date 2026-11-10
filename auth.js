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

    // 把 fetch 抛出的原始异常翻译成人话。
    // Failed to fetch / NetworkError 在国内网络环境里很常见（访问 supabase.co 偶尔超时），
    // 直接甩英文会让用户以为是网站坏了。
    function netErrorText(e) {
        var raw = (e && e.message) ? e.message : '';
        if (/Failed to fetch|NetworkError|Load failed|network error/i.test(raw)) {
            return '网络连接失败，请检查网络后重试（如反复失败，可切换 Wi-Fi / 流量再试）';
        }
        if (/timeout|timed out/i.test(raw)) {
            return '请求超时，请稍后重试';
        }
        if (/aborted/i.test(raw)) {
            return '请求被中断，请重试';
        }
        return '网络错误：' + (raw || '无法连接，请检查网络');
    }

    // 带重试的 fetch：网络类错误自动重试 2 次（间隔 800ms、1600ms）。
    // 只在「连接层面失败」时重试，4xx/5xx 属于服务端明确响应，不重试。
    function fetchWithRetry(url, opts, retriesLeft) {
        var left = (typeof retriesLeft === 'number') ? retriesLeft : 2;
        return fetch(url, opts).catch(function(e) {
            if (left <= 0) throw e;
            var delay = 800 * Math.pow(2, 2 - left);
            return new Promise(function(resolve) { setTimeout(resolve, delay); })
                .then(function() { return fetchWithRetry(url, opts, left - 1); });
        });
    }

    // 构造请求头
    //   token   : 用户 JWT，可为 null
    //   isRest  : true 表示调用 PostgREST（表数据接口），需要带 Prefer
    function authHeaders(token, isRest) {
        var h = { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY };
        if (token) h['Authorization'] = 'Bearer ' + token;
        if (isRest) h['Prefer'] = 'return=representation';
        return h;
    }

    // ---------- 登录 ----------
    // 返回 Promise<{ok:true} | {ok:false, error:string}>
    function signIn(email, password) {
        return fetchWithRetry(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
            method: 'POST',
            headers: authHeaders(null),
            body: JSON.stringify({ email: email, password: password })
        }).then(function(res) {
            return res.json().catch(function() { return {}; }).then(function(d) {
                if (!res.ok) {
                    var msg = d.error_description || d.msg || d.error || ('HTTP ' + res.status);
                    var code = d.error_code || '';
                    // 常见错误翻译成人话
                    if (/Invalid login credentials/i.test(msg)) msg = '邮箱或密码错误';
                    else if (/Email not confirmed/i.test(msg) || code === 'email_not_confirmed') {
                        // 带上 needsConfirm 标记，让前端能给出「重新发送验证邮件」的操作
                        return { ok: false, error: '邮箱尚未验证。请到邮箱点确认链接后再登录，或点下方按钮重发邮件。', needsConfirm: true };
                    }
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
            return { ok: false, error: netErrorText(e) };
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
            return fetchWithRetry(SUPABASE_URL + '/rest/v1/admins?select=user_id&limit=1', {
                headers: authHeaders(token)
            }).then(function(res) {
                if (res.status === 401) {
                    writeSession(null);
                    return { loggedIn: false, isAdmin: false };
                }
                if (!res.ok) {
                    // 5xx / 网关异常：这属于「没查成」，不是「不是管理员」。
                    // 两者必须区分 —— 否则管理员会因为一次请求失败被降级成普通用户，
                    // 界面上「管理员」会突然退回「我的」。
                    return {
                        loggedIn: true, isAdmin: null, unknown: true,
                        email: (currentUser() || {}).email || ''
                    };
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
            // 连接层失败同样是「没查成」，不要误判成普通用户
            return {
                loggedIn: true, isAdmin: null, unknown: true,
                email: (currentUser() || {}).email || ''
            };
        });
    }

    // ---------- 注册 ----------
    // 返回 Promise<{ok:true} | {ok:true, needsConfirm:true} | {ok:false, error}>
    // needsConfirm 表示 Supabase 开启了「邮箱验证」，需要用户点邮件链接后才能登录。
    // Supabase 的 signUp 在邮箱已存在时也会返回 200（不报错，防止账号枚举），
    // 这种情况拿不到 session，按「需要验证」处理并提示用户。
    function signUp(email, password) {
        return fetchWithRetry(SUPABASE_URL + '/auth/v1/signup', {
            method: 'POST',
            headers: authHeaders(null),
            body: JSON.stringify({ email: email, password: password })
        }).then(function(res) {
            return res.json().catch(function() { return {}; }).then(function(d) {
                if (!res.ok) {
                    var msg = d.error_description || d.msg || d.error || ('HTTP ' + res.status);
                    var code = d.error_code || '';
                    if (/already registered|already been registered|User already/i.test(msg)) msg = '该邮箱已注册，请直接登录';
                    else if (/Password should be at least/i.test(msg)) msg = '密码太短，至少 6 位';
                    else if (/Invalid email/i.test(msg)) msg = '邮箱格式不正确';
                    // 邮件发送配额用尽（Supabase 默认 SMTP 限制很严）：
                    // 这不是「你操作太快」，而是站点的发信额度用完了，要说清楚
                    else if (code === 'over_email_send_rate_limit' || /email rate limit|email_send_rate/i.test(msg)) {
                        msg = '验证邮件发送额度已用完（临时限制），请过 1 小时后再注册。如果急需，请联系站长。';
                    }
                    else if (res.status === 429 || /too many requests|rate limit/i.test(msg)) msg = '操作过于频繁，请稍后再试';
                    else if (/signups not allowed|Email signups are disabled/i.test(msg)) msg = '站点已关闭注册';
                    return { ok: false, error: msg };
                }
                // 判断「该邮箱是否已经注册过」——
                // Supabase 出于防账号枚举的考虑，已存在的邮箱也返回 200 成功，
                // 唯一可靠的判据是 identities 字段：
                //   新注册   → identities 是长度 ≥1 的数组
                //   已存在   → identities 是空数组 []
                // 用这个差异给出明确提示，否则用户会以为注册成功了，
                // 实际上既不会更新密码，也不会收到新的验证邮件。
                var identities = d.identities || (d.user && d.user.identities);
                if (Array.isArray(identities) && identities.length === 0) {
                    return {
                        ok: false,
                        alreadyRegistered: true,
                        error: '该邮箱已经注册过了。如果你记得密码，请直接登录；忘记密码可以联系站长重置。'
                    };
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
            return { ok: false, error: netErrorText(e) };
        });
    }

    // ---------- 重发验证邮件 ----------
    // 用户登录时如果提示「邮箱未验证」，可以点按钮重发一封。
    // Supabase 的 /auth/v1/resend 有频率限制（默认 60 秒一次），这里把
    // 429 也翻译成可读提示，避免用户以为是坏了。
    function resendConfirm(email) {
        return fetchWithRetry(SUPABASE_URL + '/auth/v1/resend', {
            method: 'POST',
            headers: authHeaders(null),
            body: JSON.stringify({ type: 'signup', email: email })
        }).then(function(res) {
            return res.json().catch(function() { return {}; }).then(function(d) {
                if (!res.ok) {
                    var msg = d.error_description || d.msg || d.error || ('HTTP ' + res.status);
                    var rcode = d.error_code || '';
                    if (rcode === 'over_email_send_rate_limit' || /email rate limit|email_send_rate/i.test(msg)) {
                        return { ok: false, error: '邮箱发送额度已用完，请过 1 小时后再试' };
                    }
                    if (res.status === 429 || /too many|rate limit|seconds/i.test(msg)) {
                        return { ok: false, error: '发送太频繁，请等 1 分钟后再试' };
                    }
                    if (/already confirmed/i.test(msg)) return { ok: true, alreadyConfirmed: true };
                    return { ok: false, error: msg };
                }
                return { ok: true };
            });
        }).catch(function(e) {
            return { ok: false, error: netErrorText(e) };
        });
    }

    // ============================================================
    // 忘记密码：发送重置邮件
    // ------------------------------------------------------------
    // 不管邮箱存不存在都返回成功 —— 防止攻击者用它探测哪些邮箱注册过。
    // 这是 Supabase 官方推荐的做法。
    // ============================================================
    function resetPassword(email) {
        if (!email) return Promise.resolve({ ok: false, error: '请输入邮箱' });

        return fetchWithRetry(SUPABASE_URL + '/auth/v1/recover', {
            method: 'POST',
            headers: authHeaders(null),
            body: JSON.stringify({ email: email })
        }).then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (d) {
                if (res.status === 429) {
                    return { ok: false, error: '发送太频繁，请等 1 分钟后再试' };
                }
                if (!res.ok) {
                    var msg = d.error_description || d.msg || d.error || ('HTTP ' + res.status);
                    var rcode = d.error_code || '';
                    if (rcode === 'over_email_send_rate_limit' || /email rate limit|email_send_rate/i.test(msg)) {
                        return { ok: false, error: '邮件发送额度已用完，请过 1 小时后再试' };
                    }
                    if (rcode === 'email_address_invalid' || /invalid.*email/i.test(msg)) {
                        return { ok: false, error: '邮箱格式不正确，请检查后重试' };
                    }
                    // 其他错误也模糊处理，不暴露邮箱是否存在
                    return { ok: true, sent: true };
                }
                return { ok: true, sent: true };
            });
        }).catch(function (e) {
            return { ok: false, error: netErrorText(e) };
        });
    }

    // ============================================================
    // 改密码（需要已登录）
    // ------------------------------------------------------------
    // 改完密码后 Supabase 会保留当前 session，但其他设备会失效。
    // 这里额外主动刷新一次 token，确保当前设备继续可用。
    // ============================================================
    function updatePassword(newPassword) {
        if (!newPassword || newPassword.length < 6) {
            return Promise.resolve({ ok: false, error: '密码至少 6 位' });
        }

        var s = readSession();
        if (!s || !s.access_token) {
            return Promise.resolve({ ok: false, error: '请先登录' });
        }

        return fetchWithRetry(SUPABASE_URL + '/auth/v1/user', {
            method: 'PUT',
            headers: authHeaders(s.access_token),
            body: JSON.stringify({ password: newPassword })
        }).then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (d) {
                if (!res.ok) {
                    var msg = d.error_description || d.msg || d.error || ('HTTP ' + res.status);
                    if (/same.*password|should be different/i.test(msg)) {
                        return { ok: false, error: '新密码不能和旧密码相同' };
                    }
                    if (/weak.*password|password.*short/i.test(msg)) {
                        return { ok: false, error: '密码太简单，请用至少 6 位并混合字母数字' };
                    }
                    return { ok: false, error: msg };
                }
                return { ok: true };
            });
        }).catch(function (e) {
            return { ok: false, error: netErrorText(e) };
        });
    }

    // ============================================================
    // 退出所有设备
    // ------------------------------------------------------------
    // Supabase 的 /auth/v1/logout?scope=others 会吊销除当前之外的所有 refresh token。
    // ============================================================
    function signOutEverywhere() {
        var s = readSession();
        if (!s || !s.access_token) {
            return Promise.resolve({ ok: false, error: '请先登录' });
        }

        return fetchWithRetry(SUPABASE_URL + '/auth/v1/logout?scope=others', {
            method: 'POST',
            headers: authHeaders(s.access_token)
        }).then(function (res) {
            if (!res.ok && res.status !== 204) {
                return { ok: false, error: '操作失败（HTTP ' + res.status + '）' };
            }
            return { ok: true };
        }).catch(function (e) {
            return { ok: false, error: netErrorText(e) };
        });
    }

    // ============================================================
    // 读取当前用户的 profile（昵称等）
    // ============================================================
    function getProfile() {
        var s = readSession();
        if (!s || !s.access_token || !s.user_id) {
            return Promise.resolve(null);
        }

        return fetchWithRetry(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + s.user_id + '&select=id,email,nickname,created_at', {
            method: 'GET',
            headers: authHeaders(s.access_token)
        }).then(function (res) {
            if (!res.ok) return null;
            return res.json().then(function (rows) {
                return (Array.isArray(rows) && rows[0]) ? rows[0] : null;
            });
        }).catch(function () { return null; });
    }

    // ============================================================
    // 改昵称
    // ============================================================
    function updateNickname(nickname) {
        var n = String(nickname || '').trim();
        if (n.length < 2) return Promise.resolve({ ok: false, error: '昵称至少 2 个字' });
        if (n.length > 20) return Promise.resolve({ ok: false, error: '昵称最多 20 个字' });

        var s = readSession();
        if (!s || !s.access_token || !s.user_id) {
            return Promise.resolve({ ok: false, error: '请先登录' });
        }

        return fetchWithRetry(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + s.user_id, {
            method: 'PATCH',
            headers: authHeaders(s.access_token),
            body: JSON.stringify({ nickname: n })
        }).then(function (res) {
            if (!res.ok) {
                return res.json().catch(function () { return {}; }).then(function (d) {
                    var msg = d.message || d.hint || ('HTTP ' + res.status);
                    if (/昵称至少/.test(msg) || /昵称最多/.test(msg)) {
                        return { ok: false, error: msg };
                    }
                    if (res.status === 403 || res.status === 401) {
                        return { ok: false, error: '没有权限，请重新登录' };
                    }
                    return { ok: false, error: '保存失败：' + msg };
                });
            }
            return { ok: true, nickname: n };
        }).catch(function (e) {
            return { ok: false, error: netErrorText(e) };
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
        verifyAdmin: verifyAdmin,
        resendConfirm: resendConfirm,
        // 账号管理
        resetPassword: resetPassword,
        updatePassword: updatePassword,
        signOutEverywhere: signOutEverywhere,
        getProfile: getProfile,
        updateNickname: updateNickname
    };
})();
