// ============================================
// data.js — 工具/公告数据加载（从 Supabase 读取，localStorage 缓存兜底）
// ============================================

// 从 Supabase 加载工具列表
function loadTools() {
    if (typeof fetchTools !== 'function') {
        console.warn('supabase.js not loaded');
        return Promise.resolve([]);
    }
    App.state.loading = true;
    return fetchTools().then(function(data) {
        App.state.tools = data;
        // 缓存到 localStorage 供离线使用
        try { localStorage.setItem(App.constants.CACHE_KEY, JSON.stringify(data)); } catch(e) {}
        App.state.loading = false;
        return data;
    }).catch(function(e) {
        console.warn('Supabase 不可用，尝试本地缓存:', e);
        App.state.loading = false;
        // 离线兜底：读 localStorage 缓存
        try {
            var cached = localStorage.getItem(App.constants.CACHE_KEY);
            if (cached) { App.state.tools = JSON.parse(cached); return App.state.tools; }
        } catch(e2) {}
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
