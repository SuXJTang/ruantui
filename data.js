// ============================================
// data.js — 工具数据（从 Supabase 加载，localStorage 缓存兜底）
// ============================================
var tools = [];
var currentFilter = 'all';
var currentSearch = '';
var loading = false;
var CACHE_KEY = 'mytoolbox_cache';

// 从 Supabase 加载工具列表
function loadTools() {
    if (typeof fetchTools !== 'function') {
        console.warn('supabase.js not loaded');
        return Promise.resolve([]);
    }
    loading = true;
    return fetchTools().then(function(data) {
        tools = data;
        // 缓存到 localStorage 供离线使用
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch(e) {}
        loading = false;
        return data;
    }).catch(function(e) {
        console.warn('Supabase 不可用，尝试本地缓存:', e);
        loading = false;
        // 离线兜底：读 localStorage 缓存
        try {
            var cached = localStorage.getItem(CACHE_KEY);
            if (cached) { tools = JSON.parse(cached); return tools; }
        } catch(e2) {}
        tools = [];
        return [];
    });
}

function refreshTools() {
    return loadTools().then(function() {
        rebuildCategories();
        renderTools(currentFilter);
    });
}

// ============================================
// 公告数据
// ============================================
var announcements = [];
var ANNOUNCEMENT_CACHE_KEY = 'ruantui_announcements';

function loadAnnouncements() {
    if (typeof fetchAnnouncements !== 'function') return Promise.resolve([]);
    return fetchAnnouncements().then(function(data) {
        announcements = data;
        try { localStorage.setItem(ANNOUNCEMENT_CACHE_KEY, JSON.stringify(data)); } catch(e) {}
        return data;
    }).catch(function(e) {
        console.warn('公告加载失败，使用缓存:', e);
        try {
            var cached = localStorage.getItem(ANNOUNCEMENT_CACHE_KEY);
            if (cached) { announcements = JSON.parse(cached); return announcements; }
        } catch(e2) {}
        announcements = [];
        return [];
    });
}
