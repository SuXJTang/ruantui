// ============================================
// supabase.js — 云端数据存储
// ============================================
var SUPABASE_URL = 'https://gxlykcseepskxccdxmxc.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bHlrY3NlZXBza3hjY2R4bXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MDA2MjksImV4cCI6MjA5NTE3NjYyOX0.oc8MKQ56zk585KgKPXXah_fsLzC5VZqHihOsCWH_zhE';

function supabaseQuery(method, path, body) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, SUPABASE_URL + '/rest/v1/' + path, false);
    xhr.setRequestHeader('apikey', SUPABASE_KEY);
    xhr.setRequestHeader('Authorization', 'Bearer ' + SUPABASE_KEY);
    if (method === 'POST' || method === 'PATCH') {
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Prefer', 'return=minimal');
    }
    xhr.send(body ? JSON.stringify(body) : null);
    return xhr;
}

function loadCloudData() {
    try {
        var xhr = supabaseQuery('GET', 'toolbox_data?id=eq.mytoolbox&select=data');
        if (xhr.status === 200 && xhr.responseText) {
            var rows = JSON.parse(xhr.responseText);
            if (rows && rows.length > 0 && rows[0].data) return rows[0].data;
        }
        if (xhr.status === 401) console.log('Supabase: 检查 API Key 是否正确');
    } catch(e) { console.log('Supabase read error:', e); }
    return null;
}

// 异步从云端拉取最新数据
function syncFromCloud(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', SUPABASE_URL + '/rest/v1/toolbox_data?id=eq.mytoolbox&select=data', true);
    xhr.setRequestHeader('apikey', SUPABASE_KEY);
    xhr.setRequestHeader('Authorization', 'Bearer ' + SUPABASE_KEY);
    xhr.onload = function() {
        if (xhr.status === 200 && xhr.responseText) {
            try {
                var rows = JSON.parse(xhr.responseText);
                if (rows && rows.length > 0 && rows[0].data) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows[0].data));
                    if (callback) callback(rows[0].data);
                }
            } catch(e) {}
        }
    };
    xhr.send();
}

function saveCloudData(data) {
    try {
        // Try update first
        var xhr = supabaseQuery('PATCH', 'toolbox_data?id=eq.mytoolbox', { data: data, updated_at: new Date().toISOString() });
        if (xhr.status === 204 || xhr.status === 200) return true;
        // If no row, insert
        if (xhr.status === 404 || xhr.status === 0) {
            xhr = supabaseQuery('POST', 'toolbox_data', { id: 'mytoolbox', data: data, updated_at: new Date().toISOString() });
            return xhr.status === 201 || xhr.status === 200;
        }
        return false;
    } catch(e) { console.log('Supabase write error:', e); return false; }
}
