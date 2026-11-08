// ============================================
// data.js — 工具/公告数据加载
// 数据来源优先级：Supabase（唯一真实来源）→ 本机 localStorage 缓存（仅离线兜底）
// ============================================
//
// 【重要】本文件不存放任何内置工具数据。
//
// 历史教训（v3.1.2 修复）：早期版本这里有一份 40 条的 FALLBACK_TOOLS「兜底数据」，
// 其中 30 条是从未真实推荐过的编造内容（与数据库里的真实数据只有 10 条重合）。
// 后果是：一旦 Supabase 不可用（例如免费版项目闲置被自动暂停），页面不会报错，
// 而是静默显示这 40 条假数据 —— 故障被伪装成「正常」，站长长期以为站点没问题，
// 直到有人发现工具数量不对。
//
// 现在改为：**失败就明确显示失败**。
//   1. Supabase 返回数据 → 正常渲染，并写入本地缓存
//   2. Supabase 失败但有本地缓存 → 用缓存渲染，并显示「离线数据」提示
//   3. 彻底失败 → 显示明确的错误提示 + 重试按钮，绝不伪造数据
//
// 如果你确实想要一份「构建期静态数据」，正确做法是用管理面板的「导出」按钮
// 把真实数据导出成 data 文件后单独引入 —— 但请不要伪装成兜底逻辑。

// 加载状态，供 ui.js 渲染不同界面
App.state.dataError = null;      // null = 正常；字符串 = 错误原因
App.state.usingCache = false;    // true = 当前展示的是本地缓存

// 从 Supabase 加载工具列表
// attempt: 当前第几次尝试（从 0 开始）。网络抖动时自动重试，最多 3 次。
function loadTools(attempt) {
    var tries = attempt || 0;
    App.state.dataError = null;
    App.state.usingCache = false;

    if (typeof fetchTools !== 'function') {
        App.state.dataError = '数据模块未正确加载';
        App.state.tools = [];
        return Promise.resolve([]);
    }

    App.state.loading = true;
    return fetchTools().then(function(data) {
        if (!data || !data.length) {
            // 请求成功但结果是空的：数据库里确实没有数据（或 RLS 策略把行过滤掉了），
            // 这也是一种需要被看见的状态，不能拿假数据填充。
            App.state.dataError = 'empty';
            App.state.tools = [];
        } else {
            App.state.tools = data;
            try { localStorage.setItem(App.constants.CACHE_KEY, JSON.stringify(data)); } catch(e) {}
        }
        App.state.loading = false;
        return App.state.tools;
    }).catch(function(e) {
        console.warn('Supabase 加载失败（第 ' + (tries + 1) + ' 次）:', e);

        // 网络类错误自动重试：反代 + 直连都可能抖动，
        // 隔一会儿再试往往就好了，比直接甩「加载失败」体验好得多。
        var isNetwork = !e || !e.message || /Failed to fetch|NetworkError|timeout|Load failed|abort/i.test(e.message) || /NetworkError/i.test(String(e));
        if (isNetwork && tries < 2) {
            var delay = 600 * Math.pow(2, tries);   // 600ms, 1200ms
            return new Promise(function(resolve) { setTimeout(resolve, delay); })
                .then(function() { return loadTools(tries + 1); });
        }

        App.state.loading = false;

        // 仅作离线兜底：用本机缓存渲染（缓存一定是真实数据写进去的）
        try {
            var cached = localStorage.getItem(App.constants.CACHE_KEY);
            if (cached) {
                var parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length) {
                    App.state.tools = parsed;
                    App.state.usingCache = true;
                    App.state.dataError = 'offline';
                    return parsed;
                }
            }
        } catch(e2) {}

        App.state.dataError = 'failed';
        App.state.tools = [];
        return [];
    });
}

function refreshTools() {
    return loadTools().then(function() {
        rebuildCategories();
        renderTools(App.state.currentFilter);
    });
}

// ============================================
// 公告数据
// ============================================

function loadAnnouncements() {
    if (typeof fetchAnnouncements !== 'function') return Promise.resolve([]);
    return fetchAnnouncements().then(function(data) {
        App.state.announcements = data;
        try { localStorage.setItem(App.constants.ANNOUNCEMENT_CACHE_KEY, JSON.stringify(data)); } catch(e) {}
        return data;
    }).catch(function(e) {
        console.warn('公告加载失败，使用缓存:', e);
        try {
            var cached = localStorage.getItem(App.constants.ANNOUNCEMENT_CACHE_KEY);
            if (cached) { App.state.announcements = JSON.parse(cached); return App.state.announcements; }
        } catch(e2) {}
        App.state.announcements = [];
        return [];
    });
}
