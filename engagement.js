// ============================================
// engagement.js — 用户互动：收藏 + 浏览历史
// ============================================
(function() {
    'use strict';

    var FAV_KEY = 'ruantui_favorites';
    var HISTORY_KEY = 'ruantui_history';
    var MAX_HISTORY = 12;

    // ---------- 收藏管理 ----------
    // 设计原则：本地优先，登录后自动上云
    //   · 未登录 / 云端不可用 → 完全走 localStorage（行为跟以前一模一样，不会因为
    //     数据库没建好就坏掉）
    //   · 已登录 → 收藏写入数据库，并同步一份到本地作为离线缓存
    //   · 首次登录 → 把本地已有的收藏合并上传，用户换设备不会丢之前的收藏
    function getFavorites() {
        try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch(e) { return []; }
    }
    function isFavorited(id) {
        return getFavorites().indexOf(id) >= 0;
    }

    // 云端可用性标记：探测一次失败就不再反复尝试，避免拖慢页面
    var cloudState = 'unknown'; // unknown | ok | unavailable
    var cloudPending = null;    // 合并中的 Promise，避免重复触发

    function authToken() {
        return (window.Auth && window.Auth.getAccessToken) ? window.Auth.getAccessToken() : Promise.resolve(null);
    }
    function loggedIn() {
        return !!(window.Auth && window.Auth.isLoggedIn && window.Auth.isLoggedIn());
    }

    // 取当前登录用户的 id（auth.js 的 session 里存的是 user_id）
    function currentUserId() {
        try {
            var raw = localStorage.getItem('ruantui_admin_session');
            if (!raw) return null;
            var s = JSON.parse(raw);
            return (s && (s.user_id || s.userId)) || null;
        } catch(e) { return null; }
    }

    // 直接打 Supabase REST；失败返回 null，不抛异常
    // 复用 supabase.js 暴露的配置，避免重复硬编码 URL/KEY
    function cloudFetch(path, opts) {
        return authToken().then(function(token) {
            if (!token) return null;
            var cfg = window.RuantuiSupabase || {};
            var base = cfg.url;
            var key = cfg.key;
            if (!base || !key) return null;
            var o = opts || {};
            var headers = {
                'apikey': key,
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            };
            if (o.prefer) headers['Prefer'] = o.prefer;

            // 写 favorites 时补上 user_id。
            // 数据库侧已给 user_id 设了 default auth.uid()，这里再显式传一次是双保险，
            // 避免个别环境下默认值没生效导致 403。
            var body = o.body;
            if (body && typeof body === 'object' && !Array.isArray(body) && path.indexOf('/favorites') === 0) {
                if (!body.user_id) {
                    var uid = currentUserId();
                    if (uid) body = Object.assign({}, body, { user_id: uid });
                }
            }

            return fetch(base + '/rest/v1' + path, {
                method: o.method || 'GET',
                headers: headers,
                body: body ? JSON.stringify(body) : undefined
            }).then(function(res) {
                if (res.status === 404 || res.status === 400) {
                    // 表不存在或字段不匹配 → 云端功能不可用，安静降级到本地
                    cloudState = 'unavailable';
                    return null;
                }
                if (res.status === 401 || res.status === 403) {
                    // 权限问题（多为 RLS 未配置好）→ 降级到本地，不影响使用
                    cloudState = 'unavailable';
                    return null;
                }
                if (!res.ok) return null;
                var ct = res.headers.get('content-type') || '';
                if (ct.indexOf('json') < 0) return null;
                return res.json();
            }).catch(function() { return null; });
        });
    }

    // 拉取云端收藏 id 列表
    function fetchCloudFavorites() {
        return cloudFetch('/favorites?select=tool_id&order=created_at.desc').then(function(rows) {
            if (!Array.isArray(rows)) return null;
            cloudState = 'ok';
            return rows.map(function(r) { return r.tool_id; });
        });
    }

    // 把本地收藏合并到云端（只在首次登录时做一次）
    function mergeLocalToCloud(cloudIds) {
        var local = getFavorites();
        var merged = cloudIds.slice();
        var toUpload = [];
        local.forEach(function(id) {
            if (merged.indexOf(id) < 0) { merged.push(id); toUpload.push(id); }
        });
        if (!toUpload.length) return Promise.resolve(merged);

        // 逐条 upsert，忽略唯一约束冲突
        var chain = Promise.resolve();
        toUpload.forEach(function(id) {
            chain = chain.then(function() {
                return cloudFetch('/favorites?on_conflict=user_id,tool_id', {
                    method: 'POST',
                    prefer: 'resolution=ignore-duplicates,return=minimal',
                    body: { tool_id: id }
                });
            });
        });
        return chain.then(function() {
            // 合并结果写回本地，保证两边一致
            try { localStorage.setItem(FAV_KEY, JSON.stringify(merged)); } catch(e) {}
            return merged;
        });
    }

    // 登录后调用：拉云端 + 合并本地
    function syncFavorites() {
        if (!loggedIn()) return Promise.resolve(null);
        if (cloudState === 'unavailable') return Promise.resolve(null);
        if (cloudPending) return cloudPending;

        cloudPending = fetchCloudFavorites().then(function(cloudIds) {
            if (!cloudIds) return null;
            return mergeLocalToCloud(cloudIds);
        }).then(function(result) {
            cloudPending = null;
            if (result) refreshFavUI();
            return result;
        }).catch(function() {
            cloudPending = null;
            return null;
        });
        return cloudPending;
    }
    window.syncFavorites = syncFavorites;

    // 统一的收藏/取消入口
    function toggleFavorite(id) {
        var favs = getFavorites();
        var idx = favs.indexOf(id);
        var adding = idx < 0;
        if (adding) favs.push(id); else favs.splice(idx, 1);
        try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch(e) {}

        // 已登录则同步到云端；失败不影响本地状态
        if (loggedIn() && cloudState !== 'unavailable') {
            if (adding) {
                cloudFetch('/favorites?on_conflict=user_id,tool_id', {
                    method: 'POST',
                    prefer: 'resolution=ignore-duplicates,return=minimal',
                    body: { tool_id: id }
                }).then(function(r) { if (r !== null) cloudState = 'ok'; });
            } else {
                cloudFetch('/favorites?tool_id=eq.' + id, { method: 'DELETE', prefer: 'return=minimal' });
            }
        }

        showToast(adding ? '已收藏 ❤' : '已取消收藏', adding ? 'success' : 'info');
        return adding;
    }

    // 云同步后刷新界面上的收藏状态（角标、筛选、卡片心形）
    function refreshFavUI() {
        var favs = getFavorites();
        document.querySelectorAll('.card-fav-btn').forEach(function(btn) {
            var id = parseInt(btn.dataset.favId);
            var on = favs.indexOf(id) >= 0;
            btn.classList.toggle('active', on);
            var icon = btn.querySelector('i');
            if (icon) icon.className = (on ? 'fas' : 'far') + ' fa-heart';
            btn.setAttribute('aria-label', on ? '取消收藏' : '收藏');
        });
        document.querySelectorAll('[data-fav-id]').forEach(function(btn) {
            var id = parseInt(btn.dataset.favId);
            var on = favs.indexOf(id) >= 0;
            btn.classList.toggle('active', on);
            var icon = btn.querySelector('i');
            if (icon) icon.className = (on ? 'fas' : 'far') + ' fa-heart';
        });
        if (typeof window.updateFavCount === 'function') window.updateFavCount(favs.length);
        if (typeof window.renderTools === 'function' && document.querySelector('.filter-tag.active[data-fav]')) {
            // 正在看「收藏」筛选时，列表要跟着变
            window.renderTools();
        }
    }

    // ---------- 浏览历史 ----------
    function getHistory() {
        try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch(e) { return []; }
    }
    function addToHistory(id) {
        var hist = getHistory().filter(function(x) { return x !== id; });
        hist.unshift(id);
        if (hist.length > MAX_HISTORY) hist = hist.slice(0, MAX_HISTORY);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(hist)); } catch(e) {}
    }

    // ---------- 页面加载时：已登录则自动同步 ----------
    // 放在末尾统一触发一次，避免与其他模块初始化争抢。
    function autoSyncOnLoad() {
        if (!loggedIn()) return;
        // 稍等片刻，等 supabase.js 拉完工具列表、卡片渲染出来再刷新 UI
        setTimeout(function() { syncFavorites(); }, 1200);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoSyncOnLoad);
    } else {
        autoSyncOnLoad();
    }

    // ---------- 渲染收藏按钮 ----------
    window.renderFavButton = function(toolId) {
        var fav = isFavorited(toolId);
        return '<button class="fav-btn ' + (fav ? 'active' : '') + '" data-fav-id="' + toolId + '" aria-label="' + (fav ? '取消收藏' : '收藏') + '" title="' + (fav ? '取消收藏' : '收藏') + '"><i class="' + (fav ? 'fas' : 'far') + ' fa-heart"></i></button>';
    };

    // ---------- 在卡片上添加收藏按钮 ----------
    // 注：ui.js 渲染卡片时已经把按钮写进 HTML 了（避免依赖事后注入导致空白）。
    // 这里只做兜底：给还没按钮的卡片补一个，并且只同步一下状态。
    function injectFavButtons() {
        var cards = document.querySelectorAll('.tool-card:not(.fav-injected)');
        cards.forEach(function(card) {
            var id = parseInt(card.dataset.id);
            if (!id) return;
            card.classList.add('fav-injected');

            // 已经有按钮（ui.js 渲染的）就只更新状态，不要重复追加
            var existing = card.querySelector('.card-fav-btn');
            if (existing) {
                syncFavBtnState(existing, id);
                return;
            }

            var favBtn = document.createElement('button');
            favBtn.className = 'card-fav-btn ' + (isFavorited(id) ? 'active' : '');
            favBtn.innerHTML = '<i class="' + (isFavorited(id) ? 'fas' : 'far') + ' fa-heart"></i>';
            favBtn.setAttribute('aria-label', isFavorited(id) ? '取消收藏' : '收藏');
            favBtn.title = isFavorited(id) ? '取消收藏' : '收藏';
            favBtn.dataset.favId = id;
            card.appendChild(favBtn);
        });
    }

    // 统一同步一个收藏按钮的视觉状态
    function syncFavBtnState(btn, id) {
        var on = isFavorited(id);
        btn.classList.toggle('active', on);
        var icon = btn.querySelector('i');
        if (icon) icon.className = (on ? 'fas' : 'far') + ' fa-heart';
        btn.setAttribute('aria-label', on ? '取消收藏' : '收藏');
        btn.title = on ? '取消收藏' : '收藏';
        btn.dataset.favId = id;
    }

    // 监听收藏点击
    document.addEventListener('click', function(e) {
        var favBtn = e.target.closest('.card-fav-btn, [data-fav-id]');
        if (!favBtn) return;
        e.stopPropagation();
        e.preventDefault();
        var id = parseInt(favBtn.dataset.favId);
        var nowFav = toggleFavorite(id);
        var icon = favBtn.querySelector('i');
        if (icon) {
            icon.className = nowFav ? 'fas fa-heart' : 'far fa-heart';
        }
        favBtn.classList.toggle('active', nowFav);
        // 心形飞溅动画
        if (nowFav) {
            var rect = favBtn.getBoundingClientRect();
            var heart = document.createElement('span');
            heart.textContent = '❤';
            heart.style.cssText = 'position:fixed;left:' + (rect.left + rect.width/2) + 'px;top:' + (rect.top + rect.height/2) + 'px;font-size:20px;color:#ef4444;pointer-events:none;z-index:10000;animation:heartFly .8s ease-out forwards;';
            document.body.appendChild(heart);
            setTimeout(function() { heart.remove(); }, 900);
        }
    });

    // ---------- 添加收藏筛选标签 ----------
    function addFavoritesFilter() {
        var filterBar = document.querySelector('.filter-bar');
        if (!filterBar || filterBar.querySelector('[data-filter="__favorites__"]')) return;
        var favCount = getFavorites().length;
        var btn = document.createElement('button');
        btn.className = 'filter-tag filter-fav';
        btn.dataset.filter = '__favorites__';
        btn.innerHTML = '<span><i class="fas fa-heart" style="color:#ef4444;"></i> 收藏</span> <em class="filter-count">' + favCount + '</em>';
        filterBar.appendChild(btn);
    }

    // 处理收藏筛选
    var origRenderTools = window.renderTools;
    if (origRenderTools) {
        // 在 rebuildCategories 后注入收藏筛选
        var origRebuild = window.rebuildCategories;
        window.rebuildCategories = function() {
            if (origRebuild) origRebuild();
            addFavoritesFilter();
        };
    }

    // 在渲染工具时过滤收藏
    var _origFilter = window.renderTools;
    if (_origFilter) {
        var _wrapped = function(filter) {
            if (filter === '__favorites__') {
                var favs = getFavorites();
                var origTools = App.state.tools;
                App.state.tools = origTools.filter(function(t) { return favs.indexOf(t.id) >= 0; });
                _origFilter('all');
                App.state.tools = origTools;
                return;
            }
            _origFilter(filter);
        };
        window.renderTools = _wrapped;
    }

    // ---------- 详情弹窗：记录浏览历史 ----------
    var origOpenModal = window.openModal;
    if (origOpenModal) {
        window.openModal = function(tool) {
            origOpenModal(tool);
            if (tool) addToHistory(tool.id);
        };
    }

    // ---------- 注入收藏按钮到卡片 ----------
    var observer = new MutationObserver(function() {
        injectFavButtons();
    });
    var toolGrid = document.getElementById('toolGrid');
    if (toolGrid) {
        observer.observe(toolGrid, { childList: true });
    }

    // 注入心形飞溅动画
    var style = document.createElement('style');
    style.textContent = '@keyframes heartFly{0%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(-50%,-180%) scale(2);opacity:0}}';
    document.head.appendChild(style);

    // ---------- 收藏按钮 CSS ----------
    // .card-fav-btn 的完整样式在 style.css 里（含默认隐藏、悬停淡入、
    // 触屏常显的处理）。这里只补充动画，不要重复定义布局，
    // 否则两处会互相覆盖，改起来容易漏。
    var favStyle = document.createElement('style');
    favStyle.textContent = [
        '.card-fav-btn.active i{animation:heartBeat .6s ease;}',
        '@keyframes heartBeat{0%,100%{transform:scale(1)}25%{transform:scale(1.3)}50%{transform:scale(.9)}75%{transform:scale(1.15)}}',
        '.filter-fav .filter-count{color:#ef4444;}'
    ].join('');
    document.head.appendChild(favStyle);

    // ---------- 导出给 ui.js 用 ----------
    // ui.js 渲染卡片时要判断「这个工具是否已收藏」来决定红心是实心还是空心，
    // 但它在另一个 IIFE 里，必须挂到 window 才能访问。
    window.isFavorited = isFavorited;
    window.toggleFavorite = toggleFavorite;
})();
