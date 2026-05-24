// ============================================
// data.js — 工具数据（从 Supabase 加载）
// ============================================
var tools = [];
var currentFilter = 'all';
var currentSearch = '';

// 从 Supabase 加载工具列表
function loadTools() {
    if (typeof fetchTools !== 'function') {
        console.warn('supabase.js not loaded');
        return Promise.resolve([]);
    }
    return fetchTools().then(function(data) {
        tools = data;
        return data;
    }).catch(function(e) {
        console.error('Failed to load tools:', e);
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
