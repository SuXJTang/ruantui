// ============================================
// analytics.js — 数据分析仪表盘
// 热门工具排行 + 点击统计 + 收藏概览 + 浏览历史
// ============================================
(function() {
    'use strict';

    var FAV_KEY = 'ruantui_favorites';
    var HISTORY_KEY = 'ruantui_history';
    var CLICKS_KEY = 'ruantui_clicks';
    var VISIT_KEY = 'ruantui_visits';

    // 记录访问
    function recordVisit() {
        try {
            var visits = JSON.parse(localStorage.getItem(VISIT_KEY) || '{}');
            var today = new Date().toISOString().split('T')[0];
            visits[today] = (visits[today] || 0) + 1;
            localStorage.setItem(VISIT_KEY, JSON.stringify(visits));
        } catch(e) {}
    }
    recordVisit();

    function getClicks() { try { return JSON.parse(localStorage.getItem(CLICKS_KEY) || '{}'); } catch(e) { return {}; } }
    function getFavorites() { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch(e) { return []; } }
    function getHistory() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch(e) { return []; } }
    function getVisits() { try { return JSON.parse(localStorage.getItem(VISIT_KEY) || '{}'); } catch(e) { return {}; } }

    // ============================================================
    // 账号信息卡（用户中心顶部）
    // ------------------------------------------------------------
    // 未登录 → 引导登录/注册
    // 已登录 → 邮箱、身份、VIP 到期时间、同步状态
    // ============================================================
    function buildAccountCard() {
        var loggedIn = !!(window.Auth && window.Auth.isLoggedIn());

        if (!loggedIn) {
            return '<div class="dash-card uc-account uc-guest">' +
                '<div class="uc-avatar uc-avatar-guest"><i class="fas fa-user"></i></div>' +
                '<div class="uc-info">' +
                  '<div class="uc-title">未登录</div>' +
                  '<div class="uc-sub">登录后可云端同步收藏、跨设备使用</div>' +
                '</div>' +
                '<button type="button" class="uc-action" id="ucLoginBtn">登录 / 注册</button>' +
                '</div>';
        }

        var u = (window.Auth.currentUser && window.Auth.currentUser()) || {};
        var admin = !!(App.state && App.state.isAdmin);
        var vipInfo = (App.state && App.state.vipInfo) || {};
        var isVip = !!vipInfo.isVip;

        var roleTag;
        if (admin) {
            roleTag = '<span class="uc-tag uc-tag-admin">管理员</span>';
        } else if (isVip) {
            roleTag = '<span class="uc-tag uc-tag-vip">👑 VIP</span>';
        } else {
            roleTag = '<span class="uc-tag uc-tag-normal">普通用户</span>';
        }

        var vipLine = '';
        if (isVip) {
            if (vipInfo.forever) {
                vipLine = '<div class="uc-vip-line">👑 VIP 永久有效</div>';
            } else if (vipInfo.until) {
                var d = new Date(vipInfo.until);
                var days = Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
                vipLine = '<div class="uc-vip-line">👑 有效期至 ' +
                    d.toLocaleDateString('zh-CN') + '（还剩 ' + days + ' 天）</div>';
            }
        } else if (!admin) {
            vipLine = '<div class="uc-vip-line uc-vip-none">还不是 VIP · <a href="javascript:void(0)" id="ucVipInfo">了解会员权益</a></div>';
        }

        var usingCache = !!(App.state && App.state.usingCache);
        var dataError = App.state ? App.state.dataError : null;
        var syncLine;
        if (dataError === 'offline' || usingCache) {
            syncLine = '<div class="uc-sync uc-sync-warn">⚠️ 当前显示本地缓存，网络恢复后自动同步</div>';
        } else if (dataError === 'failed') {
            syncLine = '<div class="uc-sync uc-sync-warn">⚠️ 数据加载失败，内容可能不是最新</div>';
        } else {
            syncLine = '<div class="uc-sync uc-sync-ok">✓ 收藏已云端同步</div>';
        }

        var initial = (u.email || '?').charAt(0).toUpperCase();

        return '<div class="dash-card uc-account' + (isVip ? ' uc-is-vip' : '') + '">' +
            '<div class="uc-avatar' + (isVip ? ' uc-avatar-vip' : '') + '">' + escHTML(initial) + '</div>' +
            '<div class="uc-info">' +
              '<div class="uc-title">' + escHTML(u.email || '已登录') + ' ' + roleTag + '</div>' +
              vipLine + syncLine +
            '</div>' +
            '<button type="button" class="uc-action uc-action-ghost" id="ucLogoutBtn">退出登录</button>' +
            '</div>';
    }

    // 构建仪表盘 HTML
    function buildDashboard() {
        var clicks = getClicks();
        var favs = getFavorites();
        var history = getHistory();
        var visits = getVisits();

        // 热门工具 Top 5
        var clickEntries = Object.keys(clicks).map(function(id) {
            var tool = (App.state.tools || []).find(function(t) { return t.id === parseInt(id); });
            return { id: parseInt(id), name: tool ? tool.name : '未知工具', clicks: clicks[id], category: tool ? tool.category : '' };
        }).sort(function(a, b) { return b.clicks - a.clicks; }).slice(0, 5);

        var maxClicks = clickEntries.length > 0 ? clickEntries[0].clicks : 1;

        var hotHTML = clickEntries.length > 0 ? clickEntries.map(function(item, idx) {
            var pct = (item.clicks / maxClicks * 100).toFixed(0);
            var medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][idx];
            return '<div class="dash-hot-item">' +
                '<span class="dash-hot-rank">' + medal + '</span>' +
                '<div class="dash-hot-info"><span class="dash-hot-name">' + escHTML(item.name) + '</span>' +
                '<div class="dash-hot-bar"><div class="dash-hot-fill" style="width:' + pct + '%"></div></div></div>' +
                '<span class="dash-hot-count">' + item.clicks + '</span></div>';
        }).join('') : '<div class="dash-empty">暂无点击数据</div>';

        // 最近浏览
        var histTools = history.slice(0, 6).map(function(id) {
            return (App.state.tools || []).find(function(t) { return t.id === id; });
        }).filter(Boolean);
        var histHTML = histTools.length > 0 ? histTools.map(function(t) {
            return '<div class="dash-hist-item" data-tool-id="' + t.id + '">' +
                '<div class="dash-hist-icon" style="background:' + safeColor(t.color) + '">' + renderIconHTML(t) + '</div>' +
                '<span class="dash-hist-name">' + escHTML(t.name) + '</span></div>';
        }).join('') : '<div class="dash-empty">暂无浏览记录</div>';

        // 收藏列表 —— 用户最关心的内容，放在最前面且不截断
        var favTools = favs.map(function(id) {
            return (App.state.tools || []).find(function(t) { return t.id === id; });
        }).filter(Boolean);
        var favHTML = favTools.length > 0 ? favTools.map(function(t) {
            return '<div class="dash-fav-item" data-tool-id="' + t.id + '">' +
                '<div class="dash-fav-icon" style="background:' + safeColor(t.color) + '">' + renderIconHTML(t) + '</div>' +
                '<span class="dash-fav-name">' + escHTML(t.name) + '</span></div>';
        }).join('') : '<div class="dash-empty">还没有收藏工具<br><span style="font-size:12px;opacity:.7">在工具卡片右上角点心形即可收藏</span></div>';

        // 访问统计
        var visitDays = Object.keys(visits).sort().reverse().slice(0, 7);
        var maxVisit = Math.max.apply(null, visitDays.map(function(d) { return visits[d]; }).concat([1]));
        var visitHTML = visitDays.reverse().map(function(day) {
            var pct = (visits[day] / maxVisit * 100).toFixed(0);
            var label = day.substring(5); // MM-DD
            return '<div class="dash-visit-day">' +
                '<div class="dash-visit-bar" style="height:' + pct + '%"></div>' +
                '<span class="dash-visit-label">' + label + '</span></div>';
        }).join('');

        var totalClicks = Object.values(clicks).reduce(function(a, b) { return a + b; }, 0);
        var totalVisits = Object.values(visits).reduce(function(a, b) { return a + b; }, 0);

        return '<div class="dash-grid">' +
            // 0. 账号信息（登录后第一眼看到自己是谁）
            buildAccountCard() +
            // 1. 我的收藏 —— 放最前，用户一眼看到
            '<div class="dash-card dash-fav-card"><h4>❤ 我的收藏' + (favTools.length ? ' (' + favTools.length + ')' : '') + '</h4><div class="dash-fav-list">' + favHTML + '</div></div>' +
            // 2. 统计卡片
            '<div class="dash-card dash-stats">' +
            '<div class="dash-stat-item"><i class="fas fa-eye"></i><div><strong>' + totalVisits + '</strong><span>本机访问</span></div></div>' +
            '<div class="dash-stat-item"><i class="fas fa-mouse-pointer"></i><div><strong>' + totalClicks + '</strong><span>本机点击</span></div></div>' +
            '<div class="dash-stat-item"><i class="fas fa-heart"></i><div><strong>' + favs.length + '</strong><span>收藏数</span></div></div>' +
            '<div class="dash-stat-item"><i class="fas fa-clock"></i><div><strong>' + history.length + '</strong><span>浏览记录</span></div></div>' +
            '</div>' +
            // 3. 最近浏览
            '<div class="dash-card"><h4>🕘 最近浏览</h4><div class="dash-hist-list">' + histHTML + '</div></div>' +
            // 4. 热门排行
            '<div class="dash-card"><h4>🔥 热门工具 Top 5</h4><div class="dash-hot-list">' + hotHTML + '</div></div>' +
            // 5. 访问趋势（最不关键，放最后）
            '<div class="dash-card"><h4>📊 近 7 天访问</h4><div class="dash-visit-chart">' + visitHTML + '</div></div>' +
            '</div>';
    }

    // 创建仪表盘弹窗
    var dashOverlay = null;
    function openDashboard() {
        if (!dashOverlay) {
            dashOverlay = document.createElement('div');
            dashOverlay.className = 'overlay dash-overlay';
            dashOverlay.innerHTML = '<div class="modal modal-lg" role="dialog">' +
                '<button class="modal-close dash-close"><i class="fas fa-times"></i></button>' +
                '<div class="modal-body"><div class="dash-header"><h2>👤 我的</h2><p class="dash-subtitle">账号、会员与收藏</p></div>' +
                '<div id="dashContent"></div></div></div>';
            document.body.appendChild(dashOverlay);
            dashOverlay.querySelector('.dash-close').onclick = closeDashboard;
            dashOverlay.onclick = function(e) { if (!e.target.closest('.modal')) closeDashboard(); };
        }
        document.getElementById('dashContent').innerHTML = buildDashboard();
        dashOverlay.classList.add('active');
        dashOverlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        // 账号卡按钮
        var loginBtn = document.getElementById('ucLoginBtn');
        if (loginBtn) {
            loginBtn.onclick = function () {
                closeDashboard();
                setTimeout(function () {
                    if (typeof window.showAuthBox === 'function') window.showAuthBox('login');
                    else if (typeof window.showLoginBox === 'function') window.showLoginBox();
                }, 250);
            };
        }

        var logoutBtn = document.getElementById('ucLogoutBtn');
        if (logoutBtn) {
            logoutBtn.onclick = function () {
                if (!confirm('确定退出登录？')) return;
                if (window.logoutAdmin) window.logoutAdmin();
                closeDashboard();
            };
        }

        var vipInfoLink = document.getElementById('ucVipInfo');
        if (vipInfoLink) {
            vipInfoLink.onclick = function () {
                closeDashboard();
                setTimeout(function () {
                    if (typeof showVipRequiredTip === 'function') showVipRequiredTip();
                }, 250);
            };
        }

        // 点击历史/收藏项打开详情
        dashOverlay.querySelectorAll('[data-tool-id]').forEach(function(el) {
            el.onclick = function() {
                var id = parseInt(this.dataset.toolId);
                var tool = (App.state.tools || []).find(function(t) { return t.id === id; });
                if (tool) {
                    closeDashboard();
                    setTimeout(function() { openModal(tool); }, 300);
                }
            };
        });
    }
    function closeDashboard() {
        if (dashOverlay) { dashOverlay.classList.remove('active'); dashOverlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
    }

    // 浮动按钮
    var dashBtn = document.createElement('button');
    dashBtn.className = 'dash-fab';
    dashBtn.innerHTML = '<i class="fas fa-chart-bar"></i>';
    dashBtn.setAttribute('aria-label', '数据中心');
    dashBtn.title = '数据中心';
    dashBtn.onclick = openDashboard;
    document.body.appendChild(dashBtn);

    // 注入样式
    var style = document.createElement('style');
    style.textContent = [
        '.dash-fab{position:fixed;bottom:24px;left:24px;z-index:9990;width:44px;height:44px;border-radius:50%;border:1px solid var(--border);background:var(--card);color:var(--primary);font-size:16px;cursor:pointer;box-shadow:var(--shadow-md);display:flex;align-items:center;justify-content:center;transition:all .3s;backdrop-filter:blur(12px);}',
        '.dash-fab:hover{transform:translateY(-3px) scale(1.05);box-shadow:0 8px 24px rgba(var(--primary-rgb),0.2);border-color:var(--primary);}',
        '.dash-header{text-align:center;margin-bottom:20px;}',
        '.dash-header h2{font-size:20px;font-weight:800;}',
        '.dash-subtitle{font-size:12px;color:var(--text-light);margin-top:4px;}',
        // 弹窗内容多时要能滚动，否则「我的收藏」会被挤出可视区
        '.dash-overlay .modal-body{max-height:78vh;overflow-y:auto;overscroll-behavior:contain;}',
        '.dash-grid{display:grid;grid-template-columns:1fr;gap:16px;}',
        // 收藏卡片置顶并做视觉强调
        '.dash-fav-card{border-color:rgba(239,68,68,0.28);background:rgba(239,68,68,0.04);}',
        '.dash-fav-card h4{color:#ef4444;}',
        '.dash-fav-card .dash-fav-list{max-height:none;}',
        '.dash-card{background:rgba(128,128,128,0.03);border:1px solid var(--border);border-radius:12px;padding:16px;}',
        '.dash-card h4{font-size:13px;font-weight:700;margin-bottom:12px;color:var(--text);}',
        '.dash-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}',
        '.dash-stat-item{display:flex;align-items:center;gap:8px;}',
        '.dash-stat-item i{font-size:18px;color:var(--primary);}',
        '.dash-stat-item strong{display:block;font-size:18px;font-weight:800;}',
        '.dash-stat-item span{font-size:11px;color:var(--text-light);}',
        '.dash-hot-item{display:flex;align-items:center;gap:10px;margin-bottom:10px;}',
        '.dash-hot-rank{font-size:18px;width:24px;text-align:center;}',
        '.dash-hot-info{flex:1;}',
        '.dash-hot-name{font-size:13px;font-weight:600;display:block;margin-bottom:4px;}',
        '.dash-hot-bar{height:6px;background:rgba(128,128,128,0.08);border-radius:3px;overflow:hidden;}',
        '.dash-hot-fill{height:100%;background:linear-gradient(90deg,var(--primary),var(--accent));border-radius:3px;transition:width .5s ease;}',
        '.dash-hot-count{font-size:13px;font-weight:700;color:var(--primary);min-width:30px;text-align:right;}',
        '.dash-visit-chart{display:flex;align-items:flex-end;gap:8px;height:80px;}',
        '.dash-visit-day{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end;}',
        '.dash-visit-bar{width:100%;max-width:30px;background:linear-gradient(180deg,var(--primary),var(--accent));border-radius:4px 4px 0 0;min-height:4px;transition:height .5s ease;}',
        '.dash-visit-label{font-size:10px;color:var(--text-light);}',
        '.dash-hist-list,.dash-fav-list{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}',
        '.dash-hist-item,.dash-fav-item{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px;border-radius:10px;background:rgba(128,128,128,0.04);cursor:pointer;transition:all .2s;}',
        '.dash-hist-item:hover,.dash-fav-item:hover{background:rgba(var(--primary-rgb),0.08);transform:translateY(-2px);}',
        '.dash-hist-icon,.dash-fav-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;}',
        '.dash-hist-icon img,.dash-fav-icon img{width:18px;height:18px;}',
        '.dash-hist-icon i,.dash-fav-icon i{font-size:16px;color:#fff;}',
        '.dash-hist-name,.dash-fav-name{font-size:11px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}',
        '.dash-empty{text-align:center;padding:20px;color:var(--text-light);font-size:12px;}',
        '@media(max-width:480px){.dash-stats{grid-template-columns:repeat(2,1fr);}.dash-hist-list,.dash-fav-list{grid-template-columns:repeat(2,1fr);}}'
    ].join('');
    document.head.appendChild(style);
})();
