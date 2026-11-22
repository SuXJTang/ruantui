/* ================================================================
   工具对比（v9）
   ----------------------------------------------------------------
   选 2~3 个工具并排看参数。纯前端：只依赖 App.state.tools，
   不新增后端表，不改数据库结构。
   状态存 localStorage，可分享（?cmp=id1,id2）。
   ================================================================ */
(function () {
    'use strict';

    var MAX = 3;
    var KEY = 'ruantui_compare_v1';
    var ids = [];
    var bar = null, panel = null, toastEl = null;

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }
    function tools() {
        return (window.App && App.state && App.state.tools) || [];
    }
    function byId(id) {
        var list = tools(), i;
        for (i = 0; i < list.length; i++) if (String(list[i].id) === String(id)) return list[i];
        return null;
    }
    function fmt(n) {
        if (typeof formatCount === 'function') return formatCount(n);
        n = Number(n) || 0;
        return n >= 10000 ? (n / 10000).toFixed(1) + 'w' : String(n);
    }

    /* ---------- 状态 ---------- */
    function load() {
        var fromUrl = new URL(location.href).searchParams.get('cmp');
        if (fromUrl) {
            var arr = fromUrl.split(',').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, MAX);
            if (arr.length) { ids = arr; save(); return; }
        }
        try {
            var raw = JSON.parse(localStorage.getItem(KEY) || '[]');
            ids = Array.isArray(raw) ? raw.map(String).slice(0, MAX) : [];
        } catch (e) { ids = []; }
    }
    function save() {
        try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch (e) { }
    }
    function has(id) { return ids.indexOf(String(id)) !== -1; }

    function toggle(id) {
        id = String(id);
        var i = ids.indexOf(id);
        if (i >= 0) ids.splice(i, 1);
        else {
            if (ids.length >= MAX) { toast('最多对比 ' + MAX + ' 个工具'); return; }
            ids.push(id);
        }
        save(); syncCards(); renderBar();
    }

    /* ---------- 提示 ---------- */
    function toast(msg) {
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.className = 'cmp-toast';
            document.body.appendChild(toastEl);
        }
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        clearTimeout(toastEl._t);
        toastEl._t = setTimeout(function () { toastEl.classList.remove('show'); }, 2000);
    }

    /* ---------- 卡片上的按钮状态 ---------- */
    function syncCards() {
        var cards = document.querySelectorAll('.tool-card');
        for (var i = 0; i < cards.length; i++) {
            var btn = cards[i].querySelector('.card-cmp-btn');
            if (!btn) continue;
            var on = has(btn.getAttribute('data-cmp-id'));
            btn.classList.toggle('active', on);
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
            btn.title = on ? '移出对比' : '加入对比';
        }
    }

    /* ---------- 底部对比栏 ---------- */
    function renderBar() {
        if (!ids.length) {
            if (bar) bar.classList.remove('show');
            return;
        }
        if (!bar) {
            bar = document.createElement('div');
            bar.className = 'cmp-bar';
            bar.innerHTML =
                '<div class="cmp-thumbs"></div>' +
                '<div class="cmp-bar-actions">' +
                '<button type="button" class="cmp-clear" title="清空对比">清空</button>' +
                '<button type="button" class="cmp-go"' + (ids.length < 2 ? ' disabled' : '') + '>' +
                '开始对比' + (ids.length < 2 ? '（至少 2 个）' : '') + '</button>' +
                '</div>';
            document.body.appendChild(bar);
            bar.querySelector('.cmp-clear').addEventListener('click', function () {
                ids = []; save(); syncCards(); renderBar();
            });
            bar.querySelector('.cmp-go').addEventListener('click', function () {
                if (ids.length >= 2) openPanel();
            });
        }
        var thumbs = bar.querySelector('.cmp-thumbs');
        thumbs.innerHTML = ids.map(function (id) {
            var t = byId(id);
            if (!t) return '';
            var icon = (typeof renderIconHTML === 'function') ? renderIconHTML(t, { eager: false }) : '';
            return '<button type="button" class="cmp-thumb" data-rm="' + esc(t.id) + '" title="移出 ' + esc(t.name) + '">' +
                '<span class="cmp-thumb-icon" style="background:' + esc(t.color || '#eee') + '">' + icon + '</span>' +
                '<span class="cmp-thumb-name">' + esc(t.name) + '</span>' +
                '<i class="fas fa-xmark cmp-thumb-x"></i>' +
                '</button>';
        }).join('');
        var go = bar.querySelector('.cmp-go');
        go.disabled = ids.length < 2;
        go.textContent = ids.length < 2 ? '开始对比（至少 2 个）' : '开始对比 ' + ids.length + ' 个';
        bar.classList.add('show');
    }

    /* ---------- 对比面板 ---------- */
    var ROWS = [
        { key: '__name', label: '工具' },
        { key: 'category', label: '分类' },
        { key: 'rating', label: '评分' },
        { key: 'downloads', label: '下载' },
        { key: 'tier', label: '下载权限' },
        { key: 'tags', label: '标签' },
        { key: 'comment', label: '一句话' },
        { key: 'usage', label: '使用说明' },
        { key: '__act', label: '' }
    ];

    function tierOf(t) {
        var tier = t.download_tier || 'free';
        if (tier === 'vip') return { text: 'VIP 专属', cls: 'vip' };
        if (tier === 'user') return { text: '登录后', cls: 'user' };
        return { text: '免费', cls: 'free' };
    }

    function cell(t, row) {
        if (row.key === '__name') {
            var icon = (typeof renderIconHTML === 'function') ? renderIconHTML(t, { eager: false }) : '';
            return '<div class="cmp-head">' +
                '<span class="cmp-icon" style="background:' + esc(t.color || '#eee') + '">' + icon + '</span>' +
                '<strong>' + esc(t.name) + '</strong>' +
                (t.pinned ? '<em class="cmp-pin">推荐</em>' : '') +
                '</div>';
        }
        if (row.key === '__act') {
            var href = (typeof getToolLink === 'function') ? getToolLink(t) : (t.url || t.download || '');
            if (!href) return '<span class="cmp-muted">暂无链接</span>';
            return '<a class="cmp-visit" href="' + esc(href) + '" target="_blank" rel="noopener">去使用</a>';
        }
        if (row.key === 'rating') {
            var r = Number(t.rating) || 0;
            return r ? '<span class="cmp-rating"><i class="fas fa-star"></i> ' + r.toFixed(1) + '</span>'
                     : '<span class="cmp-muted">—</span>';
        }
        if (row.key === 'downloads') {
            var d = Number(t.downloads) || 0;
            return d ? '<span class="cmp-num">' + fmt(d) + '<em> 次</em></span>'
                     : '<span class="cmp-muted">—</span>';
        }
        if (row.key === 'tier') {
            var ti = tierOf(t);
            return '<span class="cmp-tier ' + ti.cls + '">' + ti.text + '</span>';
        }
        if (row.key === 'tags') {
            var tags = Array.isArray(t.tags) ? t.tags : [];
            if (!tags.length) return '<span class="cmp-muted">—</span>';
            return tags.slice(0, 6).map(function (g) { return '<span class="cmp-tag">' + esc(g) + '</span>'; }).join('');
        }
        var v = t[row.key];
        if (!v) return '<span class="cmp-muted">—</span>';
        return esc(String(v));
    }

    function openPanel() {
        var list = ids.map(byId).filter(Boolean);
        if (list.length < 2) return;

        // 详情弹窗开着就关掉，避免两层浮层叠在一起
        var ov = document.querySelector('.overlay.active');
        if (ov) {
            ov.classList.remove('active');
            document.body.classList.remove('modal-open');
        }

        if (!panel) {
            panel = document.createElement('div');
            panel.className = 'cmp-overlay';
            panel.innerHTML =
                '<div class="cmp-sheet" role="dialog" aria-modal="true" aria-label="工具对比">' +
                '<header class="cmp-sheet-head">' +
                '<h2>对比 ' + '<span class="cmp-count"></span>' + ' 个工具</h2>' +
                '<div class="cmp-sheet-tools">' +
                '<button type="button" class="cmp-share" title="复制分享链接"><i class="fas fa-link"></i> 分享</button>' +
                '<button type="button" class="cmp-close" aria-label="关闭"><i class="fas fa-xmark"></i></button>' +
                '</div>' +
                '</header>' +
                '<div class="cmp-scroll"><table class="cmp-table"><tbody></tbody></table></div>' +
                '</div>';
            document.body.appendChild(panel);
            panel.addEventListener('click', function (e) {
                if (e.target === panel) closePanel();
            });
            panel.querySelector('.cmp-close').addEventListener('click', closePanel);
            panel.querySelector('.cmp-share').addEventListener('click', function () {
                var url = location.origin + location.pathname + '?cmp=' + ids.join(',');
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(url).then(function () { toast('链接已复制'); },
                                                             function () { toast(url); });
                } else { toast(url); }
            });
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && panel.classList.contains('show')) closePanel();
            });
        }

        panel.querySelector('.cmp-count').textContent = String(list.length);
        var tbody = panel.querySelector('tbody');
        tbody.innerHTML = ROWS.map(function (row) {
            var head = row.label ? '<th scope="row">' + esc(row.label) + '</th>' : '<th scope="row"></th>';
            return '<tr class="cmp-row cmp-row-' + row.key.replace(/^__/, '') + '">' + head +
                list.map(function (t) { return '<td>' + cell(t, row) + '</td>'; }).join('') + '</tr>';
        }).join('');

        panel.classList.add('show');
        document.body.classList.add('cmp-open');
    }

    function closePanel() {
        if (panel) panel.classList.remove('show');
        document.body.classList.remove('cmp-open');
    }

    /* ---------- 事件 ---------- */
    document.addEventListener('click', function (e) {
        var addBtn = e.target.closest && e.target.closest('[data-cmp-id]');
        if (addBtn) {
            e.preventDefault();
            e.stopPropagation();
            toggle(addBtn.getAttribute('data-cmp-id'));
            return;
        }
        var rm = e.target.closest && e.target.closest('[data-rm]');
        if (rm) {
            e.preventDefault();
            toggle(rm.getAttribute('data-rm'));
        }
    });

    /* 卡片是动态渲染的：用 MutationObserver 同步按钮状态（批量，避免每张卡各跑一次） */
    var syncTimer = null;
    function scheduleSync() {
        if (syncTimer) return;
        syncTimer = setTimeout(function () { syncTimer = null; syncCards(); }, 60);
    }

    function boot() {
        load();
        renderBar();
        syncCards();
        var grid = document.getElementById('toolGrid');
        if (grid) {
            new MutationObserver(scheduleSync).observe(grid, { childList: true });
        }
        // 分享链接：数据是异步来的，要等 tool 列表到位再开面板（否则 byId 全空）
        if (ids.length >= 2 && new URL(location.href).searchParams.get('cmp')) {
            var tries = 0;
            (function waitData() {
                if (tools().length) { openPanel(); return; }
                if (++tries > 60) return;      // 最多等 15s
                setTimeout(waitData, 250);
            })();
        }
    }

    window.Compare = {
        toggle: toggle, open: openPanel, close: closePanel,
        list: function () { return ids.slice(); },
        clear: function () { ids = []; save(); syncCards(); renderBar(); }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    // 数据到位后再同步一次（卡片可能在数据返回后整体重建）
    window.addEventListener('load', function () { setTimeout(syncCards, 400); });
})();
